"""
Parser for Type B Pontomais PDFs: "Espelho de Ponto — Jornada" (unsigned).
These PDFs use NimbusSans with a custom CID encoding that prevents standard
text extraction. We decode using a manually built CID→Unicode map derived
from known text patterns (day names, date formats, "Colaborador:" label).
"""
from __future__ import annotations

import re
from pathlib import Path
from typing import Optional

import fitz  # PyMuPDF

# ---------------------------------------------------------------------------
# CID → Unicode mapping for NimbusSans-Regular (R14)
# Derived by cross-referencing rendered page images with raw content streams.
# ---------------------------------------------------------------------------
R14_MAP: dict[int, str] = {
    # Uppercase letters
    1: "A", 2: "D", 3: "I", 4: "L", 5: "E", 6: "R",
    8: "X", 9: "M", 10: "T", 11: "S", 12: "Ã", 13: "O",
    24: "P", 27: "N", 28: "U", 29: "G", 36: "Q", 42: "C",
    55: "F", 64: "V", 67: "B", 68: "Z", 70: "H", 72: "K",
    # Lowercase letters
    14: "e", 20: "a", 21: "t", 22: "é", 25: "o", 26: "r",
    30: "m", 37: "u", 38: "i", 50: "x", 53: "á", 54: "b", 56: "g",
    # Digits
    15: "0", 16: "1", 18: "2", 23: "3", 41: "4",
    31: "5", 19: "6", 35: "7", 57: "8", 58: "9",
    # Punctuation / symbols
    7: " ", 17: "/", 34: ":", 39: ",",
}

BACKSLASH = 92


def _parse_pdf_string(raw: bytes) -> bytes:
    """Decode a PDF literal string (content between parentheses), handling escapes."""
    result = bytearray()
    i = 0
    while i < len(raw):
        b = raw[i]
        if b == BACKSLASH:
            if i + 1 < len(raw):
                nb = raw[i + 1]
                if nb == ord("n"):
                    result.append(10)
                elif nb == ord("r"):
                    result.append(13)
                elif nb == ord("t"):
                    result.append(9)
                elif nb == ord("b"):
                    result.append(8)
                elif nb == ord("f"):
                    result.append(12)
                elif nb == ord("("):
                    result.append(40)
                elif nb == ord(")"):
                    result.append(41)
                elif nb == BACKSLASH:
                    result.append(BACKSLASH)
                elif 48 <= nb <= 55:  # octal
                    oc = bytearray()
                    for k in range(min(3, len(raw) - i - 1)):
                        if 48 <= raw[i + 1 + k] <= 55:
                            oc.append(raw[i + 1 + k])
                        else:
                            break
                    result.append(int(bytes(oc), 8) & 0xFF)
                    i += len(oc)
                    continue
                else:
                    result.append(nb)
                i += 2
                continue
        result.append(b)
        i += 1
    return bytes(result)


def _extract_cids(tj_content: bytes) -> list[int]:
    """Extract 2-byte CIDs from a TJ array content."""
    cids: list[int] = []
    i = 0
    while i < len(tj_content):
        if tj_content[i : i + 1] == b"(":
            j = i + 1
            depth = 1
            while j < len(tj_content) and depth > 0:
                if tj_content[j] == BACKSLASH:
                    j += 2
                    continue
                if tj_content[j] == ord("("):
                    depth += 1
                elif tj_content[j] == ord(")"):
                    depth -= 1
                j += 1
            string_raw = tj_content[i + 1 : j - 1]
            string_bytes = _parse_pdf_string(string_raw)
            for k in range(0, len(string_bytes) - 1, 2):
                cid = (string_bytes[k] << 8) | string_bytes[k + 1]
                cids.append(cid)
            i = j
        else:
            i += 1
    return cids


def _get_page_blocks(doc: fitz.Document, page_num: int) -> list[dict]:
    """
    Return list of {font, cids, y} blocks from a page's content stream.
    Blocks are in document order.
    """
    page = doc[page_num]
    page_obj = doc.xref_object(page.xref)
    m = re.search(r"/Contents\s+(\d+)\s+0\s+R", page_obj)
    if not m:
        return []

    contents = doc.xref_stream(int(m.group(1)))
    blocks: list[dict] = []
    current_font: Optional[str] = None
    current_y: float = 0.0

    for bt_match in re.finditer(rb"BT\b(.*?)ET\b", contents, re.DOTALL):
        block = bt_match.group(1)
        pos = 0
        while pos < len(block):
            # Tm — position operator
            tm_m = re.match(
                rb"\s*[\d.+\-e]+\s+[\d.+\-e]+\s+[\d.+\-e]+\s+[\d.+\-e]+"
                rb"\s+([\d.+\-e]+)\s+([\d.+\-e]+)\s+Tm",
                block[pos:],
            )
            if tm_m:
                current_y = float(tm_m.group(2))
                pos += tm_m.end()
                continue

            # Tf — font selection
            tf_m = re.match(rb"\s*/(\w+)\s+[\d.]+\s+Tf", block[pos:])
            if tf_m:
                current_font = tf_m.group(1).decode("ascii")
                pos += tf_m.end()
                continue

            # TJ — show glyph array
            tj_m = re.match(rb"\s*\[([^\]]*)\]\s*TJ", block[pos:], re.DOTALL)
            if tj_m:
                cids = _extract_cids(tj_m.group(1))
                if current_font and cids:
                    blocks.append(
                        {"font": current_font, "cids": cids, "y": current_y}
                    )
                pos += tj_m.end()
                continue

            pos += 1

    return blocks


def _decode(cids: list[int], cid_map: dict[int, str] = R14_MAP) -> str:
    return "".join(cid_map.get(c, "?") for c in cids)


def _parse_date(date_str: str) -> tuple[int, int]:
    """Parse 'DD/MM/YYYY' → (month, year). Returns (0, 0) on failure."""
    m = re.match(r"(\d{2})/(\d{2})/(\d{4})", date_str)
    if m:
        return int(m.group(2)), int(m.group(3))
    return 0, 0


def parse_jornada_page(doc: fitz.Document, page_num: int) -> dict:
    """
    Extract employee info from a single page of a Type B (Jornada) PDF.

    Returns:
        {
          "nome": str,
          "periodo": str,        # "MM/YYYY"
          "mes": int,
          "ano": int,
          "tipo": "jornada",
          "pagina": int,
        }
    """
    blocks = _get_page_blocks(doc, page_num)

    nome = ""
    periodo = ""
    mes = 0
    ano = 0

    for b in blocks:
        font = b["font"]
        cids = b["cids"]
        y = b["y"]

        # ----- Employee name block -----
        # Located at the highest y ≈ 802 (PDF coords from bottom).
        # Font R14, immediately after "Colaborador:" (R11 block at same y).
        # The block contains exactly the employee name in uppercase.
        if font == "R14" and y > 790 and not nome:
            decoded = _decode(cids)
            # Strip unknown chars at the end (trailing '?')
            nome = decoded.rstrip("?").strip()

        # ----- Date-range block -----
        # "De DD/MM/YYYY até DD/MM/YYYY" at y ≈ 769.
        # This 28-CID block starts with D(2=D) e(14=e) space(7) ...
        # We specifically check for the "De " prefix to avoid confusing
        # with the "Por NAME em DD/MM/YYYY" generation-date block.
        if font == "R14" and 760 < y < 780 and not periodo:
            # Check if block starts with CIDs [2, 14, 7] = "De "
            if len(cids) >= 3 and cids[0] == 2 and cids[1] == 14 and cids[2] == 7:
                decoded = _decode(cids)
                # Expected: "De 01/01/2026 até 31/01/2026"
                date_m = re.search(r"(\d{2}/\d{2}/\d{4})", decoded)
                if date_m:
                    mes, ano = _parse_date(date_m.group(1))
                    periodo = f"{mes:02d}/{ano}"

    # Fallback: if period not found, try any date block
    if not periodo:
        for b in blocks:
            if b["font"] == "R14":
                decoded = _decode(b["cids"])
                date_m = re.search(r"(\d{2}/\d{2}/\d{4})", decoded)
                if date_m:
                    mes, ano = _parse_date(date_m.group(1))
                    periodo = f"{mes:02d}/{ano}"
                    break

    return {
        "nome": nome,
        "periodo": periodo,
        "mes": mes,
        "ano": ano,
        "tipo": "jornada",
        "pagina": page_num + 1,
    }


def parse_jornada_pdf(pdf_path: str) -> list[dict]:
    """Parse all pages of a Type B Jornada PDF. Returns one dict per employee."""
    doc = fitz.open(pdf_path)
    results = []
    for i in range(len(doc)):
        try:
            record = parse_jornada_page(doc, i)
            results.append(record)
        except Exception as exc:
            results.append(
                {
                    "nome": f"pagina_{i + 1}",
                    "periodo": "",
                    "mes": 0,
                    "ano": 0,
                    "tipo": "jornada",
                    "pagina": i + 1,
                    "erro": str(exc),
                }
            )
    doc.close()
    return results
