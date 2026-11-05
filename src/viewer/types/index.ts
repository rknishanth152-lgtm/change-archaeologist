/**
 * Change Archaeologist - Graphical Report Viewer Shared Types
 *
 * Re-exports authoritative domain models directly from core and adds
 * state representations for viewer interaction and navigation.
 */

export type {
  AnalysisReport,
  AnalysisRequest,
  AnalysisStatus,
  AnalysisErrorRecord,
  CommitInfo,
  EvidenceItem,
  EvidenceKind,
  Finding,
  FindingCategory,
  FunctionSnapshot,
  Observation,
  InferenceStatement,
  UnknownStatement,
  UnknownReasonCategory,
  StructuralChange,
  StructuralChangeCategory,
  TestChange,
  TestDeclarationChange,
  AssertionChangeRecord,
  AssertionChangeType,
  CorrelationResult,
  CorrelationItem,
  CorrelationStatus,
  CorrelationClassification,
  ReviewAttentionLevel,
  RuleId,
  SourceSpan,
} from "../../core/domain/types.js";

import type { AnalysisReport } from "../../core/domain/types.js";
import type { ValidationIssue } from "../../core/domain/schemas.js";

export type WorkspaceTab = "timeline" | "graph" | "structural" | "tests" | "correlations" | "findings";

export type {
  TimelineItemType,
  TimelineFilter,
  RevisionAnchor,
  TimelineChangeItem,
  TimelineModel,
} from "./timeline.js";

export type {
  GraphNodeCategory,
  GraphEdgeCategory,
  CorrelationGraphNodeData,
  CorrelationGraphNode,
  CorrelationGraphEdgeData,
  CorrelationGraphEdge,
  GraphSummary,
  CorrelationGraphModel,
} from "./graph.js";

export interface DemoScenarioPreset {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly targetFilePath: string;
  readonly targetFunctionName: string;
  readonly report: AnalysisReport;
}

export interface ReportLoadResult {
  readonly success: boolean;
  readonly report?: AnalysisReport;
  readonly rawJson?: string;
  readonly fileName?: string;
  readonly error?: string;
  readonly issues?: readonly ValidationIssue[];
}

export interface ViewerState {
  readonly report: AnalysisReport | null;
  readonly rawJson: string | null;
  readonly fileName: string | null;
  readonly activeTab: WorkspaceTab;
  readonly selectedStructuralChangeId: string | null;
  readonly selectedTestChangeId: string | null;
  readonly selectedCorrelationId: string | null;
  readonly selectedFindingId: string | null;
  readonly validationIssues: readonly ValidationIssue[] | null;
  readonly loadError: string | null;
}
