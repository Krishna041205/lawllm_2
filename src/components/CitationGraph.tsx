import React, { useState } from "react";
import { CitationGraphData, CitationNode, CitationEdge } from "../types";
import {
  Network,
  BookOpen,
  Scale,
  FileCheck,
  RefreshCw,
  Info,
  Layers,
  ZoomIn,
  ZoomOut
} from "lucide-react";

interface CitationGraphProps {
  graphData: CitationGraphData | null;
  isLoading: boolean;
  onRefreshGraph: () => void;
  documentTitle: string;
}

export const CitationGraph: React.FC<CitationGraphProps> = ({
  graphData,
  isLoading,
  onRefreshGraph,
  documentTitle
}) => {
  const [selectedNode, setSelectedNode] = useState<CitationNode | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [activeFilter, setActiveFilter] = useState<string>("All");

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-xs">
        <div className="w-16 h-16 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin mb-4" />
        <h3 className="text-lg font-bold text-slate-900 font-serif">
          Constructing Legal Authority Knowledge Graph
        </h3>
        <p className="text-xs text-slate-600 max-w-sm mt-1">
          Mapping judicial citations, precedential relationships, statutory references, and distinguishing treatments...
        </p>
      </div>
    );
  }

  const nodes = graphData?.nodes || [];
  const edges = graphData?.edges || [];

  // Compute node layout positions in a circular or organic arrangement
  const width = 760;
  const height = 480;
  const centerX = width / 2;
  const centerY = height / 2;

  const positionedNodes = nodes.map((node, idx) => {
    if (idx === 0 || node.type === "current_doc") {
      return { ...node, x: centerX, y: centerY };
    }
    const angle = ((idx - 1) / Math.max(1, nodes.length - 1)) * 2 * Math.PI;
    const radius = 170 + (idx % 2 === 0 ? 30 : -20);
    return {
      ...node,
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle)
    };
  });

  const getNodeColor = (type: string) => {
    switch (type) {
      case "current_doc":
        return { fill: "#4f46e5", stroke: "#312e81", text: "#ffffff", badge: "bg-indigo-600 text-white" };
      case "precedent_case":
        return { fill: "#0284c7", stroke: "#075985", text: "#ffffff", badge: "bg-sky-100 text-sky-800" };
      case "statute":
        return { fill: "#d97706", stroke: "#92400e", text: "#ffffff", badge: "bg-amber-100 text-amber-800" };
      case "regulation":
        return { fill: "#059669", stroke: "#065f46", text: "#ffffff", badge: "bg-emerald-100 text-emerald-800" };
      default:
        return { fill: "#64748b", stroke: "#334155", text: "#ffffff", badge: "bg-slate-100 text-slate-700" };
    }
  };

  const filteredNodes = activeFilter === "All"
    ? positionedNodes
    : positionedNodes.filter((n) => n.type === activeFilter || n.type === "current_doc");

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100">
            Interactive Precedent & Citation Graph
          </span>
          <h2 className="text-2xl font-bold text-slate-900 font-serif mt-2">
            Authority Network Map
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            Visualizing citation lineages, statutory anchors, and judicial precedents referenced in{" "}
            <span className="font-semibold text-slate-800">{documentTitle}</span>
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={onRefreshGraph}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Re-Generate Graph</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main SVG Graph Canvas */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between relative overflow-hidden">
          {/* Controls Bar */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 z-10">
            <div className="flex items-center space-x-1.5 overflow-x-auto">
              <span className="text-xs font-bold text-slate-700 mr-1">Filter:</span>
              {[
                { id: "All", label: "All Nodes" },
                { id: "precedent_case", label: "Precedents" },
                { id: "statute", label: "Statutes" },
                { id: "regulation", label: "Regulations" }
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setActiveFilter(f.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                    activeFilter === f.id
                      ? "bg-slate-900 text-white font-semibold"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="flex items-center space-x-1">
              <button
                onClick={() => setZoomLevel((z) => Math.max(0.7, z - 0.1))}
                className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-[11px] font-mono text-slate-500">{Math.round(zoomLevel * 100)}%</span>
              <button
                onClick={() => setZoomLevel((z) => Math.min(1.4, z + 0.1))}
                className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Graph SVG Canvas */}
          <div className="w-full h-[460px] flex items-center justify-center overflow-hidden bg-slate-50/50 rounded-xl relative">
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="w-full h-full cursor-grab active:cursor-grabbing transition-transform duration-300"
              style={{ transform: `scale(${zoomLevel})` }}
            >
              <defs>
                <marker
                  id="arrow"
                  viewBox="0 0 10 10"
                  refX="22"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
                </marker>
              </defs>

              {/* Draw Edges */}
              {edges.map((edge, idx) => {
                const sourceNode = positionedNodes.find((n) => n.id === edge.source) || positionedNodes[0];
                const targetNode = positionedNodes.find((n) => n.id === edge.target) || positionedNodes[idx % positionedNodes.length];
                if (!sourceNode || !targetNode) return null;

                return (
                  <g key={edge.id || idx}>
                    <line
                      x1={sourceNode.x}
                      y1={sourceNode.y}
                      x2={targetNode.x}
                      y2={targetNode.y}
                      stroke="#cbd5e1"
                      strokeWidth="2"
                      strokeDasharray={edge.label === "distinguishes" ? "4 4" : undefined}
                      markerEnd="url(#arrow)"
                    />
                    <text
                      x={(sourceNode.x! + targetNode.x!) / 2}
                      y={(sourceNode.y! + targetNode.y!) / 2 - 6}
                      fill="#64748b"
                      fontSize="9"
                      fontWeight="600"
                      textAnchor="middle"
                      className="select-none bg-white px-1"
                    >
                      {edge.label}
                    </text>
                  </g>
                );
              })}

              {/* Draw Nodes */}
              {filteredNodes.map((node) => {
                const colors = getNodeColor(node.type);
                const isSelected = selectedNode?.id === node.id;
                const isRoot = node.id === "root" || node.type === "current_doc";

                return (
                  <g
                    key={node.id}
                    onClick={() => setSelectedNode(node)}
                    className="cursor-pointer transition-transform hover:scale-105"
                  >
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={isRoot ? 32 : 24}
                      fill={colors.fill}
                      stroke={isSelected ? "#f59e0b" : colors.stroke}
                      strokeWidth={isSelected ? 4 : 2}
                      className="shadow-md"
                    />
                    <text
                      x={node.x}
                      y={node.y! + 4}
                      fill={colors.text}
                      fontSize={isRoot ? "11" : "9"}
                      fontWeight="bold"
                      textAnchor="middle"
                      className="select-none pointer-events-none"
                    >
                      {node.label.length > 12 ? node.label.slice(0, 11) + "…" : node.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <div className="flex items-center space-x-3">
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block" />
                <span>Current Document</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-600 inline-block" />
                <span>Precedent Case</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-600 inline-block" />
                <span>Statute / Code</span>
              </span>
            </div>
            <span>Click any node for legal holding details</span>
          </div>
        </div>

        {/* Right Column: Node Details Inspector */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 font-serif flex items-center space-x-2">
            <BookOpen className="w-4 h-4 text-indigo-600" />
            <span>Authority Inspector</span>
          </h3>

          {selectedNode ? (
            <div className="space-y-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getNodeColor(selectedNode.type).badge}`}>
                    {selectedNode.type.replace("_", " ").toUpperCase()}
                  </span>
                  <span className="font-mono text-slate-500">{selectedNode.year || "2024"}</span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 font-serif">
                  {selectedNode.label}
                </h4>
                {selectedNode.court && (
                  <p className="text-[11px] text-slate-600">Court: {selectedNode.court}</p>
                )}
              </div>

              {selectedNode.summary && (
                <div className="space-y-1">
                  <span className="font-bold text-slate-700">Legal Summary & Treatment:</span>
                  <p className="text-slate-600 leading-relaxed bg-white p-3 rounded-lg border border-slate-200">
                    {selectedNode.summary}
                  </p>
                </div>
              )}

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="font-bold text-slate-700 block">Connected Citation Lineage:</span>
                {edges
                  .filter((e) => e.source === selectedNode.id || e.target === selectedNode.id)
                  .map((e, idx) => (
                    <div key={idx} className="p-2 rounded bg-indigo-50/50 border border-indigo-100 text-[11px]">
                      <span className="font-semibold text-indigo-900">Treatment: </span>
                      <span className="font-mono text-indigo-700">{e.label}</span>
                    </div>
                  ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500 space-y-2">
              <Info className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs">
                Select any node in the citation graph to view its court, jurisdiction, and legal principle treatment.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
