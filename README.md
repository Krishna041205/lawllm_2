# LawLLM – AI-Powered Legal Intelligence Platform

LawLLM is an enterprise-grade legal intelligence suite featuring AI contract risk analysis, citation knowledge graphs, procedural timeline extraction, Indian law search pipeline, and grounded legal RAG research backed by PostgreSQL and pgvector.

---

## 🏛️ System Architecture

```text
                             LawLLM Platform
                                    │
        ┌───────────────────────────┴───────────────────────────┐
        │                                                       │
Frontend Client (React 19)                             Express Backend (Node 22 / tsx)
  • Contract Risk & Redline Analyzer                    • Grounded Legal RAG Engine
  • Interactive Citation Graph                          • Real pgvector Cosine Retrieval (<=>)
  • Chronology & Timeline Builder                       • Multi-tier Resilient AI Model Cascades
  • Indian Law Precedents Explorer                      • REST APIs (/api/documents, /api/search)
  • Vector Document Repository Manager                  • Connection Pooling (`pg`)
  • Citation Context Inspector                          • Health Endpoints (/api/health, /api/vector-store/health)
        │                                                       │
        └───────────────────────────┬───────────────────────────┘
                                    │
                        PostgreSQL 16 + pgvector
                        (Docker: lawllm-postgres)
                                    │
        ┌───────────────────────────┴───────────────────────────┐
        │                                                       │
Authoritative Relational Store                         pgvector Semantic Retrieval
  ├── documents (metadata, deduplication hash)          ├── 768-Dimensional Embeddings
  ├── document_chunks (text & page offsets)             ├── HNSW Cosine Index (vector_cosine_ops)
  └── schema_migrations (version audit log)             └── Fast Vector Nearest-Neighbor Search
```

---

## 📋 Platform Roadmap & Capabilities

### ✅ Phase 1: Docker Support + Database Migrations (Completed)
- **Reproducible Docker Environment**: `docker-compose.yml` with official `pgvector/pgvector:pg16` image.
- **Named Persistent Volume**: `postgres_data` ensures data survives container restart and `docker compose down`.
- **Health Checks**: PostgreSQL container features `pg_isready` health check; backend waits for database readiness.
- **pgvector Extension Support**: Extension automatically enabled via versioned migration `001_enable_pgvector.sql`.
- **Version-Controlled Migration System**: Lightweight, pure-SQL migration engine with `schema_migrations` audit history.
- **Relational Integrity**:
  - `documents` table with UUID primary key, content hash, document type, and JSONB metadata.
  - `document_chunks` table with `FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE`.
  - Indexes on content hash, document type, timestamps, and relational chunk keys.
- **Pooled Database Connection**: Connection pooling via `pg` (`Pool`), supporting `DATABASE_URL` and granular parameters.
- **Development Operations**: Safe dev database reset (`npm run db:reset`), sample seeding (`npm run db:seed`), and verification (`npm run db:verify`).

### ✅ Phase 2: Production Vector Store + Persistent Database (Completed)
- **PostgreSQL as Authoritative Source of Truth**: Replaced in-memory storage; all ingested documents and chunks persist in PostgreSQL.
- **Real 768-Dimensional Embeddings**: Generated via Google Gemini `@google/genai` (`gemini-embedding-2-preview` with `outputDimensionality: 768`).
- **HNSW Vector Similarity Index**: High-speed Hierarchical Navigable Small World index on `document_chunks.embedding` using `vector_cosine_ops`.
- **Database-Level Cosine Distance Search**: Similarity search executed inside PostgreSQL using the `<=>` operator (`1 - (embedding <=> queryVector)`), never loading full vectors into Node.js.
- **Ingestion Pipeline & Deduplication**: SHA-256 content hashing blocks duplicate document embeddings; transactional chunk insertion prevents orphaned records.
- **Grounded Legal RAG Engine**: `/api/research` generates query embeddings, retrieves top-K matching chunks above similarity thresholds, and instructs Gemini to ground reasoning strictly in retrieved context.
- **Exact Citation Preservation**: Citations correlate directly with retrieved database chunks, preserving document title, page number, chunk ID, and cosine match percentage.
- **Standalone Semantic Search API**: `POST /api/search` for vector retrieval with configurable top-K, similarity thresholds, and metadata filters.
- **Vector Store Health & Stats**: `GET /api/vector-store/health` and `GET /api/vector-store/stats`.
- **Backfill & Re-indexing Automation**: `npm run vector:backfill` and `npm run vector:test`.

### ✅ Phase 3: Live Court Scrapers + PDF/OCR Ingestion Pipeline (Completed)
- **Court Source Adapters & Discovery**:
  - `SCIDailySource`: Supreme Court of India daily orders and reportable rulings adapter.
  - `DHCCommercialSource`: Delhi High Court Commercial Division decisions adapter.
  - `BHCCommercialSource`: Bombay High Court Commercial & Arbitration Bench adapter.
  - `AWSOpenDataSource`: AWS Open Data Indian Judicial Corpus integration.
  - Rate limiting, jitter, and exponential backoff prevent upstream denial of service.
- **Robust PDF Processing Pipeline**:
  - `PdfValidator`: Magic byte detection (`%PDF-`), minimum size threshold, and corrupt file rejection.
  - `PdfExtractor`: Page-aware text extraction preserving exact page boundaries and offsets.
  - `ocrService`: Hybrid OCR engine combining Gemini Multimodal Vision OCR and Tesseract.js with automated quality scoring.
  - `textNormalizer`: Strips institutional watermarks, headers, footers, and normalizes legal citations.
- **Transactional Ingestion & Deduplication**:
  - End-to-end ingestion state machine (`PENDING` -> `EXTRACTING` -> `EMBEDDING` -> `COMPLETED`).
  - SHA-256 content hashing guarantees zero duplicate chunks across repeated court synchronizations.
  - Automatic 768-dimensional embedding generation into PostgreSQL + pgvector.
- **REST APIs & UI Integration**:
  - `/api/court-scraper/discover`: Discover judgments across court registries.
  - `/api/court-scraper/sync`: Synchronize selected court rosters into the vector store.
  - `/api/court-scraper/ingest`: Ingest specific judgments on demand.
  - `/api/court-scraper/status`: Pipeline metrics and background job logs.
  - Full UI controls in the **Indian Law Pipeline** interface.
- **Test Automation & Fixture Suite**:
  - Automated fixtures (Machine-readable, Scanned OCR, Corrupted, Duplicate, Multi-page).
  - Verification test suite: `npm run scraper:test`.

---

## ⚙️ Prerequisites

- **Docker & Docker Compose** (Docker Desktop or Docker Engine v20+)
- **Node.js** (v20+ or v22 LTS recommended)
- **npm** (v10+)

---

## 🚀 Getting Started

### 1. Environment Configuration

Copy the example environment template:

```bash
cp .env.example .env
```

Configure your Gemini API Key and database credentials in `.env`:

```env
GEMINI_API_KEY=your_gemini_api_key_here
POSTGRES_USER=lawllm
POSTGRES_PASSWORD=lawllm_secure_dev_pw
POSTGRES_DB=lawllm
POSTGRES_PORT=5432

# Production Vector Store settings
EMBEDDING_MODEL=gemini-embedding-2-preview
EMBEDDING_DIMENSION=768
VECTOR_TOP_K=8
VECTOR_MIN_SIMILARITY=0.60

# Local development URL (connecting to mapped Docker port):
DATABASE_URL=postgresql://lawllm:lawllm_secure_dev_pw@localhost:5432/lawllm
```

---

### 2. Start PostgreSQL with pgvector

Launch the containerized PostgreSQL service:

```bash
docker compose up -d postgres
```

Verify that the container is running and healthy:

```bash
docker compose ps
```

---

### 3. Run Database Migrations

Apply all version-controlled migrations to establish the schema (including Phase 2 vector store extensions):

```bash
npm run db:migrate
```

*Expected Output:*
```text
🚀 [DB:MIGRATE] Connecting to PostgreSQL to execute migrations...
📦 [DB:MIGRATE] Found 4 pending migration(s) to apply.
▶️  [DB:MIGRATE] Executing: 001_enable_pgvector.sql...
✅ [DB:MIGRATE] Successfully applied: 001_enable_pgvector.sql
▶️  [DB:MIGRATE] Executing: 002_create_documents_table.sql...
✅ [DB:MIGRATE] Successfully applied: 002_create_documents_table.sql
▶️  [DB:MIGRATE] Executing: 003_create_document_chunks_table.sql...
✅ [DB:MIGRATE] Successfully applied: 003_create_document_chunks_table.sql
▶️  [DB:MIGRATE] Executing: 004_vector_store_production.sql...
✅ [DB:MIGRATE] Successfully applied: 004_vector_store_production.sql
🎉 [DB:MIGRATE] All pending migrations applied successfully!
```

---

### 4. Backfill & Embed Initial Legal Repository

Populate the database with pre-configured legal agreements and generate 768-dimensional embeddings:

```bash
npm run vector:backfill
```

---

### 5. Verify the Vector Store Pipeline

Run the end-to-end vector test suite to verify embedding generation, pgvector cosine search, deduplication, and cascading deletion:

```bash
npm run vector:test
```

---

### 6. Start the Application

#### Local Development
```bash
npm run dev
```
Visit **http://localhost:3000** in your browser.

#### Full Docker Containerization
```bash
docker compose up -d --build
```

---

## 🛠️ Management Commands

| Command | Action |
| :--- | :--- |
| `npm run db:migrate` | Runs all pending database migrations in strict transactional order. |
| `npm run db:status` | Displays migration history and identifies pending migrations. |
| `npm run db:verify` | Verifies database connectivity, pgvector extension, and core tables. |
| `npm run db:reset` | **Development only**: Safely wipes schema and re-runs all migrations. |
| `npm run vector:backfill`| Ingests and generates 768-d embeddings for all pending legal documents. |
| `npm run vector:test` | Executes end-to-end pgvector semantic search and deduplication test suite. |

---

## 📦 Database Schema Details

### `documents`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Unique document identifier |
| `filename` | `TEXT` | `NOT NULL` | Original filename |
| `title` | `TEXT` | `NOT NULL` | Display title |
| `document_type` | `VARCHAR(50)` | `NOT NULL DEFAULT 'contract'` | Category (contract, case_law, etc.) |
| `source` | `VARCHAR(100)` | `DEFAULT 'user_upload'` | Origin (seed_repository, user_upload) |
| `content_hash` | `VARCHAR(64)` | Index | SHA-256 deduplication hash |
| `metadata` | `JSONB` | `DEFAULT '{}'::jsonb` | Size, rawContent, and legal attributes |
| `processing_status`| `VARCHAR(50)` | `DEFAULT 'pending'` | pending, processing, indexed, failed |
| `chunk_count` | `INTEGER` | `DEFAULT 0` | Total chunk count in database |
| `embedding_status` | `VARCHAR(50)` | `DEFAULT 'pending'` | pending, indexed, failed |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | Record timestamp |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | Last update timestamp |

### `document_chunks`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Unique chunk identifier |
| `document_id` | `UUID` | `NOT NULL REFERENCES documents(id) ON DELETE CASCADE` | Foreign key to document |
| `chunk_index` | `INTEGER` | `NOT NULL` | Sequential chunk order |
| `content` | `TEXT` | `NOT NULL` | Extracted chunk text body |
| `page_number` | `INTEGER` | Optional | Page number reference |
| `section` | `VARCHAR(255)` | Optional | Section header reference |
| `metadata` | `JSONB` | `DEFAULT '{}'::jsonb` | Page, document name, token metadata |
| `embedding` | `vector(768)`| HNSW Index (`vector_cosine_ops`) | 768-dimensional Gemini embedding |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | Creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | Update timestamp |

---

## 🔍 API Endpoints

### 1. Vector Store Health Check
`GET /api/vector-store/health`
```json
{
  "status": "healthy",
  "database": "connected",
  "pgvector": true,
  "embeddingDimension": 768,
  "hnswIndex": true,
  "stats": {
    "totalDocuments": 2,
    "totalChunks": 10,
    "indexedDocuments": 2,
    "totalVectors": 10
  }
}
```

### 2. Standalone Semantic Search
`POST /api/search`
```json
{
  "query": "What principle did the court establish regarding natural justice?",
  "topK": 3,
  "minSimilarity": 0.60
}
```

### 3. Grounded Legal RAG Research
`POST /api/research`
```json
{
  "prompt": "What is the limitation of liability cap?",
  "documentId": "optional-uuid-here"
}
```

### 4. Document Ingestion
`POST /api/documents/upload`
```json
{
  "name": "Custom_Non_Disclosure_Agreement.docx",
  "content": "...",
  "type": "docx",
  "category": "contract"
}
```
