import { getDbPool, closePool } from "../db/connection.js";
import { getDocuments, addDocument, getChunksByDocument, updateDocumentStatus } from "../services/vectorStore.js";
import { ingestDocument } from "../services/documentService.js";

// Core initial sample documents from LawLLM platform
const SEED_DOCUMENTS = [
  {
    id: "doc-contract-msa-01",
    name: "ApexCloud_Enterprise_MSA_2025.docx",
    type: "docx" as const,
    category: "contract",
    content: `MASTER SERVICES AGREEMENT (MSA)
This Master Services Agreement ("Agreement") is made and entered into as of January 15, 2025 ("Effective Date"), by and between ApexCloud Solutions Inc., a Delaware corporation ("Provider"), and Vertex Financial Global LLC ("Customer").

1. SERVICES AND DELIVERABLES
Provider agrees to deliver enterprise multi-tenant cloud hosting, API integrations, and continuous security infrastructure monitoring as detailed in Statements of Work ("SOW").

2. PAYMENT AND FEES
Customer agrees to pay all invoiced amounts within fifteen (15) days of invoice receipt. Overdue amounts accrue interest at 2.5% per month or the maximum statutory rate allowed. Provider reserves the right to suspend all access to Customer data and production APIs immediately upon 3 business days of non-payment without liability.

3. INTELLECTUAL PROPERTY RIGHTS
Provider retains all right, title, and interest in and to the Platform, underlying algorithms, and custom modifications. Customer assigns to Provider all rights in any derivative works, feedback, custom integration workflows, and Customer-requested tailored feature enhancements developed under any SOW. Customer grants Provider an irrevocable, perpetual, royalty-free license to use Customer's confidential data and transaction metadata to train Provider's proprietary machine learning models.

4. INDEMNIFICATION
Customer shall defend, indemnify, and hold harmless Provider, its officers, directors, and affiliates from and against any and all claims, damages, liabilities, costs, and expenses (including attorneys' fees) arising out of or related to (a) Customer's use of the Services; (b) any alleged infringement of third-party IP rights by Customer data; or (c) Customer breach of this Agreement. Provider offers NO reciprocal indemnity for Provider's infringement of third-party intellectual property or platform data breaches.

5. LIMITATION OF LIABILITY
TO THE MAXIMUM EXTENT PERMITTED BY LAW, PROVIDER'S TOTAL AGGREGATE LIABILITY ARISING OUT OF OR RELATED TO THIS AGREEMENT, WHETHER IN CONTRACT, TORT, OR OTHERWISE, SHALL NOT EXCEED THE TOTAL AMOUNT ACTUALLY PAID BY CUSTOMER IN THE ONE (1) MONTH PRECEDING THE CLAIM. IN NO EVENT SHALL PROVIDER BE LIABLE FOR ANY CONSEQUENTIAL, INCIDENTAL, PUNITIVE, SPECIAL, OR LOST PROFIT DAMAGES. CUSTOMER'S LIABILITY UNDER THIS AGREEMENT SHALL BE COMPLETELY UNLIMITED.

6. TERM AND TERMINATION
This Agreement commences on the Effective Date and continues for an initial fixed term of three (3) years. The Agreement automatically renews for successive 2-year periods unless Customer provides written notice of non-renewal at least one hundred and twenty (120) days prior to expiration. Customer may not terminate for convenience. Provider may terminate immediately with 5 days notice for convenience or immediately upon suspected breach.

7. CONFIDENTIALITY AND NON-SOLICITATION
During the term and for a period of ten (10) years thereafter, Customer shall not solicit, hire, or engage any employee or contractor of Provider. Customer acknowledges that breach of this provision warrants liquidated damages of $250,000 per employee.

8. GOVERNING LAW AND ARBITRATION
This Agreement shall be governed by the laws of the State of Delaware without regard to conflict of law principles. Any dispute shall be resolved through binding private arbitration in Wilmington, Delaware, with each party bearing their own expenses, provided that Provider may seek immediate injunctive relief in any court of competent jurisdiction.`,
  },
  {
    id: "doc-case-apex-v-meridian",
    name: "Apex_Technologies_Corp_v_Meridian_Logistics_2024.pdf",
    type: "pdf" as const,
    category: "case_law",
    content: `UNITED STATES COURT OF APPEALS FOR THE SECOND CIRCUIT
Docket No. 23-1892-cv
APEX TECHNOLOGIES CORP., Plaintiff-Appellant,
v.
MERIDIAN LOGISTICS INC., Defendant-Appellee.

Decided: October 18, 2024
Before: LEVAL, CABRANES, and CHIN, Circuit Judges.

SUMMARY ORDER & OPINION:
1. PROCEDURAL FACTS & BACKGROUND
Plaintiff Apex Technologies Corp. brought suit against Meridian Logistics Inc. alleging misappropriation of trade secrets under the Defend Trade Secrets Act (DTSA), 18 U.S.C. § 1836, and breach of a bilateral Mutual Non-Disclosure Agreement executed in March 2022. Apex asserted that during exploratory merger talks, Meridian accessed proprietary algorithmic supply-chain routing code and subsequently incorporated key architecture into its autonomous dispatch software 'MeridianCore'.

2. DISTRICT COURT FINDINGS
The District Court for the Southern District of New York (SDNY) granted summary judgment in favor of Meridian, holding that Apex failed to identify the trade secrets with sufficient specificity under DTSA and that the NDA's definition of 'Confidential Information' excluded items disclosed during informal whiteboard sessions without written post-meeting marking within 14 days.

3. LEGAL ISSUES ON APPEAL
Issue 1: Did the district court err in applying a strict post-meeting written designation requirement where oral presentations were accompanied by proprietary source-code demonstrations?
Issue 2: Does the standard set forth in Federal Trade Secret Jurisprudence (Oakwood Labs LLC v. Thanoo, 999 F.3d 892 (3d Cir. 2021)) require line-by-line code disclosure at the pleading/summary judgment stage?

4. HOLDING AND RATIO DECIDENDI
VACATED AND REMANDED. The Second Circuit held that the district court erred by demanding exhaustive code granularity at summary judgment where circumstantial evidence demonstrated substantial architectural similarity and sudden accelerated development by Meridian.
Citing Oakwood Labs LLC v. Thanoo, 999 F.3d 892 (3d Cir. 2021) and InteliClear LLC v. ETC Global Holdings, Inc., 978 F.3d 653 (9th Cir. 2020), this Court holds that identifying trade secrets by functional technical modules combined with evidence of unauthorized access is sufficient to create a genuine triable issue of material fact.

5. PRECEDENT AUTHORITIES CITED
- Oakwood Labs LLC v. Thanoo, 999 F.3d 892 (3d Cir. 2021) [Applied: pleading standards for trade secret misappropriation]
- InteliClear LLC v. ETC Global Holdings, Inc., 978 F.3d 653 (9th Cir. 2020) [Applied: sufficiency of technical functional descriptions]
- Restatement (Third) of Unfair Competition § 39 (1995)
- Defend Trade Secrets Act of 2016, 18 U.S.C. §§ 1836-1839.`,
  }
];

export async function backfillVectors(): Promise<void> {
  console.log("🚀 [Backfill] Starting Vector Store backfill and migration...");

  try {
    // 1. Ensure seed documents exist and are fully indexed
    for (let i = 0; i < SEED_DOCUMENTS.length; i++) {
      const seed = SEED_DOCUMENTS[i];
      console.log(`[Backfill] Processing seed document ${i + 1}/${SEED_DOCUMENTS.length}: "${seed.name}"...`);

      const result = await ingestDocument({
        id: seed.id,
        name: seed.name,
        content: seed.content,
        type: seed.type,
        category: seed.category,
        source: "seed_repository",
        metadata: {
          isSample: true,
          seededAt: new Date().toISOString(),
        }
      });

      console.log(
        `[Backfill] "${seed.name}": status=${result.document.processing_status}, chunks=${result.chunksCount}, duplicate=${result.isDuplicate}`
      );
    }

    // 2. Discover any documents in the database that are pending or missing embeddings
    const allDocs = await getDocuments();
    const pendingDocs = allDocs.filter((d) => d.embedding_status !== "indexed");

    console.log(`[Backfill] Discovered ${pendingDocs.length} pending/un-embedded documents in PostgreSQL.`);

    for (let idx = 0; idx < pendingDocs.length; idx++) {
      const doc = pendingDocs[idx];
      console.log(`[Backfill] Backfilling document ${idx + 1}/${pendingDocs.length}: "${doc.title}" (${doc.id})...`);
      
      const rawContent = doc.metadata?.rawContent;
      if (rawContent) {
        await ingestDocument({
          id: doc.id,
          name: doc.filename,
          content: rawContent,
          category: doc.document_type,
          source: doc.source,
          metadata: doc.metadata,
        });
      } else {
        console.warn(`[Backfill] Document ${doc.id} has no rawContent stored in metadata. Skipping.`);
      }
    }

    console.log("🎉 [Backfill] Vector store backfill completed successfully!");
  } catch (err: any) {
    console.error("❌ [Backfill] Backfill failed:", err?.message || err);
    throw err;
  } finally {
    await closePool();
  }
}

if (process.argv[1]?.includes("backfill-vectors.ts")) {
  backfillVectors()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
