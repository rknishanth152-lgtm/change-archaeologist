/**
 * Change Archaeologist — Production-Test Correlation Graph Component
 *
 * Interactive forensic evidence graph built on @xyflow/react.
 * Strictly derives visual elements from AnalysisReport data without inventing
 * intermediate history, synthetic dependencies, or runtime causality.
 */

import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  type Node,
  type Edge,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import {
  Network,
  ListFilter,
  Eye,
  AlertOctagon,
  Maximize2,
  Info,
  X,
  Search,
  Crosshair,
  Map as MapIcon,
  HelpCircle,
} from "lucide-react";
import type {
  AnalysisReport,
  CorrelationGraphNode,
  CorrelationGraphEdge,
  CorrelationStatus,
} from "../types/index.js";
import { buildCorrelationGraphModel } from "../utils/graph-model.js";
import {
  explainCorrelation,
  explainStructuralChange,
  explainTestChange,
} from "../utils/explanation-helpers.js";
import {
  ProductionFunctionNode,
  StructuralChangeNode,
  TestChangeNode,
  TestDeclarationNode,
  TestFileNode,
} from "./graph/CustomNodes.js";
import { ContainmentEdge, CorrelationEdge } from "./graph/CustomEdges.js";
import { GraphLegend } from "./graph/GraphLegend.js";
import { Badge } from "./ui/Badge.js";
import { GraphAccessibleView } from "./graph/GraphAccessibleView.js";
import {
  GlyphMark,
  GlyphCorrStrong,
  GlyphCorrWeak,
  GlyphCorrUncertain,
  GlyphCorrNone,
  GlyphEvidencePin,
} from "./icons/ArchaeologistGlyphs.js";

// Custom node and edge type mapping
const nodeTypes = {
  productionFunction: ProductionFunctionNode,
  structuralChange: StructuralChangeNode,
  testChange: TestChangeNode,
  testDeclaration: TestDeclarationNode,
  testFile: TestFileNode,
};

const edgeTypes = {
  containment: ContainmentEdge,
  correlation: CorrelationEdge,
};

interface CorrelationGraphProps {
  readonly report: AnalysisReport;
  readonly selectedChangeId: string | null;
  readonly selectedTestChangeId: string | null;
  readonly selectedEvidenceId: string | null;
  readonly selectedCorrelationId: string | null;
  readonly onSelectChange: (changeId: string) => void;
  readonly onSelectTestChange: (testChangeId: string) => void;
  readonly onSelectEvidence: (evidenceId: string) => void;
  readonly onSelectCorrelation: (correlationId: string) => void;
}

export const CorrelationGraph: React.FC<CorrelationGraphProps> = ({
  report,
  selectedChangeId,
  selectedTestChangeId,
  selectedEvidenceId,
  selectedCorrelationId,
  onSelectChange,
  onSelectTestChange,
  onSelectEvidence,
  onSelectCorrelation,
}) => {
  const [viewMode, setViewMode] = useState<"visual" | "accessible">("visual");
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
  const [isExplainerDismissed, setIsExplainerDismissed] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | CorrelationStatus>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<"ALL" | "PROD" | "TEST" | "CORR">("ALL");
  const [showMinimap, setShowMinimap] = useState(true);
  const [showLegend, setShowLegend] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  // Derive presentation graph model
  const model = useMemo(() => buildCorrelationGraphModel(report), [report]);

  // Derive plain-English explanation for currently selected graph item
  const activeExplanation = useMemo(() => {
    if (selectedCorrelationId) {
      const corr = report.correlationItems?.find((c) => c.id === selectedCorrelationId);
      if (corr) return explainCorrelation(corr, report.request.targetFunctionName);
    }
    if (selectedChangeId) {
      const sc = report.structuralChanges.find((s) => s.id === selectedChangeId);
      if (sc) return explainStructuralChange(sc, report.request.targetFunctionName);
    }
    if (selectedTestChangeId) {
      const tc = report.testChanges.find((t) => t.id === selectedTestChangeId);
      if (tc) return explainTestChange(tc, report.request.targetFunctionName);
    }
    return null;
  }, [report, selectedCorrelationId, selectedChangeId, selectedTestChangeId]);

  // Active correlation object if an edge is selected
  const activeCorrelation = useMemo(() => {
    if (!selectedCorrelationId || !report.correlationItems) return null;
    return report.correlationItems.find((c) => c.id === selectedCorrelationId) ?? null;
  }, [report.correlationItems, selectedCorrelationId]);

  // Reset dismissed state whenever selection changes
  useEffect(() => {
    setIsExplainerDismissed(false);
  }, [selectedCorrelationId, selectedChangeId, selectedTestChangeId]);

  // Identify 1-hop connected nodes for Focus Mode
  const focusedNodeIds = useMemo<Set<string> | null>(() => {
    if (!isFocusMode) return null;
    const activeNodes = new Set<string>();

    if (selectedChangeId) {
      const scNodeId = `node-sc-${selectedChangeId}`;
      activeNodes.add(scNodeId);
      activeNodes.add("node-target-fn"); // Parent function
      // Find connected test nodes via correlation edges
      model.edges.forEach((edge) => {
        if (edge.source === scNodeId) activeNodes.add(edge.target);
        if (edge.target === scNodeId) activeNodes.add(edge.source);
      });
    } else if (selectedTestChangeId) {
      const tcNodeId = `node-tc-${selectedTestChangeId}`;
      activeNodes.add(tcNodeId);
      // Find parent test file and connected structural nodes
      model.edges.forEach((edge) => {
        if (edge.source === tcNodeId) activeNodes.add(edge.target);
        if (edge.target === tcNodeId) activeNodes.add(edge.source);
      });
    } else if (selectedCorrelationId) {
      const corrEdge = model.edges.find((e) => e.id.includes(selectedCorrelationId));
      if (corrEdge) {
        activeNodes.add(corrEdge.source);
        activeNodes.add(corrEdge.target);
        activeNodes.add("node-target-fn");
      }
    }

    return activeNodes.size > 0 ? activeNodes : null;
  }, [isFocusMode, selectedChangeId, selectedTestChangeId, selectedCorrelationId, model.edges]);

  // Derive filtered and dimmed nodes based on Focus Mode and Search/Filter criteria
  const initialNodes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return model.nodes.map((node) => {
      let isSelected = false;
      if (node.data.category === "STRUCTURAL_CHANGE") {
        isSelected = selectedChangeId === node.data.entityId;
      } else if (node.data.category === "TEST_CHANGE") {
        isSelected = selectedTestChangeId === node.data.entityId;
      }

      // 1. Focus Mode filtering
      let isDimmed = false;
      if (focusedNodeIds && !focusedNodeIds.has(node.id)) {
        isDimmed = true;
      }

      // 2. Search filtering
      if (q && !isDimmed) {
        const matchesQuery =
          node.data.title.toLowerCase().includes(q) ||
          node.data.subtitle.toLowerCase().includes(q) ||
          node.data.filePath.toLowerCase().includes(q) ||
          node.data.entityId.toLowerCase().includes(q);
        if (!matchesQuery) isDimmed = true;
      }

      // 3. Category filtering
      if (categoryFilter !== "ALL" && !isDimmed) {
        if (categoryFilter === "PROD" && node.data.category !== "PRODUCTION_FUNCTION" && node.data.category !== "STRUCTURAL_CHANGE") {
          isDimmed = true;
        } else if (categoryFilter === "TEST" && node.data.category !== "TEST_FILE" && node.data.category !== "TEST_CHANGE" && node.data.category !== "TEST_DECLARATION") {
          isDimmed = true;
        } else if (categoryFilter === "CORR" && !node.data.correlationStatus) {
          isDimmed = true;
        }
      }

      // 4. Status filtering
      if (statusFilter !== "ALL" && !isDimmed) {
        if (node.data.correlationStatus !== statusFilter) {
          // Keep target function visible as anchor
          if (node.data.category !== "PRODUCTION_FUNCTION") {
            isDimmed = true;
          }
        }
      }

      return {
        ...node,
        selected: isSelected,
        data: {
          ...node.data,
          isDimmed,
        },
      };
    });
  }, [model.nodes, selectedChangeId, selectedTestChangeId, focusedNodeIds, searchQuery, categoryFilter, statusFilter]);

  // Derive filtered and dimmed edges based on Focus Mode
  const initialEdges = useMemo(() => {
    return model.edges.map((edge) => {
      let isSelected = false;
      if (edge.data.category === "CORRELATED_WITH" && selectedCorrelationId) {
        isSelected = edge.id.includes(selectedCorrelationId);
      }

      let isDimmed = false;
      if (focusedNodeIds) {
        // Edge is dimmed if either endpoint is not focused
        if (!focusedNodeIds.has(edge.source) || !focusedNodeIds.has(edge.target)) {
          isDimmed = true;
        }
      } else if (statusFilter !== "ALL") {
        if (edge.data.category === "CORRELATED_WITH" && edge.data.status !== statusFilter) {
          isDimmed = true;
        }
      }

      return {
        ...edge,
        selected: isSelected,
        data: {
          ...edge.data,
          isDimmed,
        },
      };
    });
  }, [model.edges, selectedCorrelationId, focusedNodeIds, statusFilter]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes as unknown as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges as unknown as Edge[]);

  useEffect(() => {
    setNodes(initialNodes as unknown as Node[]);
  }, [initialNodes, setNodes]);

  useEffect(() => {
    setEdges(initialEdges as unknown as Edge[]);
  }, [initialEdges, setEdges]);

  // Automatically recalculate viewport when report changes or instance mounts
  useEffect(() => {
    if (!rfInstance) return;
    const isReduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = setTimeout(() => {
      rfInstance.fitView({
        padding: 0.12,
        minZoom: 0.65,
        maxZoom: 1.15,
        duration: isReduced ? 0 : 250,
      });
    }, 60);
    return () => clearTimeout(timer);
  }, [rfInstance, report]);

  // Automatically recalculate viewport when container size changes
  useEffect(() => {
    if (!containerRef.current || !rfInstance) return;
    const ro = new ResizeObserver(() => {
      rfInstance.fitView({
        padding: 0.12,
        minZoom: 0.65,
        maxZoom: 1.15,
      });
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [rfInstance]);

  // Responsive default: switch to Accessible View on narrow screens (< 768px)
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setViewMode("accessible");
    }
  }, []);

  // Node selection handler
  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const graphNode = node as unknown as CorrelationGraphNode;
      if (graphNode.data.category === "STRUCTURAL_CHANGE") {
        onSelectChange(graphNode.data.entityId);
        if (graphNode.data.evidenceIds.length > 0) {
          onSelectEvidence(graphNode.data.evidenceIds[0]);
        }
      } else if (graphNode.data.category === "TEST_CHANGE") {
        onSelectTestChange(graphNode.data.entityId);
        if (graphNode.data.evidenceIds.length > 0) {
          onSelectEvidence(graphNode.data.evidenceIds[0]);
        }
      }
    },
    [onSelectChange, onSelectTestChange, onSelectEvidence]
  );

  // Edge selection handler
  const handleEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      const graphEdge = edge as unknown as CorrelationGraphEdge;
      if (graphEdge.data.category === "CORRELATED_WITH") {
        const matchedCorr = report.correlationItems?.find(
          (c) =>
            c.structuralChangeId === graphEdge.data.sourceEntityId &&
            c.testChangeId === graphEdge.data.targetEntityId
        );
        if (matchedCorr) {
          onSelectCorrelation(matchedCorr.id);
          if (matchedCorr.evidenceIds.length > 0) {
            onSelectEvidence(matchedCorr.evidenceIds[0]);
          }
        }
      }
    },
    [report.correlationItems, onSelectCorrelation, onSelectEvidence]
  );

  const handleFitView = useCallback(() => {
    const isReduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    rfInstance?.fitView({
      padding: 0.12,
      minZoom: 0.65,
      maxZoom: 1.15,
      duration: isReduced ? 0 : 250,
    });
  }, [rfInstance]);

  // Focus mode target ID string for clear banner description
  const activeFocusSubject = selectedChangeId ?? selectedTestChangeId ?? (selectedCorrelationId ? `Link ${selectedCorrelationId}` : null);

  return (
    <div ref={containerRef} className="flex flex-col h-full bg-ground text-text-primary">
      {/* 1. Header Toolbar */}
      <div className="h-10 border-b border-hairline px-4 bg-panel flex items-center justify-between font-mono text-xs select-none shrink-0 gap-2 overflow-hidden">
        <div className="flex items-center space-x-2 truncate">
          <Network size={15} className="text-text-accent shrink-0" />
          <span className="font-semibold text-text-primary truncate">
            Production-Test Correlation Graph
          </span>
          <span className="text-[10px] text-text-muted px-1.5 py-0.5 rounded-xs bg-ground border border-hairline hidden sm:inline-block shrink-0">
            {report.baseCommit.sha.slice(0, 7)} → {report.headCommit.sha.slice(0, 7)}
          </span>
        </div>

        {/* View Mode Toggle, Fit View & Metrics */}
        <div className="flex items-center space-x-2 shrink-0">
          <span className="text-[11px] text-text-muted hidden lg:inline-block tabular-nums px-2 py-0.5 rounded-xs bg-ground border border-hairline">
            {model.summary.productionNodeCount} Prod / {model.summary.testNodeCount} Test /{" "}
            {model.summary.correlationEdgeCount} Corr
          </span>

          {viewMode === "visual" && (
            <>
              {/* Focus Mode Toggle Button */}
              <button
                type="button"
                onClick={() => setIsFocusMode(!isFocusMode)}
                aria-pressed={isFocusMode}
                className={`px-2 py-0.5 rounded-xs transition-colors flex items-center space-x-1 border focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus cursor-pointer ${
                  isFocusMode
                    ? "bg-text-accent text-white border-text-accent font-semibold"
                    : "text-text-muted hover:text-text-primary hover:bg-surface-elevated border-hairline"
                }`}
                title={
                  isFocusMode
                    ? "Exit Focus Mode"
                    : activeFocusSubject
                    ? `Focus 1-hop network for ${activeFocusSubject}`
                    : "Select a node to isolate its 1-hop evidence network"
                }
              >
                <Crosshair size={12} />
                <span>Focus Mode</span>
              </button>

              {/* Fit View Button */}
              <button
                type="button"
                onClick={handleFitView}
                aria-label="Fit view to all nodes"
                className="px-2 py-0.5 rounded-xs transition-colors flex items-center space-x-1 text-text-muted hover:text-text-primary hover:bg-surface-elevated border border-hairline focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus cursor-pointer"
                title="Reset viewport to fit all nodes cleanly"
              >
                <Maximize2 size={12} />
                <span>Fit View</span>
              </button>
            </>
          )}

          <div className="flex items-center bg-ground p-0.5 rounded-sm border border-hairline">
            <button
              type="button"
              onClick={() => setViewMode("visual")}
              aria-pressed={viewMode === "visual"}
              className={`px-2 py-0.5 rounded-xs transition-colors flex items-center space-x-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus cursor-pointer ${
                viewMode === "visual"
                  ? "bg-surface-elevated text-text-primary font-semibold shadow-xs"
                  : "text-text-muted hover:text-text-secondary"
              }`}
            >
              <Eye size={12} />
              <span>Visual Graph</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("accessible")}
              aria-pressed={viewMode === "accessible"}
              className={`px-2 py-0.5 rounded-xs transition-colors flex items-center space-x-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus cursor-pointer ${
                viewMode === "accessible"
                  ? "bg-surface-elevated text-text-primary font-semibold shadow-xs"
                  : "text-text-muted hover:text-text-secondary"
              }`}
            >
              <ListFilter size={12} />
              <span>Accessible View</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Sub-Toolbar: Search and Quick Filter Chips */}
      <div className="min-h-[38px] border-b border-hairline px-4 py-1.5 bg-ground flex flex-wrap items-center justify-between font-mono text-[11px] gap-2 select-none shrink-0">
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Search Input */}
          <div className="relative flex items-center">
            <Search size={12} className="absolute left-2.5 text-text-muted pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search nodes or coordinates..."
              className="pl-7 pr-6 py-1 rounded-xs bg-panel border border-hairline text-[11px] text-text-primary placeholder:text-text-muted/70 focus:outline-none focus-visible:ring-1 focus-visible:ring-border-focus w-44 sm:w-56 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-1.5 p-0.5 text-text-muted hover:text-text-primary cursor-pointer"
                title="Clear search"
              >
                <X size={11} />
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center space-x-1 sm:border-l sm:border-hairline sm:pl-2">
            <span className="text-[10px] text-text-muted uppercase font-medium">Scope:</span>
            {(["ALL", "PROD", "TEST", "CORR"] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-2 py-0.5 rounded-xs text-[10px] border transition-colors cursor-pointer ${
                  categoryFilter === cat
                    ? "bg-surface-elevated border-text-accent text-text-primary font-semibold shadow-xs"
                    : "border-hairline text-text-muted hover:text-text-secondary hover:bg-surface-elevated/50"
                }`}
              >
                {cat === "ALL" ? "All" : cat === "PROD" ? "Production" : cat === "TEST" ? "Tests" : "Correlated"}
              </button>
            ))}
          </div>

          {/* Status Filter Pills */}
          <div className="flex items-center space-x-1 sm:border-l sm:border-hairline sm:pl-2">
            <span className="text-[10px] text-text-muted uppercase font-medium">Status:</span>
            {(["ALL", "STRONG", "WEAK", "UNCERTAIN"] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-2 py-0.5 rounded-xs text-[10px] border transition-colors cursor-pointer ${
                  statusFilter === st
                    ? "bg-surface-elevated border-text-accent text-text-primary font-semibold shadow-xs"
                    : "border-hairline text-text-muted hover:text-text-secondary hover:bg-surface-elevated/50"
                }`}
              >
                {st === "ALL" ? "All" : st}
              </button>
            ))}
          </div>
        </div>

        {/* View toggles: minimap & legend */}
        {viewMode === "visual" && (
          <div className="flex items-center space-x-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setShowMinimap(!showMinimap)}
              className={`p-1.5 rounded-xs border transition-colors cursor-pointer ${
                showMinimap ? "bg-surface-elevated border-hairline text-text-primary shadow-xs" : "border-hairline text-text-muted hover:text-text-secondary hover:bg-surface-elevated/50"
              }`}
              title="Toggle minimap"
              aria-label="Toggle minimap"
            >
              <MapIcon size={13} />
            </button>
            <button
              type="button"
              onClick={() => setShowLegend(!showLegend)}
              className={`p-1.5 rounded-xs border transition-colors cursor-pointer ${
                showLegend ? "bg-surface-elevated border-hairline text-text-primary shadow-xs" : "border-hairline text-text-muted hover:text-text-secondary hover:bg-surface-elevated/50"
              }`}
              title="Toggle graph legend"
              aria-label="Toggle graph legend"
            >
              <HelpCircle size={13} />
            </button>
          </div>
        )}
      </div>

      {/* 3. Incomplete Analysis Banner (Scenario F) */}
      {model.isIncomplete && (
        <div className="m-3 p-3 rounded-md border border-status-removed-border bg-status-removed-bg text-text-primary font-mono text-xs flex items-center space-x-2.5 shrink-0">
          <AlertOctagon size={16} className="text-status-removed shrink-0" />
          <div>
            <span className="font-semibold">Comparative Analysis Incomplete:</span>{" "}
            <span className="text-text-secondary">{model.incompleteReason}</span>
          </div>
        </div>
      )}

      {/* 4. Focus Mode Active Notice Banner */}
      {isFocusMode && activeFocusSubject && (
        <div className="px-4 py-1.5 bg-surface-elevated border-b border-text-accent font-mono text-[11px] flex items-center justify-between text-text-primary shrink-0">
          <div className="flex items-center space-x-2">
            <Crosshair size={13} className="text-text-accent shrink-0" />
            <span>
              <strong>Focus Mode:</strong> Showing 1-hop evidence network for <code className="text-text-accent px-1 rounded-xs bg-ground border border-hairline">{activeFocusSubject}</code>
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsFocusMode(false)}
            className="text-[10px] px-2 py-0.5 rounded-xs border border-hairline bg-ground hover:bg-surface-panel transition-colors cursor-pointer"
          >
            Exit Focus
          </button>
        </div>
      )}

      {/* 5. Main Graph Canvas or Accessible View */}
      <div className="flex-1 relative min-h-[500px] overflow-hidden">
        {viewMode === "accessible" ? (
          <div className="h-full overflow-y-auto">
            <GraphAccessibleView
              model={model}
              selectedNodeId={
                selectedChangeId
                  ? `node-sc-${selectedChangeId}`
                  : selectedTestChangeId
                  ? `node-tc-${selectedTestChangeId}`
                  : null
              }
              selectedEdgeId={selectedCorrelationId ? `edge-corr-${selectedCorrelationId}` : null}
              searchQuery={searchQuery}
              onSelectNode={(node) => {
                if (node.data.category === "STRUCTURAL_CHANGE") {
                  onSelectChange(node.data.entityId);
                  if (node.data.evidenceIds.length > 0) {
                    onSelectEvidence(node.data.evidenceIds[0]);
                  }
                } else if (node.data.category === "TEST_CHANGE") {
                  onSelectTestChange(node.data.entityId);
                  if (node.data.evidenceIds.length > 0) {
                    onSelectEvidence(node.data.evidenceIds[0]);
                  }
                }
              }}
              onSelectEdge={(edge) => {
                const matched = report.correlationItems?.find(
                  (c) =>
                    c.structuralChangeId === edge.data.sourceEntityId &&
                    c.testChangeId === edge.data.targetEntityId
                );
                if (matched) {
                  onSelectCorrelation(matched.id);
                  if (matched.evidenceIds.length > 0) {
                    onSelectEvidence(matched.evidenceIds[0]);
                  }
                }
              }}
              onSelectEvidence={onSelectEvidence}
            />
          </div>
        ) : (
          <div className="w-full h-full bg-ground relative">
            {/* Top Domain Guide Bar */}
            <div className="absolute top-3 left-4 right-4 z-10 pointer-events-none flex justify-between font-mono text-[10px] select-none text-text-muted">
              <div
                className="flex items-center space-x-2 px-2.5 py-1 rounded-xs pointer-events-auto"
                style={{
                  background: "var(--surface-panel)",
                  border: "1px solid var(--border-hairline)",
                  boxShadow: "0 1px 4px rgba(90, 70, 50, 0.08)",
                }}
              >
                <GlyphMark size={12} className="text-text-accent shrink-0" />
                <span className="font-semibold text-text-primary uppercase tracking-wider">Production Domain</span>
                <span className="text-[9px] text-text-muted">({model.summary.productionNodeCount} nodes)</span>
              </div>
              <div
                className="flex items-center space-x-2 px-2.5 py-1 rounded-xs pointer-events-auto"
                style={{
                  background: "var(--surface-panel)",
                  border: "1px solid var(--border-hairline)",
                  boxShadow: "0 1px 4px rgba(90, 70, 50, 0.08)",
                }}
              >
                <span className="w-2 h-2 rounded-full" style={{ background: "var(--status-strong-fg)" }} />
                <span className="font-semibold text-text-primary uppercase tracking-wider">Test Domain</span>
                <span className="text-[9px] text-text-muted">
                  ({model.summary.testNodeCount} nodes
                  {model.summary.testNodeCount === 0 ? " — no companion tests" : ""})
                </span>
              </div>
            </div>

            {/* Selected Correlation Edge Dedicated Floating Inspection Card */}
            {activeCorrelation && !isExplainerDismissed && (
              <div
                role="region"
                aria-label="Selected correlation evidence inspection card"
                className="absolute top-12 left-4 z-20 w-84 max-w-[calc(100vw-2rem)] rounded-md border border-hairline bg-panel/95 backdrop-blur-sm p-3 font-mono text-xs shadow-md space-y-2 select-text"
                style={{
                  background: "var(--surface-panel)",
                  borderColor: "var(--border-hairline)",
                }}
              >
                <div className="flex items-center justify-between pb-1.5 border-b border-hairline">
                  <div className="flex items-center space-x-1.5">
                    {activeCorrelation.status === "STRONG" && <GlyphCorrStrong size={13} className="text-status-strong" />}
                    {activeCorrelation.status === "WEAK" && <GlyphCorrWeak size={13} className="text-status-weak" />}
                    {activeCorrelation.status === "UNCERTAIN" && <GlyphCorrUncertain size={13} className="text-status-uncertain" />}
                    {activeCorrelation.status === "NONE" && <GlyphCorrNone size={13} className="text-text-muted" />}
                    <span className="font-sans font-semibold text-xs text-text-primary">
                      {activeCorrelation.status} Correlation
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsExplainerDismissed(true)}
                    className="p-0.5 text-text-muted hover:text-text-primary rounded-xs focus:outline-none focus-visible:ring-1 focus-visible:ring-border-focus cursor-pointer"
                    aria-label="Dismiss selection explanation card"
                  >
                    <X size={12} />
                  </button>
                </div>

                <div className="text-[11px] text-text-secondary leading-normal">
                  <span className="font-semibold text-text-primary">{activeCorrelation.structuralChangeId}</span>
                  {" → "}
                  <span className="font-semibold text-text-primary">{activeCorrelation.testChangeId}</span>
                </div>

                <div className="text-[11px] text-text-secondary leading-normal font-body">
                  {activeCorrelation.rationale}
                </div>

                {activeCorrelation.evidenceIds.length > 0 && (
                  <div className="pt-1.5 border-t border-hairline flex items-center space-x-1.5">
                    <span className="text-[10px] text-text-muted inline-flex items-center gap-1">
                      <GlyphEvidencePin size={10} className="text-text-accent" />
                      <span>Evidence:</span>
                    </span>
                    {activeCorrelation.evidenceIds.map((evId) => (
                      <button
                        key={evId}
                        type="button"
                        onClick={() => onSelectEvidence(evId)}
                        className="px-1.5 py-0.2 rounded-xs bg-ground text-text-accent border border-hairline hover:border-border-interactive text-[10px] cursor-pointer"
                        title="Jump to Monaco line coordinates"
                      >
                        {evId}
                      </button>
                    ))}
                  </div>
                )}

                <div className="pt-1.5 border-t border-hairline text-[10px] text-text-muted font-body leading-tight">
                  <strong className="text-status-removed font-mono">✕ Does not establish: </strong>
                  Runtime execution, passing tests, actual coverage, or defect causation.
                </div>
              </div>
            )}

            {/* Selected Node Plain-English Explainer Card (when edge card not active) */}
            {!activeCorrelation && activeExplanation && !isExplainerDismissed && (
              <div
                role="region"
                aria-label="Selected entity explanation card"
                className="absolute top-12 left-4 z-20 w-80 max-w-[calc(100vw-2rem)] rounded-md border border-hairline bg-panel/95 backdrop-blur-sm p-3 font-mono text-xs shadow-md space-y-2 select-text"
                style={{
                  background: "var(--surface-panel)",
                  borderColor: "var(--border-hairline)",
                }}
              >
                <div className="flex items-center justify-between pb-1.5 border-b border-hairline">
                  <div className="flex items-center space-x-1.5 truncate">
                    <Info size={13} className="text-text-accent shrink-0" />
                    <span className="font-sans font-semibold text-xs text-text-primary truncate">
                      {activeExplanation.plainTitle}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1 shrink-0 ml-1">
                    {activeExplanation.technicalBadge && (
                      <Badge variant="outline" className="text-[9px] px-1 py-0">
                        {activeExplanation.technicalBadge}
                      </Badge>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsExplainerDismissed(true)}
                      className="p-0.5 text-text-muted hover:text-text-primary rounded-xs focus:outline-none focus-visible:ring-1 focus-visible:ring-border-focus cursor-pointer"
                      aria-label="Dismiss selection explanation card"
                      title="Dismiss card"
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>

                <p className="font-body text-[11px] text-text-secondary leading-normal">
                  {activeExplanation.whatChanged}
                </p>

                <div className="grid grid-cols-1 gap-1 pt-1.5 border-t border-hairline text-[10px]">
                  <div className="text-text-secondary">
                    <strong className="text-status-strong">✓ Establishes: </strong>
                    <span className="font-body text-text-muted">{activeExplanation.establishes}</span>
                  </div>
                  <div className="text-text-secondary">
                    <strong className="text-status-removed">✕ Does not establish: </strong>
                    <span className="font-body text-text-muted">{activeExplanation.doesNotEstablish}</span>
                  </div>
                </div>
              </div>
            )}

            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeClick={handleNodeClick}
              onEdgeClick={handleEdgeClick}
              onInit={setRfInstance}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              fitView
              fitViewOptions={{ padding: 0.12, minZoom: 0.65, maxZoom: 1.15 }}
              minZoom={0.35}
              maxZoom={2.0}
              className="change-archaeologist-flow"
              aria-label="Interactive Production-Test Correlation Graph"
            >
              <Background
                variant={BackgroundVariant.Lines}
                gap={32}
                size={1}
                color="rgba(90, 70, 50, 0.08)"
              />
              <Controls
                className="!bg-panel !border-hairline !rounded-sm !shadow-md [&>button]:!bg-panel [&>button]:!border-hairline [&>button]:!text-text-secondary hover:[&>button]:!bg-surface-elevated"
              />
              {showMinimap && (
                <MiniMap
                  nodeColor={(node) => {
                    switch (node.type) {
                      case "productionFunction":
                        return "#C4521A";
                      case "structuralChange":
                        return "#E65100";
                      case "testChange":
                        return "#2E7D32";
                      case "testDeclaration":
                        return "#5C3D99";
                      case "testFile":
                        return "#1A5C2E";
                      default:
                        return "#8A7560";
                    }
                  }}
                  className="!bg-panel !border-hairline !rounded-sm hidden sm:block"
                  maskColor="rgba(245, 240, 232, 0.75)"
                />
              )}
            </ReactFlow>

            {/* Floating Legend */}
            {showLegend && <GraphLegend summary={model.summary} />}
          </div>
        )}
      </div>
    </div>
  );
};
