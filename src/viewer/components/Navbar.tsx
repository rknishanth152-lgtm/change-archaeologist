/**
 * Navbar Component
 *
 * Change Archaeologist — Compact Application Shell & Workspace Header
 *
 * Implements the "Forensic Stratigraphy & Epistemic Bridge" top chrome:
 * - Target height: 78 px (acceptance ceiling 84 px).
 * - Primary Command Row (Height: 42 px):
 *   * Brand identity: Archaeological Stamp (GlyphMark), "Change Archaeologist" (H1),
 *     "Console v1.0" pill, and "EVIDENCE ATLAS" descriptor.
 *   * Global Actions: Demo Scenario Preset dropdown, Guide action, and prominent Import JSON button.
 * - Secondary Workspace Row (Height: 36 px):
 *   * Workspace Navigation: Active Mode tag (STRATIGRAPHY / BRIDGE / SYNTHESIS),
 *     6 tab buttons with WCAG tablist semantics, domain glyphs, and item counters.
 *   * Forensic Context: Target entity (function & file), revision bridge (BASE → HEAD),
 *     analysis status badge, and compact analysis-state metrics.
 *   * Standby state when no report is active.
 */

import React from "react";
import {
  Upload,
  CheckCircle2,
  AlertCircle,
  FileCode,
  GitCommit,
  HelpCircle,
} from "lucide-react";
import type { AnalysisReport, WorkspaceTab } from "../types/index.js";
import { DEMO_FIXTURES } from "../data/demo-fixtures.js";
import { TactileButton } from "./ui/TactileButton.js";
import { Badge } from "./ui/Badge.js";
import {
  GlyphMark,
  GlyphDeltaModified,
  GlyphDeltaAdded,
  GlyphCorrStrong,
  GlyphCorrWeak,
  GlyphEpistemicTier,
} from "./icons/ArchaeologistGlyphs.js";

export interface NavbarProps {
  readonly report: AnalysisReport | null;
  readonly onLoadClick: () => void;
  readonly onSelectScenario: (scenarioId: string) => void;
  readonly activeScenarioId?: string | null;
  readonly onToggleGuide?: () => void;
  readonly isGuideOpen?: boolean;
  readonly activeTab?: WorkspaceTab;
  readonly onTabChange?: (tab: WorkspaceTab) => void;
  readonly onTabKeyDown?: (e: React.KeyboardEvent) => void;
}

const TAB_ORDER: WorkspaceTab[] = [
  "timeline",
  "graph",
  "structural",
  "tests",
  "correlations",
  "findings",
];

const TAB_CONFIG: Record<
  WorkspaceTab,
  {
    plain: string;
    technical: string;
    mode: "stratigraphy" | "bridge" | "synthesis";
    modeLabel: string;
    glyph: React.ReactNode;
  }
> = {
  timeline: {
    plain: "What Changed",
    technical: "Change Timeline",
    mode: "stratigraphy",
    modeLabel: "STRATIGRAPHY",
    glyph: <GlyphMark size={12} className="text-text-muted" />,
  },
  structural: {
    plain: "Code Changes",
    technical: "Structural Mutations",
    mode: "stratigraphy",
    modeLabel: "STRATIGRAPHY",
    glyph: <GlyphDeltaModified size={12} className="text-status-modified" />,
  },
  graph: {
    plain: "Relationships",
    technical: "Correlation Graph",
    mode: "bridge",
    modeLabel: "BRIDGE",
    glyph: <GlyphCorrStrong size={12} className="text-status-strong" />,
  },
  correlations: {
    plain: "Code–Test Links",
    technical: "Correlation Matrix",
    mode: "bridge",
    modeLabel: "BRIDGE",
    glyph: <GlyphCorrWeak size={12} className="text-status-weak" />,
  },
  tests: {
    plain: "Related Tests",
    technical: "Companion Tests",
    mode: "synthesis",
    modeLabel: "SYNTHESIS",
    glyph: <GlyphDeltaAdded size={12} className="text-status-strong" />,
  },
  findings: {
    plain: "What We Know",
    technical: "Epistemic Findings",
    mode: "synthesis",
    modeLabel: "SYNTHESIS",
    glyph: <GlyphEpistemicTier size={12} className="text-text-secondary" />,
  },
};

export const Navbar: React.FC<NavbarProps> = ({
  report,
  onLoadClick,
  onSelectScenario,
  activeScenarioId,
  onToggleGuide,
  isGuideOpen = false,
  activeTab = "structural",
  onTabChange,
  onTabKeyDown,
}) => {
  const isComplete = report?.status.startsWith("COMPLETED");

  // Metrics for compact analysis state in Row 2
  const scCount = report?.structuralChanges.length ?? 0;
  const tcCount = report?.testChanges.length ?? 0;
  const corrCount =
    report?.correlationItems?.length ?? report?.correlations.length ?? 0;
  const findingsCount = report?.findings.length ?? 0;

  const getTabCount = (tab: WorkspaceTab): number => {
    if (!report) return 0;
    switch (tab) {
      case "timeline":
        return (
          report.structuralChanges.length +
          report.testChanges.length +
          (report.declarationChanges?.length ?? 0)
        );
      case "graph":
        return report.correlationItems?.length ?? report.correlations.length;
      case "structural":
        return report.structuralChanges.length;
      case "tests":
        return report.testChanges.length;
      case "correlations":
        return report.correlationItems?.length ?? report.correlations.length;
      case "findings":
        return report.findings.length;
    }
  };

  const activeMode = TAB_CONFIG[activeTab]?.modeLabel ?? "STRATIGRAPHY";

  return (
    <header
      role="banner"
      aria-label="Change Archaeologist Application Header"
      className="border-b border-hairline bg-panel select-none z-20 sticky top-0 flex flex-col shrink-0"
      style={{
        height: "78px",
        minHeight: "78px",
        maxHeight: "84px",
        background: "var(--surface-panel)",
      }}
    >
      {/* ====================================================================
          Row 1: Primary Command & Identity Row (Height: 42px)
          - Left: Brand Logo, Level 1 Heading, Console v1.0, Evidence Atlas
          - Right: Demo Scenario Selector, Guide Action, Prominent Import JSON
          ==================================================================== */}
      <div className="w-full h-[42px] px-3 sm:px-4 flex items-center justify-between gap-3 border-b border-hairline shrink-0">
        {/* Left: Product Brand Identity Group */}
        <div className="flex items-center space-x-2.5 min-w-0 shrink-0">
          {/* Archaeological Stamp Icon */}
          <div
            className="flex items-center justify-center w-6.5 h-6.5 rounded-xs text-text-accent shrink-0"
            aria-hidden="true"
            style={{
              border: "1px solid var(--border-hairline)",
              background: "var(--surface-elevated)",
            }}
          >
            <GlyphMark size={14} />
          </div>

          {/* Product Title & Brand Badges */}
          <div className="flex items-baseline space-x-2 min-w-0 shrink-0">
            <h1
              className="font-display font-semibold text-sm text-text-primary m-0 p-0 tracking-tight whitespace-nowrap"
              style={{ letterSpacing: "-0.01em" }}
            >
              Change Archaeologist
            </h1>
            <Badge
              variant="sandstone"
              className="font-mono text-[9px] uppercase tracking-wider shrink-0 hidden xs:inline-flex py-0 px-1"
            >
              Console v1.0
            </Badge>
            <span className="hidden sm:inline-block font-mono text-[9px] text-text-accent uppercase tracking-widest opacity-80 shrink-0">
              evidence atlas
            </span>
          </div>
        </div>

        {/* Right: Workspace Actions Group (Scenario Switcher, Guide, Prominent Import JSON) */}
        <div className="flex items-center space-x-2 sm:space-x-2.5 shrink-0">
          {/* Demonstration Scenario Selector */}
          <div className="flex items-center space-x-1.5 shrink-0">
            <label
              htmlFor="scenario-preset-select"
              className="text-[10px] text-text-muted hidden md:inline uppercase tracking-wider font-mono"
            >
              Demo Preset:
            </label>
            <select
              id="scenario-preset-select"
              value={activeScenarioId ?? ""}
              onChange={(e) => {
                if (e.target.value) onSelectScenario(e.target.value);
              }}
              className="h-6.5 px-2 text-[11px] font-mono text-text-secondary rounded-xs transition-colors duration-fast focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus cursor-pointer max-w-[150px] sm:max-w-[200px] truncate"
              style={{
                background: "var(--surface-ground)",
                border: "1px solid var(--border-hairline)",
              }}
              aria-label="Select demonstration scenario"
            >
              <option value="" disabled>
                Select Demo Scenario…
              </option>
              {DEMO_FIXTURES.map((f) => (
                <option key={f.id} value={f.id}>
                  Scenario {f.id}: {f.report.request.targetFunctionName} ({f.id})
                </option>
              ))}
            </select>
          </div>

          {/* Exactly ONE Guide action in top chrome */}
          {onToggleGuide && (
            <TactileButton
              variant={isGuideOpen ? "secondary" : "outline"}
              size="xs"
              onClick={onToggleGuide}
              aria-expanded={isGuideOpen}
              aria-label={
                isGuideOpen
                  ? "Close How to Read This Report Guide"
                  : "Open How to Read This Report Guide"
              }
              icon={<HelpCircle size={12} strokeWidth={1.5} />}
              className="text-text-accent font-mono text-[11px]"
              title="How to Read This Report Guide"
            >
              <span className="hidden sm:inline">
                {isGuideOpen ? "Close Guide" : "Guide"}
              </span>
            </TactileButton>
          )}

          {/* Prominent Import JSON Action */}
          <TactileButton
            variant="primary"
            size="xs"
            onClick={onLoadClick}
            icon={<Upload size={12} strokeWidth={1.5} />}
            className="font-medium shadow-xs font-mono text-[11px]"
            aria-label="Import Analysis Report JSON"
          >
            <span>Import JSON</span>
          </TactileButton>
        </div>
      </div>

      {/* ====================================================================
          Row 2: Workspace Navigation & Forensic Context Row (Height: 36px)
          - Left: Active Mode Tag, Workspace Tabs
          - Right: Forensic Context (Target function, revision range, status badge)
                   + Analysis Summary State
          ==================================================================== */}
      <div
        className="w-full h-[36px] px-3 sm:px-4 flex items-center justify-between gap-3 bg-panel/85 shrink-0 overflow-x-auto select-none font-mono text-xs"
        style={{ background: "var(--surface-panel)" }}
      >
        {/* Left: Active Mode Tag + 6 Workspace Tabs */}
        <div className="flex items-center space-x-2 shrink-0">
          {/* Active Mode Tag */}
          <span
            className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[9px] font-mono font-semibold uppercase tracking-wider rounded-xs text-text-accent bg-surface-elevated border border-hairline shrink-0"
            title={`Active Workspace Mode: ${activeMode}`}
          >
            {activeMode}
          </span>

          {/* Tabs Navigation list */}
          <div
            role="tablist"
            aria-label="Analysis report workspace views"
            onKeyDown={onTabKeyDown}
            className="flex items-center space-x-1 shrink-0 h-full"
          >
            {TAB_ORDER.map((tab, idx) => {
              const isActive = activeTab === tab;
              const config = TAB_CONFIG[tab];
              const isModeStart =
                idx === 0 ||
                config.mode !== TAB_CONFIG[TAB_ORDER[idx - 1]].mode;

              return (
                <React.Fragment key={tab}>
                  {isModeStart && idx !== 0 && (
                    <span
                      className="w-px h-3.5 bg-border-hairline mx-1 shrink-0"
                      aria-hidden="true"
                    />
                  )}
                  <button
                    id={`tab-${tab}`}
                    role="tab"
                    aria-selected={isActive}
                    aria-controls="panel-workspace"
                    tabIndex={isActive ? 0 : -1}
                    type="button"
                    onClick={() => onTabChange?.(tab)}
                    className="h-7 inline-flex items-center space-x-1.5 px-2 text-xs font-medium rounded-xs transition-colors shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus cursor-pointer"
                    style={{
                      borderBottom: isActive
                        ? "2px solid var(--text-accent)"
                        : "2px solid transparent",
                      color: isActive
                        ? "var(--text-primary)"
                        : "var(--text-muted)",
                      background: isActive
                        ? "var(--surface-elevated)"
                        : "transparent",
                    }}
                  >
                    <span
                      className="shrink-0"
                      style={{
                        color: isActive
                          ? "var(--text-accent)"
                          : "var(--text-muted)",
                      }}
                    >
                      {config.glyph}
                    </span>
                    <span className="font-sans font-medium text-[11px] whitespace-nowrap">
                      {config.plain}
                    </span>
                    <span className="text-[10px] opacity-75 font-mono hidden xl:inline">
                      ({config.technical})
                    </span>
                    <span
                      className="tabular-nums text-[9px] px-1 py-0 rounded-xs"
                      style={{
                        background: isActive
                          ? "var(--surface-ground)"
                          : "transparent",
                        color: isActive
                          ? "var(--text-secondary)"
                          : "var(--text-muted)",
                        border: isActive
                          ? "1px solid var(--border-hairline)"
                          : "1px solid transparent",
                      }}
                    >
                      {getTabCount(tab)}
                    </span>
                  </button>
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Right: Forensic Context & Analysis State */}
        {report ? (
          <div className="flex items-center space-x-2 shrink-0 ml-auto">
            {/* Target File & Function Context Pill */}
            <div
              className="flex items-center space-x-1 px-1.5 py-0.5 text-text-secondary min-w-0 max-w-[200px] lg:max-w-[240px] truncate font-mono text-[11px] rounded-xs"
              style={{
                background: "var(--surface-ground)",
                border: "1px solid var(--border-hairline)",
              }}
              title={`${report.request.targetFilePath}:${report.request.targetFunctionName}`}
            >
              <FileCode
                size={11}
                strokeWidth={1.5}
                className="text-text-muted shrink-0"
              />
              <span className="text-text-muted truncate">
                {report.request.targetFilePath}:
              </span>
              <span className="text-text-primary font-medium shrink-0">
                {report.request.targetFunctionName}
              </span>
              <span className="text-[9px] text-text-muted font-mono uppercase px-1 rounded-xs bg-ground border border-hairline shrink-0 hidden xl:inline">
                TARGET ENTITY
              </span>
            </div>

            {/* Revision Range Comparison */}
            <div
              className="hidden lg:flex items-center space-x-1 px-1.5 py-0.5 text-text-muted shrink-0 font-mono text-[11px] rounded-xs"
              style={{
                background: "var(--surface-ground)",
                border: "1px solid var(--border-hairline)",
              }}
              title={`Analyzing revisions ${report.baseCommit.shortSha} to ${report.headCommit.shortSha}`}
            >
              <GitCommit size={11} strokeWidth={1.5} />
              <span className="text-text-secondary tabular-nums">
                {report.baseCommit.shortSha}
              </span>
              <span className="text-text-muted">→</span>
              <span className="text-text-secondary tabular-nums">
                {report.headCommit.shortSha}
              </span>
            </div>

            {/* Analysis Status Badge */}
            <Badge
              variant={isComplete ? "verdigris" : "amber"}
              dot
              className="shrink-0 text-[10px] py-0 px-1.5 font-mono"
            >
              {isComplete ? (
                <CheckCircle2 size={11} strokeWidth={1.5} />
              ) : (
                <AlertCircle size={11} strokeWidth={1.5} />
              )}
              <span>[{report.status}]</span>
            </Badge>

            {/* Analysis Summary State Metrics */}
            <div
              className="hidden xl:flex items-center space-x-2.5 text-text-secondary font-mono text-[11px] shrink-0 border-l border-hairline pl-2"
              aria-label="Analysis summary state"
            >
              {/* Structural Mutations */}
              <span
                className="flex items-center space-x-1"
                title={`${scCount} Structural Mutations`}
              >
                <GlyphDeltaModified
                  size={11}
                  className="text-status-modified shrink-0"
                />
                <strong className="text-text-primary tabular-nums">
                  {scCount}
                </strong>
                <span className="text-[10px] text-text-muted">mutations</span>
              </span>

              {/* Companion Tests */}
              <span
                className="flex items-center space-x-1"
                title={`${tcCount} Companion Test Files`}
              >
                <GlyphDeltaAdded
                  size={11}
                  className="text-status-strong shrink-0"
                />
                <strong className="text-text-primary tabular-nums">
                  {tcCount}
                </strong>
                <span className="text-[10px] text-text-muted">tests</span>
              </span>

              {/* Correlation Links */}
              <span
                className="flex items-center space-x-1"
                title={`${corrCount} Correlation Links`}
              >
                <GlyphCorrStrong
                  size={11}
                  className="text-text-accent shrink-0"
                />
                <strong className="text-text-primary tabular-nums">
                  {corrCount}
                </strong>
                <span className="text-[10px] text-text-muted">links</span>
              </span>

              {/* Epistemic Findings */}
              <span
                className="flex items-center space-x-1"
                title={`${findingsCount} Epistemic Findings`}
              >
                <GlyphEpistemicTier
                  size={11}
                  className="text-text-secondary shrink-0"
                />
                <strong className="text-text-primary tabular-nums">
                  {findingsCount}
                </strong>
                <span className="text-[10px] text-text-muted">findings</span>
              </span>
            </div>
          </div>
        ) : (
          <span className="text-text-muted text-[11px] font-mono shrink-0 ml-auto">
            Standby — Ingest a JSON report or choose a demonstration scenario
          </span>
        )}
      </div>
    </header>
  );
};
