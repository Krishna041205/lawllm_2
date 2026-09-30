import React, { useState, useRef, useEffect } from "react";
import { ChatMessage, Citation, DocumentItem } from "../types";
import {
  MessageSquareText,
  Send,
  Sparkles,
  Bot,
  User,
  FileCheck,
  ExternalLink,
  BookOpen,
  ArrowUpRight,
  Copy,
  Check,
  Search
} from "lucide-react";

interface LegalRAGChatProps {
  messages: ChatMessage[];
  onSendMessage: (prompt: string) => Promise<void>;
  isLoading: boolean;
  documents: DocumentItem[];
  selectedDocumentId: string | null;
  onSelectDocument: (id: string | null) => void;
}

export const LegalRAGChat: React.FC<LegalRAGChatProps> = ({
  messages,
  onSendMessage,
  isLoading,
  documents,
  selectedDocumentId,
  onSelectDocument
}) => {
  const [input, setInput] = useState("");
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selectedDoc = documents.find((d) => d.id === selectedDocumentId);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const promptToSend = input;
    setInput("");
    onSendMessage(promptToSend);
  };

  const handleQuickPrompt = (prompt: string) => {
    if (isLoading) return;
    onSendMessage(prompt);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Find relevant text chunk for active citation
  const findCitationSnippet = (citation: Citation) => {
    if (citation.quote) return citation.quote;
    const doc = documents.find((d) => d.name.toLowerCase().includes(citation.sourceTitle.toLowerCase()));
    if (!doc || !doc.chunks) return "Source document context referenced by LexiMind.";
    const chunk = doc.chunks.find((c) => c.page === citation.page) || doc.chunks[0];
    return chunk ? chunk.text : "Referenced page section in record.";
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[680px]">
      {/* Main Chat Stream */}
      <div className="lg:col-span-2 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Chat Header */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
              <MessageSquareText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 font-serif">
                Legal RAG Research Assistant
              </h3>
              <p className="text-xs text-slate-600">
                Grounded strictly in {selectedDoc ? selectedDoc.name : "all active repository records"}
              </p>
            </div>
          </div>

          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Citation Verification Active</span>
          </span>
        </div>

        {/* Message Stream */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4 max-h-[500px]">
          {messages.length === 0 ? (
            <div className="text-center py-10 px-4 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                <Sparkles className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-slate-900 font-serif">
                Query Legal Documents with Exact Citations
              </h4>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                Ask targeted legal inquiries regarding trade secret standards, indemnification clauses, non-compete enforceability, or termination rules.
              </p>

              {/* Sample Quick Questions */}
              <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-left max-w-lg mx-auto">
                {[
                  "Under what exceptions can a court interfere with the invocation of an unconditional bank guarantee?",
                  "What did the court hold in the appellate decision?",
                  "What is the limitation of liability cap?",
                  "Is the non-compete clause legally enforceable?"
                ].map((q, i) => (
                  <button
                    key={i}
                    onClick={() => handleQuickPrompt(q)}
                    className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 text-slate-800 hover:text-indigo-900 text-xs text-left transition-colors flex items-center justify-between group"
                  >
                    <span className="line-clamp-2">{q}</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 shrink-0 ml-1" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex space-x-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 rounded-lg bg-indigo-900 text-amber-400 flex items-center justify-center shrink-0 shadow-2xs">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed space-y-2 ${
                    msg.role === "user"
                      ? "bg-indigo-600 text-white rounded-br-none shadow-xs"
                      : "bg-slate-50 border border-slate-200 text-slate-800 rounded-bl-none shadow-2xs"
                  }`}
                >
                  <div className="flex items-center justify-between pb-1 border-b border-black/5">
                    <span className="font-bold opacity-75 text-[10px] uppercase tracking-wider">
                      {msg.role === "user" ? "You (Counsel)" : "LexiMind Legal Engine"}
                    </span>
                    <button
                      onClick={() => handleCopy(msg.content, msg.id)}
                      className="opacity-70 hover:opacity-100 transition-opacity"
                      title="Copy message"
                    >
                      {copiedId === msg.id ? (
                        <Check className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>

                  <div className="prose prose-slate text-xs max-w-none whitespace-pre-line">
                    {msg.content}
                  </div>

                  {/* Grounded Citation Chips */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="pt-2 border-t border-slate-200/60 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                        Verified Legal Source Citations:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.citations.map((c, idx) => (
                          <button
                            key={idx}
                            onClick={() => setActiveCitation(c)}
                            className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-100/70 text-indigo-900 hover:bg-indigo-200 border border-indigo-200/80 transition-colors"
                          >
                            <BookOpen className="w-3 h-3 text-indigo-600" />
                            <span>
                              {c.sourceTitle}, Page {c.page}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {msg.role === "user" && (
                  <div className="w-8 h-8 rounded-lg bg-slate-800 text-white flex items-center justify-center shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))
          )}

          {isLoading && (
            <div className="flex space-x-3 items-center text-xs text-slate-500">
              <div className="w-8 h-8 rounded-lg bg-indigo-900 text-amber-400 flex items-center justify-center shrink-0 animate-pulse">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
                <span>Scanning document vectors and generating grounded citations...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSubmit} className="p-3 border-t border-slate-200 bg-white">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask any legal question (e.g. Does the agreement have reciprocal indemnification?)..."
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden text-slate-900"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center space-x-1.5 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Query</span>
            </button>
          </div>
        </form>
      </div>

      {/* Right Column: Grounded Citation & Context Inspector */}
      <div className="space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-900 font-serif flex items-center space-x-2">
              <BookOpen className="w-4 h-4 text-indigo-600" />
              <span>Citation Context Inspector</span>
            </h4>
            {activeCitation && (
              <button
                onClick={() => setActiveCitation(null)}
                className="text-[11px] text-slate-600 hover:text-slate-900 font-medium"
              >
                Clear
              </button>
            )}
          </div>

          {activeCitation ? (
            <div className="space-y-3">
              <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl">
                <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider block">
                  Cited Document
                </span>
                <p className="text-xs font-bold text-indigo-950 mt-0.5">
                  {activeCitation.sourceTitle}
                </p>
                <p className="text-[11px] text-indigo-700 font-medium">
                  Page Reference: Page {activeCitation.page}
                </p>
                {activeCitation.similarityScore !== undefined && (
                  <div className="mt-2 pt-2 border-t border-indigo-200/60 flex items-center justify-between text-[10px]">
                    <span className="font-semibold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded">
                      Cosine Match: {(activeCitation.similarityScore * 100).toFixed(1)}%
                    </span>
                    {activeCitation.chunkId && (
                      <span className="text-indigo-600 font-mono">
                        Chunk #{activeCitation.chunkId.slice(0, 8)}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  Raw Document Chunk Text:
                </span>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 leading-relaxed max-h-60 overflow-y-auto">
                  {findCitationSnippet(activeCitation)}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-600 space-y-2">
              <Search className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs">
                Click any citation tag in the chat to inspect the verified source text chunk and page reference.
              </p>
            </div>
          )}
        </div>

        {/* Available Vector Documents */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider text-slate-600">
              Active Search Scope
            </h4>
            <span className="text-[10px] text-indigo-600 font-medium">
              {selectedDocumentId ? "Scoped" : "Whole Repository"}
            </span>
          </div>
          <div className="space-y-2">
            <div
              onClick={() => onSelectDocument(null)}
              className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-colors flex items-center justify-between ${
                !selectedDocumentId
                  ? "bg-indigo-50 border-indigo-200 font-semibold text-indigo-900 shadow-2xs"
                  : "bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100"
              }`}
            >
              <div className="flex items-center space-x-2 truncate">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span className="truncate">All Documents (Global Vector Search)</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-white text-indigo-700 border border-indigo-200 shrink-0 ml-2">
                All Records
              </span>
            </div>

            {documents.map((doc) => (
              <div
                key={doc.id}
                onClick={() => onSelectDocument(doc.id === selectedDocumentId ? null : doc.id)}
                className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-colors flex items-center justify-between ${
                  doc.id === selectedDocumentId
                    ? "bg-indigo-50 border-indigo-200 font-semibold text-indigo-900 shadow-2xs"
                    : "bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center space-x-2 truncate">
                  <FileCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span className="truncate">{doc.name}</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-white text-slate-700 border border-slate-200 shrink-0 ml-2">
                  {doc.pageCount} Pages
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
