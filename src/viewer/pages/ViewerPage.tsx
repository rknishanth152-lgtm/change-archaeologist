import React, { useState, useMemo } from "react";
import { ConsoleLayout } from "../layouts/ConsoleLayout.js";
import { ChangeTimeline } from "../components/ChangeTimeline.js";
import { CorrelationGraph } from "../components/CorrelationGraph.js";
import { StructuralChangeExplorer } from "../components/StructuralChangeExplorer.js";
import { TestChangesInspector } from "../components/TestChangesInspector.js";
import { CorrelationMatrixTable } from "../components/CorrelationMatrixTable.js";
import { FindingsSummary } from "../components/FindingsSummary.js";
import { ReportLoader } from "../components/ReportLoader.js";
import { DEMO_FIXTURES, DEMO_SCENARIO_E } from "../data/demo-fixtures.js";
import type { AnalysisReport, WorkspaceTab, ReportLoadResult, EvidenceItem } from "../types/index.js";

export const ViewerPage: React.FC = () => {
  // Default to Scenario E for rich immediate inspection
  const [report, setReport] = useState<AnalysisReport | null>(DEMO_SCENARIO_E);
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>("E");
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("structural");

  const [selectedChangeId, setSelectedChangeId] = useState<string | null>(
    DEMO_SCENARIO_E.structuralChanges[0]?.id ?? null
  );
  const [selectedTestChangeId, setSelectedTestChangeId] = useState<string | null>(
    DEMO_SCENARIO_E.testChanges[0]?.id ?? null
  );
  const [selectedCorrelationId, setSelectedCorrelationId] = useState<string | null>(
    DEMO_SCENARIO_E.correlationItems?.[0]?.id ?? null
  );
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(
    DEMO_SCENARIO_E.findings[0]?.id ?? null
  );
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string | null>(
    DEMO_SCENARIO_E.evidence[0]?.id ?? null
  );

  const [isLoaderOpen, setIsLoaderOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // Switch demo scenarios
  const handleSelectScenario = (scenarioId: string) => {
    const fixture = DEMO_FIXTURES.find((f) => f.id === scenarioId);
    if (fixture) {
      setReport(fixture.report);
      setActiveScenarioId(fixture.id);
      setSelectedChangeId(fixture.report.structuralChanges[0]?.id ?? null);
      setSelectedTestChangeId(fixture.report.testChanges[0]?.id ?? null);
      setSelectedCorrelationId(fixture.report.correlationItems?.[0]?.id ?? null);
      setSelectedFindingId(fixture.report.findings[0]?.id ?? null);
      setSelectedEvidenceId(fixture.report.evidence[0]?.id ?? null);
    }
  };

  // Ingested report callback
  const handleReportLoaded = (result: ReportLoadResult) => {
    if (result.success && result.report) {
      setReport(result.report);
      setActiveScenarioId(null);
      setSelectedChangeId(result.report.structuralChanges[0]?.id ?? null);
      setSelectedTestChangeId(result.report.testChanges[0]?.id ?? null);
      setSelectedCorrelationId(result.report.correlationItems?.[0]?.id ?? null);
      setSelectedFindingId(result.report.findings[0]?.id ?? null);
      setSelectedEvidenceId(result.report.evidence[0]?.id ?? null);
    }
  };

  // Selected entities for Detail Inspector
  const selectedChange = useMemo(() => {
    if (!report || !selectedChangeId) return null;
    return report.structuralChanges.find((s) => s.id === selectedChangeId) ?? null;
  }, [report, selectedChangeId]);

  const selectedTestChange = useMemo(() => {
    if (!report || !selectedTestChangeId) return null;
    return report.testChanges.find((t) => t.id === selectedTestChangeId) ?? null;
  }, [report, selectedTestChangeId]);

  const selectedCorrelation = useMemo(() => {
    if (!report || !selectedCorrelationId) return null;
    return report.correlationItems?.find((c) => c.id === selectedCorrelationId) ?? null;
  }, [report, selectedCorrelationId]);

  // Derive associated evidence items
  const associatedEvidence = useMemo<readonly EvidenceItem[]>(() => {
    if (!report) return [];

    if (selectedEvidenceId) {
      const found = report.evidence.find((e) => e.id === selectedEvidenceId);
      if (found) {
        return report.evidence;
      }
    }

    if (selectedCorrelation?.evidenceIds && selectedCorrelation.evidenceIds.length > 0) {
      return report.evidence.filter((e) => selectedCorrelation.evidenceIds.includes(e.id));
    }

    if (selectedChangeId) {
      const relatedFindings = report.findings.filter((f) => f.structuralChangeIds.includes(selectedChangeId));
      const evIds = new Set<string>();
      for (const f of relatedFindings) {
        for (const obs of f.observed) {
          for (const evId of obs.evidenceIds) {
            evIds.add(evId);
          }
        }
      }
      if (evIds.size > 0) {
        return report.evidence.filter((e) => evIds.has(e.id));
      }
    }

    return report.evidence.slice(0, 3);
  }, [report, selectedChangeId, selectedCorrelation, selectedEvidenceId]);

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
      onSelectEvidence={setSelectedEvidenceId}
      isGuideOpen={isGuideOpen}
      onToggleGuide={() => setIsGuideOpen(!isGuideOpen)}
      onCloseGuide={() => setIsGuideOpen(false)}
    >
      {/* Active Tab Workspace */}
      {activeTab === "timeline" && report && (
        <ChangeTimeline
          report={report}
          selectedChangeId={selectedChangeId}
          selectedTestChangeId={selectedTestChangeId}
          selectedEvidenceId={selectedEvidenceId}
          onSelectChange={(id) => {
            setSelectedChangeId(id);
            setSelectedCorrelationId(null);
          }}
          onSelectTestChange={(id) => {
            setSelectedTestChangeId(id);
          }}
          onSelectEvidence={(evidenceId) => {
            setSelectedEvidenceId(evidenceId);
          }}
        />
      )}

      {activeTab === "graph" && report && (
        <CorrelationGraph
          report={report}
          selectedChangeId={selectedChangeId}
          selectedTestChangeId={selectedTestChangeId}
          selectedEvidenceId={selectedEvidenceId}
          selectedCorrelationId={selectedCorrelationId}
          onSelectChange={(id) => {
            setSelectedChangeId(id);
            setSelectedCorrelationId(null);
          }}
          onSelectTestChange={(id) => {
            setSelectedTestChangeId(id);
          }}
          onSelectEvidence={(evidenceId) => {
            setSelectedEvidenceId(evidenceId);
          }}
          onSelectCorrelation={(id) => {
            setSelectedCorrelationId(id);
          }}
        />
      )}

      {activeTab === "structural" && report && (
        <StructuralChangeExplorer
          structuralChanges={report.structuralChanges}
          selectedId={selectedChangeId}
          onSelectChange={(id) => {
            setSelectedChangeId(id);
            setSelectedCorrelationId(null);
          }}
        />
      )}

      {activeTab === "tests" && report && (
        <TestChangesInspector
          testChanges={report.testChanges}
          declarationChanges={report.declarationChanges}
          selectedId={selectedTestChangeId}
          onSelectChange={(id) => setSelectedTestChangeId(id)}
        />
      )}

      {activeTab === "correlations" && report && (
        <CorrelationMatrixTable
          correlationItems={report.correlationItems}
          selectedId={selectedCorrelationId}
          onSelectCorrelation={(id) => {
            setSelectedCorrelationId(id);
            setSelectedChangeId(null);
          }}
        />
      )}

      {activeTab === "findings" && report && (
        <FindingsSummary
          findings={report.findings}
          selectedId={selectedFindingId}
          onSelectFinding={(id) => setSelectedFindingId(id)}
        />
      )}

      {/* Ingestion Dialog */}
      <ReportLoader
        isOpen={isLoaderOpen}
        onClose={() => setIsLoaderOpen(false)}
        onReportLoaded={handleReportLoaded}
      />
    </ConsoleLayout>
  );
};

