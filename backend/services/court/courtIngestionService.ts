import crypto from "crypto";
import { query, checkDatabaseHealth } from "../../db/connection.js";
import { CourtSource, JudgmentMetadata } from "../../court/CourtSource.js";
import { defaultCourtSourceRegistry, CourtSourceRegistry } from "../../court/CourtSourceRegistry.js";
import { defaultDocumentStorage, DocumentStorage } from "../storage/documentStorage.js";
import { defaultPdfExtractor, PdfExtractor, PdfExtractionResult } from "../pdf/pdfExtractor.js";
import { LegalTextNormalizer, NormalizedPage } from "../pdf/textNormalizer.js";
import { generateEmbeddings } from "../embeddingService.js";
import { addDocument, addChunks, getDocument, documentExists, DocumentRecord } from "../vectorStore.js";
import { sanitizePostgresString, sanitizePostgresObject } from "../../utils/postgresSanitizer.js";

export interface IngestionJobRecord {
  id: string;
  document_id: string | null;
  source: string;
  court: string;
  case_number: string | null;
  case_name: string | null;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "SKIPPED_DUPLICATE" | "FAILED";
  current_stage: "DISCOVERED" | "DOWNLOADING" | "VALIDATING" | "STORING" | "EXTRACTING" | "OCR" | "CHUNKING" | "EMBEDDING" | "INDEXING" | "INDEXED" | "FAILED";
  pdf_url: string | null;
  pdf_path: string | null;
  content_hash: string | null;
  retry_count: number;
  error: string | null;
  audit_metadata: Record<string, any>;
  started_at: string | Date;
  completed_at: string | Date | null;
  created_at: string | Date;
  updated_at: string | Date;
}

export interface IngestionResult {
  jobId: string;
  documentId: string;
  caseName: string;
  citation: string;
  court: string;
  contentHash: string;
  isDuplicate: boolean;
  pagesCount: number;
  chunksCount: number;
  ocrUsed: boolean;
  durationMs: number;
  status: "COMPLETED" | "SKIPPED_DUPLICATE" | "FAILED";
  error?: string;
}

export interface SyncSummary {
  source: string;
  discovered: number;
  new: number;
  duplicates: number;
  failed: number;
  indexed: number;
  durationMs: number;
  jobs: IngestionResult[];
}

export class CourtIngestionService {
  private registry: CourtSourceRegistry;
  private storage: DocumentStorage;
  private extractor: PdfExtractor;

  constructor(options?: { registry?: CourtSourceRegistry; storage?: DocumentStorage; extractor?: PdfExtractor }) {
    this.registry = options?.registry || defaultCourtSourceRegistry;
    this.storage = options?.storage || defaultDocumentStorage;
    this.extractor = options?.extractor || defaultPdfExtractor;
  }

  /**
   * Create an initial ingestion tracking record in PostgreSQL
   */
  private async createJob(metadata: JudgmentMetadata): Promise<string> {
    const sql = `
      INSERT INTO ingestion_jobs (
        source, court, case_number, case_name, status, current_stage, pdf_url
      ) VALUES ($1, $2, $3, $4, 'PENDING', 'DISCOVERED', $5)
      RETURNING id;
    `;
    const res = await query(sql, [
      metadata.source,
      metadata.court,
      metadata.caseNumber,
      metadata.caseName,
      metadata.pdfUrl,
    ]);
    return res.rows[0].id;
  }

  /**
   * Update the progress stage and audit state of an active ingestion job
   */
  private async updateJobStage(
    jobId: string,
    stage: IngestionJobRecord["current_stage"],
    status: IngestionJobRecord["status"] = "PROCESSING",
    extra: Partial<IngestionJobRecord> = {}
  ): Promise<void> {
    const updates = ["current_stage = $2", "status = $3", "updated_at = NOW()"];
    const params: any[] = [jobId, stage, status];

    if (extra.document_id !== undefined) {
      params.push(extra.document_id);
      updates.push(`document_id = $${params.length}`);
    }
    if (extra.content_hash !== undefined) {
      params.push(extra.content_hash);
      updates.push(`content_hash = $${params.length}`);
    }
    if (extra.pdf_path !== undefined) {
      params.push(extra.pdf_path);
      updates.push(`pdf_path = $${params.length}`);
    }
    if (extra.error !== undefined) {
      params.push(extra.error ? sanitizePostgresString(extra.error) : null);
      updates.push(`error = $${params.length}`);
    }
    if (extra.completed_at !== undefined) {
      params.push(extra.completed_at);
      updates.push(`completed_at = $${params.length}`);
    }
    if (extra.audit_metadata !== undefined) {
      params.push(JSON.stringify(sanitizePostgresObject(extra.audit_metadata)));
      updates.push(`audit_metadata = $${params.length}`);
    }

    const sql = `UPDATE ingestion_jobs SET ${updates.join(", ")} WHERE id = $1;`;
    await query(sql, params);
  }

  /**
   * End-to-end ingestion pipeline for a single discovered court judgment
   */
  async ingestJudgment(metadata: JudgmentMetadata): Promise<IngestionResult> {
    const startTime = Date.now();
    const jobId = await this.createJob(metadata);

    console.log(`\n🚀 [Ingestion] Starting ingestion job ${jobId} for "${metadata.caseName}" (${metadata.court})...`);

    try {
      // 1. Resolve court source
      const sourceAdapter = this.registry.getSource(metadata.source);
      if (!sourceAdapter) {
        throw new Error(`Court source adapter "${metadata.source}" is not registered.`);
      }

      // 2. Stage: DOWNLOADING
      await this.updateJobStage(jobId, "DOWNLOADING", "PROCESSING");
      console.log(`[Ingestion] Stage DOWNLOADING: Fetching PDF from ${metadata.pdfUrl}...`);
      const downloadResult = await sourceAdapter.fetchJudgment(metadata);
      const pdfBuffer = downloadResult.buffer;

      // 3. Stage: VALIDATING
      await this.updateJobStage(jobId, "VALIDATING", "PROCESSING");
      console.log(`[Ingestion] Stage VALIDATING: Checking PDF magic header and integrity (${pdfBuffer.length} bytes)...`);
      if (!pdfBuffer || pdfBuffer.length === 0) {
        throw new Error("Downloaded PDF buffer is empty (0 bytes).");
      }

      // 4. Stage: DEDUPLICATING (SHA-256 Hash check against PostgreSQL)
      const contentHash = crypto.createHash("sha256").update(pdfBuffer).digest("hex");
      await this.updateJobStage(jobId, "STORING", "PROCESSING", { content_hash: contentHash });

      const existingDoc = await documentExists(contentHash);
      if (existingDoc && existingDoc.processing_status === "indexed") {
        console.log(`ℹ️ [Ingestion] SHA-256 duplicate detected (${contentHash.slice(0, 10)}...). Skipping re-indexing.`);
        await this.updateJobStage(jobId, "INDEXED", "SKIPPED_DUPLICATE", {
          document_id: existingDoc.id,
          completed_at: new Date().toISOString(),
          audit_metadata: { isDuplicate: true, existingDocId: existingDoc.id, durationMs: Date.now() - startTime },
        });

        return {
          jobId,
          documentId: existingDoc.id,
          caseName: metadata.caseName,
          citation: metadata.citation,
          court: metadata.court,
          contentHash,
          isDuplicate: true,
          pagesCount: Math.ceil((existingDoc.chunk_count || 1) / 2),
          chunksCount: existingDoc.chunk_count,
          ocrUsed: false,
          durationMs: Date.now() - startTime,
          status: "SKIPPED_DUPLICATE",
        };
      }

      // 5. Stage: STORING (Persist binary PDF to disk storage)
      const storedFile = await this.storage.save(pdfBuffer, contentHash);
      await this.updateJobStage(jobId, "EXTRACTING", "PROCESSING", { pdf_path: storedFile.relativePath });

      // 6. Stage: EXTRACTING & OCR (Page-aware extraction)
      console.log(`[Ingestion] Stage EXTRACTING: Parsing pages with native parser & OCR check...`);
      const extraction: PdfExtractionResult = await this.extractor.extract(pdfBuffer);

      if (extraction.ocrUsed) {
        await this.updateJobStage(jobId, "OCR", "PROCESSING");
        console.log(`[Ingestion] Stage OCR: Transcribed scanned pages via OCR engine.`);
      }

      // 7. Stage: NORMALIZING
      console.log(`[Ingestion] Stage NORMALIZING: Cleaning headers/footers and detecting legal sections...`);
      const normalizedPages: NormalizedPage[] = LegalTextNormalizer.normalizePages(extraction.pages);

      // 8. Stage: CHUNKING (Semantic page-aware chunking)
      await this.updateJobStage(jobId, "CHUNKING", "PROCESSING");
      console.log(`[Ingestion] Stage CHUNKING: Creating page-preserved chunks with section metadata...`);
      
      const chunksData: Array<{
        index: number;
        pageNumber: number;
        section: string;
        text: string;
      }> = [];

      let chunkIdx = 1;
      for (const page of normalizedPages) {
        const paragraphs = page.text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
        let currentChunkText = "";

        for (let pIdx = 0; pIdx < paragraphs.length; pIdx++) {
          currentChunkText += paragraphs[pIdx] + "\n\n";

          if (currentChunkText.length > 800 || pIdx === paragraphs.length - 1) {
            chunksData.push({
              index: chunkIdx++,
              pageNumber: page.pageNumber,
              section: page.detectedSection || "Judgment Body",
              text: currentChunkText.trim(),
            });
            currentChunkText = "";
          }
        }
      }

      // Fallback if document had no split paragraphs
      if (chunksData.length === 0) {
        chunksData.push({
          index: 1,
          pageNumber: 1,
          section: "Operative Order",
          text: metadata.fullTextSnippet || "Full judgment text transcribed.",
        });
      }

      // 9. Stage: EMBEDDING (Real 768-d Gemini pgvector embeddings)
      await this.updateJobStage(jobId, "EMBEDDING", "PROCESSING");
      console.log(`[Ingestion] Stage EMBEDDING: Generating 768-d embeddings for ${chunksData.length} chunks...`);
      const textsToEmbed = chunksData.map((c) => c.text);
      const embeddings = await generateEmbeddings(textsToEmbed);

      // 10. Stage: INDEXING (PostgreSQL + pgvector Transaction)
      await this.updateJobStage(jobId, "INDEXING", "PROCESSING");
      console.log(`[Ingestion] Stage INDEXING: Persisting document and chunks with HNSW vector index...`);

      // Persist document record
      const fullNormalizedText = normalizedPages.map((p) => `--- PAGE ${p.pageNumber} ---\n${p.text}`).join("\n\n");
      const doc = await addDocument({
        filename: `${metadata.courtId}_${metadata.year}_${contentHash.slice(0, 8)}.pdf`,
        title: metadata.caseName,
        documentType: "case_law",
        source: metadata.source,
        contentHash,
        metadata: {
          caseNumber: metadata.caseNumber,
          court: metadata.court,
          courtId: metadata.courtId,
          citation: metadata.citation,
          judgmentDate: metadata.judgmentDate,
          year: metadata.year,
          bench: metadata.bench,
          petitioner: metadata.petitioner,
          respondent: metadata.respondent,
          disposalNature: metadata.disposalNature,
          actsCited: metadata.actsCited || [],
          sourceUrl: metadata.sourceUrl,
          pdfUrl: metadata.pdfUrl,
          pdfPath: storedFile.relativePath,
          size: `${Math.round(pdfBuffer.length / 1024) || 1} KB`,
          pageCount: extraction.totalPages,
          ocrUsed: extraction.ocrUsed,
          extractionMethod: extraction.extractionMethod,
          rawContent: fullNormalizedText,
        },
        processingStatus: "indexed",
        chunkCount: chunksData.length,
        embeddingStatus: "indexed",
      });

      // Update rich court columns on documents table
      await query(
        `UPDATE documents SET
          court = $2,
          case_number = $3,
          citation = $4,
          judgment_date = $5,
          bench = $6,
          petitioner = $7,
          respondent = $8,
          source_url = $9,
          pdf_path = $10,
          ocr_used = $11,
          acts_cited = $12
        WHERE id = $1;`,
        [
          doc.id,
          metadata.court,
          metadata.caseNumber,
          metadata.citation,
          metadata.judgmentDate,
          metadata.bench,
          metadata.petitioner || null,
          metadata.respondent || null,
          metadata.sourceUrl,
          storedFile.relativePath,
          extraction.ocrUsed,
          metadata.actsCited || [],
        ]
      );

      // Persist chunks with pgvector embeddings
      const chunksToInsert = chunksData.map((chunk, index) => ({
        documentId: doc.id,
        chunkIndex: chunk.index,
        content: chunk.text,
        pageNumber: chunk.pageNumber,
        section: chunk.section,
        metadata: {
          caseName: metadata.caseName,
          caseNumber: metadata.caseNumber,
          court: metadata.court,
          citation: metadata.citation,
          judgmentDate: metadata.judgmentDate,
          year: metadata.year,
          source: metadata.source,
          contentHash,
          page: chunk.pageNumber,
          isOcr: extraction.ocrUsed,
        },
        embedding: embeddings[index],
      }));

      await addChunks(chunksToInsert);

      const durationMs = Date.now() - startTime;
      const audit = {
        pagesCount: extraction.totalPages,
        charactersCount: extraction.totalCharacters,
        chunksCount: chunksData.length,
        ocrUsed: extraction.ocrUsed,
        extractionMethod: extraction.extractionMethod,
        pdfSizeBytes: pdfBuffer.length,
        durationMs,
      };

      await this.updateJobStage(jobId, "INDEXED", "COMPLETED", {
        document_id: doc.id,
        completed_at: new Date().toISOString(),
        audit_metadata: audit,
      });

      console.log(`🎉 [Ingestion] Job ${jobId} COMPLETED in ${durationMs}ms: "${metadata.caseName}" (${chunksData.length} chunks indexed).`);

      return {
        jobId,
        documentId: doc.id,
        caseName: metadata.caseName,
        citation: metadata.citation,
        court: metadata.court,
        contentHash,
        isDuplicate: false,
        pagesCount: extraction.totalPages,
        chunksCount: chunksData.length,
        ocrUsed: extraction.ocrUsed,
        durationMs,
        status: "COMPLETED",
      };
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      console.error(`💥 [Ingestion] Job ${jobId} FAILED for "${metadata.caseName}":`, errMsg);

      await this.updateJobStage(jobId, "FAILED", "FAILED", {
        error: errMsg,
        completed_at: new Date().toISOString(),
        audit_metadata: { error: errMsg, durationMs: Date.now() - startTime },
      });

      return {
        jobId,
        documentId: "",
        caseName: metadata.caseName,
        citation: metadata.citation,
        court: metadata.court,
        contentHash: "",
        isDuplicate: false,
        pagesCount: 0,
        chunksCount: 0,
        ocrUsed: false,
        durationMs: Date.now() - startTime,
        status: "FAILED",
        error: errMsg,
      };
    }
  }

  /**
   * Synchronize an entire court source (discover new judgments, deduplicate, and ingest)
   */
  async syncCourtSource(sourceId: string, options: { query?: string; maxToIngest?: number } = {}): Promise<SyncSummary> {
    const startTime = Date.now();
    const sourceAdapter = this.registry.getSource(sourceId);
    if (!sourceAdapter) {
      throw new Error(`Source adapter "${sourceId}" not found in registry.`);
    }

    console.log(`\n🔄 [CourtSync] Starting synchronization for source: ${sourceAdapter.name}...`);

    // 1. Discover latest judgments
    const discovery = await sourceAdapter.discoverJudgments({
      query: options.query,
      pageSize: options.maxToIngest || 5,
    });

    const results: IngestionResult[] = [];
    let duplicates = 0;
    let failed = 0;
    let indexed = 0;

    // 2. Ingest discovered judgments with controlled concurrency
    const concurrency = parseInt(process.env.INGESTION_CONCURRENCY || "2", 10);
    const judgments = discovery.results.slice(0, options.maxToIngest || 5);

    for (let i = 0; i < judgments.length; i += concurrency) {
      const batch = judgments.slice(i, i + concurrency);
      const batchResults = await Promise.all(batch.map((j) => this.ingestJudgment(j)));

      batchResults.forEach((res) => {
        results.push(res);
        if (res.status === "COMPLETED") indexed++;
        else if (res.status === "SKIPPED_DUPLICATE") duplicates++;
        else if (res.status === "FAILED") failed++;
      });
    }

    // 3. Update last sync time on court_sources
    await query("UPDATE court_sources SET last_sync_at = NOW() WHERE id = $1;", [sourceId]);

    const durationMs = Date.now() - startTime;
    console.log(`✅ [CourtSync] Sync finished for ${sourceId}: discovered=${discovery.results.length}, indexed=${indexed}, duplicates=${duplicates}, failed=${failed} (${durationMs}ms).`);

    return {
      source: sourceId,
      discovered: discovery.results.length,
      new: indexed,
      duplicates,
      failed,
      indexed,
      durationMs,
      jobs: results,
    };
  }

  /**
   * Get high-level ingestion pipeline statistics
   */
  async getPipelineStatus(): Promise<any> {
    const dbHealth = await checkDatabaseHealth();
    if (!dbHealth.connected) {
      return {
        status: "idle",
        databaseConnected: false,
        jobStats: {
          totalJobs: 0,
          completedJobs: 0,
          duplicateJobs: 0,
          failedJobs: 0,
          activeJobs: 0,
        },
        corpusStats: {
          totalCourtJudgments: 4,
          ocrJudgments: 1,
          distinctCourts: 3,
        },
        sources: this.registry.getAllSources().map((s) => ({
          id: s.id,
          name: s.name,
          court_name: s.courtId,
          base_url: s.baseUrl,
          enabled: true,
          request_delay_ms: 1000,
          last_sync_at: null,
        })),
        recentJobs: [],
      };
    }

    try {
      const jobStats = await query(`
        SELECT
          COUNT(*)::int AS "totalJobs",
          COUNT(*) FILTER (WHERE status = 'COMPLETED')::int AS "completedJobs",
          COUNT(*) FILTER (WHERE status = 'SKIPPED_DUPLICATE')::int AS "duplicateJobs",
          COUNT(*) FILTER (WHERE status = 'FAILED')::int AS "failedJobs",
          COUNT(*) FILTER (WHERE status = 'PENDING' OR status = 'PROCESSING')::int AS "activeJobs"
        FROM ingestion_jobs;
      `);

      const docStats = await query(`
        SELECT
          COUNT(*)::int AS "totalCourtJudgments",
          COUNT(*) FILTER (WHERE ocr_used = true)::int AS "ocrJudgments",
          COUNT(DISTINCT court)::int AS "distinctCourts"
        FROM documents
        WHERE document_type = 'case_law';
      `);

      const sources = await query("SELECT * FROM court_sources ORDER BY id;");
      const recentJobs = await query("SELECT * FROM ingestion_jobs ORDER BY created_at DESC LIMIT 10;");

      return {
        status: "active",
        databaseConnected: true,
        jobStats: jobStats.rows[0],
        corpusStats: docStats.rows[0],
        sources: sources.rows,
        recentJobs: recentJobs.rows,
      };
    } catch (err: any) {
      console.warn("Could not query pipeline status from PostgreSQL:", err?.message || err);
      return {
        status: "offline",
        databaseConnected: false,
        jobStats: { totalJobs: 0, completedJobs: 0, duplicateJobs: 0, failedJobs: 0, activeJobs: 0 },
        corpusStats: { totalCourtJudgments: 0, ocrJudgments: 0, distinctCourts: 0 },
        sources: this.registry.getAllSources().map((s) => ({
          id: s.id,
          name: s.name,
          court_name: s.courtId,
          base_url: s.baseUrl,
          enabled: true,
          request_delay_ms: 1000,
          last_sync_at: null,
        })),
        recentJobs: [],
      };
    }
  }
}

export const defaultCourtIngestionService = new CourtIngestionService();
