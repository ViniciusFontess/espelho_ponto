import sys
from src.pdf_loader import load_pages
from src.hash_extractor import extract_hash
from src.data_parser import parse_employee
from src.validator import validate_hash
from src.output_writer import write_employee_json


def run(pdf_path: str, output_dir: str = "output") -> list[dict]:
    pages = load_pages(pdf_path)
    results = []
    for page in pages:
        text = page["text"]
        hash_str = extract_hash(text)
        validation = validate_hash(hash_str)
        employee = parse_employee(text)
        record = {"hash": hash_str, **validation, **employee}
        write_employee_json(record, output_dir)
        results.append(record)
    return results


if __name__ == "__main__":
    pdf_path = sys.argv[1] if len(sys.argv) > 1 else None
    if not pdf_path:
        print("Uso: python src/pipeline.py <caminho_do_pdf>")
        sys.exit(1)
    results = run(pdf_path)
    validos = sum(1 for r in results if r["hash_valido"])
    print(f"Processados: {len(results)} funcionários | Assinados: {validos} | Sem assinatura: {len(results) - validos}")
