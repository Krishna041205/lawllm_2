import React, { useState } from "react";
import { TimelineEvent } from "../types";
import {
  CalendarDays,
  Clock,
  Filter,
  Search,
  AlertTriangle,
  FileText,
  Gavel,
  RefreshCw,
  Tag
} from "lucide-react";

interface TimelineBuilderProps {
  events: TimelineEvent[];
  isLoading: boolean;
  onRefreshTimeline: () => void;
  documentTitle: string;
}

export const TimelineBuilder: React.FC<TimelineBuilderProps> = ({
  events,
  isLoading,
  onRefreshTimeline,
  documentTitle
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-xs">
        <div className="w-16 h-16 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin mb-4" />
        <h3 className="text-lg font-bold text-slate-900 font-serif">
          Extracting Chronological Litigation Timeline
        </h3>
        <p className="text-xs text-slate-600 max-w-sm mt-1">
          Identifying dates, filings, notice deadlines, breach events, and procedural milestones...
        </p>
      </div>
    );
  }

  const getSeverityStyle = (sev: string) => {
    switch (sev.toLowerCase()) {
      case "critical":
        return { badge: "bg-rose-100 text-rose-800 border-rose-200", dot: "bg-rose-500 ring-rose-100" };
      case "high":
        return { badge: "bg-amber-100 text-amber-800 border-amber-200", dot: "bg-amber-500 ring-amber-100" };
      case "medium":
        return { badge: "bg-blue-100 text-blue-800 border-blue-200", dot: "bg-blue-500 ring-blue-100" };
      default:
        return { badge: "bg-slate-100 text-slate-700 border-slate-200", dot: "bg-slate-500 ring-slate-100" };
    }
  };

  const filteredEvents = events.filter((ev) => {
    const matchSearch =
      ev.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ev.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ev.date.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = selectedCategory === "All" || ev.category.toLowerCase().includes(selectedCategory.toLowerCase());
    return matchSearch && matchCategory;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100">
            Litigation & Procedural Chronology
          </span>
          <h2 className="text-2xl font-bold text-slate-900 font-serif mt-2">
            Chronological Timeline Builder
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            Sequenced timeline of key litigation filings, contractual obligations, and court orders in{" "}
            <span className="font-semibold text-slate-800">{documentTitle}</span>
          </p>
        </div>

        <button
          onClick={onRefreshTimeline}
          className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs transition-colors shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Re-Extract Timeline</span>
        </button>
      </div>

      {/* Filter & Search Controls */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search dates, filings, or parties..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto overflow-x-auto">
          <Filter className="w-4 h-4 text-slate-500 shrink-0" />
          <span className="text-xs font-bold text-slate-700 shrink-0">Category:</span>
          {["All", "Filing", "Contract", "Breach", "Judgment", "Deadline"].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors shrink-0 ${
                selectedCategory === cat
                  ? "bg-indigo-600 text-white font-semibold"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline Stream */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-12 text-slate-500 space-y-2">
            <CalendarDays className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">No matching timeline events found</p>
            <p className="text-xs text-slate-500">
              Try adjusting your filter or search criteria.
            </p>
          </div>
        ) : (
          <div className="relative pl-6 sm:pl-8 border-l-2 border-slate-200 space-y-8 my-2">
            {filteredEvents.map((event, idx) => {
              const sev = getSeverityStyle(event.severity);
              return (
                <div key={event.id || idx} className="relative group">
                  {/* Timeline node dot */}
                  <div
                    className={`absolute -left-[31px] sm:-left-[39px] top-1.5 w-4 h-4 rounded-full border-2 border-white ring-4 ${sev.dot} transition-transform group-hover:scale-125`}
                  />

                  {/* Event card */}
                  <div className="bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200 p-5 shadow-2xs transition-all space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs font-bold text-indigo-900 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-200">
                          {event.date}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900 font-serif">
                          {event.title}
                        </h4>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${sev.badge}`}>
                          {event.severity.toUpperCase()}
                        </span>
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-200">
                          {event.category}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed pt-1">
                      {event.description}
                    </p>

                    {event.entityInvolved && (
                      <div className="pt-2 flex items-center space-x-1.5 text-[11px] text-slate-500">
                        <Tag className="w-3 h-3 text-slate-400" />
                        <span>Parties involved: <strong className="text-slate-700">{event.entityInvolved}</strong></span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
