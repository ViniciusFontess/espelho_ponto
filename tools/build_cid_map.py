"""
Build a complete CID→Unicode mapping for the NimbusSans-Regular font
used in the Type B Pontomais Jornada PDF.

Strategy: extract CID sequences from pages where we know the text
(from rendered images), then map CIDs to characters.

Known from rendered images:
  Page 0: "ADILER ALEX MATIAS RAMÃO"   period: 01/01/2026 até 31/01/2026
  Page 1: "ADRIANA MARIA MATTAS CAMPOS"
  Page 2: "ALBERTO ORT AQUINO BOZELLI"
"""
import fitz
import re
import sys

BACKSLASH = 92

def parse_pdf_string(raw: bytes) -> bytes:
    result = bytearray()
    i = 0
    while i < len(raw):
        b = raw[i]
        if b == BACKSLASH:
            if i + 1 < len(raw):
                nb = raw[i + 1]
                if nb == ord('n'):
                    result.append(10)
                elif nb == ord('r'):
                    result.append(13)
                elif nb == ord('t'):
                    result.append(9)
                elif nb == ord('b'):
                    result.append(8)
                elif nb == ord('f'):
                    result.append(12)
                elif nb == ord('('):
                    result.append(40)
                elif nb == ord(')'):
                    result.append(41)
                elif nb == BACKSLASH:
                    result.append(BACKSLASH)
                elif 48 <= nb <= 55:
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
    cids = []
    i = 0
    while i < len(tj_content):
        if tj_content[i:i+1] == b'(':
            j = i + 1
            depth = 1
            while j < len(tj_content) and depth > 0:
                if tj_content[j] == BACKSLASH:
                    j += 2
                    continue
                if tj_content[j] == ord('('):
                    depth += 1
                elif tj_content[j] == ord(')'):
                    depth -= 1
                j += 1
            string_raw = tj_content[i+1:j-1]
            string_bytes = parse_pdf_string(string_raw)
            for k in range(0, len(string_bytes) - 1, 2):
                cid = (string_bytes[k] << 8) | string_bytes[k+1]
                cids.append(cid)
            i = j
        else:
            i += 1
    return cids


def get_page_blocks_by_font(doc, page_num: int) -> list:
    """
    Returns list of {'font': str, 'cids': list, 'y': float} blocks for a page.
    """
    page = doc[page_num]
    page_obj = doc.xref_object(page.xref)
    contents_match = re.search(r'/Contents\s+(\d+)\s+0\s+R', page_obj)
    if not contents_match:
        return []

    contents_xref = int(contents_match.group(1))
    contents = doc.xref_stream(contents_xref)

    blocks = []

    for bt_match in re.finditer(rb'BT\b(.*?)ET\b', contents, re.DOTALL):
        block = bt_match.group(1)
        current_font = None
        pos = 0
        current_y = 0

        while pos < len(block):
            # Match Tm operator: a b c d e f Tm  (position)
            tm_match = re.match(
                rb'\s*[\d.+\-e]+\s+[\d.+\-e]+\s+[\d.+\-e]+\s+[\d.+\-e]+\s+([\d.+\-e]+)\s+([\d.+\-e]+)\s+Tm',
                block[pos:]
            )
            if tm_match:
                current_y = float(tm_match.group(2))
                pos += tm_match.end()
                continue

            # Match Tf operator
            tf_match = re.match(rb'\s*/(\w+)\s+[\d.]+\s+Tf', block[pos:])
            if tf_match:
                current_font = tf_match.group(1).decode('ascii')
                pos += tf_match.end()
                continue

            # Match TJ operator
            tj_match = re.match(rb'\s*\[([^\]]*)\]\s*TJ', block[pos:], re.DOTALL)
            if tj_match:
                tj_content = tj_match.group(1)
                cids = extract_cids_from_tj(tj_content)
                if current_font and cids:
                    blocks.append({'font': current_font, 'cids': cids, 'y': current_y})
                pos += tj_match.end()
                continue

            pos += 1

    return blocks


def decode_cids(cids: list, cid_map: dict, fallback='?') -> str:
    return ''.join(cid_map.get(cid, fallback) for cid in cids)


# Build mapping from known data
# Regular font mapping for page 0:
# Name: ADILER ALEX MATIAS RAMÃO (24 chars)
# After name: De 01/01/2026 até 31/01/2026
#             D e _ 0 1 / 0 1 / 2 0 2 6 _ a t é _ 3 1 / 0 1 / 2 0 2 6

REGULAR_MAP_KNOWN_UPPERCASE = {
    1: 'A', 2: 'D', 3: 'I', 4: 'L', 5: 'E', 6: 'R', 7: ' ',
    8: 'X', 9: 'M', 10: 'T', 11: 'S', 12: 'Ã', 13: 'O',
    24: 'P', 27: 'N', 28: 'U', 36: 'Q', 42: 'C', 67: 'B', 68: 'Z',
}

# From "De 01/01/2026 até 31/01/2026" (after name in R14 stream)
# We'll derive lowercase/digit mapping by analyzing the sequence

def analyze_period_cids(page0_r14_cids: list) -> dict:
    """
    Given the R14 CID list for page 0, the first 24 CIDs are the name.
    What follows should be "De 01/01/2026 até 31/01/2026".
    """
    # Skip the name (24 CIDs)
    rest = page0_r14_cids[24:]
    print(f"After name CIDs: {rest[:40]}")

    # "De 01/01/2026 até 31/01/2026"
    expected = "De 01/01/2026 até 31/01/2026"
    new_map = {}

    if len(rest) >= len(expected):
        for i, ch in enumerate(expected):
            cid = rest[i]
            if cid not in REGULAR_MAP_KNOWN_UPPERCASE and cid not in new_map:
                new_map[cid] = ch
                print(f"  Mapped CID {cid} → {repr(ch)}")
            elif new_map.get(cid, REGULAR_MAP_KNOWN_UPPERCASE.get(cid)) != ch:
                print(f"  CONFLICT at {i}: CID {cid} already mapped to {new_map.get(cid, REGULAR_MAP_KNOWN_UPPERCASE.get(cid))} but expected {repr(ch)}")

    return new_map


if __name__ == '__main__':
    pdf_path = sys.argv[1] if len(sys.argv) > 1 else 'C:/Users/vinia/Downloads/Downloads Google/Espelho de Ponto.pdf'
    doc = fitz.open(pdf_path)

    print("=== Extracting blocks for page 0 ===")
    blocks = get_page_blocks_by_font(doc, 0)

    # Print first few blocks
    r14_combined = []
    for b in blocks:
        font = b['font']
        cids = b['cids']
        print(f"Font={font} y={b['y']:.1f} CIDs({len(cids)}): {cids[:30]}...")
        if font == 'R14':
            r14_combined.extend(cids)

    print(f"\nAll R14 CIDs combined ({len(r14_combined)}): {r14_combined[:60]}")

    # Find the Colaborador block (first R14 block that starts with name)
    # The first R14 block should start with "ADILER..." CIDs
    first_r14 = next((b for b in blocks if b['font'] == 'R14'), None)
    if first_r14:
        print(f"\nFirst R14 block CIDs: {first_r14['cids']}")
        # Decode with known uppercase map
        decoded = decode_cids(first_r14['cids'][:24], REGULAR_MAP_KNOWN_UPPERCASE, '?')
        print(f"Decoded name attempt: '{decoded}'")

    # Try to find date CIDs - look in blocks near the top of page (high y values in PDF coords)
    print("\n=== All blocks sorted by y (highest first = near top of page in PDF coords) ===")
    for b in sorted(blocks, key=lambda x: -x['y'])[:10]:
        print(f"  Font={b['font']} y={b['y']:.1f} ({len(b['cids'])} CIDs): {b['cids'][:20]}")

    doc.close()
