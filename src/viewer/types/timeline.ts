/**
 * Change Archaeologist — Change Timeline Presentation Model Types
 *
 * Types representing the commit-to-commit comparative change timeline
 * derived strictly from validated AnalysisReport data without intermediate history.
 */

import type {
  CommitInfo,
  FunctionSnapshot,
  StructuralChange,
  TestChange,
  TestDeclarationChange,
  SourceSpan,
  CorrelationStatus,
  AnalysisStatus,
} from "./index.js";

export type TimelineItemType =
  | "STRUCTURAL_CHANGE"
  | "TEST_CHANGE"
  | "DECLARATION_CHANGE";

export type TimelineFilter = "all" | "structural" | "tests" | "correlated";

export interface RevisionAnchor {
  readonly role: "BASE" | "HEAD";
  readonly sha: string;
  readonly shortSha: string;
  readonly authorName: string;
  readonly committedAtIso: string;
  readonly subject: string;
  readonly functionSnapshot: FunctionSnapshot | null | undefined;
  readonly functionStatus: "PRESENT" | "DELETED" | "ABSENT" | "UNAVAILABLE";
  readonly formattedLabel: string;
}

export interface TimelineChangeItem {
  readonly id: string;
  readonly sourceEntityId: string;
  readonly itemType: TimelineItemType;
  readonly title: string;
  readonly subtitle: string;
  readonly category: string;
  readonly changeType: "ADDED" | "REMOVED" | "DELETED" | "MODIFIED" | "UNMODIFIED_COMPANION";
  readonly filePath: string;
  readonly span: SourceSpan | null;
  readonly evidenceIds: readonly string[];
  readonly findingIds: readonly string[];
  readonly correlationStatus: CorrelationStatus | null;
  readonly correlationRationale: string | null;
  readonly epistemicTag: "OBSERVED" | "INFERRED" | "UNKNOWN";
  readonly isSourceAvailable: boolean;
  readonly rawChange: StructuralChange | TestChange | TestDeclarationChange;
}

export interface TimelineModel {
  readonly baseAnchor: RevisionAnchor;
  readonly headAnchor: RevisionAnchor;
  readonly items: readonly TimelineChangeItem[];
  readonly comparisonDirection: string;
  readonly totalChangesCount: number;
  readonly structuralCount: number;
  readonly testChangeCount: number;
  readonly declarationCount: number;
  readonly correlatedCount: number;
  readonly analysisStatus: AnalysisStatus;
  readonly isIncomplete: boolean;
  readonly incompleteReason: string | null;
}
