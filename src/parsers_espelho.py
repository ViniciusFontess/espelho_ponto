# src/parsers_espelho.py
"""
Parser puro do Espelho de Ponto Eletrônico (Type A, assinado).
Retorna uma lista de registros (um por página/funcionário) SEM escrever arquivos.
"""
from __future__ import annotations

from src.pdf_loader import load_pages
from src.hash_extractor import extract_hash
from src.data_parser import parse_employee
from src.validator import validate_hash


def parse_espelho_eletronico(pdf_path: str) -> list[dict]:
    """Lê o PDF e devolve um registro por funcionário, com validação de assinatura."""
    pages = load_pages(pdf_path)
    registros = []
    for page in pages:
        text = page["text"]
        hash_str = extract_hash(text)
        validation = validate_hash(hash_str)
        employee = parse_employee(text)
        registros.append({
            "tipo": "espelho",
            "hash": hash_str,
            **validation,
            **employee,
        })
    return registros
