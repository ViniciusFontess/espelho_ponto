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
import os
from pathlib import Path
from urllib.parse import quote

import httpx

_GRAPH = "https://graph.microsoft.com/v1.0"
_TIPO_PASTA = {"espelho": "Eletrônico", "jornada": "Jornada"}
_BASE_PADRAO = "Arquivos/ADM Pessoal/DOSSIÊ - DOCFLOW/Automação PDF"


def configurado() -> bool:
    """True só se as credenciais estiverem no ambiente (senão o botão fica off)."""
    return bool(os.environ.get("ONEDRIVE_CLIENT_ID"))


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


def caminho_remoto(tipo: str, nome: str, competencia: str, arquivo: str = "") -> str:
    """{BASE}/{PASTA}/{Eletrônico|Jornada}/{NOME}/{MM_AAAA}/{arquivo}."""
    base = os.environ.get("ONEDRIVE_BASE", _BASE_PADRAO)
    pasta = os.environ.get("ONEDRIVE_PASTA", "teste")
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


def enviar(saida_dir, tipo: str) -> dict:
    """Sobe os PDFs de cada pessoa/competência da árvore local para o OneDrive.

    Idempotente: marca competências que já existiam (nada é apagado). Retorna
    {"enviados", "competencias", "ja_existentes", "pasta"}.
    """
    token = _token()
    user = os.environ["ONEDRIVE_USER"]
    enviados = competencias = ja_existentes = 0
    for pessoa_dir in sorted(p for p in Path(saida_dir).iterdir() if p.is_dir()):
        nome = pessoa_dir.name
        for comp_dir in sorted(d for d in pessoa_dir.iterdir() if d.is_dir()):
            comp = comp_dir.name
            competencias += 1
            if _existe(caminho_remoto(tipo, nome, comp), token, user):
                ja_existentes += 1
            for f in comp_dir.iterdir():
                if f.suffix.lower() == ".pdf":
                    _upload(caminho_remoto(tipo, nome, comp, f.name), f.read_bytes(), token, user)
                    enviados += 1
    return {
        "enviados": enviados,
        "competencias": competencias,
        "ja_existentes": ja_existentes,
        "pasta": os.environ.get("ONEDRIVE_PASTA", "teste"),
    }


if __name__ == "__main__":  # autoteste do caminho (sem rede)
    os.environ["ONEDRIVE_BASE"] = "Base"
    os.environ["ONEDRIVE_PASTA"] = "teste"
    assert caminho_remoto("espelho", "JOAO_SILVA", "12/2025", "dados.pdf") == \
        "Base/teste/Eletrônico/JOAO_SILVA/12_2025/dados.pdf"
    assert caminho_remoto("jornada", "ANA", "01/2026").endswith("Jornada/ANA/01_2026")
    print("ok")
