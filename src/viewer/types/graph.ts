/**
 * Change Archaeologist — Production-Test Correlation Graph Types
 *
 * Strictly derived from validated AnalysisReport data without inventing
 * intermediate history, synthetic dependencies, or runtime causality.
 */

import type {
  SourceSpan,
  CorrelationStatus,
  CorrelationClassification,
  StructuralChange,
  TestChange,
  TestDeclarationChange,
  EvidenceItem,
} from "./index.js";

export type GraphNodeCategory =
  | "PRODUCTION_FUNCTION"
  | "STRUCTURAL_CHANGE"
  | "TEST_FILE"
  | "TEST_CHANGE"
  | "TEST_DECLARATION";

export type GraphEdgeCategory =
  | "TARGET_CONTAINS_CHANGE"
  | "TEST_FILE_CONTAINS_CHANGE"
  | "TEST_FILE_CONTAINS_DECLARATION"
  | "CORRELATED_WITH";

export interface CorrelationGraphNodeData {
  [key: string]: unknown;
  readonly id: string;
  readonly entityId: string;
  readonly category: GraphNodeCategory;
  readonly title: string;
  readonly subtitle: string;
  readonly filePath: string;
  readonly span: SourceSpan | null;
  readonly changeType?: string;
  readonly correlationStatus?: CorrelationStatus | null;
  readonly evidenceIds: readonly string[];
  readonly findingIds: readonly string[];
  readonly epistemicTag: "OBSERVED" | "INFERRED" | "UNKNOWN";
  readonly isSourceAvailable: boolean;
  readonly functionStatus?: "PRESENT" | "DELETED" | "ABSENT" | "UNAVAILABLE";
  readonly isDimmed?: boolean;
  readonly isHighlighted?: boolean;
  readonly rawEntity?:
    | StructuralChange
    | TestChange
    | TestDeclarationChange
    | EvidenceItem
    | null;
}

export interface CorrelationGraphNode {
  readonly id: string;
  readonly type: string;
  readonly position: { x: number; y: number };
  readonly data: CorrelationGraphNodeData;
}

export interface CorrelationGraphEdgeData {
  [key: string]: unknown;
  readonly id: string;
  readonly category: GraphEdgeCategory;
  readonly label: string;
  readonly status: CorrelationStatus | null;
  readonly classification: CorrelationClassification | null;
  readonly rationale: string | null;
  readonly evidenceIds: readonly string[];
  readonly sourceEntityId: string;
  readonly targetEntityId: string;
  readonly epistemicTag: "OBSERVED" | "INFERRED";
  readonly isDimmed?: boolean;
  readonly isHighlighted?: boolean;
}

export interface CorrelationGraphEdge {
  readonly id: string;
  readonly source: string;
  readonly target: string;
  readonly sourceHandle?: string | null;
  readonly targetHandle?: string | null;
  readonly type?: string;
  readonly data: CorrelationGraphEdgeData;
}

export interface GraphSummary {
  readonly productionNodeCount: number;
  readonly testNodeCount: number;
  readonly correlationEdgeCount: number;
  readonly strongCount: number;
  readonly weakCount: number;
  readonly noneCount: number;
  readonly uncertainCount: number;
}

export interface CorrelationGraphModel {
  readonly nodes: readonly CorrelationGraphNode[];
  readonly edges: readonly CorrelationGraphEdge[];
  readonly summary: GraphSummary;
  readonly isIncomplete: boolean;
  readonly incompleteReason: string | null;
  readonly isEmpty: boolean;
}
