# Espelho Ponto — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir pipeline modular em Python para extrair dados de espelhos-ponto de PDF do SEBRAE e expor via interface web simples de upload.

**Architecture:** PyMuPDF extrai texto página por página (1 página = 1 funcionário). Módulos independentes tratam hash, parsing, validação e escrita. FastAPI orquestra a API; HTML vanilla consome via fetch.

**Tech Stack:** Python 3.11+, PyMuPDF, reportlab, FastAPI, uvicorn, pytest, HTML/CSS/JS vanilla.

---

## File Map

| Arquivo | Responsabilidade |
|---|---|
| `requirements.txt` | Dependências do projeto |
| `tools/test_pdf_generator.py` | Gera PDF de teste com N funcionários fictícios |
| `src/__init__.py` | Torna src um pacote Python |
| `src/pdf_loader.py` | Abre PDF e retorna lista de páginas como texto |
| `src/hash_extractor.py` | Extrai hash do topo do texto de cada página |
| `src/data_parser.py` | Extrai nome, matrícula, setor, período e dias do texto |
| `src/validator.py` | Valida presença e formato do hash |
| `src/output_writer.py` | Salva JSON por funcionário em `output/` |
| `src/pipeline.py` | Orquestra todos os módulos; entrada da CLI e da API |
| `web/main.py` | FastAPI: POST /upload, GET /results/{job_id}, GET / |
| `web/static/index.html` | Página única: upload + botão + tabela de resultados |
| `tests/__init__.py` | Torna tests um pacote Python |
| `tests/test_hash_extractor.py` | Testes unitários do hash_extractor |
| `tests/test_data_parser.py` | Testes unitários do data_parser |
| `tests/test_validator.py` | Testes unitários do validator |
| `tests/test_pdf_loader.py` | Testes do pdf_loader (usa PDF gerado) |
| `tests/test_output_writer.py` | Testes do output_writer |
| `tests/test_pipeline.py` | Teste de integração do pipeline completo |

---

## Task 1: Project Setup

**Files:**
- Create: `requirements.txt`
- Create: `src/__init__.py`
- Create: `tests/__init__.py`
- Create: `web/__init__.py`
- Create: `web/static/.gitkeep`
- Create: `output/.gitkeep`
- Create: `tools/.gitkeep`

- [ ] **Step 1: Criar requirements.txt**

```
PyMuPDF==1.24.3
reportlab==4.2.2
fastapi==0.111.0
uvicorn==0.30.1
python-multipart==0.0.9
pytest==8.2.0
httpx==0.27.0
```

- [ ] **Step 2: Criar pacotes e pastas**

```bash
mkdir src tests web tools output
echo "" > src/__init__.py
echo "" > tests/__init__.py
echo "" > web/__init__.py
mkdir web/static
echo "" > output/.gitkeep
```

- [ ] **Step 3: Instalar dependências**

```bash
pip install -r requirements.txt
```

Saída esperada: `Successfully installed PyMuPDF reportlab fastapi uvicorn python-multipart pytest httpx`

- [ ] **Step 4: Commit**

```bash
git add requirements.txt src/__init__.py tests/__init__.py web/__init__.py
git commit -m "chore: project setup and dependencies"
```

---

## Task 2: Test PDF Generator

**Files:**
- Create: `tools/test_pdf_generator.py`
- Generates: `tests/espelho_ponto_teste.pdf`

> Este módulo não segue TDD pois é uma ferramenta geradora, não lógica de negócio.
> O PDF gerado serve como fixture para os testes dos módulos seguintes.

- [ ] **Step 1: Criar tools/test_pdf_generator.py**

```python
import hashlib
import random
import calendar
import sys
from pathlib import Path
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak

NOMES = [
    "João da Silva", "Maria Oliveira", "Carlos Souza", "Ana Lima",
    "Pedro Santos", "Fernanda Costa", "Lucas Pereira", "Juliana Alves",
    "Roberto Ferreira", "Patrícia Rodrigues", "Marcos Gomes", "Camila Martins",
    "Thiago Barbosa", "Larissa Ribeiro", "Diego Carvalho", "Beatriz Nunes",
    "Rafael Monteiro", "Tatiane Freitas", "Bruno Cardoso", "Vanessa Correia",
]

SETORES = ["Administrativo", "Financeiro", "TI", "RH", "Comercial", "Jurídico"]


def _gerar_hash(nome: str, matricula: str) -> str:
    return hashlib.sha256(f"{nome}{matricula}2026".encode()).hexdigest()


def _gerar_dias(mes: int = 1, ano: int = 2026) -> list[tuple[str, str, str]]:
    dias = []
    for dia in range(1, calendar.monthrange(ano, mes)[1] + 1):
        weekday = calendar.weekday(ano, mes, dia)
        if weekday >= 5:
            continue
        data = f"{dia:02d}/{mes:02d}/{ano}"
        h_entrada = random.randint(7, 9)
        m_entrada = random.randint(0, 59)
        h_saida = h_entrada + 8 + random.randint(0, 1)
        m_saida = random.randint(0, 59)
        dias.append((data, f"{h_entrada:02d}:{m_entrada:02d}", f"{h_saida:02d}:{m_saida:02d}"))
    return dias


def gerar_pdf(n: int = 10, output_path: str = "tests/espelho_ponto_teste.pdf") -> None:
    Path(output_path).parent.mkdir(exist_ok=True)
    styles = getSampleStyleSheet()
    mono = ParagraphStyle("mono", fontName="Courier", fontSize=8, alignment=TA_LEFT)
    normal = styles["Normal"]

    story = []
    nomes = random.sample(NOMES, min(n, len(NOMES)))

    for i, nome in enumerate(nomes):
        matricula = str(1000 + i)
        setor = random.choice(SETORES)
        periodo = "01/01/2026 - 31/01/2026"
        com_hash = random.random() > 0.2  # 80% dos funcionários têm hash

        if com_hash:
            story.append(Paragraph(f"HASH: {_gerar_hash(nome, matricula)}", mono))
        else:
            story.append(Paragraph("SEM ASSINATURA", mono))

        story.append(Spacer(1, 0.4 * cm))
        story.append(Paragraph(f"Nome: {nome}", normal))
        story.append(Paragraph(f"Matrícula: {matricula}", normal))
        story.append(Paragraph(f"Setor: {setor}", normal))
        story.append(Paragraph(f"Período: {periodo}", normal))
        story.append(Spacer(1, 0.4 * cm))

        story.append(Paragraph("Data         Entrada  Saída", mono))
        story.append(Paragraph("-" * 35, mono))
        for data, entrada, saida in _gerar_dias():
            story.append(Paragraph(f"{data}   {entrada}    {saida}", mono))

        if i < len(nomes) - 1:
            story.append(PageBreak())

    doc = SimpleDocTemplate(output_path, pagesize=A4)
    doc.build(story)
    print(f"PDF gerado: {output_path} ({len(nomes)} funcionários, ~20% sem hash)")


if __name__ == "__main__":
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 10
    gerar_pdf(n)
```

- [ ] **Step 2: Gerar o PDF de teste**

```bash
python tools/test_pdf_generator.py 10
```

Saída esperada: `PDF gerado: tests/espelho_ponto_teste.pdf (10 funcionários, ~20% sem hash)`

- [ ] **Step 3: Verificar que o arquivo foi criado**

```bash
python -c "from pathlib import Path; p = Path('tests/espelho_ponto_teste.pdf'); print(f'OK: {p.stat().st_size} bytes')"
```

Saída esperada: `OK: <tamanho> bytes` (qualquer valor > 0)

- [ ] **Step 4: Commit**

```bash
git add tools/test_pdf_generator.py tests/espelho_ponto_teste.pdf
git commit -m "feat: add test PDF generator with N configurable employees"
```

---

## Task 3: hash_extractor

**Files:**
- Create: `tests/test_hash_extractor.py`
- Create: `src/hash_extractor.py`

- [ ] **Step 1: Escrever os testes que falham**

```python
# tests/test_hash_extractor.py
from src.hash_extractor import extract_hash

HASH_VALIDO = "a3f9c2e1b4d7" + "0" * 52  # 64 chars hex


def test_extrai_hash_presente():
    text = f"HASH: {HASH_VALIDO}\nNome: João da Silva\nMatrícula: 12345"
    assert extract_hash(text) == HASH_VALIDO


def test_retorna_none_sem_hash():
    text = "SEM ASSINATURA\nNome: João da Silva\nMatrícula: 12345"
    assert extract_hash(text) is None


def test_retorna_none_texto_vazio():
    assert extract_hash("") is None


def test_ignora_hash_no_meio_do_texto():
    text = "Nome: João\nHASH: nao_deve_pegar\nMatrícula: 123"
    assert extract_hash(text) is None
```

- [ ] **Step 2: Rodar para confirmar falha**

```bash
pytest tests/test_hash_extractor.py -v
```

Saída esperada: `FAILED` (ModuleNotFoundError ou ImportError)

- [ ] **Step 3: Implementar src/hash_extractor.py**

```python
import re


def extract_hash(text: str) -> str | None:
    match = re.match(r"^HASH:\s*(\S+)", text.strip())
    return match.group(1) if match else None
```

- [ ] **Step 4: Rodar testes para confirmar aprovação**

```bash
pytest tests/test_hash_extractor.py -v
```

Saída esperada: `4 passed`

- [ ] **Step 5: Commit**

```bash
git add src/hash_extractor.py tests/test_hash_extractor.py
git commit -m "feat: add hash_extractor module with tests"
```

---

## Task 4: data_parser

**Files:**
- Create: `tests/test_data_parser.py`
- Create: `src/data_parser.py`

- [ ] **Step 1: Escrever os testes que falham**

```python
# tests/test_data_parser.py
from src.data_parser import parse_employee

TEXTO_COMPLETO = """HASH: abc123
Nome: João da Silva
Matrícula: 12345
Setor: Administrativo
Período: 01/01/2026 - 31/01/2026

Data         Entrada  Saída
-----------------------------------
01/01/2026   08:00    17:00
02/01/2026   08:05    17:10
03/01/2026   07:55    16:58"""


def test_extrai_nome():
    result = parse_employee(TEXTO_COMPLETO)
    assert result["nome"] == "João da Silva"


def test_extrai_matricula():
    result = parse_employee(TEXTO_COMPLETO)
    assert result["matricula"] == "12345"


def test_extrai_setor():
    result = parse_employee(TEXTO_COMPLETO)
    assert result["setor"] == "Administrativo"


def test_extrai_periodo():
    result = parse_employee(TEXTO_COMPLETO)
    assert result["periodo"] == "01/01/2026 - 31/01/2026"


def test_extrai_dias():
    result = parse_employee(TEXTO_COMPLETO)
    assert len(result["dias"]) == 3
    assert result["dias"][0] == {"data": "01/01/2026", "entrada": "08:00", "saida": "17:00"}
    assert result["dias"][2] == {"data": "03/01/2026", "entrada": "07:55", "saida": "16:58"}


def test_retorna_strings_vazias_se_campos_ausentes():
    result = parse_employee("texto sem campos conhecidos")
    assert result["nome"] == ""
    assert result["matricula"] == ""
    assert result["dias"] == []
```

- [ ] **Step 2: Rodar para confirmar falha**

```bash
pytest tests/test_data_parser.py -v
```

Saída esperada: `FAILED` (ImportError)

- [ ] **Step 3: Implementar src/data_parser.py**

```python
import re
from typing import Any


def parse_employee(text: str) -> dict[str, Any]:
    def _find(pattern: str) -> str:
        m = re.search(pattern, text, re.MULTILINE)
        return m.group(1).strip() if m else ""

    nome = _find(r"^Nome:\s*(.+)$")
    matricula = _find(r"^Matrícula:\s*(.+)$")
    setor = _find(r"^Setor:\s*(.+)$")
    periodo = _find(r"^Período:\s*(.+)$")

    dias_raw = re.findall(
        r"(\d{2}/\d{2}/\d{4})\s+(\d{2}:\d{2})\s+(\d{2}:\d{2})", text
    )
    dias = [{"data": d, "entrada": e, "saida": s} for d, e, s in dias_raw]

    return {
        "nome": nome,
        "matricula": matricula,
        "setor": setor,
        "periodo": periodo,
        "dias": dias,
    }
```

- [ ] **Step 4: Rodar testes**

```bash
pytest tests/test_data_parser.py -v
```

Saída esperada: `6 passed`

- [ ] **Step 5: Commit**

```bash
git add src/data_parser.py tests/test_data_parser.py
git commit -m "feat: add data_parser module with tests"
```

---

## Task 5: validator

**Files:**
- Create: `tests/test_validator.py`
- Create: `src/validator.py`

- [ ] **Step 1: Escrever os testes que falham**

```python
# tests/test_validator.py
from src.validator import validate_hash

HASH_SHA256 = "a" * 64  # 64 chars hex válido


def test_hash_presente_e_valido():
    result = validate_hash(HASH_SHA256)
    assert result == {"hash_presente": True, "hash_valido": True}


def test_hash_ausente():
    result = validate_hash(None)
    assert result == {"hash_presente": False, "hash_valido": False}


def test_hash_presente_formato_invalido():
    result = validate_hash("abc123")  # curto demais
    assert result == {"hash_presente": True, "hash_valido": False}


def test_hash_com_chars_invalidos():
    result = validate_hash("z" * 64)  # 'z' não é hex
    assert result == {"hash_presente": True, "hash_valido": False}
```

- [ ] **Step 2: Rodar para confirmar falha**

```bash
pytest tests/test_validator.py -v
```

Saída esperada: `FAILED` (ImportError)

- [ ] **Step 3: Implementar src/validator.py**

```python
import re


def validate_hash(hash_str: str | None) -> dict[str, bool]:
    if hash_str is None:
        return {"hash_presente": False, "hash_valido": False}
    is_valid = bool(re.fullmatch(r"[a-fA-F0-9]{64}", hash_str))
    return {"hash_presente": True, "hash_valido": is_valid}
```

- [ ] **Step 4: Rodar testes**

```bash
pytest tests/test_validator.py -v
```

Saída esperada: `4 passed`

- [ ] **Step 5: Commit**

```bash
git add src/validator.py tests/test_validator.py
git commit -m "feat: add validator module with tests"
```

---

## Task 6: pdf_loader

**Files:**
- Create: `tests/test_pdf_loader.py`
- Create: `src/pdf_loader.py`

> Depende do PDF gerado na Task 2. Garanta que `tests/espelho_ponto_teste.pdf` existe antes de rodar.

- [ ] **Step 1: Escrever os testes que falham**

```python
# tests/test_pdf_loader.py
from pathlib import Path
import pytest
from src.pdf_loader import load_pages

PDF_TESTE = "tests/espelho_ponto_teste.pdf"


def test_pdf_existe():
    assert Path(PDF_TESTE).exists(), f"Gere o PDF primeiro: python tools/test_pdf_generator.py"


def test_retorna_lista_nao_vazia():
    pages = load_pages(PDF_TESTE)
    assert isinstance(pages, list)
    assert len(pages) > 0


def test_cada_pagina_tem_page_num_e_text():
    pages = load_pages(PDF_TESTE)
    for page in pages:
        assert "page_num" in page
        assert "text" in page
        assert isinstance(page["page_num"], int)
        assert isinstance(page["text"], str)


def test_page_num_comeca_em_1():
    pages = load_pages(PDF_TESTE)
    assert pages[0]["page_num"] == 1


def test_texto_contem_nome():
    pages = load_pages(PDF_TESTE)
    # Pelo menos uma página deve conter "Nome:"
    textos = [p["text"] for p in pages]
    assert any("Nome:" in t for t in textos)
```

- [ ] **Step 2: Rodar para confirmar falha**

```bash
pytest tests/test_pdf_loader.py -v
```

Saída esperada: `FAILED` (ImportError)

- [ ] **Step 3: Implementar src/pdf_loader.py**

```python
import fitz


def load_pages(pdf_path: str) -> list[dict]:
    doc = fitz.open(pdf_path)
    pages = [
        {"page_num": i + 1, "text": page.get_text()}
        for i, page in enumerate(doc)
    ]
    doc.close()
    return pages
```

- [ ] **Step 4: Rodar testes**

```bash
pytest tests/test_pdf_loader.py -v
```

Saída esperada: `5 passed`

- [ ] **Step 5: Commit**

```bash
git add src/pdf_loader.py tests/test_pdf_loader.py
git commit -m "feat: add pdf_loader module with tests"
```

---

## Task 7: output_writer

**Files:**
- Create: `tests/test_output_writer.py`
- Create: `src/output_writer.py`

- [ ] **Step 1: Escrever os testes que falham**

```python
# tests/test_output_writer.py
import json
import tempfile
from pathlib import Path
from src.output_writer import write_employee_json

FUNCIONARIO = {
    "hash": "a" * 64,
    "hash_presente": True,
    "hash_valido": True,
    "nome": "João da Silva",
    "matricula": "12345",
    "setor": "Administrativo",
    "periodo": "01/01/2026 - 31/01/2026",
    "dias": [{"data": "01/01/2026", "entrada": "08:00", "saida": "17:00"}],
}


def test_cria_arquivo_json(tmp_path):
    filepath = write_employee_json(FUNCIONARIO, output_dir=str(tmp_path))
    assert filepath.exists()


def test_conteudo_json_correto(tmp_path):
    filepath = write_employee_json(FUNCIONARIO, output_dir=str(tmp_path))
    data = json.loads(filepath.read_text(encoding="utf-8"))
    assert data["nome"] == "João da Silva"
    assert data["matricula"] == "12345"
    assert len(data["dias"]) == 1


def test_nome_arquivo_usa_matricula_e_nome(tmp_path):
    filepath = write_employee_json(FUNCIONARIO, output_dir=str(tmp_path))
    assert "12345" in filepath.name
    assert "João" in filepath.name


def test_cria_diretorio_se_nao_existir(tmp_path):
    output_dir = tmp_path / "novo_dir"
    write_employee_json(FUNCIONARIO, output_dir=str(output_dir))
    assert output_dir.exists()
```

- [ ] **Step 2: Rodar para confirmar falha**

```bash
pytest tests/test_output_writer.py -v
```

Saída esperada: `FAILED` (ImportError)

- [ ] **Step 3: Implementar src/output_writer.py**

```python
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
```

- [ ] **Step 4: Rodar testes**

```bash
pytest tests/test_output_writer.py -v
```

Saída esperada: `4 passed`

- [ ] **Step 5: Commit**

```bash
git add src/output_writer.py tests/test_output_writer.py
git commit -m "feat: add output_writer module with tests"
```

---

## Task 8: pipeline (integração)

**Files:**
- Create: `tests/test_pipeline.py`
- Create: `src/pipeline.py`

- [ ] **Step 1: Escrever os testes que falham**

```python
# tests/test_pipeline.py
import tempfile
from pathlib import Path
from src.pipeline import run

PDF_TESTE = "tests/espelho_ponto_teste.pdf"


def test_pipeline_retorna_lista(tmp_path):
    results = run(PDF_TESTE, output_dir=str(tmp_path))
    assert isinstance(results, list)
    assert len(results) > 0


def test_cada_resultado_tem_campos_obrigatorios(tmp_path):
    results = run(PDF_TESTE, output_dir=str(tmp_path))
    campos = {"hash", "hash_presente", "hash_valido", "nome", "matricula", "setor", "periodo", "dias"}
    for r in results:
        assert campos.issubset(r.keys()), f"Campos ausentes em: {r}"


def test_pipeline_cria_jsons(tmp_path):
    results = run(PDF_TESTE, output_dir=str(tmp_path))
    jsons = list(tmp_path.glob("*.json"))
    assert len(jsons) == len(results)


def test_algum_funcionario_tem_hash_valido(tmp_path):
    results = run(PDF_TESTE, output_dir=str(tmp_path))
    assert any(r["hash_valido"] for r in results)


def test_algum_funcionario_sem_hash(tmp_path):
    results = run(PDF_TESTE, output_dir=str(tmp_path))
    # O gerador cria ~20% sem hash — em 10 funcionários, pelo menos 1
    assert any(not r["hash_presente"] for r in results)
```

- [ ] **Step 2: Rodar para confirmar falha**

```bash
pytest tests/test_pipeline.py -v
```

Saída esperada: `FAILED` (ImportError)

- [ ] **Step 3: Implementar src/pipeline.py**

```python
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
    pdf_path = sys.argv[1] if len(sys.argv) > 1 else "tests/espelho_ponto_teste.pdf"
    results = run(pdf_path)
    validos = sum(1 for r in results if r["hash_valido"])
    print(f"Processados: {len(results)} funcionários | Hash válido: {validos} | Sem hash: {len(results) - validos}")
```

- [ ] **Step 4: Rodar todos os testes**

```bash
pytest -v
```

Saída esperada: todos os testes passam

- [ ] **Step 5: Testar via CLI**

```bash
python src/pipeline.py tests/espelho_ponto_teste.pdf
```

Saída esperada: `Processados: 10 funcionários | Hash válido: X | Sem hash: Y`

- [ ] **Step 6: Commit**

```bash
git add src/pipeline.py tests/test_pipeline.py
git commit -m "feat: add pipeline orchestrator with integration tests"
```

---

## Task 9: FastAPI Backend

**Files:**
- Create: `web/main.py`

- [ ] **Step 1: Criar web/main.py**

```python
import asyncio
import uuid
from pathlib import Path

from fastapi import FastAPI, UploadFile, File
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from src.pipeline import run

app = FastAPI(title="Espelho Ponto")
app.mount("/static", StaticFiles(directory="web/static"), name="static")

_jobs: dict[str, dict] = {}


@app.get("/")
def index():
    return FileResponse("web/static/index.html")


@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    if not file.filename.endswith(".pdf"):
        return JSONResponse(status_code=400, content={"error": "Somente arquivos PDF são aceitos."})

    job_id = str(uuid.uuid4())
    tmp_path = Path(f"tmp_{job_id}.pdf")
    tmp_path.write_bytes(await file.read())

    _jobs[job_id] = {"status": "processing", "results": []}
    asyncio.create_task(_process(job_id, str(tmp_path)))

    return {"job_id": job_id}


@app.get("/results/{job_id}")
def get_results(job_id: str):
    job = _jobs.get(job_id)
    if not job:
        return JSONResponse(status_code=404, content={"error": "Job não encontrado."})
    return job


async def _process(job_id: str, pdf_path: str) -> None:
    try:
        results = await asyncio.to_thread(run, pdf_path)
        _jobs[job_id] = {"status": "done", "results": results}
    except Exception as exc:
        _jobs[job_id] = {"status": "error", "error": str(exc)}
    finally:
        Path(pdf_path).unlink(missing_ok=True)
```

- [ ] **Step 2: Testar manualmente que o servidor sobe**

```bash
uvicorn web.main:app --reload --port 8000
```

Saída esperada: `Uvicorn running on http://127.0.0.1:8000`

Pressione `Ctrl+C` para parar após confirmar.

- [ ] **Step 3: Commit**

```bash
git add web/main.py
git commit -m "feat: add FastAPI backend with upload and results endpoints"
```

---

## Task 10: Frontend (index.html)

**Files:**
- Create: `web/static/index.html`

- [ ] **Step 1: Criar web/static/index.html**

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Espelho Ponto — SEBRAE</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; background: #f4f6f8; color: #1a1a1a; }

    header {
      background: #003c82;
      color: white;
      padding: 1rem 2rem;
      font-size: 1.2rem;
      font-weight: 600;
    }

    main { max-width: 1100px; margin: 2rem auto; padding: 0 1rem; }

    .card {
      background: white;
      border-radius: 8px;
      padding: 2rem;
      box-shadow: 0 1px 4px rgba(0,0,0,.1);
      margin-bottom: 1.5rem;
    }

    .upload-area {
      border: 2px dashed #003c82;
      border-radius: 8px;
      padding: 2.5rem;
      text-align: center;
      cursor: pointer;
      transition: background .2s;
    }
    .upload-area:hover, .upload-area.drag-over { background: #eef3ff; }
    .upload-area input { display: none; }
    .upload-area p { color: #555; margin-top: .5rem; font-size: .9rem; }

    button#btn-processar {
      margin-top: 1rem;
      background: #003c82;
      color: white;
      border: none;
      padding: .75rem 2rem;
      border-radius: 6px;
      font-size: 1rem;
      cursor: pointer;
      display: none;
    }
    button#btn-processar:disabled { background: #888; cursor: not-allowed; }

    #status { margin-top: 1rem; font-size: .9rem; color: #555; }

    table { width: 100%; border-collapse: collapse; font-size: .9rem; }
    th { background: #003c82; color: white; padding: .6rem 1rem; text-align: left; }
    td { padding: .6rem 1rem; border-bottom: 1px solid #e5e7eb; }
    tr:hover td { background: #f0f4ff; }

    .badge {
      display: inline-block;
      padding: .2rem .6rem;
      border-radius: 12px;
      font-size: .8rem;
      font-weight: 600;
    }
    .badge-ok { background: #d1fae5; color: #065f46; }
    .badge-fail { background: #fee2e2; color: #991b1b; }

    #resultado-section { display: none; }
  </style>
</head>
<body>

<header>Espelho Ponto — SEBRAE</header>

<main>
  <div class="card">
    <h2 style="margin-bottom:1rem;">Upload do PDF Mensal</h2>
    <div class="upload-area" id="drop-zone">
      <svg width="40" height="40" fill="#003c82" viewBox="0 0 24 24">
        <path d="M12 2a1 1 0 0 1 .707.293l4 4a1 1 0 0 1-1.414 1.414L13 5.414V15a1 1 0 0 1-2 0V5.414L8.707 7.707A1 1 0 0 1 7.293 6.293l4-4A1 1 0 0 1 12 2zM4 17a1 1 0 0 1 1 1v1h14v-1a1 1 0 0 1 2 0v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1a1 1 0 0 1 1-1z"/>
      </svg>
      <p id="drop-label">Arraste o PDF aqui ou <strong>clique para selecionar</strong></p>
      <input type="file" id="file-input" accept=".pdf" />
    </div>
    <button id="btn-processar">Processar PDF</button>
    <div id="status"></div>
  </div>

  <div class="card" id="resultado-section">
    <h2 style="margin-bottom:1rem;">Resultados</h2>
    <p id="resumo" style="margin-bottom:1rem; color:#555;"></p>
    <table>
      <thead>
        <tr>
          <th>Nome</th>
          <th>Matrícula</th>
          <th>Setor</th>
          <th>Período</th>
          <th>Dias</th>
          <th>Assinatura</th>
        </tr>
      </thead>
      <tbody id="tabela-body"></tbody>
    </table>
  </div>
</main>

<script>
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const btnProcessar = document.getElementById('btn-processar');
  const statusEl = document.getElementById('status');
  const resultadoSection = document.getElementById('resultado-section');
  const tabelaBody = document.getElementById('tabela-body');
  const resumoEl = document.getElementById('resumo');
  const dropLabel = document.getElementById('drop-label');

  let arquivoSelecionado = null;

  dropZone.addEventListener('click', () => fileInput.click());

  dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.pdf')) selecionarArquivo(file);
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) selecionarArquivo(fileInput.files[0]);
  });

  function selecionarArquivo(file) {
    arquivoSelecionado = file;
    dropLabel.innerHTML = `<strong>${file.name}</strong> (${(file.size / 1024).toFixed(0)} KB)`;
    btnProcessar.style.display = 'block';
    statusEl.textContent = '';
  }

  btnProcessar.addEventListener('click', async () => {
    if (!arquivoSelecionado) return;

    btnProcessar.disabled = true;
    statusEl.textContent = 'Enviando PDF...';
    resultadoSection.style.display = 'none';

    const form = new FormData();
    form.append('file', arquivoSelecionado);

    const resp = await fetch('/upload', { method: 'POST', body: form });
    if (!resp.ok) {
      statusEl.textContent = 'Erro ao enviar o PDF.';
      btnProcessar.disabled = false;
      return;
    }

    const { job_id } = await resp.json();
    statusEl.textContent = 'Processando...';
    aguardarResultado(job_id);
  });

  async function aguardarResultado(job_id) {
    const resp = await fetch(`/results/${job_id}`);
    const data = await resp.json();

    if (data.status === 'processing') {
      setTimeout(() => aguardarResultado(job_id), 2000);
      return;
    }

    btnProcessar.disabled = false;

    if (data.status === 'error') {
      statusEl.textContent = `Erro: ${data.error}`;
      return;
    }

    statusEl.textContent = '';
    renderizarTabela(data.results);
  }

  function renderizarTabela(results) {
    tabelaBody.innerHTML = '';
    const validos = results.filter(r => r.hash_valido).length;
    resumoEl.textContent = `${results.length} funcionários processados — ${validos} com assinatura válida, ${results.length - validos} sem assinatura.`;

    results.forEach(r => {
      const tr = document.createElement('tr');
      const badge = r.hash_valido
        ? '<span class="badge badge-ok">✓ Válida</span>'
        : r.hash_presente
          ? '<span class="badge badge-fail">✗ Inválida</span>'
          : '<span class="badge badge-fail">✗ Ausente</span>';
      tr.innerHTML = `
        <td>${r.nome || '—'}</td>
        <td>${r.matricula || '—'}</td>
        <td>${r.setor || '—'}</td>
        <td>${r.periodo || '—'}</td>
        <td>${r.dias.length}</td>
        <td>${badge}</td>
      `;
      tabelaBody.appendChild(tr);
    });

    resultadoSection.style.display = 'block';
    resultadoSection.scrollIntoView({ behavior: 'smooth' });
  }
</script>
</body>
</html>
```

- [ ] **Step 2: Subir o servidor e testar no browser**

```bash
uvicorn web.main:app --reload --port 8000
```

Abrir: `http://localhost:8000`

Verificar:
- Página carrega sem erros
- Upload do arquivo `tests/espelho_ponto_teste.pdf` funciona
- Tabela exibe os funcionários com badges de assinatura corretos
- Resumo exibe contagem correta

- [ ] **Step 3: Rodar toda a suite de testes**

```bash
pytest -v
```

Saída esperada: todos os testes passam

- [ ] **Step 4: Commit final**

```bash
git add web/static/index.html
git commit -m "feat: add single-page web frontend with upload and results table"
```

---

## Self-Review

### Cobertura do spec

| Requisito | Task |
|---|---|
| Gerar PDF de teste com N funcionários | Task 2 |
| Hash visível no topo da folha | Task 2 (gerador) + Task 3 (extractor) |
| Extrair nome, matrícula, setor, período, dias | Task 4 |
| Validar presença e formato do hash | Task 5 |
| Carregar PDF página por página (PyMuPDF) | Task 6 |
| Salvar JSON por funcionário | Task 7 |
| Orquestrar pipeline completo | Task 8 |
| FastAPI: POST /upload + GET /results/{job_id} | Task 9 |
| Frontend: upload + tabela de resultados | Task 10 |
| ~20% dos funcionários sem hash no PDF de teste | Task 2 |
| Processamento assíncrono (não trava o browser) | Task 9 |

### Assinaturas consistentes

- `load_pages(pdf_path: str) -> list[dict]` — Task 6, consumida em Task 8
- `extract_hash(text: str) -> str | None` — Task 3, consumida em Task 8
- `parse_employee(text: str) -> dict` — Task 4, consumida em Task 8
- `validate_hash(hash_str: str | None) -> dict` — Task 5, consumida em Task 8
- `write_employee_json(data: dict, output_dir: str) -> Path` — Task 7, consumida em Task 8
- `run(pdf_path: str, output_dir: str) -> list[dict]` — Task 8, consumida em Task 9

Todas consistentes entre tasks.

### Placeholders

Nenhum TBD, TODO ou step sem código encontrado.
