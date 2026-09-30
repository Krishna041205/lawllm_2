export type DocumentCategory = "contract" | "case_law" | "statute" | "brief" | "policy" | "indian_judgment";

// Indian Law Pipeline Types
export interface IndianJudgmentRecord {
  id: string;
  courtId: "SCI" | "DHC" | "BHC" | "MHC" | "CAL" | "ALL" | string;
  courtName: string;
  caseNumber: string;
  diaryNumber?: string;
  cnrNumber?: string;
  citation: string;
  title: string;
  petitioner: string;
  respondent: string;
  bench: string[];
  judgmentDate: string;
  disposalNature: string;
  sourceOrigin: "AWS_OPEN_DATA" | "SCI_DAILY_SCRAPER" | "ECOURTS_SYNC" | "OFFICIAL_REGISTRY";
  pdfSha256: string;
  actsCited?: string[];
  fullTextSnippet: string;
  fullText?: string;
  ragChunksCount: number;
  syncStatus: "synced" | "delta_ingested" | "embedding_ready";
}

export interface PipelineSyncMetrics {
  totalHistoricalIndexed: number;
  totalHighCourtJudgments: number;
  todayDeltaIngested: number;
  lastDeltaSyncTime: string;
  activeScraperStatus: "idle" | "syncing_sci" | "syncing_ecourts" | "chunking";
  sha256DeduplicationRate: string;
  avgChunkEmbeddingMs: number;
  vpsResourceUsage: {
    cpuPercent: number;
    ramUsedMb: number;
    ramTotalMb: number;
    diskUsedGb: number;
    diskTotalGb: number;
  };
}

export interface ScraperJobLog {
  id: string;
  timestamp: string;
  source: string;
  court: string;
  status: "SUCCESS" | "SYNCING" | "SKIPPED_DEDUP" | "RATE_LIMIT_BACKOFF";
  recordsProcessed: number;
  recordsNew: number;
  sha256Verified: number;
  message: string;
}

export interface DocumentChunk {
  id: string;
  page: number;
  text: string;
}

export interface IngestionJob {
  id: string;
  documentId?: string;
  source: string;
  court: string;
  caseNumber?: string;
  caseName?: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "SKIPPED_DUPLICATE" | "FAILED";
  currentStage: "DISCOVERED" | "DOWNLOADING" | "VALIDATING" | "STORING" | "EXTRACTING" | "OCR" | "CHUNKING" | "EMBEDDING" | "INDEXING" | "INDEXED" | "FAILED";
  pdfPath?: string;
  contentHash?: string;
  error?: string;
  startedAt: string;
  completedAt?: string;
  auditMetadata?: Record<string, any>;
}

export interface DocumentItem {
  id: string;
  name: string;
  type: "pdf" | "docx" | "txt";
  size: string;
  uploadedAt: string;
  category: DocumentCategory;
  pageCount: number;
  chunksCount?: number;
  content?: string;
  chunks?: DocumentChunk[];
  processingStatus?: "pending" | "processing" | "indexed" | "failed";
  embeddingStatus?: "pending" | "indexed" | "failed";
  createdAt?: string;
}

export interface Citation {
  sourceTitle: string;
  page: number;
  quote?: string;
  relevanceScore?: number;
  similarityScore?: number;
  chunkId?: string;
  documentId?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  citations?: Citation[];
  suggestedFollowups?: string[];
}

export interface StructuredSummary {
  caseOrDocName: string;
  parties?: string;
  jurisdiction?: string;
  date?: string;
  facts: string[];
  legalIssues: string[];
  arguments?: {
    partyA: string[];
    partyB: string[];
  };
  holdingAndVerdict: string;
  ratioDecidendi: string;
  keyPrinciples: string[];
}

export interface CitationNode {
  id: string;
  label: string;
  type: "current_doc" | "precedent_case" | "statute" | "regulation" | "secondary_source";
  year?: string;
  court?: string;
  summary?: string;
  x?: number;
  y?: number;
}

export interface CitationEdge {
  id: string;
  source: string;
  target: string;
  label: "cites" | "applies" | "distinguishes" | "overrules" | "interprets" | string;
}

export interface CitationGraphData {
  nodes: CitationNode[];
  edges: CitationEdge[];
}

export interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  description: string;
  category: "filing" | "hearing" | "contract_execution" | "breach" | "amendment" | "notice" | "judgment" | "deadline" | string;
  severity: "low" | "medium" | "high" | "critical";
  entityInvolved?: string;
}

// ----------------------------------------------------------------------
// Phase 7: Contract Analyzer Models
// ----------------------------------------------------------------------
export type ClauseSeverity = "Critical Risk" | "High Risk" | "Medium Risk" | "Low Risk" | "Favorable";
export type ClauseCategory =
  | "Liability & Indemnity"
  | "IP & Ownership"
  | "Termination & Breach"
  | "Confidentiality & Non-Compete"
  | "Dispute & Jurisdiction"
  | "Payment & Penalties"
  | "Compliance & Data"
  | "Other";

export interface MissingClause {
  clauseName: string;
  standardPurpose: string;
  riskIfMissing: string;
  importance: "Critical" | "Recommended" | "Standard";
  suggestedDraftClause: string;
}

export interface ClauseDeepDive {
  id: string;
  clauseTitle: string;
  category: ClauseCategory;
  originalSnippet: string;
  severity: ClauseSeverity;
  issueAnalysis: string;
  recommendedRedline: string;
  explanationOfChange: string;
  negotiationTip: string;
}

export interface KeyObligation {
  party: string;
  obligation: string;
  deadlineOrCondition: string;
  riskFactor: string;
}

export interface ActionableChecklistItem {
  item: string;
  priority: "Immediate" | "Before Signing" | "Post-Closing";
  status: "pending" | "addressed";
}

export interface ContractAnalysis {
  overallRiskScore: number; // 0-100
  riskLevel: "Low" | "Moderate" | "High" | "Critical";
  executiveSummary: string;
  contractType: string;
  governingLaw?: string;
  keyParties: {
    partyA: string;
    partyB: string;
    rolePartyA?: string;
    rolePartyB?: string;
  };
  effectiveDate?: string;
  termAndTermination?: string;
  riskBreakdown: {
    criticalCount: number;
    mediumCount: number;
    lowCount: number;
    favorableCount: number;
  };
  missingClauses: MissingClause[];
  clauseDeepDive: ClauseDeepDive[];
  keyObligations: KeyObligation[];
  actionableChecklist: ActionableChecklistItem[];
}

export interface RedlineClauseResult {
  proposedRedline: string;
  protectionsGained: string[];
  fallbackPosition: string;
  commentaryForCounterparty: string;
}
