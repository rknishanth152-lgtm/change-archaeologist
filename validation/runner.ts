/**
 * Change Archaeologist - Validation Corpus Runner & Harness
 *
 * Executes the real CLI against controlled synthetic Git repositories, validates
 * schemas, referential integrity, non-mutation guarantees, and epistemic boundaries.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { runCli } from "../src/cli/orchestrator.js";
import { ExitCode } from "../src/cli/types.js";
import { validateAnalysisReport } from "../src/core/domain/schemas.js";
import type { InvestigationReport } from "../src/core/domain/types.js";
import { VALIDATION_MANIFEST } from "./manifest.js";
import { buildScenarioFixture } from "./fixtures/fixture-builder.js";
import type {
  ScenarioExecutionResult,
  ScenarioExpectations,
  ValidationScenarioId,
} from "./types.js";

function runGitIn(dir: string, args: string[]): string {
  return execFileSync("git", args, {
    cwd: dir,
    shell: false,
    encoding: "utf8",
    env: {
      ...process.env,
      GIT_TERMINAL_PROMPT: "0",
      GIT_OPTIONAL_LOCKS: "0",
    },
  }).trim();
}

function computeFileSha(filePath: string): string {
  const content = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(content).digest("hex");
}

function hashDirectoryFiles(dir: string): Map<string, string> {
  const fileMap = new Map<string, string>();
  function walk(current: string) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.name === ".git") continue;
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile()) {
        const rel = path.relative(dir, fullPath).replace(/\\/g, "/");
        fileMap.set(rel, computeFileSha(fullPath));
      }
    }
  }
  walk(dir);
  return fileMap;
}

export async function executeScenario(
  scenarioId: ValidationScenarioId
): Promise<ScenarioExecutionResult> {
  const scenario: ScenarioExpectations = VALIDATION_MANIFEST[scenarioId];
  if (!scenario) {
    throw new Error(`Unknown scenario ID: ${scenarioId}`);
  }

  const startTime = Date.now();
  const discrepancies: string[] = [];

  const { repo, baseSha, headSha } = buildScenarioFixture(scenarioId);

  try {
    // 1. Snapshot repository state before CLI execution
    const preHeadSha = runGitIn(repo.dir, ["rev-parse", "HEAD"]);
    const preTreeSha = runGitIn(repo.dir, ["rev-parse", "HEAD^{tree}"]);
    const preStatus = runGitIn(repo.dir, ["status", "--porcelain"]);
    const preFileHashes = hashDirectoryFiles(repo.dir);

    // 2. Prepare CLI arguments for JSON analysis
    const cliArgs = [
      "--repo",
      repo.dir,
      "--file",
      scenario.targetFilePath,
      "--function",
      scenario.targetFunctionName,
      "--base",
      baseSha,
      "--head",
      headSha,
      "--format",
      "json",
    ];

    if (scenario.testFilePaths && scenario.testFilePaths.length > 0) {
      for (const tf of scenario.testFilePaths) {
        cliArgs.push("--test-file", tf);
      }
    }

    if (scenario.extraCliArgs) {
      cliArgs.push(...scenario.extraCliArgs);
    }

    // 3. Execute the actual CLI orchestrator
    let stdoutText = "";
    let stderrText = "";

    const actualExitCode = await runCli(cliArgs, {
      stdout: (text: string) => {
        stdoutText += text;
      },
      stderr: (text: string) => {
        stderrText += text;
      },
      cwd: repo.dir,
    });

    // 4. Check Non-Modification Guarantees
    const postHeadSha = runGitIn(repo.dir, ["rev-parse", "HEAD"]);
    const postTreeSha = runGitIn(repo.dir, ["rev-parse", "HEAD^{tree}"]);
    const postStatus = runGitIn(repo.dir, ["status", "--porcelain"]);
    const postFileHashes = hashDirectoryFiles(repo.dir);

    let repositoryUnmodified = true;
    if (preHeadSha !== postHeadSha) {
      repositoryUnmodified = false;
      discrepancies.push(`Git HEAD SHA changed from ${preHeadSha} to ${postHeadSha}`);
    }
    if (preTreeSha !== postTreeSha) {
      repositoryUnmodified = false;
      discrepancies.push(`Git tree SHA changed from ${preTreeSha} to ${postTreeSha}`);
    }
    if (postStatus !== preStatus) {
      repositoryUnmodified = false;
      discrepancies.push(`Git status changed: '${postStatus}' (was '${preStatus}')`);
    }
    for (const [filePath, hash] of preFileHashes) {
      const postHash = postFileHashes.get(filePath);
      if (postHash !== hash) {
        repositoryUnmodified = false;
        discrepancies.push(`Source file '${filePath}' was mutated during analysis.`);
      }
    }

    // 5. Check Exit Code Match
    const exitCodeMatch = actualExitCode === scenario.expectedExitCode;
    if (!exitCodeMatch) {
      discrepancies.push(
        `Exit code mismatch: expected ${scenario.expectedExitCode} (${ExitCode[scenario.expectedExitCode]}), got ${actualExitCode} (${ExitCode[actualExitCode] ?? "UNKNOWN"}). Stderr: ${stderrText.trim()}`
      );
    }

    // 6. Parse and Validate JSON Schema & Referential Integrity
    let schemaValid = false;
    let referentialIntegrityValid = false;
    let statusMatch = false;
    let actualStatus: string | undefined;

    if (actualExitCode === ExitCode.SUCCESS || actualExitCode === ExitCode.INCOMPLETE_ANALYSIS) {
      try {
        const parsed: InvestigationReport = JSON.parse(stdoutText);
        actualStatus = parsed.status;

        // Check runtime domain schema
        const schemaRes = validateAnalysisReport(parsed);
        if (schemaRes.success) {
          schemaValid = true;
          referentialIntegrityValid = true;
        } else {
          schemaValid = false;
          referentialIntegrityValid = false;
          discrepancies.push(
            `Report schema/integrity violation: ${schemaRes.issues.map((i) => `[${i.code}] ${i.path}: ${i.message}`).join("; ")}`
          );
        }

        // Status match
        statusMatch = parsed.status === scenario.expectedReportStatus;
        if (!statusMatch) {
          discrepancies.push(
            `Status mismatch: expected '${scenario.expectedReportStatus}', got '${parsed.status}'`
          );
        }

        // Structural changes count
        if (scenario.minStructuralChanges !== undefined) {
          if (parsed.structuralChanges.length < scenario.minStructuralChanges) {
            discrepancies.push(
              `Expected at least ${scenario.minStructuralChanges} structural change(s), got ${parsed.structuralChanges.length}`
            );
          }
        }
        if (scenario.maxStructuralChanges !== undefined) {
          if (parsed.structuralChanges.length > scenario.maxStructuralChanges) {
            discrepancies.push(
              `Expected at most ${scenario.maxStructuralChanges} structural change(s), got ${parsed.structuralChanges.length}`
            );
          }
        }

        // Check expected structural categories & rules
        if (scenario.expectedStructuralCategories) {
          for (const cat of scenario.expectedStructuralCategories) {
            const hasCat = parsed.structuralChanges.some((sc) => sc.category === cat);
            if (!hasCat) {
              discrepancies.push(`Expected structural change category '${cat}' not found.`);
            }
          }
        }
        if (scenario.expectedRules) {
          for (const rule of scenario.expectedRules) {
            const hasRule = parsed.structuralChanges.some((sc) => sc.ruleId === rule);
            if (!hasRule) {
              discrepancies.push(`Expected structural change rule '${rule}' not found.`);
            }
          }
        }

        // Check test report status
        if (scenario.expectedTestStatus) {
          const testStatus = parsed.testAnalysisStatus;
          if (testStatus !== scenario.expectedTestStatus) {
            discrepancies.push(
              `Expected test analysis status '${scenario.expectedTestStatus}', got '${testStatus ?? "none"}'`
            );
          }
        }

        // Check correlation analysis status
        if (scenario.expectedCorrelationAnalysisStatus) {
          const corrAnalysisStatus = parsed.correlationAnalysisStatus;
          if (corrAnalysisStatus !== scenario.expectedCorrelationAnalysisStatus) {
            discrepancies.push(
              `Expected correlation analysis status '${scenario.expectedCorrelationAnalysisStatus}', got '${corrAnalysisStatus ?? "none"}'`
            );
          }
        }

        // Check correlation item status
        if (scenario.expectedCorrelationStatus) {
          const hasMatchingStatus =
            parsed.correlations.some((c) => c.status === scenario.expectedCorrelationStatus) ||
            (parsed.correlationItems?.some((item) => item.status === scenario.expectedCorrelationStatus) ?? false);
          if (!hasMatchingStatus) {
            discrepancies.push(
              `Expected correlation status '${scenario.expectedCorrelationStatus}', but neither correlations nor correlationItems matched.`
            );
          }
        }

        // Check correlation classifications
        if (scenario.expectedCorrelationClassifications && parsed.correlationItems) {
          for (const expectedClass of scenario.expectedCorrelationClassifications) {
            const hasClass = parsed.correlationItems.some(
              (item) => item.classification === expectedClass
            );
            if (!hasClass) {
              discrepancies.push(
                `Expected correlation classification '${expectedClass}' not found in items.`
              );
            }
          }
        }

        // Check expected limitations
        if (scenario.expectedLimitations) {
          for (const expectedLim of scenario.expectedLimitations) {
            const found = parsed.limitations.some((lim) =>
              lim.toLowerCase().includes(expectedLim.toLowerCase())
            );
            if (!found) {
              discrepancies.push(`Expected limitation containing '${expectedLim}' not found.`);
            }
          }
        }
      } catch (jsonErr: unknown) {
        const msg = jsonErr instanceof Error ? jsonErr.message : String(jsonErr);
        discrepancies.push(`Failed to parse JSON output: ${msg}`);
      }
    } else {
      // Exit code other than 0 or 1 (e.g. error condition)
      schemaValid = true; // Not expected to emit schema report on fatal error
      referentialIntegrityValid = true;
      statusMatch = true;
    }

    // 7. Check Epistemic Constraints / Forbidden Claims
    let forbiddenClaimsRespected = true;
    const combinedOutput = `${stdoutText}\n${stderrText}`.toLowerCase();
    for (const forbidden of scenario.forbiddenClaims) {
      if (combinedOutput.includes(forbidden.toLowerCase())) {
        forbiddenClaimsRespected = false;
        discrepancies.push(`Forbidden epistemic claim found in CLI output: "${forbidden}"`);
      }
    }

    // 8. Also test Markdown output rendering consistency
    const mdArgs = [...cliArgs];
    const formatIdx = mdArgs.indexOf("--format");
    if (formatIdx !== -1 && formatIdx + 1 < mdArgs.length) {
      mdArgs[formatIdx + 1] = "markdown";
    }
    let mdStdout = "";
    let mdStderr = "";
    const mdExitCode = await runCli(mdArgs, {
      stdout: (text: string) => {
        mdStdout += text;
      },
      stderr: (text: string) => {
        mdStderr += text;
      },
      cwd: repo.dir,
    });

    if (mdExitCode !== actualExitCode) {
      discrepancies.push(
        `Markdown run exit code (${mdExitCode}) differed from JSON run exit code (${actualExitCode})`
      );
    }
    if (actualExitCode === ExitCode.SUCCESS || actualExitCode === ExitCode.INCOMPLETE_ANALYSIS) {
      if (!mdStdout.includes("# Investigation Summary")) {
        discrepancies.push("Markdown output missing '# Investigation Summary' header");
      }
      if (!mdStdout.includes("## Analysis Scope and Method Limitations")) {
        discrepancies.push("Markdown output missing '## Analysis Scope and Method Limitations' section");
      }
    }

    const passed =
      exitCodeMatch &&
      statusMatch &&
      schemaValid &&
      referentialIntegrityValid &&
      repositoryUnmodified &&
      forbiddenClaimsRespected &&
      discrepancies.length === 0;

    return {
      scenarioId,
      passed,
      exitCodeMatch,
      statusMatch,
      schemaValid,
      referentialIntegrityValid,
      repositoryUnmodified,
      forbiddenClaimsRespected,
      actualExitCode,
      actualStatus,
      discrepancies,
      executionTimeMs: Date.now() - startTime,
    };
  } finally {
    repo.cleanup();
  }
}
