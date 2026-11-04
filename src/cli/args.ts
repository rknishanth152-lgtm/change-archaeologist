/**
 * Change Archaeologist - Command-Line Argument Parser
 *
 * Implements a robust, zero-dependency argument parser tailored to the Change Archaeologist CLI.
 */

import { ExitCode, type CliArgsResult, type CliOptions, type OutputFormat } from "./types.js";

const CLI_VERSION = "0.1.0";

/**
 * Generates the user-facing CLI help text.
 */
export function formatHelpText(): string {
  return `Change Archaeologist v${CLI_VERSION}
Local-first static analysis of structural AST changes and test correlations across Git history.

USAGE:
  change-archaeologist analyze [OPTIONS]
  change-archaeologist [OPTIONS]

REQUIRED OPTIONS:
  -r, --repo <path>           Path to the local Git repository
  -f, --file <path>           Repository-relative production source file (e.g. src/auth/token.ts)
  -fn, --function <name>      Target function or method name (e.g. verifyToken)
  -b, --base <revision>       Base Git revision (commit SHA, branch, or tag, e.g. main~1)
  --head <revision>           Head Git revision (commit SHA, branch, or tag, e.g. main)

OUTPUT OPTIONS:
  --format <json|markdown>    Output format (default: markdown)
  -o, --output <path>         File path to save the report (defaults to stdout)
  --force                     Overwrite output file if it already exists

TEST CORRELATION OPTIONS:
  -t, --test-file <path>      Repository-relative test file to analyze (can be repeated or comma-separated)

INFORMATIONAL OPTIONS:
  -h, --help                  Show this help text
  -v, --version               Show version information
  --debug                     Show detailed debug information on error

EXIT CODES:
  0  Success: Complete analysis with valid report
  1  Incomplete: Analysis halted (e.g. function missing in revision) with valid partial report
  2  Invalid Arguments: Missing or malformed CLI parameters
  3  Repository/Revision Error: Git directory or revision specifier not found or invalid
  4  Analysis Failure: Internal AST or extraction failure preventing report generation
  5  Output Error: File write failure, path violation, or file exists without --force
`;
}

/**
 * Parses raw command-line arguments into validated CliOptions or a control action.
 */
export function parseCliArgs(argv: readonly string[]): CliArgsResult {
  const args = [...argv];

  // Strip optional 'analyze' subcommand if provided as first positional argument
  if (args.length > 0 && args[0] === "analyze") {
    args.shift();
  }

  // Check for immediate help or version flags
  if (args.includes("-h") || args.includes("--help")) {
    return { kind: "HELP", message: formatHelpText() };
  }
  if (args.includes("-v") || args.includes("--version")) {
    return { kind: "VERSION", version: CLI_VERSION };
  }

  let repoPath: string | undefined;
  let targetFilePath: string | undefined;
  let targetFunctionName: string | undefined;
  let baseRevision: string | undefined;
  let headRevision: string | undefined;
  let format: OutputFormat = "markdown";
  let outputPath: string | undefined;
  let force = false;
  let debug = false;
  const testFilePaths: string[] = [];

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    if (arg === "--force") {
      force = true;
      i++;
      continue;
    }

    if (arg === "--debug") {
      debug = true;
      i++;
      continue;
    }

    // Handle key=value syntax (e.g. --repo=C:\foo)
    if (arg.startsWith("--") && arg.includes("=")) {
      const eqIdx = arg.indexOf("=");
      const key = arg.slice(0, eqIdx);
      const val = arg.slice(eqIdx + 1);

      if (key === "--repo") {
        repoPath = val;
      } else if (key === "--file") {
        targetFilePath = val;
      } else if (key === "--function" || key === "--func" || key === "--target-function") {
        targetFunctionName = val;
      } else if (key === "--base") {
        baseRevision = val;
      } else if (key === "--head") {
        headRevision = val;
      } else if (key === "--format") {
        const lower = val.toLowerCase();
        if (lower !== "json" && lower !== "markdown") {
          return {
            kind: "ERROR",
            error: `Unsupported output format '${val}'. Must be 'json' or 'markdown'.`,
            exitCode: ExitCode.INVALID_ARGUMENTS,
          };
        }
        format = lower as OutputFormat;
      } else if (key === "--output") {
        outputPath = val;
      } else if (key === "--test-file" || key === "--test-files") {
        for (const item of val.split(",")) {
          const trimmed = item.trim();
          if (trimmed.length > 0) testFilePaths.push(trimmed);
        }
      } else {
        return {
          kind: "ERROR",
          error: `Unknown option '${key}'.`,
          exitCode: ExitCode.INVALID_ARGUMENTS,
        };
      }
      i++;
      continue;
    }

    // Handle standard flag + value syntax
    const nextArg = args[i + 1];
    const takeValue = (flagName: string): string | null => {
      if (nextArg === undefined || nextArg.startsWith("-")) {
        return null;
      }
      i += 2;
      return nextArg;
    };

    if (arg === "-r" || arg === "--repo") {
      const val = takeValue(arg);
      if (val === null) {
        return { kind: "ERROR", error: `Option '${arg}' requires a path argument.`, exitCode: ExitCode.INVALID_ARGUMENTS };
      }
      repoPath = val;
      continue;
    }

    if (arg === "-f" || arg === "--file") {
      const val = takeValue(arg);
      if (val === null) {
        return { kind: "ERROR", error: `Option '${arg}' requires a file path argument.`, exitCode: ExitCode.INVALID_ARGUMENTS };
      }
      targetFilePath = val;
      continue;
    }

    if (arg === "-fn" || arg === "--function" || arg === "--func" || arg === "--target-function") {
      const val = takeValue(arg);
      if (val === null) {
        return { kind: "ERROR", error: `Option '${arg}' requires a function name argument.`, exitCode: ExitCode.INVALID_ARGUMENTS };
      }
      targetFunctionName = val;
      continue;
    }

    if (arg === "-b" || arg === "--base") {
      const val = takeValue(arg);
      if (val === null) {
        return { kind: "ERROR", error: `Option '${arg}' requires a revision argument.`, exitCode: ExitCode.INVALID_ARGUMENTS };
      }
      baseRevision = val;
      continue;
    }

    if (arg === "--head") {
      const val = takeValue(arg);
      if (val === null) {
        return { kind: "ERROR", error: `Option '${arg}' requires a revision argument.`, exitCode: ExitCode.INVALID_ARGUMENTS };
      }
      headRevision = val;
      continue;
    }

    if (arg === "--format") {
      const val = takeValue(arg);
      if (val === null) {
        return { kind: "ERROR", error: `Option '${arg}' requires an argument ('json' or 'markdown').`, exitCode: ExitCode.INVALID_ARGUMENTS };
      }
      const lower = val.toLowerCase();
      if (lower !== "json" && lower !== "markdown") {
        return {
          kind: "ERROR",
          error: `Unsupported output format '${val}'. Must be 'json' or 'markdown'.`,
          exitCode: ExitCode.INVALID_ARGUMENTS,
        };
      }
      format = lower as OutputFormat;
      continue;
    }

    if (arg === "-o" || arg === "--output") {
      const val = takeValue(arg);
      if (val === null) {
        return { kind: "ERROR", error: `Option '${arg}' requires a destination file path argument.`, exitCode: ExitCode.INVALID_ARGUMENTS };
      }
      outputPath = val;
      continue;
    }

    if (arg === "-t" || arg === "--test-file" || arg === "--test-files") {
      const val = takeValue(arg);
      if (val === null) {
        return { kind: "ERROR", error: `Option '${arg}' requires a test file path argument.`, exitCode: ExitCode.INVALID_ARGUMENTS };
      }
      for (const item of val.split(",")) {
        const trimmed = item.trim();
        if (trimmed.length > 0) testFilePaths.push(trimmed);
      }
      continue;
    }

    return {
      kind: "ERROR",
      error: `Unknown argument or option '${arg}'.`,
      exitCode: ExitCode.INVALID_ARGUMENTS,
    };
  }

  // Validate mandatory arguments
  const missing: string[] = [];
  if (!repoPath || repoPath.trim() === "") missing.push("--repo");
  if (!targetFilePath || targetFilePath.trim() === "") missing.push("--file");
  if (!targetFunctionName || targetFunctionName.trim() === "") missing.push("--function");
  if (!baseRevision || baseRevision.trim() === "") missing.push("--base");
  if (!headRevision || headRevision.trim() === "") missing.push("--head");

  if (missing.length > 0) {
    return {
      kind: "ERROR",
      error: `Missing required argument(s): ${missing.join(", ")}.`,
      exitCode: ExitCode.INVALID_ARGUMENTS,
    };
  }

  return {
    kind: "RUN",
    options: {
      repoPath: repoPath!,
      targetFilePath: targetFilePath!,
      targetFunctionName: targetFunctionName!,
      baseRevision: baseRevision!,
      headRevision: headRevision!,
      format,
      outputPath: outputPath?.trim() ? outputPath : undefined,
      force,
      testFilePaths,
      debug,
    },
  };
}

