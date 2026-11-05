import React, { useState, useMemo } from "react";
import {
  GitCommit,
  ArrowRight,
  Layers,
  FileCheck,
  Network,
  AlertOctagon,
  Info,
  ChevronRight,
  ExternalLink,
  ShieldAlert,
  FileCode2,
} from "lucide-react";
import type {
  AnalysisReport,
  TimelineFilter,
  TimelineChangeItem,
} from "../types/index.js";
import { buildTimelineModel, filterTimelineItems } from "../utils/timeline-model.js";
import { formatSpanCoordinates } from "../utils/source-location.js";

interface ChangeTimelineProps {
  readonly report: AnalysisReport;
  readonly selectedChangeId: string | null;
  readonly selectedTestChangeId: string | null;
  readonly selectedEvidenceId: string | null;
  readonly onSelectChange: (changeId: string) => void;
  readonly onSelectTestChange: (testChangeId: string) => void;
  readonly onSelectEvidence: (evidenceId: string) => void;
}

export const ChangeTimeline: React.FC<ChangeTimelineProps> = ({
  report,
  selectedChangeId,
  selectedTestChangeId,
  selectedEvidenceId,
  onSelectChange,
  onSelectTestChange,
  onSelectEvidence,
}) => {
  const [filter, setFilter] = useState<TimelineFilter>("all");

  // Derive presentation model
  const model = useMemo(() => buildTimelineModel(report), [report]);

  // Filter items
  const filteredItems = useMemo(
    () => filterTimelineItems(model.items, filter),
    [model.items, filter]
  );

  // Handle card selection
  const handleItemSelect = (item: TimelineChangeItem) => {
    if (item.itemType === "STRUCTURAL_CHANGE") {
      onSelectChange(item.sourceEntityId);
      if (item.evidenceIds.length > 0) {
        onSelectEvidence(item.evidenceIds[0]);
      }
    } else {
      onSelectTestChange(item.sourceEntityId);
      if (item.evidenceIds.length > 0) {
        onSelectEvidence(item.evidenceIds[0]);
      }
    }
  };

  const getChangeTypeBadge = (changeType: TimelineChangeItem["changeType"]) => {
    switch (changeType) {
      case "REMOVED":
      case "DELETED":
        return (
          <span className="px-1.5 py-0.5 rounded-xs font-mono text-[10px] font-semibold text-status-removed bg-status-removed-bg border border-status-removed-border">
            [-] REMOVED
          </span>
        );
      case "ADDED":
        return (
          <span className="px-1.5 py-0.5 rounded-xs font-mono text-[10px] font-semibold text-status-added bg-status-added-bg border border-status-added-border">
            [+] ADDED
          </span>
        );
      case "MODIFIED":
        return (
          <span className="px-1.5 py-0.5 rounded-xs font-mono text-[10px] font-semibold text-status-modified bg-status-modified-bg border border-status-modified-border">
            [Δ] MODIFIED
          </span>
        );
      case "UNMODIFIED_COMPANION":
      default:
        return (
          <span className="px-1.5 py-0.5 rounded-xs font-mono text-[10px] font-semibold text-text-muted bg-ground border border-hairline">
            [=] UNCHANGED
          </span>
        );
    }
  };

  const getCorrelationBadge = (status: TimelineChangeItem["correlationStatus"]) => {
    if (!status) return null;

    switch (status) {
      case "STRONG":
        return (
          <span className="px-1.5 py-0.5 rounded-xs font-mono text-[10px] font-semibold text-status-strong bg-status-strong-bg border border-status-strong-border">
            STRONG CORRELATION
          </span>
        );
      case "WEAK":
        return (
          <span className="px-1.5 py-0.5 rounded-xs font-mono text-[10px] font-semibold text-status-weak bg-status-weak-bg border border-status-weak-border">
            WEAK CORRELATION
          </span>
        );
      case "UNCERTAIN":
        return (
          <span className="px-1.5 py-0.5 rounded-xs font-mono text-[10px] font-semibold text-status-uncertain bg-status-uncertain-bg border border-status-uncertain-border">
            UNCERTAIN
          </span>
        );
      case "NONE":
      default:
        return (
          <span className="px-1.5 py-0.5 rounded-xs font-mono text-[10px] font-semibold text-status-none bg-status-none-bg border border-status-none-border">
            NO CORRELATION
          </span>
        );
    }
  };

  return (
    <div className="p-4 space-y-6 max-w-5xl mx-auto">
      {/* 0. Section Header */}
      <div className="flex items-center justify-between border-b border-hairline pb-3">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="font-display text-sm font-semibold text-text-primary tracking-wide">
              Commit-to-Commit Change Timeline
            </h2>
            <span className="font-sans text-[11px] text-text-accent font-medium">
              (What Changed Between Versions)
            </span>
          </div>
          <p className="font-mono text-xs text-text-muted mt-0.5">
            Deterministic comparative change snapshot between {model.baseAnchor.shortSha} and {model.headAnchor.shortSha}
          </p>
        </div>
      </div>

      {/* 1. Revision Overview Bar */}
      <div className="rounded-md border border-hairline bg-panel p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* BASE Revision Card */}
          <div className="flex-1 rounded-sm border border-hairline bg-ground p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded-xs font-mono text-[11px] font-semibold text-status-removed bg-status-removed-bg border border-status-removed-border">
                BASE (PREVIOUS)
              </span>
              <span
                className="font-mono text-xs text-text-primary font-semibold"
                title={`Full Commit SHA: ${model.baseAnchor.sha}`}
              >
                {model.baseAnchor.shortSha}
              </span>
            </div>
            <div className="font-body text-xs text-text-primary font-medium line-clamp-1" title={model.baseAnchor.subject}>
              {model.baseAnchor.subject}
            </div>
            <div className="font-mono text-[10px] text-text-muted flex items-center justify-between">
              <span>{model.baseAnchor.authorName}</span>
              <span>{model.baseAnchor.committedAtIso.slice(0, 10)}</span>
            </div>
            <div className="pt-1.5 border-t border-hairline flex items-center justify-between font-mono text-[10px]">
              <span className="text-text-muted">Target Entity:</span>
              <span className="text-text-secondary font-medium">
                {model.baseAnchor.functionStatus === "PRESENT"
                  ? `${report.request.targetFunctionName}()`
                  : `[${model.baseAnchor.functionStatus}]`}
              </span>
            </div>
          </div>

          {/* Comparison Direction Flow */}
          <div className="flex flex-col items-center justify-center px-2 py-1 text-center shrink-0 space-y-1">
            <div className="flex items-center space-x-1 font-mono text-xs font-semibold text-text-muted">
              <span>BASE</span>
              <ArrowRight size={14} className="text-text-accent" />
              <span>HEAD</span>
            </div>
            <span className="text-[10px] font-mono text-text-secondary bg-surface-elevated px-2 py-0.5 rounded-xs border border-hairline">
              {model.comparisonDirection}
            </span>
            <span className="text-[9px] font-mono text-text-muted uppercase">
              Comparative Snapshot
            </span>
          </div>

          {/* HEAD Revision Card */}
          <div className="flex-1 rounded-sm border border-hairline bg-ground p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded-xs font-mono text-[11px] font-semibold text-status-added bg-status-added-bg border border-status-added-border">
                HEAD (CURRENT)
              </span>
              <span
                className="font-mono text-xs text-text-primary font-semibold"
                title={`Full Commit SHA: ${model.headAnchor.sha}`}
              >
                {model.headAnchor.shortSha}
              </span>
            </div>
            <div className="font-body text-xs text-text-primary font-medium line-clamp-1" title={model.headAnchor.subject}>
              {model.headAnchor.subject}
            </div>
            <div className="font-mono text-[10px] text-text-muted flex items-center justify-between">
              <span>{model.headAnchor.authorName}</span>
              <span>{model.headAnchor.committedAtIso.slice(0, 10)}</span>
            </div>
            <div className="pt-1.5 border-t border-hairline flex items-center justify-between font-mono text-[10px]">
              <span className="text-text-muted">Target Entity:</span>
              <span
                className={`font-medium ${
                  model.headAnchor.functionStatus === "DELETED"
                    ? "text-status-removed font-semibold"
                    : "text-text-secondary"
                }`}
              >
                {model.headAnchor.functionStatus === "PRESENT"
                  ? `${report.request.targetFunctionName}()`
                  : `[${model.headAnchor.functionStatus} IN HEAD]`}
              </span>
            </div>
          </div>
        </div>

        {/* Epistemic Non-Causality Disclaimer */}
        <div className="pt-2 border-t border-hairline flex items-center justify-between text-[11px] font-mono text-text-muted">
          <div className="flex items-center space-x-1.5">
            <Info size={13} className="text-status-uncertain shrink-0" />
            <span>
              <strong className="font-semibold text-text-secondary">Epistemic Non-Causality Principle:</strong>{" "}
              Two-revision comparative analysis. Change ordering reflects syntactic grouping, not temporal execution or verified causality.
            </span>
          </div>
          <span className="text-[10px] text-text-secondary uppercase px-1.5 py-0.5 rounded-xs bg-ground border border-hairline shrink-0">
            {report.status}
          </span>
        </div>
      </div>

      {/* 2. Incomplete Analysis Notice (if applicable, e.g. Scenario F) */}
      {model.isIncomplete && (
        <div className="rounded-md border border-status-removed-border bg-status-removed-bg p-4 flex items-start space-x-3">
          <AlertOctagon size={20} className="text-status-removed shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-display font-semibold text-xs text-text-primary">
              Comparative Analysis Incomplete
            </div>
            <p className="font-body text-xs text-text-secondary leading-relaxed">
              {model.incompleteReason}
            </p>
          </div>
        </div>
      )}

      {/* 3. Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline pb-3">
        <div className="flex items-center space-x-1 bg-panel border border-hairline p-0.5 rounded-sm font-mono text-xs">
          <button
            type="button"
            onClick={() => setFilter("all")}
            aria-pressed={filter === "all"}
            className={`px-2.5 py-1 rounded-xs transition-colors ${
              filter === "all"
                ? "bg-surface-elevated text-text-primary font-semibold shadow-xs"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            All Changes ({model.totalChangesCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter("structural")}
            aria-pressed={filter === "structural"}
            className={`px-2.5 py-1 rounded-xs transition-colors ${
              filter === "structural"
                ? "bg-surface-elevated text-text-primary font-semibold shadow-xs"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            Production Mutations ({model.structuralCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter("tests")}
            aria-pressed={filter === "tests"}
            className={`px-2.5 py-1 rounded-xs transition-colors ${
              filter === "tests"
                ? "bg-surface-elevated text-text-primary font-semibold shadow-xs"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            Test Suite ({model.testChangeCount + model.declarationCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter("correlated")}
            aria-pressed={filter === "correlated"}
            className={`px-2.5 py-1 rounded-xs transition-colors ${
              filter === "correlated"
                ? "bg-surface-elevated text-text-primary font-semibold shadow-xs"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            Correlated ({model.correlatedCount})
          </button>
        </div>

        <div className="font-mono text-xs text-text-muted">
          Showing <span className="font-medium text-text-primary">{filteredItems.length}</span> of{" "}
          <span className="font-medium text-text-primary">{model.totalChangesCount}</span> changes
        </div>
      </div>

      {/* 4. Timeline Track */}
      {filteredItems.length === 0 ? (
        <div className="rounded-md border border-hairline bg-panel p-8 text-center text-text-muted space-y-2">
          <Info size={28} className="mx-auto text-text-muted opacity-50" />
          <div className="font-display font-medium text-sm text-text-secondary">
            No changes recorded in this view
          </div>
          <div className="font-mono text-xs max-w-sm mx-auto text-text-muted">
            {filter === "tests"
              ? "No companion test changes or assertion modifications were observed between BASE and HEAD."
              : filter === "correlated"
              ? "No correlated production and test change pairs were detected."
              : "No changes matching the active filter criteria were found in the report."}
          </div>
        </div>
      ) : (
        <div
          role="list"
          aria-label="Commit-to-commit changes timeline"
          className="relative pl-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-hairline space-y-4"
        >
          {filteredItems.map((item) => {
            const isSelected =
              item.itemType === "STRUCTURAL_CHANGE"
                ? selectedChangeId === item.sourceEntityId
                : selectedTestChangeId === item.sourceEntityId;

            return (
              <div
                key={item.id}
                role="listitem"
                data-testid="timeline-card"
                tabIndex={0}
                aria-selected={isSelected}
                onClick={() => handleItemSelect(item)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleItemSelect(item);
                  }
                }}
                className={`relative rounded-md border p-3.5 transition-all cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-border-focus ${
                  isSelected
                    ? "bg-surface-elevated border-text-accent shadow-xs"
                    : "bg-panel border-hairline hover:border-border-interactive"
                }`}
              >
                {/* Visual Marker Dot on Timeline Axis */}
                <span
                  className={`absolute -left-[27px] top-4 w-3.5 h-3.5 rounded-full border-2 bg-ground transition-colors ${
                    item.changeType === "REMOVED"
                      ? "border-status-removed"
                      : item.changeType === "ADDED"
                      ? "border-status-added"
                      : "border-status-modified"
                  } ${isSelected ? "ring-2 ring-text-accent ring-offset-1 ring-offset-ground" : ""}`}
                />

                {/* Card Header */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    {item.itemType === "STRUCTURAL_CHANGE" ? (
                      <Layers size={13} className="text-text-accent" />
                    ) : (
                      <FileCheck size={13} className="text-status-strong" />
                    )}
                    <span className="font-mono text-xs font-semibold text-text-primary">
                      {item.sourceEntityId}
                    </span>
                    <span className="font-mono text-[10px] text-text-muted uppercase px-1.5 py-0.5 rounded-xs bg-ground border border-hairline">
                      {item.category}
                    </span>
                    {getChangeTypeBadge(item.changeType)}
                  </div>

                  <div className="flex items-center space-x-1.5">
                    {getCorrelationBadge(item.correlationStatus)}
                    <span className="font-mono text-[9px] text-text-muted uppercase px-1 py-0.5 bg-ground rounded-xs border border-hairline">
                      [{item.epistemicTag}]
                    </span>
                  </div>
                </div>

                {/* Title */}
                <div className="mt-2 font-body text-xs font-medium text-text-primary leading-snug">
                  {item.title}
                </div>

                {/* Target Coordinates & Location */}
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] text-text-muted pt-2 border-t border-hairline">
                  <div className="flex items-center space-x-2 truncate max-w-md">
                    <span className="text-text-secondary truncate" title={item.filePath}>
                      {item.filePath}
                    </span>
                    {item.span ? (
                      <span className="px-1.5 py-0.5 rounded-xs bg-ground border border-hairline text-[10px] text-text-primary">
                        {formatSpanCoordinates(item.span)}
                      </span>
                    ) : (
                      <span className="text-[10px] text-text-muted italic">
                        (span unavailable)
                      </span>
                    )}
                  </div>

                  {/* Traceable Evidence Pills */}
                  {item.evidenceIds.length > 0 && (
                    <div className="flex items-center space-x-1 shrink-0">
                      <span className="text-[10px] text-text-muted">Evidence:</span>
                      {item.evidenceIds.map((evId) => {
                        const isEvidenceSelected = selectedEvidenceId === evId;
                        return (
                          <button
                            key={evId}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectEvidence(evId);
                              if (item.itemType === "STRUCTURAL_CHANGE") {
                                onSelectChange(item.sourceEntityId);
                              } else {
                                onSelectTestChange(item.sourceEntityId);
                              }
                            }}
                            className={`px-1.5 py-0.5 rounded-xs font-mono text-[10px] font-semibold border transition-colors ${
                              isEvidenceSelected
                                ? "bg-text-accent text-ground border-text-accent"
                                : "bg-ground text-text-accent border-hairline hover:border-border-interactive"
                            }`}
                            title={`Inspect evidence anchor ${evId}`}
                          >
                            {evId}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Correlation Rationale Callout (if correlated) */}
                {item.correlationRationale && (
                  <div className="mt-2 p-2 rounded-xs bg-ground border border-hairline font-mono text-[10px] text-text-muted flex items-start space-x-1.5">
                    <Info size={11} className="text-status-uncertain shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{item.correlationRationale}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Companion Test Status Notice when test changes are 0 */}
      {model.testChangeCount === 0 && model.declarationCount === 0 && (
        <div className="rounded-md border border-hairline bg-panel p-3 flex items-center space-x-2.5 font-mono text-xs text-text-muted">
          <Info size={14} className="text-text-muted shrink-0" />
          <span>No companion test mutations in this comparison (test files unmodified or absent).</span>
        </div>
      )}
    </div>
  );
};
