# Separador com Molde (v1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar o `espelho_ponto` na primeira fatia da Plataforma de Separação de Documentos do SEBRAE: um *shell* com 2 modos (Com Molde ativo / IA em breve) e o Separador com Molde completo, com 3 moldes, seleção de variáveis e entrega em ZIP.

**Architecture:** Backend FastAPI em camadas — registro de moldes (fixos em código), parsers puros (retornam registros sem escrever), filtro de variáveis, organizador em diretório temporário (reaproveita `folder_writer`), e camada de destino abstrata (`DestinoZip` no v1). Frontend React + Vite reescrito com 3 telas, fonte Roboto, paleta e logo SEBRAE.

**Tech Stack:** Python 3.13, PyMuPDF (fitz), FastAPI, pytest; React + Vite, framer-motion.

**Spec:** `docs/superpowers/specs/2026-06-18-plataforma-separador-documentos-design.md`

---

## File Structure

**Backend (novos):**
- `src/molde_registry.py` — modelo `Molde` + catálogo dos 3 moldes + acessores.
- `src/parsers_espelho.py` — `parse_espelho_eletronico(pdf_path)` puro (extraído do `pipeline._run_type_a`).
- `src/extracao.py` — `filtrar_variaveis(record, selecionadas)`.
- `src/destino.py` — interface `Destino` + `DestinoZip`.
- `src/processador.py` — orquestra: resolve molde → parser → filtro → organiza em temp → zip.

**Backend (modificados):**
- `src/pipeline.py` — passa a reusar `parse_espelho_eletronico`; `run()` mantido (compat).
- `web/main.py` — novos endpoints `/moldes`, `/upload` (com `molde_id`+`variaveis`), `/download/{job_id}`.

**Frontend (novos):**
- `frontend/src/theme.js` — constantes de paleta SEBRAE.
- `frontend/src/SebraeLogo.jsx` — componente SVG da logo.
- `frontend/src/Landing.jsx` — tela inicial (2 modos).
- `frontend/src/UploadMolde.jsx` — tela de upload do Separador com Molde.
- `frontend/src/Results.jsx` — tela de resultados + botão Baixar ZIP.

**Frontend (modificados):**
- `frontend/src/App.jsx` — vira roteador por estado (landing → upload → results).
- `frontend/index.html` — carrega Roboto em vez de Syne/Plus Jakarta.
- `frontend/src/index.css` — variáveis de cor SEBRAE + Roboto.

**Tests (novos):**
- `tests/test_molde_registry.py`, `tests/test_parsers_espelho.py`, `tests/test_extracao.py`,
  `tests/test_destino.py`, `tests/test_processador.py`.

---

## Task 1: Registro de Moldes

**Files:**
- Create: `src/molde_registry.py`
- Test: `tests/test_molde_registry.py`

- [ ] **Step 1: Write the failing test**

```python
# tests/test_molde_registry.py
from src.molde_registry import list_moldes, get_molde, Molde


def test_lista_tres_moldes():
    moldes = list_moldes()
    ids = {m.id for m in moldes}
    assert ids == {"espelho_eletronico", "espelho_jornada", "ferias_sebrae"}


def test_espelho_eletronico_e_ativo_com_parser():
    m = get_molde("espelho_eletronico")
    assert m.status == "ativo"
    assert m.parser is not None
    assert "assinatura" in m.variaveis


def test_jornada_e_ativo_com_parser():
    m = get_molde("espelho_jornada")
    assert m.status == "ativo"
    assert m.parser is not None
    assert "competencia" in m.variaveis


def test_ferias_e_exemplo_sem_parser():
    m = get_molde("ferias_sebrae")
    assert m.status == "exemplo"
    assert m.parser is None


def test_get_molde_inexistente_retorna_none():
    assert get_molde("nao_existe") is None
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_molde_registry.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'src.molde_registry'`

- [ ] **Step 3: Write minimal implementation**

```python
# src/molde_registry.py
"""
Registro de moldes conhecidos da Plataforma de Separação de Documentos.

Cada molde é uma entrada fixa em código com a lista COMPLETA de variáveis que
consegue extrair (descobertas a partir do PDF-modelo) e o parser dedicado.
Adicionar um molde novo = adicionar uma entrada aqui + seu parser.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Callable, Optional

from src.parsers_espelho import parse_espelho_eletronico
from src.jornada_parser import parse_jornada_pdf

# Parser assina: (pdf_path: str) -> list[dict]
Parser = Callable[[str], list]


@dataclass(frozen=True)
class Molde:
    id: str
    nome: str
    status: str  # "ativo" | "exemplo"
    variaveis: list  # lista completa de variáveis extraíveis
    parser: Optional[Parser] = None


_REGISTRY: dict[str, Molde] = {
    "espelho_eletronico": Molde(
        id="espelho_eletronico",
        nome="Espelho de Ponto — Eletrônico (assinado)",
        status="ativo",
        variaveis=["nome", "matricula", "cpf", "pis", "cargo",
                   "equipe", "periodo", "dias", "assinatura"],
        parser=parse_espelho_eletronico,
    ),
    "espelho_jornada": Molde(
        id="espelho_jornada",
        nome="Espelho de Ponto — Jornada",
        status="ativo",
        variaveis=["nome", "competencia", "pagina"],
        parser=parse_jornada_pdf,
    ),
    "ferias_sebrae": Molde(
        id="ferias_sebrae",
        nome="Férias SEBRAE",
        status="exemplo",
        variaveis=["nome", "matricula", "periodo_aquisitivo",
                   "periodo_gozo", "saldo"],
        parser=None,
    ),
}


def list_moldes() -> list[Molde]:
    """Retorna todos os moldes cadastrados."""
    return list(_REGISTRY.values())


def get_molde(molde_id: str) -> Optional[Molde]:
    """Retorna um molde pelo id, ou None se não existir."""
    return _REGISTRY.get(molde_id)
```

> **Nota:** este módulo importa `src.parsers_espelho` (Task 2) e `src.jornada_parser` (já existe). A Task 2 deve ser implementada junto ou antes para o import resolver. Se executar Task 1 isolada, crie `src/parsers_espelho.py` com um stub de `parse_espelho_eletronico` primeiro (a Task 2 o completa via TDD).

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/test_molde_registry.py -v`
Expected: PASS (5 passed) — requer `src/parsers_espelho.py` da Task 2 existindo.

- [ ] **Step 5: Commit**

```bash
git add src/molde_registry.py tests/test_molde_registry.py
git commit -m "feat: registro de moldes (espelho eletronico/jornada/ferias-exemplo)"
```

---

## Task 2: Parser puro do Espelho Eletrônico

**Files:**
- Create: `src/parsers_espelho.py`
- Test: `tests/test_parsers_espelho.py`

Extrai a lógica de parsing Type A do `pipeline._run_type_a` para uma função pura que
retorna registros **sem escrever arquivos**.

- [ ] **Step 1: Write the failing test**

```python
# tests/test_parsers_espelho.py
from src.parsers_espelho import parse_espelho_eletronico

REAL_PDF = r"C:\Users\vinia\Downloads\Downloads Google\Pontomais_-_Espelho_de_Ponto_Eletrônico_(01.12.2025_-_31.12.2025)_-_7d75411016c30e83f99e9b14267fc2c24bb067f6f55fce4f074dcfd99c424735.pdf"


def test_retorna_lista_de_registros():
    regs = parse_espelho_eletronico(REAL_PDF)
    assert isinstance(regs, list)
    assert len(regs) > 0


def test_registro_tem_campos_e_tipo():
    reg = parse_espelho_eletronico(REAL_PDF)[0]
    assert reg["tipo"] == "espelho"
    assert reg["nome"] == "JOSE DE SOUZA E SILVA NETO"
    assert reg["matricula"] == "00000694"
    assert reg["hash_valido"] is True


def test_nao_escreve_arquivos(tmp_path, monkeypatch):
    # parser puro: não deve criar nada no diretório corrente
    monkeypatch.chdir(tmp_path)
    parse_espelho_eletronico(REAL_PDF)
    assert list(tmp_path.iterdir()) == []
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_parsers_espelho.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'src.parsers_espelho'`

- [ ] **Step 3: Write minimal implementation**

```python
# src/parsers_espelho.py
"""
Parser puro do Espelho de Ponto Eletrônico (Type A, assinado).
Retorna uma lista de registros (um por página/funcionário) SEM escrever arquivos.
"""
from __future__ import annotations

from src.pdf_loader import load_pages
from src.hash_extractor import extract_hash
from src.data_parser import parse_employee
from src.validator import validate_hash


def parse_espelho_eletronico(pdf_path: str) -> list[dict]:
    """Lê o PDF e devolve um registro por funcionário, com validação de assinatura."""
    pages = load_pages(pdf_path)
    registros = []
    for page in pages:
        text = page["text"]
        hash_str = extract_hash(text)
        validation = validate_hash(hash_str)
        employee = parse_employee(text)
        registros.append({
            "tipo": "espelho",
            "hash": hash_str,
            **validation,
            **employee,
        })
    return registros
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/test_parsers_espelho.py -v`
Expected: PASS (3 passed)

- [ ] **Step 5: Commit**

```bash
git add src/parsers_espelho.py tests/test_parsers_espelho.py
git commit -m "feat: parser puro do espelho eletronico (sem escrita de arquivos)"
```

---

## Task 3: Filtro de variáveis

**Files:**
- Create: `src/extracao.py`
- Test: `tests/test_extracao.py`

Mantém sempre as chaves estruturais (necessárias para organizar pastas) e filtra as
demais conforme a seleção do usuário.

- [ ] **Step 1: Write the failing test**

```python
# tests/test_extracao.py
from src.extracao import filtrar_variaveis, STRUCTURAL_KEYS


def test_mantem_apenas_selecionadas_mais_estruturais():
    reg = {"tipo": "espelho", "nome": "ANA", "periodo": "01/2026",
           "pagina": 1, "matricula": "123", "cpf": "000", "assinatura": {}}
    out = filtrar_variaveis(reg, ["matricula"])
    # estruturais sempre ficam
    assert out["nome"] == "ANA"
    assert out["periodo"] == "01/2026"
    assert out["tipo"] == "espelho"
    assert out["pagina"] == 1
    # selecionada fica
    assert out["matricula"] == "123"
    # não selecionadas somem
    assert "cpf" not in out
    assert "assinatura" not in out


def test_none_mantem_tudo():
    reg = {"tipo": "espelho", "nome": "ANA", "periodo": "01/2026",
           "pagina": 1, "matricula": "123", "cpf": "000"}
    out = filtrar_variaveis(reg, None)
    assert out == reg


def test_structural_keys_inclui_basico():
    assert {"nome", "periodo", "pagina", "tipo"}.issubset(STRUCTURAL_KEYS)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_extracao.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'src.extracao'`

- [ ] **Step 3: Write minimal implementation**

```python
# src/extracao.py
"""
Filtro de variáveis: o usuário escolhe um subconjunto das variáveis do molde.
As chaves estruturais (usadas para organizar pastas) são sempre preservadas.
"""
from __future__ import annotations

from typing import Optional

STRUCTURAL_KEYS = {"nome", "periodo", "pagina", "tipo"}


def filtrar_variaveis(record: dict, selecionadas: Optional[list]) -> dict:
    """
    Retorna uma cópia do registro contendo apenas as chaves estruturais e as
    variáveis selecionadas. Se `selecionadas` for None, retorna o registro inteiro.
    """
    if selecionadas is None:
        return dict(record)
    permitidas = STRUCTURAL_KEYS | set(selecionadas)
    return {k: v for k, v in record.items() if k in permitidas}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/test_extracao.py -v`
Expected: PASS (3 passed)

- [ ] **Step 5: Commit**

```bash
git add src/extracao.py tests/test_extracao.py
git commit -m "feat: filtro de variaveis com preservacao de chaves estruturais"
```

---

## Task 4: Camada de destino (DestinoZip)

**Files:**
- Create: `src/destino.py`
- Test: `tests/test_destino.py`

- [ ] **Step 1: Write the failing test**

```python
# tests/test_destino.py
import zipfile
from pathlib import Path

from src.destino import DestinoZip


def test_zip_contem_arvore_de_pastas(tmp_path):
    # monta uma árvore de exemplo
    raiz = tmp_path / "saida"
    (raiz / "ANA_SILVA" / "01_2026").mkdir(parents=True)
    (raiz / "ANA_SILVA" / "01_2026" / "dados.json").write_text("{}", encoding="utf-8")

    destino = DestinoZip()
    zip_path = destino.entregar(raiz, destino_zip=tmp_path / "resultado.zip")

    assert Path(zip_path).exists()
    with zipfile.ZipFile(zip_path) as zf:
        nomes = zf.namelist()
    assert any("ANA_SILVA/01_2026/dados.json" in n.replace("\\", "/") for n in nomes)


def test_retorna_caminho_do_zip(tmp_path):
    raiz = tmp_path / "saida"
    raiz.mkdir()
    (raiz / "vazio.txt").write_text("x", encoding="utf-8")
    zip_path = DestinoZip().entregar(raiz, destino_zip=tmp_path / "r.zip")
    assert str(zip_path).endswith("r.zip")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_destino.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'src.destino'`

- [ ] **Step 3: Write minimal implementation**

```python
# src/destino.py
"""
Camada de destino abstrata.

No v1 existe apenas o DestinoZip (empacota a árvore de pastas num .zip para
download). No futuro entra um DestinoDatacenter usando as credenciais SEBRAE,
implementando a mesma interface `entregar`, sem alterar o pipeline.
"""
from __future__ import annotations

import zipfile
from pathlib import Path


class Destino:
    """Interface comum de entrega."""

    def entregar(self, raiz_arquivos: Path, **kwargs):
        raise NotImplementedError


class DestinoZip(Destino):
    """Empacota a árvore de pastas num arquivo .zip."""

    def entregar(self, raiz_arquivos: Path, destino_zip: Path) -> Path:
        raiz_arquivos = Path(raiz_arquivos)
        destino_zip = Path(destino_zip)
        with zipfile.ZipFile(destino_zip, "w", zipfile.ZIP_DEFLATED) as zf:
            for arquivo in raiz_arquivos.rglob("*"):
                if arquivo.is_file():
                    zf.write(arquivo, arquivo.relative_to(raiz_arquivos))
        return destino_zip
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/test_destino.py -v`
Expected: PASS (2 passed)

- [ ] **Step 5: Commit**

```bash
git add src/destino.py tests/test_destino.py
git commit -m "feat: camada de destino abstrata com DestinoZip"
```

---

## Task 5: Orquestrador (processador)

**Files:**
- Create: `src/processador.py`
- Modify: `src/pipeline.py` (reusar `parse_espelho_eletronico`)
- Test: `tests/test_processador.py`

- [ ] **Step 1: Write the failing test**

```python
# tests/test_processador.py
import zipfile
from pathlib import Path

import pytest

from src.processador import processar, MoldeEmDesenvolvimentoError

ESPELHO = r"C:\Users\vinia\Downloads\Downloads Google\Pontomais_-_Espelho_de_Ponto_Eletrônico_(01.12.2025_-_31.12.2025)_-_7d75411016c30e83f99e9b14267fc2c24bb067f6f55fce4f074dcfd99c424735.pdf"
JORNADA = r"C:\Users\vinia\Downloads\Downloads Google\Espelho de Ponto.pdf"


def test_processa_eletronico_gera_zip(tmp_path):
    res = processar(ESPELHO, molde_id="espelho_eletronico",
                    variaveis=["nome", "matricula", "assinatura"],
                    work_dir=str(tmp_path))
    assert res["molde_id"] == "espelho_eletronico"
    assert len(res["funcionarios"]) > 0
    assert Path(res["zip_path"]).exists()
    # variável não selecionada não deve aparecer
    assert "cpf" not in res["funcionarios"][0]
    with zipfile.ZipFile(res["zip_path"]) as zf:
        assert any(n.endswith("dados.json") for n in zf.namelist())


def test_processa_jornada_dez_funcionarios(tmp_path):
    res = processar(JORNADA, molde_id="espelho_jornada",
                    variaveis=None, work_dir=str(tmp_path))
    assert len(res["funcionarios"]) == 10
    assert Path(res["zip_path"]).exists()


def test_molde_exemplo_bloqueia(tmp_path):
    with pytest.raises(MoldeEmDesenvolvimentoError):
        processar(ESPELHO, molde_id="ferias_sebrae",
                  variaveis=None, work_dir=str(tmp_path))


def test_auto_deteccao_quando_molde_none(tmp_path):
    res = processar(ESPELHO, molde_id=None, variaveis=None,
                    work_dir=str(tmp_path))
    assert res["molde_id"] == "espelho_eletronico"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_processador.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'src.processador'`

- [ ] **Step 3: Write minimal implementation**

```python
# src/processador.py
"""
Orquestrador do Separador com Molde.

Resolve o molde (id explícito ou auto-detecção), roda o parser, filtra as
variáveis selecionadas, organiza em árvore de pastas num diretório temporário e
entrega via camada de destino (ZIP no v1).
"""
from __future__ import annotations

import uuid
from pathlib import Path
from typing import Optional

from src.molde_registry import get_molde
from src.pdf_type_detector import detect_pdf_type
from src.extracao import filtrar_variaveis
from src.folder_writer import write_employee_folder
from src.destino import DestinoZip

# Mapa: tipo detectado pelo detector → molde correspondente
_TIPO_PARA_MOLDE = {"A": "espelho_eletronico", "B": "espelho_jornada"}


class MoldeEmDesenvolvimentoError(Exception):
    """Lançado quando o molde escolhido é um exemplo sem parser."""


def _resolver_molde_id(pdf_path: str, molde_id: Optional[str]) -> str:
    if molde_id:
        return molde_id
    tipo = detect_pdf_type(pdf_path)
    return _TIPO_PARA_MOLDE.get(tipo, "espelho_eletronico")


def processar(
    pdf_path: str,
    molde_id: Optional[str] = None,
    variaveis: Optional[list] = None,
    work_dir: Optional[str] = None,
) -> dict:
    """
    Processa um PDF com um molde e devolve:
      {"molde_id", "tipo", "funcionarios": [...], "zip_path"}
    """
    molde_id = _resolver_molde_id(pdf_path, molde_id)
    molde = get_molde(molde_id)
    if molde is None:
        raise ValueError(f"Molde desconhecido: {molde_id}")
    if molde.parser is None:
        raise MoldeEmDesenvolvimentoError(
            f"O molde '{molde.nome}' ainda está em desenvolvimento."
        )

    # Diretório de trabalho isolado
    base = Path(work_dir or Path.cwd() / "_tmp_jobs")
    job_dir = base / f"job_{uuid.uuid4().hex}"
    saida_dir = job_dir / "saida"
    saida_dir.mkdir(parents=True, exist_ok=True)

    # Parser → registros
    registros = molde.parser(pdf_path)
    registros = [filtrar_variaveis(r, variaveis) for r in registros]

    # Organiza em árvore de pastas (reaproveita folder_writer)
    for reg in registros:
        write_employee_folder(reg, output_dir=str(saida_dir), pdf_path=pdf_path)

    # Entrega via destino ZIP
    zip_path = job_dir / "resultado.zip"
    DestinoZip().entregar(saida_dir, destino_zip=zip_path)

    return {
        "molde_id": molde_id,
        "tipo": registros[0].get("tipo") if registros else None,
        "funcionarios": registros,
        "zip_path": str(zip_path),
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/test_processador.py -v`
Expected: PASS (4 passed)

- [ ] **Step 5: Refatorar pipeline para reusar o parser puro**

Em `src/pipeline.py`, substitua o corpo de `_run_type_a` para reusar o parser e manter a escrita:

```python
# src/pipeline.py  (trecho _run_type_a)
from src.parsers_espelho import parse_espelho_eletronico

def _run_type_a(pdf_path: str, output_dir: str) -> list[dict]:
    """Process a Type A signed Espelho de Ponto PDF."""
    results = parse_espelho_eletronico(pdf_path)
    for record in results:
        write_employee_json(record, output_dir)
    return results
```

Remova os imports agora não usados em `_run_type_a` (`load_pages`, `extract_hash`,
`parse_employee`, `validate_hash`) **somente se** não forem usados em outro ponto do arquivo.

- [ ] **Step 6: Run full suite to verify no regression**

Run: `python -m pytest tests/ -q`
Expected: PASS (todos, incluindo os 34 anteriores)

- [ ] **Step 7: Commit**

```bash
git add src/processador.py src/pipeline.py tests/test_processador.py
git commit -m "feat: orquestrador do separador com molde (parser->filtro->zip)"
```

---

## Task 6: Endpoints da API

**Files:**
- Modify: `web/main.py`

Adiciona `GET /moldes`, estende `POST /upload` para receber `molde_id` e `variaveis`,
e adiciona `GET /download/{job_id}` para baixar o ZIP. Mantém o polling em `/results/{job_id}`.

- [ ] **Step 1: Substituir `web/main.py` pelo conteúdo abaixo**

```python
# web/main.py
import asyncio
import json
import uuid
from pathlib import Path

from fastapi import FastAPI, UploadFile, File, Form
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from src.molde_registry import list_moldes
from src.processador import processar, MoldeEmDesenvolvimentoError

app = FastAPI(title="Plataforma de Separação de Documentos — SEBRAE")
app.mount("/assets", StaticFiles(directory="web/static/assets"), name="assets")

_jobs: dict[str, dict] = {}


@app.get("/")
def index():
    return FileResponse("web/static/index.html")


@app.get("/moldes")
def listar_moldes():
    """Lista os moldes disponíveis para o frontend."""
    return [
        {"id": m.id, "nome": m.nome, "status": m.status, "variaveis": m.variaveis}
        for m in list_moldes()
    ]


@app.post("/upload")
async def upload_pdf(
    file: UploadFile = File(...),
    molde_id: str = Form(None),
    variaveis: str = Form(None),  # JSON array, ex: '["nome","matricula"]'
):
    if not file.filename.endswith(".pdf"):
        return JSONResponse(status_code=400,
                            content={"error": "Somente arquivos PDF são aceitos."})

    selecionadas = json.loads(variaveis) if variaveis else None
    job_id = str(uuid.uuid4())
    tmp_path = Path(f"tmp_{job_id}.pdf")
    tmp_path.write_bytes(await file.read())

    _jobs[job_id] = {"status": "processing"}
    asyncio.create_task(_process(job_id, str(tmp_path), molde_id, selecionadas))
    return {"job_id": job_id}


@app.get("/results/{job_id}")
def get_results(job_id: str):
    job = _jobs.get(job_id)
    if not job:
        return JSONResponse(status_code=404, content={"error": "Job não encontrado."})
    # não vaza o caminho absoluto do zip; só sinaliza disponibilidade
    public = {k: v for k, v in job.items() if k != "zip_path"}
    public["zip_disponivel"] = bool(job.get("zip_path"))
    return public


@app.get("/download/{job_id}")
def download_zip(job_id: str):
    job = _jobs.get(job_id)
    if not job or not job.get("zip_path"):
        return JSONResponse(status_code=404, content={"error": "ZIP não disponível."})
    return FileResponse(job["zip_path"], filename="documentos_separados.zip",
                        media_type="application/zip")


async def _process(job_id, pdf_path, molde_id, variaveis):
    try:
        res = await asyncio.to_thread(processar, pdf_path, molde_id, variaveis)
        _jobs[job_id] = {
            "status": "done",
            "molde_id": res["molde_id"],
            "tipo": res["tipo"],
            "results": res["funcionarios"],
            "zip_path": res["zip_path"],
        }
    except MoldeEmDesenvolvimentoError as exc:
        _jobs[job_id] = {"status": "error", "error": str(exc)}
    except Exception as exc:
        _jobs[job_id] = {"status": "error", "error": str(exc)}
    finally:
        Path(pdf_path).unlink(missing_ok=True)
```

- [ ] **Step 2: Verificar import e boot do app**

Run: `python -c "import web.main; print('ok')"`
Expected: imprime `ok` sem erro.

- [ ] **Step 3: Smoke test dos endpoints com TestClient**

Run:
```bash
python -c "from fastapi.testclient import TestClient; import web.main; c=TestClient(web.main.app); r=c.get('/moldes'); print(r.status_code, len(r.json()))"
```
Expected: `200 3`

- [ ] **Step 4: Commit**

```bash
git add web/main.py
git commit -m "feat: endpoints /moldes, /upload (molde+variaveis) e /download do ZIP"
```

---

## Task 7: Base visual do frontend (Roboto + paleta + logo)

**Files:**
- Modify: `frontend/index.html`
- Modify: `frontend/src/index.css`
- Create: `frontend/src/theme.js`
- Create: `frontend/src/SebraeLogo.jsx`

- [ ] **Step 1: Trocar as fontes no `frontend/index.html`**

Substitua o bloco de `<link>` das fontes Google (Syne / Plus Jakarta Sans) por Roboto:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700;900&family=Roboto+Mono&display=swap" rel="stylesheet" />
```

- [ ] **Step 2: Reescrever `frontend/src/index.css` com a paleta SEBRAE**

```css
:root {
  --bg: #f7f6fb;
  --surface: #ffffff;
  --blue: #1d65c4;
  --purple-dark: #2e1065;
  --purple: #5b21b6;
  --purple-light: #ede9fe;
  --ink: #0f1020;
  --muted: #6b6786;
  --border: #e5e1f0;
  --emerald: #059669;
  --emerald-light: #d1fae5;
  --red: #dc2626;
  --red-light: #fee2e2;
  --amber: #d97706;
  --amber-light: #fef3c7;
  --radius: 16px;
  --radius-sm: 10px;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: 'Roboto', system-ui, sans-serif;
  background: var(--bg);
  color: var(--ink);
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
}

h1, h2, h3, h4 { font-family: 'Roboto', system-ui, sans-serif; font-weight: 900; }

@keyframes spin { to { transform: rotate(360deg); } }
@keyframes pulse-border { 0%,100% { opacity: 1; } 50% { opacity: .4; } }
```

- [ ] **Step 3: Criar `frontend/src/theme.js`**

```js
export const COLORS = {
  blue: '#1d65c4',
  purpleDark: '#2e1065',
  purple: '#5b21b6',
  purpleLight: '#ede9fe',
  ink: '#0f1020',
  muted: '#6b6786',
  border: '#e5e1f0',
}
export const GRAD = {
  header: `linear-gradient(120deg, ${COLORS.purpleDark} 0%, #3b1d8f 55%, ${COLORS.blue} 130%)`,
  cta: `linear-gradient(135deg, ${COLORS.blue}, ${COLORS.purple})`,
}
```

- [ ] **Step 4: Criar `frontend/src/SebraeLogo.jsx`**

```jsx
export default function SebraeLogo({ height = 30, fill = '#ffffff' }) {
  return (
    <svg viewBox="0 0 4096 2214" height={height} xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
      <g fill={fill}>
        <path d="M 1573.5,-0.5 C 2005.17,-0.5 2436.83,-0.5 2868.5,-0.5C 2852.76,79.2159 2836.76,158.883 2820.5,238.5C 2388.83,239.5 1957.17,239.833 1525.5,239.5C 1541.37,159.474 1557.37,79.4743 1573.5,-0.5 Z"/>
        <path d="M 1494.5,370.5 C 1926.17,370.5 2357.83,370.5 2789.5,370.5C 2774.01,450.27 2758.01,529.937 2741.5,609.5C 2309.83,610.5 1878.17,610.833 1446.5,610.5C 1462.37,530.473 1478.37,450.473 1494.5,370.5 Z"/>
        <path d="M 1417.5,752.5 C 1549.5,752.333 1681.5,752.5 1813.5,753C 1852.05,755.851 1887.39,767.851 1919.5,789C 1961.61,821.633 1978.45,864.466 1970,917.5C 1960.45,975.815 1930.62,1020.31 1880.5,1051C 1849.06,1069.04 1815.72,1082.37 1780.5,1091C 1815.99,1096.59 1848.32,1109.59 1877.5,1130C 1900.17,1148.49 1913.67,1172.33 1918,1201.5C 1924.07,1268.96 1903.74,1326.96 1857,1375.5C 1810.5,1421.58 1754.34,1447.08 1688.5,1452C 1665.9,1454.6 1643.24,1456.26 1620.5,1457C 1502.83,1457.5 1385.17,1457.67 1267.5,1457.5C 1316.99,1222.39 1366.99,987.389 1417.5,752.5 Z M 1583.5,878.5 C 1624.17,878.333 1664.83,878.5 1705.5,879C 1750.23,881.717 1770.4,905.217 1766,949.5C 1754.44,1008.9 1718.27,1037.07 1657.5,1034C 1621.83,1034.83 1586.16,1034.67 1550.5,1033.5C 1561.88,981.912 1572.88,930.245 1583.5,878.5 Z M 1523.5,1160.5 C 1562.17,1160.33 1600.83,1160.5 1639.5,1161C 1712.6,1165.8 1735.43,1202.3 1708,1270.5C 1692.62,1300.51 1668.12,1318.35 1634.5,1324C 1626.23,1325.56 1617.9,1326.56 1609.5,1327C 1569.17,1327.5 1528.83,1327.67 1488.5,1327.5C 1500.29,1271.86 1511.96,1216.19 1523.5,1160.5 Z"/>
        <path d="M -0.5,1306.5 C -0.5,1293.17 -0.5,1279.83 -0.5,1266.5C 1.48277,1253.63 3.48277,1240.63 5.5,1227.5C 71.1667,1227.5 136.833,1227.5 202.5,1227.5C 187.847,1289.73 212.18,1324.23 275.5,1331C 305.622,1334.23 334.956,1330.9 363.5,1321C 398.854,1305.51 417.854,1278.35 420.5,1239.5C 419.462,1221.25 410.796,1208.08 394.5,1200C 387.734,1196.74 380.734,1194.08 373.5,1192C 313.123,1176.16 252.79,1160.16 192.5,1144C 81.7436,1108.98 46.5769,1036.82 87,927.5C 102.811,889.039 126.978,856.873 159.5,831C 208.425,793.06 263.758,769.56 325.5,760.5C 377.312,753.008 429.312,751.508 481.5,756C 513.077,758.582 543.743,765.248 573.5,776C 645.753,805.303 675.919,858.803 664,936.5C 662.489,947.236 660.655,957.902 658.5,968.5C 592.5,968.5 526.5,968.5 460.5,968.5C 461.47,961.479 462.637,954.479 464,947.5C 468.872,907.702 451.705,884.202 412.5,877C 374.674,870.709 340.34,878.709 309.5,901C 287.893,919.144 278.393,942.31 281,970.5C 283.65,980.822 289.15,989.322 297.5,996C 304.225,1001.03 311.558,1005.03 319.5,1008C 372.369,1022.8 425.369,1037.13 478.5,1051C 511.348,1059.61 542.682,1071.95 572.5,1088C 609.732,1112.45 628.399,1147.12 628.5,1192C 623.829,1288.08 579.829,1359.41 496.5,1406C 432.814,1438.5 365.148,1455.5 293.5,1457C 244.755,1459.41 196.422,1456.07 148.5,1447C 111.836,1440.16 78.8356,1425.49 49.5,1403C 20.2538,1377.34 3.58714,1345.17 -0.5,1306.5 Z"/>
        <path d="M 798.5,754.5 C 977.167,754.5 1155.83,754.5 1334.5,754.5C 1325.32,799.534 1315.99,844.534 1306.5,889.5C 1193.17,889.5 1079.83,889.5 966.5,889.5C 955.911,938.112 945.578,986.779 935.5,1035.5C 1041.83,1035.5 1148.17,1035.5 1254.5,1035.5C 1244.96,1080.53 1235.29,1125.53 1225.5,1170.5C 1118.83,1170.17 1012.16,1170.5 905.5,1171.5C 894.893,1221.04 884.226,1270.54 873.5,1320C 989.501,1320.17 1105.5,1320.67 1221.5,1321.5C 1211.5,1366.5 1201.5,1411.5 1191.5,1456.5C 1010.17,1457.83 828.833,1457.83 647.5,1456.5C 698.089,1222.55 748.423,988.552 798.5,754.5 Z"/>
        <path d="M 2092.5,754.5 C 2224.17,754.333 2355.83,754.5 2487.5,755C 2523.1,753.989 2557.44,759.989 2590.5,773C 2631.99,793.889 2654.49,827.722 2658,874.5C 2660.59,1000.23 2600.42,1076.07 2477.5,1102C 2466.57,1104.39 2455.57,1106.39 2444.5,1108C 2443.09,1108.37 2442.09,1109.2 2441.5,1110.5C 2463.5,1111.52 2485.16,1114.68 2506.5,1120C 2544.24,1129.95 2564.74,1154.45 2568,1193.5C 2569.02,1203.47 2569.52,1213.47 2569.5,1223.5C 2567.25,1272.18 2564.75,1320.84 2562,1369.5C 2561.05,1397.87 2561.38,1426.2 2563,1454.5C 2706.75,1222.67 2850.25,990.668 2993.5,758.5C 3074.5,757.5 3155.5,757.167 3236.5,757.5C 3279.45,990.904 3322.78,1224.24 3366.5,1457.5C 3291.83,1457.83 3217.16,1457.5 3142.5,1456.5C 3135.92,1410.21 3129.59,1363.88 3123.5,1317.5C 3028.5,1317.17 2933.5,1317.5 2838.5,1318.5C 2812.37,1364.59 2786.37,1410.75 2760.5,1457C 2622.83,1457.5 2485.17,1457.67 2347.5,1457.5C 2347.3,1439.15 2347.8,1420.81 2349,1402.5C 2353.7,1349.18 2358.2,1295.85 2362.5,1242.5C 2363.07,1228.53 2359.91,1215.53 2353,1203.5C 2346.51,1195.67 2338.34,1190.5 2328.5,1188C 2319.93,1186.02 2311.27,1184.68 2302.5,1184C 2285.5,1183.83 2268.5,1183.67 2251.5,1183.5C 2234.11,1183.51 2216.95,1184.17 2200,1185.5C 2180.31,1276.14 2160.81,1366.81 2141.5,1457.5C 2074.83,1457.83 2008.16,1457.5 1941.5,1456.5C 1992.15,1222.56 2042.48,988.564 2092.5,754.5 Z M 2264.5,884.5 C 2302.85,884.124 2341.18,884.624 2379.5,886C 2393.88,886.729 2407.88,889.396 2421.5,894C 2444.51,903.826 2456.17,921.326 2456.5,946.5C 2451.76,1017.75 2413.76,1053.91 2342.5,1055C 2304.5,1055.5 2266.5,1055.67 2228.5,1055.5C 2240.5,998.5 2252.5,941.5 2264.5,884.5 Z M 3074.5,895.5 C 3075.5,895.5 3076.5,895.5 3077.5,895.5C 3086.7,992.846 3096.03,1090.18 3105.5,1187.5C 3041.5,1187.67 2977.5,1187.5 2913.5,1187C 2967.83,1090.18 3021.49,993.014 3074.5,895.5 Z"/>
        <path d="M 4095.5,754.5 C 4095.5,756.167 4095.5,757.833 4095.5,759.5C 4085.88,802.653 4076.55,845.986 4067.5,889.5C 3954.17,889.5 3840.83,889.5 3727.5,889.5C 3717.17,938.165 3706.83,986.832 3696.5,1035.5C 3802.83,1035.5 3909.17,1035.5 4015.5,1035.5C 4006.35,1080.27 3996.68,1124.94 3986.5,1169.5C 3879.84,1170.5 3773.17,1170.83 3666.5,1170.5C 3655.91,1220.45 3645.58,1270.45 3635.5,1320.5C 3751.17,1320.5 3866.83,1320.5 3982.5,1320.5C 3972.82,1366.09 3962.82,1411.59 3952.5,1457C 3771.17,1457.67 3589.83,1457.67 3408.5,1457C 3459.28,1222.95 3509.61,988.785 3559.5,754.5C 3738.17,754.5 3916.83,754.5 4095.5,754.5 Z"/>
        <path d="M 1235.5,1602.5 C 1667.17,1602.5 2098.83,1602.5 2530.5,1602.5C 2514.76,1682.22 2498.76,1761.88 2482.5,1841.5C 2050.83,1842.5 1619.17,1842.83 1187.5,1842.5C 1203.37,1762.47 1219.37,1682.47 1235.5,1602.5 Z"/>
        <path d="M 2403.5,2213.5 C 1971.83,2213.5 1540.17,2213.5 1108.5,2213.5C 1124.37,2133.47 1140.37,2053.47 1156.5,1973.5C 1588.17,1973.5 2019.83,1973.5 2451.5,1973.5C 2435.88,2053.58 2419.88,2133.58 2403.5,2213.5 Z"/>
      </g>
    </svg>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/index.html frontend/src/index.css frontend/src/theme.js frontend/src/SebraeLogo.jsx
git commit -m "feat(front): base visual SEBRAE (Roboto, paleta, logo)"
```

---

## Task 8: Componente Landing

**Files:**
- Create: `frontend/src/Landing.jsx`

- [ ] **Step 1: Criar `frontend/src/Landing.jsx`**

```jsx
import { motion } from 'framer-motion'
import SebraeLogo from './SebraeLogo'
import { COLORS, GRAD } from './theme'

function Header() {
  return (
    <header style={{ background: GRAD.header, padding: '16px 24px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <SebraeLogo height={30} />
        <div style={{ width: 1, height: 26, background: 'rgba(255,255,255,.25)' }} />
        <div style={{ color: '#fff', fontWeight: 700, fontSize: 14, lineHeight: 1.15 }}>
          Separador de Documentos
          <small style={{ display: 'block', fontWeight: 400, fontSize: 10, color: '#c9b8ff' }}>
            Plataforma inteligente · UGP
          </small>
        </div>
      </div>
      <span style={{ background: 'rgba(255,255,255,.12)', color: '#e9e2ff', fontSize: 10,
        fontWeight: 700, padding: '5px 12px', borderRadius: 20, letterSpacing: '.08em' }}>SEBRAE</span>
    </header>
  )
}

export default function Landing({ onSelectMolde }) {
  return (
    <div>
      <Header />
      <main style={{ maxWidth: 880, margin: '0 auto', padding: '40px 20px' }}>
        <h1 style={{ fontSize: 26, color: COLORS.ink }}>Como você quer processar hoje?</h1>
        <p style={{ color: COLORS.muted, fontSize: 14, marginTop: 4, marginBottom: 28 }}>
          Escolha o tipo de separação. Documentos com layout conhecido usam molde; o resto vai pela IA.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
          <motion.div whileHover={{ y: -4 }} onClick={onSelectMolde}
            style={{ cursor: 'pointer', background: 'linear-gradient(160deg,#fff,#f3efff)',
              border: `1.5px solid ${COLORS.blue}`, borderRadius: 16, padding: 24,
              boxShadow: '0 6px 22px rgba(29,101,196,.18)', minHeight: 190,
              display: 'flex', flexDirection: 'column' }}>
            <div style={{ width: 50, height: 50, borderRadius: 12, background: GRAD.cta,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, marginBottom: 14 }}>📄</div>
            <h3 style={{ fontSize: 18, color: COLORS.ink }}>Separador com Molde</h3>
            <p style={{ fontSize: 12.5, color: COLORS.muted, marginTop: 6, flex: 1 }}>
              Para documentos de layout conhecido — espelho de ponto, holerite, contrato. Extração precisa por regras do molde.
            </p>
            <div style={{ marginTop: 14, background: GRAD.cta, color: '#fff', borderRadius: 10,
              padding: 12, fontWeight: 700, fontSize: 13, textAlign: 'center' }}>Processar agora →</div>
          </motion.div>

          <div style={{ background: '#f1eefb', border: '1.5px dashed #c9bdf0', borderRadius: 16,
            padding: 24, minHeight: 190, display: 'flex', flexDirection: 'column', opacity: .92 }}>
            <div style={{ width: 50, height: 50, borderRadius: 12, background: '#e0d8f7',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, marginBottom: 14 }}>🤖</div>
            <h3 style={{ fontSize: 18, color: COLORS.ink }}>Separador com IA</h3>
            <p style={{ fontSize: 12.5, color: COLORS.muted, marginTop: 6, flex: 1 }}>
              Para qualquer PDF, sem molde. Uma IA lê o documento, identifica os limites e extrai as variáveis sozinha.
            </p>
            <div style={{ marginTop: 14, border: '1.5px solid #d6ccf2', color: '#9a8fc0',
              borderRadius: 10, padding: 12, fontWeight: 500, fontSize: 13, textAlign: 'center' }}>
              Em breve
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/Landing.jsx
git commit -m "feat(front): tela landing com 2 modos (molde ativo, IA em breve)"
```

---

## Task 9: Componente UploadMolde

**Files:**
- Create: `frontend/src/UploadMolde.jsx`

- [ ] **Step 1: Criar `frontend/src/UploadMolde.jsx`**

```jsx
import { useEffect, useRef, useState } from 'react'
import { COLORS, GRAD } from './theme'
import SebraeLogo from './SebraeLogo'

export default function UploadMolde({ onBack, onDone }) {
  const [moldes, setMoldes] = useState([])
  const [moldeId, setMoldeId] = useState('')
  const [selecionadas, setSelecionadas] = useState([])
  const [file, setFile] = useState(null)
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    fetch('/moldes').then(r => r.json()).then(ms => {
      setMoldes(ms)
      const primeiro = ms.find(m => m.status === 'ativo') || ms[0]
      if (primeiro) { setMoldeId(primeiro.id); setSelecionadas(primeiro.variaveis) }
    })
  }, [])

  const molde = moldes.find(m => m.id === moldeId)
  const ehExemplo = molde?.status === 'exemplo'

  const trocarMolde = (id) => {
    setMoldeId(id)
    const m = moldes.find(x => x.id === id)
    setSelecionadas(m ? m.variaveis : [])
    setErro('')
  }

  const toggleVar = (v) =>
    setSelecionadas(s => s.includes(v) ? s.filter(x => x !== v) : [...s, v])

  const processar = async () => {
    if (!file) { setErro('Selecione um PDF.'); return }
    if (ehExemplo) { setErro('Este molde ainda está em desenvolvimento.'); return }
    setEnviando(true); setErro('')
    const form = new FormData()
    form.append('file', file)
    form.append('molde_id', moldeId)
    form.append('variaveis', JSON.stringify(selecionadas))
    try {
      const res = await fetch('/upload', { method: 'POST', body: form })
      if (!res.ok) throw new Error((await res.json()).error)
      const { job_id } = await res.json()
      onDone(job_id)
    } catch (e) { setErro(e.message); setEnviando(false) }
  }

  return (
    <div>
      <header style={{ background: GRAD.header, padding: '12px 22px', display: 'flex',
        alignItems: 'center', gap: 12, color: '#fff' }}>
        <span onClick={onBack} style={{ cursor: 'pointer', fontSize: 12, color: '#c9b8ff' }}>← Voltar</span>
        <SebraeLogo height={22} />
        <span style={{ fontWeight: 700, fontSize: 14 }}>Separador com Molde</span>
      </header>

      <main style={{ maxWidth: 920, margin: '0 auto', padding: '24px 20px',
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        <div style={{ gridColumn: '1 / -1' }}>
          <Label n="1">Arquivo PDF</Label>
          <div onClick={() => inputRef.current.click()}
            style={{ border: `2px dashed ${COLORS.blue}`, borderRadius: 12, background: '#fff',
              padding: 22, textAlign: 'center', cursor: 'pointer' }}>
            <input ref={inputRef} type="file" accept=".pdf" style={{ display: 'none' }}
              onChange={e => e.target.files[0] && setFile(e.target.files[0])} />
            <div style={{ fontSize: 28 }}>⬆️</div>
            <div style={{ fontWeight: 700, fontSize: 13, marginTop: 6, color: COLORS.ink }}>
              {file ? file.name : 'Arraste ou clique para selecionar o PDF'}
            </div>
            {file && <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 2 }}>
              {(file.size / 1024).toFixed(0)} KB</div>}
          </div>
        </div>

        <div>
          <Label n="2">O que extrair</Label>
          <select value={moldeId} onChange={e => trocarMolde(e.target.value)}
            style={selectStyle}>
            {moldes.map(m => (
              <option key={m.id} value={m.id}>
                {m.nome}{m.status === 'exemplo' ? ' (exemplo)' : ''}
              </option>
            ))}
          </select>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 10 }}>
            {molde?.variaveis.map(v => {
              const on = selecionadas.includes(v)
              return (
                <span key={v} onClick={() => toggleVar(v)} style={{
                  cursor: 'pointer', fontSize: 11, fontWeight: 600, padding: '5px 11px',
                  borderRadius: 20, border: '1.5px solid',
                  ...(on ? { background: GRAD.cta, color: '#fff', borderColor: 'transparent' }
                         : { background: '#f1eefb', color: '#7a6fa8', borderColor: '#e0d8f7' }),
                }}>{on ? '✓ ' : ''}{v}</span>
              )
            })}
          </div>
          {ehExemplo && <p style={{ fontSize: 11.5, color: COLORS.amber, marginTop: 8 }}>
            🚧 Molde em desenvolvimento — seleção apenas demonstrativa.</p>}
        </div>

        <div>
          <Label n="3">Destino</Label>
          <select disabled style={{ ...selectStyle, opacity: .8 }}>
            <option>Organizar por: Nome / Competência</option>
          </select>
          <div style={{ background: '#fff', border: `1px solid ${COLORS.border}`, borderRadius: 10,
            padding: '12px 14px', marginTop: 10, fontFamily: "'Roboto Mono', monospace",
            fontSize: 11.5, color: '#52507a', lineHeight: 1.9 }}>
            📁 /Pasta Funcional/<br />
            &nbsp;&nbsp;└ 📁 NOME_FUNCIONARIO/<br />
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ 📁 MM_AAAA/<br />
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ 📄 dados.json + pagina.pdf
          </div>
          <p style={{ fontSize: 10.5, color: COLORS.muted, marginTop: 6 }}>
            No v1 o resultado sai num .zip pronto para arquivar.</p>
        </div>

        <div style={{ gridColumn: '1 / -1' }}>
          {erro && <div style={{ background: '#fee2e2', color: '#dc2626', borderRadius: 10,
            padding: '10px 14px', fontSize: 12.5, marginBottom: 10 }}>✗ {erro}</div>}
          <button onClick={processar} disabled={enviando || ehExemplo}
            style={{ width: '100%', background: ehExemplo ? '#cbb' : GRAD.cta, color: '#fff',
              border: 'none', borderRadius: 11, padding: 14, fontWeight: 700, fontSize: 13,
              cursor: enviando || ehExemplo ? 'not-allowed' : 'pointer' }}>
            {enviando ? 'Processando...' : 'Processar e separar documentos →'}
          </button>
        </div>
      </main>
    </div>
  )
}

const selectStyle = {
  width: '100%', background: '#fff', border: '1.5px solid #d6ccf2', borderRadius: 10,
  padding: '11px 13px', fontSize: 12.5, color: '#0f1020', fontFamily: 'Roboto',
}

function Label({ n, children }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.purpleDark,
      textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 7,
      display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 16, height: 16, borderRadius: '50%', background: COLORS.blue,
        color: '#fff', fontSize: 10, display: 'inline-flex', alignItems: 'center',
        justifyContent: 'center' }}>{n}</span>{children}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/UploadMolde.jsx
git commit -m "feat(front): tela de upload com molde (variaveis + destino)"
```

---

## Task 10: Componente Results + download ZIP

**Files:**
- Create: `frontend/src/Results.jsx`

- [ ] **Step 1: Criar `frontend/src/Results.jsx`**

```jsx
import { useEffect, useState } from 'react'
import { COLORS, GRAD } from './theme'

const POLL = 2000

export default function Results({ jobId, onReset }) {
  const [status, setStatus] = useState('processing')
  const [data, setData] = useState(null)
  const [erro, setErro] = useState('')

  useEffect(() => {
    let alive = true
    const poll = async () => {
      try {
        const r = await fetch(`/results/${jobId}`)
        const d = await r.json()
        if (!alive) return
        if (d.status === 'processing') { setTimeout(poll, POLL); return }
        if (d.status === 'error') { setStatus('error'); setErro(d.error); return }
        setData(d); setStatus('done')
      } catch (e) { if (alive) { setStatus('error'); setErro(e.message) } }
    }
    poll()
    return () => { alive = false }
  }, [jobId])

  if (status === 'processing') return <Centered>
    <Spinner /> <p style={{ color: COLORS.muted }}>Processando documentos...</p></Centered>

  if (status === 'error') return <Centered>
    <p style={{ color: '#dc2626' }}>✗ {erro}</p>
    <button onClick={onReset} style={btnGhost}>Voltar</button></Centered>

  const funcs = data.results || []
  return (
    <main style={{ maxWidth: 1000, margin: '0 auto', padding: '28px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, color: COLORS.ink }}>Resultados</h2>
        <button onClick={onReset} style={btnGhost}>Novo upload</button>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ background: COLORS.purpleLight, color: COLORS.purple, fontWeight: 700,
          fontSize: 12, padding: '5px 14px', borderRadius: 20 }}>{data.molde_id}</span>
        <span style={{ color: COLORS.muted, fontSize: 13 }}>{funcs.length} documentos separados</span>
        <a href={`/download/${jobId}`} style={{ marginLeft: 'auto', textDecoration: 'none',
          background: GRAD.cta, color: '#fff', fontWeight: 700, fontSize: 13,
          padding: '10px 18px', borderRadius: 10 }}>⬇ Baixar ZIP</a>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 12 }}>
        {funcs.map((f, i) => (
          <div key={i} style={{ background: '#fff', border: `1px solid ${COLORS.border}`,
            borderRadius: 12, padding: 16 }}>
            <p style={{ fontWeight: 700, fontSize: 13, color: COLORS.ink, overflow: 'hidden',
              whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{f.nome || '—'}</p>
            <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
              {f.periodo && <Tag>📅 {f.periodo}</Tag>}
              {f.matricula && <Tag>nº {f.matricula}</Tag>}
              {f.hash_valido && <Tag c="#059669" bg="#d1fae5">✓ assinado</Tag>}
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}

const Tag = ({ children, c = '#7a6fa8', bg = '#f1eefb' }) => (
  <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
    background: bg, color: c }}>{children}</span>)
const btnGhost = { background: 'transparent', border: `1.5px solid ${COLORS.border}`,
  color: COLORS.muted, padding: '8px 16px', borderRadius: 20, cursor: 'pointer', fontFamily: 'Roboto' }
const Centered = ({ children }) => (
  <div style={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', gap: 12,
    alignItems: 'center', justifyContent: 'center' }}>{children}</div>)
const Spinner = () => (
  <div style={{ width: 26, height: 26, borderRadius: '50%', border: '3px solid #e5e1f0',
    borderTopColor: COLORS.blue, animation: 'spin .8s linear infinite' }} />)
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/Results.jsx
git commit -m "feat(front): tela de resultados com download do ZIP"
```

---

## Task 11: Roteador App.jsx + build + verificação manual

**Files:**
- Modify: `frontend/src/App.jsx`

- [ ] **Step 1: Substituir `frontend/src/App.jsx` pelo roteador por estado**

```jsx
import { useState } from 'react'
import Landing from './Landing'
import UploadMolde from './UploadMolde'
import Results from './Results'

export default function App() {
  const [tela, setTela] = useState('landing')  // landing | upload | results
  const [jobId, setJobId] = useState(null)

  if (tela === 'upload')
    return <UploadMolde onBack={() => setTela('landing')}
             onDone={(id) => { setJobId(id); setTela('results') }} />
  if (tela === 'results')
    return <Results jobId={jobId} onReset={() => { setJobId(null); setTela('landing') }} />
  return <Landing onSelectMolde={() => setTela('upload')} />
}
```

- [ ] **Step 2: Build do frontend**

Run: `cd frontend && npm run build`
Expected: `✓ built` e arquivos gerados em `web/static/` (index.html + assets).

- [ ] **Step 3: Subir o servidor e verificar manualmente**

Run (background): `python -m uvicorn web.main:app --host 127.0.0.1 --port 8000`
Então abrir `http://127.0.0.1:8000` e validar:
1. Landing mostra os 2 modos; "Separador com IA" esmaecido.
2. Clicar em "Com Molde" → tela de upload; dropdown lista os 3 moldes.
3. Subir o PDF Jornada (`Espelho de Ponto.pdf`), molde "Espelho de Ponto — Jornada", processar.
4. Resultados mostram 10 funcionários e botão "Baixar ZIP" baixa um zip com a árvore de pastas.
5. Selecionar molde "Férias SEBRAE" → botão bloqueado + aviso "em desenvolvimento".

Expected: todos os 5 itens conferem.

- [ ] **Step 4: Rodar a suíte completa**

Run: `python -m pytest tests/ -q`
Expected: todos os testes passam (34 antigos + novos).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/App.jsx web/static
git commit -m "feat(front): roteador de telas + build (landing->upload->results)"
```

---

## Self-Review (preenchido)

**Cobertura do spec:**
- Landing 2 modos → Task 8. ✔
- Upload com 3 campos (arquivo / o que extrair / destino) → Task 9. ✔
- 3 moldes (eletrônico, jornada, férias-exemplo) → Task 1. ✔
- Auto-detecção + troca manual de molde → Task 5 (`_resolver_molde_id`) + Task 9 (dropdown). ✔
- Lista completa de variáveis por molde + seleção de subconjunto → Task 1 + Task 3 + Task 9. ✔
- Organização em árvore de pastas → Task 5 (reusa `folder_writer`). ✔
- Validação de assinatura no Espelho Eletrônico → Task 2 (`validate_hash`). ✔
- Destino plugável + ZIP no v1 → Task 4 + Task 5. ✔
- Download do ZIP → Task 6 (`/download`) + Task 10. ✔
- Resultados reaproveitando visões atuais → Task 10. ✔
- Roboto + paleta + logo SEBRAE → Task 7. ✔
- 34 testes atuais continuam verdes → Task 5/Task 11 (regressão). ✔
- Bloqueio do molde exemplo → Task 5 (`MoldeEmDesenvolvimentoError`) + Task 9 (botão bloqueado). ✔

**Itens fora do v1 (não planejados, conforme spec):** motor IA, parametrização no-code, dashboard, pendências, auditoria, integração datacenter. ✔

**Consistência de tipos:** `parser(pdf_path) -> list[dict]` usado em molde_registry, processador e parsers; `processar(...)` retorna `{molde_id, tipo, funcionarios, zip_path}` consumido por `web/main.py`; `/results` expõe `results`/`molde_id`/`zip_disponivel` consumidos por `Results.jsx`. Consistente.
