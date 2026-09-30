import React, { useState } from "react";
import { DocumentItem } from "../types";
import { SAMPLE_PRESETS, SampleContractPreset } from "../data/sampleContracts";
import {
  FolderOpen,
  FileText,
  Trash2,
  PlusCircle,
  Sparkles,
  Layers,
  FileCheck,
  ArrowRight,
  ExternalLink
} from "lucide-react";

interface DocumentManagerProps {
  documents: DocumentItem[];
  selectedDocumentId: string | null;
  onSelectDocument: (id: string) => void;
  onDeleteDocument: (id: string) => void;
  onLoadPreset: (preset: SampleContractPreset) => void;
  onOpenUploadModal: () => void;
  onAnalyzeContract: () => void;
}

export const DocumentManager: React.FC<DocumentManagerProps> = ({
  documents,
  selectedDocumentId,
  onSelectDocument,
  onDeleteDocument,
  onLoadPreset,
  onOpenUploadModal,
  onAnalyzeContract
}) => {
  const [previewDocId, setPreviewDocId] = useState<string | null>(selectedDocumentId);
  const activeDoc = documents.find((d) => d.id === (previewDocId || selectedDocumentId)) || documents[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100">
            Vector Ingestion & Repository
          </span>
          <h2 className="text-2xl font-bold text-slate-900 font-serif mt-2">
            Legal Document Repository
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            Manage ingested contracts, trial records, appellate opinions, and briefs loaded into LexiMind RAG memory.
          </p>
        </div>

        <button
          onClick={onOpenUploadModal}
          className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs transition-colors shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Upload Legal Document</span>
        </button>
      </div>

      {/* Preset Fast-Loader Shelf */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold tracking-tight">
              Pre-Loaded Legal Presets & Test Agreements
            </h3>
          </div>
          <span className="text-xs text-slate-400">1-Click Fast Ingestion</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {SAMPLE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => onLoadPreset(preset)}
              className="text-left p-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-850 border border-slate-700/80 hover:border-amber-400/50 transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-100 group-hover:text-amber-300">
                    {preset.name}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">
                  {preset.description}
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-700/60 flex items-center justify-between text-[10px]">
                <span className="text-amber-400 font-semibold">{preset.riskHint}</span>
                <span className="text-slate-400 flex items-center space-x-1 group-hover:text-white">
                  <span>Load</span>
                  <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Document List & Chunk Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Document Cards */}
        <div className="lg:col-span-1 space-y-3">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Ingested Records ({documents.length})
          </h3>
          <div className="space-y-2">
            {documents.map((doc) => {
              const isSelected = doc.id === (previewDocId || selectedDocumentId);
              return (
                <div
                  key={doc.id}
                  onClick={() => {
                    setPreviewDocId(doc.id);
                    onSelectDocument(doc.id);
                  }}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                    isSelected
                      ? "bg-indigo-50/70 border-indigo-300 shadow-xs"
                      : "bg-white border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      <FileCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span className="text-xs font-bold text-slate-900 truncate max-w-[160px]">
                        {doc.name}
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Remove "${doc.name}" from repository?`)) {
                          onDeleteDocument(doc.id);
                        }
                      }}
                      className="text-slate-400 hover:text-rose-600 p-1 transition-colors"
                      title="Delete document"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                    <span>{doc.size} • {doc.chunksCount || doc.chunks?.length || doc.pageCount} chunks</span>
                    <span className="flex items-center space-x-1">
                      {doc.embeddingStatus === "indexed" ? (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-semibold border border-emerald-200">
                          pgvector
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 text-[10px] font-semibold border border-amber-200">
                          {doc.processingStatus || "ready"}
                        </span>
                      )}
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium">
                        {doc.category}
                      </span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Document Chunk Previewer */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          {activeDoc ? (
            <>
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-serif">
                    {activeDoc.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Uploaded: {activeDoc.uploadedAt} • Size: {activeDoc.size} • Chunks: {activeDoc.chunksCount || activeDoc.chunks?.length || activeDoc.pageCount} • Vector: {activeDoc.embeddingStatus || "ready"}
                  </p>
                </div>

                <button
                  onClick={onAnalyzeContract}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center space-x-1.5 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Run Phase 7 Risk Audit →</span>
                </button>
              </div>

              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Document Full Text / Ingested Content:
                </span>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 leading-relaxed max-h-[420px] overflow-y-auto whitespace-pre-wrap">
                  {activeDoc.content || "Document text loaded in memory."}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-16 text-slate-500">
              <FolderOpen className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold">No document selected</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
