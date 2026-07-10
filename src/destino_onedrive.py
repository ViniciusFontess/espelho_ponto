"""Envio das fichas para o OneDrive do SEBRAE via Microsoft Graph (app-only).

Espelha o padrão da captura-nfse (contabil/integracao/onedrive.py): client
credentials é só um POST no token; upload é um PUT em /users/{user}/drive.
Usa httpx (já é dependência) em vez de requests.

Config por variáveis de ambiente (a TI provisiona o app registration):
  ONEDRIVE_TENANT_ID, ONEDRIVE_CLIENT_ID, ONEDRIVE_CLIENT_SECRET
  ONEDRIVE_USER   -> arquivosugp@ms.sebrae.com.br  (dono do OneDrive)
  ONEDRIVE_BASE   -> "Arquivos/ADM Pessoal/DOSSIÊ - DOCFLOW/Automação PDF"
  ONEDRIVE_PASTA  -> "teste"  (ou "teste_vinicius")

Estrutura gravada:
  {BASE}/{PASTA}/{Eletrônico|Jornada}/{NOME}/{MM_AAAA}/dados.pdf (+ pagina.pdf)
Idempotente: cria pastas que faltam (o Graph cria intermediárias), nunca apaga.
"""
import csv
import io
import os
from datetime import datetime
from pathlib import Path
from urllib.parse import quote

import httpx

_GRAPH = "https://graph.microsoft.com/v1.0"
_TIPO_PASTA = {"espelho": "Eletrônico", "jornada": "Jornada"}
_BASE_PADRAO = "Arquivos/ADM Pessoal/DOSSIÊ - DOCFLOW/Automação PDF"
_PASTAS_PADRAO = "Teste Andrea,teste vinicius"
_HIST = "historico_envios.csv"
_HIST_COLS = ["data_hora", "pasta", "tipo", "molde", "pessoas",
              "competencias", "enviados", "ja_existentes"]


def configurado() -> bool:
    """True só se as credenciais estiverem no ambiente (senão o botão fica off)."""
    return bool(os.environ.get("ONEDRIVE_CLIENT_ID"))


def pastas_permitidas() -> list:
    """Pastas de destino que o usuário pode escolher (allowlist, anti-injeção)."""
    raw = os.environ.get("ONEDRIVE_PASTAS", _PASTAS_PADRAO)
    return [p.strip() for p in raw.split(",") if p.strip()]


def _token() -> str:
    tenant = os.environ["ONEDRIVE_TENANT_ID"]
    r = httpx.post(
        f"https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token",
        data={
            "grant_type": "client_credentials",
            "client_id": os.environ["ONEDRIVE_CLIENT_ID"],
            "client_secret": os.environ["ONEDRIVE_CLIENT_SECRET"],
            "scope": "https://graph.microsoft.com/.default",
        },
        timeout=30,
    )
    r.raise_for_status()
    return r.json()["access_token"]


def caminho_remoto(tipo: str, nome: str, competencia: str, arquivo: str = "",
                   pasta: str = None) -> str:
    """{BASE}/{PASTA}/{Eletrônico|Jornada}/{NOME}/{MM_AAAA}/{arquivo}."""
    base = os.environ.get("ONEDRIVE_BASE", _BASE_PADRAO)
    pasta = pasta or os.environ.get("ONEDRIVE_PASTA") or pastas_permitidas()[0]
    sub = _TIPO_PASTA.get(tipo, "Outros")
    comp = str(competencia).replace("/", "_")
    partes = [base.strip("/"), pasta, sub, nome.strip(), comp, arquivo]
    return "/".join(p for p in partes if p)


def _existe(path: str, token: str, user: str) -> bool:
    p = quote(path.strip("/"), safe="/")  # aguenta espaço/acento, mantém as '/'
    r = httpx.get(
        f"{_GRAPH}/users/{user}/drive/root:/{p}",
        headers={"Authorization": f"Bearer {token}"}, timeout=30,
    )
    return r.status_code == 200


def _upload(path: str, data: bytes, token: str, user: str) -> str:
    p = quote(path.strip("/"), safe="/")  # aguenta espaço/acento, mantém as '/'
    r = httpx.put(
        f"{_GRAPH}/users/{user}/drive/root:/{p}:/content",
        headers={"Authorization": f"Bearer {token}"}, content=data, timeout=120,
    )
    r.raise_for_status()
    return r.json().get("webUrl", "")


def _download(path: str, token: str, user: str):
    p = quote(path.strip("/"), safe="/")
    # Graph responde .../content com 302 pra URL de download → seguir o redirect.
    r = httpx.get(f"{_GRAPH}/users/{user}/drive/root:/{p}:/content",
                  headers={"Authorization": f"Bearer {token}"}, timeout=60,
                  follow_redirects=True)
    return r.content if r.status_code == 200 else None


def _registrar_historico(base: str, registro: dict, token: str, user: str) -> None:
    """Anexa uma linha ao _historico_envios.csv no OneDrive (auditoria de envios).
    Best-effort: se falhar, não derruba o envio (que já aconteceu)."""
    try:
        path = f"{base}/{_HIST}"
        linha = io.StringIO()
        csv.writer(linha).writerow([registro.get(c, "") for c in _HIST_COLS])
        existente = _download(path, token, user)
        if existente:
            conteudo = existente + linha.getvalue().encode("utf-8")
        else:
            cab = io.StringIO()
            csv.writer(cab).writerow(_HIST_COLS)
            conteudo = cab.getvalue().encode("utf-8-sig") + linha.getvalue().encode("utf-8")
        _upload(path, conteudo, token, user)
    except Exception:
        pass


def enviar(saida_dir, tipo: str, pasta: str = None, molde: str = None,
           progresso=None) -> dict:
    """Sobe os PDFs de cada pessoa/competência da árvore local para o OneDrive,
    na pasta escolhida, e registra a submissão no histórico.

    progresso: callable(enviados, total) opcional, chamado a cada arquivo.
    Idempotente: marca competências que já existiam (nada é apagado). Retorna
    {"enviados", "pessoas", "competencias", "ja_existentes", "pasta"}.
    """
    token = _token()
    user = os.environ["ONEDRIVE_USER"]
    pasta = pasta or os.environ.get("ONEDRIVE_PASTA") or pastas_permitidas()[0]
    base = os.environ.get("ONEDRIVE_BASE", _BASE_PADRAO)

    total = sum(1 for _ in Path(saida_dir).rglob("*.pdf"))
    if progresso:
        progresso(0, total)
    enviados = pessoas = competencias = ja_existentes = 0
    for pessoa_dir in sorted(p for p in Path(saida_dir).iterdir() if p.is_dir()):
        nome = pessoa_dir.name
        pessoas += 1
        for comp_dir in sorted(d for d in pessoa_dir.iterdir() if d.is_dir()):
            comp = comp_dir.name
            competencias += 1
            if _existe(caminho_remoto(tipo, nome, comp, pasta=pasta), token, user):
                ja_existentes += 1
            for f in comp_dir.iterdir():
                if f.suffix.lower() == ".pdf":
                    _upload(caminho_remoto(tipo, nome, comp, f.name, pasta=pasta),
                            f.read_bytes(), token, user)
                    enviados += 1
                    if progresso:
                        progresso(enviados, total)

    resumo = {"enviados": enviados, "pessoas": pessoas, "competencias": competencias,
              "ja_existentes": ja_existentes, "pasta": pasta}
    # histórico dentro da própria pasta de teste: {BASE}/{PASTA}/historico_envios.csv
    _registrar_historico(f"{base}/{pasta}", {
        "data_hora": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "molde": molde or "", "tipo": tipo, **resumo,
    }, token, user)
    return resumo


if __name__ == "__main__":  # autoteste do caminho (sem rede)
    os.environ["ONEDRIVE_BASE"] = "Base"
    os.environ["ONEDRIVE_PASTA"] = "teste"
    assert caminho_remoto("espelho", "JOAO_SILVA", "12/2025", "dados.pdf") == \
        "Base/teste/Eletrônico/JOAO_SILVA/12_2025/dados.pdf"
    assert caminho_remoto("jornada", "ANA", "01/2026").endswith("Jornada/ANA/01_2026")
    print("ok")
