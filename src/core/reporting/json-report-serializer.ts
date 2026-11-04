/**
 * Change Archaeologist - JSON Report Serializer
 *
 * Deterministically serializes a validated InvestigationReport into JSON.
 */

import type { AnalysisReport } from "../domain/types.js";
import { assertValidAnalysisReport } from "../domain/schemas.js";

export interface JsonSerializeOptions {
  readonly indent?: number;
}

/**
 * Serializes an AnalysisReport (InvestigationReport) into a deterministic JSON string.
 *
 * Requirements:
 * 1. Validates the report with assertValidAnalysisReport before serialization.
 * 2. Rejects invalid reports by throwing ValidationError.
 * 3. Does not mutate the supplied report object.
 * 4. Produces valid, deterministic JSON output.
 * 5. Performs no filesystem writes, git operations, or network calls.
 */
export function serializeReportToJson(
  report: AnalysisReport,
  options?: JsonSerializeOptions
): string {
  // Validate report schema and referential integrity before serialization
  assertValidAnalysisReport(report);

  const indent = options?.indent ?? 2;
  return JSON.stringify(report, null, indent);
}

