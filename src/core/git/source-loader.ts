/**
 * Change Archaeologist - Historical Source Loader
 *
 * Retrieves the exact historical UTF-8 source content for a file at a verified
 * commit hash without touching the working tree or index.
 *
 * Enforces:
 * - Read-only retrieval via git show <sha>:<path>.
 * - Bounded resource limits (rejects blobs > 2 MB).
 * - Binary file rejection (checks for null bytes in initial chunk).
 * - Explicit null return when the target file does not exist at the requested revision.
 */

import { Buffer } from "node:buffer";
import type { CommitInfo, SourceSnapshot } from "../domain/types.js";
import { GitError } from "./errors.js";
import type { GitRunner } from "./git-runner.js";

const MAX_BLOB_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB limit per NFR-005
const BINARY_CHECK_BYTES = 8_000;

/**
 * Loads the historical SourceSnapshot of a file at a specific verified commit.
 *
 * @returns SourceSnapshot if the file exists at this revision; null if it does not exist.
 */
export async function loadHistoricalSourceSnapshot(
  runner: GitRunner,
  repoRoot: string,
  posixFilePath: string,
  commit: CommitInfo
): Promise<SourceSnapshot | null> {
  const gitObjectSpec = `${commit.sha}:${posixFilePath}`;

  // 1. Check if the object exists in this commit
  const existsRes = await runner.exec(
    repoRoot,
    ["cat-file", "-e", gitObjectSpec],
    { allowNonZero: true }
  );

  if (existsRes.exitCode !== 0) {
    // File was absent at this revision
    return null;
  }

  // 2. Verify object type is a blob
  const typeRes = await runner.exec(repoRoot, ["cat-file", "-t", gitObjectSpec]);
  const objType = typeRes.stdout.trim();
  if (objType !== "blob") {
    // Target is a tree or submodule, not a file
    return null;
  }

  // 3. Verify object size is within bounds
  const sizeRes = await runner.exec(repoRoot, ["cat-file", "-s", gitObjectSpec]);
  const byteLength = parseInt(sizeRes.stdout.trim(), 10);

  if (Number.isNaN(byteLength)) {
    throw new GitError(
      `Failed to determine blob size for ${gitObjectSpec}`,
      "GIT_EXEC_ERROR",
      { gitObjectSpec, stdout: sizeRes.stdout }
    );
  }

  if (byteLength > MAX_BLOB_SIZE_BYTES) {
    throw new GitError(
      `File '${posixFilePath}' at commit ${commit.shortSha} exceeds the 2 MB limit (${byteLength} bytes)`,
      "BLOB_SIZE_EXCEEDED",
      { posixFilePath, commitSha: commit.sha, byteLength, maxAllowed: MAX_BLOB_SIZE_BYTES }
    );
  }

  // Handle empty file
  if (byteLength === 0) {
    return {
      role: commit.role,
      commitSha: commit.sha,
      posixFilePath,
      content: "",
      byteLength: 0,
      lineCount: 0,
    };
  }

  // 4. Retrieve content with external diff/conversion helpers disabled
  const showRes = await runner.exec(
    repoRoot,
    ["show", "--no-ext-diff", "--no-textconv", gitObjectSpec]
  );
  const content = showRes.stdout;

  // 5. Binary file check (search for null byte in initial byte window)
  const probeChunk = content.slice(0, BINARY_CHECK_BYTES);
  if (probeChunk.includes("\0")) {
    throw new GitError(
      `File '${posixFilePath}' at commit ${commit.shortSha} appears to be binary and is not supported`,
      "BINARY_FILE_UNSUPPORTED",
      { posixFilePath, commitSha: commit.sha }
    );
  }

  const lineCount = content.length === 0 ? 0 : content.split(/\r\n|\r|\n/).length;

  return {
    role: commit.role,
    commitSha: commit.sha,
    posixFilePath,
    content,
    byteLength: Buffer.byteLength(content, "utf8"),
    lineCount,
  };
}

