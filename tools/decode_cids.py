"""
Decode CIDs from Type B PDF (Espelho de Ponto - Jornada format).
Builds a CID-to-Unicode mapping from the content stream + known text.
"""
import fitz
import re
import sys

BACKSLASH = 92  # ord('\\')

def parse_pdf_string(raw: bytes) -> bytes:
    """Parse a PDF string literal (content between parentheses), handling escape sequences."""
    result = bytearray()
    i = 0
    while i < len(raw):
        b = raw[i]
        if b == BACKSLASH:
            if i + 1 < len(raw):
                nb = raw[i + 1]
                if nb == ord('n'):
                    result.append(10)   # \n
                elif nb == ord('r'):
                    result.append(13)   # \r
                elif nb == ord('t'):
                    result.append(9)    # \t
                elif nb == ord('b'):
                    result.append(8)    # \b
                elif nb == ord('f'):
                    result.append(12)   # \f
                elif nb == ord('('):
                    result.append(40)   # \(
                elif nb == ord(')'):
                    result.append(41)   # \)
                elif nb == BACKSLASH:
                    result.append(BACKSLASH)
                elif 48 <= nb <= 55:    # Octal
                    oct_str = raw[i+1:i+4]
                    # Take up to 3 octal digits
                    oc = bytearray()
                    for k in range(min(3, len(raw) - i - 1)):
                        if 48 <= raw[i+1+k] <= 55:
                            oc.append(raw[i+1+k])
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


def extract_cids_from_tj(tj_content: bytes) -> list:
    """Extract list of 2-byte CIDs from TJ array content."""
    cids = []
    i = 0
    while i < len(tj_content):
        if tj_content[i:i+1] == b'(':
            # Find matching closing paren
            j = i + 1
            depth = 1
            while j < len(tj_content) and depth > 0:
                if tj_content[j] == BACKSLASH:
                    j += 2  # skip escaped char
                    continue
                if tj_content[j] == ord('('):
                    depth += 1
                elif tj_content[j] == ord(')'):
                    depth -= 1
                j += 1
            # Extract string content (between parens)
            string_raw = tj_content[i+1:j-1]
            string_bytes = parse_pdf_string(string_raw)
            # Parse as 2-byte CIDs (Type0 font)
            for k in range(0, len(string_bytes) - 1, 2):
                cid = (string_bytes[k] << 8) | string_bytes[k+1]
                cids.append(cid)
            i = j
        else:
            i += 1
    return cids


def extract_page_cids(doc, page_num: int):
    """Extract CID sequences by font from a page's content stream."""
    page = doc[page_num]

    # Find content stream xref
    page_obj = doc.xref_object(page.xref)
    contents_match = re.search(r'/Contents\s+(\d+)\s+0\s+R', page_obj)
    if not contents_match:
        return {}

    contents_xref = int(contents_match.group(1))
    contents = doc.xref_stream(contents_xref)

    # Find BT...ET blocks
    results = {}

    for bt_match in re.finditer(rb'BT\b(.*?)ET\b', contents, re.DOTALL):
        block = bt_match.group(1)

        # Find font changes and TJ/Tj operators
        current_font = None
        pos = 0

        while pos < len(block):
            # Match Tf operator: /FontName size Tf
            tf_match = re.match(rb'\s*/(\w+)\s+[\d.]+\s+Tf', block[pos:])
            if tf_match:
                current_font = tf_match.group(1).decode('ascii')
                pos += tf_match.end()
                continue

            # Match TJ operator: [ ... ]TJ
            tj_match = re.match(rb'\s*\[([^\]]*)\]\s*TJ', block[pos:], re.DOTALL)
            if tj_match:
                tj_content = tj_match.group(1)
                cids = extract_cids_from_tj(tj_content)
                if current_font and cids:
                    if current_font not in results:
                        results[current_font] = []
                    results[current_font].extend(cids)
                pos += tj_match.end()
                continue

            pos += 1

    return results


# Known text for mapping:
# Page 0: Bold="Colaborador:" Regular="ADILER ALEX MATIAS RAMÃO"
# Page 1: Regular="ADRIANA MARIA MATTAS CAMPOS"
# Page 2: Regular="ALBERTO ORT AQUINO BOZELLI"

KNOWN_NAMES = {
    0: "ADILER ALEX MATIAS RAMÃO",
    1: "ADRIANA MARIA MATTAS CAMPOS",
    2: "ALBERTO ORT AQUINO BOZELLI",
}

COLABORADOR_BOLD = "Colaborador: "  # 13 chars (note space after colon)


def build_cid_map(doc):
    """Build CID→char mapping from known text."""
    regular_map = {}
    bold_map = {}

    for page_num, known_name in KNOWN_NAMES.items():
        cids_by_font = extract_page_cids(doc, page_num)
        print(f"\n=== Page {page_num} ===")
        for font, cids in cids_by_font.items():
            print(f"  Font {font}: {cids[:30]}...")

        # The "Colaborador:" block should be first
        # R11 = Bold, R14 = Regular (may vary per page)
        # Find the font used for bold text
        # Strategy: look for the font that has 12-13 CIDs matching "Colaborador:"

        for font, cids in cids_by_font.items():
            # Check if first 12-13 CIDs could be "Colaborador:"
            if len(cids) >= 12:
                first_cids = cids[:13]
                print(f"  {font} first 13 CIDs: {first_cids}")

    return regular_map, bold_map


if __name__ == "__main__":
    pdf_path = sys.argv[1] if len(sys.argv) > 1 else 'C:/Users/vinia/Downloads/Downloads Google/Espelho de Ponto.pdf'
    doc = fitz.open(pdf_path)
    print(f"Pages: {len(doc)}")

    build_cid_map(doc)
    doc.close()
