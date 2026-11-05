/**
 * Change Archaeologist — Graph Legend & Calibration Component
 *
 * Epistemic reference explaining node types, correlation edge strengths,
 * domain iconography, and the central non-causality principle.
 */

import React, { useState } from "react";
import { ChevronDown, ChevronUp, Network, Info } from "lucide-react";
import {
  GlyphMark,
  GlyphGuardClause,
  GlyphCorrStrong,
  GlyphCorrWeak,
  GlyphCorrUncertain,
  GlyphCorrNone,
} from "../icons/ArchaeologistGlyphs.js";
import type { GraphSummary } from "../../types/index.js";

interface GraphLegendProps {
  readonly summary: GraphSummary;
  readonly isOpen?: boolean;
  readonly onToggle?: () => void;
}

export const GraphLegend: React.FC<GraphLegendProps> = ({
  summary,
  isOpen: controlledIsOpen,
  onToggle: controlledOnToggle,
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(true);
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const toggle = controlledOnToggle !== undefined ? controlledOnToggle : () => setInternalIsOpen(!internalIsOpen);

  return (
    <div
      role="region"
      aria-label="Correlation graph legend and epistemic guide"
      className="absolute bottom-4 left-4 z-10 w-72 max-w-[calc(100vw-2rem)] rounded-md border border-hairline bg-panel/95 backdrop-blur-sm shadow-md font-mono text-xs overflow-hidden select-none"
      style={{
        background: "var(--surface-panel)",
        borderColor: "var(--border-hairline)",
      }}
    >
      <div
        className="flex items-center justify-between px-3 py-2 border-b border-hairline bg-surface-elevated/70 cursor-pointer hover:bg-surface-elevated transition-colors"
        onClick={toggle}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggle();
          }
        }}
        aria-expanded={isOpen}
      >
        <div className="flex items-center space-x-1.5 font-semibold text-text-primary text-[11px]">
          <Network size={12} className="text-text-accent" />
          <span>Graph Legend & Calibration</span>
        </div>
        <div className="text-text-muted">
          {isOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </div>
      </div>

      {isOpen && (
        <div className="p-3 space-y-3 text-[10px]">
          {/* Node Categories */}
          <div>
            <div className="text-text-muted uppercase text-[9px] font-semibold mb-1.5 flex items-center justify-between">
              <span>Node Categories</span>
              <span className="text-[9px] lowercase font-normal opacity-80">(Entities & Roles)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              <div className="flex items-center space-x-1.5" title="The primary production function under analysis">
                <GlyphMark size={12} className="text-text-accent shrink-0" />
                <span className="text-text-secondary truncate">Target Fn <span className="text-text-muted text-[9px]">(production)</span></span>
              </div>
              <div className="flex items-center space-x-1.5" title="A structural syntax tree mutation (+ADD / -REM / ΔMOD)">
                <GlyphGuardClause size={12} className="text-status-modified shrink-0" />
                <span className="text-text-secondary truncate">Mutation <span className="text-text-muted text-[9px]">(code change)</span></span>
              </div>
              <div className="flex items-center space-x-1.5" title="A test assertion updated in the companion test file">
                <span className="w-2.5 h-2.5 rounded-xs border border-status-strong bg-status-strong-bg shrink-0" />
                <span className="text-text-secondary truncate">Test Change <span className="text-text-muted text-[9px]">(assertion)</span></span>
              </div>
              <div className="flex items-center space-x-1.5" title="A test suite or block header modified in the commit">
                <span className="w-2.5 h-2.5 rounded-xs border border-status-weak bg-status-weak-bg shrink-0" />
                <span className="text-text-secondary truncate">Declaration <span className="text-text-muted text-[9px]">(suite)</span></span>
              </div>
            </div>
          </div>

          {/* Correlation Statuses */}
          <div className="pt-2 border-t border-hairline">
            <div className="text-text-muted uppercase text-[9px] font-semibold mb-1.5 flex items-center justify-between">
              <span>Correlation Edge Statuses</span>
              <span className="text-[9px] lowercase font-normal opacity-80">(Code–Test Calibration)</span>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between" title="Direct reference: test assertion directly calls or names the target function">
                <div className="flex items-center space-x-1.5">
                  <GlyphCorrStrong size={12} className="text-status-strong shrink-0" />
                  <span className="text-status-strong font-medium">STRONG</span>
                  <span className="text-text-muted text-[9px] hidden sm:inline">— direct assertion call</span>
                </div>
                <span className="text-text-muted tabular-nums">{summary.strongCount} edge(s)</span>
              </div>
              <div className="flex items-center justify-between" title="Enclosing block change: test block edited without direct assertion call">
                <div className="flex items-center space-x-1.5">
                  <GlyphCorrWeak size={12} className="text-status-weak shrink-0" />
                  <span className="text-status-weak font-medium">WEAK</span>
                  <span className="text-text-muted text-[9px] hidden sm:inline">— enclosing test block</span>
                </div>
                <span className="text-text-muted tabular-nums">{summary.weakCount} edge(s)</span>
              </div>
              <div className="flex items-center justify-between" title="Ambiguous or incomplete evidence">
                <div className="flex items-center space-x-1.5">
                  <GlyphCorrUncertain size={12} className="text-status-uncertain shrink-0" />
                  <span className="text-status-uncertain font-medium">UNCERTAIN</span>
                  <span className="text-text-muted text-[9px] hidden sm:inline">— ambiguous link</span>
                </div>
                <span className="text-text-muted tabular-nums">{summary.uncertainCount} edge(s)</span>
              </div>
              <div className="flex items-center justify-between" title="No companion test changes linked">
                <div className="flex items-center space-x-1.5">
                  <GlyphCorrNone size={12} className="text-text-muted shrink-0" />
                  <span className="text-text-muted font-medium">NONE</span>
                  <span className="text-text-muted text-[9px] hidden sm:inline">— unlinked in commit</span>
                </div>
                <span className="text-text-muted tabular-nums">{summary.noneCount} edge(s)</span>
              </div>
            </div>
          </div>

          {/* Epistemic Non-Causality Disclaimer */}
          <div className="pt-2 border-t border-hairline flex items-start space-x-1.5 text-text-muted leading-relaxed">
            <Info size={11} className="text-status-uncertain shrink-0 mt-0.5" />
            <span>
              <strong className="font-semibold text-text-secondary">Non-Causality Principle:</strong>{" "}
              Graph edges reflect reported syntactic and analytical co-occurrence, not verified runtime test execution.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
