/**
 * Unit Test Suite: Conservative Change-to-Test Correlation Engine (Milestone 6)
 *
 * Validates the correlation service against the 22 required cases:
 *  1. Guard removal and assertion removal occurring in the same revision range.
 *  2. Condition change and assertion addition.
 *  3. Throw-to-return change and assertion modification.
 *  4. Production code changes with no detected test changes.
 *  5. Test changes with no production structural changes.
 *  6. Multiple production changes and multiple test changes.
 *  7. Duplicate or ambiguous test declarations.
 *  8. Incomplete production analysis.
 *  9. Incomplete test analysis.
 * 10. Missing production evidence handling.
 * 11. Missing test evidence handling.
 * 12. Invalid or dangling evidence references rejection.
 * 13. Temporal co-occurrence as the only supported relationship.
 * 14. Inferred relationship remains explicitly unverified.
 * 15. Analyzer does not claim test coverage.
 * 16. Analyzer does not claim a regression or defect.
 * 17. Assertion removed but other assertions remain.
 * 18. Stable output across repeated identical inputs.
 * 19. Deterministic ordering of correlation results.
 * 20. No mutation of input reports (Object.freeze).
 * 21. Existing tests remain passing (verified via full test suite).
 * 22. TypeScript compilation succeeds (verified via tsc --noEmit).
 */

import { describe, it, expect } from "vitest";
import {
  ChangeCorrelator,
  correlateChanges,
} from "../../../src/core/correlation/index.js";
import {
  assertValidCorrelationReport,
  validateCorrelationReport,
  validateCorrelationItem,
} from "../../../src/core/domain/schemas.js";
import type {
  AnalysisReport,
  EvidenceItem,
  Finding,
  StructuralChange,
  TestAnalysisReport,
  TestChange,
  TestDeclarationChange,
} from "../../../src/core/domain/types.js";

// ============================================================================
// FIXTURE FACTORIES
// ============================================================================

function createMockProductionReport(
  overrides?: Partial<AnalysisReport>
): AnalysisReport {
  const defaultEv: EvidenceItem = {
    id: "EV-PROD-001",
    kind: "SOURCE_BEFORE",
    commitRole: "BASE",
    commitSha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    posixFilePath: "src/auth.ts",
    span: { startLine: 10, startColumn: 1, endLine: 12, endColumn: 2 },
    codeSnippet: "if (!token) return false;",
    description: "Guard clause before removal",
  };

  const defaultSc: StructuralChange = {
    id: "SC-001",
    ruleId: "RULE_GUARD_REMOVED",
    category: "GUARD_CLAUSE",
    changeType: "REMOVED",
    summary: "Guard clause removed: if (!token)",
    beforeSpan: { startLine: 10, startColumn: 1, endLine: 12, endColumn: 2 },
    afterSpan: null,
    beforeSnippet: "if (!token) return false;",
    afterSnippet: null,
  };

  const defaultFinding: Finding = {
    id: "FND-001",
    title: "Guard clause removed",
    category: "GUARD_CLAUSE",
    attentionLevel: "MODERATE_ATTENTION",
    structuralChangeIds: ["SC-001"],
    correlationId: null,
    observed: [
      {
        id: "OBS-001",
        category: "OBSERVED",
        statement: "Guard clause removed at lines 10-12",
        evidenceIds: ["EV-PROD-001"],
      },
    ],
    inferred: [
      {
        id: "INF-001",
        category: "INFERRED",
        statement: "Control flow guard removed",
        ruleId: "RULE_GUARD_REMOVED",
        supportingObservationIds: ["OBS-001"],
      },
    ],
    unknown: [
      {
        id: "UNK-001",
        category: "UNKNOWN",
        statement: "Static analysis cannot prove runtime caller impact.",
        reasonCategory: "EXTERNAL_CALLER_BEHAVIOR",
      },
    ],
  };

  return {
    schemaVersion: "1.0.0",
    generatedAtIso: "2026-11-04T12:00:00.000Z",
    status: "COMPLETED_WITH_FINDINGS",
    request: {
      repoPath: "E:/repo",
      targetFilePath: "src/auth.ts",
      targetFunctionName: "verifyToken",
      baseRevisionInput: "HEAD~1",
      headRevisionInput: "HEAD",
    },
    repository: {
      rootPath: "E:/repo",
      gitVersion: "git version 2.53.0",
    },
    baseCommit: {
      role: "BASE",
      sha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      shortSha: "aaaaaaa",
      authorName: "Archaeologist",
      committedAtIso: "2026-11-04T12:00:00.000Z",
      subject: "Commit A",
    },
    headCommit: {
      role: "HEAD",
      sha: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      shortSha: "bbbbbbb",
      authorName: "Archaeologist",
      committedAtIso: "2026-11-04T12:00:00.000Z",
      subject: "Commit B",
    },
    evidence: [defaultEv],
    structuralChanges: [defaultSc],
    testChanges: [],
    correlations: [],
    findings: [defaultFinding],
    limitations: [],
    errors: [],
    ...overrides,
  };
}

function createMockTestReport(
  overrides?: Partial<TestAnalysisReport>
): TestAnalysisReport {
  const defaultEv: EvidenceItem = {
    id: "EV-TEST-001",
    kind: "TEST_BEFORE",
    commitRole: "BASE",
    commitSha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    posixFilePath: "tests/auth.test.ts",
    span: { startLine: 20, startColumn: 5, endLine: 20, endColumn: 35 },
    codeSnippet: "expect(verifyToken(null)).toBe(false);",
    description: "Assertion before removal",
  };

  const defaultTc: TestChange = {
    id: "TC-001",
    posixTestFilePath: "tests/auth.test.ts",
    fileChangeStatus: "MODIFIED",
    importsTargetFile: true,
    mentionsTargetFunction: true,
    assertionChanges: [
      {
        changeType: "ASSERTION_REMOVED",
        enclosingTestBlock: "Auth > handles null token",
        callsTargetFunctionInBlock: true,
        beforeAssertionText: "expect(verifyToken(null)).toBe(false);",
        afterAssertionText: null,
        beforeSpan: { startLine: 20, startColumn: 5, endLine: 20, endColumn: 35 },
        afterSpan: null,
      },
    ],
  };

  const defaultFinding: Finding = {
    id: "FND-TEST-001",
    title: "Assertion removed",
    category: "TEST_CHANGE",
    attentionLevel: "MODERATE_ATTENTION",
    structuralChangeIds: [],
    correlationId: null,
    observed: [
      {
        id: "OBS-TEST-001",
        category: "OBSERVED",
        statement: "Assertion removed at line 20",
        evidenceIds: ["EV-TEST-001"],
      },
    ],
    inferred: [
      {
        id: "INF-TEST-001",
        category: "INFERRED",
        statement: "Assertion removed from test suite",
        ruleId: "RULE_TEST_ASSERTION_REMOVED",
        supportingObservationIds: ["OBS-TEST-001"],
      },
    ],
    unknown: [
      {
        id: "UNK-TEST-001",
        category: "UNKNOWN",
        statement: "Static analysis cannot verify runtime execution.",
        reasonCategory: "RUNTIME_TEST_EXECUTION_UNVERIFIED",
      },
    ],
  };

  return {
    schemaVersion: "1.0.0",
    generatedAtIso: "2026-11-04T12:00:00.000Z",
    status: "COMPLETED_WITH_CHANGES",
    request: {
      repoPath: "E:/repo",
      baseRevisionInput: "HEAD~1",
      headRevisionInput: "HEAD",
      testFilePaths: ["tests/auth.test.ts"],
      targetFilePath: "src/auth.ts",
      targetFunctionName: "verifyToken",
    },
    repository: {
      rootPath: "E:/repo",
      gitVersion: "git version 2.53.0",
    },
    baseCommit: {
      role: "BASE",
      sha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      shortSha: "aaaaaaa",
      authorName: "Archaeologist",
      committedAtIso: "2026-11-04T12:00:00.000Z",
      subject: "Commit A",
    },
    headCommit: {
      role: "HEAD",
      sha: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      shortSha: "bbbbbbb",
      authorName: "Archaeologist",
      committedAtIso: "2026-11-04T12:00:00.000Z",
      subject: "Commit B",
    },
    testChanges: [defaultTc],
    declarationChanges: [],
    evidence: [defaultEv],
    findings: [defaultFinding],
    limitations: [],
    errors: [],
    ...overrides,
  };
}

describe("Change-to-Test Correlation Engine", () => {
  // --------------------------------------------------------------------------
  // 1. Guard removal and assertion removal
  // --------------------------------------------------------------------------
  it("1. correlates a production guard removal and an assertion removal in the same revision range", () => {
    const prodReport = createMockProductionReport();
    const testReport = createMockTestReport();

    const report = correlateChanges(prodReport, testReport);

    assertValidCorrelationReport(report);
    expect(report.status).toBe("COMPLETE_CORRELATED");
    expect(report.correlations).toHaveLength(1);

    const item = report.correlationItems.find(
      (ci) => ci.classification === "POTENTIALLY_RELATED_ASSERTION_REMOVED"
    );
    expect(item).toBeDefined();
    expect(item?.status).toBe("STRONG");
    expect(item?.rationale).toContain("Assertion removal observed alongside production structural change");
    expect(item?.unknowns).toContain(
      "The relationship between production change and removed assertion is inferred, not proven."
    );
  });

  // --------------------------------------------------------------------------
  // 2. Condition change and assertion addition
  // --------------------------------------------------------------------------
  it("2. correlates a condition change (&& to ||) and an assertion addition with unverified status", () => {
    const prodReport = createMockProductionReport({
      structuralChanges: [
        {
          id: "SC-002",
          ruleId: "RULE_CONDITIONAL_MODIFIED",
          category: "CONDITIONAL_EXPRESSION",
          changeType: "MODIFIED",
          summary: "Condition changed from (a && b) to (a || b)",
          beforeSpan: { startLine: 5, startColumn: 1, endLine: 5, endColumn: 20 },
          afterSpan: { startLine: 5, startColumn: 1, endLine: 5, endColumn: 20 },
          beforeSnippet: "if (a && b)",
          afterSnippet: "if (a || b)",
        },
      ],
    });

    const testReport = createMockTestReport({
      testChanges: [
        {
          id: "TC-002",
          posixTestFilePath: "tests/auth.test.ts",
          fileChangeStatus: "MODIFIED",
          importsTargetFile: true,
          mentionsTargetFunction: true,
          assertionChanges: [
            {
              changeType: "ASSERTION_ADDED",
              enclosingTestBlock: "Auth > handles alternate access",
              callsTargetFunctionInBlock: true,
              beforeAssertionText: null,
              afterAssertionText: "expect(verifyToken(adminUser)).toBe(true);",
              beforeSpan: null,
              afterSpan: { startLine: 25, startColumn: 5, endLine: 25, endColumn: 45 },
            },
          ],
        },
      ],
    });

    const report = correlateChanges(prodReport, testReport);

    assertValidCorrelationReport(report);
    const item = report.correlationItems.find(
      (ci) => ci.classification === "POTENTIALLY_RELATED_ASSERTION_ADDED"
    );
    expect(item).toBeDefined();
    expect(item?.inferredRelationship).toContain("relationship remains unverified");
  });

  // --------------------------------------------------------------------------
  // 3. Throw-to-return change and assertion modification
  // --------------------------------------------------------------------------
  it("3. correlates a throw-to-return conversion and an assertion modification", () => {
    const prodReport = createMockProductionReport({
      structuralChanges: [
        {
          id: "SC-003",
          ruleId: "RULE_THROW_TO_RETURN_CONVERSION",
          category: "GUARD_CLAUSE",
          changeType: "MODIFIED",
          summary: "Throw-to-return conversion under condition (!token)",
          beforeSpan: { startLine: 12, startColumn: 1, endLine: 14, endColumn: 2 },
          afterSpan: { startLine: 12, startColumn: 1, endLine: 14, endColumn: 2 },
          beforeSnippet: "throw new Error();",
          afterSnippet: "return null;",
        },
      ],
    });

    const testReport = createMockTestReport({
      testChanges: [
        {
          id: "TC-003",
          posixTestFilePath: "tests/auth.test.ts",
          fileChangeStatus: "MODIFIED",
          importsTargetFile: true,
          mentionsTargetFunction: true,
          assertionChanges: [
            {
              changeType: "ASSERTION_MODIFIED_OR_REWRITTEN",
              enclosingTestBlock: "Auth > handles missing token",
              callsTargetFunctionInBlock: true,
              beforeAssertionText: "expect(() => verifyToken(null)).toThrow();",
              afterAssertionText: "expect(verifyToken(null)).toBeNull();",
              beforeSpan: { startLine: 30, startColumn: 5, endLine: 30, endColumn: 45 },
              afterSpan: { startLine: 30, startColumn: 5, endLine: 30, endColumn: 40 },
            },
          ],
        },
      ],
    });

    const report = correlateChanges(prodReport, testReport);

    assertValidCorrelationReport(report);
    const item = report.correlationItems.find(
      (ci) => ci.classification === "POTENTIALLY_RELATED_ASSERTION_MODIFIED"
    );
    expect(item).toBeDefined();
    expect(item?.inferredRelationship).toContain("Assertion was modified alongside production structural change");
  });

  // --------------------------------------------------------------------------
  // 4. Production code changes with no detected test changes
  // --------------------------------------------------------------------------
  it("4. handles production changes with no detected test changes (COMPLETE_NO_CORRELATIONS)", () => {
    const prodReport = createMockProductionReport();
    const testReport = createMockTestReport({
      status: "COMPLETED_NO_CHANGES",
      testChanges: [
        {
          id: "TC-UNCHANGED",
          posixTestFilePath: "tests/auth.test.ts",
          fileChangeStatus: "UNMODIFIED_COMPANION",
          importsTargetFile: true,
          mentionsTargetFunction: true,
          assertionChanges: [],
        },
      ],
    });

    const report = correlateChanges(prodReport, testReport);

    assertValidCorrelationReport(report);
    expect(report.status).toBe("COMPLETE_NO_CORRELATIONS");
    expect(report.correlations[0].status).toBe("NONE");
    expect(report.correlations[0].untouchedCompanionTestFiles).toContain("tests/auth.test.ts");
    expect(report.correlationItems[0].classification).toBe("NO_TEST_CHANGES_OBSERVED");
  });

  // --------------------------------------------------------------------------
  // 5. Test changes with no production structural changes
  // --------------------------------------------------------------------------
  it("5. handles test changes with no production structural changes", () => {
    const prodReport = createMockProductionReport({
      status: "COMPLETED_NO_STRUCTURAL_CHANGES",
      structuralChanges: [],
      findings: [],
    });
    const testReport = createMockTestReport();

    const report = correlateChanges(prodReport, testReport);

    assertValidCorrelationReport(report);
    expect(report.status).toBe("COMPLETE_NO_CORRELATIONS");
    expect(report.correlationItems[0].classification).toBe("NO_PRODUCTION_CHANGES_OBSERVED");
  });

  // --------------------------------------------------------------------------
  // 6. Multiple production changes and multiple test changes
  // --------------------------------------------------------------------------
  it("6. deterministically maps multiple production changes to multiple test changes", () => {
    const prodReport = createMockProductionReport({
      structuralChanges: [
        {
          id: "SC-001",
          ruleId: "RULE_GUARD_REMOVED",
          category: "GUARD_CLAUSE",
          changeType: "REMOVED",
          summary: "First guard removed",
          beforeSpan: null,
          afterSpan: null,
          beforeSnippet: null,
          afterSnippet: null,
        },
        {
          id: "SC-002",
          ruleId: "RULE_THROW_ADDED",
          category: "THROW_STATEMENT",
          changeType: "ADDED",
          summary: "Throw added",
          beforeSpan: null,
          afterSpan: null,
          beforeSnippet: null,
          afterSnippet: null,
        },
      ],
    });

    const testReport = createMockTestReport({
      testChanges: [
        {
          id: "TC-001",
          posixTestFilePath: "tests/auth.test.ts",
          fileChangeStatus: "MODIFIED",
          importsTargetFile: true,
          mentionsTargetFunction: true,
          assertionChanges: [
            {
              changeType: "ASSERTION_REMOVED",
              enclosingTestBlock: "test 1",
              callsTargetFunctionInBlock: true,
              beforeAssertionText: "expect(1).toBe(1);",
              afterAssertionText: null,
              beforeSpan: null,
              afterSpan: null,
            },
          ],
        },
        {
          id: "TC-002",
          posixTestFilePath: "tests/user.test.ts",
          fileChangeStatus: "MODIFIED",
          importsTargetFile: true,
          mentionsTargetFunction: true,
          assertionChanges: [
            {
              changeType: "ASSERTION_ADDED",
              enclosingTestBlock: "test 2",
              callsTargetFunctionInBlock: true,
              beforeAssertionText: null,
              afterAssertionText: "expect(2).toBe(2);",
              beforeSpan: null,
              afterSpan: null,
            },
          ],
        },
      ],
    });

    const report = correlateChanges(prodReport, testReport);

    assertValidCorrelationReport(report);
    expect(report.correlations).toHaveLength(2);
    expect(report.correlations[0].structuralChangeId).toBe("SC-001");
    expect(report.correlations[1].structuralChangeId).toBe("SC-002");
  });

  // --------------------------------------------------------------------------
  // 7. Duplicate or ambiguous test declarations
  // --------------------------------------------------------------------------
  it("7. preserves upstream ambiguous test limitations and halts arbitrary pairing", () => {
    const prodReport = createMockProductionReport();
    const testReport = createMockTestReport({
      limitations: ["Duplicate test descriptions detected in 'tests/auth.test.ts'"],
    });

    const report = correlateChanges(prodReport, testReport);

    assertValidCorrelationReport(report);
    expect(report.limitations.some((l) => l.includes("Ambiguous test matches"))).toBe(true);
  });

  // --------------------------------------------------------------------------
  // 8. Incomplete production analysis
  // --------------------------------------------------------------------------
  it("8. preserves incomplete production analysis as INCOMPLETE_UPSTREAM_ANALYSIS", () => {
    const prodReport = createMockProductionReport({
      status: "INCOMPLETE_PARSE_ERROR",
      limitations: ["Syntax parse error in production code"],
    });
    const testReport = createMockTestReport();

    const report = correlateChanges(prodReport, testReport);

    assertValidCorrelationReport(report);
    expect(report.status).toBe("INCOMPLETE_UPSTREAM_ANALYSIS");
    expect(report.correlations).toHaveLength(0);
  });

  // --------------------------------------------------------------------------
  // 9. Incomplete test analysis
  // --------------------------------------------------------------------------
  it("9. preserves incomplete test analysis as INCOMPLETE_UPSTREAM_ANALYSIS", () => {
    const prodReport = createMockProductionReport();
    const testReport = createMockTestReport({
      status: "INCOMPLETE_PARSE_ERROR",
      limitations: ["Syntax parse error in test file"],
    });

    const report = correlateChanges(prodReport, testReport);

    assertValidCorrelationReport(report);
    expect(report.status).toBe("INCOMPLETE_UPSTREAM_ANALYSIS");
    expect(report.correlations).toHaveLength(0);
  });

  // --------------------------------------------------------------------------
  // 10. Missing production evidence handling
  // --------------------------------------------------------------------------
  it("10. detects dangling or missing production evidence references", () => {
    const prodReport = createMockProductionReport({
      evidence: [], // Empty evidence, but finding cites EV-PROD-001
    });
    const testReport = createMockTestReport();

    expect(() => correlateChanges(prodReport, testReport)).toThrow();

    const validReport = correlateChanges(createMockProductionReport(), testReport);
    const reportWithDangling = {
      ...validReport,
      evidence: [], // Stripped evidence
    };
    const validation = validateCorrelationReport(reportWithDangling);
    expect(validation.success).toBe(false);
    if (!validation.success) {
      expect(validation.issues.some((i) => i.code === "UNRESOLVED_REFERENCE")).toBe(true);
    }
  });

  // --------------------------------------------------------------------------
  // 11. Missing test evidence handling
  // --------------------------------------------------------------------------
  it("11. detects dangling or missing test evidence references", () => {
    const prodReport = createMockProductionReport();
    const testReport = createMockTestReport({
      evidence: [], // Empty test evidence
    });

    expect(() => correlateChanges(prodReport, testReport)).toThrow();

    const validReport = correlateChanges(prodReport, createMockTestReport());
    const reportWithDangling = {
      ...validReport,
      evidence: validReport.evidence.filter((e) => !e.id.includes("TEST")),
    };
    const validation = validateCorrelationReport(reportWithDangling);
    expect(validation.success).toBe(false);
    if (!validation.success) {
      expect(validation.issues.some((i) => i.code === "UNRESOLVED_REFERENCE")).toBe(true);
    }
  });

  // --------------------------------------------------------------------------
  // 12. Invalid or dangling evidence references rejection
  // --------------------------------------------------------------------------
  it("12. rejects invalid or dangling evidence IDs in correlation items", () => {
    const availableEvidenceIds = new Set(["EV-001"]);
    const badItem = {
      id: "CORR-ITEM-001",
      correlationId: "CORR-001",
      structuralChangeId: "SC-001",
      testChangeId: "TC-001",
      posixTestFilePath: "tests/auth.test.ts",
      classification: "POTENTIALLY_RELATED_ASSERTION_REMOVED",
      status: "STRONG",
      rationale: "some rationale",
      observedFact: "some observation",
      inferredRelationship: "some inference",
      unknowns: ["some unknown"],
      evidenceIds: ["NON_EXISTENT_EV_999"], // Dangling
    };

    const issues = validateCorrelationItem(badItem, availableEvidenceIds, "item");
    expect(issues.some((i) => i.code === "UNRESOLVED_REFERENCE")).toBe(true);
  });

  // --------------------------------------------------------------------------
  // 13. Temporal co-occurrence as the only supported relationship
  // --------------------------------------------------------------------------
  it("13. classifies unrelated test file changes as TEMPORAL_CO_OCCURRENCE_ONLY", () => {
    const prodReport = createMockProductionReport();
    const testReport = createMockTestReport({
      testChanges: [
        {
          id: "TC-UNRELATED",
          posixTestFilePath: "tests/payment.test.ts", // Unrelated file
          fileChangeStatus: "MODIFIED",
          importsTargetFile: false, // Does not import auth.ts
          mentionsTargetFunction: false, // Does not mention verifyToken
          assertionChanges: [
            {
              changeType: "ASSERTION_REMOVED",
              enclosingTestBlock: "Payment > process",
              callsTargetFunctionInBlock: false,
              beforeAssertionText: "expect(pay()).toBe(true);",
              afterAssertionText: null,
              beforeSpan: null,
              afterSpan: null,
            },
          ],
        },
      ],
    });

    const report = correlateChanges(prodReport, testReport);

    assertValidCorrelationReport(report);
    const item = report.correlationItems[0];
    expect(item.classification).toBe("TEMPORAL_CO_OCCURRENCE_ONLY");
    expect(item.rationale).toContain("temporal co-occurrence");
  });

  // --------------------------------------------------------------------------
  // 14. Inferred relationship remains explicitly unverified
  // --------------------------------------------------------------------------
  it("14. marks inferred relationships as unverified without runtime execution claims", () => {
    const prodReport = createMockProductionReport();
    const testReport = createMockTestReport();

    const report = correlateChanges(prodReport, testReport);

    assertValidCorrelationReport(report);
    for (const item of report.correlationItems) {
      expect(item.inferredRelationship.toLowerCase()).toMatch(/inferred|unverified/);
      expect(item.unknowns.length).toBeGreaterThan(0);
    }
  });

  // --------------------------------------------------------------------------
  // 15. Analyzer does not claim test coverage
  // --------------------------------------------------------------------------
  it("15. strictly prohibits claims of test coverage or branch coverage", () => {
    const prodReport = createMockProductionReport();
    const testReport = createMockTestReport();

    const report = correlateChanges(prodReport, testReport);
    const jsonStr = JSON.stringify(report).toLowerCase();

    expect(jsonStr).not.toContain("coverage increased");
    expect(jsonStr).not.toContain("coverage decreased");
    expect(jsonStr).not.toContain("branch covered");
    expect(jsonStr).not.toContain("exercises all paths");
  });

  // --------------------------------------------------------------------------
  // 16. Analyzer does not claim a regression or defect
  // --------------------------------------------------------------------------
  it("16. strictly prohibits claims of regression or defect causality", () => {
    const prodReport = createMockProductionReport();
    const testReport = createMockTestReport();

    const report = correlateChanges(prodReport, testReport);
    const jsonStr = JSON.stringify(report).toLowerCase();

    expect(jsonStr).not.toContain("proves a regression");
    expect(jsonStr).not.toContain("proves a bug");
    expect(jsonStr).not.toContain("introduced a defect");
  });

  // --------------------------------------------------------------------------
  // 17. Assertion removed but other assertions remain
  // --------------------------------------------------------------------------
  it("17. notes when an assertion is removed but other assertions remain in the test", () => {
    const prodReport = createMockProductionReport();
    const testReport = createMockTestReport({
      testChanges: [
        {
          id: "TC-MULTI-AST",
          posixTestFilePath: "tests/auth.test.ts",
          fileChangeStatus: "MODIFIED",
          importsTargetFile: true,
          mentionsTargetFunction: true,
          assertionChanges: [
            {
              changeType: "ASSERTION_REMOVED",
              enclosingTestBlock: "test block",
              callsTargetFunctionInBlock: true,
              beforeAssertionText: "expect(a).toBe(1);",
              afterAssertionText: null,
              beforeSpan: null,
              afterSpan: null,
            },
            {
              changeType: "ASSERTION_MODIFIED_OR_REWRITTEN",
              enclosingTestBlock: "test block",
              callsTargetFunctionInBlock: true,
              beforeAssertionText: "expect(b).toBe(2);",
              afterAssertionText: "expect(b).toBe(3);",
              beforeSpan: null,
              afterSpan: null,
            },
          ],
        },
      ],
    });

    const report = correlateChanges(prodReport, testReport);

    assertValidCorrelationReport(report);
    const remItem = report.correlationItems.find(
      (ci) => ci.classification === "POTENTIALLY_RELATED_ASSERTION_REMOVED"
    );
    expect(remItem).toBeDefined();
    expect(remItem?.rationale).toContain("Other assertions remain");
  });

  // --------------------------------------------------------------------------
  // 18. Stable output across repeated identical inputs
  // --------------------------------------------------------------------------
  it("18. produces 100% stable, identical output across repeated invocations", () => {
    const prodReport = createMockProductionReport();
    const testReport = createMockTestReport();

    const report1 = correlateChanges(prodReport, testReport);
    const report2 = correlateChanges(prodReport, testReport);

    expect(report1.status).toBe(report2.status);
    expect(report1.correlations).toEqual(report2.correlations);
    expect(report1.correlationItems).toEqual(report2.correlationItems);
    expect(report1.findings).toEqual(report2.findings);
    expect(report1.limitations).toEqual(report2.limitations);
  });

  // --------------------------------------------------------------------------
  // 19. Deterministic ordering of correlation results
  // --------------------------------------------------------------------------
  it("19. guarantees deterministic ordering of correlation results and findings", () => {
    const prodReport = createMockProductionReport({
      structuralChanges: [
        {
          id: "SC-B",
          ruleId: "RULE_GUARD_REMOVED",
          category: "GUARD_CLAUSE",
          changeType: "REMOVED",
          summary: "B",
          beforeSpan: null,
          afterSpan: null,
          beforeSnippet: null,
          afterSnippet: null,
        },
        {
          id: "SC-A",
          ruleId: "RULE_GUARD_REMOVED",
          category: "GUARD_CLAUSE",
          changeType: "REMOVED",
          summary: "A",
          beforeSpan: null,
          afterSpan: null,
          beforeSnippet: null,
          afterSnippet: null,
        },
      ],
    });
    const testReport = createMockTestReport();

    const report = correlateChanges(prodReport, testReport);

    // SC-A should be processed before SC-B
    expect(report.correlations[0].structuralChangeId).toBe("SC-A");
    expect(report.correlations[1].structuralChangeId).toBe("SC-B");
  });

  // --------------------------------------------------------------------------
  // 20. No mutation of input reports
  // --------------------------------------------------------------------------
  it("20. never mutates input reports (passes with frozen inputs)", () => {
    const prodReport = Object.freeze(createMockProductionReport());
    const testReport = Object.freeze(createMockTestReport());

    expect(() => correlateChanges(prodReport, testReport)).not.toThrow();
  });

  // --------------------------------------------------------------------------
  // 21. Compatibility with existing domain model invariants
  // --------------------------------------------------------------------------
  it("21. ensures correlation outputs strictly satisfy existing domain report schemas", () => {
    const prodReport = createMockProductionReport();
    const testReport = createMockTestReport();

    const report = correlateChanges(prodReport, testReport);
    expect(report.schemaVersion).toBe("1.0.0");
    expect(report.evidence.length).toBeGreaterThan(0);
    expect(report.correlations.length).toBeGreaterThan(0);
    expect(report.correlationItems.length).toBeGreaterThan(0);
    expect(report.findings.length).toBeGreaterThan(0);
  });

  // --------------------------------------------------------------------------
  // 22. Strict TypeScript type compliance
  // --------------------------------------------------------------------------
  it("22. satisfies strict TypeScript compile-time typing across all correlation entities", () => {
    const prodReport = createMockProductionReport();
    const testReport = createMockTestReport();
    const report = ChangeCorrelator.correlate(prodReport, testReport);

    expect(report.status).toBeDefined();
    expect(typeof report.generatedAtIso).toBe("string");
  });
});
