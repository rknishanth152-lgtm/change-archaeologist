/**
 * Change Archaeologist — Workspace selection
 *
 * One thing is selected at a time, so every surface describes the same item.
 */

import type { AnalysisReport, EvidenceItem } from "../types/index.js";

export type WorkspaceSelection =
  | { readonly kind: "change"; readonly id: string }
  | { readonly kind: "test"; readonly id: string }
  | { readonly kind: "correlation"; readonly id: string };

export function initialSelection(report: AnalysisReport): WorkspaceSelection | null {
  const change = report.structuralChanges[0];
  if (change) return { kind: "change", id: change.id };
  const test = report.testChanges[0];
  if (test) return { kind: "test", id: test.id };
  const correlation = report.correlationItems?.[0];
  return correlation ? { kind: "correlation", id: correlation.id } : null;
}

function evidenceIdsFor(report: AnalysisReport, selection: WorkspaceSelection): readonly string[] {
  const items = report.correlationItems ?? [];
  switch (selection.kind) {
    case "correlation":
      return items.find((item) => item.id === selection.id)?.evidenceIds ?? [];
    case "test":
      return items.filter((item) => item.testChangeId === selection.id).flatMap((item) => item.evidenceIds);
    case "change":
      return [
        ...report.findings
          .filter((finding) => finding.structuralChangeIds.includes(selection.id))
          .flatMap((finding) => finding.observed.flatMap((observation) => observation.evidenceIds)),
        ...items.filter((item) => item.structuralChangeId === selection.id).flatMap((item) => item.evidenceIds),
      ];
  }
}

/** The evidence behind the selection, or every item when nothing is selected. */
export function evidenceForSelection(
  report: AnalysisReport,
  selection: WorkspaceSelection | null
): readonly EvidenceItem[] {
  if (!selection) return report.evidence;
  const ids = new Set(evidenceIdsFor(report, selection));
  return report.evidence.filter((item) => ids.has(item.id));
}

/** Keeps the chosen evidence when it applies to the selection, otherwise its first item. */
export function resolveEvidenceId(
  evidence: readonly EvidenceItem[],
  preferredId: string | null
): string | null {
  if (preferredId && evidence.some((item) => item.id === preferredId)) return preferredId;
  return evidence[0]?.id ?? null;
}
