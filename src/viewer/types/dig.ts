/**
 * Change Archaeologist — The Dig presentation types
 *
 * The Dig draws a report as an excavation cross-section: function lines are
 * rock layers, structural changes are faults, correlations are shafts, and
 * what static analysis cannot see is ground that was never dug.
 *
 * Everything here is derived from AnalysisReport. Nothing is invented.
 */

import type {
  AssertionChangeRecord,
  CorrelationClassification,
  CorrelationStatus,
  Finding,
  StructuralChange,
  TestChange,
  TestDeclarationChange,
} from "./index.js";

export type DigChangeType = StructuralChange["changeType"];

export interface DigLine {
  readonly number: number;
  readonly text: string;
  readonly changeType: DigChangeType | null;
}

export type DigRow =
  | { readonly kind: "line"; readonly line: DigLine }
  | { readonly kind: "gap"; readonly from: number; readonly to: number; readonly count: number };

export type DigColumnState = "PRESENT" | "ABSENT" | "UNAVAILABLE";

export interface DigColumn {
  readonly role: "BASE" | "HEAD";
  readonly shortSha: string;
  readonly state: DigColumnState;
  readonly rows: readonly DigRow[];
  readonly lineCount: number;
}

export interface DigFault {
  readonly id: string;
  readonly change: StructuralChange;
  readonly beforeLines: readonly [number, number] | null;
  readonly afterLines: readonly [number, number] | null;
  readonly findings: readonly Finding[];
}

/** Where a shaft ends: a specific assertion, a whole test file, or open ground. */
export type DigShaftEnd = "ASSERTION" | "FILE" | "OPEN";

export interface DigShaft {
  readonly id: string;
  /** Correlation item id, or null when derived from a report-level result. */
  readonly correlationItemId: string | null;
  readonly faultId: string;
  readonly testChangeId: string | null;
  readonly testFilePath: string | null;
  readonly status: CorrelationStatus;
  readonly classification: CorrelationClassification | null;
  readonly end: DigShaftEnd;
  readonly observed: string;
  readonly inferred: string | null;
  readonly unknowns: readonly string[];
  readonly evidenceIds: readonly string[];
  /** Set when the report-level verdict for this change differs from this link. */
  readonly conflictingResult: {
    readonly id: string;
    readonly status: CorrelationStatus;
  } | null;
}

export interface DigTestCard {
  readonly kind: "TEST_CHANGE";
  readonly id: string;
  readonly testChange: TestChange;
  readonly firstAssertion: AssertionChangeRecord | null;
  readonly extraAssertions: number;
  readonly evidenceIds: readonly string[];
}

export interface DigDeclarationCard {
  readonly kind: "DECLARATION";
  readonly id: string;
  readonly declaration: TestDeclarationChange;
}

export type DigCard = DigTestCard | DigDeclarationCard;

export interface DigTestFile {
  readonly path: string;
  readonly cards: readonly DigCard[];
}

export interface DigModel {
  readonly functionName: string;
  readonly filePath: string;
  readonly base: DigColumn;
  readonly head: DigColumn;
  readonly faults: readonly DigFault[];
  readonly shafts: readonly DigShaft[];
  /** Faults with no recorded correlation of any kind. */
  readonly unprobedFaultIds: readonly string[];
  readonly testFiles: readonly DigTestFile[];
  /** Correlation records that are not tied to a change drawn here. */
  readonly unanchoredLinkCount: number;
  readonly hiddenLineCount: number;
  readonly isIncomplete: boolean;
  readonly verdict: string;
}

export type DigFocus =
  | { readonly kind: "fault"; readonly id: string }
  | { readonly kind: "shaft"; readonly id: string }
  | { readonly kind: "test"; readonly id: string };
