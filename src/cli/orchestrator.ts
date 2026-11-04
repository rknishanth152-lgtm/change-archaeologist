/**
 * Change Archaeologist - CLI Orchestrator
 *
 * Coordinates argument parsing, input validation, historical AST comparison,
 * companion test-change analysis, conservative correlation, unified report
 * assembly, and safe output writing.
 */

import fs from "node:fs";
import path from "node:path";
import {
  ExitCode,
  type CliArgsResult,
  type CliIo,
  type CliOptions,
} from "./types.js";
import { parseCliArgs } from "./args.js";
import { safeWriteReportFile } from "./safe-file-writer.js";
import { compareHistoricalFunction } from "../core/comparison/index.js";
import { analyzeTestChanges } from "../core/test-analysis/index.js";
import { correlateChanges } from "../core/correlation/index.js";
import {
  assembleInvestigationReport,
  serializeReportToJson,
  serializeReportToMarkdown,
} from "../core/reporting/index.js";
import { GitError, normalizeRepoRelativePath } from "../core/git/index.js";
import { ValidationError } from "../core/domain/schemas.js";
import type {
  AnalysisReport,
  InvestigationReport,
  TestAnalysisReport,
  CorrelationReport,
} from "../core/domain/types.js";

/**
 * Main orchestration function for executing Change Archaeologist via CLI.
 *
 * @param argv Command line arguments (excluding node binary and script path).
 * @param io Optional injectable IO handles for testing and stdout/stderr capture.
 * @returns Numeric exit code adhering to the ExitCode policy.
 */
export async function runCli(argv: readonly string[], io?: CliIo): Promise<number> {
  const stdout = io?.stdout ?? ((text: string) => process.stdout.write(text));
  const stderr = io?.stderr ?? ((text: string) => process.stderr.write(text));
  const cwd = io?.cwd ?? process.cwd();

  // 1. Parse CLI arguments
  const parsed: CliArgsResult = parseCliArgs(argv);

  if (parsed.kind === "HELP") {
    stdout(parsed.message);
    return ExitCode.SUCCESS;
  }

  if (parsed.kind === "VERSION") {
    stdout(`change-archaeologist ${parsed.version}\n`);
    return ExitCode.SUCCESS;
  }

  if (parsed.kind === "ERROR") {
    stderr(`Error: ${parsed.error}\nRun 'change-archaeologist --help' for usage.\n`);
    return parsed.exitCode;
  }

  const { options } = parsed;

  // 2. Validate repository path
  const resolvedRepo = path.isAbsolute(options.repoPath)
    ? path.normalize(options.repoPath)
    : path.resolve(cwd, options.repoPath);

  if (!fs.existsSync(resolvedRepo)) {
    stderr(`Error: Repository path does not exist: '${resolvedRepo}'.\n`);
    return ExitCode.INVALID_REPOSITORY_OR_REVISION;
  }

  // 3. Normalize production and test file paths
  let normalizedTargetFile: string;
  const normalizedTestFiles: string[] = [];
  try {
    normalizedTargetFile = normalizeRepoRelativePath(options.targetFilePath);
    for (const tf of options.testFilePaths) {
      normalizedTestFiles.push(normalizeRepoRelativePath(tf));
    }
  } catch (pathErr: unknown) {
    if (pathErr instanceof GitError) {
      stderr(`Error: ${pathErr.message}\n`);
      return ExitCode.INVALID_REPOSITORY_OR_REVISION;
    }
    const msg = pathErr instanceof Error ? pathErr.message : String(pathErr);
    stderr(`Error validating path: ${msg}\n`);
    return ExitCode.INVALID_ARGUMENTS;
  }

  // 4. Run historical production-function comparison
  let prodReport: AnalysisReport;
  try {
    prodReport = await compareHistoricalFunction(
      {
        repoPath: resolvedRepo,
        targetFilePath: normalizedTargetFile,
        targetFunctionName: options.targetFunctionName,
        baseRevisionInput: options.baseRevision,
        headRevisionInput: options.headRevision,
      },
      { runner: io?.runner }
    );
  } catch (err: unknown) {
    if (err instanceof GitError) {
      stderr(`Git Error [${err.code}]: ${err.message}\n`);
      return ExitCode.INVALID_REPOSITORY_OR_REVISION;
    }
    if (err instanceof ValidationError) {
      stderr(`Validation Error: ${err.message}\n`);
      return ExitCode.INVALID_ARGUMENTS;
    }
    const msg = err instanceof Error ? err.message : String(err);
    stderr(`Analysis Error: ${msg}\n`);
    if (options.debug && err instanceof Error && err.stack) {
      stderr(`${err.stack}\n`);
    }
    return ExitCode.ANALYSIS_FAILURE;
  }

  // 5. Run test-change analysis if companion test files were provided
  let testReport: TestAnalysisReport | null = null;
  if (normalizedTestFiles.length > 0) {
    try {
      testReport = await analyzeTestChanges(
        {
          repoPath: resolvedRepo,
          baseRevisionInput: options.baseRevision,
          headRevisionInput: options.headRevision,
          testFilePaths: normalizedTestFiles,
          targetFilePath: normalizedTargetFile,
          targetFunctionName: options.targetFunctionName,
        },
        { runner: io?.runner }
      );
    } catch (err: unknown) {
      if (err instanceof GitError) {
        stderr(`Git Error in test analysis [${err.code}]: ${err.message}\n`);
        return ExitCode.INVALID_REPOSITORY_OR_REVISION;
      }
      const msg = err instanceof Error ? err.message : String(err);
      stderr(`Test Analysis Error: ${msg}\n`);
      if (options.debug && err instanceof Error && err.stack) {
        stderr(`${err.stack}\n`);
      }
      return ExitCode.ANALYSIS_FAILURE;
    }
  }

  // 6. Run change-to-test correlation if test changes were analyzed
  let correlationReport: CorrelationReport | null = null;
  if (testReport) {
    try {
      correlationReport = correlateChanges(prodReport, testReport);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      stderr(`Correlation Error: ${msg}\n`);
      if (options.debug && err instanceof Error && err.stack) {
        stderr(`${err.stack}\n`);
      }
      return ExitCode.ANALYSIS_FAILURE;
    }
  }

  // 7. Assemble unified investigation report
  let unifiedReport: InvestigationReport;
  try {
    unifiedReport = assembleInvestigationReport({
      productionReport: prodReport,
      testReport,
      correlationReport,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    stderr(`Report Assembly Error: ${msg}\n`);
    return ExitCode.ANALYSIS_FAILURE;
  }

  // 8. Serialize report to requested format
  let serialized: string;
  try {
    if (options.format === "json") {
      serialized = serializeReportToJson(unifiedReport);
    } else {
      serialized = serializeReportToMarkdown(unifiedReport);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    stderr(`Serialization Error: ${msg}\n`);
    return ExitCode.ANALYSIS_FAILURE;
  }

  // 9. Output delivery: file or stdout
  if (options.outputPath) {
    const writeResult = safeWriteReportFile({
      outputPath: options.outputPath,
      content: serialized,
      force: options.force,
      cwd,
      forbiddenPaths: [
        path.resolve(resolvedRepo, normalizedTargetFile),
        ...normalizedTestFiles.map((tf) => path.resolve(resolvedRepo, tf)),
      ],
    });

    if (!writeResult.success) {
      stderr(`Error: ${writeResult.error}\n`);
      return ExitCode.OUTPUT_FAILURE;
    }

    // Diagnostics and status info sent to stderr to keep stdout pure
    stderr(`Report successfully written to '${writeResult.resolvedPath}'.\n`);
  } else {
    // Write pure serialized output to stdout without logging noise
    stdout(serialized + (serialized.endsWith("\n") ? "" : "\n"));
  }

  // 10. Compute final exit code based on report completeness
  const isProdIncomplete = unifiedReport.status.startsWith("INCOMPLETE_");
  const isTestIncomplete = testReport?.status.startsWith("INCOMPLETE_") ?? false;
  const isCorrIncomplete = correlationReport?.status.startsWith("INCOMPLETE_") ?? false;

  if (isProdIncomplete || isTestIncomplete || isCorrIncomplete) {
    return ExitCode.INCOMPLETE_ANALYSIS;
  }

  return ExitCode.SUCCESS;
}
