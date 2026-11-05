import React from "react";
import { Columns2, Rows, ChevronLeft, ChevronRight, Copy, Check, GitCommit, Tag, ShieldCheck } from "lucide-react";
import type { EvidenceItem, SourceSpan } from "../types/index.js";
import { formatSpanCoordinates } from "../utils/source-location.js";

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
  const currentEvidenceIndex = evidenceList.findIndex((e) => e.id === selectedEvidenceId);
  const hasEvidence = evidenceList.length > 0;
  const isFirst = currentEvidenceIndex <= 0;
  const isLast = currentEvidenceIndex === -1 || currentEvidenceIndex >= evidenceList.length - 1;

  const handlePrevEvidence = () => {
    if (!hasEvidence || isFirst) return;
    onSelectEvidence(evidenceList[currentEvidenceIndex - 1].id);
  };

  const handleNextEvidence = () => {
    if (!hasEvidence || isLast) return;
    onSelectEvidence(evidenceList[currentEvidenceIndex + 1].id);
  };

  const currentEvidence = currentEvidenceIndex !== -1 ? evidenceList[currentEvidenceIndex] : null;

  return (
    <div className="h-10 border-b border-hairline bg-panel px-3 flex items-center justify-between text-xs font-mono select-none">
      {/* Left: Diff Mode Controls & Target Coordinates */}
      <div className="flex items-center space-x-2">
        {/* Diff Mode Toggle Group */}
        <div
          role="group"
          aria-label="Diff comparison layout mode"
          className="flex items-center rounded-sm bg-ground border border-hairline p-0.5"
        >
          <button
            type="button"
            onClick={() => onDiffModeChange("side-by-side")}
            aria-pressed={diffMode === "side-by-side"}
            aria-label="Side by side diff layout"
            className={`px-2 py-1 flex items-center space-x-1.5 rounded-xs transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-border-focus ${
              diffMode === "side-by-side"
                ? "bg-surface-elevated text-text-primary font-semibold shadow-xs"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            <Columns2 size={12} strokeWidth={1.5} />
            <span className="text-[11px]">Side-by-Side</span>
          </button>

          <button
            type="button"
            onClick={() => onDiffModeChange("unified")}
            aria-pressed={diffMode === "unified"}
            aria-label="Unified diff layout"
            className={`px-2 py-1 flex items-center space-x-1.5 rounded-xs transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-border-focus ${
              diffMode === "unified"
                ? "bg-surface-elevated text-text-primary font-semibold shadow-xs"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            <Rows size={12} strokeWidth={1.5} />
            <span className="text-[11px]">Unified</span>
          </button>
        </div>

        {/* Revisions indicator */}
        <div className="hidden lg:flex items-center space-x-1.5 text-[11px] text-text-muted px-2 py-0.5 rounded-xs bg-ground border border-hairline">
          <GitCommit size={11} strokeWidth={1.5} />
          <span className="text-status-removed">{baseRevisionLabel}</span>
          <span>→</span>
          <span className="text-status-added">{headRevisionLabel}</span>
        </div>

        {/* Active span coordinates */}
        {activeSpan && (
          <span className="hidden xl:inline-block text-[10px] text-text-secondary px-1.5 py-0.5 bg-ground border border-hairline rounded-xs">
            {formatSpanCoordinates(activeSpan)}
          </span>
        )}
      </div>

      {/* Right: Evidence Navigation & Actions */}
      <div className="flex items-center space-x-2">
        {hasEvidence && (
          <div className="flex items-center space-x-1 bg-ground border border-hairline px-2 py-0.5 rounded-xs">
            <span className="text-[10px] text-text-muted uppercase">Evidence:</span>
            {currentEvidence ? (
              <span className="text-[10px] font-semibold text-text-accent">
                {currentEvidence.id} ({currentEvidenceIndex + 1}/{evidenceList.length})
              </span>
            ) : (
              <span className="text-[10px] text-text-muted">
                {evidenceList.length} items
              </span>
            )}

            <div className="flex items-center space-x-0.5 ml-1 border-l border-hairline pl-1">
              <button
                type="button"
                onClick={handlePrevEvidence}
                disabled={isFirst}
                aria-label="Navigate to previous evidence item"
                className={`p-1 rounded-xs transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-border-focus ${
                  isFirst
                    ? "text-border opacity-40 cursor-not-allowed"
                    : "hover:text-text-primary text-text-muted hover:bg-surface-hover"
                }`}
                title="Previous evidence"
              >
                <ChevronLeft size={12} strokeWidth={1.5} />
              </button>
              <button
                type="button"
                onClick={handleNextEvidence}
                disabled={isLast}
                aria-label="Navigate to next evidence item"
                className={`p-1 rounded-xs transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-border-focus ${
                  isLast
                    ? "text-border opacity-40 cursor-not-allowed"
                    : "hover:text-text-primary text-text-muted hover:bg-surface-hover"
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
            aria-label="Copy active comparison source"
            className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-hover rounded-xs border border-hairline transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-border-focus"
            title="Copy source code"
          >
            {isCopied ? (
              <Check size={13} strokeWidth={1.5} className="text-status-strong" />
            ) : (
              <Copy size={13} strokeWidth={1.5} />
            )}
          </button>
        )}
      </div>
    </div>
  );
};

