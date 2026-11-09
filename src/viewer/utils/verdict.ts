/**
 * Change Archaeologist — Report verdict
 *
 * One sentence built only from counts in the report. It adds no analysis.
 */

import type { AnalysisReport } from "../types/index.js";
import { INCOMPLETE_REASON } from "./labels.js";

function count(value: number, singular: string, plural: string = `${singular}s`): string {
  return `${value} ${value === 1 ? singular : plural}`;
}

function possibleLinkCount(report: AnalysisReport): number {
  const items = report.correlationItems ?? [];
  if (items.length > 0) return items.filter((item) => item.status !== "NONE").length;
  return report.correlations.filter((result) => result.status !== "NONE").length;
}

function openQuestionCount(report: AnalysisReport): number {
  return new Set(report.findings.flatMap((finding) => finding.unknown.map((unknown) => unknown.statement))).size;
}

export function buildVerdict(report: AnalysisReport): string {
  if (report.status.startsWith("INCOMPLETE")) {
    return report.limitations[0] ?? INCOMPLETE_REASON[report.status] ?? "These two versions could not be compared.";
  }
  if (report.structuralChanges.length === 0) {
    return "No structural changes to this function between these two versions.";
  }

  const changes = count(report.structuralChanges.length, "code change");
  const tests = report.testChanges.length;
  const links = possibleLinkCount(report);
  const relation =
    tests === 0
      ? `${changes} and no test changes.`
      : `${changes} and ${count(tests, "test change")}, with ${count(links, "possible link")} between them.`;

  const questions = openQuestionCount(report);
  return questions > 0 ? `${relation} ${count(questions, "open question")} this analysis can't answer.` : relation;
}
