import json
from pathlib import Path


def write_employee_json(data: dict, output_dir: str = "output") -> Path:
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    safe_name = data["nome"].replace(" ", "_").replace("/", "_")
    filename = f"{data['matricula']}_{safe_name}.json"
    filepath = Path(output_dir) / filename
    filepath.write_text(
        json.dumps(data, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return filepath
