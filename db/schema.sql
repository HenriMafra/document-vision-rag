-- ============================================================
-- Projeto Palimpsesto MVP — Schema Neon (Serverless PostgreSQL)
-- Executar este script no SQL Editor do painel Neon.
-- ============================================================

-- 1. Habilitar a extensao pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Tabela principal de documentos processados
CREATE TABLE IF NOT EXISTS documentos (
  id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nome_arquivo        TEXT NOT NULL,
  resumo              TEXT,
  entidades           JSONB NOT NULL DEFAULT '[]'::jsonb,
  nivel_confianca     REAL CHECK (nivel_confianca BETWEEN 0 AND 1),
  transcricao_literal TEXT,
  embedding           VECTOR(1536),   -- text-embedding-3-small
  criado_em           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Indice HNSW para busca por similaridade de cosseno
CREATE INDEX IF NOT EXISTS documentos_embedding_idx
  ON documentos USING hnsw (embedding vector_cosine_ops);

-- 4. Funcao de busca por similaridade de cosseno
--    similaridade = 1 - distancia_cosseno (operador <=>)
CREATE OR REPLACE FUNCTION buscar_documentos(
  query_embedding     VECTOR(1536),
  qtd                 INT  DEFAULT 4,
  similaridade_minima REAL DEFAULT 0.15
)
RETURNS TABLE (
  id                  BIGINT,
  nome_arquivo        TEXT,
  resumo              TEXT,
  entidades           JSONB,
  nivel_confianca     REAL,
  transcricao_literal TEXT,
  similaridade        REAL
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    d.id,
    d.nome_arquivo,
    d.resumo,
    d.entidades,
    d.nivel_confianca,
    d.transcricao_literal,
    (1 - (d.embedding <=> query_embedding))::real AS similaridade
  FROM documentos d
  WHERE d.embedding IS NOT NULL
    AND 1 - (d.embedding <=> query_embedding) >= similaridade_minima
  ORDER BY d.embedding <=> query_embedding
  LIMIT qtd;
$$;
