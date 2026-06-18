# Plataforma Inteligente de Separação de Documentos — Separador com Molde (v1)

**Data:** 2026-06-18
**Área responsável:** UGP (SEBRAE)
**Base:** evolução do projeto `espelho_ponto`

---

## 1. Contexto

O repositório `espelho_ponto` hoje processa espelhos de ponto da Pontomais (2 tipos:
"Eletrônico" assinado e "Jornada" sem assinatura), separa por funcionário, extrai
variáveis e organiza em pastas. O SEBRAE pediu para generalizar esse padrão numa
**plataforma de separação inteligente de PDFs**, com dois modos:

- **Separador com Molde** — documentos de layout conhecido, cujo PDF-modelo é enviado
  antecipadamente e tem um parser dedicado.
- **Separador com IA** — qualquer PDF, lido por uma API de IA (sub-projeto futuro).

Este spec cobre **somente o v1**: o *shell* da plataforma (landing com os 2 modos) e o
*Separador com Molde* completo, ponta a ponta, gerando um arquivo ZIP.

## 2. Escopo

### Entra no v1
- Landing da plataforma com 2 modos: **Com Molde** (ativo) e **Separador IA** (visível, "em breve").
- Tela de upload do Separador com Molde, com 3 campos: arquivo, o que extrair, destino.
- Registro de moldes fixos no código, com **3 opções selecionáveis**:
  1. **Espelho de Ponto — Eletrônico (assinado)** — funcional (parser existente, valida assinatura).
  2. **Espelho de Ponto — Jornada** — funcional (parser existente).
  3. **Férias SEBRAE** — exemplo/placeholder, selecionável mas não processa ("molde em desenvolvimento").
- Seleção de variáveis a extrair (lista completa do molde, com toggle por variável).
- Organização automática em árvore de pastas conforme regra de destino.
- Empacotamento do resultado em **ZIP** para download.
- Tela de resultados reaproveitando as visões atuais (tabela com status de assinatura
  para o Espelho assinado; grade de pastas para a Jornada).

### NÃO entra no v1 (sub-projetos futuros)
- Motor de IA (Separador sem molde).
- Tela de parametrização no-code (cadastro de regras por usuário de negócio).
- Dashboard gerencial e indicadores.
- Gestão de pendências, inconsistências e auditoria/rastreabilidade.
- Integração real com servidor/datacenter SEBRAE (credenciais existem, mas a entrega
  via ZIP cobre o v1; a integração entra como um driver de destino futuro).

## 3. Arquitetura

Sistema em camadas, cada peça com uma responsabilidade única e testável isoladamente.

```
Frontend (React + Vite · fonte Roboto · paleta SEBRAE)
  ├─ Landing            → escolha do modo (Com Molde / IA-em-breve)
  ├─ Upload Com Molde   → arquivo + o que extrair + destino
  └─ Resultados         → tabela/grade + botão "Baixar ZIP"
        │  (HTTP / FastAPI)
Backend
  ├─ molde_registry     → moldes fixos no código (3 entradas)
  ├─ pipeline           → detector → parser do molde → extração de variáveis
  ├─ organizador        → monta a árvore de pastas conforme regra de destino
  └─ destino (abstrato) → DestinoZip (v1) | DestinoDatacenter (futuro)
```

### Identidade visual
- **Fonte:** Roboto (títulos 900/700, corpo 400/500). Substitui Syne + Plus Jakarta Sans.
- **Paleta:** azul SEBRAE `#1d65c4`, roxo escuro `#2e1065`, roxo `#5b21b6`,
  roxo claro `#ede9fe`, preto `#0f1020`, branco.
- **Logo:** SVG do SEBRAE (branco sobre o header roxo→azul).

## 4. Componentes

### 4.1 `molde_registry` (backend)
Catálogo de moldes conhecidos. Cada molde é uma entrada:

```
Molde {
  id:        "espelho_eletronico" | "espelho_jornada" | "ferias_sebrae"
  nome:      str (rótulo exibido)
  status:    "ativo" | "exemplo"
  variaveis: [str]            # TODAS as variáveis que o molde consegue extrair
  parser:    Callable | None  # None quando status == "exemplo"
}
```

- **Workflow de novos moldes:** o usuário envia o PDF-modelo; o desenvolvedor analisa,
  constrói o parser e cadastra a entrada com a **lista completa de variáveis** descobertas.
  Adicionar molde = adicionar entrada + parser, sem alterar o restante.
- Variáveis por molde no v1:
  - `espelho_eletronico`: nome, matrícula, CPF, PIS, cargo, equipe, período, dias, assinatura.
  - `espelho_jornada`: nome, competência (mês/ano), página.
  - `ferias_sebrae`: (placeholder, sem parser).

### 4.2 `pipeline` (backend)
Orquestra o processamento de um PDF dado um molde:
1. Detecta o tipo automaticamente (reaproveita `pdf_type_detector`); o usuário pode
   sobrescrever o molde manualmente.
2. Executa o parser do molde.
3. Filtra o resultado para conter **apenas as variáveis selecionadas** pelo usuário.
4. Entrega os registros ao organizador.

### 4.3 `organizador` (backend)
Recebe os registros e a regra de organização e monta a árvore de pastas em memória
(ou em diretório temporário): `<NOME_SEGURO>/<COMPETENCIA>/dados.json` + `pagina_N.pdf`.
Reaproveita a lógica de `folder_writer` (nomes seguros, sem sobrescrever).

### 4.4 `destino` (backend) — interface plugável
Interface comum:

```
class Destino:
    def entregar(self, raiz_arquivos: Path) -> Resultado
```

- **`DestinoZip` (v1):** compacta a árvore de pastas num `.zip` e devolve para download.
- **`DestinoDatacenter` (futuro):** grava no servidor/datacenter SEBRAE usando as
  credenciais seguras já existentes. Não faz parte do v1, mas a interface é desenhada
  para acomodá-lo sem reescrever o pipeline.

### 4.5 Frontend — 3 telas
- **Landing:** layout aprovado (Opção A). Card "Com Molde" ativo; card "Separador IA"
  esmaecido com selo "em breve".
- **Upload Com Molde:**
  - Campo 1 — **Arquivo PDF** (drag & drop) + aviso de molde auto-detectado.
  - Campo 2 — **O que extrair**: dropdown do molde (3 opções) + chips das variáveis
    (lista completa do molde, pré-marcadas, com toggle).
  - Campo 3 — **Destino**: dropdown da regra de organização + preview da árvore de pastas.
  - Botão **Processar**. Se o molde for `ferias_sebrae` (exemplo), exibe aviso
    "molde em desenvolvimento" e bloqueia o processamento.
- **Resultados:** reaproveita as visões atuais (tabela com status de assinatura para o
  Espelho assinado; grade de pastas para a Jornada) + botão **"Baixar ZIP"**.

## 5. Fluxo de dados (caminho feliz)

1. Usuário entra na Landing e escolhe **Com Molde**.
2. Faz upload do PDF; o backend auto-detecta o molde e sugere (usuário pode trocar).
3. Usuário ajusta as variáveis a extrair e a regra de destino; clica em Processar.
4. Backend roda o pipeline → organizador → `DestinoZip`.
5. Frontend mostra os resultados e oferece **Baixar ZIP** com a árvore de pastas pronta.

## 6. Tratamento de erros

- **Molde exemplo (`ferias_sebrae`):** bloqueio no frontend + resposta clara do backend
  caso seja forçado ("molde em desenvolvimento").
- **PDF não reconhecido pela auto-detecção:** exige seleção manual do molde antes de processar.
- **Variável ausente numa página:** registra o valor como vazio/`null` e segue (não
  interrompe o lote); a página continua sendo separada e organizada.
- **PDF corrompido / falha de leitura:** erro amigável no frontend, sem derrubar o job.

## 7. Estratégia de testes

- **Unitários:**
  - `molde_registry`: as 3 entradas existem; `ferias_sebrae` tem `parser=None` e `status="exemplo"`.
  - Filtro de variáveis: dado um conjunto selecionado, o registro de saída contém apenas elas.
  - `DestinoZip`: produz um `.zip` com a árvore de pastas esperada.
  - `organizador`: nomes seguros, sem sobrescrever, estrutura `NOME/COMPETENCIA/`.
- **Integração:**
  - PDF Espelho Eletrônico → registros com assinatura validada → ZIP correto.
  - PDF Jornada → 10 funcionários → árvore de pastas → ZIP correto.
  - Seleção de molde `ferias_sebrae` → processamento bloqueado.
- **Regressão:** os 34 testes atuais continuam passando.

## 8. Decisões registradas

| Decisão | Escolha |
|---|---|
| Nível de parametrização no v1 | Moldes fixos no código (no-code fica para futuro) |
| Landing | Opção A (2 cards lado a lado) |
| Fonte | Roboto |
| Paleta | Azul SEBRAE + roxos + preto/branco |
| Seleção de molde | Auto-detecção + troca manual |
| Moldes no v1 | Espelho Eletrônico, Espelho Jornada, Férias SEBRAE (exemplo) |
| Lista de variáveis | Conjunto completo por molde, definido a partir do PDF-modelo; usuário seleciona subconjunto |
| Destino no v1 | ZIP para download; datacenter como driver futuro |

## 9. Resultado esperado do v1

Ao final, a plataforma deve:
- Apresentar a landing com os 2 modos (Com Molde ativo, IA em breve).
- Permitir upload de PDF, escolha de molde (3 opções), seleção de variáveis e destino.
- Separar automaticamente os documentos do PDF consolidado.
- Extrair as variáveis selecionadas e organizar em árvore de pastas.
- Validar assinatura quando o molde for o Espelho Eletrônico.
- Entregar o resultado num ZIP para download.
- Manter os 34 testes atuais verdes e cobrir os novos componentes com testes.
