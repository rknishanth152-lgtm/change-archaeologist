/**
 * Change Archaeologist — Correlation view
 *
 * Hosts The Dig (excavation cross-section) and its accessible text alternative.
 * Derives everything from AnalysisReport and reports selection through the
 * same callbacks every other workspace view uses.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import type { AnalysisReport, CorrelationStatus } from "../types/index.js";
import type { DigFocus } from "../types/dig.js";
import { buildCorrelationGraphModel } from "../utils/graph-model.js";
import { buildDigModel, relatedToFocus } from "../utils/dig-model.js";
import { layoutDig } from "../utils/dig-layout.js";
import { DigCanvas } from "./dig/DigCanvas.js";
import { DigDetail } from "./dig/DigDetail.js";
import { DigLegend } from "./dig/DigLegend.js";
import { GraphAccessibleView } from "./graph/GraphAccessibleView.js";

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

const toggleClass = (active: boolean) =>
  `min-h-8 px-3 py-1 text-sm rounded-sm transition-colors duration-fast cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus ${
    active ? "bg-surface-elevated text-text-primary font-semibold" : "text-text-secondary hover:text-text-primary"
  }`;

export const CorrelationGraph: React.FC<CorrelationGraphProps> = ({
  report,
  selectedChangeId,
  selectedTestChangeId,
  selectedCorrelationId,
  onSelectChange,
  onSelectTestChange,
  onSelectEvidence,
  onSelectCorrelation,
}) => {
  const [viewMode, setViewMode] = useState<"dig" | "accessible">("dig");
  const [focus, setFocus] = useState<DigFocus | null>(null);
  const [statusFilter, setStatusFilter] = useState<CorrelationStatus | null>(null);
  const [showAllLines, setShowAllLines] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [availableWidth, setAvailableWidth] = useState(0);
  const stageRef = useRef<HTMLDivElement>(null);

  const digModel = useMemo(() => buildDigModel(report, { expandAll: showAllLines }), [report, showAllLines]);
  const layout = useMemo(() => layoutDig(digModel, availableWidth), [digModel, availableWidth]);
  const lit = useMemo(() => relatedToFocus(digModel, focus), [digModel, focus]);
  const accessibleModel = useMemo(() => buildCorrelationGraphModel(report), [report]);

  const statusCounts = useMemo(() => {
    const counts: Record<CorrelationStatus, number> = { STRONG: 0, WEAK: 0, UNCERTAIN: 0, NONE: 0 };
    digModel.shafts.forEach((shaft) => {
      counts[shaft.status] += 1;
    });
    return counts;
  }, [digModel]);

  useEffect(() => {
    setFocus(null);
    setStatusFilter(null);
    setShowAllLines(false);
    setHint(null);
  }, [report]);

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setViewMode("accessible");
    }
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    setAvailableWidth(stage.clientWidth);
    const observer = new ResizeObserver(() => setAvailableWidth(stage.clientWidth));
    observer.observe(stage);
    return () => observer.disconnect();
  }, [viewMode]);

  const firstEvidence = (ids: readonly string[]) => {
    if (ids.length > 0) onSelectEvidence(ids[0]);
  };

  const handlePick = useCallback(
    (next: DigFocus) => {
      const isSame = focus?.kind === next.kind && focus.id === next.id;
      setFocus(isSame ? null : next);
      if (isSame) return;

      if (next.kind === "fault") {
        onSelectChange(next.id);
        const evidence = digModel.faults
          .find((f) => f.id === next.id)
          ?.findings.flatMap((f) => f.observed.flatMap((o) => o.evidenceIds));
        firstEvidence(evidence ?? []);
      } else if (next.kind === "test") {
        onSelectTestChange(next.id);
        const card = digModel.testFiles.flatMap((f) => f.cards).find((c) => c.id === next.id);
        firstEvidence(card?.kind === "TEST_CHANGE" ? card.evidenceIds : []);
      } else {
        const shaft = digModel.shafts.find((s) => s.id === next.id);
        if (shaft?.correlationItemId) onSelectCorrelation(shaft.correlationItemId);
        firstEvidence(shaft?.evidenceIds ?? []);
      }
    },
    // firstEvidence only wraps onSelectEvidence.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [focus, digModel, onSelectChange, onSelectTestChange, onSelectCorrelation, onSelectEvidence]
  );

  return (
    <div className="flex flex-col min-h-full text-text-primary" style={{ background: "var(--surface-ground)" }}>
      <div className="px-4 py-3 border-b border-hairline flex flex-wrap items-center justify-between gap-3" style={{ background: "var(--surface-panel)" }}>
        <h2 className="m-0 font-sans text-base font-semibold text-text-primary">
          How this change reaches the tests
        </h2>
        <div className="flex items-center p-0.5 rounded-sm border border-hairline" style={{ background: "var(--surface-ground)" }}>
          <button type="button" onClick={() => setViewMode("dig")} aria-pressed={viewMode === "dig"} className={toggleClass(viewMode === "dig")}>
            The Dig
          </button>
          <button type="button" onClick={() => setViewMode("accessible")} aria-pressed={viewMode === "accessible"} className={toggleClass(viewMode === "accessible")}>
            Table view
          </button>
        </div>
      </div>

      {viewMode === "accessible" ? (
        <div className="flex-1 min-w-0">
          <div className="px-4 pt-3 flex justify-start">
            <div className="relative flex items-center">
              <Search size={14} className="absolute left-2.5 text-text-secondary pointer-events-none" aria-hidden="true" />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search changes and tests"
                aria-label="Search changes and tests"
                className="pl-8 pr-7 py-1.5 rounded-sm border border-border-interactive text-sm text-text-primary w-64 max-w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                style={{ background: "var(--surface-panel)" }}
              />
              {searchQuery && (
                <button type="button" onClick={() => setSearchQuery("")} title="Clear search" aria-label="Clear search" className="absolute right-1.5 p-0.5 text-text-secondary hover:text-text-primary cursor-pointer">
                  <X size={13} />
                </button>
              )}
            </div>
          </div>
          <GraphAccessibleView
            model={accessibleModel}
            selectedNodeId={
              selectedChangeId ? `node-sc-${selectedChangeId}` : selectedTestChangeId ? `node-tc-${selectedTestChangeId}` : null
            }
            selectedEdgeId={selectedCorrelationId ? `edge-corr-${selectedCorrelationId}` : null}
            searchQuery={searchQuery}
            onSelectNode={(node) => {
              if (node.data.category === "STRUCTURAL_CHANGE") {
                onSelectChange(node.data.entityId);
                firstEvidence(node.data.evidenceIds);
              } else if (node.data.category === "TEST_CHANGE") {
                onSelectTestChange(node.data.entityId);
                firstEvidence(node.data.evidenceIds);
              }
            }}
            onSelectEdge={(edge) => {
              const matched = report.correlationItems?.find(
                (item) => item.structuralChangeId === edge.data.sourceEntityId && item.testChangeId === edge.data.targetEntityId
              );
              if (matched) {
                onSelectCorrelation(matched.id);
                firstEvidence(matched.evidenceIds);
              }
            }}
            onSelectUnattached={(item) => {
              onSelectCorrelation(item.id);
              firstEvidence(item.evidenceIds);
            }}
            onSelectEvidence={onSelectEvidence}
          />
        </div>
      ) : (
        <div
          className="flex-1 min-w-0 p-4 space-y-3"
          onKeyDown={(event) => {
            if (event.key === "Escape") setFocus(null);
          }}
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="m-0 text-sm text-text-secondary min-h-5">{hint ?? "Select a fault, shaft or test to see what's known about it."}</p>
            {(digModel.hiddenLineCount > 0 || showAllLines) && (
              <button
                type="button"
                aria-pressed={showAllLines}
                onClick={() => setShowAllLines(!showAllLines)}
                className="min-h-8 px-2 text-sm text-text-primary underline underline-offset-2 cursor-pointer rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
              >
                {showAllLines ? "Hide unchanged lines" : "Show all lines"}
              </button>
            )}
          </div>

          <div
            ref={stageRef}
            tabIndex={0}
            aria-label="Excavation diagram. Scrolls sideways when it is wider than the window."
            className="overflow-x-auto rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            style={{ background: "var(--dig-canvas)" }}
          >
            <DigCanvas
              layout={layout}
              functionName={digModel.functionName}
              lit={lit}
              focus={focus}
              statusFilter={statusFilter}
              drillKey={`${report.generatedAtIso}:${digModel.functionName}`}
              onPick={handlePick}
              onHint={setHint}
            />
          </div>

          <DigLegend
            active={statusFilter}
            counts={statusCounts}
            onToggle={(status) => setStatusFilter(statusFilter === status ? null : status)}
          />

          {digModel.unanchoredLinkCount > 0 && (
            <p className="m-0 text-sm text-text-secondary">
              {digModel.unanchoredLinkCount} recorded link{digModel.unanchoredLinkCount === 1 ? " isn't" : "s aren't"} tied to a specific code change, so {digModel.unanchoredLinkCount === 1 ? "it's" : "they're"} listed in the table view.
            </p>
          )}

          <DigDetail model={digModel} report={report} focus={focus} onSelectEvidence={onSelectEvidence} />
        </div>
      )}
    </div>
  );
};
