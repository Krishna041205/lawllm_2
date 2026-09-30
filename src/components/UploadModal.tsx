import React, { useState } from "react";
import { DocumentCategory } from "../types";
import {
  Upload,
  X,
  FileText,
  FileCode,
  FileCheck,
  Sparkles,
  AlertCircle
} from "lucide-react";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (data: { name: string; content: string; type: "pdf" | "docx" | "txt"; category: DocumentCategory }) => Promise<void>;
}

export const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, onUpload }) => {
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<DocumentCategory>("contract");
  const [docType, setDocType] = useState<"pdf" | "docx" | "txt">("docx");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setName(file.name);
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (extension === "pdf") setDocType("pdf");
    else if (extension === "docx") setDocType("docx");
    else setDocType("txt");

    const reader = new FileReader();
    if (extension === "pdf" || extension === "docx") {
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setContent(text || "");
      };
      reader.readAsDataURL(file);
    } else {
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setContent(text ? text.replace(/\0/g, "").replace(/\\u0000/g, "") : `Contract document ingested: ${file.name}`);
      };
      reader.readAsText(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setName(file.name);
      const extension = file.name.split(".").pop()?.toLowerCase();
      if (extension === "pdf") setDocType("pdf");
      else if (extension === "docx") setDocType("docx");
      else setDocType("txt");

      const reader = new FileReader();
      if (extension === "pdf" || extension === "docx") {
        reader.onload = (event) => {
          const text = event.target?.result as string;
          setContent(text || "");
        };
        reader.readAsDataURL(file);
      } else {
        reader.onload = (event) => {
          const text = event.target?.result as string;
          setContent(text ? text.replace(/\0/g, "").replace(/\\u0000/g, "") : `Ingested document: ${file.name}`);
        };
        reader.readAsText(file);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !content.trim()) return;
    setIsSubmitting(true);
    try {
      await onUpload({ name, content, type: docType, category });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 font-serif">
                Ingest Legal Document / Contract
              </h3>
              <p className="text-xs text-slate-500">
                Supports NDA, MSA, Employment Agreements, Case Law, and Briefs
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Drag and Drop Zone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
              dragActive ? "border-indigo-600 bg-indigo-50/50" : "border-slate-300 hover:border-slate-400 bg-slate-50/40"
            }`}
          >
            <Upload className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-800">
              Drag & Drop PDF, Word (.docx), or Text (.txt) files here
            </p>
            <p className="text-[11px] text-slate-500 mt-1">or choose from your computer</p>
            <label className="mt-3 inline-block px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg text-xs font-medium text-slate-700 cursor-pointer shadow-2xs">
              <span>Browse File</span>
              <input
                type="file"
                accept=".pdf,.docx,.txt,.doc"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Document Title:
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Master_Services_Agreement_2025.docx"
                required
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Document Classification:
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as DocumentCategory)}
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
              >
                <option value="contract">Commercial Contract / Agreement</option>
                <option value="case_law">Court Decision / Case Law</option>
                <option value="statute">Statutory Code / Regulation</option>
                <option value="brief">Litigation Brief / Motion</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Document Text / Clause Content:
            </label>
            <textarea
              value={content.startsWith("data:") ? `[${name} loaded (${Math.round((content.length * 3 / 4) / 1024) || 1} KB) - Legal text & OCR extraction will be performed upon ingestion]` : content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste contract text, clauses, or court opinion text here..."
              required
              className="w-full h-36 p-3 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Modal Footer */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim() || !content.trim()}
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-xs transition-colors flex items-center space-x-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isSubmitting ? "Ingesting..." : "Ingest & Index Document"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
