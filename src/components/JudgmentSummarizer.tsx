import React, { useState } from "react";
import { StructuredSummary } from "../types";
import {
  FileText,
  Copy,
  Check,
  Scale,
  BookOpen,
  HelpCircle,
  Gavel,
  Award,
  RefreshCw,
  Download
} from "lucide-react";

interface JudgmentSummarizerProps {
  summary: StructuredSummary | null;
  isLoading: boolean;
  onReSummarize: () => void;
  documentTitle: string;
}

export const JudgmentSummarizer: React.FC<JudgmentSummarizerProps> = ({
  summary,
  isLoading,
  onReSummarize,
  documentTitle
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleExportSummary = () => {
    if (!summary) return;
    const text = `# STRUCTURED LEGAL SUMMARY: ${summary.caseOrDocName}
**Jurisdiction / Court:** ${summary.jurisdiction || "Standard"}
**Date:** ${summary.date || "N/A"}
**Parties:** ${summary.parties || "N/A"}

---
## 1. MATERIAL FACTS
${summary.facts.map((f, i) => `${i + 1}. ${f}`).join("\n")}

---
## 2. LEGAL ISSUES PRESENTED
${summary.legalIssues.map((issue, i) => `${i + 1}. ${issue}`).join("\n")}

---
## 3. PARTY ARGUMENTS
**Party A / Plaintiff:**
${summary.arguments?.partyA?.map((a) => `- ${a}`).join("\n") || "N/A"}

**Party B / Defendant:**
${summary.arguments?.partyB?.map((a) => `- ${a}`).join("\n") || "N/A"}

---
## 4. HOLDING & VERDICT
${summary.holdingAndVerdict}

---
## 5. RATIO DECIDENDI
${summary.ratioDecidendi}

---
## 6. KEY PRINCIPLES & PRECEDENTS ESTABLISHED
${summary.keyPrinciples.map((p, i) => `- ${p}`).join("\n")}
`;

    const blob = new Blob([text], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `LexiMind_Summary_${documentTitle.replace(/\s+/g, "_")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-xs">
        <div className="w-16 h-16 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin mb-4" />
        <h3 className="text-lg font-bold text-slate-900 font-serif">
          Extracting Structured Case Synthesis
        </h3>
        <p className="text-xs text-slate-600 max-w-sm mt-1">
          Parsing facts, arguments, holding, ratio decidendi, and legal principles from the record...
        </p>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center">
        <Scale className="w-12 h-12 text-slate-400 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-900">No Structured Summary Generated</h3>
        <p className="text-xs text-slate-600 mt-1 mb-4">
          Click below to extract a complete judicial case brief and structured summary.
        </p>
        <button
          onClick={onReSummarize}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold"
        >
          Generate Structured Summary
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100">
            Structured Legal Judgment Summary
          </span>
          <h2 className="text-2xl font-bold text-slate-900 font-serif mt-2">
            {summary.caseOrDocName}
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            Parties: <span className="font-semibold text-slate-800">{summary.parties || "Recorded in file"}</span> • Jurisdiction:{" "}
            <span className="font-semibold text-slate-800">{summary.jurisdiction || "Federal / Appellate"}</span>
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={handleExportSummary}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Brief</span>
          </button>
          <button
            onClick={onReSummarize}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Grid of Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 1: Facts */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              <span>1. Material Background Facts</span>
            </h3>
            <button
              onClick={() => handleCopy(summary.facts.join("\n"), "facts")}
              className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center space-x-1"
            >
              {copiedKey === "facts" ? <span className="text-emerald-600">Copied</span> : <Copy className="w-3 h-3" />}
            </button>
          </div>
          <ul className="space-y-2 text-xs text-slate-700">
            {summary.facts.map((fact, idx) => (
              <li key={idx} className="flex items-start space-x-2">
                <span className="font-bold text-indigo-600 shrink-0">•</span>
                <span className="leading-relaxed">{fact}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Section 2: Legal Issues */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <HelpCircle className="w-4 h-4 text-amber-600" />
              <span>2. Core Legal Issues Presented</span>
            </h3>
            <button
              onClick={() => handleCopy(summary.legalIssues.join("\n"), "issues")}
              className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center space-x-1"
            >
              {copiedKey === "issues" ? <span className="text-emerald-600">Copied</span> : <Copy className="w-3 h-3" />}
            </button>
          </div>
          <div className="space-y-2 text-xs text-slate-800">
            {summary.legalIssues.map((issue, idx) => (
              <div key={idx} className="p-3 bg-amber-50/50 rounded-xl border border-amber-100 leading-relaxed font-medium">
                Issue {idx + 1}: {issue}
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: Holding & Verdict */}
        <div className="bg-white rounded-2xl border border-indigo-200 p-6 shadow-xs space-y-3 bg-indigo-50/20">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-indigo-950 flex items-center space-x-2">
              <Gavel className="w-4 h-4 text-indigo-700" />
              <span>3. Holding & Operative Verdict</span>
            </h3>
            <button
              onClick={() => handleCopy(summary.holdingAndVerdict, "holding")}
              className="text-[11px] text-indigo-600 hover:text-indigo-800 flex items-center space-x-1"
            >
              {copiedKey === "holding" ? <span className="text-emerald-600">Copied</span> : <Copy className="w-3 h-3" />}
            </button>
          </div>
          <div className="p-4 bg-white rounded-xl border border-indigo-100 text-xs text-slate-900 font-semibold leading-relaxed shadow-2xs">
            {summary.holdingAndVerdict}
          </div>
        </div>

        {/* Section 4: Ratio Decidendi */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <Scale className="w-4 h-4 text-purple-600" />
              <span>4. Ratio Decidendi (Legal Rationale)</span>
            </h3>
            <button
              onClick={() => handleCopy(summary.ratioDecidendi, "ratio")}
              className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center space-x-1"
            >
              {copiedKey === "ratio" ? <span className="text-emerald-600">Copied</span> : <Copy className="w-3 h-3" />}
            </button>
          </div>
          <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200 font-serif italic">
            "{summary.ratioDecidendi}"
          </p>
        </div>

        {/* Section 5: Key Precedents Established */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <Award className="w-4 h-4 text-emerald-600" />
              <span>5. Key Legal Principles & Precedential Rules</span>
            </h3>
            <button
              onClick={() => handleCopy(summary.keyPrinciples.join("\n"), "principles")}
              className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center space-x-1"
            >
              {copiedKey === "principles" ? <span className="text-emerald-600">Copied</span> : <Copy className="w-3 h-3" />}
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {summary.keyPrinciples.map((principle, idx) => (
              <div key={idx} className="p-3 bg-emerald-50/40 rounded-xl border border-emerald-100 text-slate-800 leading-relaxed">
                <span className="font-bold text-emerald-800 block mb-1">Rule #{idx + 1}:</span>
                {principle}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
