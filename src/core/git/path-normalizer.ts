/**
 * Change Archaeologist - Repository Path Normalization & Security Boundary
 *
 * Enforces repository-relative path safety:
 * - Normalizes Windows backslashes to canonical POSIX forward slashes.
 * - Rejects path traversal attempts ('..').
 * - Rejects absolute paths, Windows drive paths ('C:\'), and UNC network paths.
 * - Rejects null bytes and empty paths.
 */

import path from "node:path";
import { GitError } from "./errors.js";

const WINDOWS_DRIVE_REGEX = /^[a-zA-Z]:[\\/]/;
const UNC_PATH_REGEX = /^\\\\[^\\]+/;

/**
 * Normalizes a user-supplied repository-relative path to a canonical POSIX path.
 *
 * @param rawPath Raw path string from user input or configuration.
 * @returns Canonical repository-relative POSIX path (e.g., "src/auth/token.ts").
 * @throws GitError with code "INVALID_PATH" if the path is unsafe or invalid.
 */
export function normalizeRepoRelativePath(rawPath: string): string {
  if (typeof rawPath !== "string") {
    throw new GitError("Path must be a string", "INVALID_PATH");
  }

  // 1. Check for null bytes
  if (rawPath.includes("\0")) {
    throw new GitError("Path cannot contain null bytes", "INVALID_PATH", { rawPath });
  }

  const trimmed = rawPath.trim();
  if (trimmed === "") {
    throw new GitError("Path cannot be empty", "INVALID_PATH");
  }

  // 2. Reject Windows drive letter paths (e.g., C:\foo or C:/foo)
  if (WINDOWS_DRIVE_REGEX.test(trimmed)) {
    throw new GitError(
      "Absolute paths with Windows drive letters are not allowed; path must be repository-relative",
      "INVALID_PATH",
      { rawPath: trimmed }
    );
  }

  // 3. Reject Windows UNC network paths (e.g., \\server\share)
  if (UNC_PATH_REGEX.test(trimmed)) {
    throw new GitError(
      "UNC network paths are not allowed; path must be repository-relative",
      "INVALID_PATH",
      { rawPath: trimmed }
    );
  }

  // 4. Reject leading slashes (POSIX absolute paths, e.g. /etc/passwd or \Windows)
  if (trimmed.startsWith("/") || trimmed.startsWith("\\") || path.isAbsolute(trimmed)) {
    throw new GitError(
      "Absolute paths are not allowed; path must be repository-relative",
      "INVALID_PATH",
      { rawPath: trimmed }
    );
  }

  // 5. Check for path traversal segments ('..')
  // Split on both forward slash and backslash
  const segments = trimmed.split(/[\\/]/);
  for (const seg of segments) {
    if (seg === "..") {
      throw new GitError(
        "Path traversal ('..') is strictly prohibited",
        "INVALID_PATH",
        { rawPath: trimmed }
      );
    }
  }

  // 6. Normalize separators to POSIX '/' and filter out redundant '.' or empty segments
  const cleanSegments = segments.filter((s) => s !== "" && s !== ".");

  if (cleanSegments.length === 0) {
    throw new GitError(
      "Normalized path resolved to an empty path",
      "INVALID_PATH",
      { rawPath: trimmed }
    );
  }

  return cleanSegments.join("/");
}

