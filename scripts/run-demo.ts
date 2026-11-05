/**
 * Change Archaeologist - Demonstration Runner
 *
 * Orchestrates a complete end-to-end demonstration of Change Archaeologist:
 * 1. Generates the deterministic synthetic demonstration repository.
 * 2. Loads predefined scenario expectations from examples/demo-expectations.json.
 * 3. Executes the production CLI (runCli) against each scenario.
 * 4. Verifies actual outcomes against expectations (exit codes, statuses, rules, epistemic constraints).
 * 5. Generates human-readable Markdown and structured JSON sample reports in examples/output/.
 * 6. Emits a clean, formatted execution report to stdout.
 *
 * Usable via: `npm run demo`
 */

import fs from "node:fs";
import path from "node:path";
import { runCli } from "../src/cli/orchestrator.js";
import { ExitCode } from "../src/cli/types.js";
import { validateAnalysisReport } from "../src/core/domain/schemas.js";
import type { AnalysisReport } from "../src/core/domain/types.js";
import { createDemoRepository } from "./create-demo-repository.js";

export interface DemoScenarioExpectation {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly targetFilePath: string;
  readonly targetFunctionName: string;
  readonly companionTestFiles: readonly string[];
  readonly baseRevision: string;
  readonly headRevision: string;
  readonly expectedExitCode: number;
  readonly expectedReportStatus: string;
  readonly expectedStructuralRules?: readonly string[];
  readonly expectedCategories?: readonly string[];
  readonly expectedCorrelationStatus?: string;
  readonly expectedCorrelationClassification?: string;
  readonly minStructuralChanges?: number;
  readonly maxStructuralChanges?: number;
  readonly minTestChanges?: number;
  readonly minCorrelations?: number;
  readonly forbiddenClaims: readonly string[];
}

export interface DemoExpectationsFile {
  readonly version: string;
  readonly description: string;
  readonly scenarios: readonly DemoScenarioExpectation[];
}

export interface ScenarioExecutionResult {
  readonly id: string;
  readonly title: string;
  readonly passed: boolean;
  readonly actualExitCode: number;
  readonly actualStatus?: string;
  readonly executionTimeMs: number;
  readonly discrepancies: readonly string[];
  readonly jsonReportPath?: string;
  readonly markdownReportPath?: string;
}

export interface DemoRunSummary {
  readonly repoDir: string;
  readonly totalScenarios: number;
  readonly passedCount: number;
  readonly failedCount: number;
  readonly allPassed: boolean;
  readonly totalDurationMs: number;
  readonly results: readonly ScenarioExecutionResult[];
}

export async function runDemonstration(options: {
  repoDir?: string;
  outputDir?: string;
  expectationsPath?: string;
  verbose?: boolean;
} = {}): Promise<DemoRunSummary> {
  const startTime = Date.now();
  const verbose = options.verbose ?? true;

  const repoDir = options.repoDir ?? path.resolve("examples/demo-repository");
  const outputDir = options.outputDir ?? path.resolve("examples/output");
  const expectationsPath =
    options.expectationsPath ?? path.resolve("examples/demo-expectations.json");

  if (verbose) {
    console.log("================================================================================");
    console.log("             CHANGE ARCHAEOLOGIST - END-TO-END DEMONSTRATION                   ");
    console.log("================================================================================");
    console.log(`Generating synthetic demonstration repository in:\n  ${repoDir}\n`);
  }

  // 1. Generate synthetic Git repository
  const demoRepo = createDemoRepository({ targetDir: repoDir, cleanExisting: true });

  if (verbose) {
    console.log(`Repository ready:`);
    console.log(`  Base Tag: ${demoRepo.baseTag} (${demoRepo.baseCommitSha.slice(0, 8)})`);
    console.log(`  Head Tag: ${demoRepo.headTag} (${demoRepo.headCommitSha.slice(0, 8)})\n`);
  }

  // 2. Load expectations manifest
  if (!fs.existsSync(expectationsPath)) {
    throw new Error(`Demo expectations manifest not found at: ${expectationsPath}`);
  }
  const manifestRaw = fs.readFileSync(expectationsPath, "utf8");
  const manifest: DemoExpectationsFile = JSON.parse(manifestRaw);

  fs.mkdirSync(outputDir, { recursive: true });

  const results: ScenarioExecutionResult[] = [];

  for (const scenario of manifest.scenarios) {
    const scStart = Date.now();
    const discrepancies: string[] = [];

    // Construct CLI arguments for JSON mode
    const jsonArgs = [
      "--repo", repoDir,
      "--file", scenario.targetFilePath,
      "--function", scenario.targetFunctionName,
      "--base", scenario.baseRevision,
      "--head", scenario.headRevision,
      "--format", "json",
    ];

    for (const tf of scenario.companionTestFiles) {
      jsonArgs.push("--test-file", tf);
    }

    let jsonStdout = "";
    let jsonStderr = "";

    const actualExitCode = await runCli(jsonArgs, {
      stdout: (t) => { jsonStdout += t; },
      stderr: (t) => { jsonStderr += t; },
      cwd: repoDir,
    });

    // Check exit code
    if (actualExitCode !== scenario.expectedExitCode) {
      discrepancies.push(
        `Exit code mismatch: expected ${scenario.expectedExitCode} (${ExitCode[scenario.expectedExitCode]}), got ${actualExitCode} (${ExitCode[actualExitCode] ?? "UNKNOWN"}). Stderr: ${jsonStderr.trim()}`
      );
    }

    let parsedReport: AnalysisReport | undefined;

    if (actualExitCode === ExitCode.SUCCESS || actualExitCode === ExitCode.INCOMPLETE_ANALYSIS) {
      try {
        parsedReport = JSON.parse(jsonStdout);
        const validation = validateAnalysisReport(parsedReport!);
        if (!validation.success) {
          discrepancies.push(
            `Schema validation failed: ${validation.issues.map((i) => i.message).join("; ")}`
          );
        }

        if (parsedReport && parsedReport.status !== scenario.expectedReportStatus) {
          discrepancies.push(
            `Status mismatch: expected '${scenario.expectedReportStatus}', got '${parsedReport.status}'`
          );
        }

        if (parsedReport && scenario.expectedStructuralRules) {
          for (const expectedRule of scenario.expectedStructuralRules) {
            const hasRule = parsedReport.structuralChanges.some((sc) => sc.ruleId === expectedRule);
            if (!hasRule) {
              discrepancies.push(`Expected structural change rule '${expectedRule}' was not detected.`);
            }
          }
        }

        if (parsedReport && scenario.expectedCategories) {
          for (const expectedCat of scenario.expectedCategories) {
            const hasCat = parsedReport.structuralChanges.some((sc) => sc.category === expectedCat);
            if (!hasCat) {
              discrepancies.push(`Expected structural category '${expectedCat}' was not detected.`);
            }
          }
        }

        if (parsedReport && scenario.minStructuralChanges !== undefined) {
          if (parsedReport.structuralChanges.length < scenario.minStructuralChanges) {
            discrepancies.push(
              `Expected at least ${scenario.minStructuralChanges} structural changes, got ${parsedReport.structuralChanges.length}`
            );
          }
        }

        if (parsedReport && scenario.maxStructuralChanges !== undefined) {
          if (parsedReport.structuralChanges.length > scenario.maxStructuralChanges) {
            discrepancies.push(
              `Expected at most ${scenario.maxStructuralChanges} structural changes, got ${parsedReport.structuralChanges.length}`
            );
          }
        }

        if (parsedReport && scenario.expectedCorrelationStatus) {
          const hasCorr = parsedReport.correlations.some(
            (c) => c.status === scenario.expectedCorrelationStatus
          ) || parsedReport.correlationItems?.some((item) => item.status === scenario.expectedCorrelationStatus);

          if (!hasCorr) {
            discrepancies.push(
              `Expected correlation status '${scenario.expectedCorrelationStatus}', but neither correlations nor items matched.`
            );
          }
        }

        if (parsedReport && scenario.expectedCorrelationClassification) {
          const hasClass = parsedReport.correlationItems?.some(
            (item) => item.classification === scenario.expectedCorrelationClassification
          );
          if (!hasClass) {
            discrepancies.push(
              `Expected correlation classification '${scenario.expectedCorrelationClassification}' not found.`
            );
          }
        }
      } catch (err: unknown) {
        discrepancies.push(`Failed to parse JSON stdout: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // Epistemic constraints check
    const combinedOutput = `${jsonStdout}\n${jsonStderr}`.toLowerCase();
    for (const forbidden of scenario.forbiddenClaims) {
      if (combinedOutput.includes(forbidden.toLowerCase())) {
        discrepancies.push(`Forbidden epistemic claim found in output: "${forbidden}"`);
      }
    }

    // Run CLI in Markdown mode to save sample report and verify Markdown structure
    const mdArgs = [...jsonArgs];
    const fmtIdx = mdArgs.indexOf("--format");
    if (fmtIdx !== -1) mdArgs[fmtIdx + 1] = "markdown";

    let mdStdout = "";
    let mdStderr = "";

    const mdExitCode = await runCli(mdArgs, {
      stdout: (t) => { mdStdout += t; },
      stderr: (t) => { mdStderr += t; },
      cwd: repoDir,
    });

    if (mdExitCode !== actualExitCode) {
      discrepancies.push(`Markdown exit code (${mdExitCode}) differed from JSON exit code (${actualExitCode})`);
    }

    if (actualExitCode === ExitCode.SUCCESS || actualExitCode === ExitCode.INCOMPLETE_ANALYSIS) {
      if (!mdStdout.includes("# Investigation Summary")) {
        discrepancies.push("Markdown output missing '# Investigation Summary'");
      }
      if (!mdStdout.includes("## Analysis Scope and Method Limitations")) {
        discrepancies.push("Markdown output missing '## Analysis Scope and Method Limitations'");
      }
    }

    // Save sample reports for inspection
    const scenarioFilePrefix = `scenario-${scenario.id.toLowerCase()}-${scenario.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    const jsonReportPath = path.join(outputDir, `${scenarioFilePrefix}.json`);
    const markdownReportPath = path.join(outputDir, `${scenarioFilePrefix}.md`);

    fs.writeFileSync(jsonReportPath, jsonStdout, "utf8");
    fs.writeFileSync(markdownReportPath, mdStdout, "utf8");

    const passed = discrepancies.length === 0;
    const executionTimeMs = Date.now() - scStart;

    results.push({
      id: scenario.id,
      title: scenario.title,
      passed,
      actualExitCode,
      actualStatus: parsedReport?.status,
      executionTimeMs,
      discrepancies,
      jsonReportPath,
      markdownReportPath,
    });

    if (verbose) {
      const statusBadge = passed ? "✓ PASS" : "✗ FAIL";
      console.log(`[Scenario ${scenario.id}] ${statusBadge}: ${scenario.title} (${executionTimeMs}ms)`);
      console.log(`  Function: ${scenario.targetFunctionName} in ${scenario.targetFilePath}`);
      console.log(`  Status:   ${parsedReport?.status ?? "N/A"} (Exit: ${actualExitCode})`);
      if (discrepancies.length > 0) {
        console.log(`  Discrepancies:`);
        for (const d of discrepancies) {
          console.log(`    - ${d}`);
        }
      }
      console.log(`  Reports:  ${path.relative(process.cwd(), markdownReportPath)}`);
      console.log("");
    }
  }

  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.length - passedCount;
  const allPassed = failedCount === 0;
  const totalDurationMs = Date.now() - startTime;

  if (verbose) {
    console.log("================================================================================");
    console.log(`DEMONSTRATION RESULTS: ${passedCount} / ${results.length} Scenarios Passed (${totalDurationMs}ms)`);
    console.log("================================================================================");
    if (allPassed) {
      console.log("All demonstration scenarios completed with 100% agreement with expectations.");
      console.log(`Inspect generated reports in: ${outputDir}`);
    } else {
      console.error(`${failedCount} scenario(s) failed validation.`);
    }
    console.log("================================================================================\n");
  }

  return {
    repoDir,
    totalScenarios: results.length,
    passedCount,
    failedCount,
    allPassed,
    totalDurationMs,
    results,
  };
}

// Standalone runner execution
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/i, "$1"))) {
  runDemonstration()
    .then((summary) => {
      process.exitCode = summary.allPassed ? 0 : 1;
    })
    .catch((err) => {
      console.error("Demonstration execution failed:", err);
      process.exitCode = 1;
    });
}

