import asyncio
import uuid
from pathlib import Path

from fastapi import FastAPI, UploadFile, File
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from src.pipeline import run

app = FastAPI(title="Espelho Ponto — SEBRAE")
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
