/**
 * Integration Test Suite: Real-World Validation Corpus
 *
 * Executes the Change Archaeologist CLI against synthetic Git repositories
 * representing realistic code evolution scenarios (Scenarios A through L).
 *
 * Enforces:
 * - Deterministic outcome matching against predefined manifest
 * - Referential and runtime schema integrity
 * - Non-mutation of Git repository history, index, and working tree
 * - Epistemic constraints and forbidden causal overclaims
 */

import { describe, it, expect } from "vitest";
import { executeScenario } from "../../../validation/runner.js";
import { VALIDATION_MANIFEST } from "../../../validation/manifest.js";
import type { ValidationScenarioId } from "../../../validation/types.js";
import { TempGitRepo } from "../../helpers/temp-git-repo.js";
import { runCli } from "../../../src/cli/orchestrator.js";
import { ExitCode } from "../../../src/cli/types.js";
import path from "node:path";
import fs from "node:fs";

describe("Real-World Validation Corpus (Scenarios A through L)", () => {
  const scenarioIds: ValidationScenarioId[] = [
    "A",
    "B",
    "C",
    "D",
    "E",
    "F",
    "G",
    "H",
    "I",
    "J",
    "K",
    "L",
  ];

  for (const id of scenarioIds) {
    const scenario = VALIDATION_MANIFEST[id];

    it(
      `Scenario ${id}: ${scenario.title}`,
      async () => {
        const result = await executeScenario(id);

        if (!result.passed) {
          console.error(
            `Scenario ${id} Discrepancies:\n${result.discrepancies.map((d) => `  - ${d}`).join("\n")}`
          );
        }

        expect(result.exitCodeMatch, `Exit code match for Scenario ${id}`).toBe(true);
        expect(result.statusMatch, `Status match for Scenario ${id}`).toBe(true);
        expect(result.schemaValid, `Schema validity for Scenario ${id}`).toBe(true);
        expect(result.referentialIntegrityValid, `Referential integrity for Scenario ${id}`).toBe(true);
        expect(result.repositoryUnmodified, `Non-mutation check for Scenario ${id}`).toBe(true);
        expect(result.forbiddenClaimsRespected, `Forbidden claims check for Scenario ${id}`).toBe(true);
        expect(result.discrepancies).toEqual([]);
        expect(result.passed).toBe(true);
      },
      30000 // 30s timeout per scenario
    );
  }
});

describe("Validation Corpus Security & Non-Modification Checks", () => {
  it(
    "guarantees repository non-modification when working tree has uncommitted dirty changes",
    async () => {
      const repo = TempGitRepo.create();
      try {
        const fileContentA = `export function verify(val: string): boolean {
  if (!val) throw new Error("empty");
  return val.length > 0;
}`;
        const fileContentB = `export function verify(val: string): boolean {
  return val.length > 0;
}`;
        repo.writeFile("src/verify.ts", fileContentA);
        const baseSha = repo.commitAll("Base revision");

        repo.writeFile("src/verify.ts", fileContentB);
        const headSha = repo.commitAll("Head revision");

        // Introduce a dirty uncommitted file in the working tree
        const dirtyFile = "src/dirty-uncommitted.ts";
        const dirtyContent = "// Dirty uncommitted work in progress";
        repo.writeFile(dirtyFile, dirtyContent);

        // Also make an uncommitted edit to the target file
        const stagedContent = "// Dirty edit to target file";
        repo.writeFile("src/verify.ts", stagedContent);

        const preStatus = repo.runGit(["status", "--porcelain"]);
        expect(preStatus).toContain("dirty-uncommitted.ts");

        let stdoutText = "";
        let stderrText = "";
        const code = await runCli(
          [
            "--repo",
            repo.dir,
            "--file",
            "src/verify.ts",
            "--function",
            "verify",
            "--base",
            baseSha,
            "--head",
            headSha,
            "--format",
            "json",
          ],
          {
            stdout: (t) => {
              stdoutText += t;
            },
            stderr: (t) => {
              stderrText += t;
            },
            cwd: repo.dir,
          }
        );

        expect(code).toBe(ExitCode.SUCCESS);

        // Verify working tree state after CLI run is bit-for-bit unchanged
        const postStatus = repo.runGit(["status", "--porcelain"]);
        expect(postStatus).toBe(preStatus);

        const currentTargetContent = fs.readFileSync(path.join(repo.dir, "src/verify.ts"), "utf8");
        expect(currentTargetContent).toBe(stagedContent);

        const currentDirtyContent = fs.readFileSync(path.join(repo.dir, dirtyFile), "utf8");
        expect(currentDirtyContent).toBe(dirtyContent);

        // Verify the JSON report analyzed the COMMITTED versions (guard removed), not the dirty working tree
        const parsed = JSON.parse(stdoutText);
        expect(parsed.status).toBe("COMPLETED_WITH_FINDINGS");
        expect(parsed.structuralChanges.length).toBe(1);
        expect(parsed.structuralChanges[0].ruleId).toBe("RULE_GUARD_REMOVED");
      } finally {
        repo.cleanup();
      }
    },
    30000
  );

  it(
    "correctly processes Windows repository paths containing spaces",
    async () => {
      // Create a temporary repo in a directory path containing spaces
      const repo = TempGitRepo.create();
      try {
        const fileContentA = `export function greet(name: string): string {
  if (!name) return "Hello stranger";
  return \`Hello \${name}\`;
}`;
        const fileContentB = `export function greet(name: string): string {
  return \`Hello \${name}\`;
}`;
        repo.writeFile("src/sub folder/greet.ts", fileContentA);
        const baseSha = repo.commitAll("Base with guard in spaced folder");

        repo.writeFile("src/sub folder/greet.ts", fileContentB);
        const headSha = repo.commitAll("Head without guard in spaced folder");

        let stdoutText = "";
        let stderrText = "";
        const code = await runCli(
          [
            "--repo",
            repo.dir,
            "--file",
            "src/sub folder/greet.ts",
            "--function",
            "greet",
            "--base",
            baseSha,
            "--head",
            headSha,
            "--format",
            "json",
          ],
          {
            stdout: (t) => {
              stdoutText += t;
            },
            stderr: (t) => {
              stderrText += t;
            },
            cwd: repo.dir,
          }
        );

        expect(code).toBe(ExitCode.SUCCESS);
        const parsed = JSON.parse(stdoutText);
        expect(parsed.status).toBe("COMPLETED_WITH_FINDINGS");
        expect(parsed.structuralChanges.length).toBe(1);
        expect(parsed.structuralChanges[0].ruleId).toBe("RULE_GUARD_REMOVED");
      } finally {
        repo.cleanup();
      }
    },
    30000
  );

  it(
    "strictly prevents writing reports over protected repository source files or .git directory",
    async () => {
      const repo = TempGitRepo.create();
      try {
        repo.writeFile("src/index.ts", "export const x = 1;");
        const baseSha = repo.commitAll("Commit A");
        repo.writeFile("src/index.ts", "export const x = 2;");
        const headSha = repo.commitAll("Commit B");

        // Attempt to output report over the target source file itself
        let stderrText = "";
        const codeOverSource = await runCli(
          [
            "--repo",
            repo.dir,
            "--file",
            "src/index.ts",
            "--function",
            "index",
            "--base",
            baseSha,
            "--head",
            headSha,
            "--output",
            path.join(repo.dir, "src/index.ts"),
            "--force",
          ],
          {
            stderr: (t) => {
              stderrText += t;
            },
            cwd: repo.dir,
          }
        );

        expect(codeOverSource).toBe(ExitCode.OUTPUT_FAILURE);
        expect(stderrText).toContain("matches a protected source or test file");

        // Attempt to output report inside .git directory
        stderrText = "";
        const codeOverGit = await runCli(
          [
            "--repo",
            repo.dir,
            "--file",
            "src/index.ts",
            "--function",
            "index",
            "--base",
            baseSha,
            "--head",
            headSha,
            "--output",
            path.join(repo.dir, ".git/injected-report.md"),
          ],
          {
            stderr: (t) => {
              stderrText += t;
            },
            cwd: repo.dir,
          }
        );

        expect(codeOverGit).toBe(ExitCode.OUTPUT_FAILURE);
        expect(stderrText).toContain("resolves inside a '.git' directory");
      } finally {
        repo.cleanup();
      }
    },
    30000
  );
});
