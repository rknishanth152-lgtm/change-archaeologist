/**
 * Change Archaeologist — Graph Accessible Linear View Component
 *
 * Full semantic HTML alternative for keyboard navigation, screen readers,
 * and narrow screen viewports. Exposes the exact same entities, relationships,
 * and evidence anchors as the visual graph canvas.
 */

import React from "react";
import {
  FileCode2,
  FileCheck,
  Tag,
  Info,
  Layers,
} from "lucide-react";
import {
  GlyphMark,
  GlyphGuardClause,
  GlyphConditional,
  GlyphThrowStmt,
  GlyphReturnStmt,
  GlyphDeltaAdded,
  GlyphDeltaModified,
  GlyphDeltaRemoved,
  GlyphCorrStrong,
  GlyphCorrWeak,
  GlyphCorrUncertain,
  GlyphCorrNone,
  GlyphEvidencePin,
} from "../icons/ArchaeologistGlyphs.js";
import type {
  CorrelationGraphModel,
  CorrelationGraphNode,
  CorrelationGraphEdge,
  CorrelationItem,
} from "../../types/index.js";
import { formatSpanCoordinates } from "../../utils/source-location.js";
import { Badge } from "../ui/Badge.js";
import { humanizeEnum } from "../../utils/labels.js";
import { GlyphDig, GlyphFault, GlyphFlask } from "../icons/HeadingGlyphs.js";

interface GraphAccessibleViewProps {
  readonly model: CorrelationGraphModel;
  readonly selectedNodeId: string | null;
  readonly selectedEdgeId: string | null;
  readonly searchQuery?: string;
  readonly onSelectNode: (node: CorrelationGraphNode) => void;
  readonly onSelectEdge: (edge: CorrelationGraphEdge) => void;
  readonly onSelectUnattached?: (item: CorrelationItem) => void;
  readonly onSelectEvidence?: (evidenceId: string) => void;
}

// Category glyph helper for structural change cards
function getCategoryGlyph(category?: string) {
  const cat = (category ?? "").toUpperCase();
  if (cat.includes("GUARD")) return <GlyphGuardClause size={13} className="text-status-modified shrink-0" />;
  if (cat.includes("CONDITIONAL")) return <GlyphConditional size={13} className="text-status-modified shrink-0" />;
  if (cat.includes("THROW")) return <GlyphThrowStmt size={13} className="text-status-modified shrink-0" />;
  if (cat.includes("RETURN")) return <GlyphReturnStmt size={13} className="text-status-modified shrink-0" />;
  return <Layers size={13} className="text-status-modified shrink-0" />;
}

// Delta badge helper
function renderChangeBadge(changeType?: string) {
  if (!changeType) return null;
  const upper = changeType.toUpperCase();
  if (upper === "ADDED" || upper === "ADD") {
    return (
      <Badge variant="verdigris" className="text-xs px-1.5 py-0 font-semibold inline-flex items-center gap-1">
        <GlyphDeltaAdded size={10} className="shrink-0" />
        <span>Added</span>
      </Badge>
    );
  }
  if (upper === "MODIFIED" || upper === "MOD") {
    return (
      <Badge variant="terracotta" className="text-xs px-1.5 py-0 font-semibold inline-flex items-center gap-1">
        <GlyphDeltaModified size={10} className="shrink-0" />
        <span>Changed</span>
      </Badge>
    );
  }
  if (upper === "REMOVED" || upper === "DELETED" || upper === "REM") {
    return (
      <Badge variant="amber" className="text-xs px-1.5 py-0 font-semibold inline-flex items-center gap-1">
        <GlyphDeltaRemoved size={10} className="shrink-0" />
        <span>Removed</span>
      </Badge>
    );
  }
  return <Badge variant="outline" className="text-xs px-1.5 py-0">{changeType}</Badge>;
}

export const GraphAccessibleView: React.FC<GraphAccessibleViewProps> = ({
  model,
  selectedNodeId,
  selectedEdgeId,
  searchQuery = "",
  onSelectNode,
  onSelectEdge,
  onSelectUnattached,
  onSelectEvidence,
}) => {
  const query = searchQuery.trim().toLowerCase();

  const productionNodes = model.nodes.filter(
    (n) => n.data.category === "PRODUCTION_FUNCTION" || n.data.category === "STRUCTURAL_CHANGE"
  ).filter((n) => {
    if (!query) return true;
    return (
      n.data.title.toLowerCase().includes(query) ||
      n.data.subtitle.toLowerCase().includes(query) ||
      n.data.filePath.toLowerCase().includes(query)
    );
  });

  const testNodes = model.nodes.filter(
    (n) =>
      n.data.category === "TEST_FILE" ||
      n.data.category === "TEST_CHANGE" ||
      n.data.category === "TEST_DECLARATION"
  ).filter((n) => {
    if (!query) return true;
    return (
      n.data.title.toLowerCase().includes(query) ||
      n.data.subtitle.toLowerCase().includes(query) ||
      n.data.filePath.toLowerCase().includes(query)
    );
  });

  const correlationEdges = model.edges.filter(
    (e) => e.data.category === "CORRELATED_WITH"
  ).filter((e) => {
    if (!query) return true;
    return (
      e.data.sourceEntityId.toLowerCase().includes(query) ||
      e.data.targetEntityId.toLowerCase().includes(query) ||
      (e.data.label && e.data.label.toLowerCase().includes(query)) ||
      (e.data.rationale && e.data.rationale.toLowerCase().includes(query))
    );
  });

  const unattachedItems = model.unattachedItems.filter((item) => {
    if (!query) return true;
    return [item.structuralChangeId, item.testChangeId, item.posixTestFilePath, item.status, item.rationale].some(
      (value) => value?.toLowerCase().includes(query)
    );
  });

  return (
    <div
      role="region"
      aria-label="Accessible Linear Graph Table View"
      className="p-4 space-y-6 max-w-5xl mx-auto text-sm text-text-primary"
    >
      {/* Epistemic Humility Banner */}
      <div className="rounded-md border border-hairline bg-panel p-3 flex items-center space-x-2.5 text-text-muted">
        <Info size={14} className="text-status-uncertain shrink-0" />
        <span>
          Everything in The Dig as a list, for keyboards and screen readers.
        </span>
      </div>

      {/* 1. Production Entities */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2 text-text-secondary font-semibold text-xs border-b border-hairline pb-1.5">
          <GlyphFault size={16} className="text-text-accent" />
          <span>Code ({productionNodes.length})</span>
        </div>

        <div role="list" aria-label="Production nodes" className="space-y-2">
          {productionNodes.map((node) => {
            const isSelected = selectedNodeId === node.id;
            const spanStr = node.data.span ? formatSpanCoordinates(node.data.span) : null;

            return (
              <div
                key={node.id}
                role="listitem"
                tabIndex={0}
                onClick={() => onSelectNode(node)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectNode(node);
                  }
                }}
                className={`p-3 rounded-md border transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus ${
                  isSelected
                    ? "bg-surface-elevated border-text-accent"
                    : "bg-panel border-hairline hover:border-border-interactive"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {node.data.category === "PRODUCTION_FUNCTION" ? (
                      <GlyphMark size={13} className="text-text-accent" />
                    ) : (
                      getCategoryGlyph(node.data.subtitle)
                    )}
                    <span className="font-mono font-semibold text-text-primary">{node.data.title}</span>
                    {renderChangeBadge(node.data.changeType)}
                  </div>
                  {spanStr && <span className="font-mono text-xs text-text-secondary">{spanStr}</span>}
                </div>

                <div className="text-xs text-text-secondary mt-1">{node.data.category === "STRUCTURAL_CHANGE" ? humanizeEnum(node.data.subtitle) : node.data.subtitle}</div>
                <div className="font-mono text-xs text-text-secondary mt-0.5 break-all">{node.data.filePath}</div>

                {node.data.evidenceIds.length > 0 && (
                  <div className="mt-2 pt-1.5 border-t border-hairline flex items-center space-x-1.5">
                    <span className="text-xs text-text-muted inline-flex items-center gap-1">
                      <GlyphEvidencePin size={10} className="text-text-accent" />
                      <span>Evidence</span>
                    </span>
                    {node.data.evidenceIds.map((evId) => (
                      <button
                        key={evId}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onSelectEvidence) onSelectEvidence(evId);
                          onSelectNode(node);
                        }}
                        className="px-1.5 py-0.5 rounded-xs bg-ground text-text-accent border border-hairline hover:border-border-interactive text-xs cursor-pointer"
                        title="Show this evidence"
                      >
                        {evId}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Test Entities */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2 text-text-secondary font-semibold text-xs border-b border-hairline pb-1.5">
          <GlyphFlask size={16} className="text-text-accent" />
          <span>Tests ({testNodes.length})</span>
        </div>

        {testNodes.length === 0 ? (
          <div className="p-4 rounded-md border border-hairline bg-panel text-text-muted text-xs">
            No test changes in this report. That does not mean the code is untested.
          </div>
        ) : (
          <div role="list" aria-label="Test nodes" className="space-y-2">
            {testNodes.map((node) => {
              const isSelected = selectedNodeId === node.id;
              const spanStr = node.data.span ? formatSpanCoordinates(node.data.span) : null;

              return (
                <div
                  key={node.id}
                  role="listitem"
                  tabIndex={0}
                  onClick={() => onSelectNode(node)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelectNode(node);
                    }
                  }}
                  className={`p-3 rounded-md border transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus ${
                    isSelected
                      ? "bg-surface-elevated border-status-strong"
                      : "bg-panel border-hairline hover:border-border-interactive"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {node.data.category === "TEST_FILE" ? (
                        <FileCode2 size={13} className="text-status-strong" />
                      ) : node.data.category === "TEST_CHANGE" ? (
                        <FileCheck size={13} className="text-status-strong" />
                      ) : (
                        <Tag size={13} className="text-status-weak" />
                      )}
                      <span className="font-mono font-semibold text-text-primary">{node.data.title}</span>
                      {renderChangeBadge(node.data.changeType)}
                    </div>
                    {spanStr && <span className="text-xs text-text-muted">{spanStr}</span>}
                  </div>

                  <div className="text-xs text-text-secondary mt-1">{node.data.category === "STRUCTURAL_CHANGE" ? humanizeEnum(node.data.subtitle) : node.data.subtitle}</div>
                  <div className="font-mono text-xs text-text-secondary mt-0.5 break-all">{node.data.filePath}</div>

                  {node.data.evidenceIds.length > 0 && (
                    <div className="mt-2 pt-1.5 border-t border-hairline flex items-center space-x-1.5">
                      <span className="text-xs text-text-muted inline-flex items-center gap-1">
                        <GlyphEvidencePin size={10} className="text-text-accent" />
                        <span>Evidence</span>
                      </span>
                      {node.data.evidenceIds.map((evId) => (
                        <button
                          key={evId}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onSelectEvidence) onSelectEvidence(evId);
                            onSelectNode(node);
                          }}
                          className="px-1.5 py-0.5 rounded-xs bg-ground text-text-accent border border-hairline hover:border-border-interactive text-xs cursor-pointer"
                          title="Show this evidence"
                        >
                          {evId}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Correlation Links */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2 text-text-secondary font-semibold text-xs border-b border-hairline pb-1.5">
          <GlyphDig size={16} className="text-text-accent" />
          <span>Links ({correlationEdges.length + unattachedItems.length})</span>
        </div>

        {correlationEdges.length + unattachedItems.length === 0 ? (
          <div className="p-4 rounded-md border border-hairline bg-panel text-text-muted text-xs">
            No links between code changes and test changes were recorded.
          </div>
        ) : (
          <div role="list" aria-label="Correlation edges" className="space-y-2">
            {correlationEdges.map((edge) => {
              const isSelected = selectedEdgeId === edge.id;

              return (
                <div
                  key={edge.id}
                  role="listitem"
                  tabIndex={0}
                  onClick={() => onSelectEdge(edge)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelectEdge(edge);
                    }
                  }}
                  className={`p-3 rounded-md border transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus ${
                    isSelected
                      ? "bg-surface-elevated border-text-accent"
                      : "bg-panel border-hairline hover:border-border-interactive"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-semibold text-text-primary">
                        {edge.data.sourceEntityId} → {edge.data.targetEntityId}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded-xs text-xs font-semibold border inline-flex items-center gap-1 ${
                          edge.data.status === "STRONG"
                            ? "text-status-strong bg-status-strong-bg border-status-strong-border"
                            : edge.data.status === "WEAK"
                            ? "text-status-weak bg-status-weak-bg border-status-weak-border"
                            : edge.data.status === "UNCERTAIN"
                            ? "text-status-uncertain bg-status-uncertain-bg border-status-uncertain-border"
                            : "text-text-muted bg-surface-ground border-border-hairline"
                        }`}
                      >
                        {edge.data.status === "STRONG" && <GlyphCorrStrong size={11} />}
                        {edge.data.status === "WEAK" && <GlyphCorrWeak size={11} />}
                        {edge.data.status === "UNCERTAIN" && <GlyphCorrUncertain size={11} />}
                        {edge.data.status === "NONE" && <GlyphCorrNone size={11} />}
                        <span>{edge.data.status}</span>
                      </span>
                    </div>
                  </div>

                  {edge.data.rationale && (
                    <div className="text-xs text-text-secondary mt-1.5 leading-relaxed">
                      {edge.data.rationale}
                    </div>
                  )}

                  {edge.data.evidenceIds.length > 0 && (
                    <div className="mt-2 pt-1.5 border-t border-hairline flex items-center space-x-1.5">
                      <span className="text-xs text-text-muted inline-flex items-center gap-1">
                        <GlyphEvidencePin size={10} className="text-text-accent" />
                        <span>Evidence</span>
                      </span>
                      {edge.data.evidenceIds.map((evId) => (
                        <button
                          key={evId}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onSelectEvidence) onSelectEvidence(evId);
                            onSelectEdge(edge);
                          }}
                          className="px-1.5 py-0.5 rounded-xs bg-ground text-text-accent border border-hairline hover:border-border-interactive text-xs cursor-pointer"
                          title="Show this evidence"
                        >
                          {evId}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {unattachedItems.map((item) => (
              <div
                key={item.id}
                role="listitem"
                tabIndex={0}
                onClick={() => onSelectUnattached?.(item)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectUnattached?.(item);
                  }
                }}
                className={`p-3 rounded-md border transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus ${
                  selectedEdgeId === `edge-corr-${item.id}`
                    ? "bg-surface-elevated border-text-accent"
                    : "bg-panel border-hairline hover:border-border-interactive"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-text-primary">
                    {item.structuralChangeId || "No code change"} → {item.testChangeId ?? item.posixTestFilePath ?? "No test file"}
                  </span>
                  <span className="font-semibold">{item.status}</span>
                </div>
                <div className="text-[12px] text-text-secondary mt-1.5 leading-relaxed">{item.rationale}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
