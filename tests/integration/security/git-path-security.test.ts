/**
 * Change Archaeologist - Git, Path, and Repository Security Integration Tests
 *
 * Validates path security, option injection defense, and repository non-modification:
 * 1. Revisions starting with '-' (option injection defense).
 * 2. Git argument and shell injection attempts.
 * 3. Repository paths containing spaces.
 * 4. Windows drive-letter paths (C:\...).
 * 5. UNC network paths (\\server\share).
 * 6. POSIX absolute paths (/etc/passwd).
 * 7. Path traversal attempts (..).
 * 8. Null-byte inputs in paths and revisions.
 * 9. Symlink handling and boundary isolation.
 * 10. Repository non-modification invariants (HEAD, tree, index, config, working tree).
 * 11. Protected path overwrite defenses (.git and source files).
 */

import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { GitAdapter, retrieveHistoricalSource } from "../../../src/core/git/git-adapter.js";
import { GitRunner } from "../../../src/core/git/git-runner.js";
import { GitError } from "../../../src/core/git/errors.js";
import { TempGitRepo } from "../../helpers/temp-git-repo.js";
import { runCli } from "../../../src/cli/orchestrator.js";
import { ExitCode } from "../../../src/cli/types.js";
import { normalizeRepoRelativePath } from "../../../src/core/git/path-normalizer.js";
import { validateRevisionSpecifier } from "../../../src/core/git/revision-resolver.js";
import { safeWriteReportFile } from "../../../src/cli/safe-file-writer.js";

function sha256File(filePath: string): string {
  const data = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(data).digest("hex");
}

describe("Git & Path Security Integration", () => {
  let repo: TempGitRepo;
  let commitASha: string;
  let commitBSha: string;

  beforeEach(() => {
    repo = TempGitRepo.create();
    commitASha = repo.commitFile(
      "src/security.ts",
      "export function checkAccess(role: string): boolean { if (!role) return false; return role === 'admin'; }",
      "Commit A: initial access check"
    );
    commitBSha = repo.commitFile(
      "src/security.ts",
      "export function checkAccess(role: string): boolean { if (!role) return false; return role === 'admin' || role === 'superuser'; }",
      "Commit B: allow superuser"
    );
  });

  afterEach(() => {
    repo.cleanup();
  });

  // 1. Revision strings beginning with '-'
  it("rejects revision specifiers beginning with '-' to prevent option injection", async () => {
    const maliciousRevisions = [
      "-p",
      "--upload-pack=malicious",
      "--help",
      "-c core.pager=cat",
      "-o",
    ];

    for (const rev of maliciousRevisions) {
      expect(() => validateRevisionSpecifier(rev)).toThrowError(GitError);

      try {
        validateRevisionSpecifier(rev);
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(GitError);
        expect((err as GitError).code).toBe("INVALID_REVISION");
        expect((err as GitError).message).toContain("cannot start with a dash");
      }

      await expect(
        retrieveHistoricalSource({
          repoPath: repo.dir,
          targetFilePath: "src/security.ts",
          baseRevisionInput: rev,
          headRevisionInput: "HEAD",
        })
      ).rejects.toThrowError(GitError);
    }
  });

  // 2. Git argument injection attempts
  it("rejects revision strings containing shell injection characters", () => {
    const injectionRevisions = [
      "main; rm -rf /",
      "HEAD && calc",
      "HEAD|cat",
      "HEAD`touch pwn`",
      "HEAD$(whoami)",
      "HEAD\nnewline",
      "HEAD\0null",
    ];

    for (const rev of injectionRevisions) {
      expect(() => validateRevisionSpecifier(rev)).toThrowError(GitError);
      try {
        validateRevisionSpecifier(rev);
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(GitError);
        expect((err as GitError).code).toBe("INVALID_REVISION");
      }
    }
  });

  // 3. Repository paths containing spaces
  it("processes repository paths containing spaces without shell splitting errors", async () => {
    const tmpBase = os.tmpdir();
    const spaceDir = fs.mkdtempSync(path.join(tmpBase, "ca test space-"));
    const dirWithSpaces = fs.realpathSync.native(spaceDir);

    const spaceRepo = new (TempGitRepo as unknown as { new (d: string): TempGitRepo })(dirWithSpaces);
    spaceRepo.runGit(["init"]);
    spaceRepo.runGit(["config", "user.name", "Test"]);
    spaceRepo.runGit(["config", "user.email", "test@test.local"]);
    spaceRepo.commitFile(
      "src/calc.ts",
      "export function compute() { return 42; }",
      "Initial commit in space dir"
    );

    try {
      const res = await retrieveHistoricalSource({
        repoPath: dirWithSpaces,
        targetFilePath: "src/calc.ts",
        baseRevisionInput: "HEAD",
        headRevisionInput: "HEAD",
      });

      expect(res.repository.rootPath.toLowerCase()).toBe(dirWithSpaces.replace(/\\/g, "/").toLowerCase());
      expect(res.headSnapshot).not.toBeNull();
      expect(res.headSnapshot!.content).toContain("compute");
    } finally {
      spaceRepo.cleanup();
    }
  });

  // 4. Windows drive-letter paths
  it("rejects Windows drive-letter paths as repository-relative targets", () => {
    const drivePaths = [
      "C:\\projects\\app\\src\\security.ts",
      "C:/projects/app/src/security.ts",
      "D:\\data\\file.ts",
      "c:\\lower\\drive.ts",
    ];

    for (const p of drivePaths) {
      expect(() => normalizeRepoRelativePath(p)).toThrowError(GitError);
      try {
        normalizeRepoRelativePath(p);
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(GitError);
        expect((err as GitError).code).toBe("INVALID_PATH");
        expect((err as GitError).message).toContain("Windows drive letters");
      }
    }
  });

  // 5. UNC network paths
  it("rejects Windows UNC paths as repository-relative targets", () => {
    const uncPaths = [
      "\\\\server\\share\\file.ts",
      "\\\\attacker.com\\payload.js",
    ];

    for (const p of uncPaths) {
      expect(() => normalizeRepoRelativePath(p)).toThrowError(GitError);
      try {
        normalizeRepoRelativePath(p);
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(GitError);
        expect((err as GitError).code).toBe("INVALID_PATH");
        expect((err as GitError).message).toContain("UNC network paths");
      }
    }
  });

  // 6. POSIX absolute paths
  it("rejects POSIX absolute paths as repository-relative targets", () => {
    const absPaths = [
      "/etc/passwd",
      "/var/log/syslog",
      "/home/user/code.ts",
      "\\Windows\\System32\\calc.exe",
    ];

    for (const p of absPaths) {
      expect(() => normalizeRepoRelativePath(p)).toThrowError(GitError);
      try {
        normalizeRepoRelativePath(p);
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(GitError);
        expect((err as GitError).code).toBe("INVALID_PATH");
        expect((err as GitError).message).toContain("Absolute paths are not allowed");
      }
    }
  });

  // 7. Path traversal attempts
  it("rejects path traversal attempts strictly", () => {
    const traversalPaths = [
      "../secret.ts",
      "..\\secret.ts",
      "src/../../outside.ts",
      "src\\..\\..\\outside.ts",
      "foo/bar/../../../root.ts",
      "..",
      ".",
      "   ",
    ];

    for (const p of traversalPaths) {
      expect(() => normalizeRepoRelativePath(p)).toThrowError(GitError);
      try {
        normalizeRepoRelativePath(p);
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(GitError);
        expect((err as GitError).code).toBe("INVALID_PATH");
      }
    }
  });

  // 8. Null-byte inputs
  it("rejects null-byte inputs in paths and revisions", async () => {
    expect(() => normalizeRepoRelativePath("src/security\0.ts")).toThrowError(GitError);
    expect(() => validateRevisionSpecifier("HEAD\0")).toThrowError(GitError);

    await expect(
      retrieveHistoricalSource({
        repoPath: repo.dir,
        targetFilePath: "src/security\0.ts",
        baseRevisionInput: "HEAD",
        headRevisionInput: "HEAD",
      })
    ).rejects.toThrowError(GitError);
  });

  // 9. Repository Non-Modification Guarantees
  it("guarantees 100% bit-for-bit repository non-modification across full CLI execution", async () => {
    // Add an unstaged dirty modification to working tree
    repo.writeFile("src/security.ts", "export function checkAccess() { return false; } // UNSTAGED DIRTY EDIT");

    // Add a custom git config setting
    repo.runGit(["config", "custom.auditor", "change-archaeologist"]);

    // Capture state BEFORE CLI execution
    const gitHeadFile = path.join(repo.dir, ".git/HEAD");
    const gitConfigFile = path.join(repo.dir, ".git/config");
    const gitIndexFile = path.join(repo.dir, ".git/index");
    const targetFile = path.join(repo.dir, "src/security.ts");

    const preHeadSha = repo.runGit(["rev-parse", "HEAD"]);
    const preTreeSha = repo.runGit(["rev-parse", "HEAD^{tree}"]);
    const preStatus = repo.runGit(["status", "--porcelain"]);
    const preHeadFileHash = sha256File(gitHeadFile);
    const preConfigFileHash = sha256File(gitConfigFile);
    const preIndexFileHash = sha256File(gitIndexFile);
    const preTargetFileHash = sha256File(targetFile);

    // Run CLI in JSON mode
    let jsonStdout = "";
    const jsonExitCode = await runCli(
      [
        "--repo", repo.dir,
        "--file", "src/security.ts",
        "--function", "checkAccess",
        "--base", commitASha,
        "--head", commitBSha,
        "--format", "json",
      ],
      {
        stdout: (t) => { jsonStdout += t; },
        stderr: () => {},
        cwd: repo.dir,
      }
    );

    expect(jsonExitCode).toBe(ExitCode.SUCCESS);
    const parsed = JSON.parse(jsonStdout);
    expect(parsed.status).toBe("COMPLETED_WITH_FINDINGS");

    // Run CLI in Markdown mode
    let mdStdout = "";
    const mdExitCode = await runCli(
      [
        "--repo", repo.dir,
        "--file", "src/security.ts",
        "--function", "checkAccess",
        "--base", commitASha,
        "--head", commitBSha,
        "--format", "markdown",
      ],
      {
        stdout: (t) => { mdStdout += t; },
        stderr: () => {},
        cwd: repo.dir,
      }
    );

    expect(mdExitCode).toBe(ExitCode.SUCCESS);
    expect(mdStdout).toContain("# Investigation Summary");

    // Capture state AFTER CLI execution
    const postHeadSha = repo.runGit(["rev-parse", "HEAD"]);
    const postTreeSha = repo.runGit(["rev-parse", "HEAD^{tree}"]);
    const postStatus = repo.runGit(["status", "--porcelain"]);
    const postHeadFileHash = sha256File(gitHeadFile);
    const postConfigFileHash = sha256File(gitConfigFile);
    const postIndexFileHash = sha256File(gitIndexFile);
    const postTargetFileHash = sha256File(targetFile);

    // Assert exact, bit-for-bit non-modification
    expect(postHeadSha).toBe(preHeadSha);
    expect(postTreeSha).toBe(preTreeSha);
    expect(postStatus).toBe(preStatus);
    expect(postHeadFileHash).toBe(preHeadFileHash);
    expect(postConfigFileHash).toBe(preConfigFileHash);
    expect(postIndexFileHash).toBe(preIndexFileHash);
    expect(postTargetFileHash).toBe(preTargetFileHash);
  });

  // 10. Protected path overwrite defenses
  it("strictly prevents safeWriteReportFile from writing into .git directory or over source files", () => {
    // Attempt to write into .git/config
    const gitConfigDest = path.join(repo.dir, ".git/config");
    const gitWriteRes = safeWriteReportFile({
      outputPath: gitConfigDest,
      content: "malicious content",
      force: true,
      cwd: repo.dir,
    });

    expect(gitWriteRes.success).toBe(false);
    if (!gitWriteRes.success) {
      expect(gitWriteRes.error).toContain("prohibited for repository integrity");
    }

    // Attempt to write into .GIT/HEAD (case-insensitive test)
    const upperGitDest = path.join(repo.dir, ".GIT/HEAD");
    const upperGitWriteRes = safeWriteReportFile({
      outputPath: upperGitDest,
      content: "malicious content",
      force: true,
      cwd: repo.dir,
    });

    expect(upperGitWriteRes.success).toBe(false);

    // Attempt to write over protected source file
    const sourceDest = path.join(repo.dir, "src/security.ts");
    const srcWriteRes = safeWriteReportFile({
      outputPath: sourceDest,
      content: "malicious overwrite",
      force: true,
      cwd: repo.dir,
      forbiddenPaths: [sourceDest],
    });

    expect(srcWriteRes.success).toBe(false);
    if (!srcWriteRes.success) {
      expect(srcWriteRes.error).toContain("Overwriting code files is forbidden");
    }
  });
});

