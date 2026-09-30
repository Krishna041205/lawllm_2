import { query, getDbPool } from "../db/connection.js";
import { sanitizePostgresString, sanitizePostgresObject } from "../utils/postgresSanitizer.js";

export interface DocumentRecord {
  id: string;
  filename: string;
  title: string;
  document_type: string;
  source: string;
  content_hash: string | null;
  metadata: Record<string, any>;
  processing_status: "pending" | "processing" | "indexed" | "failed";
  chunk_count: number;
  embedding_status: "pending" | "indexed" | "failed";
  created_at: string | Date;
  updated_at: string | Date;
}

export interface ChunkRecord {
  id: string;
  document_id: string;
  chunk_index: number;
  content: string;
  page_number: number | null;
  section: string | null;
  metadata: Record<string, any>;
  embedding?: number[];
  created_at: string | Date;
  updated_at: string | Date;
}

export interface VectorSearchParams {
  queryEmbedding: number[];
  topK?: number;
  minSimilarity?: number;
  documentId?: string;
  documentType?: string;
  source?: string;
  metadataFilters?: Record<string, any>;
}

export interface VectorSearchResult {
  chunkId: string;
  documentId: string;
  chunkIndex: number;
  content: string;
  pageNumber: number | null;
  section: string | null;
  filename: string;
  title: string;
  documentType: string;
  source: string;
  similarity: number;
  metadata: Record<string, any>;
}

export interface VectorStoreStats {
  totalDocuments: number;
  totalChunks: number;
  indexedDocuments: number;
  pendingDocuments: number;
  failedDocuments: number;
  documentsWithEmbeddings: number;
  totalVectors: number;
}

/**
 * Format a JavaScript number array into pgvector literal format: '[0.1,0.2,...]'
 */
function formatVector(vector: number[]): string {
  return `[${vector.join(",")}]`;
}

/**
 * Add or update document metadata
 */
export async function addDocument(doc: {
  id?: string;
  filename: string;
  title: string;
  documentType?: string;
  source?: string;
  contentHash?: string;
  metadata?: Record<string, any>;
  processingStatus?: "pending" | "processing" | "indexed" | "failed";
  chunkCount?: number;
  embeddingStatus?: "pending" | "indexed" | "failed";
}): Promise<DocumentRecord> {
  const sql = `
    INSERT INTO documents (
      id, filename, title, document_type, source, content_hash, metadata, 
      processing_status, chunk_count, embedding_status, updated_at
    ) VALUES (
      COALESCE($1, gen_random_uuid()), $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      filename = EXCLUDED.filename,
      title = EXCLUDED.title,
      document_type = EXCLUDED.document_type,
      source = EXCLUDED.source,
      content_hash = EXCLUDED.content_hash,
      metadata = EXCLUDED.metadata,
      processing_status = EXCLUDED.processing_status,
      chunk_count = EXCLUDED.chunk_count,
      embedding_status = EXCLUDED.embedding_status,
      updated_at = NOW()
    RETURNING *;
  `;

  const values = [
    doc.id || null,
    sanitizePostgresString(doc.filename),
    sanitizePostgresString(doc.title),
    doc.documentType || "contract",
    doc.source || "user_upload",
    doc.contentHash || null,
    JSON.stringify(sanitizePostgresObject(doc.metadata || {})),
    doc.processingStatus || "pending",
    doc.chunkCount || 0,
    doc.embeddingStatus || "pending",
  ];

  const res = await query<DocumentRecord>(sql, values);
  return res.rows[0];
}

/**
 * Retrieve document by ID
 */
export async function getDocument(id: string): Promise<DocumentRecord | null> {
  const res = await query<DocumentRecord>("SELECT * FROM documents WHERE id = $1 LIMIT 1;", [id]);
  return res.rows[0] || null;
}

/**
 * Check if a document already exists by SHA-256 content hash
 */
export async function documentExists(contentHash: string): Promise<DocumentRecord | null> {
  if (!contentHash) return null;
  const res = await query<DocumentRecord>(
    "SELECT * FROM documents WHERE content_hash = $1 LIMIT 1;",
    [contentHash]
  );
  return res.rows[0] || null;
}

/**
 * List all documents
 */
export async function getDocuments(filters?: {
  documentType?: string;
  source?: string;
  processingStatus?: string;
}): Promise<DocumentRecord[]> {
  const conditions: string[] = [];
  const params: any[] = [];

  if (filters?.documentType) {
    params.push(filters.documentType);
    conditions.push(`document_type = $${params.length}`);
  }
  if (filters?.source) {
    params.push(filters.source);
    conditions.push(`source = $${params.length}`);
  }
  if (filters?.processingStatus) {
    params.push(filters.processingStatus);
    conditions.push(`processing_status = $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const sql = `SELECT * FROM documents ${whereClause} ORDER BY created_at DESC;`;

  const res = await query<DocumentRecord>(sql, params);
  return res.rows;
}

/**
 * Delete a document and its cascading chunks and vectors
 */
export async function deleteDocument(id: string): Promise<boolean> {
  const res = await query("DELETE FROM documents WHERE id = $1 RETURNING id;", [id]);
  return (res.rowCount ?? 0) > 0;
}

/**
 * Update document processing and embedding status
 */
export async function updateDocumentStatus(
  id: string,
  processingStatus: "pending" | "processing" | "indexed" | "failed",
  embeddingStatus?: "pending" | "indexed" | "failed",
  chunkCount?: number
): Promise<void> {
  const updates: string[] = ["processing_status = $2", "updated_at = NOW()"];
  const params: any[] = [id, processingStatus];

  if (embeddingStatus !== undefined) {
    params.push(embeddingStatus);
    updates.push(`embedding_status = $${params.length}`);
  }
  if (chunkCount !== undefined) {
    params.push(chunkCount);
    updates.push(`chunk_count = $${params.length}`);
  }

  const sql = `UPDATE documents SET ${updates.join(", ")} WHERE id = $1;`;
  await query(sql, params);
}

/**
 * Insert or replace chunks with their pgvector embeddings in batches
 */
export async function addChunks(
  chunks: Array<{
    documentId: string;
    chunkIndex: number;
    content: string;
    pageNumber?: number | null;
    section?: string | null;
    metadata?: Record<string, any>;
    embedding?: number[];
  }>
): Promise<void> {
  if (chunks.length === 0) return;

  const pool = getDbPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    for (const chunk of chunks) {
      const vectorLiteral = chunk.embedding ? formatVector(chunk.embedding) : null;
      
      const sql = `
        INSERT INTO document_chunks (
          document_id, chunk_index, content, page_number, section, metadata, embedding, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7::vector, NOW()
        )
        ON CONFLICT (document_id, chunk_index) DO UPDATE SET
          content = EXCLUDED.content,
          page_number = EXCLUDED.page_number,
          section = EXCLUDED.section,
          metadata = EXCLUDED.metadata,
          embedding = EXCLUDED.embedding,
          updated_at = NOW();
      `;

      await client.query(sql, [
        chunk.documentId,
        chunk.chunkIndex,
        sanitizePostgresString(chunk.content),
        chunk.pageNumber || null,
        chunk.section ? sanitizePostgresString(chunk.section) : null,
        JSON.stringify(sanitizePostgresObject(chunk.metadata || {})),
        vectorLiteral,
      ]);
    }

    await client.query("COMMIT");
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // Ignore rollback failure if connection was terminated
    }
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Retrieve chunks for a specific document
 */
export async function getChunksByDocument(documentId: string): Promise<ChunkRecord[]> {
  const sql = `
    SELECT id, document_id, chunk_index, content, page_number, section, metadata, created_at, updated_at
    FROM document_chunks 
    WHERE document_id = $1 
    ORDER BY chunk_index ASC;
  `;
  const res = await query<ChunkRecord>(sql, [documentId]);
  return res.rows;
}

/**
 * Delete chunks for a document before re-indexing
 */
export async function deleteDocumentChunks(documentId: string): Promise<void> {
  await query("DELETE FROM document_chunks WHERE document_id = $1;", [documentId]);
}

/**
 * Perform real pgvector Cosine Similarity Search at the database layer
 * (Does NOT load all vectors into Node.js memory)
 */
export async function searchSimilarChunks(params: VectorSearchParams): Promise<VectorSearchResult[]> {
  const {
    queryEmbedding,
    topK = parseInt(process.env.VECTOR_TOP_K || "8", 10),
    minSimilarity = parseFloat(process.env.VECTOR_MIN_SIMILARITY || "0.60"),
    documentId,
    documentType,
    source,
  } = params;

  if (!queryEmbedding || queryEmbedding.length === 0) {
    throw new Error("Cannot execute vector search without query embedding.");
  }

  const vectorLiteral = formatVector(queryEmbedding);

  // Dynamic filter construction executed inside PostgreSQL
  const conditions: string[] = ["dc.embedding IS NOT NULL"];
  const sqlParams: any[] = [vectorLiteral, minSimilarity, topK];

  if (documentId) {
    sqlParams.push(documentId);
    conditions.push(`dc.document_id = $${sqlParams.length}`);
  }
  if (documentType) {
    sqlParams.push(documentType);
    conditions.push(`d.document_type = $${sqlParams.length}`);
  }
  if (source) {
    sqlParams.push(source);
    conditions.push(`d.source = $${sqlParams.length}`);
  }

  const whereClause = conditions.join(" AND ");

  // 1 - (dc.embedding <=> $1::vector) calculates cosine similarity between 0 and 1
  const sql = `
    SELECT
      dc.id AS "chunkId",
      dc.document_id AS "documentId",
      dc.chunk_index AS "chunkIndex",
      dc.content,
      dc.page_number AS "pageNumber",
      dc.section,
      dc.metadata,
      d.filename,
      d.title,
      d.document_type AS "documentType",
      d.source,
      ROUND((1 - (dc.embedding <=> $1::vector))::numeric, 4)::float AS similarity
    FROM document_chunks dc
    JOIN documents d ON dc.document_id = d.id
    WHERE ${whereClause}
      AND (1 - (dc.embedding <=> $1::vector)) >= $2
    ORDER BY dc.embedding <=> $1::vector ASC
    LIMIT $3;
  `;

  const res = await query<any>(sql, sqlParams);

  return res.rows.map((row) => ({
    chunkId: row.chunkId,
    documentId: row.documentId,
    chunkIndex: row.chunkIndex,
    content: row.content,
    pageNumber: row.pageNumber,
    section: row.section,
    filename: row.filename,
    title: row.title,
    documentType: row.documentType,
    source: row.source,
    similarity: parseFloat(row.similarity),
    metadata: row.metadata || {},
  }));
}

/**
 * Return comprehensive statistics of documents, chunks, and vector embeddings
 */
export async function getVectorStoreStats(): Promise<VectorStoreStats> {
  const docStats = await query(`
    SELECT
      COUNT(*)::int AS "totalDocuments",
      COUNT(*) FILTER (WHERE processing_status = 'indexed')::int AS "indexedDocuments",
      COUNT(*) FILTER (WHERE processing_status = 'pending' OR processing_status = 'processing')::int AS "pendingDocuments",
      COUNT(*) FILTER (WHERE processing_status = 'failed')::int AS "failedDocuments",
      COUNT(*) FILTER (WHERE embedding_status = 'indexed')::int AS "documentsWithEmbeddings"
    FROM documents;
  `);

  const chunkStats = await query(`
    SELECT
      COUNT(*)::int AS "totalChunks",
      COUNT(*) FILTER (WHERE embedding IS NOT NULL)::int AS "totalVectors"
    FROM document_chunks;
  `);

  const d = docStats.rows[0] || {};
  const c = chunkStats.rows[0] || {};

  return {
    totalDocuments: d.totalDocuments || 0,
    totalChunks: c.totalChunks || 0,
    indexedDocuments: d.indexedDocuments || 0,
    pendingDocuments: d.pendingDocuments || 0,
    failedDocuments: d.failedDocuments || 0,
    documentsWithEmbeddings: d.documentsWithEmbeddings || 0,
    totalVectors: c.totalVectors || 0,
  };
}

/**
 * Full health verification of pgvector, tables, embedding column, and HNSW index
 */
export async function getVectorStoreHealth(): Promise<{
  status: "healthy" | "degraded" | "unconfigured";
  database: "connected" | "disconnected" | "unconfigured";
  pgvector: boolean;
  embeddingDimension: number;
  hnswIndex: boolean;
  stats?: VectorStoreStats;
  error?: string;
}> {
  try {
    const extCheck = await query("SELECT extname FROM pg_extension WHERE extname = 'vector';");
    const hasVector = extCheck.rows.length > 0;

    const colCheck = await query(`
      SELECT column_name, data_type, udt_name 
      FROM information_schema.columns 
      WHERE table_name = 'document_chunks' AND column_name = 'embedding';
    `);
    const hasEmbeddingCol = colCheck.rows.length > 0;

    const idxCheck = await query(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'document_chunks' AND indexname = 'idx_document_chunks_embedding_hnsw';
    `);
    const hasHnsw = idxCheck.rows.length > 0;

    const stats = await getVectorStoreStats();

    return {
      status: hasVector && hasEmbeddingCol ? "healthy" : "degraded",
      database: "connected",
      pgvector: hasVector,
      embeddingDimension: 768,
      hnswIndex: hasHnsw,
      stats,
    };
  } catch (err: any) {
    return {
      status: "degraded",
      database: "disconnected",
      pgvector: false,
      embeddingDimension: 768,
      hnswIndex: false,
      error: err?.message || String(err),
    };
  }
}
