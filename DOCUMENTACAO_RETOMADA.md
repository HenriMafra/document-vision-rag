# DOCUMENTAÇÃO DE RETOMADA — Projeto Palimpsesto MVP

> **Estado em 11/07/2026:** o MVP está **estruturalmente completo e com build de produção a passar**
> (`next build` limpo, typecheck OK, UI verificada no browser). O que falta é exclusivamente
> **configuração externa** (banco Neon + chaves no `.env`). Nenhuma linha de código é necessária
> para o primeiro teste end-to-end.

---

## 1. O que este sistema é

MVP de um sistema **RAG (Retrieval-Augmented Generation) para análise de documentos históricos
digitalizados** (cartórios, processos antigos, contratos datilografados):

1. O usuário envia a **imagem** de um documento (PNG/JPG).
2. O **GPT-4o (visão)** transcreve fielmente (marcando trechos `[ILEGIVEL]`), resume, extrai
   entidades e atribui um **nível de confiança** à transcrição.
3. O texto vira um **embedding de 1536 dimensões** (`text-embedding-3-small`) gravado no
   **Neon (PostgreSQL serverless + pgvector)**.
4. No chat, cada pergunta é vetorizada, os documentos mais próximos são recuperados por
   **similaridade de cosseno** (operador `<=>`) e a resposta é gerada **ancorada apenas nesse
   contexto**, com streaming via **Vercel AI SDK**.

## 2. Stack instalada (versões reais desta máquina)

| Camada | Tecnologia | Versão |
|---|---|---|
| Framework | Next.js (App Router, Turbopack) | 16.2.10 |
| Linguagem | TypeScript (strict) | — |
| UI | Tailwind CSS v4 + shadcn/ui (button, input, card, scroll-area) | — |
| IA / streaming | Vercel AI SDK (`ai`) | 7.0.x |
| Provider | `@ai-sdk/openai` (GPT-4o + text-embedding-3-small) | 4.0.x |
| Chat no cliente | `@ai-sdk/react` (`useChat` — API nova: `sendMessage` + `parts`) | 4.0.x |
| Banco | `@neondatabase/serverless` (driver HTTP) + pgvector | 1.1.x |
| Validação | Zod (schema da extração estruturada) | 4.x |
| Node local | v24.18.0 (npm 11) | — |

> ⚠️ **Atenção ao retomar código:** o AI SDK v7 **não tem** `ai/react` nem
> `handleInputChange/handleSubmit`. O input do chat é estado local + `sendMessage({ text })`,
> e as mensagens são renderizadas por `message.parts` (filtrar `type === "text"`).

## 3. Mapa mental — onde está cada lógica

```
C:\palimpsesto-mvp
├── app/
│   ├── page.tsx                  ← UI COMPLETA (client): split-screen
│   │                                • esquerda: uploader → POST /api/process → JSON/metadados
│   │                                • direita: chat useChat() → POST /api/chat (streaming)
│   │                                • BadgeConfianca: verde ≥85% · âmbar ≥60% · vermelho <60%
│   ├── layout.tsx                ← metadados do site (título/descrição)
│   └── api/
│       ├── process/route.ts      ← *** O "OCR" ESTÁ AQUI ***
│       │                            1) generateObject + GPT-4o visão (schema Zod:
│       │                               resumo, entidades[], nivel_confianca, transcricao_literal)
│       │                            2) embed() → text-embedding-3-small (1536 dims)
│       │                            3) INSERT ... ::vector no Neon
│       │                            Prompt de sistema anti-alucinação: nunca inventar
│       │                            caracteres apagados; [ILEGIVEL] e [ASSINATURA] obrigatórios.
│       └── chat/route.ts         ← *** O "RAG" ESTÁ AQUI ***
│                                    1) extrai o texto da última mensagem do usuário
│                                    2) embed() da pergunta
│                                    3) SELECT ... ORDER BY embedding <=> $vetor LIMIT 4
│                                    4) contexto injetado no system prompt (grounding estrito)
│                                    5) streamText() → toUIMessageStreamResponse()
├── lib/
│   ├── db.ts                     ← cliente Neon com inicialização preguiçosa (lazy):
│   │                                não quebra o build sem DATABASE_URL; erro claro em runtime
│   └── utils.ts                  ← helper cn() do shadcn
├── db/
│   └── schema.sql                ← *** RODAR NO PAINEL DO NEON (passo pendente #1) ***
│                                    CREATE EXTENSION vector; tabela `documentos`
│                                    (embedding VECTOR(1536)); índice HNSW de cosseno;
│                                    função buscar_documentos(query_embedding, qtd, min)
├── components/ui/                ← shadcn: button, input, card, scroll-area
├── .github/workflows/deploy.yml  ← CI/CD: push na `main` → npm ci → lint → vercel build
│                                    → vercel deploy --prebuilt --prod
├── .env.example                  ← *** COPIAR PARA .env E PREENCHER (passo pendente #2) ***
└── DOCUMENTACAO_RETOMADA.md      ← este arquivo
```

## 4. O QUE FALTA FAZER (checklist de ativação)

### ☐ Passo 1 — Banco Neon (5 min)
1. Acesse https://console.neon.tech e crie (ou abra) um projeto.
2. Abra o **SQL Editor** e cole o conteúdo integral de `db/schema.sql` → **Run**.
3. Confirme: `\dx` deve listar `vector`; `SELECT COUNT(*) FROM documentos;` deve retornar 0.
4. Em **Connection Details**, copie a connection string **Pooled** (termina em
   `-pooler...neon.tech/neondb?sslmode=require`).

### ☐ Passo 2 — Variáveis de ambiente (2 min)
```powershell
cd C:\palimpsesto-mvp
Copy-Item .env.example .env
notepad .env
```
Preencha:
- `OPENAI_API_KEY` → https://platform.openai.com/api-keys (precisa de crédito ativo; usa GPT-4o e embeddings)
- `DATABASE_URL` → a string pooled do Neon (Passo 1.4)

### ☐ Passo 3 — Subir e testar localmente (3 min)
```powershell
cd C:\palimpsesto-mvp
npm run dev
```
- Abra http://localhost:3000 (se a porta 3000 estiver ocupada, o Next escolhe outra e mostra no terminal).
- **Teste A (ingestão):** clique na área tracejada à esquerda → envie um JPG/PNG de um documento
  antigo → aguarde o spinner → devem aparecer: badge de confiança, resumo, chips de entidades,
  transcrição literal e o JSON bruto.
- **Teste B (RAG):** no chat à direita pergunte «Quem são as partes deste documento?» →
  a resposta deve chegar em streaming citando `[Documento N]`.
- **Teste C (anti-alucinação):** pergunte algo que não está no documento → resposta esperada:
  *«A informacao nao consta dos documentos analisados.»*

### ☐ Passo 4 — Deploy contínuo (opcional, 10 min)
1. No painel da Vercel: importe o repositório GitHub `palimpsesto-mvp` e defina
   `OPENAI_API_KEY` e `DATABASE_URL` em **Environment Variables**.
2. No GitHub, em *Settings → Secrets and variables → Actions*, crie:
   `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`
   (org/project IDs: rode `npx vercel link` uma vez e leia `.vercel/project.json`).
3. Qualquer push na `main` dispara `.github/workflows/deploy.yml` → build → produção.

## 5. Contratos de API (para testes manuais via curl/Postman)

### POST `/api/process`
```json
// Request
{ "imageBase64": "data:image/png;base64,....", "nomeArquivo": "escritura-1943.png" }
// Response 200
{ "id": 1, "resumo": "...", "entidades": [{"tipo": "pessoa", "valor": "..."}],
  "nivel_confianca": 0.91, "transcricao_literal": "... [ILEGIVEL] ..." }
// Response 500 → verifique OPENAI_API_KEY / DATABASE_URL / schema rodado no Neon
```

### POST `/api/chat`
Protocolo de UI-messages do AI SDK v7 (enviado automaticamente pelo `useChat`); resposta é um
stream `text/event-stream`. Não testar à mão sem necessidade — usar a interface.

## 6. Troubleshooting rápido

| Sintoma | Causa provável | Correção |
|---|---|---|
| `DATABASE_URL nao definida` | `.env` ausente/incompleto | Passo 2 acima |
| `relation "documentos" does not exist` | schema.sql não foi executado | Passo 1 acima |
| `type "vector" does not exist` | extensão não habilitada | `CREATE EXTENSION vector;` no Neon |
| Erro 401 da OpenAI | chave inválida/sem crédito | regenerar chave, conferir billing |
| Chat responde sem contexto | tabela vazia | ingerir um documento primeiro (Teste A) |
| Porta 3000 ocupada | outro processo local | usar a porta alternativa que o Next indicar |
