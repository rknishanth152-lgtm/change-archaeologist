import React from "react";
import { AlertCircle, Info, AlertTriangle, Tag } from "lucide-react";
import type { Finding, ReviewAttentionLevel } from "../types/index.js";
import { GlyphEpistemicTier, GlyphEvidencePin } from "./icons/ArchaeologistGlyphs.js";

interface FindingsSummaryProps {
  readonly findings: readonly Finding[];
  readonly selectedId: string | null;
  readonly onSelectFinding: (id: string) => void;
}

export const FindingsSummary: React.FC<FindingsSummaryProps> = ({
  findings,
  selectedId,
  onSelectFinding,
}) => {
  if (findings.length === 0) {
    return (
      <div className="p-8 text-center text-xs font-mono text-text-muted border border-hairline rounded-md bg-panel m-4">
        Zero high-level findings synthesized in the current report.
      </div>
    );
  }

  const renderAttentionBadge = (level: ReviewAttentionLevel) => {
    switch (level) {
      case "HIGH_ATTENTION":
        return (
          <span className="inline-flex items-center space-x-1 font-mono text-[10px] font-semibold text-status-removed bg-status-removed-bg border border-status-removed-border px-1.5 py-0.5 rounded-xs">
            <AlertCircle size={11} strokeWidth={1.5} />
            <span>HIGH ATTENTION</span>
          </span>
        );
      case "MODERATE_ATTENTION":
        return (
          <span className="inline-flex items-center space-x-1 font-mono text-[10px] font-semibold text-status-modified bg-status-modified-bg border border-status-modified-border px-1.5 py-0.5 rounded-xs">
            <AlertTriangle size={11} strokeWidth={1.5} />
            <span>MODERATE ATTENTION</span>
          </span>
        );
      case "INFORMATIONAL":
      default:
        return (
          <span className="inline-flex items-center space-x-1 font-mono text-[10px] font-semibold text-text-muted bg-surface-elevated border border-hairline px-1.5 py-0.5 rounded-xs">
            <Info size={11} strokeWidth={1.5} />
            <span>INFORMATIONAL</span>
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col h-full bg-ground overflow-y-auto p-3 space-y-3">
      {/* Plain-English Explanation Banner */}
      <div className="rounded-sm bg-panel border border-hairline p-2.5 flex items-center justify-between text-xs font-mono text-text-secondary">
        <div className="flex items-center space-x-2">
          <GlyphEpistemicTier size={14} className="text-text-accent shrink-0" />
          <span className="text-[11px] leading-normal font-body">
            <strong className="text-text-primary font-sans font-semibold">What We Know (Epistemic Findings):</strong> High-level synthesis separating directly observed syntactic facts from inferred hypotheses and static analysis limits.
          </span>
        </div>
      </div>

      {findings.map((fnd) => {
        const isSelected = selectedId === fnd.id;

        return (
          <div
            key={fnd.id}
            onClick={() => onSelectFinding(fnd.id)}
            role="button"
            tabIndex={0}
            aria-selected={isSelected}
            aria-label={`Finding ${fnd.id}: ${fnd.title}, attention level ${fnd.attentionLevel}`}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelectFinding(fnd.id);
              }
            }}
            className={`rounded-md border p-3.5 bg-panel transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus ${
              isSelected ? "border-border-focus ring-1 ring-border-focus bg-surface-elevated" : "border-hairline hover:border-border-interactive hover:bg-surface-hover"
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-hairline">
              <div className="flex items-center space-x-2">
                <span className="font-mono text-xs font-semibold text-text-primary">
                  {fnd.id}
                </span>
                {renderAttentionBadge(fnd.attentionLevel)}
                <span className="font-mono text-[10px] text-text-muted">
                  {fnd.category}
                </span>
              </div>
              <div className="flex items-center space-x-1 font-mono text-[10px] text-text-muted">
                {fnd.structuralChangeIds.map((scId) => (
                  <span key={scId} className="px-1.5 py-0.2 bg-ground border border-hairline rounded-xs">
                    {scId}
                  </span>
                ))}
              </div>
            </div>

            {/* Title */}
            <div className="mt-2 text-xs font-medium text-text-primary font-display">
              {fnd.title}
            </div>

            {/* Epistemic Statements Breakdown */}
            <div className="mt-2.5 space-y-2 font-mono text-[11px]">
              {/* OBSERVED */}
              <div className="p-2 rounded-xs bg-ground border border-hairline space-y-1">
                <div className="flex items-center justify-between text-[10px] font-semibold text-text-muted">
                  <span>[OBSERVED FACTS]</span>
                  <span>{fnd.observed.length} statements</span>
                </div>
                {fnd.observed.map((obs) => (
                  <div key={obs.id} className="text-text-primary leading-normal pl-2 border-l border-hairline">
                    {obs.statement}
                    <div className="text-[10px] text-text-muted mt-0.5 flex items-center space-x-1">
                      <GlyphEvidencePin size={10} className="text-text-accent shrink-0" />
                      <span>Evidence anchors: {obs.evidenceIds.join(", ")}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* INFERRED */}
              {fnd.inferred.length > 0 && (
                <div className="p-2 rounded-xs bg-ground border border-hairline space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-semibold text-text-accent">
                    <span>[INFERRED HYPOTHESES]</span>
                    <span>{fnd.inferred.length} rules</span>
                  </div>
                  {fnd.inferred.map((inf) => (
                    <div key={inf.id} className="text-text-secondary leading-normal pl-2 border-l border-hairline">
                      {inf.statement}
                      <span className="text-[10px] text-text-muted block mt-0.5">
                        Rule: {inf.ruleId} (via {inf.supportingObservationIds.join(", ")})
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* UNKNOWN */}
              <div className="p-2 rounded-xs bg-status-unknown-bg border border-status-unknown-border space-y-1">
                <div className="flex items-center justify-between text-[10px] font-semibold text-text-primary">
                  <span>[ANALYSIS BOUNDARIES & UNKNOWNS]</span>
                  <span>{fnd.unknown.length} declared</span>
                </div>
                {fnd.unknown.map((unk) => (
                  <div key={unk.id} className="text-text-secondary leading-normal pl-2 border-l border-status-unknown-border">
                    {unk.statement}
                    <span className="text-[10px] text-text-muted block mt-0.5">
                      Boundary category: {unk.reasonCategory}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

