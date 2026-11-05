/**
 * ExecutiveSummaryStrip Component
 *
 * Change Archaeologist — Executive Metrics & Epistemic Guardrails
 *
 * Implements full metric breakdown and epistemic guardrails display:
 * - Uses ArchaeologistGlyphs domain iconography.
 * - Retains exact testable contracts for target entity, mutations, test counts, and invariant warnings.
 * - Accessible and restrained styling matching the warm paper aesthetic.
 */

import React from "react";
import { ShieldAlert, GitBranch, HelpCircle } from "lucide-react";
import type { AnalysisReport } from "../types/index.js";
import { TactileButton } from "./ui/TactileButton.js";
import { Badge } from "./ui/Badge.js";
import {
  GlyphDeltaModified,
  GlyphDeltaAdded,
  GlyphCorrStrong,
  GlyphEpistemicTier,
} from "./icons/ArchaeologistGlyphs.js";

export interface ExecutiveSummaryStripProps {
  readonly report: AnalysisReport;
  readonly isGuideOpen?: boolean;
  readonly onToggleGuide?: () => void;
}

export const ExecutiveSummaryStrip: React.FC<ExecutiveSummaryStripProps> = ({
  report,
  isGuideOpen = false,
  onToggleGuide,
}) => {
  const scCount = report.structuralChanges.length;
  const tcCount = report.testChanges.length;
  const corrCount =
    report.correlationItems?.length ?? report.correlations.length;
  const findingsCount = report.findings.length;
  const assertionCount = report.testChanges.reduce(
    (acc, tc) => acc + tc.assertionChanges.length,
    0
  );

  const strongCount =
    report.correlationItems?.filter((c) => c.status === "STRONG").length ??
    report.correlations.filter((c) => c.status === "STRONG").length;

  const weakCount =
    report.correlationItems?.filter((c) => c.status === "WEAK").length ??
    report.correlations.filter((c) => c.status === "WEAK").length;

  const uncertainCount =
    report.correlationItems?.filter((c) => c.status === "UNCERTAIN").length ??
    report.correlations.filter((c) => c.status === "UNCERTAIN").length;

  const noneCount =
    report.correlationItems?.filter((c) => c.status === "NONE").length ??
    report.correlations.filter((c) => c.status === "NONE").length;

  const hasHighAttention = report.findings.some(
    (f) => f.attentionLevel === "HIGH_ATTENTION"
  );

  return (
    <div
      className="shrink-0"
      style={{
        borderBottom: "1px solid var(--border-hairline)",
        background: "var(--surface-panel)",
      }}
    >
      {/* Primary metrics strip — editorial horizontal grid */}
      <div
        className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 divide-x divide-hairline"
        style={{ borderBottom: "1px solid var(--border-hairline)" }}
      >
        {/* Card 1: TARGET ENTITY */}
        <div className="flex flex-col justify-between px-4 py-3 min-w-0">
          <div className="flex items-center justify-between text-text-muted text-[10px] font-mono tracking-wider">
            <div className="flex items-center space-x-1.5 truncate">
              <span className="font-sans font-semibold text-text-secondary text-[11px]">
                Target Entity
              </span>
              <span className="text-[9px] text-text-muted font-mono uppercase px-1 rounded-xs bg-ground border border-hairline">
                TARGET ENTITY
              </span>
            </div>
            <GitBranch
              size={11}
              strokeWidth={1.5}
              className="text-text-accent shrink-0 ml-1"
            />
          </div>
          <div className="mt-1 truncate">
            <div
              className="font-display font-semibold text-sm truncate"
              style={{ color: "var(--text-primary)", letterSpacing: "-0.01em" }}
              title={report.request.targetFunctionName}
            >
              {report.request.targetFunctionName}
            </div>
            <div
              className="font-mono text-[10px] text-text-muted truncate mt-0.5"
              title={report.request.targetFilePath}
            >
              {report.request.targetFilePath}
            </div>
          </div>
        </div>

        {/* Card 2: STRUCTURAL MUTATIONS */}
        <div className="flex flex-col justify-between px-4 py-3 min-w-0">
          <div className="flex items-center justify-between text-text-muted text-[10px] font-mono tracking-wider">
            <div className="flex items-center space-x-1.5 truncate">
              <span className="font-sans font-semibold text-text-secondary text-[11px]">
                Code Changes
              </span>
              <span className="text-[9px] text-text-muted font-mono uppercase px-1 rounded-xs bg-ground border border-hairline">
                STRUCTURAL MUTATIONS
              </span>
            </div>
            <GlyphDeltaModified
              size={12}
              className="text-status-modified shrink-0 ml-1"
            />
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="font-mono text-xl font-semibold text-text-primary tabular-nums">
              {scCount}
            </span>
            <div className="flex items-center space-x-1 font-mono text-[9px]">
              {report.structuralChanges.some((s) => s.changeType === "ADDED") && (
                <Badge variant="verdigris" dot className="px-1 py-0 text-[9px]">
                  <span className="sr-only">Added: </span>+ADD
                </Badge>
              )}
              {report.structuralChanges.some(
                (s) => s.changeType === "MODIFIED"
              ) && (
                <Badge variant="terracotta" dot className="px-1 py-0 text-[9px]">
                  <span className="sr-only">Modified: </span>ΔMOD
                </Badge>
              )}
              {report.structuralChanges.some(
                (s) => s.changeType === "REMOVED"
              ) && (
                <Badge variant="amber" dot className="px-1 py-0 text-[9px]">
                  <span className="sr-only">Removed: </span>-REM
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Card 3: COMPANION TEST FILES */}
        <div className="flex flex-col justify-between px-4 py-3 min-w-0">
          <div className="flex items-center justify-between text-text-muted text-[10px] font-mono tracking-wider">
            <div className="flex items-center space-x-1.5 truncate">
              <span className="font-sans font-semibold text-text-secondary text-[11px]">
                Related Tests
              </span>
              <span className="text-[9px] text-text-muted font-mono uppercase px-1 rounded-xs bg-ground border border-hairline">
                COMPANION TEST FILES
              </span>
            </div>
            <GlyphDeltaAdded
              size={12}
              className="text-status-strong shrink-0 ml-1"
            />
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="font-mono text-xl font-semibold text-text-primary tabular-nums">
              {tcCount}
            </span>
            <span className="font-mono text-[10px] text-text-muted tabular-nums">
              {assertionCount} assertions
            </span>
          </div>
        </div>

        {/* Card 4: CORRELATION LINKS */}
        <div className="flex flex-col justify-between px-4 py-3 min-w-0">
          <div className="flex items-center justify-between text-text-muted text-[10px] font-mono tracking-wider">
            <div className="flex items-center space-x-1.5 truncate">
              <span className="font-sans font-semibold text-text-secondary text-[11px]">
                Code–Test Links
              </span>
              <span className="text-[9px] text-text-muted font-mono uppercase px-1 rounded-xs bg-ground border border-hairline">
                CORRELATION LINKS
              </span>
            </div>
            <GlyphCorrStrong
              size={12}
              className="text-text-accent shrink-0 ml-1"
            />
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="font-mono text-xl font-semibold text-text-primary tabular-nums">
              {corrCount}
            </span>
            <div className="flex items-center space-x-1.5 font-mono text-[9px]">
              {strongCount > 0 && (
                <span
                  className="font-semibold"
                  style={{ color: "var(--status-strong-fg)" }}
                >
                  {strongCount} STRONG
                </span>
              )}
              {weakCount > 0 && (
                <span
                  className="font-semibold"
                  style={{ color: "var(--status-weak-fg)" }}
                >
                  {weakCount} WEAK
                </span>
              )}
              {uncertainCount > 0 && (
                <span
                  className="font-semibold"
                  style={{ color: "var(--status-uncertain-fg)" }}
                >
                  {uncertainCount} UNCERTAIN
                </span>
              )}
              {strongCount === 0 &&
                weakCount === 0 &&
                uncertainCount === 0 && (
                  <span className="text-text-muted font-semibold">
                    {noneCount > 0 ? `${noneCount} NONE` : "0 LINKED"}
                  </span>
                )}
            </div>
          </div>
        </div>

        {/* Card 5: EPISTEMIC FINDINGS */}
        <div className="hidden lg:flex flex-col justify-between px-4 py-3 min-w-0">
          <div className="flex items-center justify-between text-text-muted text-[10px] font-mono tracking-wider">
            <div className="flex items-center space-x-1.5 truncate">
              <span className="font-sans font-semibold text-text-secondary text-[11px]">
                What We Know
              </span>
              <span className="text-[9px] text-text-muted font-mono uppercase px-1 rounded-xs bg-ground border border-hairline">
                EPISTEMIC FINDINGS
              </span>
            </div>
            <GlyphEpistemicTier
              size={12}
              className="text-text-secondary shrink-0 ml-1"
            />
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="font-mono text-xl font-semibold text-text-primary tabular-nums">
              {findingsCount}
            </span>
            <Badge variant={hasHighAttention ? "amber" : "sandstone"}>
              {hasHighAttention ? "HIGH ATTN" : "VERIFIED"}
            </Badge>
          </div>
        </div>
      </div>

      {/* Epistemic guardrail notice & Guide button */}
      <div className="px-4 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
        <div className="flex items-center space-x-2 text-text-secondary min-w-0">
          <ShieldAlert
            size={13}
            strokeWidth={1.5}
            style={{ color: "var(--status-uncertain-fg)", flexShrink: 0 }}
          />
          <span
            className="text-[11px] leading-normal font-body"
            style={{ color: "var(--text-secondary)" }}
          >
            <strong className="text-text-primary font-semibold">
              Epistemic Invariant:
            </strong>{" "}
            Static analysis establishes observed structural AST mutations across
            Git revisions. It does not verify dynamic runtime test passage,
            caller contracts, or defect causation.
          </span>
        </div>

        <div className="flex items-center space-x-2 shrink-0 self-end sm:self-auto">
          {onToggleGuide && (
            <TactileButton
              variant="secondary"
              size="xs"
              onClick={onToggleGuide}
              aria-expanded={isGuideOpen}
              aria-label={
                isGuideOpen
                  ? "Close How to Read This Report Guide"
                  : "Open How to Read This Report Guide"
              }
              icon={<HelpCircle size={12} strokeWidth={1.5} />}
              className="text-text-accent"
            >
              <span>
                {isGuideOpen ? "Close Guide" : "How to Read This Report"}
              </span>
            </TactileButton>
          )}

          <span
            className="hidden md:inline-block text-[9px] text-text-muted tracking-wider uppercase px-1.5 py-0.5 rounded-xs"
            style={{
              background: "var(--surface-ground)",
              border: "1px solid var(--border-hairline)",
            }}
          >
            Unverified Runtime Causality
          </span>
        </div>
      </div>
    </div>
  );
};
