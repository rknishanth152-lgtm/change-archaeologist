/**
/**
 * Change Archaeologist - Security & Resource Limits Integration Tests
 *
 * Validates bounded resource consumption and error handling:
 * 1. Source blob size limits (2 MB maximum).
 * 2. Git subprocess output buffer limits (maxBufferBytes).
 * 3. Git subprocess timeout enforcement.
 * 4. Malformed source code syntax resilience.
 * 5. Large collections of candidate test files.
 * 6. Unexpected Git subprocess failures.
 */

import { Buffer } from "node:buffer";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { GitAdapter, retrieveHistoricalSource } from "../../../src/core/git/git-adapter.js";
import { GitRunner } from "../../../src/core/git/git-runner.js";
import { GitError } from "../../../src/core/git/errors.js";
import { TempGitRepo } from "../../helpers/temp-git-repo.js";
import { runCli } from "../../../src/cli/orchestrator.js";
import { ExitCode } from "../../../src/cli/types.js";
import { HistoricalFunctionComparator } from "../../../src/core/comparison/historical-function-comparator.js";
import { TestAnalysisService } from "../../../src/core/test-analysis/test-analysis-service.js";

describe("Resource Limits & Hardening Integration", () => {
  let repo: TempGitRepo;

  beforeEach(() => {
    repo = TempGitRepo.create();
  });

  afterEach(() => {
    repo.cleanup();
  });

  // 1. Source blob exceeding 2 MB limit
  it("rejects source files exceeding the 2 MB limit with BLOB_SIZE_EXCEEDED", async () => {
    // Generate a file slightly exceeding 2 MB (2 * 1024 * 1024 + 1024 bytes)
    const largeSize = 2 * 1024 * 1024 + 1024;
    const padding = "/* pad */\n".repeat(largeSize / 10);
    const largeContent = `export function hugeFunction(): string {\n  return "ok";\n}\n${padding}`;

    repo.commitFile("src/huge.ts", largeContent, "Commit with huge file (>2MB)");

    // Direct adapter call must reject with BLOB_SIZE_EXCEEDED
    await expect(
      retrieveHistoricalSource({
        repoPath: repo.dir,
        targetFilePath: "src/huge.ts",
        baseRevisionInput: "HEAD",
        headRevisionInput: "HEAD",
      })
    ).rejects.toThrowError(GitError);

    try {
      await retrieveHistoricalSource({
        repoPath: repo.dir,
        targetFilePath: "src/huge.ts",
        baseRevisionInput: "HEAD",
        headRevisionInput: "HEAD",
      });
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(GitError);
      expect((err as GitError).code).toBe("BLOB_SIZE_EXCEEDED");
      expect((err as GitError).message).toContain("exceeds the 2 MB limit");
    }

    // CLI run must report clean failure code without crashing
    let stderrOutput = "";
    const exitCode = await runCli(
      [
        "--repo", repo.dir,
        "--file", "src/huge.ts",
        "--function", "hugeFunction",
        "--base", "HEAD",
        "--head", "HEAD",
      ],
      {
        stdout: () => {},
        stderr: (t) => { stderrOutput += t; },
        cwd: repo.dir,
      }
    );

    expect(exitCode).toBe(ExitCode.INVALID_REPOSITORY_OR_REVISION);
    expect(stderrOutput).toContain("BLOB_SIZE_EXCEEDED");
  });

  // 2. Git subprocess output buffer limit
  it("enforces git runner maxBuffer limits with GIT_OUTPUT_LIMIT_EXCEEDED", async () => {
    repo.commitFile("src/test.ts", "export function hello() { return 'world'; }", "Add test file");

    // Runner with a tiny 32-byte maxBuffer limit
    const constrainedRunner = new GitRunner({ defaultMaxBufferBytes: 32 });

    // Running a command whose output exceeds 32 bytes (like git log or show)
    await expect(
      constrainedRunner.exec(repo.dir, ["log", "-n", "1"])
    ).rejects.toThrowError(GitError);

    try {
      await constrainedRunner.exec(repo.dir, ["log", "-n", "1"]);
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(GitError);
      expect((err as GitError).code).toBe("GIT_OUTPUT_LIMIT_EXCEEDED");
      expect((err as GitError).message).toContain("exceeded buffer limit");
    }
  });

  // 3. Git subprocess timeout enforcement
  it("enforces git runner timeout limits with GIT_TIMEOUT", async () => {
    repo.commitFile("src/test.ts", "export function hello() { return 'world'; }", "Add test file");

    // git hash-object --stdin waits for stdin, which the runner never closes, so
    // this command cannot finish before the timeout, however fast the machine is.
    const timeoutRunner = new GitRunner({ defaultTimeoutMs: 100 });

    await expect(timeoutRunner.exec(repo.dir, ["hash-object", "--stdin"])).rejects.toMatchObject({
      name: "GitError",
      code: "GIT_TIMEOUT",
      message: expect.stringContaining("timed out"),
    });
  });

  // 4. Malformed source handling
  it("safely handles severely malformed syntax without unhandled exceptions", async () => {
    const validBase = `export function parseData(input: string): boolean {
  if (!input) return false;
  return true;
}`;
    const malformedHead = `export function parseData(input: string): boolean {
  if ((((( return ;;;;; const class enum {{{{
`;

    const baseSha = repo.commitFile("src/parse.ts", validBase, "Valid base");
    const headSha = repo.commitFile("src/parse.ts", malformedHead, "Malformed syntax in head");

    const comparator = new HistoricalFunctionComparator();
    const report = await comparator.compareHistoricalFunction({
      repoPath: repo.dir,
      targetFilePath: "src/parse.ts",
      targetFunctionName: "parseData",
      baseRevisionInput: baseSha,
      headRevisionInput: headSha,
    });

    // Should return structured incomplete report with parse error
    expect(report.status).toBe("INCOMPLETE_PARSE_ERROR");
    expect(report.errors.length).toBeGreaterThan(0);
    expect(report.errors.some((e) => e.code === "SYNTAX_PARSE_ERROR")).toBe(true);

    // CLI execution should return INCOMPLETE_ANALYSIS exit code
    let stdoutOutput = "";
    const exitCode = await runCli(
      [
        "--repo", repo.dir,
        "--file", "src/parse.ts",
        "--function", "parseData",
        "--base", baseSha,
        "--head", headSha,
        "--format", "json",
      ],
      {
        stdout: (t) => { stdoutOutput += t; },
        stderr: () => {},
        cwd: repo.dir,
      }
    );

    expect(exitCode).toBe(ExitCode.INCOMPLETE_ANALYSIS);
    const parsed = JSON.parse(stdoutOutput);
    expect(parsed.status).toBe("INCOMPLETE_PARSE_ERROR");
  });

  // 5. Large collections of candidate test files
  it(
    "deterministically processes large test file collections without unbounded memory",
    async () => {
      const baseCode = `export function calc(x: number) { return x * 2; }`;
      const headCode = `export function calc(x: number) { return x * 3; }`;

      const baseSha = repo.commitFile("src/calc.ts", baseCode, "Base calc");

      // Add 10 companion test files to exercise multi-file analysis
      const testFilePaths: string[] = [];
      for (let i = 1; i <= 10; i++) {
        const testPath = `tests/calc-${i}.test.ts`;
        testFilePaths.push(testPath);
        repo.writeFile(
          testPath,
          `import { calc } from "../src/calc.js";\ndescribe("test ${i}", () => { it("works", () => { expect(calc(2)).toBe(${i * 2}); }); });`
        );
      }
      repo.writeFile("src/calc.ts", headCode);
      const headSha = repo.commitAll("Head calc with 10 tests");

      const testService = new TestAnalysisService();
      const testReport = await testService.analyzeTestChanges({
        repoPath: repo.dir,
        baseRevisionInput: baseSha,
        headRevisionInput: headSha,
        testFilePaths,
        targetFilePath: "src/calc.ts",
        targetFunctionName: "calc",
      });

      expect(testReport.status).toBe("COMPLETED_WITH_CHANGES");
      // All 10 test files should be processed
      expect(testReport.testChanges.length).toBe(10);
      expect(testReport.errors).toEqual([]);
    },
    60000 // 60s timeout for multi-file Git operations
  );

  // 6. Unexpected Git subprocess failure
  it("wraps unexpected Git errors into structured GitError instances", async () => {
    const runner = new GitRunner();

    // Querying an invalid ref directly with cat-file
    await expect(
      runner.exec(repo.dir, ["cat-file", "-t", "deadbeef00000000000000000000000000000000"])
    ).rejects.toThrowError(GitError);

    try {
      await runner.exec(repo.dir, ["cat-file", "-t", "deadbeef00000000000000000000000000000000"]);
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(GitError);
      expect((err as GitError).code).toBe("GIT_EXEC_ERROR");
      expect((err as GitError).details).toBeDefined();
    }
  });
});

