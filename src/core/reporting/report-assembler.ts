/**
 * Change Archaeologist - Unified Report Assembler
 *
 * Combines historical production-function comparison, companion test-change analysis,
 * and conservative change-to-test correlation into a single, validated InvestigationReport.
 */

import type {
  AnalysisReport,
  InvestigationReport,
  TestAnalysisReport,
  CorrelationReport,
  EvidenceItem,
  Finding,
  AnalysisErrorRecord,
  AnalysisStatus,
} from "../domain/types.js";
import { assertValidAnalysisReport } from "../domain/schemas.js";

export interface AssembleInvestigationReportOptions {
  readonly productionReport: AnalysisReport;
  readonly testReport?: TestAnalysisReport | null;
  readonly correlationReport?: CorrelationReport | null;
  readonly timestampIso?: string;
}

/**
 * Assembles a unified investigation report from individual analysis phase reports.
 *
 * Enforces:
 * - Deterministic field construction
 * - De-duplication of evidence, findings, limitations, and errors without data loss
 * - Preservation of upstream incomplete statuses and limitations
 * - No fabrication of missing evidence or unsupported claims
 * - Non-mutation of input report objects
 * - Schema and referential integrity validation via assertValidAnalysisReport
 */
export function assembleInvestigationReport(
  options: AssembleInvestigationReportOptions
): InvestigationReport {
  const { productionReport, testReport, correlationReport, timestampIso } = options;

  // 1. Timestamp
  const generatedAtIso = timestampIso ?? new Date().toISOString();

  // 2. Status Determination
  // Production analysis status is primary; if production was incomplete, status is preserved.
  const status: AnalysisStatus = productionReport.status;

  // 3. Evidence Aggregation (no fabrication, de-duplicated by ID while preserving order)
  const evidenceMap = new Map<string, EvidenceItem>();
  for (const ev of productionReport.evidence ?? []) {
    if (!evidenceMap.has(ev.id)) {
      evidenceMap.set(ev.id, ev);
    }
  }
  if (testReport?.evidence) {
    for (const ev of testReport.evidence) {
      if (!evidenceMap.has(ev.id)) {
        evidenceMap.set(ev.id, ev);
      }
    }
  }
  if (correlationReport?.evidence) {
    for (const ev of correlationReport.evidence) {
      if (!evidenceMap.has(ev.id)) {
        evidenceMap.set(ev.id, ev);
      }
    }
  }
  const evidence: readonly EvidenceItem[] = Array.from(evidenceMap.values());

  // 4. Test Changes and Test Declaration Changes
  const testChanges = testReport?.testChanges ?? productionReport.testChanges ?? [];
  const declarationChanges = testReport?.declarationChanges ?? productionReport.declarationChanges ?? [];

  // 5. Correlations and Correlation Items
  const correlations = correlationReport?.correlations ?? productionReport.correlations ?? [];
  const correlationItems = correlationReport?.correlationItems ?? productionReport.correlationItems ?? [];

  // 6. Findings Aggregation (de-duplicated by ID)
  const findingsMap = new Map<string, Finding>();
  for (const f of productionReport.findings ?? []) {
    if (!findingsMap.has(f.id)) {
      findingsMap.set(f.id, f);
    }
  }
  if (testReport?.findings) {
    for (const f of testReport.findings) {
      if (!findingsMap.has(f.id)) {
        findingsMap.set(f.id, f);
      }
    }
  }
  if (correlationReport?.findings) {
    for (const f of correlationReport.findings) {
      if (!findingsMap.has(f.id)) {
        findingsMap.set(f.id, f);
      }
    }
  }
  const findings: readonly Finding[] = Array.from(findingsMap.values());

  // 7. Limitations Aggregation (de-duplicated)
  const limitationsSet = new Set<string>();
  for (const lim of productionReport.limitations ?? []) {
    limitationsSet.add(lim);
  }
  if (testReport?.limitations) {
    for (const lim of testReport.limitations) {
      limitationsSet.add(lim);
    }
  }
  if (correlationReport?.limitations) {
    for (const lim of correlationReport.limitations) {
      limitationsSet.add(lim);
    }
  }

  // Preserve upstream sub-analysis incomplete statuses in limitations
  if (testReport && testReport.status.startsWith("INCOMPLETE_")) {
    limitationsSet.add(`Test analysis was incomplete with status '${testReport.status}'.`);
  }
  if (correlationReport && correlationReport.status.startsWith("INCOMPLETE_")) {
    limitationsSet.add(`Correlation analysis was incomplete with status '${correlationReport.status}'.`);
  }

  // Schema invariant: INCOMPLETE_FUNCTION_MISSING must have >= 1 limitation
  if (status === "INCOMPLETE_FUNCTION_MISSING" && limitationsSet.size === 0) {
    limitationsSet.add("Target function was not found in one or both revisions.");
  }
  const limitations: readonly string[] = Array.from(limitationsSet);

  // 8. Errors Aggregation (de-duplicated by code + message + recoverable)
  const errorKey = (e: AnalysisErrorRecord) => `${e.code}:${e.message}:${e.recoverable}`;
  const errorMap = new Map<string, AnalysisErrorRecord>();
  for (const err of productionReport.errors ?? []) {
    errorMap.set(errorKey(err), err);
  }
  if (testReport?.errors) {
    for (const err of testReport.errors) {
      errorMap.set(errorKey(err), err);
    }
  }
  if (correlationReport?.errors) {
    for (const err of correlationReport.errors) {
      errorMap.set(errorKey(err), err);
    }
  }
  const errors: readonly AnalysisErrorRecord[] = Array.from(errorMap.values());

  // 9. Assemble Candidate InvestigationReport
  const assembledReport: InvestigationReport = {
    schemaVersion: "1.0.0",
    generatedAtIso,
    status,
    request: productionReport.request,
    repository: productionReport.repository,
    baseCommit: productionReport.baseCommit,
    headCommit: productionReport.headCommit,
    baseFunction: productionReport.baseFunction ?? null,
    headFunction: productionReport.headFunction ?? null,
    evidence,
    structuralChanges: productionReport.structuralChanges ?? [],
    testChanges,
    declarationChanges,
    correlations,
    correlationItems,
    testAnalysisStatus: testReport?.status ?? productionReport.testAnalysisStatus,
    correlationAnalysisStatus: correlationReport?.status ?? productionReport.correlationAnalysisStatus,
    findings,
    limitations,
    errors,
  };

  // 10. Runtime Schema and Referential Integrity Validation
  assertValidAnalysisReport(assembledReport);

  return assembledReport;
}

