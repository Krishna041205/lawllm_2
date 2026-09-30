-- Migration 005: Court Scrapers, Ingestion Jobs, and Document Processing Metadata
-- Establishes persistent schema for legal source registries, background ingestion jobs, and court attributes

-- 1. Court Sources Registry
CREATE TABLE IF NOT EXISTS court_sources (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    court_name VARCHAR(255) NOT NULL,
    base_url TEXT NOT NULL,
    enabled BOOLEAN DEFAULT true,
    request_delay_ms INTEGER DEFAULT 1000,
    last_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed primary permitted court sources
INSERT INTO court_sources (id, name, court_name, base_url, enabled, request_delay_ms)
VALUES
    ('SCI_DAILY', 'Supreme Court of India (SCI Daily Orders)', 'Supreme Court of India', 'https://main.sci.gov.in/judgments', true, 1200),
    ('DHC_COMMERCIAL', 'Delhi High Court (Commercial Division)', 'Delhi High Court', 'https://delhihighcourt.nic.in/judgments', true, 1500),
    ('BHC_COMMERCIAL', 'Bombay High Court (Commercial & Arbitration)', 'Bombay High Court', 'https://bombayhighcourt.nic.in/judgments', true, 1500),
    ('AWS_OPEN_DATA', 'AWS Open Data Registry Indian Judicial Corpus', 'All Indian Courts', 'https://registry.opendata.aws/indian-supreme-court-data', true, 500)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    court_name = EXCLUDED.court_name,
    base_url = EXCLUDED.base_url;

-- 2. Extend Documents Table with Court Metadata & PDF File Paths
ALTER TABLE documents ADD COLUMN IF NOT EXISTS court VARCHAR(100);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS case_number VARCHAR(255);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS citation VARCHAR(255);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS judgment_date DATE;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS bench TEXT[];
ALTER TABLE documents ADD COLUMN IF NOT EXISTS petitioner TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS respondent TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS pdf_path TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS ocr_used BOOLEAN DEFAULT false;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS acts_cited TEXT[];

CREATE INDEX IF NOT EXISTS idx_documents_court ON documents(court);
CREATE INDEX IF NOT EXISTS idx_documents_case_number ON documents(case_number);
CREATE INDEX IF NOT EXISTS idx_documents_citation ON documents(citation);
CREATE INDEX IF NOT EXISTS idx_documents_judgment_date ON documents(judgment_date);

-- 3. Ingestion Jobs Table (State Machine & Audit Tracking)
CREATE TABLE IF NOT EXISTS ingestion_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    source VARCHAR(100) NOT NULL,
    court VARCHAR(100) NOT NULL,
    case_number VARCHAR(255),
    case_name TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    current_stage VARCHAR(50) DEFAULT 'DISCOVERED',
    pdf_url TEXT,
    pdf_path TEXT,
    content_hash VARCHAR(64),
    retry_count INTEGER DEFAULT 0,
    error TEXT,
    audit_metadata JSONB DEFAULT '{}'::jsonb,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ingestion_jobs_status ON ingestion_jobs(status);
CREATE INDEX IF NOT EXISTS idx_ingestion_jobs_source ON ingestion_jobs(source);
CREATE INDEX IF NOT EXISTS idx_ingestion_jobs_court ON ingestion_jobs(court);
CREATE INDEX IF NOT EXISTS idx_ingestion_jobs_created_at ON ingestion_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ingestion_jobs_content_hash ON ingestion_jobs(content_hash);
