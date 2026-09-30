import fs from "fs";
import path from "path";
import { createCompliantPdfBuffer } from "../../services/pdf/pdfBuilder.js";

export interface TestFixtures {
  fixtureAPath: string;
  fixtureBPath: string;
  fixtureCPath: string;
  fixtureDPath: string;
  fixtureEPath: string;
}

/**
 * Generate test fixture PDFs for testing PDF validation, text extraction, OCR, deduplication, and normalizers
 */
export async function generateTestFixtures(outputDir?: string): Promise<TestFixtures> {
  const dir = outputDir || path.resolve(process.cwd(), "backend/tests/fixtures");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Fixture A: Standard machine-readable legal appellate ruling
  const fixtureABuffer = createCompliantPdfBuffer([
    {
      pageNumber: 1,
      text: "IN THE SUPREME COURT OF INDIA\nCIVIL APPELLATE JURISDICTION\nCIVIL APPEAL NO. 4521 OF 2025\n\nState of Maharashtra v. Horizon Infrastructure Ltd.\n\nCitation: 2025 INSC 88\nDecided on: January 28, 2025\n\nJUDGMENT",
    },
    {
      pageNumber: 2,
      text: "1. PROCEDURAL FACTS\nThe appellant state terminated the public concession agreement without notice.\n\n2. RATIO DECIDENDI\nNatural justice (audi alteram partem) under Article 14 applies to state concession cancellations.\n\n3. OPERATIVE ORDER\nAppeal dismissed with directions.",
    },
  ]);
  const fixtureAPath = path.join(dir, "fixture_a_machine_readable.pdf");
  fs.writeFileSync(fixtureAPath, fixtureABuffer);

  // Fixture B: Scanned/image-only PDF requiring OCR (Minimal character count, triggering OCR fallback)
  const fixtureBBuffer = createCompliantPdfBuffer([
    {
      pageNumber: 1,
      text: "   [SEAL: SUPREME COURT OF INDIA]   \n  \n",
    },
  ]);
  const fixtureBPath = path.join(dir, "fixture_b_scanned_ocr.pdf");
  fs.writeFileSync(fixtureBPath, fixtureBBuffer);

  // Fixture C: Corrupted PDF (missing magic header and invalid structure)
  const fixtureCBuffer = Buffer.from("NOT_A_VALID_PDF_HEADER_DATA_CORRUPTED_1234567890", "utf-8");
  const fixtureCPath = path.join(dir, "fixture_c_corrupted.pdf");
  fs.writeFileSync(fixtureCPath, fixtureCBuffer);

  // Fixture D: Duplicate of Fixture A for testing SHA-256 deduplication
  const fixtureDPath = path.join(dir, "fixture_d_duplicate.pdf");
  fs.writeFileSync(fixtureDPath, fixtureABuffer);

  // Fixture E: Multi-page PDF with repeated institutional headers and footers across pages
  const fixtureEBuffer = createCompliantPdfBuffer([
    {
      pageNumber: 1,
      text: "SUPREME COURT OF INDIA - REPORTABLE JUDGMENTS\n\nCase No: 999/2025\nPreliminary Background:\nThe parties entered into a bilateral licensing agreement.\n\nPage 1 of 3 - www.sci.gov.in",
    },
    {
      pageNumber: 2,
      text: "SUPREME COURT OF INDIA - REPORTABLE JUDGMENTS\n\nRatio Decidendi:\nCommercial terms must be construed according to their ordinary business meaning.\n\nPage 2 of 3 - www.sci.gov.in",
    },
    {
      pageNumber: 3,
      text: "SUPREME COURT OF INDIA - REPORTABLE JUDGMENTS\n\nOperative Order:\nThe judgment of the commercial division is affirmed.\n\nPage 3 of 3 - www.sci.gov.in",
    },
  ]);
  const fixtureEPath = path.join(dir, "fixture_e_repeating_headers.pdf");
  fs.writeFileSync(fixtureEPath, fixtureEBuffer);

  return {
    fixtureAPath,
    fixtureBPath,
    fixtureCPath,
    fixtureDPath,
    fixtureEPath,
  };
}
