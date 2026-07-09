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
from src import destino_onedrive

app = FastAPI(title="Plataforma de Separação de Documentos — SEBRAE")
app.mount("/assets", StaticFiles(directory="web/static/assets"), name="assets")
# Imagens-exemplo dos moldes (1ª página real de cada PDF-modelo).
app.mount("/exemplos", StaticFiles(directory="web/exemplos"), name="exemplos")


@app.get("/favicon.png")
@app.get("/favicon.ico")
def favicon():
    return FileResponse("web/static/favicon.png", media_type="image/png")

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
    # não vaza caminhos absolutos; só sinaliza disponibilidade/capacidades
    public = {k: v for k, v in job.items() if k not in ("zip_path", "saida_dir")}
    public["zip_disponivel"] = bool(job.get("zip_path"))
    public["onedrive_configurado"] = destino_onedrive.configurado()
    return public


@app.post("/onedrive/enviar/{job_id}")
async def enviar_onedrive(job_id: str):
    job = _jobs.get(job_id)
    if not job or job.get("status") != "done":
        return JSONResponse(status_code=404, content={"error": "Job não encontrado."})
    if not destino_onedrive.configurado():
        return JSONResponse(status_code=400,
                            content={"error": "Envio ao OneDrive não configurado neste ambiente."})
    if not job.get("saida_dir"):
        return JSONResponse(status_code=400, content={"error": "Resultado indisponível para envio."})
    try:
        resumo = await asyncio.to_thread(
            destino_onedrive.enviar, job["saida_dir"], job.get("tipo"))
        return resumo
    except Exception as exc:  # falha do Graph vira mensagem, não 500 cru
        return JSONResponse(status_code=502, content={"error": f"Falha no envio: {exc}"})


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
            "estatisticas": res.get("estatisticas"),
            "zip_path": res["zip_path"],
            "saida_dir": res.get("saida_dir"),
        }
    except MoldeEmDesenvolvimentoError as exc:
        _jobs[job_id] = {"status": "error", "error": str(exc)}
    except Exception as exc:
        _jobs[job_id] = {"status": "error", "error": str(exc)}
    finally:
        Path(pdf_path).unlink(missing_ok=True)
