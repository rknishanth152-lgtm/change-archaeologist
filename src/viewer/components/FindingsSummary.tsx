import React from "react";
import { AlertCircle, AlertTriangle, Info } from "lucide-react";
import type { Finding, ReviewAttentionLevel } from "../types/index.js";
import { ATTENTION_LABEL, UNKNOWN_REASON_LABEL, plainFindingTitle } from "../utils/labels.js";
import { Badge, type BadgeVariant } from "./ui/Badge.js";
import { PartHeading, ViewHeader } from "./ui/Headings.js";
import { GlyphBranch, GlyphEye, GlyphLoupe, GlyphUndug } from "./icons/HeadingGlyphs.js";

interface FindingsSummaryProps {
  readonly findings: readonly Finding[];
  readonly selectedId: string | null;
  readonly onSelectFinding: (id: string) => void;
}

const ATTENTION_STYLE: Record<ReviewAttentionLevel, { variant: BadgeVariant; icon: React.ReactNode }> = {
  HIGH_ATTENTION: { variant: "amber", icon: <AlertCircle size={12} strokeWidth={1.5} /> },
  MODERATE_ATTENTION: { variant: "terracotta", icon: <AlertTriangle size={12} strokeWidth={1.5} /> },
  INFORMATIONAL: { variant: "outline", icon: <Info size={12} strokeWidth={1.5} /> },
};

const Part: React.FC<{ readonly heading: string; readonly icon: React.ReactNode; readonly children: React.ReactNode }> = ({ heading, icon, children }) => (
  <span className="flex flex-col gap-1.5 min-w-0 [overflow-wrap:anywhere]">
    <PartHeading icon={icon}>{heading}</PartHeading>
    {children}
  </span>
);

export const FindingsSummary: React.FC<FindingsSummaryProps> = ({ findings, selectedId, onSelectFinding }) => {
  if (findings.length === 0) {
    return <p className="p-4 text-sm text-text-secondary">This report has no findings.</p>;
  }

  return (
    <div>
      <ViewHeader icon={<GlyphLoupe />} title="What was found" />
      <div className="p-4 flex flex-col gap-3">
      {findings.map((finding) => {
        const isSelected = selectedId === finding.id;
        const attention = ATTENTION_STYLE[finding.attentionLevel];
        return (
          <button
            key={finding.id}
            type="button"
            onClick={() => onSelectFinding(finding.id)}
            aria-pressed={isSelected}
            className={`w-full p-4 rounded-lg border text-left flex flex-col gap-3 transition-colors duration-fast focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus ${
              isSelected ? "bg-surface-elevated border-border-focus" : "bg-panel border-hairline hover:bg-surface-hover"
            }`}
          >
            <span className="flex flex-wrap items-start justify-between gap-2">
              <span className="min-w-0 flex-1 basis-64 text-[15px] font-semibold text-text-primary text-pretty">
                {plainFindingTitle(finding.title)}
              </span>
              <Badge variant={attention.variant} className="shrink-0">
                {attention.icon}
                <span>{ATTENTION_LABEL[finding.attentionLevel]}</span>
              </Badge>
            </span>

            <span className="grid grid-cols-1 xl:grid-cols-3 gap-4 text-sm text-text-secondary leading-relaxed">
              <Part heading="What we saw" icon={<GlyphEye size={14} />}>
                {finding.observed.map((observation) => (
                  <span key={observation.id} className="block">
                    {observation.statement}{" "}
                    <span className="font-mono text-xs whitespace-nowrap">{observation.evidenceIds.join(", ")}</span>
                  </span>
                ))}
              </Part>
              <Part heading="What that suggests" icon={<GlyphBranch size={14} />}>
                {finding.inferred.length === 0 ? (
                  <span className="block">Nothing inferred.</span>
                ) : (
                  finding.inferred.map((inference) => (
                    <span key={inference.id} className="block">{inference.statement}</span>
                  ))
                )}
              </Part>
              <Part heading="What we can't tell" icon={<GlyphUndug size={14} />}>
                {finding.unknown.map((unknown) => (
                  <span key={unknown.id} className="block">
                    {unknown.statement}
                    <span className="block mt-0.5 text-xs">{UNKNOWN_REASON_LABEL[unknown.reasonCategory]}</span>
                  </span>
                ))}
              </Part>
            </span>
          </button>
        );
      })}
      </div>
    </div>
  );
};
