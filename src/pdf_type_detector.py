"""
Detect whether a Pontomais PDF is Type A (signed Espelho de Ponto Eletrônico)
or Type B (unsigned Jornada multi-employee report).

Type A:
  - Contains "Protocolo:" field with an MD5 hash (32 hex chars)
  - One employee per page
  - Font: Adobe standard / extractable text

Type B (Jornada):
  - Contains "Jornada" heading
  - Uses NimbusSans with Identity-H custom encoding (unreadable text)
  - One employee per page — name in "Colaborador: NAME" header
  - No digital signature
"""
from __future__ import annotations

import re

import fitz  # PyMuPDF


def detect_pdf_type(pdf_path: str) -> str:
    """
    Returns "A" for signed Espelho de Ponto Eletrônico,
            "B" for unsigned Jornada report.
    """
    doc = fitz.open(pdf_path)
    try:
        # Check first page for Type A indicators
        first_page_text = doc[0].get_text()

        # Type A: has a readable "Protocolo:" followed by 32 hex chars
        if re.search(r"Protocolo:\s*[a-fA-F0-9]{32}", first_page_text):
            return "A"

        # Type B: NimbusSans font with Identity-H encoding
        for font_info in doc[0].get_fonts(full=True):
            if "NimbusSans" in font_info[3] and font_info[5] == "Identity-H":
                return "B"

        # Type A fallback: text is extractable and contains typical Espelho fields
        if "Nome" in first_page_text and "Matrícula" in first_page_text:
            return "A"

        # Default to A (most common case)
        return "A"

    finally:
        doc.close()
