import fitz


def load_pages(pdf_path: str) -> list[dict]:
    doc = fitz.open(pdf_path)
    pages = [
        {"page_num": i + 1, "text": page.get_text()}
        for i, page in enumerate(doc)
    ]
    doc.close()
    return pages
