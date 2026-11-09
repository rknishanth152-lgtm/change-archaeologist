/**
 * Change Archaeologist — Application shell
 *
 * Header, then the active view beside a resizable detail panel, then the
 * analysis limits, which stay visible. Below 1024px the panels stack.
 */

import React, { useEffect, useState } from "react";
import { useGroupRef } from "react-resizable-panels";
import { Navbar, TAB_LABELS, TAB_ORDER } from "../components/Navbar.js";
import { DetailInspector } from "../components/DetailInspector.js";
import { LimitationsBanner } from "../components/LimitationsBanner.js";
import { ReportReadingGuide } from "../components/ReportReadingGuide.js";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "../components/ui/resizable.js";
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

/** How much room the view gets; the Code view hands most of it to the diff. */
const VIEW_SHARE: Record<WorkspaceTab, number> = { dig: 66, code: 30, findings: 58 };
const WIDE_QUERY = "(min-width: 1024px)";

function useIsWide(): boolean {
  const [isWide, setIsWide] = useState(() => window.matchMedia?.(WIDE_QUERY).matches ?? false);
  useEffect(() => {
    const media = window.matchMedia?.(WIDE_QUERY);
    if (!media?.addEventListener) return;
    const update = () => setIsWide(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return isWide;
}

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
  const isWide = useIsWide();
  const groupRef = useGroupRef();

  useEffect(() => {
    if (!isWide || !report) return;
    const share = VIEW_SHARE[activeTab];
    groupRef.current?.setLayout({ workspace: share, inspector: 100 - share });
  }, [activeTab, isWide, report, groupRef]);

  const handleTabKeyDown = (event: React.KeyboardEvent) => {
    const index = TAB_ORDER.indexOf(activeTab);
    const last = TAB_ORDER.length - 1;
    const next =
      event.key === "ArrowRight"
        ? (index + 1) % TAB_ORDER.length
        : event.key === "ArrowLeft"
        ? (index - 1 + TAB_ORDER.length) % TAB_ORDER.length
        : event.key === "Home"
        ? 0
        : event.key === "End"
        ? last
        : -1;

    if (next !== -1) {
      event.preventDefault();
      onTabChange(TAB_ORDER[next]);
      document.getElementById(`tab-${TAB_ORDER[next]}`)?.focus();
    }
  };

  const announcement = report ? `${TAB_LABELS[activeTab]} for ${report.request.targetFunctionName}.` : "";

  const workspace = (
    <main
      id="panel-workspace"
      role="tabpanel"
      aria-labelledby={`tab-${activeTab}`}
      tabIndex={0}
      className="h-full min-h-0 overflow-y-auto focus:outline-none focus-visible:ring-1 focus-visible:ring-border-focus"
    >
      {children}
    </main>
  );

  const inspector = report && (
    <aside aria-label="Details of the selected item" className="h-full overflow-hidden bg-panel">
      <DetailInspector
        report={report}
        selectedChange={selectedChange}
        selectedTestChange={selectedTestChange}
        selectedCorrelation={selectedCorrelation}
        associatedEvidence={associatedEvidence}
        selectedEvidenceId={selectedEvidenceId}
        onSelectEvidence={onSelectEvidence}
        prefersSideBySide={isWide && activeTab === "code"}
      />
    </aside>
  );

  return (
    <div className="min-h-dvh lg:h-dvh flex flex-col bg-ground text-text-primary">
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

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

      {report ? (
        <>
          <ReportReadingGuide report={report} isOpen={isGuideOpen} onClose={onCloseGuide ?? onToggleGuide ?? (() => {})} />

          {isWide ? (
            <ResizablePanelGroup orientation="horizontal" groupRef={groupRef} className="flex-1 min-h-0">
              <ResizablePanel id="workspace" defaultSize={`${VIEW_SHARE[activeTab]}%`} minSize="24%">
                {workspace}
              </ResizablePanel>
              <ResizableHandle aria-label="Resize the detail panel" />
              <ResizablePanel id="inspector" defaultSize={`${100 - VIEW_SHARE[activeTab]}%`} minSize="26%">
                {inspector}
              </ResizablePanel>
            </ResizablePanelGroup>
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
              {workspace}
              <div className="h-96 shrink-0 border-t border-hairline">{inspector}</div>
            </div>
          )}

          <LimitationsBanner report={report} />
        </>
      ) : (
        children
      )}
    </div>
  );
};
