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


# Rótulos legíveis dos campos (espelha o front) para a ficha.
_ROTULOS = [
    ("Matrícula", "matricula"), ("CPF", "cpf"), ("PIS", "pis"),
    ("Cargo", "cargo"), ("Equipe / Setor", "equipe"), ("Página de origem", "pagina"),
]


def _status_assinatura(data: dict):
    """(texto, cor_hex) do status de assinatura; None se não for espelho."""
    if data.get("tipo") != "espelho":
        return None
    if data.get("hash_valido"):
        return "ASSINADO", "#0a8f5b"
    if data.get("hash_presente"):
        return "ASSINATURA INVÁLIDA", "#b8740a"
    return "NÃO ASSINOU", "#d23541"


def _write_ficha_pdf(data: dict, out_path: Path) -> None:
    """Gera uma ficha PDF legível (uma pessoa/competência) — melhor que abrir o JSON.
    Best-effort: se o reportlab falhar, não quebra a gravação da pasta."""
    try:
        from reportlab.pdfgen import canvas
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.units import mm
        from reportlab.lib import colors
    except Exception:
        return

    W, H = A4
    blue = colors.HexColor("#2560E6")
    ink = colors.HexColor("#0f1222")
    muted = colors.HexColor("#6b7280")
    line = colors.HexColor("#e3e6ef")

    c = canvas.Canvas(str(out_path), pagesize=A4)
    x, w = 25 * mm, W - 50 * mm
    y = H - 30 * mm

    # cabeçalho
    c.setFillColor(blue)
    c.rect(x, y, w, 12 * mm, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(x + 6 * mm, y + 4 * mm, "SEBRAE  ·  ESPELHO DE PONTO")
    c.setFont("Helvetica", 9)
    c.drawRightString(x + w - 6 * mm, y + 4.3 * mm, str(data.get("tipo", "")).capitalize())

    # nome
    y -= 17 * mm
    c.setFillColor(ink)
    c.setFont("Helvetica-Bold", 20)
    c.drawString(x, y, str(data.get("nome", "")).upper()[:48])

    # competência
    y -= 8 * mm
    comp = data.get("periodo") or data.get("competencia") or "-"
    c.setFillColor(muted)
    c.setFont("Helvetica", 11)
    c.drawString(x, y, f"Competência: {comp}")

    # divisória
    y -= 6 * mm
    c.setStrokeColor(line)
    c.line(x, y, x + w, y)

    # campos
    y -= 11 * mm
    c.setFont("Helvetica", 12)
    for label, key in _ROTULOS:
        val = data.get(key)
        if val in (None, ""):
            continue
        c.setFillColor(muted)
        c.drawString(x, y, f"{label}:")
        c.setFillColor(ink)
        c.drawString(x + 50 * mm, y, str(val))
        y -= 8 * mm

    # status de assinatura
    st = _status_assinatura(data)
    if st:
        y -= 3 * mm
        c.setFillColor(colors.HexColor(st[1]))
        c.setFont("Helvetica-Bold", 13)
        c.drawString(x, y, f"Status de assinatura: {st[0]}")

    c.save()


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

    # Write JSON (uso de máquina)
    json_path = employee_dir / "dados.json"
    json_path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    # Ficha PDF legível (o que a pessoa abre pra ver os dados, em vez do JSON)
    _write_ficha_pdf(data, employee_dir / "ficha.pdf")

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
