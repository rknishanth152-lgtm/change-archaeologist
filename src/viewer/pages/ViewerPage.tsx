import React, { useMemo, useState } from "react";
import { ConsoleLayout } from "../layouts/ConsoleLayout.js";
import { CorrelationGraph } from "../components/CorrelationGraph.js";
import { StructuralChangeExplorer } from "../components/StructuralChangeExplorer.js";
import { TestChangesInspector } from "../components/TestChangesInspector.js";
import { FindingsSummary } from "../components/FindingsSummary.js";
import { ReportLoader } from "../components/ReportLoader.js";
import { StartScreen } from "../components/StartScreen.js";
import { DEMO_FIXTURES } from "../data/demo-fixtures.js";
import type { AnalysisReport, WorkspaceTab, ReportLoadResult } from "../types/index.js";
import type { DigFocus } from "../types/dig.js";
import { ViewHeader } from "../components/ui/Headings.js";
import { GlyphCodeTests } from "../components/icons/HeadingGlyphs.js";
import {
  evidenceForSelection,
  initialSelection,
  resolveEvidenceId,
  type WorkspaceSelection,
} from "../utils/selection.js";

export const ViewerPage: React.FC = () => {
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("dig");

  const [selection, setSelection] = useState<WorkspaceSelection | null>(null);
  const [hasChosenItem, setHasChosenItem] = useState(false);
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null);
  const [preferredEvidenceId, setPreferredEvidenceId] = useState<string | null>(null);

  const [isLoaderOpen, setIsLoaderOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  const showReport = (next: AnalysisReport, scenarioId: string | null) => {
    setReport(next);
    setActiveScenarioId(scenarioId);
    setSelection(initialSelection(next));
    setHasChosenItem(false);
    setSelectedFindingId(next.findings[0]?.id ?? null);
    setPreferredEvidenceId(null);
  };

  const handleSelectScenario = (scenarioId: string) => {
    const fixture = DEMO_FIXTURES.find((f) => f.id === scenarioId);
    if (fixture) showReport(fixture.report, fixture.id);
  };

  const handleReportOpened = (result: ReportLoadResult, sampleId: string | null) => {
    if (result.success && result.report) showReport(result.report, sampleId);
  };

  const choose = (next: WorkspaceSelection | null) => {
    setSelection(next);
    setHasChosenItem(true);
  };
  const selectChange = (id: string) => choose({ kind: "change", id });
  const selectTestChange = (id: string) => choose({ kind: "test", id });
  const selectCorrelation = (id: string) => choose({ kind: "correlation", id });

  const handleSelectFinding = (id: string) => {
    setSelectedFindingId(id);
    const finding = report?.findings.find((f) => f.id === id);
    if (!finding) return;
    const changeId = finding.structuralChangeIds[0];
    choose(changeId ? { kind: "change", id: changeId } : null);
    setPreferredEvidenceId(finding.observed[0]?.evidenceIds[0] ?? null);
  };

  const digFocus: DigFocus | null =
    hasChosenItem && selection
      ? { kind: selection.kind === "change" ? "fault" : selection.kind === "test" ? "test" : "shaft", id: selection.id }
      : null;

  const selectedChangeId = selection?.kind === "change" ? selection.id : null;
  const selectedTestChangeId = selection?.kind === "test" ? selection.id : null;
  const selectedCorrelationId = selection?.kind === "correlation" ? selection.id : null;

  const selectedChange = useMemo(
    () => report?.structuralChanges.find((s) => s.id === selectedChangeId) ?? null,
    [report, selectedChangeId]
  );
  const selectedTestChange = useMemo(
    () => report?.testChanges.find((t) => t.id === selectedTestChangeId) ?? null,
    [report, selectedTestChangeId]
  );
  const selectedCorrelation = useMemo(
    () => report?.correlationItems?.find((c) => c.id === selectedCorrelationId) ?? null,
    [report, selectedCorrelationId]
  );

  const associatedEvidence = useMemo(
    () => (report ? evidenceForSelection(report, selection) : []),
    [report, selection]
  );
  const selectedEvidenceId = resolveEvidenceId(associatedEvidence, preferredEvidenceId);

  return (
    <ConsoleLayout
      report={report}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onLoadClick={() => setIsLoaderOpen(true)}
      onSelectScenario={handleSelectScenario}
      activeScenarioId={activeScenarioId}
      selectedChange={selectedChange}
      selectedTestChange={selectedTestChange}
      selectedCorrelation={selectedCorrelation}
      associatedEvidence={associatedEvidence}
      selectedEvidenceId={selectedEvidenceId}
      onSelectEvidence={setPreferredEvidenceId}
      isGuideOpen={isGuideOpen}
      onToggleGuide={() => setIsGuideOpen(!isGuideOpen)}
      onCloseGuide={() => setIsGuideOpen(false)}
    >
      {!report && <StartScreen onOpened={handleReportOpened} />}

      {report && activeTab === "dig" && (
        <CorrelationGraph
          report={report}
          selectedChangeId={selectedChangeId}
          selectedTestChangeId={selectedTestChangeId}
          selectedEvidenceId={selectedEvidenceId}
          selectedCorrelationId={selectedCorrelationId}
          onSelectChange={selectChange}
          onSelectTestChange={selectTestChange}
          onSelectEvidence={setPreferredEvidenceId}
          onSelectCorrelation={selectCorrelation}
          initialFocus={digFocus}
        />
      )}

      {report && activeTab === "code" && (
        <div>
          <ViewHeader icon={<GlyphCodeTests />} title="Everything that changed" />
          <div className="p-4 flex flex-col gap-6">
          <StructuralChangeExplorer
            structuralChanges={report.structuralChanges}
            selectedId={selectedChangeId}
            onSelectChange={selectChange}
          />
          <TestChangesInspector
            testChanges={report.testChanges}
            declarationChanges={report.declarationChanges}
            selectedId={selectedTestChangeId}
            onSelectChange={selectTestChange}
          />
          </div>
        </div>
      )}

      {report && activeTab === "findings" && (
        <FindingsSummary
          findings={report.findings}
          selectedId={selectedFindingId}
          onSelectFinding={handleSelectFinding}
        />
      )}

      <ReportLoader
        isOpen={isLoaderOpen}
        onClose={() => setIsLoaderOpen(false)}
        onReportLoaded={handleReportOpened}
      />
    </ConsoleLayout>
  );
};
