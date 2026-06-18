"""
Main pipeline: detects PDF type and dispatches to the correct parser.

Type A (Espelho de Ponto Eletrônico — signed):
  → pdf_loader + hash_extractor + data_parser + validator + output_writer

Type B (Jornada — unsigned, multi-employee):
  → jornada_parser + folder_writer (one subfolder per employee)
"""
from __future__ import annotations

import sys

from src.folder_writer import write_employee_folder
from src.jornada_parser import parse_jornada_pdf
from src.output_writer import write_employee_json
from src.parsers_espelho import parse_espelho_eletronico
from src.pdf_type_detector import detect_pdf_type


def _run_type_a(pdf_path: str, output_dir: str) -> list[dict]:
    """Process a Type A signed Espelho de Ponto PDF."""
    results = parse_espelho_eletronico(pdf_path)
    for record in results:
        write_employee_json(record, output_dir)
    return results


def _run_type_b(pdf_path: str, output_dir: str) -> list[dict]:
    """Process a Type B unsigned Jornada PDF."""
    employees = parse_jornada_pdf(pdf_path)
    results = []
    for emp in employees:
        write_employee_folder(emp, output_dir, pdf_path=pdf_path)
        results.append(emp)
    return results


def run(pdf_path: str, output_dir: str = "output") -> list[dict]:
    """
    Auto-detect PDF type and process accordingly.
    Returns list of employee records.
    """
    pdf_type = detect_pdf_type(pdf_path)
    if pdf_type == "B":
        return _run_type_b(pdf_path, output_dir)
    return _run_type_a(pdf_path, output_dir)


if __name__ == "__main__":
    pdf_path = sys.argv[1] if len(sys.argv) > 1 else None
    if not pdf_path:
        print("Uso: python -m src.pipeline <caminho_do_pdf>")
        sys.exit(1)

    results = run(pdf_path)
    tipo = results[0].get("tipo", "?") if results else "?"
    print(f"Tipo: {tipo.upper()} | Processados: {len(results)} funcionários")

    if tipo == "espelho":
        validos = sum(1 for r in results if r.get("hash_valido"))
        print(f"Assinados: {validos} | Sem assinatura: {len(results) - validos}")
    else:
        for r in results:
            print(f"  {r['nome']} — {r['periodo']}")
