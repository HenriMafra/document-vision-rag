# 📜 Document Vision RAG — Motor Multimodal de RAG para Documentos Degradados & Históricos

Motor de **Recuperação Aumentada por Geração (RAG)** multimodal especializado no processamento, transcrição e consulta semântica de **documentos digitalizados complexos, certidões históricas, escrituras manuscritas e contratos antigos** com degradação visual.

Combina **visão computacional avançada (GPT-4o Vision)**, embeddings vetoriais com **PostgreSQL + pgvector** e salvaguardas rigorosas contra alucinações em trechos ilegíveis.

---

## 📌 Que Problema Resolve?

Mecanismos convencionais de OCR (como Tesseract ou Textract básico) falham catastroficamente ao lidar com:
- Páginas amareladas, carimbos sobrepostos e texto manuscrito desbotado.
- Letras góticas ou ortografia arcaica pré-reforma ortográfica.
- Tabelas e assinaturas que perdem a estrutura espacial no texto plano.

Quando esse texto mal-extraído é injetado em um pipeline RAG, o LLM frequentemente **alucina datas, nomes e cláusulas contratuais inexistentes**.

O **Document Vision RAG** resolve este problema através de um pipeline em camadas:
1. **Transcrição Estruturada com Visão:** Emprega modelos de visão multimodal para transcrever preservando a estrutura de layout e marcando explicitamente trechos indecifráveis com marcadores `[ilegível]`.
2. **Extração de Entidades Nomeadas (NER):** Mapeia outorgantes, outorgados, datas de lavratura, valores monetários em moedas antigas e descrições de bens.
3. **Indexação Vetorial Híbrida:** Gera embeddings semânticos armazenados no `pgvector` para permitir busca textual exata e busca por similaridade de cosseno.

---

## ⚙️ Diferencial Técnico & Arquitetura

```
[Documento PDF/Imagem Degradada]
               │
               ▼
┌───────────────────────────────┐
│ Pré-processamento & Binarização│
└───────────────────────────────┘
               │
               ▼
┌───────────────────────────────┐
│  GPT-4o Vision OCR Multimodal │ ──> Marcação de incerteza [ilegível]
└───────────────────────────────┘
               │
               ▼
┌───────────────────────────────┐
│ Chunking com Consciência de   │
│ Estrutura + Metadata Ingestion│
└───────────────────────────────┘
               │
               ▼
┌───────────────────────────────┐
│ Vetorização & Armazenamento   │ ──> PostgreSQL + Neon (pgvector)
│ em pgvector (Cosine Index HNSW)│
└───────────────────────────────┘
               │
               ▼
┌───────────────────────────────┐
│ Chat RAG com Citações Diretas │ ──> Resposta contextualizada com bounding boxes
└───────────────────────────────┘
```

---

## 🏗️ Stack Tecnológica

- **Framework Web:** Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui.
- **Banco Vetorial:** PostgreSQL com extensão `pgvector` (índices HNSW para alta performance).
- **Provedores de IA:** OpenAI API (GPT-4o Vision & Text-Embedding-3-Small).
- **Processamento de Arquivos:** PDF.js e Sharp para manipulação e divisão de páginas em buffer.

---

## 🚀 Como Executar Localmente

```bash
# 1. Clone o repositório
git clone https://github.com/HenriMafra/document-vision-rag.git
cd document-vision-rag

# 2. Instale as dependências
npm install

# 3. Configure as variáveis de ambiente
cp .env.example .env.local
# Preencha OPENAI_API_KEY e DATABASE_URL no .env.local

# 4. Execute as migrations do banco vetorial
npm run db:migrate

# 5. Inicie a aplicação
npm run dev
```

---

## 📄 Licença

Distribuído sob a licença **MIT**. Desenvolvido por **Henri Mafra**.
