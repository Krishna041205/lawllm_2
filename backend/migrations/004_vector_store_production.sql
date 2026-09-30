-- Migration 004: Production Vector Store & Persistent Document Pipeline
-- Extends documents and document_chunks with pgvector(768) and HNSW cosine similarity index

-- 1. Extend documents table
ALTER TABLE documents ADD COLUMN IF NOT EXISTS chunk_count INTEGER DEFAULT 0;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS embedding_status VARCHAR(50) DEFAULT 'pending';

CREATE INDEX IF NOT EXISTS idx_documents_source ON documents(source);
CREATE INDEX IF NOT EXISTS idx_documents_processing_status ON documents(processing_status);
CREATE INDEX IF NOT EXISTS idx_documents_embedding_status ON documents(embedding_status);

-- 2. Extend document_chunks table with 768-dimensional vector column
ALTER TABLE document_chunks ADD COLUMN IF NOT EXISTS embedding vector(768);
ALTER TABLE document_chunks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 3. Enforce relational integrity and prevent duplicate chunks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_document_chunks_doc_chunk'
  ) THEN
    ALTER TABLE document_chunks 
    ADD CONSTRAINT uq_document_chunks_doc_chunk UNIQUE (document_id, chunk_index);
  END IF;
END $$;

-- 4. Create HNSW Cosine Similarity Index on embeddings
-- HNSW (Hierarchical Navigable Small World) provides superior query throughput and recall for legal semantic search
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding_hnsw 
ON document_chunks 
USING hnsw (embedding vector_cosine_ops);
