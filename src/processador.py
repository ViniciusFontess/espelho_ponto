"""
Orquestrador do Separador com Molde.

Resolve o molde (id explícito ou auto-detecção), roda o parser, filtra as
variáveis selecionadas, organiza em árvore de pastas num diretório temporário e
entrega via camada de destino (ZIP no v1).
"""
from __future__ import annotations

import uuid
from pathlib import Path
from typing import Optional

import fitz  # PyMuPDF

from src.molde_registry import get_molde
from src.pdf_type_detector import detect_pdf_type
from src.extracao import filtrar_variaveis
from src.folder_writer import write_employee_folder, _safe_name
from src.destino import DestinoZip

# Mapa: tipo detectado pelo detector → molde correspondente
_TIPO_PARA_MOLDE = {"A": "espelho_eletronico", "B": "espelho_jornada"}


class MoldeEmDesenvolvimentoError(Exception):
    """Lançado quando o molde escolhido é um exemplo sem parser."""


def _resolver_molde_id(pdf_path: str, molde_id: Optional[str]) -> str:
    if molde_id:
        return molde_id
    tipo = detect_pdf_type(pdf_path)
    return _TIPO_PARA_MOLDE.get(tipo, "espelho_eletronico")


def processar(
    pdf_path: str,
    molde_id: Optional[str] = None,
    variaveis: Optional[list] = None,
    work_dir: Optional[str] = None,
) -> dict:
    """
    Processa um PDF com um molde e devolve:
      {"molde_id", "tipo", "funcionarios": [...], "zip_path"}
    """
    molde_id = _resolver_molde_id(pdf_path, molde_id)
    molde = get_molde(molde_id)
    if molde is None:
        raise ValueError(f"Molde desconhecido: {molde_id}")
    if molde.parser is None:
        raise MoldeEmDesenvolvimentoError(
            f"O molde '{molde.nome}' ainda está em desenvolvimento."
        )

    # Diretório de trabalho isolado
    base = Path(work_dir or Path.cwd() / "_tmp_jobs")
    job_dir = base / f"job_{uuid.uuid4().hex}"
    saida_dir = job_dir / "saida"
    saida_dir.mkdir(parents=True, exist_ok=True)

    # Parser → registros
    registros = molde.parser(pdf_path)
    registros = [filtrar_variaveis(r, variaveis) for r in registros]

    # Organiza em árvore de pastas (reaproveita folder_writer) e anexa, em cada
    # registro, o caminho relativo da pasta funcional gerada (ex.: "ANA_SILVA/01_2026").
    # PDF aberto uma única vez e reusado (evita reabrir por pessoa em volume grande).
    src_doc = fitz.open(pdf_path)
    try:
        for reg in registros:
            nome = reg.get("nome", "DESCONHECIDO")
            periodo_safe = str(reg.get("periodo", "00_0000")).replace("/", "_")
            reg["pasta"] = f"{_safe_name(nome)}/{periodo_safe}"
            write_employee_folder(reg, output_dir=str(saida_dir), src_doc=src_doc)
    finally:
        src_doc.close()

    # Estatísticas de gravação das pastas funcionais (controle operacional)
    estatisticas = _coletar_estatisticas(saida_dir, registros)

    # Entrega via destino ZIP
    zip_path = job_dir / "resultado.zip"
    DestinoZip().entregar(saida_dir, destino_zip=zip_path)

    return {
        "molde_id": molde_id,
        "tipo": registros[0].get("tipo") if registros else None,
        "funcionarios": registros,
        "estatisticas": estatisticas,
        "zip_path": str(zip_path),
        "saida_dir": str(saida_dir),
    }


def _coletar_estatisticas(saida_dir: Path, registros: list) -> dict:
    """Conta pastas funcionais, subpastas por competência e arquivos gravados."""
    pastas_pessoa = [p for p in saida_dir.iterdir() if p.is_dir()]
    subpastas = [d for p in pastas_pessoa for d in p.iterdir() if d.is_dir()]
    arquivos = [f for f in saida_dir.rglob("*") if f.is_file()]
    fichas = sum(1 for f in arquivos if f.name == "dados.pdf")
    paginas = sum(1 for f in arquivos if f.name.startswith("pagina") and f.suffix.lower() == ".pdf")
    competencias = {r.get("periodo") for r in registros if r.get("periodo")}
    return {
        "pessoas": len(registros),
        "pastas_funcionais": len(pastas_pessoa),
        "subpastas_competencia": len(subpastas),
        "arquivos_gravados": len(arquivos),
        "fichas": fichas,
        "paginas": paginas,
        "competencias": len(competencias),
    }
