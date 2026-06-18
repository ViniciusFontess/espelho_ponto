# Espelho Ponto — Design Spec
**Data:** 2026-05-11  
**Status:** Aprovado

## Problema

O SEBRAE gera um PDF mensal com os espelhos-ponto de todos os funcionários. Cada funcionário ocupa uma página com hash de assinatura no topo. O processamento atual é 100% manual: alguém abre o PDF, extrai os dados de cada folha e salva nas pastas individuais dos funcionários.

## Objetivo

Automatizar a extração dos dados do PDF e expor o resultado via interface web simples (upload + tabela de resultados).

## Escopo (fase atual)

- Gerar PDF de teste simulando o formato real
- Extrair dados de cada funcionário via pipeline modular
- Validar presença do hash por funcionário
- Interface web: upload do PDF → visualização dos resultados em tabela

Fora do escopo agora: login, histórico, exportação para Excel, integração com sistema interno.

## Stack

- **Python 3.11+**
- **PyMuPDF (fitz)** — extração de texto do PDF (escolhido por velocidade em PDFs grandes)
- **reportlab** — geração do PDF de teste
- **FastAPI** — backend da API web
- **HTML/CSS/JS vanilla** — frontend de página única (sem frameworks)

## Arquitetura

```
espelho_ponto/
├── src/
│   ├── pdf_loader.py          # Abre PDF e retorna lista de páginas (texto por página)
│   ├── hash_extractor.py      # Extrai hash do topo de cada página
│   ├── data_parser.py         # Extrai nome, matrícula, setor, período, tabela de dias
│   ├── validator.py           # Valida presença e formato do hash
│   ├── output_writer.py       # Salva JSON por funcionário em output/
│   └── pipeline.py            # Orquestra os módulos; ponto de entrada CLI
├── web/
│   ├── main.py                # FastAPI: POST /upload, GET /status/{job_id}
│   └── static/
│       └── index.html         # Página única: upload + botão processar + tabela
├── tools/
│   └── test_pdf_generator.py  # Gera PDF de teste com N funcionários fictícios
├── output/                    # JSONs gerados (criado automaticamente)
├── tests/
│   └── espelho_ponto_teste.pdf  # PDF de teste gerado
└── requirements.txt
```

## Módulos

### `pdf_loader.py`
- Entrada: caminho do PDF
- Saída: lista de dicts `{page_num: int, text: str}`
- Usa `fitz.open()` e itera página por página
- Responsabilidade única: abrir e ler; sem parsing

### `hash_extractor.py`
- Entrada: texto de uma página
- Saída: string do hash ou `None`
- Lê as primeiras linhas do texto e extrai o hash com regex
- Formato esperado: string alfanumérica (SHA-256 ou similar) no topo da folha

### `data_parser.py`
- Entrada: texto de uma página
- Saída: dict com `nome`, `matricula`, `setor`, `periodo`, `dias[]`
- Cada item de `dias`: `{data, entrada, saida}`
- Módulo mais suscetível a ajuste quando o PDF real chegar — isolado por design

### `validator.py`
- Entrada: hash extraído
- Saída: `{hash_presente: bool, hash_valido: bool}`
- Valida se o hash existe e se tem formato esperado (comprimento, caracteres hex)
- Extensível para validação criptográfica real no futuro

### `output_writer.py`
- Entrada: dict com dados do funcionário + resultado da validação
- Saída: arquivo JSON em `output/{matricula}_{nome}.json`
- Cria a pasta `output/` se não existir

### `pipeline.py`
- Orquestra: loader → para cada página: hash_extractor + data_parser + validator + output_writer
- Retorna lista de resultados para uso tanto via CLI quanto via API web
- Aceita caminho do PDF como argumento

### `web/main.py`
- `POST /upload`: recebe PDF, salva temporariamente, aciona `pipeline.py` em background, retorna `job_id`
- `GET /results/{job_id}`: retorna lista de funcionários processados com status
- PDFs grandes processados de forma assíncrona (sem travar o browser)

### `tools/test_pdf_generator.py`
- Gera PDF com N funcionários (padrão: 10, configurável via argumento)
- Cada página: hash SHA-256 fictício no topo, cabeçalho (nome, matrícula, setor, período), tabela de dias úteis do mês
- ~20% dos funcionários gerados sem hash (para testar validação negativa)
- Salva em `tests/espelho_ponto_teste.pdf`

## Modelo de Dados (JSON de saída)

```json
{
  "hash": "a3f9c2e1b4d7...",
  "hash_presente": true,
  "hash_valido": true,
  "nome": "João da Silva",
  "matricula": "12345",
  "setor": "Administrativo",
  "periodo": "01/01/2026 - 31/01/2026",
  "dias": [
    {"data": "01/01/2026", "entrada": "08:00", "saida": "17:00"},
    {"data": "02/01/2026", "entrada": "08:05", "saida": "17:10"}
  ]
}
```

## Interface Web

Página única com:
1. Área de upload (drag-and-drop ou botão selecionar arquivo)
2. Botão "Processar"
3. Indicador de progresso enquanto processa
4. Tabela de resultados: Nome | Matrícula | Setor | Período | Hash ✓/✗

## Fluxo Completo

```
PDF mensal →
  pdf_loader (divide páginas) →
    para cada página:
      hash_extractor → validator →
      data_parser →
      output_writer (JSON) →
  pipeline retorna lista →
web exibe tabela de resultados
```

## Dependências (requirements.txt)

```
PyMuPDF==1.24.3
reportlab==4.2.2
fastapi==0.111.0
uvicorn==0.30.1
python-multipart==0.0.9
```
