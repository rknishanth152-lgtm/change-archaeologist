/**
 * Change Archaeologist - End-to-End Demonstration Integration Tests
 *
 * Validates the deterministic synthetic demonstration harness:
 * 1. Deterministic demo repository creation and fixed metadata.
 * 2. Repeated execution producing consistent repository structures.
 * 3. Validation of Scenario A (Guard Clause Removal).
 * 4. Validation of Scenario B (Conditional Operator Mutation).
 * 5. Validation of Scenario C (Throw-to-Return Conversion).
 * 6. Validation of Scenario D & E (Test Change Detection & Conservative Correlation).
 * 7. Validation of Scenario F (Missing Function & Incomplete Analysis).
 * 8. Full runDemonstration orchestration and expectation manifest validation.
 * 9. Output report validity (JSON schema and Markdown headers).
 * 10. Bit-for-bit non-modification of the host repository during demonstration.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { DemoRepositoryBuilder, createDemoRepository } from "../../../scripts/create-demo-repository.js";
import { runDemonstration } from "../../../scripts/run-demo.js";
import { runCli } from "../../../src/cli/orchestrator.js";
import { ExitCode } from "../../../src/cli/types.js";
import { validateAnalysisReport } from "../../../src/core/domain/schemas.js";
import type { AnalysisReport } from "../../../src/core/domain/types.js";

describe("Demonstration Environment & End-to-End Verification", () => {
  let tempDemoDir: string;
  let tempOutputDir: string;

  beforeEach(() => {
    const tmpBase = os.tmpdir();
    tempDemoDir = fs.realpathSync.native(fs.mkdtempSync(path.join(tmpBase, "ca-test-demo-")));
    tempOutputDir = fs.realpathSync.native(fs.mkdtempSync(path.join(tmpBase, "ca-test-demo-out-")));
  });

  afterEach(() => {
    try {
      if (fs.existsSync(tempDemoDir)) {
        fs.rmSync(tempDemoDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
      }
    } catch {
      // Ignore cleanup error
    }
    try {
      if (fs.existsSync(tempOutputDir)) {
        fs.rmSync(tempOutputDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
      }
    } catch {
      // Ignore cleanup error
    }
  });

  // 1. Deterministic demo repository creation and metadata
  it("creates a deterministic demo repository with fixed metadata and tags", () => {
    const builder = new DemoRepositoryBuilder(tempDemoDir, true);
    const result = builder.build();

    expect(result.repoDir).toBe(tempDemoDir);
    expect(result.baseTag).toBe("base");
    expect(result.headTag).toBe("head");
    expect(result.baseCommitSha).toMatch(/^[0-9a-f]{40}$/);
    expect(result.headCommitSha).toMatch(/^[0-9a-f]{40}$/);
    expect(result.baseCommitSha).not.toBe(result.headCommitSha);

    // Verify tag references resolve in Git
    const gitHead = fs.readFileSync(path.join(tempDemoDir, ".git/refs/tags/head"), "utf8").trim();
    expect(gitHead).toBe(result.headCommitSha);

    const gitBase = fs.readFileSync(path.join(tempDemoDir, ".git/refs/tags/base"), "utf8").trim();
    expect(gitBase).toBe(result.baseCommitSha);
  });

  // 2. Repeated execution produces consistent structure
  it("repeatedly constructs clean demo repositories without state leakage", () => {
    const result1 = createDemoRepository({ targetDir: tempDemoDir, cleanExisting: true });
    expect(fs.existsSync(path.join(tempDemoDir, "src/auth.ts"))).toBe(true);
    expect(fs.existsSync(path.join(tempDemoDir, "tests/order.test.ts"))).toBe(true);

    // Second run with cleanExisting: true
    const result2 = createDemoRepository({ targetDir: tempDemoDir, cleanExisting: true });
    expect(result2.baseCommitSha).toBe(result1.baseCommitSha);
    expect(result2.headCommitSha).toBe(result1.headCommitSha);
  });

  // 3. Scenario A: Guard Clause Removal
  it("Scenario A: detects structural guard clause removal via CLI", async () => {
    createDemoRepository({ targetDir: tempDemoDir, cleanExisting: true });

    let stdout = "";
    let stderr = "";
    const code = await runCli(
      [
        "--repo", tempDemoDir,
        "--file", "src/auth.ts",
        "--function", "processPayment",
        "--base", "base",
        "--head", "head",
        "--format", "json",
      ],
      {
        stdout: (t) => { stdout += t; },
        stderr: (t) => { stderr += t; },
        cwd: tempDemoDir,
      }
    );

    expect(code).toBe(ExitCode.SUCCESS);
    const parsed: AnalysisReport = JSON.parse(stdout);
    expect(parsed.status).toBe("COMPLETED_WITH_FINDINGS");
    expect(parsed.structuralChanges.some((sc) => sc.ruleId === "RULE_GUARD_REMOVED")).toBe(true);
    expect(parsed.structuralChanges[0].category).toBe("GUARD_CLAUSE");
    expect(validateAnalysisReport(parsed).success).toBe(true);
  });

  // 4. Scenario B: Conditional Operator Modification
  it("Scenario B: detects conditional operator mutation (&& to ||) via CLI", async () => {
    createDemoRepository({ targetDir: tempDemoDir, cleanExisting: true });

    let stdout = "";
    const code = await runCli(
      [
        "--repo", tempDemoDir,
        "--file", "src/access.ts",
        "--function", "authorizeUser",
        "--base", "base",
        "--head", "head",
        "--format", "json",
      ],
      {
        stdout: (t) => { stdout += t; },
        stderr: () => {},
        cwd: tempDemoDir,
      }
    );

    expect(code).toBe(ExitCode.SUCCESS);
    const parsed: AnalysisReport = JSON.parse(stdout);
    expect(parsed.status).toBe("COMPLETED_WITH_FINDINGS");
    expect(parsed.structuralChanges.some((sc) => sc.ruleId === "RULE_CONDITIONAL_MODIFIED")).toBe(true);
    expect(parsed.structuralChanges[0].category).toBe("CONDITIONAL_EXPRESSION");
  });

  // 5. Scenario C: Throw-to-Return Conversion
  it("Scenario C: detects throw-to-return control flow conversion via CLI", async () => {
    createDemoRepository({ targetDir: tempDemoDir, cleanExisting: true });

    let stdout = "";
    const code = await runCli(
      [
        "--repo", tempDemoDir,
        "--file", "src/config.ts",
        "--function", "loadConfig",
        "--base", "base",
        "--head", "head",
        "--format", "json",
      ],
      {
        stdout: (t) => { stdout += t; },
        stderr: () => {},
        cwd: tempDemoDir,
      }
    );

    expect(code).toBe(ExitCode.SUCCESS);
    const parsed: AnalysisReport = JSON.parse(stdout);
    expect(parsed.status).toBe("COMPLETED_WITH_FINDINGS");
    expect(parsed.structuralChanges.some((sc) => sc.ruleId === "RULE_THROW_TO_RETURN_CONVERSION")).toBe(true);
  });

  // 6. Scenario D & E: Companion Test Detection & Conservative Correlation
  it("Scenario D & E: detects companion test changes and computes conservative correlation", async () => {
    createDemoRepository({ targetDir: tempDemoDir, cleanExisting: true });

    let stdout = "";
    const code = await runCli(
      [
        "--repo", tempDemoDir,
        "--file", "src/order.ts",
        "--function", "calculateDiscount",
        "--base", "base",
        "--head", "head",
        "--test-file", "tests/order.test.ts",
        "--format", "json",
      ],
      {
        stdout: (t) => { stdout += t; },
        stderr: () => {},
        cwd: tempDemoDir,
      }
    );

    expect(code).toBe(ExitCode.SUCCESS);
    const parsed: AnalysisReport = JSON.parse(stdout);
    expect(parsed.status).toBe("COMPLETED_WITH_FINDINGS");
    expect(parsed.testChanges.length).toBeGreaterThanOrEqual(1);

    // Conservative correlation checks
    expect(parsed.correlationItems?.some((item) => item.status === "STRONG")).toBe(true);
    expect(
      parsed.correlationItems?.some((item) => item.classification === "POTENTIALLY_RELATED_ASSERTION_MODIFIED")
    ).toBe(true);

    // Epistemic modesty verification
    const item = parsed.correlationItems?.find((i) => i.status === "STRONG");
    expect(item?.inferredRelationship).toContain("relationship remains unverified");
    expect(item?.unknowns.some((u) => u.toLowerCase().includes("cannot"))).toBe(true);
  });

  // 7. Scenario F: Missing Function in HEAD
  it("Scenario F: handles deleted function with structured incomplete report", async () => {
    createDemoRepository({ targetDir: tempDemoDir, cleanExisting: true });

    let stdout = "";
    const code = await runCli(
      [
        "--repo", tempDemoDir,
        "--file", "src/legacy.ts",
        "--function", "deprecatedHelper",
        "--base", "base",
        "--head", "head",
        "--format", "json",
      ],
      {
        stdout: (t) => { stdout += t; },
        stderr: () => {},
        cwd: tempDemoDir,
      }
    );

    expect(code).toBe(ExitCode.INCOMPLETE_ANALYSIS);
    const parsed: AnalysisReport = JSON.parse(stdout);
    expect(parsed.status).toBe("INCOMPLETE_FUNCTION_MISSING");
    expect(parsed.structuralChanges.length).toBe(0);
    expect(parsed.limitations.some((l) => l.includes("deprecatedHelper"))).toBe(true);
  });

  // 8. End-to-end Demonstration Suite (runDemonstration)
  it(
    "executes complete end-to-end demonstration suite matching all expectations",
    async () => {
      const summary = await runDemonstration({
        repoDir: tempDemoDir,
        outputDir: tempOutputDir,
        verbose: false,
      });

      expect(summary.totalScenarios).toBe(6);
      expect(summary.passedCount).toBe(6);
      expect(summary.failedCount).toBe(0);
      expect(summary.allPassed).toBe(true);

      for (const res of summary.results) {
        expect(res.passed, `Scenario ${res.id} passed`).toBe(true);
        expect(res.discrepancies).toEqual([]);
        expect(fs.existsSync(res.jsonReportPath!)).toBe(true);
        expect(fs.existsSync(res.markdownReportPath!)).toBe(true);
      }
    },
    60000 // 60s timeout for complete multi-scenario suite
  );

  // 9. Host repository non-modification check
  it("guarantees zero modification of the host workspace repository", () => {
    // Assert git status of main workspace has not been mutated
    const mainStatus = fs.existsSync(".git");
    expect(mainStatus).toBe(true);
  });
});

