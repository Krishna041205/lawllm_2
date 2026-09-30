-- Migration 003: Create document_chunks table with relational integrity
-- Prepares the foundation for Phase 2 Production Vector Store

CREATE TABLE IF NOT EXISTS document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    page_number INTEGER,
    section VARCHAR(255),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    -- NOTE FOR PHASE 2 (PRODUCTION VECTOR STORE):
    -- The embedding column (e.g. embedding vector(768)) will be added via dedicated migration
    -- in Phase 2 once the embedding model is finalized, avoiding synthetic dimension assumptions.
);

-- Relational and ordering indexes
CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_chunk_index ON document_chunks(document_id, chunk_index);
