# Imagem única: FastAPI servindo o front já buildado (web/static) + API.
# python:3.12-slim garante wheels do PyMuPDF (sem toolchain de build).
FROM python:3.12-slim

# UTF-8 no processo: garante que ONEDRIVE_BASE (com acento) decodifica certo.
ENV PYTHONUTF8=1 PYTHONIOENCODING=utf-8

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000
CMD ["uvicorn", "web.main:app", "--host", "0.0.0.0", "--port", "8000"]
