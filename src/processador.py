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

from src.molde_registry import get_molde
from src.pdf_type_detector import detect_pdf_type
from src.extracao import filtrar_variaveis
from src.folder_writer import write_employee_folder
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

    # Organiza em árvore de pastas (reaproveita folder_writer)
    for reg in registros:
        write_employee_folder(reg, output_dir=str(saida_dir), pdf_path=pdf_path)

    # Entrega via destino ZIP
    zip_path = job_dir / "resultado.zip"
    DestinoZip().entregar(saida_dir, destino_zip=zip_path)

    return {
        "molde_id": molde_id,
        "tipo": registros[0].get("tipo") if registros else None,
        "funcionarios": registros,
        "zip_path": str(zip_path),
    }
