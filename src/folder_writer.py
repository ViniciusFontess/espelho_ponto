"""
Write employee data to organized folder structure.

Output layout:
  output/
    <NOME_FUNCIONARIO>/
      <MM_YYYY>/
        dados.json       ← parsed employee record
        pagina_N.pdf     ← extracted page (if requested)
"""
from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Optional

import fitz  # PyMuPDF


def _safe_name(name: str) -> str:
    """Convert an employee name to a safe directory name."""
    # Replace accented chars with ASCII equivalents for filesystem safety
    # Using individual mappings to avoid encoding issues in source files
    replacements = {
        "À": "A", "Á": "A", "Â": "A", "Ã": "A", "Ä": "A", "Å": "A",
        "Ç": "C",
        "È": "E", "É": "E", "Ê": "E", "Ë": "E",
        "Ì": "I", "Í": "I", "Î": "I", "Ï": "I",
        "Ñ": "N",
        "Ò": "O", "Ó": "O", "Ô": "O", "Õ": "O", "Ö": "O",
        "Ù": "U", "Ú": "U", "Û": "U", "Ü": "U",
        "à": "a", "á": "a", "â": "a", "ã": "a", "ä": "a", "å": "a",
        "ç": "c",
        "è": "e", "é": "e", "ê": "e", "ë": "e",
        "ì": "i", "í": "i", "î": "i", "ï": "i",
        "ñ": "n",
        "ò": "o", "ó": "o", "ô": "o", "õ": "o", "ö": "o",
        "ù": "u", "ú": "u", "û": "u", "ü": "u",
    }
    safe = "".join(replacements.get(c, c) for c in name)
    # Replace spaces and non-alphanumeric chars with underscore
    safe = re.sub(r"[^A-Za-z0-9_]", "_", safe)
    # Collapse multiple underscores
    safe = re.sub(r"_+", "_", safe).strip("_")
    return safe or "DESCONHECIDO"


def write_employee_folder(
    data: dict,
    output_dir: str = "output",
    pdf_path: Optional[str] = None,
    src_doc=None,
) -> Path:
    """
    Write an employee record (and optionally their PDF page) to:
      output_dir / <safe_nome> / <MM_YYYY> / dados.json

    Args:
        data:       Employee record dict (must have 'nome', 'periodo', 'pagina').
        output_dir: Root output directory.
        pdf_path:   Path to the source PDF, used to extract and save the page.

    Returns:
        Path to the created dados.json file.
    """
    nome = data.get("nome", "DESCONHECIDO")
    periodo = data.get("periodo", "00_0000")
    page_num = data.get("pagina", 1) - 1  # 0-indexed

    # Build directory: output / NOME / MM_YYYY
    period_safe = periodo.replace("/", "_")  # "01/2026" → "01_2026"
    employee_dir = Path(output_dir) / _safe_name(nome) / period_safe
    employee_dir.mkdir(parents=True, exist_ok=True)

    # Write JSON
    json_path = employee_dir / "dados.json"
    json_path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    # Optionally extract and save the PDF page. src_doc evita reabrir o PDF a
    # cada pessoa (O(N²) em volume grande) — abra uma vez e reaproveite.
    if pdf_path or src_doc is not None:
        try:
            doc = src_doc if src_doc is not None else fitz.open(pdf_path)
            if 0 <= page_num < len(doc):
                single = fitz.open()  # new empty PDF
                single.insert_pdf(doc, from_page=page_num, to_page=page_num)
                pdf_out = employee_dir / f"pagina_{page_num + 1}.pdf"
                single.save(str(pdf_out))
                single.close()
            if src_doc is None:
                doc.close()
        except Exception:
            pass  # PDF extraction is best-effort

    return json_path


def write_employee_json(data: dict, output_dir: str = "output") -> Path:
    """
    Legacy writer: save JSON by matricula / nome (for Type A PDFs).
    Falls back to folder_writer when 'periodo' is present.
    """
    if data.get("periodo"):
        return write_employee_folder(data, output_dir)

    Path(output_dir).mkdir(parents=True, exist_ok=True)
    nome = data.get("nome", "DESCONHECIDO")
    matricula = data.get("matricula", "0000")
    safe_nome = nome.replace(" ", "_").replace("/", "_")
    filename = f"{matricula}_{safe_nome}.json"
    filepath = Path(output_dir) / filename
    filepath.write_text(
        json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    return filepath
