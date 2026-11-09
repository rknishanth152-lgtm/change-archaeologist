/**
 * Change Archaeologist - Report Ingestion & Pure Schema Validation Layer
 *
 * Reuses the existing core runtime validator (validateAnalysisReport) directly
 * without duplicating validation logic or introducing third-party schema libraries.
 */

import { validateAnalysisReport, type ValidationIssue } from "../../core/domain/schemas.js";
import type { AnalysisReport } from "../../core/domain/types.js";
import type { ReportLoadResult } from "../types/index.js";

/**
 * Parses and strictly validates a raw JSON string into an AnalysisReport.
 */
export function loadReportFromJsonString(
  rawJson: string,
  fileName: string = "report.json"
): ReportLoadResult {
  if (!rawJson || rawJson.trim().length === 0) {
    return {
      success: false,
      fileName,
      error: "Supplied report content is empty.",
      issues: [
        {
          path: "root",
          code: "INVALID_FORMAT",
          message: "Report file is empty or contains only whitespace.",
        },
      ],
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch (err) {
    const parseError = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      fileName,
      rawJson,
      error: `SyntaxError parsing JSON report: ${parseError}`,
      issues: [
        {
          path: "root",
          code: "INVALID_FORMAT",
          message: `Malformed JSON: ${parseError}`,
        },
      ],
    };
  }

  // Validate using existing pure TypeScript domain validator
  const validationResult = validateAnalysisReport(parsed);

  if (!validationResult.success) {
    return {
      success: false,
      fileName,
      rawJson,
      error: `Schema validation failed with ${validationResult.issues.length} issues.`,
      issues: validationResult.issues,
    };
  }

  return {
    success: true,
    fileName,
    rawJson,
    report: validationResult.data,
  };
}

/**
 * Maximum allowable report file size for in-browser processing (20 MB).
 * Protects against main-thread memory exhaustion and browser tab crashes.
 */
export const MAX_REPORT_FILE_BYTES = 20 * 1024 * 1024; // 20 MB

/**
 * Loads and validates a report from a browser File object.
 */
export async function loadReportFromFile(file: File): Promise<ReportLoadResult> {
  if (file.size > MAX_REPORT_FILE_BYTES) {
    return {
      success: false,
      fileName: file.name,
      error: `Report file size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds the maximum safety limit of 20 MB.`,
      issues: [
        {
          path: "file.size",
          code: "SECURITY_VIOLATION",
          message: "Report file exceeds maximum allowable size for browser analysis (20 MB).",
        },
      ],
    };
  }

  try {
    const text = await file.text();
    return loadReportFromJsonString(text, file.name);
  } catch (err) {
    const readError = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      fileName: file.name,
      error: `Failed to read file: ${readError}`,
      issues: [
        {
          path: "file",
          code: "INVALID_FORMAT",
          message: readError,
        },
      ],
    };
  }
}

