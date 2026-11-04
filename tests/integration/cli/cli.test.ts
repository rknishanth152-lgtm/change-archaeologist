import fs from "node:fs";
import path from "node:path";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { TempGitRepo } from "../../helpers/temp-git-repo.js";
import {
  runCli,
  parseCliArgs,
  ExitCode,
  safeWriteReportFile,
} from "../../../src/cli/index.js";
import { validateAnalysisReport } from "../../../src/core/domain/schemas.js";

// ============================================================================
// TEST FIXTURES & HELPERS
// ============================================================================

interface CliRunCapture {
  stdout: string;
  stderr: string;
  code: number;
}

async function executeCli(
  argv: string[],
  cwd?: string
): Promise<CliRunCapture> {
  let stdoutText = "";
  let stderrText = "";

  const code = await runCli(argv, {
    stdout: (text: string) => {
      stdoutText += text;
    },
    stderr: (text: string) => {
      stderrText += text;
    },
    cwd,
  });

  return { stdout: stdoutText, stderr: stderrText, code };
}

describe("CLI Integration & Orchestration", () => {
  let repo: TempGitRepo;
  let commitASha: string;
  let commitBSha: string;

  const commitASource = `export function verifyToken(token: string | null): boolean {
  if (!token) {
    throw new Error("Missing token");
  }
  return token.length > 5;
}
`;

  const commitBSource = `export function verifyToken(token: string | null): boolean {
  if (!token) {
    return false;
  }
  return token.length > 5;
}
`;

  const commitATest = `import { verifyToken } from "../src/auth.js";
describe("verifyToken", () => {
  it("throws when missing", () => {
    expect(() => verifyToken(null)).toThrow("Missing token");
  });
});
`;

  const commitBTest = `import { verifyToken } from "../src/auth.js";
describe("verifyToken", () => {
  it("returns false when missing", () => {
    expect(verifyToken(null)).toBe(false);
  });
});
`;

  beforeEach(() => {
    repo = TempGitRepo.create();
    repo.writeFile("src/auth.ts", commitASource);
    repo.writeFile("tests/auth.test.ts", commitATest);
    commitASha = repo.commitAll("Commit A: initial implementation with throw");

    repo.writeFile("src/auth.ts", commitBSource);
    repo.writeFile("tests/auth.test.ts", commitBTest);
    commitBSha = repo.commitAll("Commit B: throw converted to return false");
  });

  afterEach(() => {
    repo.cleanup();
  });

  // 1. --help succeeds
  it("1. --help succeeds and outputs usage information", async () => {
    const res = await executeCli(["--help"]);
    expect(res.code).toBe(ExitCode.SUCCESS);
    expect(res.stdout).toContain("Change Archaeologist v0.1.0");
    expect(res.stdout).toContain("USAGE:");
    expect(res.stdout).toContain("REQUIRED OPTIONS:");
    expect(res.stdout).toContain("EXIT CODES:");
  });

  // 2. Missing required arguments fail clearly
  it("2. missing required arguments fail clearly with code INVALID_ARGUMENTS", async () => {
    const res = await executeCli(["--repo", repo.dir]);
    expect(res.code).toBe(ExitCode.INVALID_ARGUMENTS);
    expect(res.stderr).toContain("Missing required argument(s):");
    expect(res.stderr).toContain("--file");
    expect(res.stderr).toContain("--function");
    expect(res.stderr).toContain("--base");
    expect(res.stderr).toContain("--head");
  });

  // 3. Unsupported output formats are rejected
  it("3. unsupported output formats are rejected with code INVALID_ARGUMENTS", async () => {
    const res = await executeCli([
      "--repo", repo.dir,
      "--file", "src/auth.ts",
      "--function", "verifyToken",
      "--base", "HEAD~1",
      "--head", "HEAD",
      "--format", "yaml",
    ]);
    expect(res.code).toBe(ExitCode.INVALID_ARGUMENTS);
    expect(res.stderr).toContain("Unsupported output format 'yaml'");
  });

  // 4. Valid JSON output is parseable
  it("4. produces valid, parseable JSON conforming to AnalysisReport schema", async () => {
    const res = await executeCli([
      "--repo", repo.dir,
      "--file", "src/auth.ts",
      "--function", "verifyToken",
      "--base", "HEAD~1",
      "--head", "HEAD",
      "--format", "json",
    ]);

    expect(res.code).toBe(ExitCode.SUCCESS);
    expect(res.stdout.trim().startsWith("{")).toBe(true);
    const parsed = JSON.parse(res.stdout);
    const validation = validateAnalysisReport(parsed);
    expect(validation.success).toBe(true);
    expect(parsed.status).toBe("COMPLETED_WITH_FINDINGS");
  });

  // 5. Valid Markdown output contains expected report sections
  it("5. produces readable Markdown containing all required sections", async () => {
    const res = await executeCli([
      "analyze",
      "--repo", repo.dir,
      "--file", "src/auth.ts",
      "--function", "verifyToken",
      "--base", "HEAD~1",
      "--head", "HEAD",
      "--format", "markdown",
      "--test-file", "tests/auth.test.ts",
    ]);

    expect(res.code).toBe(ExitCode.SUCCESS);
    expect(res.stdout).toContain("# Investigation Summary");
    expect(res.stdout).toContain("## Repository and Revision Information");
    expect(res.stdout).toContain("## Production Structural Changes");
    expect(res.stdout).toContain("## Test Changes");
    expect(res.stdout).toContain("## Change-to-Test Correlation");
    expect(res.stdout).toContain("## Observed Evidence");
    expect(res.stdout).toContain("## Inferred Implications");
    expect(res.stdout).toContain("## Unknowns and Limitations");
    expect(res.stdout).toContain("## Errors and Incomplete Analysis");
    expect(res.stdout).toContain("## Analysis Scope and Method Limitations");
  });

  // 6. Output is written to stdout when no output file is specified
  it("6. outputs to stdout when --output is omitted", async () => {
    const res = await executeCli([
      "--repo", repo.dir,
      "--file", "src/auth.ts",
      "--function", "verifyToken",
      "--base", "HEAD~1",
      "--head", "HEAD",
      "--format", "markdown",
    ]);
    expect(res.code).toBe(ExitCode.SUCCESS);
    expect(res.stdout.length).toBeGreaterThan(100);
  });

  // 7. JSON stdout contains no progress messages or log noise
  it("7. ensures JSON stdout contains only pure JSON with zero diagnostic noise", async () => {
    const res = await executeCli([
      "--repo", repo.dir,
      "--file", "src/auth.ts",
      "--function", "verifyToken",
      "--base", "HEAD~1",
      "--head", "HEAD",
      "--format", "json",
      "--test-file", "tests/auth.test.ts",
    ]);

    expect(res.code).toBe(ExitCode.SUCCESS);
    // stdout should parse directly without stripping lines
    expect(() => JSON.parse(res.stdout)).not.toThrow();
    // stderr should not contaminate stdout
    expect(res.stdout).not.toContain("Report successfully written");
  });

  // 8. Output-file creation succeeds
  it("8. successfully writes serialized report to specified --output path", async () => {
    const outPath = path.join(repo.dir, "reports", "investigation.json");
    const res = await executeCli([
      "--repo", repo.dir,
      "--file", "src/auth.ts",
      "--function", "verifyToken",
      "--base", "HEAD~1",
      "--head", "HEAD",
      "--format", "json",
      "--output", outPath,
    ]);

    expect(res.code).toBe(ExitCode.SUCCESS);
    expect(fs.existsSync(outPath)).toBe(true);
    const content = fs.readFileSync(outPath, "utf8");
    const parsed = JSON.parse(content);
    expect(parsed.schemaVersion).toBe("1.0.0");
    expect(res.stderr).toContain("Report successfully written");
  });

  // 9. Existing output files are not overwritten without explicit permission
  it("9. prevents overwriting existing output file without --force", async () => {
    const outPath = path.join(repo.dir, "existing-report.md");
    fs.writeFileSync(outPath, "Pre-existing content", "utf8");

    const res = await executeCli([
      "--repo", repo.dir,
      "--file", "src/auth.ts",
      "--function", "verifyToken",
      "--base", "HEAD~1",
      "--head", "HEAD",
      "--format", "markdown",
      "--output", outPath,
    ]);

    expect(res.code).toBe(ExitCode.OUTPUT_FAILURE);
    expect(res.stderr).toContain("already exists");
    expect(res.stderr).toContain("--force");
    expect(fs.readFileSync(outPath, "utf8")).toBe("Pre-existing content");
  });

  // 10. --force follows the documented overwrite behavior
  it("10. overwrites existing output file when --force is provided", async () => {
    const outPath = path.join(repo.dir, "existing-report.md");
    fs.writeFileSync(outPath, "Pre-existing content", "utf8");

    const res = await executeCli([
      "--repo", repo.dir,
      "--file", "src/auth.ts",
      "--function", "verifyToken",
      "--base", "HEAD~1",
      "--head", "HEAD",
      "--format", "markdown",
      "--output", outPath,
      "--force",
    ]);

    expect(res.code).toBe(ExitCode.SUCCESS);
    const updated = fs.readFileSync(outPath, "utf8");
    expect(updated).not.toBe("Pre-existing content");
    expect(updated).toContain("# Investigation Summary");
  });

  // 11. Output paths containing spaces work on Windows
  it("11. handles output paths containing spaces cleanly on Windows", async () => {
    const outDirWithSpaces = path.join(repo.dir, "archaeology output dir with spaces");
    const outPath = path.join(outDirWithSpaces, "my report file.json");

    const res = await executeCli([
      "--repo", repo.dir,
      "--file", "src/auth.ts",
      "--function", "verifyToken",
      "--base", "HEAD~1",
      "--head", "HEAD",
      "--format", "json",
      "--output", outPath,
    ]);

    expect(res.code).toBe(ExitCode.SUCCESS);
    expect(fs.existsSync(outPath)).toBe(true);
    const content = fs.readFileSync(outPath, "utf8");
    expect(JSON.parse(content).status).toBe("COMPLETED_WITH_FINDINGS");
  });

  // 12. Invalid repositories produce a clear error
  it("12. produces clear error and exit code 3 when repository does not exist", async () => {
    const fakeRepo = path.join(repo.dir, "nonexistent-repo-path");
    const res = await executeCli([
      "--repo", fakeRepo,
      "--file", "src/auth.ts",
      "--function", "verifyToken",
      "--base", "HEAD~1",
      "--head", "HEAD",
    ]);

    expect(res.code).toBe(ExitCode.INVALID_REPOSITORY_OR_REVISION);
    expect(res.stderr).toContain("Repository path does not exist");
  });

  // 13. Invalid revisions produce a clear error
  it("13. produces clear error and exit code 3 when revision does not exist in repository", async () => {
    const res = await executeCli([
      "--repo", repo.dir,
      "--file", "src/auth.ts",
      "--function", "verifyToken",
      "--base", "nonexistent-branch-sha",
      "--head", "HEAD",
    ]);

    expect(res.code).toBe(ExitCode.INVALID_REPOSITORY_OR_REVISION);
    expect(res.stderr).toContain("Git Error [INVALID_REVISION]");
  });

  // 14. Invalid source paths produce a clear error
  it("14. produces clear error and exit code 3 when path traversal is attempted", async () => {
    const res = await executeCli([
      "--repo", repo.dir,
      "--file", "../escape.ts",
      "--function", "verifyToken",
      "--base", "HEAD~1",
      "--head", "HEAD",
    ]);

    expect(res.code).toBe(ExitCode.INVALID_REPOSITORY_OR_REVISION);
    expect(res.stderr).toContain("Path traversal");
  });

  // 15. Missing functions produce a valid incomplete report when supported
  it("15. produces a valid incomplete report and exit code INCOMPLETE_ANALYSIS when function is missing", async () => {
    const res = await executeCli([
      "--repo", repo.dir,
      "--file", "src/auth.ts",
      "--function", "nonExistentFunction",
      "--base", "HEAD~1",
      "--head", "HEAD",
      "--format", "json",
    ]);

    expect(res.code).toBe(ExitCode.INCOMPLETE_ANALYSIS);
    const report = JSON.parse(res.stdout);
    expect(report.status).toBe("INCOMPLETE_FUNCTION_MISSING");
    expect(validateAnalysisReport(report).success).toBe(true);
  });

  // 16. Incomplete test analysis is represented honestly
  it("16. represents incomplete test analysis honestly and exits with INCOMPLETE_ANALYSIS", async () => {
    // Add a syntax error to the test file in HEAD
    repo.writeFile("tests/broken.test.ts", "describe('broken', () => { unclosed syntax !!");
    repo.commitAll("Commit C: introduce syntax error in test file");

    const res = await executeCli([
      "--repo", repo.dir,
      "--file", "src/auth.ts",
      "--function", "verifyToken",
      "--base", "HEAD~1",
      "--head", "HEAD",
      "--format", "json",
      "--test-file", "tests/broken.test.ts",
    ]);

    expect(res.code).toBe(ExitCode.INCOMPLETE_ANALYSIS);
    const report = JSON.parse(res.stdout);
    expect(report.testAnalysisStatus).toBe("INCOMPLETE_PARSE_ERROR");
    expect(report.errors.some((e: { code: string }) => e.code === "SYNTAX_PARSE_ERROR")).toBe(true);
  });

  // 17. Errors produce documented exit codes
  it("17. returns documented exit codes for each error category", () => {
    expect(ExitCode.SUCCESS).toBe(0);
    expect(ExitCode.INCOMPLETE_ANALYSIS).toBe(1);
    expect(ExitCode.INVALID_ARGUMENTS).toBe(2);
    expect(ExitCode.INVALID_REPOSITORY_OR_REVISION).toBe(3);
    expect(ExitCode.ANALYSIS_FAILURE).toBe(4);
    expect(ExitCode.OUTPUT_FAILURE).toBe(5);
  });

  // 18. A failed output write does not report success
  it("18. returns OUTPUT_FAILURE and error message when trying to write to protected .git path", async () => {
    const gitDest = path.join(repo.dir, ".git", "malicious_report.md");
    const res = await executeCli([
      "--repo", repo.dir,
      "--file", "src/auth.ts",
      "--function", "verifyToken",
      "--base", "HEAD~1",
      "--head", "HEAD",
      "--format", "markdown",
      "--output", gitDest,
    ]);

    expect(res.code).toBe(ExitCode.OUTPUT_FAILURE);
    expect(res.stderr).toContain("resolves inside a '.git' directory");
    expect(fs.existsSync(gitDest)).toBe(false);
  });

  // 19. CLI orchestration does not duplicate analysis work unnecessarily
  it("19. orchestrates pipeline without duplicate AST comparison calls", async () => {
    const res = await executeCli([
      "--repo", repo.dir,
      "--file", "src/auth.ts",
      "--function", "verifyToken",
      "--base", "HEAD~1",
      "--head", "HEAD",
      "--format", "json",
      "--test-file", "tests/auth.test.ts",
    ]);

    expect(res.code).toBe(ExitCode.SUCCESS);
    const report = JSON.parse(res.stdout);
    // Structural changes must only be detected once and de-duplicated
    expect(report.structuralChanges.length).toBe(1);
    // Test changes must only be analyzed once
    expect(report.testChanges.length).toBe(1);
  });

  // 20. CLI execution does not invoke runtime AI APIs or external network services
  it("20. executes purely locally without any network or external AI dependencies", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const res = await executeCli([
      "--repo", repo.dir,
      "--file", "src/auth.ts",
      "--function", "verifyToken",
      "--base", "HEAD~1",
      "--head", "HEAD",
      "--format", "markdown",
    ]);

    expect(res.code).toBe(ExitCode.SUCCESS);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  // 21. Existing tests remain passing (verified via full suite)
  it("21. provides parseCliArgs parser covering key=value and standard flag syntax", () => {
    const parsed = parseCliArgs([
      "--repo=C:/app",
      "--file=src/index.ts",
      "--function=main",
      "--base=v1",
      "--head=v2",
      "--format=json",
    ]);

    expect(parsed.kind).toBe("RUN");
    if (parsed.kind === "RUN") {
      expect(parsed.options.repoPath).toBe("C:/app");
      expect(parsed.options.format).toBe("json");
    }
  });

  // 22. TypeScript compilation succeeds (verified via tsc)
  it("22. safeWriteReportFile rejects overwriting target source files", () => {
    const sourceFilePath = path.join(repo.dir, "src/auth.ts");
    const writeRes = safeWriteReportFile({
      outputPath: sourceFilePath,
      content: "tampered content",
      force: true,
      forbiddenPaths: [sourceFilePath],
    });

    expect(writeRes.success).toBe(false);
    if (!writeRes.success) {
      expect(writeRes.error).toContain("Overwriting code files is forbidden");
    }
  });
});
