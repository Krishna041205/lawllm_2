import React from "react";
import { DocumentItem } from "../types";
import { SAMPLE_PRESETS, SampleContractPreset } from "../data/sampleContracts";
import {
  Scale,
  ShieldAlert,
  FileText,
  MessageSquareText,
  Network,
  CalendarDays,
  FolderOpen,
  PlusCircle,
  Sparkles,
  ChevronDown,
  FileCheck
} from "lucide-react";

interface NavbarProps {
  activeTab: "contract" | "rag" | "summary" | "graph" | "timeline" | "documents" | "indian_law";
  setActiveTab: (tab: "contract" | "rag" | "summary" | "graph" | "timeline" | "documents" | "indian_law") => void;
  documents: DocumentItem[];
  selectedDocumentId: string | null;
  onSelectDocument: (id: string) => void;
  onLoadPreset: (preset: SampleContractPreset) => void;
  onOpenUploadModal: () => void;
  contractRiskScore?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  documents,
  selectedDocumentId,
  onSelectDocument,
  onLoadPreset,
  onOpenUploadModal,
  contractRiskScore
}) => {
  const [isPresetDropdownOpen, setIsPresetDropdownOpen] = React.useState(false);
  const [isDocDropdownOpen, setIsDocDropdownOpen] = React.useState(false);

  const selectedDoc = documents.find((d) => d.id === selectedDocumentId) || documents[0];

  const getRiskColor = (score?: number) => {
    if (score === undefined) return "bg-slate-100 text-slate-700 border-slate-200";
    if (score > 75) return "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30";
    if (score > 50) return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30";
    if (score > 25) return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30";
    return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30";
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Tagline */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-900 via-slate-900 to-indigo-700 text-amber-400 shadow-sm border border-slate-700">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold tracking-tight text-slate-950 font-serif">
                  Lexi<span className="text-indigo-600">Mind</span>
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                  Phase 7 Live
                </span>
              </div>
              <p className="text-xs text-slate-600 hidden sm:block">
                Legal Intelligence & Contract Risk Auditor
              </p>
            </div>
          </div>

          {/* Active Document Selector & Sample Presets */}
          <div className="flex items-center space-x-3">
            {/* Sample Presets Switcher */}
            <div className="relative">
              <button
                id="presets-menu-button"
                onClick={() => setIsPresetDropdownOpen(!isPresetDropdownOpen)}
                className="flex items-center space-x-2 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200/80 rounded-lg border border-slate-200 transition-colors"
                title="Load sample legal contract or case record"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span className="hidden md:inline">Sample Contracts</span>
                <ChevronDown className="w-3 h-3 text-slate-600" />
              </button>

              {isPresetDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setIsPresetDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-20 py-2">
                    <div className="px-3 py-1.5 border-b border-slate-100">
                      <p className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
                        Load Pre-Analyzed Legal Presets
                      </p>
                    </div>
                    <div className="max-h-72 overflow-y-auto p-1 space-y-1">
                      {SAMPLE_PRESETS.map((preset) => (
                        <button
                          key={preset.id}
                          onClick={() => {
                            onLoadPreset(preset);
                            setIsPresetDropdownOpen(false);
                          }}
                          className="w-full text-left p-2 rounded-lg hover:bg-slate-50 transition-colors group"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-slate-900 group-hover:text-indigo-600">
                              {preset.name}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                              {preset.riskHint}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 line-clamp-1 mt-0.5">
                            {preset.description}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Document Selector */}
            <div className="relative">
              <button
                id="doc-selector-button"
                onClick={() => setIsDocDropdownOpen(!isDocDropdownOpen)}
                className="flex items-center space-x-2 px-3 py-1.5 text-xs font-medium text-slate-800 bg-white hover:bg-slate-50 rounded-lg border border-slate-300 transition-colors max-w-[200px] sm:max-w-[240px] truncate"
              >
                <FileCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span className="truncate">{selectedDoc ? selectedDoc.name : "Select Document"}</span>
                <ChevronDown className="w-3 h-3 text-slate-600 shrink-0" />
              </button>

              {isDocDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setIsDocDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 z-20 py-2">
                    <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between">
                      <p className="text-xs font-semibold text-slate-800">
                        Uploaded Documents ({documents.length})
                      </p>
                      <button
                        onClick={() => {
                          setIsDocDropdownOpen(false);
                          onOpenUploadModal();
                        }}
                        className="text-[11px] text-indigo-600 hover:text-indigo-700 font-medium flex items-center space-x-1"
                      >
                        <PlusCircle className="w-3 h-3" />
                        <span>Upload</span>
                      </button>
                    </div>
                    <div className="max-h-60 overflow-y-auto p-1 space-y-1">
                      {documents.map((doc) => (
                        <button
                          key={doc.id}
                          onClick={() => {
                            onSelectDocument(doc.id);
                            setIsDocDropdownOpen(false);
                          }}
                          className={`w-full text-left p-2 rounded-lg text-xs transition-colors flex items-center justify-between ${
                            doc.id === selectedDocumentId
                              ? "bg-indigo-50 text-indigo-900 font-semibold"
                              : "hover:bg-slate-50 text-slate-800"
                          }`}
                        >
                          <span className="truncate pr-2">{doc.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 shrink-0">
                            {doc.category}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Upload Button */}
            <button
              id="upload-header-btn"
              onClick={onOpenUploadModal}
              className="flex items-center space-x-1 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Add Doc</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="flex items-center space-x-1 overflow-x-auto py-2 scrollbar-none border-t border-slate-100">
          <button
            id="tab-contract-analyzer"
            onClick={() => setActiveTab("contract")}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all shrink-0 ${
              activeTab === "contract"
                ? "bg-indigo-600 text-white shadow-xs font-semibold"
                : "text-slate-700 hover:text-slate-950 hover:bg-slate-100"
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-amber-300" />
            <span>Phase 7: Contract Analyzer</span>
            {contractRiskScore !== undefined && (
              <span
                className={`ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  activeTab === "contract"
                    ? "bg-white/20 text-white"
                    : "bg-rose-100 text-rose-700"
                }`}
              >
                Risk {contractRiskScore}/100
              </span>
            )}
          </button>

          <button
            id="tab-indian-law-pipeline"
            onClick={() => setActiveTab("indian_law")}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all shrink-0 ${
              activeTab === "indian_law"
                ? "bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-xs font-semibold"
                : "text-slate-700 hover:text-slate-950 hover:bg-slate-100"
            }`}
          >
            <Scale className="w-4 h-4 text-emerald-300" />
            <span>Indian Law Pipeline</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
              AWS + Scraper
            </span>
          </button>

          <button
            id="tab-rag-research"
            onClick={() => setActiveTab("rag")}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all shrink-0 ${
              activeTab === "rag"
                ? "bg-slate-900 text-white shadow-xs font-semibold"
                : "text-slate-700 hover:text-slate-950 hover:bg-slate-100"
            }`}
          >
            <MessageSquareText className="w-4 h-4 text-indigo-400" />
            <span>Legal RAG Research</span>
          </button>

          <button
            id="tab-judgment-summary"
            onClick={() => setActiveTab("summary")}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all shrink-0 ${
              activeTab === "summary"
                ? "bg-slate-900 text-white shadow-xs font-semibold"
                : "text-slate-700 hover:text-slate-950 hover:bg-slate-100"
            }`}
          >
            <FileText className="w-4 h-4 text-indigo-400" />
            <span>Structured Summary</span>
          </button>

          <button
            id="tab-citation-graph"
            onClick={() => setActiveTab("graph")}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all shrink-0 ${
              activeTab === "graph"
                ? "bg-slate-900 text-white shadow-xs font-semibold"
                : "text-slate-700 hover:text-slate-950 hover:bg-slate-100"
            }`}
          >
            <Network className="w-4 h-4 text-indigo-400" />
            <span>Citation Graph</span>
          </button>

          <button
            id="tab-litigation-timeline"
            onClick={() => setActiveTab("timeline")}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all shrink-0 ${
              activeTab === "timeline"
                ? "bg-slate-900 text-white shadow-xs font-semibold"
                : "text-slate-700 hover:text-slate-950 hover:bg-slate-100"
            }`}
          >
            <CalendarDays className="w-4 h-4 text-indigo-400" />
            <span>Chronology Timeline</span>
          </button>

          <button
            id="tab-document-manager"
            onClick={() => setActiveTab("documents")}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all shrink-0 ${
              activeTab === "documents"
                ? "bg-slate-900 text-white shadow-xs font-semibold"
                : "text-slate-700 hover:text-slate-950 hover:bg-slate-100"
            }`}
          >
            <FolderOpen className="w-4 h-4 text-indigo-400" />
            <span>Doc Repository ({documents.length})</span>
          </button>
        </div>
      </div>
    </header>
  );
};
