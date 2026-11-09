/**
 * CodeComparisonToolbar Component
 *
 * Change Archaeologist — Monaco Code Comparison Toolbar
 *
 * Provides a responsive, clearly grouped control bar:
 * - Group 1: Diff Layout Modes (Side-by-Side vs Unified).
 * - Group 2: Forensic Revision Context (BASE → HEAD, line coordinates).
 * - Group 3: Evidence Stepper Navigation (< Prev Evidence Next >) & Source Copy.
 *
 * Designed to prevent awkward word wrapping, right-edge clipping,
 * and visual congestion across desktop and side-inspector viewports.
 */

import React from "react";
import {
  Columns2,
  Rows,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  GitCommit,
} from "lucide-react";
import type { EvidenceItem, SourceSpan } from "../types/index.js";
import { formatSpanCoordinates } from "../utils/source-location.js";
import { GlyphEvidencePin } from "./icons/ArchaeologistGlyphs.js";

export type DiffRenderMode = "side-by-side" | "unified";

interface CodeComparisonToolbarProps {
  readonly diffMode: DiffRenderMode;
  readonly onDiffModeChange: (mode: DiffRenderMode) => void;
  readonly baseRevisionLabel: string;
  readonly headRevisionLabel: string;
  readonly targetFunctionName?: string;
  readonly targetFilePath?: string;
  readonly activeSpan?: SourceSpan | null;
  readonly evidenceList: readonly EvidenceItem[];
  readonly selectedEvidenceId: string | null;
  readonly onSelectEvidence: (evidenceId: string) => void;
  readonly onCopySource?: () => void;
  readonly isCopied?: boolean;
}

export const CodeComparisonToolbar: React.FC<CodeComparisonToolbarProps> = ({
  diffMode,
  onDiffModeChange,
  baseRevisionLabel,
  headRevisionLabel,
  targetFunctionName,
  targetFilePath,
  activeSpan,
  evidenceList,
  selectedEvidenceId,
  onSelectEvidence,
  onCopySource,
  isCopied,
}) => {
  const currentEvidenceIndex = evidenceList.findIndex(
    (e) => e.id === selectedEvidenceId
  );
  const hasEvidence = evidenceList.length > 0;
  const isFirst = currentEvidenceIndex <= 0;
  const isLast =
    currentEvidenceIndex === -1 ||
    currentEvidenceIndex >= evidenceList.length - 1;

  const handlePrevEvidence = () => {
    if (!hasEvidence || isFirst) return;
    onSelectEvidence(evidenceList[currentEvidenceIndex - 1].id);
  };

  const handleNextEvidence = () => {
    if (!hasEvidence || isLast) return;
    onSelectEvidence(evidenceList[currentEvidenceIndex + 1].id);
  };

  const currentEvidence =
    currentEvidenceIndex !== -1 ? evidenceList[currentEvidenceIndex] : null;

  return (
    <div className="border-b border-hairline bg-panel select-none font-sans text-xs">
      {/* Primary Toolbar Row: Diff Modes & Evidence Navigation */}
      <div className="min-h-[38px] px-3 py-1 flex items-center justify-between gap-2 shrink-0">
        {/* Group 1: Diff Mode Layout Toggle */}
        <div
          role="group"
          aria-label="Diff layout"
          className="flex items-center rounded-xs bg-ground border border-hairline p-0.5 shrink-0"
        >
          <button
            type="button"
            onClick={() => onDiffModeChange("side-by-side")}
            aria-pressed={diffMode === "side-by-side"}
            aria-label="Side by side diff layout"
            className={`px-2 py-0.5 flex items-center space-x-1.5 rounded-xs transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-border-focus cursor-pointer ${
              diffMode === "side-by-side"
                ? "bg-surface-elevated text-text-primary font-semibold"
                : "text-text-muted hover:text-text-secondary"
            }`}
            title="Before and after in two columns"
          >
            <Columns2 size={12} strokeWidth={1.5} />
            <span className="text-xs whitespace-nowrap">Side-by-Side</span>
          </button>

          <button
            type="button"
            onClick={() => onDiffModeChange("unified")}
            aria-pressed={diffMode === "unified"}
            aria-label="Unified diff layout"
            className={`px-2 py-0.5 flex items-center space-x-1.5 rounded-xs transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-border-focus cursor-pointer ${
              diffMode === "unified"
                ? "bg-surface-elevated text-text-primary font-semibold"
                : "text-text-muted hover:text-text-secondary"
            }`}
            title="Before and after in one column"
          >
            <Rows size={12} strokeWidth={1.5} />
            <span className="text-xs whitespace-nowrap">Unified</span>
          </button>
        </div>

        {/* Group 3: Traceable Evidence Navigation & Source Copy */}
        <div className="flex items-center space-x-1.5 shrink-0">
          {hasEvidence && (
            <div className="flex items-center space-x-1 bg-ground border border-hairline px-2 py-0.5 rounded-xs">
              <GlyphEvidencePin size={11} className="text-text-accent shrink-0" />
              <span className="text-xs text-text-secondary hidden sm:inline">Evidence</span>
              {currentEvidence ? (
                <span className="font-mono text-xs font-semibold text-text-accent whitespace-nowrap">
                  {currentEvidence.id} ({currentEvidenceIndex + 1}/
                  {evidenceList.length})
                </span>
              ) : (
                <span className="text-xs text-text-muted whitespace-nowrap">
                  {evidenceList.length} items
                </span>
              )}

              <div className="flex items-center space-x-0.5 ml-1 border-l border-hairline pl-1">
                <button
                  type="button"
                  onClick={handlePrevEvidence}
                  disabled={isFirst}
                  aria-label="Previous evidence"
                  className={`p-1 rounded-xs transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-border-focus ${
                    isFirst
                      ? "text-border opacity-40 cursor-not-allowed"
                      : "hover:text-text-primary text-text-muted hover:bg-surface-hover cursor-pointer"
                  }`}
                  title="Previous evidence"
                >
                  <ChevronLeft size={12} strokeWidth={1.5} />
                </button>
                <button
                  type="button"
                  onClick={handleNextEvidence}
                  disabled={isLast}
                  aria-label="Next evidence"
                  className={`p-1 rounded-xs transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-border-focus ${
                    isLast
                      ? "text-border opacity-40 cursor-not-allowed"
                      : "hover:text-text-primary text-text-muted hover:bg-surface-hover cursor-pointer"
                  }`}
                  title="Next evidence"
                >
                  <ChevronRight size={12} strokeWidth={1.5} />
                </button>
              </div>
            </div>
          )}

          {/* Copy source button */}
          {onCopySource && (
            <button
              type="button"
              onClick={onCopySource}
              aria-label="Copy this code"
              className="p-1 text-text-muted hover:text-text-primary hover:bg-surface-hover rounded-xs border border-hairline transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-border-focus cursor-pointer shrink-0"
              title="Copy this code"
            >
              {isCopied ? (
                <Check
                  size={12}
                  strokeWidth={1.5}
                  className="text-status-strong"
                />
              ) : (
                <Copy size={12} strokeWidth={1.5} />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Group 2: Revision Context & Coordinate Sub-strip */}
      <div className="h-6 px-3 bg-surface-elevated/60 border-t border-hairline flex items-center justify-between text-xs text-text-muted font-sans overflow-hidden">
        {/* Revision Identifiers */}
        <div className="flex items-center space-x-1.5 min-w-0 truncate">
          <GitCommit size={11} strokeWidth={1.5} className="shrink-0 text-text-accent" />
          <span className="font-mono text-status-removed font-medium truncate" title={baseRevisionLabel}>
            {baseRevisionLabel}
          </span>
          <span className="text-text-muted shrink-0">→</span>
          <span className="font-mono text-status-added font-medium truncate" title={headRevisionLabel}>
            {headRevisionLabel}
          </span>
        </div>

        {/* Active Line Span Coordinates */}
        {activeSpan ? (
          <span
            className="font-mono text-xs text-text-secondary font-semibold px-1.5 py-0.5 bg-ground border border-hairline rounded-xs shrink-0 ml-2"
            title="Line and column of the highlighted code"
          >
            {formatSpanCoordinates(activeSpan)}
          </span>
        ) : (
          targetFunctionName && (
            <span className="text-xs text-text-muted truncate ml-2">
              {targetFunctionName}()
            </span>
          )
        )}
      </div>
    </div>
  );
};
