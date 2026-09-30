import React, { useState, useEffect } from "react";
import { Navbar } from "./components/Navbar";
import { ContractAnalyzer } from "./components/ContractAnalyzer";
import { LegalRAGChat } from "./components/LegalRAGChat";
import { JudgmentSummarizer } from "./components/JudgmentSummarizer";
import { CitationGraph } from "./components/CitationGraph";
import { TimelineBuilder } from "./components/TimelineBuilder";
import { DocumentManager } from "./components/DocumentManager";
import { UploadModal } from "./components/UploadModal";
import { IndianLawPipeline } from "./components/IndianLawPipeline";
import {
  DocumentItem,
  ContractAnalysis,
  ChatMessage,
  StructuredSummary,
  CitationGraphData,
  TimelineEvent,
  RedlineClauseResult,
  IndianJudgmentRecord
} from "./types";
import { SampleContractPreset, SAMPLE_PRESETS } from "./data/sampleContracts";

export default function App() {
  const [activeTab, setActiveTab] = useState<"contract" | "rag" | "summary" | "graph" | "timeline" | "documents" | "indian_law">("contract");
  
  // Documents state
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Feature states
  const [contractAnalysis, setContractAnalysis] = useState<ContractAnalysis | null>(null);
  const [isAnalyzingContract, setIsAnalyzingContract] = useState(false);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isQueryingRAG, setIsQueryingRAG] = useState(false);

  const [summary, setSummary] = useState<StructuredSummary | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);

  const [graphData, setGraphData] = useState<CitationGraphData | null>(null);
  const [isGraphLoading, setIsGraphLoading] = useState(false);

  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [isTimelineLoading, setIsTimelineLoading] = useState(false);

  // Safe JSON API fetcher that prevents "Unexpected token <" HTML parse errors
  const safeFetchJson = async <T = any>(url: string, options?: RequestInit): Promise<T | null> => {
    try {
      const res = await fetch(url, options);
      const contentType = res.headers.get("content-type") || "";
      if (!res.ok) {
        console.warn(`API request to ${url} returned status ${res.status}`);
      }
      if (contentType.includes("application/json")) {
        return await res.json();
      }
      // If server returned plain text or html unexpectedly
      const text = await res.text();
      try {
        return JSON.parse(text);
      } catch {
        console.warn(`Non-JSON response received from ${url}:`, text.slice(0, 120));
        return null;
      }
    } catch (err) {
      console.error(`Network or fetch error on ${url}:`, err);
      return null;
    }
  };

  // Load documents on initial boot
  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const data = await safeFetchJson<{ documents: DocumentItem[] }>("/api/documents");
      if (data?.documents && data.documents.length > 0) {
        setDocuments(data.documents);
        const defaultDoc = data.documents[0];
        setSelectedDocumentId(defaultDoc.id);
        // Automatically run contract analysis on initial load
        runContractAnalysis(defaultDoc.id);
      }
    } catch (err) {
      console.error("Failed to fetch documents:", err);
    }
  };

  // Run Phase 7 Contract Analysis
  const runContractAnalysis = async (docId?: string) => {
    const targetId = docId || selectedDocumentId;
    if (!targetId) return;
    setIsAnalyzingContract(true);
    try {
      const data = await safeFetchJson<{ analysis: ContractAnalysis; documentTitle?: string }>("/api/contract/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: targetId })
      });
      if (data?.analysis) {
        setContractAnalysis(data.analysis);
      }
    } catch (err) {
      console.error("Contract Analysis error:", err);
    } finally {
      setIsAnalyzingContract(false);
    }
  };

  // Send RAG Search message
  const handleSendRAGMessage = async (prompt: string) => {
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: prompt,
      timestamp: new Date().toLocaleTimeString()
    };
    setChatMessages((prev) => [...prev, userMsg]);
    setIsQueryingRAG(true);

    try {
      const data = await safeFetchJson<{ answer?: string; citations?: any[] }>("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          documentId: selectedDocumentId
        })
      });
      const botMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: "assistant",
        content: data?.answer || "No response generated.",
        timestamp: new Date().toLocaleTimeString(),
        citations: data?.citations || []
      };
      setChatMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error("RAG Query error:", err);
      const errorMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: "assistant",
        content: "Error executing legal vector search. Please try again.",
        timestamp: new Date().toLocaleTimeString()
      };
      setChatMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsQueryingRAG(false);
    }
  };

  // Run Structured Summarizer
  const runSummarizer = async (docId?: string) => {
    const targetId = docId || selectedDocumentId;
    if (!targetId) return;
    setIsSummarizing(true);
    try {
      const data = await safeFetchJson<{ summary: StructuredSummary }>("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: targetId })
      });
      if (data?.summary) {
        setSummary(data.summary);
      }
    } catch (err) {
      console.error("Summarizer error:", err);
    } finally {
      setIsSummarizing(false);
    }
  };

  // Run Citation Knowledge Graph
  const runGraph = async (docId?: string) => {
    const targetId = docId || selectedDocumentId;
    if (!targetId) return;
    setIsGraphLoading(true);
    try {
      const data = await safeFetchJson<CitationGraphData>(`/api/graph?documentId=${targetId}`);
      if (data?.nodes && data?.edges) {
        setGraphData(data);
      }
    } catch (err) {
      console.error("Graph error:", err);
    } finally {
      setIsGraphLoading(false);
    }
  };

  // Run Timeline Extractor
  const runTimeline = async (docId?: string) => {
    const targetId = docId || selectedDocumentId;
    if (!targetId) return;
    setIsTimelineLoading(true);
    try {
      const data = await safeFetchJson<{ events: TimelineEvent[] }>(`/api/timeline?documentId=${targetId}`);
      if (data?.events) {
        setTimelineEvents(data.events);
      }
    } catch (err) {
      console.error("Timeline error:", err);
    } finally {
      setIsTimelineLoading(false);
    }
  };

  // Load Preset
  const handleLoadPreset = async (preset: SampleContractPreset) => {
    try {
      const data = await safeFetchJson<{ document: DocumentItem }>("/api/documents/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${preset.name}.${preset.type}`,
          content: preset.content,
          type: preset.type,
          category: preset.category
        })
      });
      if (data?.document) {
        setDocuments((prev) => [data.document, ...prev.filter((d) => d.id !== data.document.id)]);
        setSelectedDocumentId(data.document.id);
        
        // Reset sub-feature caches
        setContractAnalysis(null);
        setSummary(null);
        setGraphData(null);
        setTimelineEvents([]);
        setChatMessages([]);

        // Automatically trigger appropriate analysis
        if (preset.category === "contract") {
          setActiveTab("contract");
          runContractAnalysis(data.document.id);
        } else {
          setActiveTab("summary");
          runSummarizer(data.document.id);
        }
      }
    } catch (err) {
      console.error("Failed to load preset:", err);
    }
  };

  // Direct Clause Redline API Handler
  const handleDirectRedlineRequest = async (clause: string, instruction: string): Promise<RedlineClauseResult> => {
    const data = await safeFetchJson<RedlineClauseResult>("/api/contract/redline-clause", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        originalClause: clause,
        instruction,
        partyPosition: "Customer"
      })
    });
    return data || {
      proposedRedline: clause,
      protectionsGained: ["Clause review pending"],
      fallbackPosition: "Propose mutual 30-day notice and balanced covenants.",
      commentaryForCounterparty: "Propose mutual bilateral modification."
    };
  };

  // Handle Document Upload
  const handleUploadDocument = async (data: {
    name: string;
    content: string;
    type: "pdf" | "docx" | "txt";
    category: any;
  }) => {
    const result = await safeFetchJson<{ document: DocumentItem }>("/api/documents/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    if (result?.document) {
      setDocuments((prev) => [result.document, ...prev]);
      setSelectedDocumentId(result.document.id);
      setActiveTab("contract");
      runContractAnalysis(result.document.id);
    }
  };

  // Delete Document
  const handleDeleteDocument = async (id: string) => {
    await fetch(`/api/documents/${id}`, { method: "DELETE" });
    const remaining = documents.filter((d) => d.id !== id);
    setDocuments(remaining);
    if (selectedDocumentId === id && remaining.length > 0) {
      setSelectedDocumentId(remaining[0].id);
      runContractAnalysis(remaining[0].id);
    }
  };

  // Switch Active Document
  const handleSelectDocument = (id: string | null) => {
    setSelectedDocumentId(id);
    setContractAnalysis(null);
    setSummary(null);
    setGraphData(null);
    setTimelineEvents([]);
    
    if (activeTab === "contract") runContractAnalysis(id);
    else if (activeTab === "summary") runSummarizer(id);
    else if (activeTab === "graph") runGraph(id);
    else if (activeTab === "timeline") runTimeline(id);
  };

  // Lazy-load data when switching tabs if not present
  useEffect(() => {
    if (!selectedDocumentId) return;
    if (activeTab === "contract" && !contractAnalysis && !isAnalyzingContract) {
      runContractAnalysis(selectedDocumentId);
    } else if (activeTab === "summary" && !summary && !isSummarizing) {
      runSummarizer(selectedDocumentId);
    } else if (activeTab === "graph" && !graphData && !isGraphLoading) {
      runGraph(selectedDocumentId);
    } else if (activeTab === "timeline" && timelineEvents.length === 0 && !isTimelineLoading) {
      runTimeline(selectedDocumentId);
    }
  }, [activeTab, selectedDocumentId]);

  const activeDocTitle = documents.find((d) => d.id === selectedDocumentId)?.name || "Current Agreement";

  return (
    <div className="min-h-screen bg-slate-100/60 text-slate-900 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        documents={documents}
        selectedDocumentId={selectedDocumentId}
        onSelectDocument={handleSelectDocument}
        onLoadPreset={handleLoadPreset}
        onOpenUploadModal={() => setIsUploadModalOpen(true)}
        contractRiskScore={contractAnalysis?.overallRiskScore}
      />

      {/* Main Content Workspace Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === "indian_law" && (
          <IndianLawPipeline
            onLoadJudgmentIntoRAG={async (judgment: IndianJudgmentRecord) => {
              // Add or select as active doc, switch to RAG tab and seed query
              const tempDoc: DocumentItem = {
                id: judgment.id,
                name: `${judgment.citation || judgment.caseNumber} - ${judgment.title}.pdf`,
                type: "pdf",
                size: "450 KB",
                uploadedAt: judgment.judgmentDate,
                category: "indian_judgment",
                pageCount: 14,
                chunksCount: judgment.ragChunksCount,
                content: judgment.fullText || judgment.fullTextSnippet
              };
              setDocuments((prev) => {
                const exists = prev.find((d) => d.id === judgment.id);
                return exists ? prev : [tempDoc, ...prev];
              });
              setSelectedDocumentId(judgment.id);
              setActiveTab("rag");
              // Auto-seed user inquiry in RAG chat
              setTimeout(() => {
                handleSendRAGMessage(
                  `Analyze the legal ratio decidendi, key holding, and applicable statutes in ${judgment.citation} (${judgment.title}) decided by Hon'ble ${judgment.bench.join(", ")}.`
                );
              }, 400);
            }}
          />
        )}

        {activeTab === "contract" && (
          <ContractAnalyzer
            analysis={contractAnalysis}
            isLoading={isAnalyzingContract}
            onReAnalyze={() => runContractAnalysis(selectedDocumentId || undefined)}
            documentTitle={activeDocTitle}
            onDirectRedlineRequest={handleDirectRedlineRequest}
          />
        )}

        {activeTab === "rag" && (
          <LegalRAGChat
            messages={chatMessages}
            onSendMessage={handleSendRAGMessage}
            isLoading={isQueryingRAG}
            documents={documents}
            selectedDocumentId={selectedDocumentId}
            onSelectDocument={handleSelectDocument}
          />
        )}

        {activeTab === "summary" && (
          <JudgmentSummarizer
            summary={summary}
            isLoading={isSummarizing}
            onReSummarize={() => runSummarizer(selectedDocumentId || undefined)}
            documentTitle={activeDocTitle}
          />
        )}

        {activeTab === "graph" && (
          <CitationGraph
            graphData={graphData}
            isLoading={isGraphLoading}
            onRefreshGraph={() => runGraph(selectedDocumentId || undefined)}
            documentTitle={activeDocTitle}
          />
        )}

        {activeTab === "timeline" && (
          <TimelineBuilder
            events={timelineEvents}
            isLoading={isTimelineLoading}
            onRefreshTimeline={() => runTimeline(selectedDocumentId || undefined)}
            documentTitle={activeDocTitle}
          />
        )}

        {activeTab === "documents" && (
          <DocumentManager
            documents={documents}
            selectedDocumentId={selectedDocumentId}
            onSelectDocument={handleSelectDocument}
            onDeleteDocument={handleDeleteDocument}
            onLoadPreset={handleLoadPreset}
            onOpenUploadModal={() => setIsUploadModalOpen(true)}
            onAnalyzeContract={() => {
              setActiveTab("contract");
              runContractAnalysis(selectedDocumentId || undefined);
            }}
          />
        )}
      </main>

      {/* Document Upload Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUpload={handleUploadDocument}
      />
    </div>
  );
}
