/**
 * Integration Test Suite: Historical AST Function Comparison
 *
 * Validates the core orchestrator (HistoricalFunctionComparator) across 14 required cases:
 *  1. Guard clause removed between two commits.
 *  2. Conditional operator changed between revisions (&& -> ||).
 *  3. Throw changed to return (throw-to-return conversion).
 *  4. Functions with identical structure (COMPLETED_NO_STRUCTURAL_CHANGES, 0 findings).
 *  5. Missing function in base revision (INCOMPLETE_FUNCTION_MISSING).
 *  6. Missing function in head revision (INCOMPLETE_FUNCTION_MISSING).
 *  7. Absent file at either revision (INCOMPLETE_FILE_MISSING_IN_ONE_REVISION).
 *  8. Invalid syntax in one revision (INCOMPLETE_PARSE_ERROR).
 *  9. Duplicate or ambiguous function names (INCOMPLETE_AMBIGUOUS_TARGET).
 * 10. Deterministic results for identical inputs.
 * 11. Duplicate finding suppression (guard removal subsumes return/throw exit).
 * 12. Preservation of source evidence and epistemic uncertainty.
 * 13. Dirty working tree differs from committed snapshots (committed source is used).
 * 14. Propagation of Git adapter failure (structured GitError).
 */

import fs from "node:fs";
import path from "node:path";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  HistoricalFunctionComparator,
  compareHistoricalFunction,
} from "../../../src/core/comparison/index.js";
import { GitError } from "../../../src/core/git/errors.js";
import { assertValidAnalysisReport } from "../../../src/core/domain/schemas.js";
import type { AnalysisRequest, AnalysisReport } from "../../../src/core/domain/types.js";
import { TempGitRepo } from "../../helpers/temp-git-repo.js";

describe("Historical AST Function Comparison Integration", () => {
  let repo: TempGitRepo;

  beforeEach(() => {
    repo = TempGitRepo.create();
  });

  afterEach(() => {
    repo.cleanup();
  });

  // --------------------------------------------------------------------------
  // 1. Guard clause removed between two commits
  // --------------------------------------------------------------------------
  it("1. detects a guard clause removed between two commits", async () => {
    const baseSource = `export function processUser(user: { id: string; active: boolean }): string {
  if (!user.active) {
    return "inactive";
  }
  return user.id;
}
`;
    const headSource = `export function processUser(user: { id: string; active: boolean }): string {
  return user.id;
}
`;

    const baseSha = repo.commitFile("src/user.ts", baseSource, "Commit A: with guard");
    const headSha = repo.commitFile("src/user.ts", headSource, "Commit B: guard removed");

    const request: AnalysisRequest = {
      repoPath: repo.dir,
      targetFilePath: "src/user.ts",
      targetFunctionName: "processUser",
      baseRevisionInput: "HEAD~1",
      headRevisionInput: "HEAD",
    };

    const report = await compareHistoricalFunction(request);

    assertValidAnalysisReport(report);
    expect(report.status).toBe("COMPLETED_WITH_FINDINGS");
    expect(report.baseCommit.sha).toBe(baseSha);
    expect(report.headCommit.sha).toBe(headSha);
    expect(report.findings).toHaveLength(1);

    const finding = report.findings[0];
    expect(finding.inferred[0].ruleId).toBe("RULE_GUARD_REMOVED");
    expect(finding.observed[0].statement.toLowerCase()).toContain("guard clause");
    expect(finding.unknown[0].statement).toBeDefined();

    expect(report.structuralChanges).toHaveLength(1);
    expect(report.structuralChanges[0].changeType).toBe("REMOVED");
    expect(report.structuralChanges[0].ruleId).toBe("RULE_GUARD_REMOVED");
    expect(report.structuralChanges[0].beforeSpan).not.toBeNull();
    expect(report.structuralChanges[0].afterSpan).toBeNull();
    expect(report.structuralChanges[0].beforeSnippet).toContain("if (!user.active)");
  });

  // --------------------------------------------------------------------------
  // 2. Conditional operator changed between revisions (&& -> ||)
  // --------------------------------------------------------------------------
  it("2. detects conditional operator changes (&& to ||) between revisions", async () => {
    const baseSource = `export function checkAccess(role: string, isSuper: boolean): boolean {
  if (role === "admin" && isSuper) {
    return true;
  }
  return false;
}
`;
    const headSource = `export function checkAccess(role: string, isSuper: boolean): boolean {
  if (role === "admin" || isSuper) {
    return true;
  }
  return false;
}
`;

    repo.commitFile("src/auth.ts", baseSource, "Commit A: && condition");
    repo.commitFile("src/auth.ts", headSource, "Commit B: || condition");

    const request: AnalysisRequest = {
      repoPath: repo.dir,
      targetFilePath: "src/auth.ts",
      targetFunctionName: "checkAccess",
      baseRevisionInput: "HEAD~1",
      headRevisionInput: "HEAD",
    };

    const report = await compareHistoricalFunction(request);

    assertValidAnalysisReport(report);
    expect(report.status).toBe("COMPLETED_WITH_FINDINGS");
    expect(report.findings).toHaveLength(1);

    const finding = report.findings[0];
    expect(finding.inferred[0].ruleId).toBe("RULE_CONDITIONAL_MODIFIED");
    expect(finding.observed[0].statement).toContain("role === \"admin\" && isSuper");
    expect(finding.observed[0].statement).toContain("role === \"admin\" || isSuper");

    expect(report.structuralChanges).toHaveLength(1);
    expect(report.structuralChanges[0].changeType).toBe("MODIFIED");
    expect(report.structuralChanges[0].ruleId).toBe("RULE_CONDITIONAL_MODIFIED");
    expect(report.structuralChanges[0].beforeSnippet).toContain('role === "admin" && isSuper');
    expect(report.structuralChanges[0].afterSnippet).toContain('role === "admin" || isSuper');
  });

  // --------------------------------------------------------------------------
  // 3. Throw changed to return (throw-to-return conversion)
  // --------------------------------------------------------------------------
  it("3. detects throw changed to return (throw-to-return conversion)", async () => {
    const baseSource = `export function authenticate(token: string | null): string {
  if (!token) {
    throw new Error("Missing token");
  }
  return token;
}
`;
    const headSource = `export function authenticate(token: string | null): string {
  if (!token) {
    return "guest";
  }
  return token;
}
`;

    repo.commitFile("src/token.ts", baseSource, "Commit A: throws on null");
    repo.commitFile("src/token.ts", headSource, "Commit B: returns guest on null");

    const request: AnalysisRequest = {
      repoPath: repo.dir,
      targetFilePath: "src/token.ts",
      targetFunctionName: "authenticate",
      baseRevisionInput: "HEAD~1",
      headRevisionInput: "HEAD",
    };

    const report = await compareHistoricalFunction(request);

    assertValidAnalysisReport(report);
    expect(report.status).toBe("COMPLETED_WITH_FINDINGS");
    expect(report.findings).toHaveLength(1);

    const finding = report.findings[0];
    expect(finding.inferred[0].ruleId).toBe("RULE_THROW_TO_RETURN_CONVERSION");
    expect(finding.observed[0].statement).toContain("throw");
    expect(finding.observed[0].statement).toContain("return");

    expect(report.structuralChanges).toHaveLength(1);
    expect(report.structuralChanges[0].changeType).toBe("MODIFIED");
    expect(report.structuralChanges[0].ruleId).toBe("RULE_THROW_TO_RETURN_CONVERSION");
  });

  // --------------------------------------------------------------------------
  // 4. Functions with identical structure (COMPLETED_NO_STRUCTURAL_CHANGES)
  // --------------------------------------------------------------------------
  it("4. returns COMPLETED_NO_STRUCTURAL_CHANGES when functions have identical AST structure", async () => {
    const baseSource = `export function calculateDiscount(price: number): number {
  // Check threshold
  if (price > 100) {
    return (price * 0.1);
  }
  return 0;
}
`;
    // Head has changed comments, extra whitespace, and removed redundant parens
    const headSource = `export function calculateDiscount(price: number): number {
  /* Comment changed and formatting difference */
  if (price > 100) {

    return price * 0.1;
  }
  return 0;
}
`;

    repo.commitFile("src/discount.ts", baseSource, "Commit A: initial discount");
    repo.commitFile("src/discount.ts", headSource, "Commit B: reformatted discount");

    const request: AnalysisRequest = {
      repoPath: repo.dir,
      targetFilePath: "src/discount.ts",
      targetFunctionName: "calculateDiscount",
      baseRevisionInput: "HEAD~1",
      headRevisionInput: "HEAD",
    };

    const report = await compareHistoricalFunction(request);

    assertValidAnalysisReport(report);
    expect(report.status).toBe("COMPLETED_NO_STRUCTURAL_CHANGES");
    expect(report.findings).toHaveLength(0);
    expect(report.structuralChanges).toHaveLength(0);
    expect(report.evidence).toHaveLength(0);
    expect(report.baseFunction).not.toBeNull();
    expect(report.headFunction).not.toBeNull();
    expect(report.limitations[0]).toContain("identical AST structure");
  });

  // --------------------------------------------------------------------------
  // 5. Missing function in base revision (INCOMPLETE_FUNCTION_MISSING)
  // --------------------------------------------------------------------------
  it("5. handles missing function in base revision with INCOMPLETE_FUNCTION_MISSING", async () => {
    const baseSource = `export function existingHelper(): string {
  return "ready";
}
`;
    const headSource = `export function existingHelper(): string {
  return "ready";
}

export function newFeature(): string {
  return "introduced in head";
}
`;

    repo.commitFile("src/features.ts", baseSource, "Commit A: helper only");
    repo.commitFile("src/features.ts", headSource, "Commit B: add newFeature");

    const request: AnalysisRequest = {
      repoPath: repo.dir,
      targetFilePath: "src/features.ts",
      targetFunctionName: "newFeature",
      baseRevisionInput: "HEAD~1",
      headRevisionInput: "HEAD",
    };

    const report = await compareHistoricalFunction(request);

    assertValidAnalysisReport(report);
    expect(report.status).toBe("INCOMPLETE_FUNCTION_MISSING");
    expect(report.baseFunction).toBeNull();
    expect(report.headFunction).not.toBeNull();
    expect(report.findings).toHaveLength(1);
    expect(report.findings[0].category).toBe("LINEAGE_LIMITATION");
    expect(report.limitations[0]).toContain("Target function 'newFeature' was not found in BASE revision.");
  });

  // --------------------------------------------------------------------------
  // 6. Missing function in head revision (INCOMPLETE_FUNCTION_MISSING)
  // --------------------------------------------------------------------------
  it("6. handles missing function in head revision with INCOMPLETE_FUNCTION_MISSING", async () => {
    const baseSource = `export function legacyCleanup(): void {
  console.log("cleanup");
}
`;
    const headSource = `export function modernCleanup(): void {
  console.log("modern");
}
`;

    repo.commitFile("src/cleanup.ts", baseSource, "Commit A: legacy cleanup");
    repo.commitFile("src/cleanup.ts", headSource, "Commit B: modern cleanup");

    const request: AnalysisRequest = {
      repoPath: repo.dir,
      targetFilePath: "src/cleanup.ts",
      targetFunctionName: "legacyCleanup",
      baseRevisionInput: "HEAD~1",
      headRevisionInput: "HEAD",
    };

    const report = await compareHistoricalFunction(request);

    assertValidAnalysisReport(report);
    expect(report.status).toBe("INCOMPLETE_FUNCTION_MISSING");
    expect(report.baseFunction).not.toBeNull();
    expect(report.headFunction).toBeNull();
    expect(report.findings).toHaveLength(1);
    expect(report.findings[0].category).toBe("LINEAGE_LIMITATION");
    expect(report.limitations[0]).toContain("Target function 'legacyCleanup' was not found in HEAD revision.");
  });

  // --------------------------------------------------------------------------
  // 7. Absent file at either revision (INCOMPLETE_FILE_MISSING_IN_ONE_REVISION)
  // --------------------------------------------------------------------------
  it("7. handles absent file at either revision explicitly", async () => {
    const initialSource = `export function tempWorker(): void {}
`;
    repo.commitFile("src/worker.ts", initialSource, "Commit A: add worker");
    repo.removeFileAndCommit("src/worker.ts", "Commit B: remove worker");

    const request: AnalysisRequest = {
      repoPath: repo.dir,
      targetFilePath: "src/worker.ts",
      targetFunctionName: "tempWorker",
      baseRevisionInput: "HEAD~1",
      headRevisionInput: "HEAD",
    };

    const report = await compareHistoricalFunction(request);

    assertValidAnalysisReport(report);
    expect(report.status).toBe("INCOMPLETE_FILE_MISSING_IN_ONE_REVISION");
    expect(report.baseFunction).toBeNull();
    expect(report.headFunction).toBeNull();
    expect(report.findings).toHaveLength(1);
    expect(report.findings[0].category).toBe("LINEAGE_LIMITATION");
    expect(report.limitations[0]).toContain("Target file 'src/worker.ts' was absent in HEAD revision");
  });

  // --------------------------------------------------------------------------
  // 8. Invalid syntax in one revision (INCOMPLETE_PARSE_ERROR)
  // --------------------------------------------------------------------------
  it("8. handles invalid syntax in one revision with structured error records", async () => {
    const baseSource = `export function computeValue(x: number): number {
  return x * 2;
}
`;
    const headSource = `export function computeValue(x: number): number {
  if (x > { // unparseable syntax error
  return x * 2;
}
`;

    repo.commitFile("src/syntax.ts", baseSource, "Commit A: valid TS");
    repo.commitFile("src/syntax.ts", headSource, "Commit B: syntax error");

    const request: AnalysisRequest = {
      repoPath: repo.dir,
      targetFilePath: "src/syntax.ts",
      targetFunctionName: "computeValue",
      baseRevisionInput: "HEAD~1",
      headRevisionInput: "HEAD",
    };

    const report = await compareHistoricalFunction(request);

    assertValidAnalysisReport(report);
    expect(report.status).toBe("INCOMPLETE_PARSE_ERROR");
    expect(report.errors.length).toBeGreaterThan(0);
    expect(report.errors[0].code).toBe("SYNTAX_PARSE_ERROR");
    expect(report.errors[0].recoverable).toBe(false);
    expect(report.limitations[0]).toContain("syntax parse errors");
  });

  // --------------------------------------------------------------------------
  // 9. Duplicate or ambiguous function names (INCOMPLETE_AMBIGUOUS_TARGET)
  // --------------------------------------------------------------------------
  it("9. detects ambiguous function names and halts without arbitrary selection", async () => {
    const sourceWithAmbiguityBase = `export class CommandA {
  execute(): number {
    return 1;
  }
}

export class CommandB {
  execute(): number {
    return 2;
  }
}
`;
    const sourceWithAmbiguityHead = `// Head revision retains ambiguous classes
export class CommandA {
  execute(): number {
    return 1;
  }
}

export class CommandB {
  execute(): number {
    return 2;
  }
}
`;

    repo.commitFile("src/commands.ts", sourceWithAmbiguityBase, "Commit A: ambiguous execute");
    repo.commitFile("src/commands.ts", sourceWithAmbiguityHead, "Commit B: same ambiguous execute with comment");

    const request: AnalysisRequest = {
      repoPath: repo.dir,
      targetFilePath: "src/commands.ts",
      targetFunctionName: "execute",
      baseRevisionInput: "HEAD~1",
      headRevisionInput: "HEAD",
    };

    const report = await compareHistoricalFunction(request);

    assertValidAnalysisReport(report);
    expect(report.status).toBe("INCOMPLETE_AMBIGUOUS_TARGET");
    expect(report.findings).toHaveLength(1);
    expect(report.findings[0].category).toBe("LINEAGE_LIMITATION");
    expect(report.findings[0].observed[0].statement).toContain("matched 2 candidate implementations");
    expect(report.limitations[0]).toContain("found 2 candidates");

    // Verify qualified name disambiguates successfully
    const qualifiedRequest: AnalysisRequest = {
      ...request,
      targetFunctionName: "CommandA.execute",
    };
    const qualifiedReport = await compareHistoricalFunction(qualifiedRequest);
    expect(qualifiedReport.status).toBe("COMPLETED_NO_STRUCTURAL_CHANGES");
  }, 20000);

  // --------------------------------------------------------------------------
  // 10. Deterministic results for identical inputs
  // --------------------------------------------------------------------------
  it("10. produces 100% deterministic results for identical inputs across invocations", async () => {
    const baseSource = `export function validateEmail(email: string): boolean {
  if (!email.includes("@")) {
    return false;
  }
  return true;
}
`;
    const headSource = `export function validateEmail(email: string): boolean {
  return email.includes("@");
}
`;

    repo.commitFile("src/email.ts", baseSource, "Commit A: guard validation");
    repo.commitFile("src/email.ts", headSource, "Commit B: inline return");

    const request: AnalysisRequest = {
      repoPath: repo.dir,
      targetFilePath: "src/email.ts",
      targetFunctionName: "validateEmail",
      baseRevisionInput: "HEAD~1",
      headRevisionInput: "HEAD",
    };

    const report1 = await compareHistoricalFunction(request);
    const report2 = await compareHistoricalFunction(request);

    // Verify identical findings structure, observations, inferences, evidence, and changes
    expect(report1.status).toBe(report2.status);
    expect(report1.findings).toEqual(report2.findings);
    expect(report1.structuralChanges).toEqual(report2.structuralChanges);
    expect(report1.evidence).toEqual(report2.evidence);
    expect(report1.limitations).toEqual(report2.limitations);
    expect(report1.errors).toEqual(report2.errors);
  }, 20000);

  // --------------------------------------------------------------------------
  // 11. Duplicate finding suppression (guard removal subsumes return exit)
  // --------------------------------------------------------------------------
  it("11. suppresses duplicate findings (guard removal subsumes return exit)", async () => {
    const baseSource = `export function getItem(map: Map<string, string>, key: string): string {
  if (!map.has(key)) {
    return "UNKNOWN";
  }
  return map.get(key)!;
}
`;
    const headSource = `export function getItem(map: Map<string, string>, key: string): string {
  return map.get(key)!;
}
`;

    repo.commitFile("src/map.ts", baseSource, "Commit A: guard with return");
    repo.commitFile("src/map.ts", headSource, "Commit B: remove guard");

    const request: AnalysisRequest = {
      repoPath: repo.dir,
      targetFilePath: "src/map.ts",
      targetFunctionName: "getItem",
      baseRevisionInput: "HEAD~1",
      headRevisionInput: "HEAD",
    };

    const report = await compareHistoricalFunction(request);

    assertValidAnalysisReport(report);
    expect(report.status).toBe("COMPLETED_WITH_FINDINGS");

    // Exactly one finding emitted: RULE_GUARD_REMOVED.
    // The return statement inside the removed guard must NOT emit a secondary finding.
    expect(report.findings).toHaveLength(1);
    expect(report.findings[0].inferred[0].ruleId).toBe("RULE_GUARD_REMOVED");

    // Exactly one structural change: GUARD_CLAUSE_REMOVED rule with REMOVED type.
    expect(report.structuralChanges).toHaveLength(1);
    expect(report.structuralChanges[0].changeType).toBe("REMOVED");
    expect(report.structuralChanges[0].ruleId).toBe("RULE_GUARD_REMOVED");
  });

  // --------------------------------------------------------------------------
  // 12. Preservation of source evidence and epistemic uncertainty
  // --------------------------------------------------------------------------
  it("12. preserves source evidence, spans, and explicit uncertainty without overclaiming", async () => {
    const baseSource = `export function queryData(query: string): string[] {
  if (query.length === 0) {
    return [];
  }
  return [query];
}
`;
    const headSource = `export function queryData(query: string): string[] {
  if (query.length < 3) {
    return [];
  }
  return [query];
}
`;

    repo.commitFile("src/query.ts", baseSource, "Commit A: length === 0");
    repo.commitFile("src/query.ts", headSource, "Commit B: length < 3");

    const request: AnalysisRequest = {
      repoPath: repo.dir,
      targetFilePath: "src/query.ts",
      targetFunctionName: "queryData",
      baseRevisionInput: "HEAD~1",
      headRevisionInput: "HEAD",
    };

    const report = await compareHistoricalFunction(request);

    assertValidAnalysisReport(report);
    expect(report.findings.length).toBeGreaterThan(0);

    for (const finding of report.findings) {
      // 1. Observed facts must link to evidence
      expect(finding.observed.length).toBeGreaterThan(0);
      for (const obs of finding.observed) {
        expect(obs.evidenceIds.length).toBeGreaterThan(0);
        for (const evId of obs.evidenceIds) {
          const ev = report.evidence.find((e) => e.id === evId);
          expect(ev).toBeDefined();
        }
      }

      // 2. Inferences must link to observations
      expect(finding.inferred.length).toBeGreaterThan(0);
      for (const inf of finding.inferred) {
        expect(inf.supportingObservationIds.length).toBeGreaterThan(0);
        for (const obsId of inf.supportingObservationIds) {
          const obs = finding.observed.find((o) => o.id === obsId);
          expect(obs).toBeDefined();
        }
      }

      // 3. Epistemic uncertainty must be stated
      expect(finding.unknown.length).toBeGreaterThan(0);
      for (const unk of finding.unknown) {
        expect(unk.statement).not.toMatch(/\b(proves a regression|guarantees a bug)\b/i);
      }
    }
  });

  // --------------------------------------------------------------------------
  // 13. Dirty working tree differs from committed snapshots
  // --------------------------------------------------------------------------
  it("13. reads committed source and ignores dirty uncommitted working tree modifications", async () => {
    const baseSource = `export function calculateTax(income: number): number {
  if (income <= 0) {
    return 0;
  }
  return income * 0.20;
}
`;
    const headSource = `export function calculateTax(income: number): number {
  return income * 0.20;
}
`;

    repo.commitFile("src/tax.ts", baseSource, "Commit A: with tax guard");
    repo.commitFile("src/tax.ts", headSource, "Commit B: guard removed");

    // Now dirty the working tree file with uncommitted broken content
    const dirtyWorkingTreeContent = `// DIRTY UNCOMMITTED CONTENT THAT WOULD BREAK AST PARSING
export function calculateTax(broken { syntax error!
`;
    const diskPath = path.join(repo.dir, "src/tax.ts");
    fs.writeFileSync(diskPath, dirtyWorkingTreeContent, "utf8");

    const request: AnalysisRequest = {
      repoPath: repo.dir,
      targetFilePath: "src/tax.ts",
      targetFunctionName: "calculateTax",
      baseRevisionInput: "HEAD~1",
      headRevisionInput: "HEAD",
    };

    // The comparison must read Git committed blobs, NOT the dirty working tree!
    const report = await compareHistoricalFunction(request);

    assertValidAnalysisReport(report);
    expect(report.status).toBe("COMPLETED_WITH_FINDINGS");
    expect(report.findings).toHaveLength(1);
    expect(report.findings[0].inferred[0].ruleId).toBe("RULE_GUARD_REMOVED");

    // Working tree file must remain intact
    expect(fs.readFileSync(diskPath, "utf8")).toBe(dirtyWorkingTreeContent);
  });

  // --------------------------------------------------------------------------
  // 14. Propagation of Git adapter failure (structured GitError)
  // --------------------------------------------------------------------------
  it("14. propagates structured GitError when revision is invalid and never misrepresents as unchanged", async () => {
    const initialSource = `export function testFn(): void {}
`;
    repo.commitFile("src/test.ts", initialSource, "Commit A");

    const request: AnalysisRequest = {
      repoPath: repo.dir,
      targetFilePath: "src/test.ts",
      targetFunctionName: "testFn",
      baseRevisionInput: "HEAD~999", // Nonexistent revision
      headRevisionInput: "HEAD",
    };

    let caughtError: unknown = null;
    try {
      await compareHistoricalFunction(request);
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).toBeInstanceOf(GitError);
    const gitErr = caughtError as GitError;
    expect(gitErr.code).toBe("INVALID_REVISION");
  });
});
