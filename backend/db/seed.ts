import { query } from "./connection.js";

/**
 * Seed minimal non-confidential sample legal document data for development testing
 */
export async function seedDatabase(): Promise<void> {
  console.log("🌱 [DB:SEED] Starting development database seeding...");

  // 1. Insert sample MSA contract document
  const sampleDocResult = await query(
    `INSERT INTO documents (
      title, filename, document_type, source, content_hash, metadata, processing_status
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7
    )
    ON CONFLICT DO NOTHING
    RETURNING id;`,
    [
      "Enterprise Master Services Agreement (MSA 2025)",
      "ApexCloud_Enterprise_MSA_2025.docx",
      "contract",
      "seed_sample",
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      JSON.stringify({
        parties: ["ApexCloud Solutions Inc.", "Vertex Financial Global LLC"],
        riskLevel: "High",
        governingLaw: "Delaware",
        isSample: true,
      }),
      "ready",
    ]
  );

  let docId = sampleDocResult.rows[0]?.id;

  if (!docId) {
    // If already inserted, find the existing id
    const existing = await query(
      "SELECT id FROM documents WHERE filename = $1 LIMIT 1",
      ["ApexCloud_Enterprise_MSA_2025.docx"]
    );
    docId = existing.rows[0]?.id;
  }

  if (docId) {
    // 2. Insert sample document chunks
    const chunks = [
      {
        index: 1,
        page: 1,
        section: "Section 1-2: Services & Fees",
        content: "Provider agrees to deliver enterprise multi-tenant cloud hosting. Invoiced amounts payable within 15 days.",
      },
      {
        index: 2,
        page: 2,
        section: "Section 3: IP Rights",
        content: "Provider retains platform IP. Customer grants perpetual license for AI model training on confidential transaction data.",
      },
      {
        index: 3,
        page: 3,
        section: "Section 4: Indemnification",
        content: "Customer defends and indemnifies Provider against claims. Provider offers no reciprocal indemnity for intellectual property infringement.",
      },
      {
        index: 4,
        page: 4,
        section: "Section 5: Limitation of Liability",
        content: "Provider total liability capped at 1-month paid fees. Customer liability is uncapped and unlimited.",
      },
    ];

    for (const chunk of chunks) {
      await query(
        `INSERT INTO document_chunks (
          document_id, chunk_index, content, page_number, section, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT DO NOTHING;`,
        [
          docId,
          chunk.index,
          chunk.content,
          chunk.page,
          chunk.section,
          JSON.stringify({ isSample: true }),
        ]
      );
    }

    console.log(`✅ [DB:SEED] Successfully seeded document (${docId}) and ${chunks.length} chunks.`);
  } else {
    console.log("ℹ️ [DB:SEED] Document already exists or could not be determined.");
  }
}

// Allow standalone execution
if (process.argv[1]?.includes("seed.ts")) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("❌ [DB:SEED] Seeding error:", err);
      process.exit(1);
    });
}
