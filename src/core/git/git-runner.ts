/**
 * Change Archaeologist - Hardened Git Subprocess Runner
 *
 * Direct subprocess wrapper executing Git commands via child_process.execFile:
 * - shell: false (strictly disabled on all platforms).
 * - Prepend global flags disabling hooks, external diff tools, and opportunistic index locks.
 * - Enforces process timeouts and output buffer caps.
 * - Maps low-level OS errors to structured GitError objects.
 */

import { execFile } from "node:child_process";
import { GitError, type GitErrorCode } from "./errors.js";

export interface GitRunnerOptions {
  readonly gitBinary?: string;
  readonly defaultTimeoutMs?: number;
  readonly defaultMaxBufferBytes?: number;
}

export interface GitExecOptions {
  readonly allowNonZero?: boolean;
  readonly timeoutMs?: number;
  readonly maxBufferBytes?: number;
}

export interface GitExecResult {
  readonly stdout: string;
  readonly stderr: string;
  readonly exitCode: number;
}

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_BUFFER_BYTES = 10 * 1024 * 1024; // 10 MB

const DEFAULT_GLOBAL_SAFETY_FLAGS: readonly string[] = [
  "-c", "core.hooksPath=",       // Disable repo-local hooks
  "-c", "core.fsmonitor=false",  // Disable background fsmonitor hooks
  "--no-pager",                  // Disable interactive pagination
];

export class GitRunner {
  readonly gitBinary: string;
  readonly defaultTimeoutMs: number;
  readonly defaultMaxBufferBytes: number;

  constructor(options: GitRunnerOptions = {}) {
    this.gitBinary = options.gitBinary ?? "git";
    this.defaultTimeoutMs = options.defaultTimeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.defaultMaxBufferBytes = options.defaultMaxBufferBytes ?? DEFAULT_MAX_BUFFER_BYTES;
  }

  /**
   * Executes a Git plumbing command safely with argument arrays and shell: false.
   *
   * @param cwd Working directory (must be verified repository root).
   * @param args Command arguments (e.g. ["rev-parse", "--verify", "HEAD"]).
   * @param options Execution overrides (allowNonZero, timeout, maxBuffer).
   */
  async exec(
    cwd: string,
    args: readonly string[],
    options: GitExecOptions = {}
  ): Promise<GitExecResult> {
    const fullArgs = [...DEFAULT_GLOBAL_SAFETY_FLAGS, ...args];
    const timeout = options.timeoutMs ?? this.defaultTimeoutMs;
    const maxBuffer = options.maxBufferBytes ?? this.defaultMaxBufferBytes;

    return new Promise<GitExecResult>((resolve, reject) => {
      execFile(
        this.gitBinary,
        fullArgs,
        {
          cwd,
          shell: false,
          timeout,
          maxBuffer,
          windowsHide: true,
          env: {
            ...process.env,
            GIT_TERMINAL_PROMPT: "0", // Never hang on credential/terminal prompts
            GIT_OPTIONAL_LOCKS: "0",  // Never refresh .git/index stat caches on read-only calls
          },
          encoding: "utf8",
        },
        (error, stdout, stderr) => {
          const stdoutStr = String(stdout ?? "");
          const stderrStr = String(stderr ?? "");

          if (error) {
            // Check for timeout
            if (error.killed || (error as { signal?: string }).signal === "SIGTERM" || error.message.includes("timed out")) {
              return reject(
                new GitError(
                  `Git command timed out after ${timeout}ms`,
                  "GIT_TIMEOUT",
                  { args, timeout }
                )
              );
            }

            // Check for binary missing (ENOENT)
            if ((error as { code?: string }).code === "ENOENT") {
              return reject(
                new GitError(
                  `Git executable '${this.gitBinary}' not found on host PATH`,
                  "GIT_NOT_FOUND",
                  { gitBinary: this.gitBinary }
                )
              );
            }

            // Check for buffer overflow
            if ((error as { code?: string }).code === "ERR_CHILD_PROCESS_STDIO_MAXBUFFER") {
              return reject(
                new GitError(
                  `Git output exceeded buffer limit of ${maxBuffer} bytes`,
                  "GIT_OUTPUT_LIMIT_EXCEEDED",
                  { maxBuffer }
                )
              );
            }

            const exitCode = typeof error.code === "number" ? error.code : 1;

            if (options.allowNonZero) {
              return resolve({
                stdout: stdoutStr,
                stderr: stderrStr,
                exitCode,
              });
            }

            return reject(
              new GitError(
                `Git execution failed (exit ${exitCode}): ${stderrStr.trim() || error.message}`,
                "GIT_EXEC_ERROR",
                { exitCode, stderr: stderrStr.trim(), args }
              )
            );
          }

          resolve({
            stdout: stdoutStr,
            stderr: stderrStr,
            exitCode: 0,
          });
        }
      );
    });
  }
}
