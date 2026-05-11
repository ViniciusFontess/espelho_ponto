import re


def extract_hash(text: str) -> str | None:
    match = re.search(r"Protocolo:\s*([a-fA-F0-9]{32})", text)
    return match.group(1) if match else None
