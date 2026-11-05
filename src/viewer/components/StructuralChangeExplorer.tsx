import React, { useState } from "react";
import { Filter } from "lucide-react";
import type { StructuralChange, StructuralChangeCategory } from "../types/index.js";
import {
  GlyphDeltaAdded,
  GlyphDeltaModified,
  GlyphDeltaRemoved,
  GlyphGuardClause,
  GlyphConditional,
  GlyphThrowStmt,
  GlyphReturnStmt,
} from "./icons/ArchaeologistGlyphs.js";

interface StructuralChangeExplorerProps {
  readonly structuralChanges: readonly StructuralChange[];
  readonly selectedId: string | null;
  readonly onSelectChange: (id: string) => void;
}

export const StructuralChangeExplorer: React.FC<StructuralChangeExplorerProps> = ({
  structuralChanges,
  selectedId,
  onSelectChange,
}) => {
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");

  const filteredChanges = structuralChanges.filter((sc) => {
    if (categoryFilter !== "ALL" && sc.category !== categoryFilter) return false;
    if (typeFilter !== "ALL" && sc.changeType !== typeFilter) return false;
    return true;
  });

  const getStatusIcon = (type: string) => {
    switch (type) {
      case "ADDED":
        return <GlyphDeltaAdded size={14} className="text-status-added" />;
      case "REMOVED":
        return <GlyphDeltaRemoved size={14} className="text-status-removed" />;
      case "MODIFIED":
      default:
        return <GlyphDeltaModified size={14} className="text-status-modified" />;
    }
  };

  const getCategoryGlyph = (category: string) => {
    switch (category) {
      case "GUARD_CLAUSE":
        return <GlyphGuardClause size={11} className="text-status-modified" />;
      case "CONDITIONAL_EXPRESSION":
        return <GlyphConditional size={11} className="text-status-modified" />;
      case "THROW_STATEMENT":
        return <GlyphThrowStmt size={11} className="text-status-removed" />;
      case "RETURN_STATEMENT":
        return <GlyphReturnStmt size={11} className="text-text-secondary" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (type: string) => {
    switch (type) {
      case "ADDED":
        return (
          <span className="font-mono text-[10px] font-semibold text-status-added bg-status-added-bg border border-status-added-border px-1.5 py-0.5 rounded-xs">
            +ADD
          </span>
        );
      case "REMOVED":
        return (
          <span className="font-mono text-[10px] font-semibold text-status-removed bg-status-removed-bg border border-status-removed-border px-1.5 py-0.5 rounded-xs">
            -REM
          </span>
        );
      case "MODIFIED":
      default:
        return (
          <span className="font-mono text-[10px] font-semibold text-status-modified bg-status-modified-bg border border-status-modified-border px-1.5 py-0.5 rounded-xs">
            ΔMOD
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col h-full bg-ground">
      {/* Filter Toolbar */}
      <div className="h-10 border-b border-hairline px-3 bg-panel flex items-center justify-between text-xs font-mono">
        <div className="flex items-center space-x-2">
          <Filter size={13} strokeWidth={1.5} className="text-text-muted" />
          <span className="text-text-muted">FILTER:</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label="Filter mutations by category"
            className="h-6 px-1.5 bg-ground border border-hairline rounded-xs text-[11px] text-text-secondary focus:outline-none focus-visible:ring-1 focus-visible:ring-border-focus"
          >
            <option value="ALL">All Categories</option>
            <option value="GUARD_CLAUSE">Guard Clauses</option>
            <option value="CONDITIONAL_EXPRESSION">Conditionals</option>
            <option value="THROW_STATEMENT">Throws</option>
            <option value="RETURN_STATEMENT">Returns</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            aria-label="Filter mutations by change type"
            className="h-6 px-1.5 bg-ground border border-hairline rounded-xs text-[11px] text-text-secondary focus:outline-none focus-visible:ring-1 focus-visible:ring-border-focus"
          >
            <option value="ALL">All Mutations</option>
            <option value="ADDED">Added (+)</option>
            <option value="MODIFIED">Modified (Δ)</option>
            <option value="REMOVED">Removed (-)</option>
          </select>
        </div>

        <div className="text-[11px] text-text-muted tabular-nums">
          {filteredChanges.length} of {structuralChanges.length} mutations
        </div>
      </div>

      {/* List Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {/* Plain-English Explanation Banner */}
        <div className="rounded-sm bg-panel border border-hairline p-2.5 flex items-center justify-between text-xs font-mono text-text-secondary">
          <div className="flex items-center space-x-2">
            <Filter size={13} className="text-text-accent shrink-0" />
            <span className="text-[11px] leading-normal font-body">
              <strong className="text-text-primary font-sans font-semibold">Code Changes (AST Mutations):</strong> Meaningful syntax modifications between Git revisions (such as removing a safety guard or changing a return value), ignoring harmless whitespace differences.
            </span>
          </div>
        </div>

        {structuralChanges.length === 0 ? (
          <div className="p-8 text-center text-xs font-mono text-text-muted border border-hairline rounded-md bg-panel">
            Zero structural mutations detected in the analyzed function across this revision range.
          </div>
        ) : filteredChanges.length === 0 ? (
          <div className="p-8 text-center text-xs font-mono text-text-muted border border-hairline rounded-md bg-panel">
            No structural mutations match the current filter criteria.
          </div>
        ) : (
          filteredChanges.map((sc) => {
            const isSelected = selectedId === sc.id;
            const span = sc.afterSpan ?? sc.beforeSpan;
            const spanText = span ? `L${span.startLine}:C${span.startColumn}-L${span.endLine}:C${span.endColumn}` : "N/A";

            return (
              <div
                key={sc.id}
                onClick={() => onSelectChange(sc.id)}
                className={`p-3 rounded-md border text-left cursor-pointer transition-colors duration-fast focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus ${
                  isSelected
                    ? "bg-surface-elevated border-border-focus ring-1 ring-border-focus"
                    : "bg-panel border-hairline hover:border-border-interactive hover:bg-surface-hover"
                }`}
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
                aria-label={`Structural mutation ${sc.id}: ${sc.category}, ${sc.changeType}, ${sc.summary}`}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectChange(sc.id);
                  }
                }}
              >
                {/* Header row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(sc.changeType)}
                    <span className="font-mono text-xs font-semibold text-text-primary">
                      {sc.id}
                    </span>
                    {getStatusBadge(sc.changeType)}
                    <span className="font-mono text-[10px] text-text-muted flex items-center space-x-1">
                      {getCategoryGlyph(sc.category)}
                      <span>{sc.category}</span>
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-text-muted tabular-nums">
                    {spanText}
                  </span>
                </div>

                {/* Summary */}
                <div className="mt-2 text-xs text-text-secondary leading-relaxed font-body">
                  {sc.summary}
                </div>

                {/* Rule badge */}
                <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-text-muted">
                  <span className="px-1.5 py-0.5 rounded-xs bg-ground border border-hairline">
                    {sc.ruleId}
                  </span>
                  {sc.beforeSnippet && sc.afterSnippet && (
                    <span className="text-text-accent">Comparative snippet available</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

