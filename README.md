# Document Vision RAG: Multimodal Retrieval-Augmented Generation for Degraded Historical Records

**Author:** Henri Mafra  
**License:** MIT License  
**Domain:** Multimodal Artificial Intelligence, Computer Vision, Vector Information Retrieval  

---

## 1. Overview

Document Vision RAG is an advanced computational pipeline designed for transcription, structured entity extraction, and semantic search over degraded historical records, pre-reform legal deeds, and deteriorated public registers. The architecture pairs **Vision-Language Models (GPT-4o Vision)** with high-dimensional vector search via **PostgreSQL and pgvector**, incorporating uncertainty quantification to mitigate hallucination risks.

---

## 2. Technical Architecture and Pipeline

```
[Degraded Image / PDF Scan]
             
             

 Binarization & Preprocessing  > Adaptive Gaussian thresholding & de-skewing

             
             

 Multimodal VLM Transcription > Structure-preserving OCR with [unreadable] markers

             
             

 Semantic Chunking & Metadata > Entity extraction (Dates, Grantors, Properties)

             
             

 Vector Indexing (pgvector)   > 1536-dimensional embeddings with HNSW indexing

             
             

 Grounded RAG Query Engine    > Strict citation enforcement against source chunks

```

---

## 3. Mathematical Retrieval Formulation

Let document collection $D$ be partitioned into chunks $\{c_1, \dots, c_m\}$. Each chunk is embedded into a high-dimensional vector space:

$$\vec{v}_k = \text{Embed}(c_k) \in \mathbb{R}^d, \quad d = 1536$$

Given user query $q$, the retrieval score is determined via Cosine Similarity:

$$\text{Sim}(\vec{v}_q, \vec{v}_k) = \frac{\vec{v}_q \cdot \vec{v}_k}{\|\vec{v}_q\| \|\vec{v}_k\|} = \frac{\sum_{j=1}^d v_{q,j} v_{k,j}}{\sqrt{\sum_{j=1}^d v_{q,j}^2} \sqrt{\sum_{j=1}^d v_{k,j}^2}}$$

To ensure sub-millisecond query performance over large corpus sizes, the PostgreSQL vector store utilizes the **Hierarchical Navigable Small World (HNSW)** index:

```sql
CREATE INDEX ON document_embeddings 
USING hnsw (embedding vector_cosine_ops) 
WITH (m = 16, ef_construction = 64);
```

---

## 4. Setup and Execution

```bash
# 1. Clone repository
git clone https://github.com/HenriMafra/document-vision-rag.git
cd document-vision-rag

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env.local
# Set OPENAI_API_KEY and DATABASE_URL

# 4. Run database migrations
npm run db:migrate

# 5. Start application
npm run dev
```

---

## 5. References

- Malkov, Y. A., & Yashunin, D. A. (2020). Efficient and robust approximate nearest neighbor search using Hierarchical Navigable Small World graphs. *IEEE Transactions on Pattern Analysis and Machine Intelligence*, 42(4), 824-836.
- Lewis, P., et al. (2020). Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks. *Advances in Neural Information Processing Systems (NeurIPS)*.

---

## 6. License

Licensed under the MIT License. Copyright (c) Henri Mafra.
