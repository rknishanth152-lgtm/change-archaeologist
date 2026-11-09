import React, { useState, useMemo } from "react";
import { Code, GitCommit, Copy, Check, Info, FileCode2, Layers } from "lucide-react";
import { GlyphEvidencePin } from "./icons/ArchaeologistGlyphs.js";
import type {
  AnalysisReport,
  StructuralChange,
  TestChange,
  EvidenceItem,
  CorrelationItem,
} from "../types/index.js";
import { CodeComparison } from "./CodeComparison.js";
import { formatSpanCoordinates } from "../utils/source-location.js";
import {
  explainStructuralChange,
  explainTestChange,
  explainCorrelation,
  type PlainEnglishExplanation,
} from "../utils/explanation-helpers.js";
import { Badge } from "./ui/Badge.js";
import { TactileButton } from "./ui/TactileButton.js";

interface DetailInspectorProps {
  readonly report: AnalysisReport;
  readonly selectedChange: StructuralChange | null;
  readonly selectedTestChange?: TestChange | null;
  readonly selectedCorrelation?: CorrelationItem | null;
  readonly associatedEvidence?: readonly EvidenceItem[];
  readonly selectedEvidenceId?: string | null;
  readonly onSelectEvidence?: (evidenceId: string) => void;
}

export const DetailInspector: React.FC<DetailInspectorProps> = ({
  report,
  selectedChange,
  selectedTestChange = null,
  selectedCorrelation = null,
  associatedEvidence = [],
  selectedEvidenceId = null,
  onSelectEvidence,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"monaco" | "compact">("monaco");

  const handleCopy = (text: string, key: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const selectedEvidence = useMemo(() => {
    if (!selectedEvidenceId) return null;
    return associatedEvidence.find((e) => e.id === selectedEvidenceId) ?? null;
  }, [selectedEvidenceId, associatedEvidence]);

  const handleEvidenceClick = (evId: string) => {
    if (onSelectEvidence) {
      onSelectEvidence(evId);
    }
  };

  // Derive plain-English explanation grounded in report data
  const plainExplanation = useMemo<PlainEnglishExplanation | null>(() => {
    const targetName = report.request.targetFunctionName;
    if (selectedCorrelation) {
      return explainCorrelation(selectedCorrelation, targetName);
    }
    if (selectedChange) {
      return explainStructuralChange(selectedChange, targetName);
    }
    if (selectedTestChange) {
      return explainTestChange(selectedTestChange, targetName);
    }
    return null;
  }, [selectedCorrelation, selectedChange, selectedTestChange, report.request.targetFunctionName]);

  if (!selectedChange && !selectedCorrelation && !selectedTestChange && associatedEvidence.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center text-text-muted bg-panel border-l border-hairline">
        <Code size={32} strokeWidth={1.5} className="mb-3 text-text-muted opacity-50" />
        <div className="font-display font-medium text-sm text-text-secondary">
          Inspector Standby
        </div>
        <div className="font-mono text-xs max-w-xs mt-1 text-text-muted leading-relaxed">
          Select any structural mutation, companion test, or correlation link from the workspace to inspect Monaco code comparison and epistemic evidence anchors.
        </div>
      </div>
    );
  }

  const headerTitle = selectedChange
    ? `EVIDENCE: ${selectedChange.id}`
    : selectedCorrelation
    ? `CORRELATION: ${selectedCorrelation.id}`
    : selectedTestChange
    ? `TEST CHANGE: ${selectedTestChange.id}`
    : `EVIDENCE: ${selectedEvidenceId ?? "INSPECTION"}`;

  const headerCategory = selectedChange
    ? selectedChange.category
    : selectedCorrelation
    ? selectedCorrelation.classification
    : selectedTestChange
    ? (selectedTestChange.mentionsTargetFunction || selectedTestChange.assertionChanges.some((a) => a.callsTargetFunctionInBlock))
      ? "CALLS TARGET"
      : "TEST FILE"
    : "INSPECTION";

  return (
    <div className="flex flex-col h-full bg-panel border-l border-hairline overflow-y-auto">
      {/* Inspector Header */}
      <div className="h-10 border-b border-hairline px-4 bg-surface-elevated flex items-center justify-between font-mono text-xs select-none shrink-0">
        <div className="flex items-center space-x-2 truncate">
          <span className="font-semibold text-text-primary truncate">
            {headerTitle}
          </span>
          <Badge variant="sandstone" className="shrink-0 uppercase">
            {headerCategory}
          </Badge>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center space-x-1 shrink-0 ml-2">
          <TactileButton
            variant="outline"
            size="xs"
            onClick={() => setViewMode(viewMode === "monaco" ? "compact" : "monaco")}
            aria-label={viewMode === "monaco" ? "Switch to Text View" : "Switch to Monaco Diff"}
          >
            {viewMode === "monaco" ? "Switch to Text View" : "Switch to Monaco Diff"}
          </TactileButton>
        </div>
      </div>

      <div className="p-3 space-y-3.5">
        {/* Plain-English Meaning & Epistemic Boundaries Card */}
        {plainExplanation && (
          <div
            role="region"
            aria-label="Plain-English Explanation"
            className="rounded-md border border-hairline p-3 bg-ground space-y-2.5 font-mono text-xs"
          >
            <div className="flex items-center justify-between pb-2 border-b border-hairline">
              <div className="flex items-center space-x-2">
                <Info size={13} className="text-text-accent shrink-0" />
                <span className="font-sans font-semibold text-xs text-text-primary">
                  {plainExplanation.plainTitle}
                </span>
              </div>
              {plainExplanation.technicalBadge && (
                <Badge variant="terracotta" className="shrink-0 font-mono">
                  {plainExplanation.technicalBadge}
                </Badge>
              )}
            </div>

            {/* What changed / was detected */}
            <div className="font-body text-xs text-text-secondary leading-relaxed">
              <strong className="text-text-primary">Detected: </strong>
              {plainExplanation.whatChanged}
            </div>

            {/* Grounded Evidence Summary */}
            <div className="text-[11px] text-text-muted flex items-center space-x-1.5 pt-0.5">
              <span className="text-text-accent font-bold">§</span>
              <span>{plainExplanation.evidenceSummary}</span>
            </div>

            {/* Epistemic boundaries: Establishes vs Does NOT Establish */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-hairline text-[11px]">
              <div className="p-2 rounded-xs bg-surface-elevated border border-hairline text-text-secondary space-y-1">
                <div className="flex items-center space-x-1 font-semibold text-status-strong text-[10px] uppercase">
                  <Check size={11} strokeWidth={2} />
                  <span>Establishes</span>
                </div>
                <p className="font-body text-[11px] leading-tight text-text-secondary">
                  {plainExplanation.establishes}
                </p>
              </div>

              <div className="p-2 rounded-xs bg-surface-elevated border border-hairline text-text-secondary space-y-1">
                <div className="flex items-center space-x-1 font-semibold text-status-removed text-[10px] uppercase">
                  <span>✕</span>
                  <span>Does NOT Establish</span>
                </div>
                <p className="font-body text-[11px] leading-tight text-text-muted">
                  {plainExplanation.doesNotEstablish}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Main Monaco Code Comparison View */}
        {viewMode === "monaco" ? (
          <div className="h-[420px] min-h-[380px] border border-hairline rounded-md overflow-hidden bg-ground">
            <CodeComparison
              report={report}
              selectedChange={selectedChange}
              selectedEvidence={selectedEvidence}
              evidenceList={associatedEvidence}
              onSelectEvidence={handleEvidenceClick}
            />
          </div>
        ) : (
          /* Compact Snippets Fallback View */
          selectedChange && (
            <div className="space-y-3 font-mono text-xs">
              {/* Before Snippet */}
              <div className="rounded-md border border-hairline overflow-hidden bg-ground">
                <div className="h-7 px-3 bg-surface-elevated border-b border-hairline flex items-center justify-between text-[11px] text-text-muted">
                  <span className="flex items-center space-x-1.5 text-status-removed font-medium">
                    <span>[-] BASE Revision ({report.baseCommit.shortSha})</span>
                    {selectedChange.beforeSpan && (
                      <span className="text-text-muted">
                        {formatSpanCoordinates(selectedChange.beforeSpan)}
                      </span>
                    )}
                  </span>
                  {selectedChange.beforeSnippet && (
                    <button
                      type="button"
                      onClick={() => handleCopy(selectedChange.beforeSnippet!, "before")}
                      className="p-1 hover:text-text-primary text-text-muted rounded-xs focus:outline-none focus-visible:ring-1 focus-visible:ring-border-focus transition-colors cursor-pointer"
                      title="Copy BASE snippet"
                      aria-label="Copy BASE snippet to clipboard"
                    >
                      {copiedKey === "before" ? <Check size={12} className="text-status-strong" /> : <Copy size={12} />}
                    </button>
                  )}
                </div>
                <pre className="p-3 text-[11px] text-text-primary overflow-x-auto bg-surface-code leading-relaxed">
                  <code>{selectedChange.beforeSnippet ?? "// (absent or not applicable)"}</code>
                </pre>
              </div>

              {/* After Snippet */}
              <div className="rounded-md border border-hairline overflow-hidden bg-ground">
                <div className="h-7 px-3 bg-surface-elevated border-b border-hairline flex items-center justify-between text-[11px] text-text-muted">
                  <span className="flex items-center space-x-1.5 text-status-added font-medium">
                    <span>[+] HEAD Revision ({report.headCommit.shortSha})</span>
                    {selectedChange.afterSpan && (
                      <span className="text-text-muted">
                        {formatSpanCoordinates(selectedChange.afterSpan)}
                      </span>
                    )}
                  </span>
                  {selectedChange.afterSnippet && (
                    <button
                      type="button"
                      onClick={() => handleCopy(selectedChange.afterSnippet!, "after")}
                      className="p-1 hover:text-text-primary text-text-muted rounded-xs focus:outline-none focus-visible:ring-1 focus-visible:ring-border-focus transition-colors cursor-pointer"
                      title="Copy HEAD snippet"
                      aria-label="Copy HEAD snippet to clipboard"
                    >
                      {copiedKey === "after" ? <Check size={12} className="text-status-strong" /> : <Copy size={12} />}
                    </button>
                  )}
                </div>
                <pre className="p-3 text-[11px] text-text-primary overflow-x-auto bg-surface-code leading-relaxed">
                  <code>{selectedChange.afterSnippet ?? "// (removed or not applicable)"}</code>
                </pre>
              </div>
            </div>
          )
        )}

        {/* Associated Traceable Evidence Anchors */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-text-muted">
            <span className="font-semibold text-text-secondary">TRACEABLE EVIDENCE ANCHORS</span>
            <span className="text-[10px] tabular-nums">{associatedEvidence.length} items</span>
          </div>

          {associatedEvidence.length === 0 ? (
            <div className="p-3 rounded-sm bg-ground border border-hairline text-xs font-mono text-text-muted">
              No directly linked evidence records in report pool.
            </div>
          ) : (
            associatedEvidence.map((ev) => {
              const isSelected = selectedEvidenceId === ev.id;

              return (
                <div
                  key={ev.id}
                  onClick={() => handleEvidenceClick(ev.id)}
                  role="button"
                  tabIndex={0}
                  aria-selected={isSelected}
                  aria-label={`Evidence anchor ${ev.id}: ${ev.description}`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleEvidenceClick(ev.id);
                    }
                  }}
                  className={`p-2.5 rounded-sm bg-ground border text-xs font-mono space-y-1.5 cursor-pointer transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-border-focus ${
                    isSelected
                      ? "border-border-focus bg-surface-elevated ring-1 ring-border-focus"
                      : "border-hairline hover:border-border-interactive hover:bg-surface-hover"
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center space-x-1.5">
                      <GlyphEvidencePin size={11} className="text-text-accent shrink-0" />
                      <span className="font-semibold text-text-primary">{ev.id}</span>
                      {isSelected && (
                        <span className="text-[9px] font-semibold text-text-accent px-1 rounded-xs bg-surface-elevated border border-border-interactive">
                          ACTIVE ANCHOR
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-text-muted px-1.5 py-0.2 rounded-xs bg-surface-elevated">
                      {ev.kind}
                    </span>
                  </div>

                  <div className="text-[11px] text-text-secondary leading-normal">
                    {ev.description}
                  </div>

                  <div className="flex items-center space-x-2 text-[10px] text-text-muted pt-1 border-t border-hairline">
                    <span className="truncate max-w-[200px]">{ev.posixFilePath}</span>
                    {ev.span && (
                      <span className="text-text-secondary font-mono">
                        ({formatSpanCoordinates(ev.span)})
                      </span>
                    )}
                  </div>

                  {ev.codeSnippet && (
                    <pre className="p-2 text-[10px] text-text-primary bg-surface-code border border-hairline rounded-xs overflow-x-auto">
                      <code>{ev.codeSnippet}</code>
                    </pre>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
