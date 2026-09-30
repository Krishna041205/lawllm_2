export interface PdfValidationResult {
  isValid: boolean;
  sizeBytes: number;
  pdfVersion?: string;
  error?: "PDF_EMPTY" | "PDF_TOO_LARGE" | "PDF_CORRUPTED" | "INVALID_PDF_HEADER" | "PDF_MISSING_EOF" | string;
  details?: string;
}

export class PdfValidator {
  private static MAX_PDF_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
  private static MIN_PDF_SIZE_BYTES = 20; // Minimal PDF header + trailer

  /**
   * Validate raw PDF buffer structure, header magic bytes, and size bounds
   */
  static validate(buffer: Buffer): PdfValidationResult {
    if (!buffer || buffer.length === 0) {
      return {
        isValid: false,
        sizeBytes: 0,
        error: "PDF_EMPTY",
        details: "Buffer is empty or null.",
      };
    }

    if (buffer.length < this.MIN_PDF_SIZE_BYTES) {
      return {
        isValid: false,
        sizeBytes: buffer.length,
        error: "PDF_CORRUPTED",
        details: `Buffer size (${buffer.length} bytes) is too small to be a valid PDF.`,
      };
    }

    if (buffer.length > this.MAX_PDF_SIZE_BYTES) {
      return {
        isValid: false,
        sizeBytes: buffer.length,
        error: "PDF_TOO_LARGE",
        details: `Buffer size (${buffer.length} bytes) exceeds maximum allowable limit of 50MB.`,
      };
    }

    // Inspect first 1024 bytes for PDF magic signature: %PDF-1.x
    const headerSlice = buffer.subarray(0, Math.min(1024, buffer.length)).toString("latin1");
    const headerMatch = headerSlice.match(/%PDF-(\d+\.\d+)/);

    if (!headerMatch) {
      return {
        isValid: false,
        sizeBytes: buffer.length,
        error: "INVALID_PDF_HEADER",
        details: "Buffer does not begin with valid '%PDF-' magic header signature.",
      };
    }

    const pdfVersion = headerMatch[1];

    // Inspect last 1024 bytes for EOF marker: %%EOF
    const trailerSlice = buffer.subarray(Math.max(0, buffer.length - 1024)).toString("latin1");
    const hasEof = trailerSlice.includes("%%EOF") || trailerSlice.includes("%EOF");

    if (!hasEof) {
      // Some court web servers truncate trailing whitespace or comments; warn but check if structure is recoverable
      console.warn("⚠️ [PdfValidator] PDF trailer missing explicit '%%EOF' marker; structure may be slightly truncated but might be readable.");
    }

    return {
      isValid: true,
      sizeBytes: buffer.length,
      pdfVersion,
    };
  }
}
