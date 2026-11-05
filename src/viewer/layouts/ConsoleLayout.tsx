/**
 * ConsoleLayout Component
 *
 * Change Archaeologist — Master Shell & Workspace Layout
 *
 * Implements the "Forensic Stratigraphy & Epistemic Bridge" workspace:
 * - 78 px compact top chrome via Navbar (primary command row + secondary workspace row).
 * - Immediate viewport utilization: primary split workspace begins at y = 78 px.
 * - Slide-over ReportReadingGuide drawer overlay (does NOT push workspace downward).
 * - Main workspace (left) with active tab view + Right persistent DetailInspector.
 * - Bottom epistemic LimitationsBanner.
 * - Full WCAG 2.2 AA accessibility, live regions, and keyboard arrow tab switching.
 */

import React from "react";
import { Navbar } from "../components/Navbar.js";
import { DetailInspector } from "../components/DetailInspector.js";
import { LimitationsBanner } from "../components/LimitationsBanner.js";
import { ReportReadingGuide } from "../components/ReportReadingGuide.js";
import type {
  AnalysisReport,
  WorkspaceTab,
  StructuralChange,
  TestChange,
  CorrelationItem,
  EvidenceItem,
} from "../types/index.js";

export interface ConsoleLayoutProps {
  readonly report: AnalysisReport | null;
  readonly activeTab: WorkspaceTab;
  readonly onTabChange: (tab: WorkspaceTab) => void;
  readonly onLoadClick: () => void;
  readonly onSelectScenario: (scenarioId: string) => void;
  readonly activeScenarioId?: string | null;
  readonly selectedChange: StructuralChange | null;
  readonly selectedTestChange?: TestChange | null;
  readonly selectedCorrelation: CorrelationItem | null;
  readonly associatedEvidence: readonly EvidenceItem[];
  readonly selectedEvidenceId?: string | null;
  readonly onSelectEvidence?: (evidenceId: string) => void;
  readonly isGuideOpen?: boolean;
  readonly onToggleGuide?: () => void;
  readonly onCloseGuide?: () => void;
  readonly children: React.ReactNode;
}

const TAB_ORDER: WorkspaceTab[] = [
  "timeline",
  "graph",
  "structural",
  "tests",
  "correlations",
  "findings",
];

const TAB_LABELS: Record<WorkspaceTab, string> = {
  timeline:     "Change Timeline view",
  structural:   "Structural Mutations view",
  graph:        "Correlation Graph view",
  correlations: "Correlation Matrix view",
  tests:        "Test Changes view",
  findings:     "Epistemic Findings view",
};

export const ConsoleLayout: React.FC<ConsoleLayoutProps> = ({
  report,
  activeTab,
  onTabChange,
  onLoadClick,
  onSelectScenario,
  activeScenarioId,
  selectedChange,
  selectedTestChange = null,
  selectedCorrelation,
  associatedEvidence,
  selectedEvidenceId,
  onSelectEvidence,
  isGuideOpen = false,
  onToggleGuide,
  onCloseGuide,
  children,
}) => {
  const [announcement, setAnnouncement] = React.useState<string>("");

  const handleTabKeyDown = (e: React.KeyboardEvent) => {
    const currentIndex = TAB_ORDER.indexOf(activeTab);
    if (currentIndex === -1) return;

    let nextIndex = -1;
    if (e.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % TAB_ORDER.length;
    } else if (e.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + TAB_ORDER.length) % TAB_ORDER.length;
    } else if (e.key === "Home") {
      nextIndex = 0;
    } else if (e.key === "End") {
      nextIndex = TAB_ORDER.length - 1;
    }

    if (nextIndex !== -1) {
      e.preventDefault();
      const nextTab = TAB_ORDER[nextIndex];
      onTabChange(nextTab);
      document.getElementById(`tab-${nextTab}`)?.focus();
    }
  };

  React.useEffect(() => {
    if (report) {
      setAnnouncement(
        `Viewing ${TAB_LABELS[activeTab]} for ${report.request.targetFunctionName} (${report.request.targetFilePath}).`
      );
    }
  }, [activeTab, report]);

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: "var(--surface-ground)",
        color: "var(--text-primary)",
      }}
    >
      {/* Screen Reader Live Status Region */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>

      {/* Top Application Shell (78px Compact Top Chrome) */}
      <Navbar
        report={report}
        onLoadClick={onLoadClick}
        onSelectScenario={onSelectScenario}
        activeScenarioId={activeScenarioId}
        onToggleGuide={onToggleGuide}
        isGuideOpen={isGuideOpen}
        activeTab={activeTab}
        onTabChange={onTabChange}
        onTabKeyDown={handleTabKeyDown}
      />

      {/* Slide-over How to Read This Report Guide Drawer */}
      {report && (
        <ReportReadingGuide
          report={report}
          isOpen={isGuideOpen}
          onClose={onCloseGuide ?? onToggleGuide ?? (() => {})}
        />
      )}

      {/* Main Container */}
      {report ? (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Primary Split Workspace */}
          <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
            {/* Left: Active Tab View */}
            <main
              id="panel-workspace"
              role="tabpanel"
              aria-labelledby={`tab-${activeTab}`}
              tabIndex={0}
              className="flex-1 flex flex-col min-h-0 overflow-y-auto focus:outline-none focus-visible:ring-1 focus-visible:ring-border-focus atlas-grid"
              style={{ background: "var(--surface-ground)" }}
            >
              {children}
            </main>

            {/* Right: Detail Inspector */}
            <aside
              aria-label="Entity and Evidence Detail Inspector"
              className="w-full lg:w-[460px] xl:w-[520px] h-96 lg:h-auto overflow-hidden shrink-0 border-t lg:border-t-0 lg:border-l border-hairline"
              style={{ background: "var(--surface-panel)" }}
            >
              <DetailInspector
                report={report}
                selectedChange={selectedChange}
                selectedTestChange={selectedTestChange}
                selectedCorrelation={selectedCorrelation}
                associatedEvidence={associatedEvidence}
                selectedEvidenceId={selectedEvidenceId}
                onSelectEvidence={onSelectEvidence}
              />
            </aside>
          </div>

          {/* Bottom Limitations Tray */}
          <LimitationsBanner report={report} />
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center p-8 atlas-grid">
          {children}
        </div>
      )}
    </div>
  );
};
