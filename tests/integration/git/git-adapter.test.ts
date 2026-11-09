import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { GitAdapter, retrieveHistoricalSource } from "../../../src/core/git/git-adapter.js";
import { GitRunner } from "../../../src/core/git/git-runner.js";
import { GitError } from "../../../src/core/git/errors.js";
import { TempGitRepo } from "../../helpers/temp-git-repo.js";

describe("Git History Adapter Integration", () => {
  let repo: TempGitRepo;
  let commitASha: string;
  let commitBSha: string;

  const commitASource = `export function calculateTax(income: number): number {
  if (income <= 0) {
    return 0;
  }
  return income * 0.20;
}
`;

  const commitBSource = `export function calculateTax(income: number): number {
  if (income <= 0) {
    return 0;
  }
  return income * 0.25;
}
`;

  beforeEach(() => {
    repo = TempGitRepo.create();
    // Commit A: original function
    commitASha = repo.commitFile("src/calc.ts", commitASource, "Commit A: initial tax calculation");
    // Commit B: modified function
    commitBSha = repo.commitFile("src/calc.ts", commitBSource, "Commit B: increase tax rate to 25%");
  });

  afterEach(() => {
    repo.cleanup();
  });

  // 1. Successful retrieval from two valid revisions
  it("1. retrieves exact source content from two valid Git revisions (Commit A and Commit B)", async () => {
    const result = await retrieveHistoricalSource({
      repoPath: repo.dir,
      targetFilePath: "src/calc.ts",
      baseRevisionInput: "HEAD~1",
      headRevisionInput: "HEAD",
    });

    expect(result.repository.rootPath).toBe(fs.realpathSync.native(repo.dir).replace(/\\/g, "/"));
    expect(result.repository.isCleanWorkingTreeAtStart).toBe(true);

    // Verify Base Commit Info and Snapshot
    expect(result.baseCommit.role).toBe("BASE");
    expect(result.baseCommit.sha).toBe(commitASha);
    expect(result.baseCommit.subject).toBe("Commit A: initial tax calculation");
    expect(result.baseSnapshot).not.toBeNull();
    expect(result.baseSnapshot!.content).toBe(commitASource);
    expect(result.baseSnapshot!.posixFilePath).toBe("src/calc.ts");
    expect(result.baseSnapshot!.commitSha).toBe(commitASha);
    expect(result.baseSnapshot!.lineCount).toBe(7);

    // Verify Head Commit Info and Snapshot
    expect(result.headCommit.role).toBe("HEAD");
    expect(result.headCommit.sha).toBe(commitBSha);
    expect(result.headCommit.subject).toBe("Commit B: increase tax rate to 25%");
    expect(result.headSnapshot).not.toBeNull();
    expect(result.headSnapshot!.content).toBe(commitBSource);
    expect(result.headSnapshot!.posixFilePath).toBe("src/calc.ts");
    expect(result.headSnapshot!.commitSha).toBe(commitBSha);
    expect(result.headSnapshot!.lineCount).toBe(7);
  });

  // 2. An invalid revision
  it("2. rejects invalid or malicious revision specifiers with structured GitError", async () => {
    // Non-existent branch/revision
    await expect(
      retrieveHistoricalSource({
        repoPath: repo.dir,
        targetFilePath: "src/calc.ts",
        baseRevisionInput: "nonexistent-branch-404",
        headRevisionInput: "HEAD",
      })
    ).rejects.toThrowError(GitError);

    try {
      await retrieveHistoricalSource({
        repoPath: repo.dir,
        targetFilePath: "src/calc.ts",
        baseRevisionInput: "nonexistent-branch-404",
        headRevisionInput: "HEAD",
      });
    } catch (err) {
      expect(err).toBeInstanceOf(GitError);
      expect((err as GitError).code).toBe("INVALID_REVISION");
      expect((err as GitError).message).toContain("nonexistent-branch-404");
    }

    // Git option injection attempt (starts with dash)
    await expect(
      retrieveHistoricalSource({
        repoPath: repo.dir,
        targetFilePath: "src/calc.ts",
        baseRevisionInput: "--upload-pack=exploit",
        headRevisionInput: "HEAD",
      })
    ).rejects.toThrowError(GitError);

    try {
      await retrieveHistoricalSource({
        repoPath: repo.dir,
        targetFilePath: "src/calc.ts",
        baseRevisionInput: "--upload-pack=exploit",
        headRevisionInput: "HEAD",
      });
    } catch (err) {
      expect(err).toBeInstanceOf(GitError);
      expect((err as GitError).code).toBe("INVALID_REVISION");
      expect((err as GitError).message).toContain("cannot start with a dash");
    }
  });

  // 3. A file present in the base commit but missing from HEAD
  it("3. returns null for headSnapshot when file was present in base commit but deleted in HEAD", async () => {
    const deletedFileContent = "export function legacyHelper() { return 'deprecated'; }";
    const commitCSha = repo.commitFile("src/legacy.ts", deletedFileContent, "Add legacy helper");
    const commitDSha = repo.removeFileAndCommit("src/legacy.ts", "Remove legacy helper");

    const result = await retrieveHistoricalSource({
      repoPath: repo.dir,
      targetFilePath: "src/legacy.ts",
      baseRevisionInput: commitCSha,
      headRevisionInput: commitDSha,
    });

    expect(result.baseSnapshot).not.toBeNull();
    expect(result.baseSnapshot!.content).toBe(deletedFileContent);
    expect(result.headSnapshot).toBeNull(); // Cleanly reported as absent
  });

  // 4. A path traversal attempt
  it("4. rejects path traversal attempts with INVALID_PATH", async () => {
    const traversalPaths = [
      "../outside.ts",
      "src/../../secrets.ts",
      "..\\outside.ts",
      "foo/bar/../../../outside.ts",
    ];

    for (const badPath of traversalPaths) {
      await expect(
        retrieveHistoricalSource({
          repoPath: repo.dir,
          targetFilePath: badPath,
          baseRevisionInput: "HEAD~1",
          headRevisionInput: "HEAD",
        })
      ).rejects.toThrowError(GitError);

      try {
        await retrieveHistoricalSource({
          repoPath: repo.dir,
          targetFilePath: badPath,
          baseRevisionInput: "HEAD~1",
          headRevisionInput: "HEAD",
        });
      } catch (err) {
        expect(err).toBeInstanceOf(GitError);
        expect((err as GitError).code).toBe("INVALID_PATH");
        expect((err as GitError).message).toContain("Path traversal");
      }
    }
  });

  // 5. Absolute and Windows-style path attempts
  it("5. rejects absolute / drive paths and normalizes Windows backslash relative paths", async () => {
    // Absolute POSIX path
    await expect(
      retrieveHistoricalSource({
        repoPath: repo.dir,
        targetFilePath: "/src/calc.ts",
        baseRevisionInput: "HEAD~1",
        headRevisionInput: "HEAD",
      })
    ).rejects.toThrowError(GitError);

    // Windows drive-letter path
    await expect(
      retrieveHistoricalSource({
        repoPath: repo.dir,
        targetFilePath: "C:\\projects\\app\\src\\calc.ts",
        baseRevisionInput: "HEAD~1",
        headRevisionInput: "HEAD",
      })
    ).rejects.toThrowError(GitError);

    // Windows UNC network path
    await expect(
      retrieveHistoricalSource({
        repoPath: repo.dir,
        targetFilePath: "\\\\server\\share\\calc.ts",
        baseRevisionInput: "HEAD~1",
        headRevisionInput: "HEAD",
      })
    ).rejects.toThrowError(GitError);

    // Windows-style relative path with backslashes should normalize safely and SUCCEED
    const winRelResult = await retrieveHistoricalSource({
      repoPath: repo.dir,
      targetFilePath: "src\\calc.ts",
      baseRevisionInput: "HEAD~1",
      headRevisionInput: "HEAD",
    });

    expect(winRelResult.posixFilePath).toBe("src/calc.ts");
    expect(winRelResult.headSnapshot).not.toBeNull();
    expect(winRelResult.headSnapshot!.content).toBe(commitBSource);
  });

  // 6. A nonexistent repository
  it("6. rejects nonexistent repository paths with NOT_A_GIT_REPOSITORY", async () => {
    const fakeRepoPath = path.join(repo.dir, "nonexistent-subfolder-12345");

    await expect(
      retrieveHistoricalSource({
        repoPath: fakeRepoPath,
        targetFilePath: "src/calc.ts",
        baseRevisionInput: "HEAD~1",
        headRevisionInput: "HEAD",
      })
    ).rejects.toThrowError(GitError);

    try {
      await retrieveHistoricalSource({
        repoPath: fakeRepoPath,
        targetFilePath: "src/calc.ts",
        baseRevisionInput: "HEAD~1",
        headRevisionInput: "HEAD",
      });
    } catch (err) {
      expect(err).toBeInstanceOf(GitError);
      expect((err as GitError).code).toBe("NOT_A_GIT_REPOSITORY");
    }
  });

  // 7. A source file that is empty
  it("7. handles an empty source file cleanly without throwing errors", async () => {
    repo.commitFile("src/empty.ts", "", "Add empty file");

    const result = await retrieveHistoricalSource({
      repoPath: repo.dir,
      targetFilePath: "src/empty.ts",
      baseRevisionInput: "HEAD",
      headRevisionInput: "HEAD",
    });

    expect(result.headSnapshot).not.toBeNull();
    expect(result.headSnapshot!.content).toBe("");
    expect(result.headSnapshot!.byteLength).toBe(0);
    expect(result.headSnapshot!.lineCount).toBe(0);
  });

  // 8. Subprocess timeout or failure
  it("8. handles subprocess timeout gracefully with GIT_TIMEOUT", async () => {
    // Every call becomes git hash-object --stdin, which waits for stdin the runner
    // never closes, so the timeout always wins however fast the machine is.
    class HangingGitRunner extends GitRunner {
      override exec(cwd: string) {
        return super.exec(cwd, ["hash-object", "--stdin"]);
      }
    }

    await expect(
      retrieveHistoricalSource({
        repoPath: repo.dir,
        targetFilePath: "src/calc.ts",
        baseRevisionInput: "HEAD~1",
        headRevisionInput: "HEAD",
        runner: new HangingGitRunner({ defaultTimeoutMs: 100 }),
      })
    ).rejects.toMatchObject({
      name: "GitError",
      code: "GIT_TIMEOUT",
      message: expect.stringContaining("timed out"),
    });
  });

  // 9. Dirty working tree: returns committed source, not unsaved working-tree content
  it("9. returns exact committed source even when working tree has uncommitted dirty changes", async () => {
    const dirtyUnsavedContent = "export function calculateTax() { return 99999; } // UNCOMMITTED EDIT";
    // Write dirty changes directly to disk without committing
    repo.writeFile("src/calc.ts", dirtyUnsavedContent);

    const result = await retrieveHistoricalSource({
      repoPath: repo.dir,
      targetFilePath: "src/calc.ts",
      baseRevisionInput: "HEAD~1",
      headRevisionInput: "HEAD",
    });

    // Repository accurately detects dirty working tree at start
    expect(result.repository.isCleanWorkingTreeAtStart).toBe(false);

    // Snapshots MUST match the committed history, NEVER the dirty working-tree text!
    expect(result.baseSnapshot!.content).toBe(commitASource);
    expect(result.headSnapshot!.content).toBe(commitBSource);
    expect(result.headSnapshot!.content).not.toContain("99999");
    expect(result.headSnapshot!.content).not.toContain("UNCOMMITTED EDIT");
  });

  // 10. Repository non-modification: working tree, index, and references remain untouched
  it("10. guarantees repository non-modification (working tree, index, refs bit-for-bit identical)", async () => {
    function sha256File(filePath: string): string {
      const data = fs.readFileSync(filePath);
      return crypto.createHash("sha256").update(data).digest("hex");
    }

    const calcFile = path.join(repo.dir, "src/calc.ts");
    const gitHeadFile = path.join(repo.dir, ".git/HEAD");
    const gitIndexFile = path.join(repo.dir, ".git/index");

    // Capture state BEFORE adapter runs
    const beforeStatus = execFileSync("git", ["status", "--porcelain", "--ignored"], {
      cwd: repo.dir,
      encoding: "utf8",
    });
    const beforeHeadRef = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: repo.dir,
      encoding: "utf8",
    }).trim();

    const beforeCalcHash = sha256File(calcFile);
    const beforeCalcMtime = fs.statSync(calcFile).mtimeMs;

    const beforeGitHeadHash = sha256File(gitHeadFile);
    const beforeGitIndexHash = sha256File(gitIndexFile);

    // Execute historical source retrieval
    const result = await retrieveHistoricalSource({
      repoPath: repo.dir,
      targetFilePath: "src/calc.ts",
      baseRevisionInput: "HEAD~1",
      headRevisionInput: "HEAD",
    });

    expect(result.headSnapshot).not.toBeNull();

    // Capture state AFTER adapter runs
    const afterStatus = execFileSync("git", ["status", "--porcelain", "--ignored"], {
      cwd: repo.dir,
      encoding: "utf8",
    });
    const afterHeadRef = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: repo.dir,
      encoding: "utf8",
    }).trim();

    const afterCalcHash = sha256File(calcFile);
    const afterCalcMtime = fs.statSync(calcFile).mtimeMs;

    const afterGitHeadHash = sha256File(gitHeadFile);
    const afterGitIndexHash = sha256File(gitIndexFile);

    // Assert exact, bit-for-bit non-modification
    expect(afterStatus).toBe(beforeStatus);
    expect(afterHeadRef).toBe(beforeHeadRef);
    expect(afterCalcHash).toBe(beforeCalcHash);
    expect(afterCalcMtime).toBe(beforeCalcMtime);
    expect(afterGitHeadHash).toBe(beforeGitHeadHash);
    expect(afterGitIndexHash).toBe(beforeGitIndexHash);
  });
});
