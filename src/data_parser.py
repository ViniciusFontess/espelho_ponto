import re
from typing import Any


def _next_line_after(label: str, lines: list[str]) -> str:
    for i, line in enumerate(lines):
        if line.strip() == label and i + 1 < len(lines):
            return lines[i + 1].strip()
    return ""


def _parse_period(text: str) -> str:
    match = re.search(r"De\s+(\d{2}/\d{2}/\d{4})\s+até\s+(\d{2}/\d{2}/\d{4})", text)
    return f"{match.group(1)} - {match.group(2)}" if match else ""


def _parse_days(lines: list[str]) -> list[dict]:
    days = []
    day_pattern = re.compile(r"^(Seg|Ter|Qua|Qui|Sex|Sáb|Sab|Dom),\s+(\d{2}/\d{2}/\d{4})$")
    time_pattern = re.compile(r"^-?\d{2}:\d{2}$")
    i = 0
    while i < len(lines):
        m = day_pattern.match(lines[i].strip())
        if m:
            day_name = m.group(1)
            date = m.group(2)
            times = []
            j = i + 1
            while j < len(lines) and len(times) < 4:
                t = lines[j].strip()
                if time_pattern.match(t):
                    times.append(t)
                    j += 1
                else:
                    break
            while len(times) < 4:
                times.append("")
            days.append({
                "data": date,
                "dia_semana": day_name,
                "entrada_1": times[0],
                "saida_1": times[1],
                "entrada_2": times[2],
                "saida_2": times[3],
            })
            i = j
        else:
            i += 1
    return days


def _parse_assinatura(text: str) -> dict | None:
    if "Comprovante de aceite eletrônico" not in text:
        return None
    nome_match = re.search(r"Assinatura\s*\n(.+)\n", text)
    data_match = re.search(r"Data/Hora:\s*(.+?)(?:\s*\n|\s*$)", text)
    proto_match = re.search(r"Protocolo:\s*([a-fA-F0-9]{32})", text)
    return {
        "nome": nome_match.group(1).strip() if nome_match else "",
        "data_hora": data_match.group(1).strip() if data_match else "",
        "protocolo": proto_match.group(1) if proto_match else "",
    }


def parse_employee(text: str) -> dict[str, Any]:
    lines = text.splitlines()
    return {
        "nome": _next_line_after("Nome", lines),
        "matricula": _next_line_after("Matrícula", lines),
        "cpf": _next_line_after("CPF", lines),
        "pis": _next_line_after("PIS", lines),
        "cargo": _next_line_after("Cargo", lines),
        "equipe": _next_line_after("Equipe", lines),
        "periodo": _parse_period(text),
        "dias": _parse_days(lines),
        "assinatura": _parse_assinatura(text),
    }
