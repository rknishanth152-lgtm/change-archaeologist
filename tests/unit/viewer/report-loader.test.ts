/**
 * Change Archaeologist - Frontend Report Ingestion & Validation Tests
 *
 * Verifies that the viewer's report-loading layer strictly validates JSON
 * using the core schema validator without duplicating domain logic.
 */

import { describe, it, expect } from "vitest";
import {
  loadReportFromJsonString,
  loadReportFromFile,
  MAX_REPORT_FILE_BYTES,
} from "../../../src/viewer/utils/report-loader.js";
import { DEMO_SCENARIO_A, DEMO_SCENARIO_E, DEMO_SCENARIO_F } from "../../../src/viewer/data/demo-fixtures.js";

describe("Frontend Report Loader & Schema Ingestion", () => {
  it("successfully loads and validates a valid JSON report fixture (Scenario A)", () => {
    const rawJson = JSON.stringify(DEMO_SCENARIO_A);
    const result = loadReportFromJsonString(rawJson, "scenario-a.json");

    expect(result.success).toBe(true);
    expect(result.report).toBeDefined();
    expect(result.report?.request.targetFunctionName).toBe("processPayment");
    expect(result.report?.status).toBe("COMPLETED_WITH_FINDINGS");
    expect(result.report?.structuralChanges.length).toBe(1);
    expect(result.error).toBeUndefined();
    expect(result.issues).toBeUndefined();
  });

  it("successfully loads and validates Scenario E with itemized correlations", () => {
    const rawJson = JSON.stringify(DEMO_SCENARIO_E);
    const result = loadReportFromJsonString(rawJson, "scenario-e.json");

    expect(result.success).toBe(true);
    expect(result.report).toBeDefined();
    expect(result.report?.request.targetFunctionName).toBe("calculateDiscount");
    expect(result.report?.correlationItems).toBeDefined();
    expect(result.report?.correlationItems?.length).toBe(2);
    expect(result.report?.correlationItems?.[0].status).toBe("STRONG");
    expect(result.report?.correlationItems?.[1].status).toBe("WEAK");
  });

  it("successfully loads and validates incomplete analysis reports (Scenario F)", () => {
    const rawJson = JSON.stringify(DEMO_SCENARIO_F);
    const result = loadReportFromJsonString(rawJson, "scenario-f.json");

    expect(result.success).toBe(true);
    expect(result.report).toBeDefined();
    expect(result.report?.status).toBe("INCOMPLETE_FUNCTION_MISSING");
    expect(result.report?.headFunction).toBeNull();
    expect(result.report?.structuralChanges).toHaveLength(0);
  });

  it("handles empty or whitespace-only JSON input with an informative error", () => {
    const emptyResult = loadReportFromJsonString("");
    expect(emptyResult.success).toBe(false);
    expect(emptyResult.error).toContain("empty");
    expect(emptyResult.issues?.[0].code).toBe("INVALID_FORMAT");

    const whitespaceResult = loadReportFromJsonString("   \n\t  ");
    expect(whitespaceResult.success).toBe(false);
    expect(whitespaceResult.error).toContain("empty");
  });

  it("handles malformed JSON syntax with syntax error details", () => {
    const malformed = '{"schemaVersion": "1.0.0", invalidJson: true';
    const result = loadReportFromJsonString(malformed, "broken.json");

    expect(result.success).toBe(false);
    expect(result.error).toContain("SyntaxError");
    expect(result.issues?.[0].code).toBe("INVALID_FORMAT");
    expect(result.issues?.[0].message).toContain("Malformed JSON");
  });

  it("rejects reports with schema validation failures (missing required fields)", () => {
    const invalidReport = {
      schemaVersion: "1.0.0",
      // Missing generatedAtIso, status, request, repository, commits, etc.
    };

    const result = loadReportFromJsonString(JSON.stringify(invalidReport), "invalid.json");
    expect(result.success).toBe(false);
    expect(result.report).toBeUndefined();
    expect(result.error).toContain("Schema validation failed");
    expect(result.issues).toBeDefined();
    expect(result.issues!.length).toBeGreaterThan(0);
  });

  it("rejects reports with unsupported schema versions", () => {
    const badVersion = {
      ...DEMO_SCENARIO_A,
      schemaVersion: "2.0.0",
    };

    const result = loadReportFromJsonString(JSON.stringify(badVersion), "bad-version.json");
    expect(result.success).toBe(false);
    expect(result.issues?.some((i) => i.path === "report.schemaVersion")).toBe(true);
  });

  it("loadReportFromFile rejects oversized files exceeding MAX_REPORT_FILE_BYTES (20 MB)", async () => {
    // Mock File object exceeding 20 MB without allocating 25 MB in memory
    const oversizedFile = {
      name: "huge-report.json",
      size: 25 * 1024 * 1024, // 25 MB
      text: async () => JSON.stringify(DEMO_SCENARIO_A),
    } as unknown as File;

    const result = await loadReportFromFile(oversizedFile);
    expect(result.success).toBe(false);
    expect(result.error).toContain("exceeds the maximum safety limit of 20 MB");
    expect(result.issues?.[0].code).toBe("SECURITY_VIOLATION");
    expect(result.issues?.[0].path).toBe("file.size");
  });

  it("loadReportFromFile successfully loads and validates valid files within the size limit", async () => {
    const rawJson = JSON.stringify(DEMO_SCENARIO_A);
    const validFile = {
      name: "valid-report.json",
      size: Buffer.byteLength(rawJson),
      text: async () => rawJson,
    } as unknown as File;

    const result = await loadReportFromFile(validFile);
    expect(result.success).toBe(true);
    expect(result.report).toBeDefined();
    expect(result.report?.request.targetFunctionName).toBe("processPayment");
  });
});
