import React from "react";
import { ShieldCheck, ChevronRight } from "lucide-react";
import type { CorrelationItem, CorrelationStatus } from "../types/index.js";
import {
  GlyphCorrStrong,
  GlyphCorrWeak,
  GlyphCorrUncertain,
  GlyphCorrNone,
} from "./icons/ArchaeologistGlyphs.js";

interface CorrelationMatrixTableProps {
  readonly correlationItems?: readonly CorrelationItem[];
  readonly selectedId: string | null;
  readonly onSelectCorrelation: (id: string) => void;
}

export const CorrelationMatrixTable: React.FC<CorrelationMatrixTableProps> = ({
  correlationItems,
  selectedId,
  onSelectCorrelation,
}) => {
  if (!correlationItems || correlationItems.length === 0) {
    return (
      <div className="p-8 text-center text-xs font-mono text-text-muted border border-hairline rounded-md bg-panel m-4">
        Zero correlation records present in the active analysis report.
      </div>
    );
  }

  const renderStatusBadge = (status: CorrelationStatus) => {
    switch (status) {
      case "STRONG":
        return (
          <span className="inline-flex items-center space-x-1 font-mono text-[10px] font-semibold text-status-strong bg-status-strong-bg border border-status-strong-border px-1.5 py-0.5 rounded-xs">
            <GlyphCorrStrong size={12} />
            <span>[STRONG]</span>
          </span>
        );
      case "WEAK":
        return (
          <span className="inline-flex items-center space-x-1 font-mono text-[10px] font-semibold text-status-weak bg-status-weak-bg border border-status-weak-border px-1.5 py-0.5 rounded-xs">
            <GlyphCorrWeak size={12} />
            <span>[WEAK]</span>
          </span>
        );
      case "UNCERTAIN":
        return (
          <span className="inline-flex items-center space-x-1 font-mono text-[10px] font-semibold text-status-uncertain bg-status-uncertain-bg border border-status-uncertain-border px-1.5 py-0.5 rounded-xs">
            <GlyphCorrUncertain size={12} />
            <span>[UNCERTAIN]</span>
          </span>
        );
      case "NONE":
      default:
        return (
          <span className="inline-flex items-center space-x-1 font-mono text-[10px] font-semibold text-status-none bg-status-none-bg border border-status-none-border px-1.5 py-0.5 rounded-xs">
            <GlyphCorrNone size={12} />
            <span>[NONE]</span>
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col h-full bg-ground overflow-y-auto p-3 space-y-3">
      {/* Epistemic Correlation Disclaimer Banner */}
      <div className="px-3 py-2 rounded-sm bg-panel border border-hairline flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono text-text-secondary">
        <div className="flex items-center space-x-2">
          <ShieldCheck size={14} strokeWidth={1.5} className="text-text-accent flex-shrink-0" />
          <span className="text-[11px] leading-normal font-body">
            <strong className="text-text-primary font-sans font-semibold">Code–Test Relationships:</strong> High Syntactic Proximity and Co-occurrence signals prioritize human review. Correlation does <span className="underline decoration-status-removed underline-offset-2">not</span> establish runtime test execution or dynamic correctness.
          </span>
        </div>
        <span className="hidden md:inline-block text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded-xs bg-surface-elevated text-text-muted border border-hairline shrink-0">
          Syntactic Proximity Only
        </span>
      </div>

      {/* Plain-English Status Key */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono">
        <div className="p-1.5 rounded-xs bg-panel border border-hairline">
          <span className="text-status-strong font-semibold">[STRONG]:</span> Direct call to changed function
        </div>
        <div className="p-1.5 rounded-xs bg-panel border border-hairline">
          <span className="text-status-weak font-semibold">[WEAK]:</span> Enclosing test block updated
        </div>
        <div className="p-1.5 rounded-xs bg-panel border border-hairline">
          <span className="text-status-uncertain font-semibold">[UNCERTAIN]:</span> Ambiguous evidence
        </div>
        <div className="p-1.5 rounded-xs bg-panel border border-hairline">
          <span className="text-text-muted font-semibold">[NONE]:</span> No linked test edits in commit
        </div>
      </div>

      {correlationItems.map((item) => {
        const isSelected = selectedId === item.id;

        return (
          <div
            key={item.id}
            onClick={() => onSelectCorrelation(item.id)}
            role="button"
            tabIndex={0}
            aria-selected={isSelected}
            aria-label={`Correlation item ${item.id}, status ${item.status}, ${item.classification}`}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelectCorrelation(item.id);
              }
            }}
            className={`rounded-md border p-3.5 bg-panel cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus ${
              isSelected ? "border-border-focus ring-1 ring-border-focus bg-surface-elevated" : "border-hairline hover:border-border-interactive hover:bg-surface-hover"
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-hairline">
              <div className="flex items-center space-x-2">
                <span className="font-mono text-xs font-semibold text-text-primary">
                  {item.id}
                </span>
                {renderStatusBadge(item.status)}
                <span className="font-mono text-[11px] text-text-muted truncate">
                  {item.classification}
                </span>
              </div>
              <div className="flex items-center space-x-2 font-mono text-[10px] text-text-muted">
                {item.structuralChangeId && (
                  <span className="px-1.5 py-0.5 rounded-xs bg-ground border border-hairline">
                    SC: {item.structuralChangeId}
                  </span>
                )}
                {item.testChangeId && (
                  <span className="px-1.5 py-0.5 rounded-xs bg-ground border border-hairline">
                    TC: {item.testChangeId}
                  </span>
                )}
                <ChevronRight size={14} strokeWidth={1.5} className="text-text-muted" />
              </div>
            </div>

            {/* Rationale & Facts */}
            <div className="mt-2.5 space-y-2 text-xs">
              <div className="text-text-secondary leading-relaxed font-body">
                {item.rationale}
              </div>

              {/* Observed vs Inferred */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                <div className="p-2 rounded-xs bg-ground border border-hairline">
                  <span className="text-[10px] text-text-muted block font-semibold mb-0.5 uppercase">
                    Observed Syntactic Fact
                  </span>
                  <span className="text-text-primary leading-normal">
                    {item.observedFact}
                  </span>
                </div>
                <div className="p-2 rounded-xs bg-ground border border-hairline">
                  <span className="text-[10px] text-text-muted block font-semibold mb-0.5 uppercase">
                    Inferred Conservative Relationship
                  </span>
                  <span className="text-text-accent leading-normal">
                    {item.inferredRelationship}
                  </span>
                </div>
              </div>

              {/* Unknowns boundary */}
              {item.unknowns && item.unknowns.length > 0 && (
                <div className="mt-2 p-2 rounded-xs bg-status-unknown-bg border border-status-unknown-border text-[11px] font-mono space-y-1">
                  <span className="text-[10px] font-semibold text-text-primary uppercase block">
                    Unverified Runtime Boundaries (Unknowns)
                  </span>
                  <ul className="list-disc pl-4 space-y-0.5 text-text-secondary">
                    {item.unknowns.map((unk, uIdx) => (
                      <li key={uIdx}>{unk}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

