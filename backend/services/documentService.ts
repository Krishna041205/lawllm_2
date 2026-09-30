import crypto from "crypto";
import {
  addDocument,
  getDocument,
  getDocuments,
  documentExists,
  deleteDocument,
  updateDocumentStatus,
  addChunks,
  deleteDocumentChunks,
  DocumentRecord,
} from "./vectorStore.js";
import { generateEmbeddings } from "./embeddingService.js";
import { PdfExtractor } from "./pdf/pdfExtractor.js";
import { sanitizePostgresString, sanitizePostgresObject } from "../utils/postgresSanitizer.js";

export interface IngestDocumentParams {
  id?: string;
  name: string;
  content: string;
  type?: "pdf" | "docx" | "txt";
  category?: string;
  source?: string;
  metadata?: Record<string, any>;
}

export interface ChunkInfo {
  index: number;
  page: number;
  section: string;
  text: string;
}

/**
 * Calculate SHA-256 hash for document deduplication
 */
export function calculateContentHash(content: string): string {
  return crypto.createHash("sha256").update(content.trim()).digest("hex");
}

/**
 * Text chunking algorithm optimized for legal agreements and appellate rulings
 */
export function chunkLegalDocument(text: string, title: string): ChunkInfo[] {
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  const chunks: ChunkInfo[] = [];

  let currentPage = 1;
  let currentChunkText = "";
  let chunkCounter = 1;

  for (let idx = 0; idx < paragraphs.length; idx++) {
    const p = paragraphs[idx].trim();
    currentChunkText += p + "\n\n";

    // Extract section header if paragraph begins with Section, Article, Clause, Order, or Roman numeral
    const sectionMatch = p.match(/^(section|article|clause|issue|point|part|\d+\.|\([a-z]\))\s+[^:\n]+/i);
    const sectionName = sectionMatch ? sectionMatch[0].trim() : `Section ${chunkCounter}`;

    if (currentChunkText.length > 850 || idx === paragraphs.length - 1) {
      chunks.push({
        index: chunkCounter,
        page: currentPage,
        section: sectionName,
        text: currentChunkText.trim(),
      });

      chunkCounter++;
      currentChunkText = "";

      // Approximately 2 chunks per page for realistic page indexing
      if (chunkCounter % 2 === 1) {
        currentPage++;
      }
    }
  }

  // Fallback for single short text block
  if (chunks.length === 0 && text.trim().length > 0) {
    chunks.push({
      index: 1,
      page: 1,
      section: "Full Text",
      text: text.trim(),
    });
  }

  return chunks;
}

/**
 * Complete Ingestion Pipeline with Deduplication, Persistence, Chunking, and Real Vector Embeddings
 */
export async function ingestDocument(params: IngestDocumentParams): Promise<{
  document: DocumentRecord;
  isDuplicate: boolean;
  chunksCount: number;
}> {
  const { name, content, type = "txt", category = "contract", source = "user_upload", metadata = {} } = params;

  if (!content || !name) {
    throw new Error("Missing document name or content.");
  }

  // 1. If content is a base64 Data URL or raw binary PDF, extract legal text with page awareness
  let textContent = content;
  if (content.startsWith("data:") && content.includes(";base64,")) {
    const base64Data = content.split(";base64,")[1];
    const buffer = Buffer.from(base64Data, "base64");
    if (buffer.subarray(0, 5).toString("latin1").startsWith("%PDF")) {
      try {
        const extractor = new PdfExtractor();
        const extracted = await extractor.extract(buffer);
        const extractedText = extracted.pages.map((p) => p.text).filter(Boolean).join("\n\n");
        if (extractedText.trim().length > 0) {
          textContent = extractedText;
        }
      } catch (pdfErr: any) {
        console.warn(`[Ingestion] PDF extractor fallback for "${name}":`, pdfErr?.message || pdfErr);
      }
    }
  } else if (content.startsWith("%PDF-")) {
    try {
      const buffer = Buffer.from(content, "binary");
      const extractor = new PdfExtractor();
      const extracted = await extractor.extract(buffer);
      const extractedText = extracted.pages.map((p) => p.text).filter(Boolean).join("\n\n");
      if (extractedText.trim().length > 0) {
        textContent = extractedText;
      }
    } catch (pdfErr: any) {
      console.warn(`[Ingestion] Raw PDF extraction error for "${name}":`, pdfErr?.message || pdfErr);
    }
  }

  // 2. Sanitize text for PostgreSQL (strip null bytes \0, literal \u0000, unprintable control chars)
  textContent = sanitizePostgresString(textContent);
  if (!textContent.trim()) {
    textContent = `Document record for ${name} [Ingested on ${new Date().toISOString().split("T")[0]}]`;
  }

  // 3. Calculate SHA-256 hash of sanitized content
  const contentHash = calculateContentHash(textContent);

  // 4. Deduplication check: if identical document exists, return it immediately without re-embedding
  const existingDoc = await documentExists(contentHash);
  if (existingDoc && existingDoc.processing_status === "indexed") {
    console.log(`ℹ️ [Ingestion] Duplicate detected (${contentHash.slice(0, 10)}...). Returning existing document: ${existingDoc.id}`);
    return {
      document: existingDoc,
      isDuplicate: true,
      chunksCount: existingDoc.chunk_count,
    };
  }

  // 5. Persist initial document metadata in PostgreSQL with 'processing' status
  const document = await addDocument({
    id: params.id,
    filename: sanitizePostgresString(name),
    title: sanitizePostgresString(name.replace(/\.[^/.]+$/, "").replace(/_/g, " ")),
    documentType: category,
    source,
    contentHash,
    metadata: {
      ...sanitizePostgresObject(metadata),
      size: `${Math.round(textContent.length / 1024) || 1} KB`,
      originalType: type,
      uploadedAt: new Date().toISOString().split("T")[0],
      rawContent: textContent,
    },
    processingStatus: "processing",
    chunkCount: 0,
    embeddingStatus: "pending",
  });

  try {
    // 6. Chunk text into pages/sections
    const chunks = chunkLegalDocument(textContent, name);
    console.log(`[Ingestion] Created ${chunks.length} chunks for "${name}". Generating 768-d embeddings...`);

    // 5. Generate embeddings for all chunks in batches
    const textsToEmbed = chunks.map((c) => c.text);
    const embeddings = await generateEmbeddings(textsToEmbed);

    // 6. Transactional insert of chunks + pgvector embeddings
    const chunksToInsert = chunks.map((chunk, index) => ({
      documentId: document.id,
      chunkIndex: chunk.index,
      content: chunk.text,
      pageNumber: chunk.page,
      section: chunk.section,
      metadata: {
        documentName: name,
        category,
        page: chunk.page,
      },
      embedding: embeddings[index],
    }));

    await addChunks(chunksToInsert);

    // 7. Update document status to 'indexed'
    await updateDocumentStatus(document.id, "indexed", "indexed", chunks.length);
    console.log(`✅ [Ingestion] Document "${name}" successfully indexed into pgvector with ${chunks.length} chunks.`);

    const updatedDoc = await getDocument(document.id);
    return {
      document: updatedDoc || document,
      isDuplicate: false,
      chunksCount: chunks.length,
    };
  } catch (err: any) {
    console.error(`❌ [Ingestion] Failed to index document "${name}":`, err);
    await updateDocumentStatus(document.id, "failed", "failed");
    throw err;
  }
}

/**
 * Re-index an existing document (e.g. after model upgrade or chunking changes)
 */
export async function reindexDocument(documentId: string): Promise<DocumentRecord> {
  const doc = await getDocument(documentId);
  if (!doc) {
    throw new Error(`Document not found: ${documentId}`);
  }

  const rawContent = doc.metadata?.rawContent;
  if (!rawContent) {
    throw new Error(`Cannot re-index document without stored rawContent.`);
  }

  console.log(`🔄 [Reindex] Starting re-indexing for document: ${doc.title} (${doc.id})...`);

  // 1. Delete old chunks
  await deleteDocumentChunks(doc.id);
  await updateDocumentStatus(doc.id, "processing", "pending");

  // 2. Re-chunk content
  const chunks = chunkLegalDocument(rawContent, doc.filename);

  // 3. Generate fresh embeddings
  const embeddings = await generateEmbeddings(chunks.map((c) => c.text));

  // 4. Store fresh chunks + vectors
  const chunksToInsert = chunks.map((chunk, index) => ({
    documentId: doc.id,
    chunkIndex: chunk.index,
    content: chunk.text,
    pageNumber: chunk.page,
    section: chunk.section,
    metadata: {
      documentName: doc.filename,
      category: doc.document_type,
      page: chunk.page,
    },
    embedding: embeddings[index],
  }));

  await addChunks(chunksToInsert);

  // 5. Update status
  await updateDocumentStatus(doc.id, "indexed", "indexed", chunks.length);
  console.log(`✅ [Reindex] Successfully re-indexed document: ${doc.title}`);

  const updated = await getDocument(doc.id);
  return updated!;
}
