export interface JudgmentMetadata {
  documentId?: string;
  caseName: string;
  caseNumber: string;
  court: string;
  courtId: "SCI" | "DHC" | "BHC" | string;
  bench: string[];
  judgmentDate: string; // YYYY-MM-DD
  year: number;
  judges?: string[];
  petitioner?: string;
  respondent?: string;
  citation: string;
  source: string;
  sourceUrl: string;
  pdfUrl: string;
  judgmentType?: string;
  language?: string;
  documentType?: "case_law" | "statute" | "order" | "contract";
  disposalNature?: string;
  actsCited?: string[];
  fullTextSnippet?: string;
}

export interface JudgmentSearchOptions {
  court?: string;
  startDate?: string;
  endDate?: string;
  caseType?: string;
  query?: string;
  page?: number;
  pageSize?: number;
}

export interface DownloadedJudgment {
  buffer: Buffer;
  contentType: string;
  sourceUrl: string;
  downloadDurationMs: number;
}

export interface CourtSource {
  id: string;
  name: string;
  courtId: string;
  baseUrl: string;

  discoverJudgments(options: JudgmentSearchOptions): Promise<{
    results: JudgmentMetadata[];
    page: number;
    hasMore: boolean;
    totalEstimated?: number;
  }>;

  fetchJudgment(metadata: JudgmentMetadata): Promise<DownloadedJudgment>;

  supports(court: string): boolean;
}
