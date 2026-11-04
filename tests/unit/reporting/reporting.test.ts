import { describe, it, expect } from "vitest";
import type {
  AnalysisReport,
  InvestigationReport,
  TestAnalysisReport,
  CorrelationReport,
  EvidenceItem,
  StructuralChange,
  Finding,
  Observation,
  InferenceStatement,
  AnalysisRequest,
} from "../../../src/core/domain/types.js";
import {
  validateAnalysisReport,
  ValidationError,
} from "../../../src/core/domain/schemas.js";
import {
  assembleInvestigationReport,
  serializeReportToJson,
  serializeReportToMarkdown,
} from "../../../src/core/reporting/index.js";

// ============================================================================
// FIXTURE FACTORIES
// ============================================================================

function createBaseProductionReport(): AnalysisReport {
  const evidence: EvidenceItem[] = [
    {
      id: "EV-001",
      kind: "SOURCE_BEFORE",
      commitRole: "BASE",
      commitSha: "1111111111111111111111111111111111111111",
      posixFilePath: "src/auth/token.ts",
      span: { startLine: 10, startColumn: 3, endLine: 12, endColumn: 4 },
      codeSnippet: "if (!token) throw new AuthError('Missing');",
      description: "Validation guard at BASE lines 10-12",
    },
    {
      id: "EV-002",
      kind: "SOURCE_AFTER",
      commitRole: "HEAD",
      commitSha: "2222222222222222222222222222222222222222",
      posixFilePath: "src/auth/token.ts",
      span: { startLine: 10, startColumn: 3, endLine: 10, endColumn: 20 },
      codeSnippet: "if (!token) return null;",
      description: "Return statement at HEAD line 10",
    },
  ];

  const structuralChanges: StructuralChange[] = [
    {
      id: "SC-001",
      ruleId: "RULE_THROW_TO_RETURN_CONVERSION",
      category: "GUARD_CLAUSE",
      changeType: "MODIFIED",
      summary: "Throw converted to return under condition '!token'",
      beforeSpan: { startLine: 10, startColumn: 3, endLine: 12, endColumn: 4 },
      afterSpan: { startLine: 10, startColumn: 3, endLine: 10, endColumn: 20 },
      beforeSnippet: "if (!token) throw new AuthError('Missing');",
      afterSnippet: "if (!token) return null;",
    },
  ];

  const obs: Observation = {
    id: "OBS-001",
    category: "OBSERVED",
    statement: "Under condition '!token', throw was replaced with return null.",
    evidenceIds: ["EV-001", "EV-002"],
    span: { startLine: 10, startColumn: 3, endLine: 12, endColumn: 4 },
    snippet: "if (!token) throw new AuthError('Missing');",
  };

  const inf: InferenceStatement = {
    id: "INF-001",
    category: "INFERRED",
    statement: "Function now handles invalid token by returning null instead of throwing an error.",
    ruleId: "RULE_THROW_TO_RETURN_CONVERSION",
    supportingObservationIds: ["OBS-001"],
  };

  const findings: Finding[] = [
    {
      id: "FND-001",
      title: "Throw-to-return conversion under condition (!token)",
      category: "GUARD_CLAUSE",
      attentionLevel: "MODERATE_ATTENTION",
      structuralChangeIds: ["SC-001"],
      correlationId: null,
      observed: [obs],
      inferred: [inf],
      unknown: [
        {
          id: "UNK-001",
          category: "UNKNOWN",
          statement: "Static analysis cannot verify whether callers handle the returned null value.",
          reasonCategory: "EXTERNAL_CALLER_BEHAVIOR",
        },
      ],
    },
  ];

  const request: AnalysisRequest = {
    repoPath: "C:/projects/my-app",
    targetFilePath: "src/auth/token.ts",
    targetFunctionName: "verifyToken",
    baseRevisionInput: "main~1",
    headRevisionInput: "main",
  };

  return {
    schemaVersion: "1.0.0",
    generatedAtIso: "2026-11-04T10:00:00.000Z",
    status: "COMPLETED_WITH_FINDINGS",
    request,
    repository: {
      rootPath: "C:/projects/my-app",
      gitVersion: "git version 2.45.0.windows.1",
      isCleanWorkingTreeAtStart: true,
    },
    baseCommit: {
      role: "BASE",
      sha: "1111111111111111111111111111111111111111",
      shortSha: "1111111",
      authorName: "Alice Dev",
      committedAtIso: "2026-11-03T18:00:00.000Z",
      subject: "Require token validation",
    },
    headCommit: {
      role: "HEAD",
      sha: "2222222222222222222222222222222222222222",
      shortSha: "2222222",
      authorName: "Bob Dev",
      committedAtIso: "2026-11-04T09:30:00.000Z",
      subject: "Return null on missing token",
    },
    evidence,
    structuralChanges,
    testChanges: [],
    correlations: [],
    findings,
    limitations: [],
    errors: [],
  };
}

function createBaseTestReport(): TestAnalysisReport {
  return {
    schemaVersion: "1.0.0",
    generatedAtIso: "2026-11-04T10:00:00.000Z",
    status: "COMPLETED_WITH_CHANGES",
    request: {
      repoPath: "C:/projects/my-app",
      baseRevisionInput: "main~1",
      headRevisionInput: "main",
      testFilePaths: ["tests/auth.test.ts"],
      targetFilePath: "src/auth/token.ts",
      targetFunctionName: "verifyToken",
    },
    repository: {
      rootPath: "C:/projects/my-app",
      gitVersion: "git version 2.45.0.windows.1",
    },
    baseCommit: {
      role: "BASE",
      sha: "1111111111111111111111111111111111111111",
      shortSha: "1111111",
      authorName: "Alice Dev",
      committedAtIso: "2026-11-03T18:00:00.000Z",
      subject: "Require token validation",
    },
    headCommit: {
      role: "HEAD",
      sha: "2222222222222222222222222222222222222222",
      shortSha: "2222222",
      authorName: "Bob Dev",
      committedAtIso: "2026-11-04T09:30:00.000Z",
      subject: "Return null on missing token",
    },
    testChanges: [
      {
        id: "TC-001",
        posixTestFilePath: "tests/auth.test.ts",
        fileChangeStatus: "MODIFIED",
        importsTargetFile: true,
        mentionsTargetFunction: true,
        assertionChanges: [
          {
            changeType: "ASSERTION_MODIFIED_OR_REWRITTEN",
            enclosingTestBlock: "handles missing token",
            callsTargetFunctionInBlock: true,
            beforeAssertionText: "expect(() => verifyToken(null)).toThrow()",
            afterAssertionText: "expect(verifyToken(null)).toBeNull()",
            beforeSpan: { startLine: 15, startColumn: 5, endLine: 15, endColumn: 47 },
            afterSpan: { startLine: 15, startColumn: 5, endLine: 15, endColumn: 43 },
          },
        ],
      },
    ],
    declarationChanges: [
      {
        id: "TDC-001",
        posixTestFilePath: "tests/auth.test.ts",
        changeType: "MODIFIED",
        fullTitle: "Auth > handles missing token",
        beforeDescription: "throws error on missing token",
        afterDescription: "handles missing token",
        beforeSpan: { startLine: 14, startColumn: 3, endLine: 16, endColumn: 4 },
        afterSpan: { startLine: 14, startColumn: 3, endLine: 16, endColumn: 4 },
      },
    ],
    evidence: [
      {
        id: "EV-TEST-001",
        kind: "TEST_BEFORE",
        commitRole: "BASE",
        commitSha: "1111111111111111111111111111111111111111",
        posixFilePath: "tests/auth.test.ts",
        span: { startLine: 15, startColumn: 5, endLine: 15, endColumn: 47 },
        codeSnippet: "expect(() => verifyToken(null)).toThrow();",
        description: "Assertion before in tests/auth.test.ts",
      },
      {
        id: "EV-TEST-002",
        kind: "TEST_AFTER",
        commitRole: "HEAD",
        commitSha: "2222222222222222222222222222222222222222",
        posixFilePath: "tests/auth.test.ts",
        span: { startLine: 15, startColumn: 5, endLine: 15, endColumn: 43 },
        codeSnippet: "expect(verifyToken(null)).toBeNull();",
        description: "Assertion after in tests/auth.test.ts",
      },
    ],
    findings: [],
    limitations: [],
    errors: [],
  };
}

function createBaseCorrelationReport(): CorrelationReport {
  return {
    schemaVersion: "1.0.0",
    generatedAtIso: "2026-11-04T10:00:00.000Z",
    status: "COMPLETE_CORRELATED",
    repository: {
      rootPath: "C:/projects/my-app",
      gitVersion: "git version 2.45.0.windows.1",
    },
    baseCommit: {
      role: "BASE",
      sha: "1111111111111111111111111111111111111111",
      shortSha: "1111111",
      authorName: "Alice Dev",
      committedAtIso: "2026-11-03T18:00:00.000Z",
      subject: "Require token validation",
    },
    headCommit: {
      role: "HEAD",
      sha: "2222222222222222222222222222222222222222",
      shortSha: "2222222",
      authorName: "Bob Dev",
      committedAtIso: "2026-11-04T09:30:00.000Z",
      subject: "Return null on missing token",
    },
    correlations: [
      {
        id: "CORR-001",
        structuralChangeId: "SC-001",
        status: "STRONG",
        relatedTestChangeIds: ["TC-001"],
        untouchedCompanionTestFiles: [],
        rationale: "Throw-to-return in verifyToken corresponds to assertion rewritten from toThrow() to toBeNull().",
      },
    ],
    correlationItems: [
      {
        id: "CORR-ITEM-001",
        correlationId: "CORR-001",
        structuralChangeId: "SC-001",
        testChangeId: "TC-001",
        posixTestFilePath: "tests/auth.test.ts",
        classification: "POTENTIALLY_RELATED_ASSERTION_MODIFIED",
        status: "STRONG",
        rationale: "Assertion rewritten from throw expectation to return null expectation.",
        observedFact: "Assertion changed from toThrow to toBeNull in test block calling verifyToken.",
        inferredRelationship: "Test assertion was updated in tandem with function throw-to-return conversion.",
        unknowns: ["Static analysis cannot verify runtime execution of the test."],
        evidenceIds: ["EV-001", "EV-002"],
      },
    ],
    findings: [],
    evidence: [],
    limitations: [],
    errors: [],
  };
}

function deepFreeze<T>(obj: T): T {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }
  Object.freeze(obj);
  for (const key of Object.keys(obj as object)) {
    const val = (obj as Record<string, unknown>)[key];
    if (val !== null && typeof val === "object" && !Object.isFrozen(val)) {
      deepFreeze(val);
    }
  }
  return obj;
}

// ============================================================================
// TEST SUITE: MILESTONE 7 REPORTING & SERIALIZATION
// ============================================================================

describe("Milestone 7: Unified Investigation Report, JSON and Markdown Serialization", () => {
  // 1. Valid report assembly
  it("1. assembles a valid unified investigation report from production, test, and correlation outputs", () => {
    const prod = createBaseProductionReport();
    const test = createBaseTestReport();
    const corr = createBaseCorrelationReport();

    const unified = assembleInvestigationReport({
      productionReport: prod,
      testReport: test,
      correlationReport: corr,
      timestampIso: "2026-11-04T12:00:00.000Z",
    });

    expect(unified.schemaVersion).toBe("1.0.0");
    expect(unified.generatedAtIso).toBe("2026-11-04T12:00:00.000Z");
    expect(unified.status).toBe("COMPLETED_WITH_FINDINGS");
    expect(unified.evidence.length).toBe(4); // EV-001, EV-002, EV-TEST-001, EV-TEST-002
    expect(validateAnalysisReport(unified).success).toBe(true);
  });

  // 2. Report assembly with production structural changes
  it("2. preserves production structural changes in the assembled report", () => {
    const prod = createBaseProductionReport();
    const unified = assembleInvestigationReport({ productionReport: prod });

    expect(unified.structuralChanges.length).toBe(1);
    expect(unified.structuralChanges[0].id).toBe("SC-001");
    expect(unified.structuralChanges[0].ruleId).toBe("RULE_THROW_TO_RETURN_CONVERSION");
  });

  // 3. Report assembly with test changes
  it("3. incorporates test changes and test declaration changes in the assembled report", () => {
    const prod = createBaseProductionReport();
    const test = createBaseTestReport();
    const unified = assembleInvestigationReport({ productionReport: prod, testReport: test });

    expect(unified.testChanges.length).toBe(1);
    expect(unified.testChanges[0].id).toBe("TC-001");
    expect(unified.declarationChanges?.length).toBe(1);
    expect(unified.declarationChanges?.[0].id).toBe("TDC-001");
  });

  // 4. Report assembly with correlation results
  it("4. incorporates correlation results and correlation items in the assembled report", () => {
    const prod = createBaseProductionReport();
    const test = createBaseTestReport();
    const corr = createBaseCorrelationReport();
    const unified = assembleInvestigationReport({
      productionReport: prod,
      testReport: test,
      correlationReport: corr,
    });

    expect(unified.correlations.length).toBe(1);
    expect(unified.correlations[0].id).toBe("CORR-001");
    expect(unified.correlationItems?.length).toBe(1);
    expect(unified.correlationItems?.[0].id).toBe("CORR-ITEM-001");
  });

  // 5. Report assembly with no structural changes
  it("5. preserves COMPLETED_NO_STRUCTURAL_CHANGES status when no structural changes occurred", () => {
    const prod: AnalysisReport = {
      ...createBaseProductionReport(),
      status: "COMPLETED_NO_STRUCTURAL_CHANGES",
      structuralChanges: [],
      findings: [],
    };
    const unified = assembleInvestigationReport({ productionReport: prod });

    expect(unified.status).toBe("COMPLETED_NO_STRUCTURAL_CHANGES");
    expect(unified.structuralChanges.length).toBe(0);
    expect(validateAnalysisReport(unified).success).toBe(true);
  });

  // 6. Report assembly with incomplete production analysis
  it("6. preserves incomplete production analysis status and limitations", () => {
    const prod: AnalysisReport = {
      ...createBaseProductionReport(),
      status: "INCOMPLETE_FUNCTION_MISSING",
      structuralChanges: [],
      findings: [],
      limitations: ["Target function 'verifyToken' not found in HEAD revision."],
    };
    const unified = assembleInvestigationReport({ productionReport: prod });

    expect(unified.status).toBe("INCOMPLETE_FUNCTION_MISSING");
    expect(unified.limitations).toContain("Target function 'verifyToken' not found in HEAD revision.");
    expect(validateAnalysisReport(unified).success).toBe(true);
  });

  // 7. Report assembly with incomplete test analysis
  it("7. preserves incomplete test analysis status and incorporates test errors and limitations", () => {
    const prod = createBaseProductionReport();
    const test: TestAnalysisReport = {
      ...createBaseTestReport(),
      status: "INCOMPLETE_PARSE_ERROR",
      errors: [{ code: "TEST_PARSE_ERROR", message: "Unexpected token in test file", recoverable: false }],
      limitations: ["Syntax error prevented AST parsing of tests/auth.test.ts."],
    };
    const unified = assembleInvestigationReport({ productionReport: prod, testReport: test });

    expect(unified.testAnalysisStatus).toBe("INCOMPLETE_PARSE_ERROR");
    expect(unified.errors.some((e) => e.code === "TEST_PARSE_ERROR")).toBe(true);
    expect(unified.limitations.some((l) => l.includes("tests/auth.test.ts"))).toBe(true);
    expect(validateAnalysisReport(unified).success).toBe(true);
  });

  // 8. Preservation of upstream errors and limitations
  it("8. aggregates limitations and errors from all upstream phases without duplicates", () => {
    const prod: AnalysisReport = {
      ...createBaseProductionReport(),
      limitations: ["Production limitation A"],
      errors: [{ code: "ERR_PROD", message: "Prod issue", recoverable: true }],
    };
    const test: TestAnalysisReport = {
      ...createBaseTestReport(),
      limitations: ["Test limitation B", "Production limitation A"], // duplicate
      errors: [{ code: "ERR_TEST", message: "Test issue", recoverable: false }],
    };
    const corr: CorrelationReport = {
      ...createBaseCorrelationReport(),
      limitations: ["Correlation limitation C"],
      errors: [{ code: "ERR_PROD", message: "Prod issue", recoverable: true }], // duplicate
    };

    const unified = assembleInvestigationReport({
      productionReport: prod,
      testReport: test,
      correlationReport: corr,
    });

    expect(unified.limitations).toEqual([
      "Production limitation A",
      "Test limitation B",
      "Correlation limitation C",
    ]);
    expect(unified.errors.length).toBe(2);
    expect(unified.errors.map((e) => e.code)).toEqual(["ERR_PROD", "ERR_TEST"]);
  });

  // 9. JSON serialization of a valid report
  it("9. serializes a valid report to formatted JSON", () => {
    const prod = createBaseProductionReport();
    const unified = assembleInvestigationReport({ productionReport: prod });
    const json = serializeReportToJson(unified, { indent: 2 });

    expect(typeof json).toBe("string");
    expect(json.startsWith("{\n")).toBe(true);
    expect(json).toContain('"schemaVersion": "1.0.0"');
    expect(json).toContain('"status": "COMPLETED_WITH_FINDINGS"');
  });

  // 10. JSON parse-and-validate round trip
  it("10. supports JSON parse-and-validate round trip", () => {
    const prod = createBaseProductionReport();
    const test = createBaseTestReport();
    const corr = createBaseCorrelationReport();
    const unified = assembleInvestigationReport({
      productionReport: prod,
      testReport: test,
      correlationReport: corr,
    });

    const json = serializeReportToJson(unified);
    const parsed = JSON.parse(json);
    const validation = validateAnalysisReport(parsed);

    expect(validation.success).toBe(true);
    expect(parsed).toEqual(unified);
  });

  // 11. Rejection of an invalid report
  it("11. rejects invalid reports with ValidationError before serialization", () => {
    const prod = createBaseProductionReport();
    const invalidReport = { ...prod, schemaVersion: "9.9.9" } as unknown as AnalysisReport;

    expect(() => serializeReportToJson(invalidReport)).toThrow(ValidationError);
    expect(() => serializeReportToMarkdown(invalidReport)).toThrow(ValidationError);
  });

  // 12. Rejection of dangling evidence references
  it("12. rejects reports containing dangling evidence references", () => {
    const prod = createBaseProductionReport();
    // Point observation to nonexistent evidence
    const invalidFinding: Finding = {
      ...prod.findings[0],
      observed: [
        {
          id: "OBS-001",
          category: "OBSERVED",
          statement: "Some observation",
          evidenceIds: ["EV-DOES-NOT-EXIST"],
        },
      ],
    };
    const invalidReport: AnalysisReport = {
      ...prod,
      findings: [invalidFinding],
    };

    expect(() => serializeReportToJson(invalidReport)).toThrow(ValidationError);
    expect(() => serializeReportToMarkdown(invalidReport)).toThrow(ValidationError);
  });

  // 13. Preservation of all required report fields
  it("13. preserves all required domain report fields in serialized JSON", () => {
    const prod = createBaseProductionReport();
    const test = createBaseTestReport();
    const corr = createBaseCorrelationReport();
    const unified = assembleInvestigationReport({
      productionReport: prod,
      testReport: test,
      correlationReport: corr,
    });
    const json = serializeReportToJson(unified);
    const parsed = JSON.parse(json);

    const requiredFields = [
      "schemaVersion",
      "generatedAtIso",
      "status",
      "request",
      "repository",
      "baseCommit",
      "headCommit",
      "evidence",
      "structuralChanges",
      "testChanges",
      "correlations",
      "findings",
      "limitations",
      "errors",
    ];
    for (const field of requiredFields) {
      expect(parsed).toHaveProperty(field);
    }
  });

  // 14. Markdown output contains the required sections when applicable
  it("14. renders all 10 required sections in the Markdown serialization", () => {
    const prod = createBaseProductionReport();
    const test = createBaseTestReport();
    const corr = createBaseCorrelationReport();
    const unified = assembleInvestigationReport({
      productionReport: prod,
      testReport: test,
      correlationReport: corr,
    });

    const markdown = serializeReportToMarkdown(unified);

    expect(markdown).toContain("# Investigation Summary");
    expect(markdown).toContain("## Repository and Revision Information");
    expect(markdown).toContain("## Production Structural Changes");
    expect(markdown).toContain("## Test Changes");
    expect(markdown).toContain("## Change-to-Test Correlation");
    expect(markdown).toContain("## Observed Evidence");
    expect(markdown).toContain("## Inferred Implications");
    expect(markdown).toContain("## Unknowns and Limitations");
    expect(markdown).toContain("## Errors and Incomplete Analysis");
    expect(markdown).toContain("## Analysis Scope and Method Limitations");
  });

  // 15. OBSERVED, INFERRED, and UNKNOWN statements remain distinguishable
  it("15. strictly and visibly distinguishes OBSERVED, INFERRED, and UNKNOWN statements in Markdown", () => {
    const prod = createBaseProductionReport();
    const unified = assembleInvestigationReport({ productionReport: prod });
    const markdown = serializeReportToMarkdown(unified);

    expect(markdown).toContain("## Observed Evidence");
    expect(markdown).toContain("## Inferred Implications");
    expect(markdown).toContain("[INFERRED] INF-001");
    expect(markdown).toContain("## Unknowns and Limitations");
    expect(markdown).toContain("[UNKNOWN] UNK-001");
  });

  // 16. File paths containing Markdown-special characters
  it("16. safely renders file paths containing Markdown-special characters", () => {
    const prod = createBaseProductionReport();
    const specialProd: AnalysisReport = {
      ...prod,
      request: {
        ...prod.request,
        targetFilePath: "src/[auth]/_token_<spec>*.ts",
      },
      evidence: [
        {
          ...prod.evidence[0],
          posixFilePath: "src/[auth]/_token_<spec>*.ts",
        },
        prod.evidence[1],
      ],
    };
    const unified = assembleInvestigationReport({ productionReport: specialProd });
    const markdown = serializeReportToMarkdown(unified);

    expect(markdown).toContain("`src/[auth]/_token_<spec>*.ts`");
    // Ensure table structure was not broken by unescaped chars
    expect(markdown).toContain("&lt;spec&gt;");
  });

  // 17. Commit subjects containing Markdown-special characters
  it("17. safely escapes commit subjects containing Markdown-special characters", () => {
    const prod = createBaseProductionReport();
    const specialProd: AnalysisReport = {
      ...prod,
      baseCommit: {
        ...prod.baseCommit,
        subject: "fix(auth): <test> & [feature] | with | pipes | #heading",
      },
    };
    const unified = assembleInvestigationReport({ productionReport: specialProd });
    const markdown = serializeReportToMarkdown(unified);

    expect(markdown).toContain("&lt;test&gt;");
    // Ensure headings were not accidentally injected
    expect(markdown).not.toMatch(/\n#heading/);
  });

  // 18. Code snippets containing backticks and Markdown delimiters
  it("18. dynamically expands code fences when snippets contain backticks", () => {
    const prod = createBaseProductionReport();
    const codeWithBackticks = "const md = '```ts\\nconsole.log(`hello ${name}`);\\n```';";
    const specialProd: AnalysisReport = {
      ...prod,
      structuralChanges: [
        {
          ...prod.structuralChanges[0],
          beforeSnippet: codeWithBackticks,
        },
      ],
    };
    const unified = assembleInvestigationReport({ productionReport: specialProd });
    const markdown = serializeReportToMarkdown(unified);

    // Because snippet contains 3 backticks, the fence must use at least 4 backticks
    expect(markdown).toContain("````ts\n" + codeWithBackticks + "\n````");
  });

  // 19. Empty findings and empty change arrays
  it("19. cleanly renders empty findings and empty change arrays without breaking layout", () => {
    const prod: AnalysisReport = {
      ...createBaseProductionReport(),
      status: "COMPLETED_NO_STRUCTURAL_CHANGES",
      structuralChanges: [],
      testChanges: [],
      correlations: [],
      findings: [],
      errors: [],
      limitations: [],
    };
    const unified = assembleInvestigationReport({ productionReport: prod });
    const markdown = serializeReportToMarkdown(unified);

    expect(markdown).toContain("*No production structural changes observed");
    expect(markdown).toContain("*No test changes observed");
    expect(markdown).toContain("*No change-to-test correlations observed");
    expect(markdown).toContain("*No analysis errors recorded.*");
  });

  // 20. Incomplete reports visibly preserve their status
  it("20. visibly displays incomplete status and warnings in Markdown", () => {
    const prod: AnalysisReport = {
      ...createBaseProductionReport(),
      status: "INCOMPLETE_FUNCTION_MISSING",
      structuralChanges: [],
      findings: [],
      limitations: ["Target function missing in HEAD."],
    };
    const unified = assembleInvestigationReport({ productionReport: prod });
    const markdown = serializeReportToMarkdown(unified);

    expect(markdown).toContain("> [!WARNING]");
    expect(markdown).toContain("INCOMPLETE_FUNCTION_MISSING");
  });

  // 21. Serialization does not mutate the input object
  it("21. does not mutate input report during JSON or Markdown serialization", () => {
    const prod = createBaseProductionReport();
    const unified = assembleInvestigationReport({ productionReport: prod });
    deepFreeze(unified);

    expect(() => serializeReportToJson(unified)).not.toThrow();
    expect(() => serializeReportToMarkdown(unified)).not.toThrow();
  });

  // 22. Stable output for identical input and a fixed timestamp
  it("22. produces byte-for-byte identical JSON and Markdown output for identical inputs and fixed timestamp", () => {
    const prod = createBaseProductionReport();
    const test = createBaseTestReport();
    const corr = createBaseCorrelationReport();

    const unified1 = assembleInvestigationReport({
      productionReport: prod,
      testReport: test,
      correlationReport: corr,
      timestampIso: "2026-11-04T12:00:00.000Z",
    });
    const unified2 = assembleInvestigationReport({
      productionReport: prod,
      testReport: test,
      correlationReport: corr,
      timestampIso: "2026-11-04T12:00:00.000Z",
    });

    const json1 = serializeReportToJson(unified1);
    const json2 = serializeReportToJson(unified2);
    expect(json1).toBe(json2);

    const md1 = serializeReportToMarkdown(unified1);
    const md2 = serializeReportToMarkdown(unified2);
    expect(md1).toBe(md2);
  });

  // 23. Correlation references remain valid in the unified report
  it("23. verifies that all correlation references remain valid in the assembled report", () => {
    const prod = createBaseProductionReport();
    const test = createBaseTestReport();
    const corr = createBaseCorrelationReport();

    const unified = assembleInvestigationReport({
      productionReport: prod,
      testReport: test,
      correlationReport: corr,
    });

    const scIds = new Set(unified.structuralChanges.map((sc) => sc.id));
    for (const c of unified.correlations) {
      if (c.structuralChangeId) {
        expect(scIds.has(c.structuralChangeId)).toBe(true);
      }
    }

    const evIds = new Set(unified.evidence.map((e) => e.id));
    for (const item of unified.correlationItems ?? []) {
      for (const evId of item.evidenceIds) {
        expect(evIds.has(evId)).toBe(true);
      }
    }
  });

  // 24. No fabricated evidence when upstream evidence is missing
  it("24. does not fabricate evidence items when optional reports omit evidence", () => {
    const prod = createBaseProductionReport();
    const unified = assembleInvestigationReport({ productionReport: prod });

    expect(unified.evidence.length).toBe(prod.evidence.length);
    expect(unified.evidence.map((e) => e.id)).toEqual(prod.evidence.map((e) => e.id));
  });

  // 25. No unsupported regression or coverage claims
  it("25. avoids unsupported claims regarding regressions, bugs, or test coverage in Markdown serialization", () => {
    const prod = createBaseProductionReport();
    const test = createBaseTestReport();
    const corr = createBaseCorrelationReport();
    const unified = assembleInvestigationReport({
      productionReport: prod,
      testReport: test,
      correlationReport: corr,
    });

    const markdown = serializeReportToMarkdown(unified);

    expect(markdown).not.toMatch(/proves a regression/i);
    expect(markdown).not.toMatch(/bug confirmed/i);
    expect(markdown).not.toMatch(/coverage increased/i);
    expect(markdown).not.toMatch(/coverage decreased/i);
    expect(markdown).not.toMatch(/test coverage of/i);
    expect(markdown).toContain("do not measure or imply runtime test coverage");
  });

  // 26. Existing tests remain passing (verified via full test run)
  it("26. integrates cleanly into the unit test harness", () => {
    expect(typeof assembleInvestigationReport).toBe("function");
    expect(typeof serializeReportToJson).toBe("function");
    expect(typeof serializeReportToMarkdown).toBe("function");
  });

  // 27. TypeScript compilation succeeds (verified via tsc)
  it("27. exports strictly typed InvestigationReport alias and serializers", () => {
    const prod = createBaseProductionReport();
    const investigation: InvestigationReport = assembleInvestigationReport({ productionReport: prod });
    expect(investigation.schemaVersion).toBe("1.0.0");
  });
});
