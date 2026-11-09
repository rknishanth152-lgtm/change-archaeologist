/**
 * Change Archaeologist — Application header
 *
 * First row: identity, the report being read, and global actions.
 * Second row: the verdict sentence and the three views.
 */

import React from "react";
import { Upload, CheckCircle2, AlertCircle, HelpCircle, Moon, Sun } from "lucide-react";
import type { AnalysisReport, WorkspaceTab } from "../types/index.js";
import { GlyphCodeTests, GlyphDig, GlyphLoupe } from "./icons/HeadingGlyphs.js";
import { DEMO_FIXTURES } from "../data/demo-fixtures.js";
import { analysisStatusLabel, isCompleteStatus, sampleName } from "../utils/labels.js";
import { buildVerdict } from "../utils/verdict.js";
import { setTheme, useTheme } from "../utils/theme.js";
import { TactileButton } from "./ui/TactileButton.js";
import { Badge } from "./ui/Badge.js";
import { LogoMark } from "./icons/LogoMark.js";

export interface NavbarProps {
  readonly report: AnalysisReport | null;
  readonly onLoadClick: () => void;
  readonly onSelectScenario: (scenarioId: string) => void;
  readonly activeScenarioId?: string | null;
  readonly onToggleGuide?: () => void;
  readonly isGuideOpen?: boolean;
  readonly activeTab?: WorkspaceTab;
  readonly onTabChange?: (tab: WorkspaceTab) => void;
  readonly onTabKeyDown?: (event: React.KeyboardEvent) => void;
}

export const TAB_ORDER: readonly WorkspaceTab[] = ["dig", "code", "findings"];

export const TAB_LABELS: Record<WorkspaceTab, string> = {
  dig: "The Dig",
  code: "Code & tests",
  findings: "Findings",
};

const TAB_GLYPHS: Record<WorkspaceTab, React.ReactNode> = {
  dig: <GlyphDig />,
  code: <GlyphCodeTests />,
  findings: <GlyphLoupe />,
};

function tabCount(report: AnalysisReport, tab: WorkspaceTab): number {
  switch (tab) {
    case "dig":
      return report.correlationItems?.length ?? report.correlations.length;
    case "code":
      return report.structuralChanges.length + report.testChanges.length;
    case "findings":
      return report.findings.length;
  }
}

export const Navbar: React.FC<NavbarProps> = ({
  report,
  onLoadClick,
  onSelectScenario,
  activeScenarioId,
  onToggleGuide,
  isGuideOpen = false,
  activeTab = "dig",
  onTabChange,
  onTabKeyDown,
}) => {
  const theme = useTheme();
  const nextThemeLabel = theme === "dark" ? "Switch to light theme" : "Switch to dark theme";
  const isComplete = report ? isCompleteStatus(report.status) : false;

  return (
    <header role="banner" aria-label="Change Archaeologist" className="border-b border-hairline bg-panel z-20 shrink-0">
      <div className="min-h-14 px-4 py-2 flex items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-2 shrink-0">
          <LogoMark size={24} className="text-text-accent" />
          <h1 className="text-[15px] font-semibold tracking-tight text-text-primary whitespace-nowrap">Change Archaeologist</h1>
        </div>

        {report && (
          <div className="hidden md:flex items-center gap-3 min-w-0 flex-1 text-xs text-text-secondary">
            <span className="h-4 w-px bg-hairline shrink-0" aria-hidden="true" />
            <span className="font-mono text-sm font-medium text-text-primary shrink-0">
              {report.request.targetFunctionName}()
            </span>
            <span className="font-mono truncate min-w-0" title={report.request.targetFilePath}>
              {report.request.targetFilePath}
            </span>
            <span
              className="hidden lg:inline font-mono whitespace-nowrap shrink-0"
              title={`Comparing ${report.baseCommit.sha} with ${report.headCommit.sha}`}
            >
              {report.baseCommit.shortSha} → {report.headCommit.shortSha}
            </span>
            <Badge variant={isComplete ? "verdigris" : "amber"} className="shrink-0">
              {isComplete ? <CheckCircle2 size={12} strokeWidth={1.5} /> : <AlertCircle size={12} strokeWidth={1.5} />}
              <span title={report.status}>{analysisStatusLabel(report.status)}</span>
            </Badge>
            {activeScenarioId && (
              <Badge variant="outline" className="shrink-0">
                Sample
              </Badge>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 shrink-0 ml-auto">
          {report && (
            <select
              value={activeScenarioId ?? ""}
              onChange={(event) => {
                if (event.target.value) onSelectScenario(event.target.value);
              }}
              aria-label="Open a sample report"
              className="hidden sm:block h-7 px-2 max-w-[190px] text-xs text-text-secondary rounded-sm border border-hairline bg-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            >
              <option value="" disabled>
                Samples
              </option>
              {DEMO_FIXTURES.map((fixture) => (
                <option key={fixture.id} value={fixture.id}>
                  {sampleName(fixture.id)}
                </option>
              ))}
            </select>
          )}

          {onToggleGuide && report && (
            <TactileButton
              variant="ghost"
              size="xs"
              onClick={onToggleGuide}
              aria-expanded={isGuideOpen}
              aria-label={isGuideOpen ? "Close the guide" : "How to read this report"}
              title="How to read this report"
              icon={<HelpCircle size={14} strokeWidth={1.5} />}
            >
              <span className="hidden sm:inline">Guide</span>
            </TactileButton>
          )}

          <TactileButton
            variant="ghost"
            size="xs"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label={nextThemeLabel}
            title={nextThemeLabel}
            icon={theme === "dark" ? <Sun size={14} strokeWidth={1.5} /> : <Moon size={14} strokeWidth={1.5} />}
          />

          <TactileButton
            variant="primary"
            size="xs"
            onClick={onLoadClick}
            icon={<Upload size={13} strokeWidth={1.5} />}
            aria-label="Open a report"
          >
            <span className="hidden sm:inline">Open report</span>
          </TactileButton>
        </div>
      </div>

      {report && (
        <div className="min-h-14 px-4 py-2 border-t border-hairline flex flex-wrap items-center justify-between gap-x-8 gap-y-2">
          <p className="min-w-0 flex-1 basis-80 text-[15px] leading-snug font-medium text-text-primary text-pretty">
            {buildVerdict(report)}
          </p>

          <div
            role="tablist"
            aria-label="Report views"
            onKeyDown={onTabKeyDown}
            className="flex items-center gap-1 shrink-0 max-w-full overflow-x-auto"
          >
            {TAB_ORDER.map((tab) => {
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  id={`tab-${tab}`}
                  role="tab"
                  aria-selected={isActive}
                  aria-controls="panel-workspace"
                  tabIndex={isActive ? 0 : -1}
                  type="button"
                  onClick={() => onTabChange?.(tab)}
                  className={`h-8 px-3 inline-flex items-center gap-2 rounded-md text-sm whitespace-nowrap transition-colors duration-fast focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus ${
                    isActive
                      ? "bg-surface-active text-text-primary font-semibold"
                      : "text-text-secondary hover:text-text-primary hover:bg-surface-hover"
                  }`}
                >
                  <span className={isActive ? "text-text-accent" : ""}>{TAB_GLYPHS[tab]}</span>
                  <span>{TAB_LABELS[tab]}</span>
                  <span className="text-xs tabular-nums text-text-secondary">{tabCount(report, tab)}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
};
