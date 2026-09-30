import { ExtractedPage } from "./pdfExtractor.js";

export interface NormalizedPage {
  pageNumber: number;
  text: string;
  detectedSection?: string;
  isOcr: boolean;
  characterCount: number;
}

export interface LegalSectionMatch {
  sectionName: string;
  startIndex: number;
  snippet: string;
}

export class LegalTextNormalizer {
  // Common standard section markers recognized in Indian and common-law judgments
  private static SECTION_PATTERNS = [
    { pattern: /\b(ratio decidendi|ratio of the judgment|operative portion|holding)\b/i, name: "Ratio Decidendi" },
    { pattern: /\b(preliminary facts|procedural background|factual background|facts of the case)\b/i, name: "Facts & Background" },
    { pattern: /\b(substantial questions of law|issues for determination|points for consideration|issues framed)\b/i, name: "Legal Issues" },
    { pattern: /\b(arguments on behalf of|submissions of the appellant|submissions of the petitioner|contentions)\b/i, name: "Submissions & Contentions" },
    { pattern: /\b(reasons for the conclusion|judicial analysis|discussion and findings|statutory interpretation)\b/i, name: "Analysis & Findings" },
    { pattern: /\b(precedents cited|authorities discussed|case law analysis)\b/i, name: "Authorities Cited" },
    { pattern: /\b(final order|directions|operative order|appeal allowed|appeal dismissed|petition disposed of)\b/i, name: "Operative Order" },
  ];

  /**
   * Normalize an array of extracted pages from a legal PDF
   */
  static normalizePages(pages: ExtractedPage[]): NormalizedPage[] {
    if (!pages || pages.length === 0) return [];

    // 1. Identify common repeating header/footer lines across pages
    const repeatingLines = this.findRepeatingHeadersAndFooters(pages);

    let currentSection = "General Judgment";

    return pages.map((page) => {
      let cleaned = this.cleanPageText(page.text, repeatingLines);

      // 2. Detect legal section transition
      const detected = this.detectSection(cleaned);
      if (detected) {
        currentSection = detected;
      }

      return {
        pageNumber: page.pageNumber,
        text: cleaned,
        detectedSection: currentSection,
        isOcr: page.isOcr,
        characterCount: cleaned.length,
      };
    });
  }

  /**
   * Clean text of an individual page without altering verbatim legal terminology
   */
  static cleanPageText(rawText: string, repeatingLinesToRemove: Set<string> = new Set()): string {
    if (!rawText) return "";

    // 1. Remove null bytes and unprintable ASCII control codes (except \n, \r, \t)
    let text = rawText.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\uFFFD]/g, " ");

    // 2. Split into lines
    const lines = text.split(/\r?\n/);
    const cleanedLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();

      // Check if line is a detected repeating header/footer or bare page number (e.g. "Page 1 of 12" or "Page 2")
      const lower = line.toLowerCase();
      if (repeatingLinesToRemove.has(lower)) {
        continue;
      }
      if (/^(page\s+\d+(\s+of\s+\d+)?|\d+)$/i.test(line)) {
        continue;
      }

      cleanedLines.push(line);
    }

    text = cleanedLines.join("\n");

    // 3. Resolve broken line hyphenation across line breaks (e.g., "juris-\ndiction" -> "jurisdiction")
    text = text.replace(/([a-zA-Z]{3,})-\n\s*([a-zA-Z]{3,})/g, "$1$2");

    // 4. Normalize soft line breaks inside sentences while preserving paragraph breaks
    // Consecutive non-empty lines are joined with space unless previous line ended with colon or period
    text = text
      .split(/\n\s*\n/)
      .map((paragraph) => {
        return paragraph
          .split(/\n/)
          .map((l) => l.trim())
          .filter((l) => l.length > 0)
          .join(" ")
          .replace(/[ \t]+/g, " ");
      })
      .filter((p) => p.length > 0)
      .join("\n\n");

    return text.trim();
  }

  /**
   * Identify repeated identical header and footer lines that occur on 50%+ of pages
   */
  private static findRepeatingHeadersAndFooters(pages: ExtractedPage[]): Set<string> {
    if (pages.length < 3) return new Set();

    const lineCounts = new Map<string, number>();

    pages.forEach((p) => {
      const pageLines = p.text.split(/\r?\n/).map((l) => l.trim().toLowerCase());
      const uniquePageLines = new Set(pageLines);

      uniquePageLines.forEach((line) => {
        if (line.length >= 6 && line.length <= 100) {
          lineCounts.set(line, (lineCounts.get(line) || 0) + 1);
        }
      });
    });

    const threshold = Math.max(2, Math.floor(pages.length * 0.5));
    const repeating = new Set<string>();

    lineCounts.forEach((count, line) => {
      if (count >= threshold) {
        // Only strip if it looks like an institutional banner or disclaimer, not a substantive quote
        if (
          line.includes("supreme court") ||
          line.includes("high court") ||
          line.includes("www.") ||
          line.includes("http") ||
          line.includes("judgment dated") ||
          line.includes("reportable") ||
          line.includes("non-reportable") ||
          line.includes("page ")
        ) {
          repeating.add(line);
        }
      }
    });

    return repeating;
  }

  /**
   * Detect legal section header in paragraph
   */
  private static detectSection(text: string): string | null {
    for (const sec of this.SECTION_PATTERNS) {
      if (sec.pattern.test(text)) {
        return sec.name;
      }
    }
    return null;
  }
}
