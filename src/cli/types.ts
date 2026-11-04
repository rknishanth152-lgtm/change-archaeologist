/**
 * Change Archaeologist - Command-Line Interface Types & Exit Codes
 */

import type { GitRunner } from "../core/git/index.js";

/**
 * Stable, documented CLI exit codes.
 */
export enum ExitCode {
  /** Successful analysis with complete investigation report */
  SUCCESS = 0,
  /** Analysis was incomplete (e.g. missing function in one revision) but produced a valid report */
  INCOMPLETE_ANALYSIS = 1,
  /** CLI arguments were missing, invalid, or malformed */
  INVALID_ARGUMENTS = 2,
  /** Target repository does not exist, is not a Git repo, or revision specifier is invalid */
  INVALID_REPOSITORY_OR_REVISION = 3,
  /** Unexpected analysis failure or unparseable source preventing report generation */
  ANALYSIS_FAILURE = 4,
  /** File writing failure, path safety violation, or target exists without --force */
  OUTPUT_FAILURE = 5,
}

export type OutputFormat = "json" | "markdown";

export interface CliOptions {
  readonly repoPath: string;
  readonly targetFilePath: string;
  readonly targetFunctionName: string;
  readonly baseRevision: string;
  readonly headRevision: string;
  readonly format: OutputFormat;
  readonly outputPath?: string;
  readonly force: boolean;
  readonly testFilePaths: readonly string[];
  readonly debug: boolean;
}

export type CliArgsResult =
  | { readonly kind: "RUN"; readonly options: CliOptions }
  | { readonly kind: "HELP"; readonly message: string }
  | { readonly kind: "VERSION"; readonly version: string }
  | { readonly kind: "ERROR"; readonly error: string; readonly exitCode: ExitCode };

export interface CliIo {
  readonly stdout?: (text: string) => void;
  readonly stderr?: (text: string) => void;
  readonly cwd?: string;
  readonly runner?: GitRunner;
}
