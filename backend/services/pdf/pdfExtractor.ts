import { PDFParse } from "pdf-parse";
import { PdfValidator } from "./pdfValidator.js";
import { defaultOCRService, OCRService } from "./ocrService.js";
import dotenv from "dotenv";

dotenv.config();

export interface ExtractedPage {
  pageNumber: number;
  text: string;
  isOcr: boolean;
  confidence?: number;
  characterCount: number;
}

export interface PdfExtractionResult {
  pages: ExtractedPage[];
  totalPages: number;
  totalCharacters: number;
  isScanned: boolean;
  ocrUsed: boolean;
  extractionMethod: "native" | "ocr" | "hybrid";
  pdfVersion?: string;
}

export class PdfExtractor {
  private minCharsPerPage: number;
  private ocrEnabled: boolean;
  private ocrService: OCRService;

  constructor(options?: { minCharsPerPage?: number; ocrEnabled?: boolean; ocrService?: OCRService }) {
    this.minCharsPerPage =
      options?.minCharsPerPage ?? parseInt(process.env.PDF_MIN_EXTRACTED_CHARS || "80", 10);
    this.ocrEnabled = options?.ocrEnabled ?? process.env.OCR_ENABLED !== "false";
    this.ocrService = options?.ocrService || defaultOCRService;
  }

  /**
   * Extract text page-by-page from raw PDF buffer with intelligent scanned PDF / OCR fallback
   */
  async extract(buffer: Buffer): Promise<PdfExtractionResult> {
    // 1. Validate PDF format
    const validation = PdfValidator.validate(buffer);
    if (!validation.isValid) {
      throw new Error(`PDF validation failed: ${validation.error} - ${validation.details || ""}`);
    }

    const parser = new (PDFParse as any)({ data: buffer });
    let parseResult: any;

    try {
      parseResult = await parser.getText();
    } catch (parseErr: any) {
      console.warn("⚠️ [PdfExtractor] Native text parsing threw error:", parseErr?.message || parseErr);
      parseResult = { pages: [], total: 0, text: "" };
    }

    const pages: ExtractedPage[] = [];
    let scannedPagesCount = 0;
    let ocrUsed = false;

    const rawPages: Array<{ text: string; num: number }> = parseResult?.pages || [];
    const totalPages = rawPages.length > 0 ? rawPages.length : parseResult?.total || 1;

    for (let i = 1; i <= totalPages; i++) {
      const rawPage = rawPages.find((p) => p.num === i);
      const text = rawPage?.text?.trim() || "";

      // Quality assessment: determine if page is scanned/empty
      const isLowText = text.length < this.minCharsPerPage;
      const letters = (text.match(/[a-zA-Z]/g) || []).length;
      const alphaRatio = text.length > 0 ? letters / text.length : 0;
      const isScannedPage = isLowText || alphaRatio < 0.35;

      if (isScannedPage) {
        scannedPagesCount++;
      }

      if (isScannedPage && this.ocrEnabled) {
        console.log(`[PdfExtractor] Page ${i}/${totalPages} appears scanned/image-based (chars: ${text.length}). Triggering OCR fallback...`);
        try {
          // Attempt screenshot rendering from PDFParse if available
          let pageScreenshotBuffer: Buffer | null = null;
          try {
            if (typeof parser.getScreenshot === "function") {
              const screenshot = await parser.getScreenshot({ pageNumber: i });
              if (screenshot?.data) {
                pageScreenshotBuffer = Buffer.isBuffer(screenshot.data)
                  ? screenshot.data
                  : Buffer.from(screenshot.data);
              }
            }
          } catch (shotErr) {
            // Screenshot rendering not available or failed
          }

          // If no screenshot buffer, use the PDF buffer itself for page-level transcription
          const imageToOCR = pageScreenshotBuffer || buffer;
          const ocrResult = await this.ocrService.recognizePage(imageToOCR, i);

          if (ocrResult.qualityPass && ocrResult.text.length > text.length) {
            pages.push({
              pageNumber: i,
              text: ocrResult.text,
              isOcr: true,
              confidence: ocrResult.confidence,
              characterCount: ocrResult.text.length,
            });
            ocrUsed = true;
            continue;
          }
        } catch (ocrErr: any) {
          console.warn(`⚠️ [PdfExtractor] OCR failed for Page ${i}:`, ocrErr?.message || ocrErr);
        }
      }

      // Default to native extracted text
      pages.push({
        pageNumber: i,
        text: text.length > 0 ? text : `[Page ${i}: Blank or unindexed court order page]`,
        isOcr: false,
        confidence: 99.0,
        characterCount: text.length,
      });
    }

    const isScanned = scannedPagesCount > totalPages * 0.5;
    const extractionMethod = ocrUsed ? (scannedPagesCount === totalPages ? "ocr" : "hybrid") : "native";
    const totalCharacters = pages.reduce((sum, p) => sum + p.characterCount, 0);

    return {
      pages,
      totalPages,
      totalCharacters,
      isScanned,
      ocrUsed,
      extractionMethod,
      pdfVersion: validation.pdfVersion,
    };
  }
}

export const defaultPdfExtractor = new PdfExtractor();
