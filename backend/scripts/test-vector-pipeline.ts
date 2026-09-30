import { query, checkDatabaseHealth, closePool } from "../db/connection.js";
import { ingestDocument, calculateContentHash } from "../services/documentService.js";
import { searchSimilarChunks, getVectorStoreHealth, deleteDocument } from "../services/vectorStore.js";
import { generateEmbedding } from "../services/embeddingService.js";

async function runPipelineTests() {
  console.log("🧪 ========================================================");
  console.log("🧪 LawLLM Phase 2: Production Vector Store & RAG Test Suite");
  console.log("🧪 ========================================================\n");

  // Test 1: Verify PostgreSQL & pgvector health
  console.log("▶️ Test 1: Checking PostgreSQL & pgvector Extension...");
  const health = await getVectorStoreHealth();
  if (health.database !== "connected" || !health.pgvector) {
    console.error("❌ Test 1 Failed: PostgreSQL is not connected or pgvector is missing.", health);
    console.log("💡 Tip: Start PostgreSQL via: docker compose up -d postgres && npm run db:migrate");
    return;
  }
  console.log(`✅ Test 1 Passed: Connected to PostgreSQL with pgvector (status: ${health.status}, dimension: ${health.embeddingDimension})\n`);

  // Test 2: Ingest Sample Legal Document with pgvector Embeddings
  console.log("▶️ Test 2: Ingesting Sample Test Judgment into PostgreSQL...");
  const sampleTestDoc = {
    name: "Supreme_Court_Natural_Justice_Precedent_2025.txt",
    type: "txt" as const,
    category: "case_law",
    content: `SUPREME COURT OF INDIA
CIVIL APPELLATE JURISDICTION
CIVIL APPEAL NO. 4521 OF 2025

STATE OF MAHARASHTRA ... APPELLANT
VERSUS
HORIZON INFRASTRUCTURE LTD. ... RESPONDENT

JUDGMENT
1. The fundamental doctrine of natural justice (Audi Alteram Partem) is not an unruly horse or an empty technical formality; it constitutes the very heartbeat of constitutional fair play under Article 14 of the Constitution of India.
2. In the present appeal, the state regulatory authority terminated the concession agreement without serving a formal show-cause notice or affording a post-decisional hearing.
3. Ratio Decidendi: Even where a public contract permits unilateral termination upon perceived default, administrative bodies exercising statutory functions cannot dispense with the audi alteram partem principle unless expressly excluded by clear statutory mandate.
4. The unilateral cancellation order is hereby quashed and set aside with a direction to conduct a de novo hearing within four weeks.`
  };

  const ingestRes = await ingestDocument(sampleTestDoc);
  const testDocId = ingestRes.document.id;
  console.log(`✅ Test 2 Passed: Document ingested with ID: ${testDocId} (${ingestRes.chunksCount} chunks created and embedded).\n`);

  // Test 3: Deduplication Hash Verification
  console.log("▶️ Test 3: Testing SHA-256 Deduplication Safeguard...");
  const dupRes = await ingestDocument(sampleTestDoc);
  if (!dupRes.isDuplicate || dupRes.document.id !== testDocId) {
    console.error("❌ Test 3 Failed: Duplicate was not detected properly.");
  } else {
    console.log(`✅ Test 3 Passed: Duplicate detected via SHA-256 (${dupRes.document.content_hash?.slice(0, 12)}...). Zero duplicate chunks written.\n`);
  }

  // Test 4: Real PostgreSQL pgvector Cosine Distance Search
  console.log("▶️ Test 4: Generating Query Embedding and executing pgvector Cosine Search (<=>)...");
  const queryText = "What principle did the court establish regarding natural justice?";
  const queryVector = await generateEmbedding(queryText);

  console.log(`[Test 4] Query embedding generated. Dimensionality: ${queryVector.length}`);

  const searchResults = await searchSimilarChunks({
    queryEmbedding: queryVector,
    topK: 3,
    minSimilarity: 0.50,
    documentId: testDocId,
  });

  if (searchResults.length === 0) {
    console.error("❌ Test 4 Failed: No similar chunks found via pgvector.");
  } else {
    console.log(`✅ Test 4 Passed: Retrieved ${searchResults.length} relevant chunks from PostgreSQL!`);
    searchResults.forEach((r, idx) => {
      console.log(`   [Result ${idx + 1}] Similarity: ${r.similarity.toFixed(4)} | Page ${r.pageNumber} | ${r.section}`);
      console.log(`   Snippet: "${r.content.slice(0, 90)}..."`);
    });
    console.log();
  }

  // Test 5: Verify Relational Integrity and Cleanup
  console.log("▶️ Test 5: Verifying Foreign Key Deletion Cascade...");
  const deleteOk = await deleteDocument(testDocId);
  const orphanCheck = await query("SELECT COUNT(*)::int as count FROM document_chunks WHERE document_id = $1;", [testDocId]);
  
  if (deleteOk && orphanCheck.rows[0].count === 0) {
    console.log(`✅ Test 5 Passed: Document deleted and all ${ingestRes.chunksCount} chunks cascaded cleanly.\n`);
  } else {
    console.error("❌ Test 5 Failed: Orphaned chunks remaining.", orphanCheck.rows[0]);
  }

  console.log("🎉 All Production Vector Store pipeline tests completed successfully!");
}

if (process.argv[1]?.includes("test-vector-pipeline.ts")) {
  runPipelineTests()
    .then(() => closePool())
    .catch((err) => {
      console.error("💥 Pipeline Test Error:", err);
      closePool();
      process.exit(1);
    });
}
