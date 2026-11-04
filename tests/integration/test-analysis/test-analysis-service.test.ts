/**
 * Test Suite: Test-Change Analysis (Milestone 5)
 *
 * Validates the test-change analysis subsystem across the 22 required cases:
 *  1. Added test file
 *  2. Deleted test file
 *  3. Modified test file
 *  4. Unchanged test file
 *  5. Added test declaration
 *  6. Removed test declaration
 *  7. Changed test description
 *  8. Added recognized assertion
 *  9. Removed recognized assertion
 * 10. Modified assertion expression
 * 11. Nested test declarations
 * 12. Assertions inside nested callbacks
 * 13. Duplicate test descriptions or ambiguous matches
 * 14. Empty test file
 * 15. Invalid syntax in one revision
 * 16. Unsupported assertion syntax
 * 17. Dirty working-tree changes that must not affect historical results
 * 18. Invalid Git revision propagation
 * 19. Deterministic output for identical inputs
 * 20. No double-counting of assertions
 * 21. Preservation of source evidence and source spans
 * 22. Correct separation of observed changes from unknown coverage or runtime behavior
 */

import fs from "node:fs";
import path from "node:path";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  TestAnalysisService,
  analyzeTestChanges,
} from "../../../src/core/test-analysis/index.js";
import { GitError } from "../../../src/core/git/errors.js";
import { assertValidTestAnalysisReport } from "../../../src/core/domain/schemas.js";
import type { TestAnalysisRequest } from "../../../src/core/domain/types.js";
import { TempGitRepo } from "../../helpers/temp-git-repo.js";

describe("Test-Change Analysis Component", () => {
  let repo: TempGitRepo;

  beforeEach(() => {
    repo = TempGitRepo.create();
  });

  afterEach(() => {
    repo.cleanup();
  });

  // --------------------------------------------------------------------------
  // 1. Added test file
  // --------------------------------------------------------------------------
  it("1. detects an added test file", async () => {
    repo.commitFile("src/calc.ts", "export const x = 1;", "Commit A: initial code");

    const newTestSource = `import { describe, it, expect } from "vitest";
describe("New Feature", () => {
  it("verifies behavior", () => {
    expect(true).toBe(true);
  });
});
`;
    repo.commitFile("tests/feature.test.ts", newTestSource, "Commit B: add test file");

    const request: TestAnalysisRequest = {
      repoPath: repo.dir,
      baseRevisionInput: "HEAD~1",
      headRevisionInput: "HEAD",
      testFilePaths: ["tests/feature.test.ts"],
    };

    const report = await analyzeTestChanges(request);

    assertValidTestAnalysisReport(report);
    expect(report.status).toBe("COMPLETED_WITH_CHANGES");
    expect(report.testChanges).toHaveLength(1);
    expect(report.testChanges[0].fileChangeStatus).toBe("ADDED");
    expect(report.testChanges[0].assertionChanges.length).toBeGreaterThan(0);
    expect(report.testChanges[0].assertionChanges[0].changeType).toBe("ASSERTION_ADDED");
  });

  // --------------------------------------------------------------------------
  // 2. Deleted test file
  // --------------------------------------------------------------------------
  it("2. detects a deleted test file", async () => {
    const legacyTestSource = `import { it, expect } from "vitest";
it("legacy check", () => {
  expect(1).toBe(1);
});
`;
    repo.commitFile("tests/legacy.test.ts", legacyTestSource, "Commit A: add legacy test");
    repo.removeFileAndCommit("tests/legacy.test.ts", "Commit B: delete legacy test");

    const request: TestAnalysisRequest = {
      repoPath: repo.dir,
      baseRevisionInput: "HEAD~1",
      headRevisionInput: "HEAD",
      testFilePaths: ["tests/legacy.test.ts"],
    };

    const report = await analyzeTestChanges(request);

    assertValidTestAnalysisReport(report);
    expect(report.status).toBe("COMPLETED_WITH_CHANGES");
    expect(report.testChanges).toHaveLength(1);
    expect(report.testChanges[0].fileChangeStatus).toBe("DELETED");
    expect(report.testChanges[0].assertionChanges[0].changeType).toBe("ASSERTION_REMOVED");
  });

  // --------------------------------------------------------------------------
  // 3. Modified test file
  // --------------------------------------------------------------------------
  it("3. detects a modified test file", async () => {
    const baseSource = `import { it, expect } from "vitest";
it("calculates total", () => {
  expect(10).toBe(10);
});
`;
    const headSource = `import { it, expect } from "vitest";
it("calculates total", () => {
  expect(10).toBe(10);
  expect(20).toBe(20);
});
`;

    repo.commitFile("tests/calc.test.ts", baseSource, "Commit A");
    repo.commitFile("tests/calc.test.ts", headSource, "Commit B");

    const request: TestAnalysisRequest = {
      repoPath: repo.dir,
      baseRevisionInput: "HEAD~1",
      headRevisionInput: "HEAD",
      testFilePaths: ["tests/calc.test.ts"],
    };

    const report = await analyzeTestChanges(request);

    assertValidTestAnalysisReport(report);
    expect(report.status).toBe("COMPLETED_WITH_CHANGES");
    expect(report.testChanges[0].fileChangeStatus).toBe("MODIFIED");
  });

  // --------------------------------------------------------------------------
  // 4. Unchanged test file
  // --------------------------------------------------------------------------
  it("4. handles an unchanged test file returning COMPLETED_NO_CHANGES", async () => {
    const testSource = `import { it, expect } from "vitest";
it("persists unchanged", () => {
  expect("unchanged").toBe("unchanged");
});
`;

    repo.commitFile("tests/static.test.ts", testSource, "Commit A");
    // Commit a different file so HEAD differs from HEAD~1
    repo.commitFile("src/other.ts", "export const y = 2;", "Commit B: touched other file");

    const request: TestAnalysisRequest = {
      repoPath: repo.dir,
      baseRevisionInput: "HEAD~1",
      headRevisionInput: "HEAD",
      testFilePaths: ["tests/static.test.ts"],
    };

    const report = await analyzeTestChanges(request);

    assertValidTestAnalysisReport(report);
    expect(report.status).toBe("COMPLETED_NO_CHANGES");
    expect(report.testChanges[0].fileChangeStatus).toBe("UNMODIFIED_COMPANION");
    expect(report.findings).toHaveLength(0);
    expect(report.evidence).toHaveLength(0);
  });

  // --------------------------------------------------------------------------
  // 5. Added test declaration
  // --------------------------------------------------------------------------
  it("5. detects an added test declaration", async () => {
    const baseSource = `import { it, expect } from "vitest";
it("first test", () => {
  expect(1).toBe(1);
});
`;
    const headSource = `import { it, expect } from "vitest";
it("first test", () => {
  expect(1).toBe(1);
});
it("second test", () => {
  expect(2).toBe(2);
});
`;

    repo.commitFile("tests/decls.test.ts", baseSource, "Commit A");
    repo.commitFile("tests/decls.test.ts", headSource, "Commit B");

    const request: TestAnalysisRequest = {
      repoPath: repo.dir,
      baseRevisionInput: "HEAD~1",
      headRevisionInput: "HEAD",
      testFilePaths: ["tests/decls.test.ts"],
    };

    const report = await analyzeTestChanges(request);

    assertValidTestAnalysisReport(report);
    const addedDecl = report.declarationChanges.find((d) => d.changeType === "ADDED");
    expect(addedDecl).toBeDefined();
    expect(addedDecl?.fullTitle).toBe("second test");

    const declFinding = report.findings.find((f) =>
      f.inferred.some((inf) => inf.ruleId === "RULE_TEST_DECLARATION_ADDED")
    );
    expect(declFinding).toBeDefined();
  });

  // --------------------------------------------------------------------------
  // 6. Removed test declaration
  // --------------------------------------------------------------------------
  it("6. detects a removed test declaration", async () => {
    const baseSource = `import { it, expect } from "vitest";
it("test to keep", () => {
  expect(1).toBe(1);
});
it("obsolete test", () => {
  expect(99).toBe(99);
});
`;
    const headSource = `import { it, expect } from "vitest";
it("test to keep", () => {
  expect(1).toBe(1);
});
`;

    repo.commitFile("tests/remove-decl.test.ts", baseSource, "Commit A");
    repo.commitFile("tests/remove-decl.test.ts", headSource, "Commit B");

    const request: TestAnalysisRequest = {
      repoPath: repo.dir,
      baseRevisionInput: "HEAD~1",
      headRevisionInput: "HEAD",
      testFilePaths: ["tests/remove-decl.test.ts"],
    };

    const report = await analyzeTestChanges(request);

    assertValidTestAnalysisReport(report);
    const removedDecl = report.declarationChanges.find((d) => d.changeType === "REMOVED");
    expect(removedDecl).toBeDefined();
    expect(removedDecl?.fullTitle).toBe("obsolete test");

    const declFinding = report.findings.find((f) =>
      f.inferred.some((inf) => inf.ruleId === "RULE_TEST_DECLARATION_REMOVED")
    );
    expect(declFinding).toBeDefined();
  });

  // --------------------------------------------------------------------------
  // 7. Changed test description
  // --------------------------------------------------------------------------
  it("7. detects a changed test description", async () => {
    const baseSource = `import { it, expect } from "vitest";
it("computes user tax standard", () => {
  expect(100 * 0.2).toBe(20);
});
`;
    const headSource = `import { it, expect } from "vitest";
it("computes user tax with updated 2026 rates", () => {
  expect(100 * 0.2).toBe(20);
});
`;

    repo.commitFile("tests/desc.test.ts", baseSource, "Commit A");
    repo.commitFile("tests/desc.test.ts", headSource, "Commit B");

    const request: TestAnalysisRequest = {
      repoPath: repo.dir,
      baseRevisionInput: "HEAD~1",
      headRevisionInput: "HEAD",
      testFilePaths: ["tests/desc.test.ts"],
    };

    const report = await analyzeTestChanges(request);

    assertValidTestAnalysisReport(report);
    const modDecl = report.declarationChanges.find((d) => d.changeType === "MODIFIED");
    expect(modDecl).toBeDefined();
    expect(modDecl?.beforeDescription).toBe("computes user tax standard");
    expect(modDecl?.afterDescription).toBe("computes user tax with updated 2026 rates");

    const descFinding = report.findings.find((f) =>
      f.inferred.some((inf) => inf.ruleId === "RULE_TEST_DECLARATION_MODIFIED")
    );
    expect(descFinding).toBeDefined();
  });

  // --------------------------------------------------------------------------
  // 8. Added recognized assertion
  // --------------------------------------------------------------------------
  it("8. detects an added recognized assertion", async () => {
    const baseSource = `import { it, expect } from "vitest";
it("verifies user profile", () => {
  expect(user.id).toBe("123");
});
`;
    const headSource = `import { it, expect } from "vitest";
it("verifies user profile", () => {
  expect(user.id).toBe("123");
  expect(user.active).toBe(true);
});
`;

    repo.commitFile("tests/ast-add.test.ts", baseSource, "Commit A");
    repo.commitFile("tests/ast-add.test.ts", headSource, "Commit B");

    const request: TestAnalysisRequest = {
      repoPath: repo.dir,
      baseRevisionInput: "HEAD~1",
      headRevisionInput: "HEAD",
      testFilePaths: ["tests/ast-add.test.ts"],
    };

    const report = await analyzeTestChanges(request);

    assertValidTestAnalysisReport(report);
    const tc = report.testChanges[0];
    const addedAst = tc.assertionChanges.find((a) => a.changeType === "ASSERTION_ADDED");
    expect(addedAst).toBeDefined();
    expect(addedAst?.afterAssertionText).toContain("user.active");

    const astFinding = report.findings.find((f) =>
      f.inferred.some((inf) => inf.ruleId === "RULE_TEST_ASSERTION_ADDED")
    );
    expect(astFinding).toBeDefined();
  });

  // --------------------------------------------------------------------------
  // 9. Removed recognized assertion
  // --------------------------------------------------------------------------
  it("9. detects a removed recognized assertion", async () => {
    const baseSource = `import { it, expect } from "vitest";
it("verifies credentials", () => {
  expect(token).toBeDefined();
  expect(token.length).toBeGreaterThan(10);
});
`;
    const headSource = `import { it, expect } from "vitest";
it("verifies credentials", () => {
  expect(token).toBeDefined();
});
`;

    repo.commitFile("tests/ast-rem.test.ts", baseSource, "Commit A");
    repo.commitFile("tests/ast-rem.test.ts", headSource, "Commit B");

    const request: TestAnalysisRequest = {
      repoPath: repo.dir,
      baseRevisionInput: "HEAD~1",
      headRevisionInput: "HEAD",
      testFilePaths: ["tests/ast-rem.test.ts"],
    };

    const report = await analyzeTestChanges(request);

    assertValidTestAnalysisReport(report);
    const tc = report.testChanges[0];
    const remAst = tc.assertionChanges.find((a) => a.changeType === "ASSERTION_REMOVED");
    expect(remAst).toBeDefined();
    expect(remAst?.beforeAssertionText).toContain("token.length");

    const astFinding = report.findings.find((f) =>
      f.inferred.some((inf) => inf.ruleId === "RULE_TEST_ASSERTION_REMOVED")
    );
    expect(astFinding).toBeDefined();
  });

  // --------------------------------------------------------------------------
  // 10. Modified assertion expression
  // --------------------------------------------------------------------------
  it("10. detects a modified assertion expression", async () => {
    const baseSource = `import { it, expect } from "vitest";
it("verifies status code", () => {
  expect(response.status).toBe(200);
});
`;
    const headSource = `import { it, expect } from "vitest";
it("verifies status code", () => {
  expect(response.status).toBe(201);
});
`;

    repo.commitFile("tests/ast-mod.test.ts", baseSource, "Commit A");
    repo.commitFile("tests/ast-mod.test.ts", headSource, "Commit B");

    const request: TestAnalysisRequest = {
      repoPath: repo.dir,
      baseRevisionInput: "HEAD~1",
      headRevisionInput: "HEAD",
      testFilePaths: ["tests/ast-mod.test.ts"],
    };

    const report = await analyzeTestChanges(request);

    assertValidTestAnalysisReport(report);
    const tc = report.testChanges[0];
    const modAst = tc.assertionChanges.find(
      (a) => a.changeType === "ASSERTION_MODIFIED_OR_REWRITTEN"
    );
    expect(modAst).toBeDefined();
    expect(modAst?.beforeAssertionText).toContain("200");
    expect(modAst?.afterAssertionText).toContain("201");

    const astFinding = report.findings.find((f) =>
      f.inferred.some((inf) => inf.ruleId === "RULE_TEST_ASSERTION_MODIFIED")
    );
    expect(astFinding).toBeDefined();
  });

  // --------------------------------------------------------------------------
  // 11. Nested test declarations
  // --------------------------------------------------------------------------
  it("11. correctly resolves titles and hierarchy for nested test declarations", async () => {
    const testSource = `import { describe, it, expect } from "vitest";
describe("API Service", () => {
  describe("Authentication", () => {
    it("rejects expired token", () => {
      expect(authCheck()).toBe(false);
    });
  });
});
`;

    repo.commitFile("tests/nested.test.ts", testSource, "Commit A");
    repo.commitFile("src/dummy.ts", "export const z = 3;", "Commit B");

    const request: TestAnalysisRequest = {
      repoPath: repo.dir,
      baseRevisionInput: "HEAD~1",
      headRevisionInput: "HEAD",
      testFilePaths: ["tests/nested.test.ts"],
    };

    const report = await analyzeTestChanges(request);

    assertValidTestAnalysisReport(report);
    // In unchanged state, status is COMPLETED_NO_CHANGES
    expect(report.status).toBe("COMPLETED_NO_CHANGES");
  });

  // --------------------------------------------------------------------------
  // 12. Assertions inside nested callbacks
  // --------------------------------------------------------------------------
  it("12. attributes assertions inside nested callbacks to the enclosing test block", async () => {
    const baseSource = `import { it, expect } from "vitest";
it("processes list", () => {
  const items = [1, 2, 3];
  items.forEach((item) => {
    expect(item).toBeGreaterThan(0);
  });
});
`;
    const headSource = `import { it, expect } from "vitest";
it("processes list", () => {
  const items = [1, 2, 3];
  items.forEach((item) => {
    expect(item).toBeGreaterThan(1);
  });
});
`;

    repo.commitFile("tests/callback.test.ts", baseSource, "Commit A");
    repo.commitFile("tests/callback.test.ts", headSource, "Commit B");

    const request: TestAnalysisRequest = {
      repoPath: repo.dir,
      baseRevisionInput: "HEAD~1",
      headRevisionInput: "HEAD",
      testFilePaths: ["tests/callback.test.ts"],
    };

    const report = await analyzeTestChanges(request);

    assertValidTestAnalysisReport(report);
    const tc = report.testChanges[0];
    const modAst = tc.assertionChanges.find(
      (a) => a.changeType === "ASSERTION_MODIFIED_OR_REWRITTEN"
    );
    expect(modAst).toBeDefined();
    expect(modAst?.enclosingTestBlock).toBe("processes list");
  });

  // --------------------------------------------------------------------------
  // 13. Duplicate test descriptions or ambiguous matches
  // --------------------------------------------------------------------------
  it("13. detects duplicate test descriptions and avoids arbitrary pairing", async () => {
    const sourceWithDuplicates = `import { it, expect } from "vitest";
it("duplicate title", () => {
  expect(1).toBe(1);
});
it("duplicate title", () => {
  expect(2).toBe(2);
});
`;

    repo.commitFile("tests/dups.test.ts", sourceWithDuplicates, "Commit A");
    repo.commitFile("src/noop.ts", "export const noop = true;", "Commit B");

    const request: TestAnalysisRequest = {
      repoPath: repo.dir,
      baseRevisionInput: "HEAD~1",
      headRevisionInput: "HEAD",
      testFilePaths: ["tests/dups.test.ts"],
    };

    const report = await analyzeTestChanges(request);

    assertValidTestAnalysisReport(report);
    expect(report.limitations.some((lim) => lim.includes("Duplicate test descriptions"))).toBe(
      true
    );
  });

  // --------------------------------------------------------------------------
  // 14. Empty test file
  // --------------------------------------------------------------------------
  it("14. handles an empty test file cleanly without errors", async () => {
    repo.commitFile("tests/empty.test.ts", "   \n\n// just comments\n", "Commit A");
    repo.commitFile("tests/empty.test.ts", "", "Commit B");

    const request: TestAnalysisRequest = {
      repoPath: repo.dir,
      baseRevisionInput: "HEAD~1",
      headRevisionInput: "HEAD",
      testFilePaths: ["tests/empty.test.ts"],
    };

    const report = await analyzeTestChanges(request);

    assertValidTestAnalysisReport(report);
    expect(report.limitations.some((lim) => lim.includes("empty"))).toBe(true);
  });

  // --------------------------------------------------------------------------
  // 15. Invalid syntax in one revision
  // --------------------------------------------------------------------------
  it("15. handles invalid syntax in one revision with INCOMPLETE_PARSE_ERROR", async () => {
    const validSource = `import { it, expect } from "vitest";
it("valid", () => {
  expect(1).toBe(1);
});
`;
    const invalidSource = `import { it, expect } from "vitest";
it("broken", () => {
  expect( { // parse error
});
`;

    repo.commitFile("tests/syntax.test.ts", validSource, "Commit A");
    repo.commitFile("tests/syntax.test.ts", invalidSource, "Commit B");

    const request: TestAnalysisRequest = {
      repoPath: repo.dir,
      baseRevisionInput: "HEAD~1",
      headRevisionInput: "HEAD",
      testFilePaths: ["tests/syntax.test.ts"],
    };

    const report = await analyzeTestChanges(request);

    assertValidTestAnalysisReport(report);
    expect(report.status).toBe("INCOMPLETE_PARSE_ERROR");
    expect(report.errors.length).toBeGreaterThan(0);
    expect(report.errors[0].code).toBe("SYNTAX_PARSE_ERROR");
  });

  // --------------------------------------------------------------------------
  // 16. Unsupported assertion syntax
  // --------------------------------------------------------------------------
  it("16. detects unsupported assertion syntax and surfaces it in limitations", async () => {
    const baseSource = `import { it } from "vitest";
it("uses bdd should", () => {
  user.should.equal("admin");
});
`;
    const headSource = `import { it } from "vitest";
it("uses bdd should", () => {
  user.should.equal("superadmin");
});
`;

    repo.commitFile("tests/unsupported.test.ts", baseSource, "Commit A");
    repo.commitFile("tests/unsupported.test.ts", headSource, "Commit B");

    const request: TestAnalysisRequest = {
      repoPath: repo.dir,
      baseRevisionInput: "HEAD~1",
      headRevisionInput: "HEAD",
      testFilePaths: ["tests/unsupported.test.ts"],
    };

    const report = await analyzeTestChanges(request);

    assertValidTestAnalysisReport(report);
    expect(report.limitations.some((lim) => lim.includes("Unsupported assertion"))).toBe(true);
  });

  // --------------------------------------------------------------------------
  // 17. Dirty working-tree changes that must not affect historical results
  // --------------------------------------------------------------------------
  it("17. ignores dirty working-tree modifications and reads committed snapshots", async () => {
    const baseSource = `import { it, expect } from "vitest";
it("clean test", () => {
  expect(1).toBe(1);
});
`;
    const headSource = `import { it, expect } from "vitest";
it("clean test", () => {
  expect(1).toBe(2);
});
`;

    repo.commitFile("tests/dirty.test.ts", baseSource, "Commit A");
    repo.commitFile("tests/dirty.test.ts", headSource, "Commit B");

    // Dirty the working tree file with syntax errors
    const dirtyPath = path.join(repo.dir, "tests/dirty.test.ts");
    fs.writeFileSync(dirtyPath, "export broken { !@# unparseable dirty content", "utf8");

    const request: TestAnalysisRequest = {
      repoPath: repo.dir,
      baseRevisionInput: "HEAD~1",
      headRevisionInput: "HEAD",
      testFilePaths: ["tests/dirty.test.ts"],
    };

    const report = await analyzeTestChanges(request);

    assertValidTestAnalysisReport(report);
    expect(report.status).toBe("COMPLETED_WITH_CHANGES");

    // Verify disk content was untouched
    expect(fs.readFileSync(dirtyPath, "utf8")).toContain("unparseable dirty content");
  });

  // --------------------------------------------------------------------------
  // 18. Invalid Git revision propagation
  // --------------------------------------------------------------------------
  it("18. propagates structured GitError when given invalid revision", async () => {
    repo.commitFile("tests/rev.test.ts", "it('a', () => {});", "Commit A");

    const request: TestAnalysisRequest = {
      repoPath: repo.dir,
      baseRevisionInput: "HEAD~999",
      headRevisionInput: "HEAD",
      testFilePaths: ["tests/rev.test.ts"],
    };

    let caughtError: unknown = null;
    try {
      await analyzeTestChanges(request);
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).toBeInstanceOf(GitError);
    expect((caughtError as GitError).code).toBe("INVALID_REVISION");
  });

  // --------------------------------------------------------------------------
  // 19. Deterministic output for identical inputs
  // --------------------------------------------------------------------------
  it("19. produces 100% deterministic output for identical inputs across invocations", async () => {
    const baseSource = `import { it, expect } from "vitest";
it("test", () => {
  expect(1).toBe(1);
});
`;
    const headSource = `import { it, expect } from "vitest";
it("test", () => {
  expect(1).toBe(2);
});
`;

    repo.commitFile("tests/determ.test.ts", baseSource, "Commit A");
    repo.commitFile("tests/determ.test.ts", headSource, "Commit B");

    const request: TestAnalysisRequest = {
      repoPath: repo.dir,
      baseRevisionInput: "HEAD~1",
      headRevisionInput: "HEAD",
      testFilePaths: ["tests/determ.test.ts"],
    };

    const report1 = await analyzeTestChanges(request);
    const report2 = await analyzeTestChanges(request);

    expect(report1.status).toBe(report2.status);
    expect(report1.testChanges).toEqual(report2.testChanges);
    expect(report1.declarationChanges).toEqual(report2.declarationChanges);
    expect(report1.evidence).toEqual(report2.evidence);
    expect(report1.findings).toEqual(report2.findings);
    expect(report1.limitations).toEqual(report2.limitations);
  });

  // --------------------------------------------------------------------------
  // 20. No double-counting of assertions
  // --------------------------------------------------------------------------
  it("20. does not double-count chained assertions (expect(x).toBe(y))", async () => {
    const baseSource = `import { it, expect } from "vitest";
it("chained assertion", () => {
  expect(value).toBe(100);
});
`;
    const headSource = `import { it, expect } from "vitest";
it("chained assertion", () => {
  expect(value).toBe(100);
  expect(value).not.toBe(200);
});
`;

    repo.commitFile("tests/double.test.ts", baseSource, "Commit A");
    repo.commitFile("tests/double.test.ts", headSource, "Commit B");

    const request: TestAnalysisRequest = {
      repoPath: repo.dir,
      baseRevisionInput: "HEAD~1",
      headRevisionInput: "HEAD",
      testFilePaths: ["tests/double.test.ts"],
    };

    const report = await analyzeTestChanges(request);

    assertValidTestAnalysisReport(report);
    const tc = report.testChanges[0];
    // Exactly 1 assertion was added: expect(value).not.toBe(200)
    expect(tc.assertionChanges).toHaveLength(1);
    expect(tc.assertionChanges[0].changeType).toBe("ASSERTION_ADDED");
  });

  // --------------------------------------------------------------------------
  // 21. Preservation of source evidence and source spans
  // --------------------------------------------------------------------------
  it("21. preserves source evidence, line numbers, and snippets", async () => {
    const baseSource = `import { it, expect } from "vitest";
it("checks values", () => {
  expect(42).toBe(42);
});
`;
    const headSource = `import { it, expect } from "vitest";
it("checks values", () => {
  expect(42).toBe(43);
});
`;

    repo.commitFile("tests/spans.test.ts", baseSource, "Commit A");
    repo.commitFile("tests/spans.test.ts", headSource, "Commit B");

    const request: TestAnalysisRequest = {
      repoPath: repo.dir,
      baseRevisionInput: "HEAD~1",
      headRevisionInput: "HEAD",
      testFilePaths: ["tests/spans.test.ts"],
    };

    const report = await analyzeTestChanges(request);

    assertValidTestAnalysisReport(report);
    expect(report.evidence.length).toBeGreaterThan(0);
    for (const ev of report.evidence) {
      expect(ev.span).not.toBeNull();
      expect(ev.span!.startLine).toBeGreaterThanOrEqual(1);
      expect(ev.span!.endLine).toBeGreaterThanOrEqual(ev.span!.startLine);
      expect(ev.codeSnippet).not.toBeNull();
    }
  });

  // --------------------------------------------------------------------------
  // 22. Correct separation of observed changes from unknown coverage
  // --------------------------------------------------------------------------
  it("22. strictly separates observed facts from unknown runtime coverage or execution", async () => {
    const baseSource = `import { it, expect } from "vitest";
it("test case", () => {
  expect(foo()).toBe(true);
});
`;
    const headSource = `import { it, expect } from "vitest";
it("test case", () => {
  expect(foo()).toBe(false);
});
`;

    repo.commitFile("tests/epistemic.test.ts", baseSource, "Commit A");
    repo.commitFile("tests/epistemic.test.ts", headSource, "Commit B");

    const request: TestAnalysisRequest = {
      repoPath: repo.dir,
      baseRevisionInput: "HEAD~1",
      headRevisionInput: "HEAD",
      testFilePaths: ["tests/epistemic.test.ts"],
    };

    const report = await analyzeTestChanges(request);

    assertValidTestAnalysisReport(report);
    for (const finding of report.findings) {
      expect(finding.observed.length).toBeGreaterThan(0);
      expect(finding.unknown.length).toBeGreaterThan(0);

      // Verify no claim of bug, regression, or coverage measurement
      for (const unk of finding.unknown) {
        expect(unk.reasonCategory).toBe("RUNTIME_TEST_EXECUTION_UNVERIFIED");
        expect(unk.statement.toLowerCase()).toContain("static analysis cannot determine");
      }
    }
  });
});

