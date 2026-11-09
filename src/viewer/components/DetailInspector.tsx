import React, { useMemo, useState } from "react";
import { Check, Copy, MousePointerClick } from "lucide-react";
import type {
  AnalysisReport,
  StructuralChange,
  TestChange,
  EvidenceItem,
  CorrelationItem,
} from "../types/index.js";
import { CodeComparison } from "./CodeComparison.js";
import {
  explainStructuralChange,
  explainTestChange,
  explainCorrelation,
  type PlainEnglishExplanation,
} from "../utils/explanation-helpers.js";
import { EVIDENCE_KIND_LABEL, formatLines } from "../utils/labels.js";
import { TactileButton } from "./ui/TactileButton.js";

interface DetailInspectorProps {
  readonly report: AnalysisReport;
  readonly selectedChange: StructuralChange | null;
  readonly selectedTestChange?: TestChange | null;
  readonly selectedCorrelation?: CorrelationItem | null;
  readonly associatedEvidence?: readonly EvidenceItem[];
  readonly selectedEvidenceId?: string | null;
  readonly onSelectEvidence?: (evidenceId: string) => void;
  readonly prefersSideBySide?: boolean;
}

const SnippetPanel: React.FC<{
  readonly label: string;
  readonly code: string | null;
  readonly absentText: string;
  readonly tone: string;
}> = ({ label, code, absentText, tone }) => {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-md border border-hairline overflow-hidden">
      <div className="min-h-8 px-3 bg-surface-elevated flex items-center justify-between text-xs">
        <span className={`font-medium ${tone}`}>{label}</span>
        {code && (
          <button
            type="button"
            onClick={() => {
              navigator?.clipboard?.writeText(code).catch(() => {});
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="p-1 text-text-secondary hover:text-text-primary rounded-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            aria-label={`Copy: ${label}`}
          >
            {copied ? <Check size={12} className="text-status-strong" /> : <Copy size={12} />}
          </button>
        )}
      </div>
      <pre className="m-0 p-3 font-mono text-xs text-text-primary overflow-x-auto bg-surface-code leading-relaxed">
        <code>{code ?? absentText}</code>
      </pre>
    </div>
  );
};

export const DetailInspector: React.FC<DetailInspectorProps> = ({
  report,
  selectedChange,
  selectedTestChange = null,
  selectedCorrelation = null,
  associatedEvidence = [],
  selectedEvidenceId = null,
  onSelectEvidence,
  prefersSideBySide = false,
}) => {
  const [viewMode, setViewMode] = useState<"diff" | "text">("diff");

  const selectedEvidence = useMemo(
    () => associatedEvidence.find((item) => item.id === selectedEvidenceId) ?? null,
    [selectedEvidenceId, associatedEvidence]
  );

  const explanation = useMemo<PlainEnglishExplanation | null>(() => {
    const target = report.request.targetFunctionName;
    if (selectedCorrelation) return explainCorrelation(selectedCorrelation, target);
    if (selectedChange) return explainStructuralChange(selectedChange, target);
    if (selectedTestChange) return explainTestChange(selectedTestChange, target);
    return null;
  }, [selectedCorrelation, selectedChange, selectedTestChange, report.request.targetFunctionName]);

  if (!selectedChange && !selectedCorrelation && !selectedTestChange && associatedEvidence.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center text-text-secondary">
        <MousePointerClick size={28} strokeWidth={1.5} className="mb-3" aria-hidden="true" />
        <p className="m-0 text-sm">Select a change, test or link to see its details and code here.</p>
      </div>
    );
  }

  const heading = explanation?.plainTitle ?? "Evidence";
  const tag = selectedCorrelation?.id ?? selectedChange?.id ?? selectedTestChange?.id ?? selectedEvidenceId ?? "";

  return (
    <div className="flex flex-col h-full overflow-y-auto overscroll-contain">
      <div className="min-h-12 px-4 py-2 border-b border-hairline flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-baseline gap-2 min-w-0">
          <h2 className="m-0 text-sm font-semibold text-text-primary truncate">{heading}</h2>
          <span className="font-mono text-xs text-text-secondary shrink-0">{tag}</span>
        </div>
        <TactileButton
          variant="outline"
          size="xs"
          className="shrink-0"
          onClick={() => setViewMode(viewMode === "diff" ? "text" : "diff")}
        >
          {viewMode === "diff" ? "Show as text" : "Show diff"}
        </TactileButton>
      </div>

      <div className="p-4 space-y-4">
        {explanation && (
          <div role="region" aria-label="What this means" className="space-y-3">
            <p className="m-0 text-sm leading-relaxed text-text-secondary">{explanation.whatChanged}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="min-w-0 space-y-1">
                <h3 className="m-0 text-xs font-semibold text-text-primary">What this shows</h3>
                <p className="m-0 leading-relaxed text-text-secondary">{explanation.establishes}</p>
              </div>
              <div className="min-w-0 space-y-1">
                <h3 className="m-0 text-xs font-semibold text-text-primary">What this doesn't show</h3>
                <p className="m-0 leading-relaxed text-text-secondary">{explanation.doesNotEstablish}</p>
              </div>
            </div>
          </div>
        )}

        {viewMode === "diff" ? (
          <div className={`min-h-[320px] border border-hairline rounded-md overflow-hidden ${prefersSideBySide ? "h-[min(56vh,560px)]" : "h-[380px]"}`}>
            <CodeComparison
              report={report}
              selectedChange={selectedChange}
              selectedEvidence={selectedEvidence}
              evidenceList={associatedEvidence}
              onSelectEvidence={(id) => onSelectEvidence?.(id)}
              prefersSideBySide={prefersSideBySide}
            />
          </div>
        ) : (
          selectedChange && (
            <div className="space-y-3">
              <SnippetPanel
                label={`Before (${report.baseCommit.shortSha})`}
                code={selectedChange.beforeSnippet}
                absentText="Not present in this version"
                tone="text-status-removed"
              />
              <SnippetPanel
                label={`After (${report.headCommit.shortSha})`}
                code={selectedChange.afterSnippet}
                absentText="Not present in this version"
                tone="text-status-added"
              />
            </div>
          )
        )}

        <section aria-label="Evidence" className="space-y-2">
          <h3 className="m-0 text-sm font-semibold text-text-primary">
            Evidence <span className="font-normal text-text-secondary tabular-nums">{associatedEvidence.length}</span>
          </h3>

          {associatedEvidence.length === 0 ? (
            <p className="m-0 text-sm text-text-secondary">No evidence is linked to this item.</p>
          ) : (
            associatedEvidence.map((item) => {
              const isSelected = selectedEvidenceId === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectEvidence?.(item.id)}
                  aria-pressed={isSelected}
                  className={`w-full p-3 rounded-md border text-left space-y-1.5 transition-colors duration-fast focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus ${
                    isSelected ? "border-border-focus bg-surface-elevated" : "border-hairline hover:bg-surface-hover"
                  }`}
                >
                  <span className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-text-primary">{EVIDENCE_KIND_LABEL[item.kind]}</span>
                    <span className="font-mono text-text-secondary">{item.id}</span>
                  </span>
                  <span className="block text-sm text-text-secondary">{item.description}</span>
                  <span className="block font-mono text-xs text-text-secondary break-all">
                    {item.posixFilePath}
                    {formatLines(item.span) ? ` · ${formatLines(item.span)}` : ""}
                  </span>
                  {item.codeSnippet && (
                    <code className="block p-2 font-mono text-xs text-text-primary bg-surface-code rounded-xs overflow-x-auto whitespace-pre">
                      {item.codeSnippet}
                    </code>
                  )}
                </button>
              );
            })
          )}
        </section>
      </div>
    </div>
  );
};
