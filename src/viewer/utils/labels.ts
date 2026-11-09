/**
 * Change Archaeologist — Plain-language labels
 *
 * One place that turns report enums into words people recognise.
 * The raw values stay in the data and appear as tooltips where useful.
 */

import type {
  AnalysisStatus,
  AssertionChangeType,
  CorrelationClassification,
  EvidenceKind,
  ReviewAttentionLevel,
  SourceSpan,
  StructuralChange,
  StructuralChangeCategory,
  UnknownReasonCategory,
} from "../types/index.js";

export const CHANGE_CATEGORY_LABEL: Record<StructuralChangeCategory, string> = {
  GUARD_CLAUSE: "Safety check",
  CONDITIONAL_EXPRESSION: "Condition",
  THROW_STATEMENT: "Thrown error",
  RETURN_STATEMENT: "Return value",
};

export const CHANGE_TYPE_LABEL: Record<StructuralChange["changeType"], string> = {
  ADDED: "Added",
  REMOVED: "Removed",
  MODIFIED: "Changed",
};

export const ASSERTION_CHANGE_LABEL: Record<AssertionChangeType, string> = {
  ASSERTION_ADDED: "Assertion added",
  ASSERTION_REMOVED: "Assertion removed",
  ASSERTION_MODIFIED_OR_REWRITTEN: "Assertion changed",
};

export const ATTENTION_LABEL: Record<ReviewAttentionLevel, string> = {
  HIGH_ATTENTION: "Review first",
  MODERATE_ATTENTION: "Worth a look",
  INFORMATIONAL: "For information",
};

export const EVIDENCE_KIND_LABEL: Record<EvidenceKind, string> = {
  SOURCE_BEFORE: "Code before",
  SOURCE_AFTER: "Code after",
  TEST_BEFORE: "Test before",
  TEST_AFTER: "Test after",
  GIT_METADATA: "Git history",
};

export const UNKNOWN_REASON_LABEL: Record<UnknownReasonCategory, string> = {
  EXTERNAL_CALLER_BEHAVIOR: "Depends on the code that calls this",
  HELPER_DELEGATION_POSSIBLE: "May be tested through other code",
  RUNTIME_TEST_EXECUTION_UNVERIFIED: "Tests were not run",
  TEST_CORRELATION_AMBIGUOUS: "The link is unclear",
  LINEAGE_OR_PARSE_BOUNDARY: "Could not be traced further",
};

export const CLASSIFICATION_LABEL: Record<CorrelationClassification, string> = {
  POTENTIALLY_RELATED_ASSERTION_ADDED: "An assertion was added nearby",
  POTENTIALLY_RELATED_ASSERTION_MODIFIED: "An assertion changed alongside this",
  POTENTIALLY_RELATED_ASSERTION_REMOVED: "An assertion was removed nearby",
  POTENTIALLY_RELATED_TEST_DECLARATION_CHANGED: "A test's title or structure changed",
  TEMPORAL_CO_OCCURRENCE_ONLY: "Only changed at the same time",
  UNMODIFIED_COMPANION_TEST: "A related test file did not change",
  NO_TEST_CHANGES_OBSERVED: "No test changes were found",
  NO_PRODUCTION_CHANGES_OBSERVED: "No code changes were found",
  AMBIGUOUS_OR_UNRESOLVED: "The link is unclear",
};

export function isCompleteStatus(status: AnalysisStatus): boolean {
  return status.startsWith("COMPLETED");
}

export function analysisStatusLabel(status: AnalysisStatus): string {
  return isCompleteStatus(status) ? "Complete" : "Incomplete";
}

export const INCOMPLETE_REASON: Partial<Record<AnalysisStatus, string>> = {
  INCOMPLETE_FILE_MISSING_IN_ONE_REVISION: "The file exists in only one of the two versions.",
  INCOMPLETE_FUNCTION_MISSING: "The function exists in only one of the two versions.",
  INCOMPLETE_AMBIGUOUS_TARGET: "More than one function in this file has this name.",
  INCOMPLETE_PARSE_ERROR: "The file could not be read as valid code.",
};

/** Report titles can start with an all-caps classification. People need the part after it. */
export function plainFindingTitle(title: string): string {
  return title.replace(/^[A-Z][A-Z _]+:\s*/, "");
}

export function humanizeEnum(value: string): string {
  const words = value.toLowerCase().replace(/_/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Findings use structural categories plus a few of their own. */
export function findingCategoryLabel(category: string): string {
  return CHANGE_CATEGORY_LABEL[category as StructuralChangeCategory] ?? humanizeEnum(category);
}

export function formatLines(span: SourceSpan | null | undefined): string | null {
  if (!span) return null;
  return span.startLine === span.endLine ? `Line ${span.startLine}` : `Lines ${span.startLine}–${span.endLine}`;
}

export interface SampleLabel {
  readonly name: string;
  readonly teaches: string;
}

/** Samples are named by what they show. */
export const SAMPLE_LABELS: Readonly<Record<string, SampleLabel>> = {
  A: { name: "A safety check was removed", teaches: "A guard disappears and no tests changed." },
  B: { name: "A condition was flipped", teaches: "An && became an ||, with no test changes." },
  C: { name: "An error became a quiet return", teaches: "Code that used to throw now returns a value." },
  D: { name: "A test changed too", teaches: "A code change and a test edit in the same range." },
  E: { name: "How strong is the link?", teaches: "One change, two links of different strength." },
  F: { name: "The function disappeared", teaches: "The function is in the older version only." },
};

export function sampleName(id: string): string {
  return SAMPLE_LABELS[id]?.name ?? `Sample ${id}`;
}
