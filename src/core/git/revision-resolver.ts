/**
 * Change Archaeologist - Repository Verification & Revision Resolver
 *
 * Verifies repository roots and resolves arbitrary revision specifiers
 * (tags, branch names, relative revs like HEAD~1, or short SHAs) into
 * verified 40-character commit hashes and metadata.
 */

import fs from "node:fs";
import path from "node:path";
import type { CommitInfo, RepositoryInfo, RevisionRole } from "../domain/types.js";
import { GitError } from "./errors.js";
import type { GitRunner } from "./git-runner.js";

const SAFE_REVISION_REGEX = /^[a-zA-Z0-9_.~^/@-]+$/;

/**
 * Validates that a revision string contains no dangerous flags or control characters.
 */
export function validateRevisionSpecifier(revision: string): void {
  if (typeof revision !== "string" || revision.trim() === "") {
    throw new GitError("Revision specifier cannot be empty", "INVALID_REVISION");
  }

  const trimmed = revision.trim();

  // Flag injection defense
  if (trimmed.startsWith("-")) {
    throw new GitError(
      `Revision specifier '${trimmed}' cannot start with a dash '-' to prevent option injection`,
      "INVALID_REVISION",
      { revision: trimmed }
    );
  }

  if (!SAFE_REVISION_REGEX.test(trimmed)) {
    throw new GitError(
      `Revision specifier '${trimmed}' contains invalid characters; must match ${SAFE_REVISION_REGEX}`,
      "INVALID_REVISION",
      { revision: trimmed }
    );
  }
}

/**
 * Confirms that a path is an existing, valid Git repository and returns metadata.
 */
export async function verifyRepository(
  runner: GitRunner,
  repoPath: string
): Promise<RepositoryInfo> {
  // 1. Verify directory exists on filesystem
  try {
    const stat = fs.statSync(repoPath);
    if (!stat.isDirectory()) {
      throw new GitError(
        `Path '${repoPath}' is not a directory`,
        "NOT_A_GIT_REPOSITORY",
        { repoPath }
      );
    }
  } catch (err) {
    if (err instanceof GitError) throw err;
    throw new GitError(
      `Repository directory '${repoPath}' does not exist or is inaccessible`,
      "NOT_A_GIT_REPOSITORY",
      { repoPath }
    );
  }

  // 2. Query Git to confirm it's a repository
  const revParseRes = await runner.exec(
    repoPath,
    ["rev-parse", "--show-toplevel"],
    { allowNonZero: true }
  );

  if (revParseRes.exitCode !== 0) {
    throw new GitError(
      `Directory '${repoPath}' is not a valid Git repository: ${revParseRes.stderr.trim()}`,
      "NOT_A_GIT_REPOSITORY",
      { repoPath }
    );
  }

  const rawRoot = revParseRes.stdout.trim();
  let rootPath = path.resolve(rawRoot).replace(/\\/g, "/");
  try {
    const realRoot = fs.realpathSync.native(rawRoot);
    rootPath = path.resolve(realRoot).replace(/\\/g, "/");
  } catch {
    // If realpath.native fails, fallback to resolved path
  }

  // 3. Query git version
  const versionRes = await runner.exec(rootPath, ["--version"]);
  const gitVersion = versionRes.stdout.trim();

  // 4. Check whether working tree is clean
  const statusRes = await runner.exec(rootPath, ["status", "--porcelain"]);
  const isCleanWorkingTreeAtStart = statusRes.stdout.trim() === "";

  return {
    rootPath,
    gitVersion,
    isCleanWorkingTreeAtStart,
  };
}

/**
 * Resolves an arbitrary revision specifier into verified 40-character commit metadata.
 */
export async function resolveCommit(
  runner: GitRunner,
  repoRoot: string,
  revisionInput: string,
  role: RevisionRole
): Promise<CommitInfo> {
  validateRevisionSpecifier(revisionInput);

  // Use rev-parse --verify --end-of-options <rev>^{commit} to ensure it resolves to a commit object
  const revParseRes = await runner.exec(
    repoRoot,
    ["rev-parse", "--verify", "--quiet", "--end-of-options", `${revisionInput.trim()}^{commit}`],
    { allowNonZero: true }
  );

  if (revParseRes.exitCode !== 0 || revParseRes.stdout.trim() === "") {
    throw new GitError(
      `Failed to resolve ${role} revision '${revisionInput}' to a valid Git commit`,
      "INVALID_REVISION",
      { revisionInput, role, stderr: revParseRes.stderr.trim() }
    );
  }

  const verifiedSha = revParseRes.stdout.trim();

  // Fetch commit metadata (SHA, short SHA, author, ISO date, subject) formatted with null-byte separators
  const showRes = await runner.exec(
    repoRoot,
    ["show", "-s", "--format=%H%x00%h%x00%an%x00%cI%x00%s", "--end-of-options", verifiedSha, "--"]
  );

  const parts = showRes.stdout.trim().split("\0");
  if (parts.length < 5) {
    throw new GitError(
      `Unexpected commit metadata format for ${verifiedSha}`,
      "GIT_EXEC_ERROR",
      { stdout: showRes.stdout }
    );
  }

  const [sha, shortSha, authorName, committedAtIso, ...subjectParts] = parts;
  const subject = subjectParts.join("\0");

  return {
    role,
    sha,
    shortSha,
    authorName,
    committedAtIso,
    subject,
  };
}
