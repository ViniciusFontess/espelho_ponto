# Deploy — Separador de PDFs (homologação SEBRAE)

Mesmo padrão da captura-nfse: **Linux + Docker Compose**, código em `/apps`, atrás do proxy.
Diferença: esta app é **stateless e leve** — **sem** MongoDB, Redis, Celery ou certificado.
Um container só (FastAPI) servindo o front já buildado (`web/static`) + a API.

## 1. Código no servidor
```bash
cd /apps
git clone <repo>.git separador-pdf      # repo no GitLab SEBRAE quando migrado
cd separador-pdf
```

## 2. Subir
```bash
PORT=8090 docker compose up -d --build   # escolha uma porta livre (NFSe usa 8078)
```

## 3. Proxy reverso
Apontar o subdomínio/rota de homologação → `http://127.0.0.1:8090`.
(Definir com a infra: subdomínio próprio ou rota sob o host já provisionado.)

## 4. Teste
```bash
curl -s http://127.0.0.1:8090/moldes        # deve listar os 3 moldes
```
Abrir no navegador: a landing "Plataforma Inteligente de Documentos".

## Observações
- Sem `.env` / sem banco: nada a configurar além da porta.
- Jobs e .zip ficam em `/app/_tmp_jobs` (efêmero no container) — ok para homologação;
  limpar/persistir só se virar produção com volume grande.
- Atualizar versão: `git pull && docker compose up -d --build`.
