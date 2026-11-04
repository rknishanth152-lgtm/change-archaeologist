/**
 * Change Archaeologist - Git Subprocess & Adapter Errors
 *
 * Structured error hierarchy for Git operations.
 */

export type GitErrorCode =
  | "GIT_NOT_FOUND"
  | "NOT_A_GIT_REPOSITORY"
  | "INVALID_REVISION"
  | "INVALID_PATH"
  | "FILE_NOT_FOUND_AT_REVISION"
  | "GIT_TIMEOUT"
  | "GIT_OUTPUT_LIMIT_EXCEEDED"
  | "BINARY_FILE_UNSUPPORTED"
  | "BLOB_SIZE_EXCEEDED"
  | "GIT_EXEC_ERROR";

export class GitError extends Error {
  readonly code: GitErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(message: string, code: GitErrorCode, details?: Record<string, unknown>) {
    super(message);
    this.name = "GitError";
    this.code = code;
    this.details = details;
  }
}

