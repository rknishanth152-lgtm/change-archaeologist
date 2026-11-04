import { describe, it, expect } from "vitest";
import type {
  AnalysisReport,
  AnalysisRequest,
  Finding,
  Observation,
  InferenceStatement,
  EvidenceItem,
  StructuralChange,
} from "../../../src/core/domain/types.js";
import {
  validateAnalysisReport,
  validateAnalysisRequest,
  assertValidAnalysisReport,
  ValidationError,
} from "../../../src/core/domain/schemas.js";

function createValidReport(): AnalysisReport {
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

  const obs1: Observation = {
    id: "OBS-001",
    category: "OBSERVED",
    statement: "Under condition '!token', throw was replaced with return null.",
    evidenceIds: ["EV-001", "EV-002"],
    span: { startLine: 10, startColumn: 3, endLine: 12, endColumn: 4 },
    snippet: "if (!token) throw new AuthError('Missing');",
  };

  const inf1: InferenceStatement = {
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
      observed: [obs1],
      inferred: [inf1],
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

describe("Domain Model & Schema Referential Integrity", () => {
  it("validates a complete, valid AnalysisReport successfully", () => {
    const report = createValidReport();
    const result = validateAnalysisReport(report);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.schemaVersion).toBe("1.0.0");
      expect(result.data.findings).toHaveLength(1);
    }
  });

  it("assertValidAnalysisReport does not throw on valid report", () => {
    const report = createValidReport();
    expect(() => assertValidAnalysisReport(report)).not.toThrow();
  });

  it("rejects an Observation that has an empty evidenceIds array", () => {
    const report = createValidReport();
    // Simulate invalid observation with no evidence references
    const invalidObs = {
      ...report.findings[0].observed[0],
      evidenceIds: [] as unknown as readonly [string, ...string[]],
    };
    const invalidFinding = {
      ...report.findings[0],
      observed: [invalidObs] as unknown as readonly [Observation, ...Observation[]],
    };
    const invalidReport = {
      ...report,
      findings: [invalidFinding],
    };

    const result = validateAnalysisReport(invalidReport);
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.issues.find((i) => i.code === "EMPTY_ARRAY");
      expect(issue).toBeDefined();
      expect(issue!.path).toBe("report.findings[0].observed[0].evidenceIds");
      expect(issue!.message).toContain("non-empty tuple required");
    }
  });

  it("rejects an Observation referencing an unresolvable evidence ID", () => {
    const report = createValidReport();
    const invalidObs: Observation = {
      ...report.findings[0].observed[0],
      evidenceIds: ["EV-NON-EXISTENT"],
    };
    const invalidFinding: Finding = {
      ...report.findings[0],
      observed: [invalidObs],
    };
    const invalidReport: AnalysisReport = {
      ...report,
      findings: [invalidFinding],
    };

    const result = validateAnalysisReport(invalidReport);
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.issues.find((i) => i.code === "UNRESOLVED_REFERENCE");
      expect(issue).toBeDefined();
      expect(issue!.path).toBe("report.findings[0].observed[0].evidenceIds[0]");
      expect(issue!.message).toContain("Referenced Evidence ID 'EV-NON-EXISTENT' does not exist in report.evidence");
    }
  });

  it("rejects an Inference referencing an unresolvable observation ID", () => {
    const report = createValidReport();
    const invalidInf: InferenceStatement = {
      ...report.findings[0].inferred[0],
      supportingObservationIds: ["OBS-UNKNOWN-999"],
    };
    const invalidFinding: Finding = {
      ...report.findings[0],
      inferred: [invalidInf],
    };
    const invalidReport: AnalysisReport = {
      ...report,
      findings: [invalidFinding],
    };

    const result = validateAnalysisReport(invalidReport);
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.issues.find((i) => i.code === "UNRESOLVED_REFERENCE");
      expect(issue).toBeDefined();
      expect(issue!.path).toBe("report.findings[0].inferred[0].supportingObservationIds[0]");
      expect(issue!.message).toContain("Referenced Observation ID 'OBS-UNKNOWN-999' does not exist in finding's observed items");
    }
  });

  it("rejects an Inference that has an empty supportingObservationIds array", () => {
    const report = createValidReport();
    const invalidInf = {
      ...report.findings[0].inferred[0],
      supportingObservationIds: [] as unknown as readonly [string, ...string[]],
    };
    const invalidFinding = {
      ...report.findings[0],
      inferred: [invalidInf],
    };
    const invalidReport = {
      ...report,
      findings: [invalidFinding],
    };

    const result = validateAnalysisReport(invalidReport);
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.issues.find((i) => i.code === "EMPTY_ARRAY");
      expect(issue).toBeDefined();
      expect(issue!.path).toBe("report.findings[0].inferred[0].supportingObservationIds");
    }
  });

  it("rejects a Finding with an empty unknown array (enforcing epistemic boundary reporting)", () => {
    const report = createValidReport();
    const invalidFinding = {
      ...report.findings[0],
      unknown: [] as unknown as readonly [any, ...any[]],
    };
    const invalidReport = {
      ...report,
      findings: [invalidFinding],
    };

    const result = validateAnalysisReport(invalidReport);
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.issues.find((i) => i.path === "report.findings[0].unknown");
      expect(issue).toBeDefined();
      expect(issue!.code).toBe("EMPTY_ARRAY");
      expect(issue!.message).toContain("admitting analysis boundaries is required");
    }
  });

  it("rejects an AnalysisReport with COMPLETED_WITH_FINDINGS status but empty findings", () => {
    const report = createValidReport();
    const invalidReport = {
      ...report,
      status: "COMPLETED_WITH_FINDINGS" as const,
      findings: [],
    };

    const result = validateAnalysisReport(invalidReport);
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.issues.find((i) => i.code === "INVALID_STATUS_COMBINATION");
      expect(issue).toBeDefined();
      expect(issue!.path).toBe("report.status");
      expect(issue!.message).toContain("findings array is empty");
    }
  });

  it("rejects an AnalysisReport with COMPLETED_NO_STRUCTURAL_CHANGES status when structural changes exist", () => {
    const report = createValidReport();
    const invalidReport = {
      ...report,
      status: "COMPLETED_NO_STRUCTURAL_CHANGES" as const,
      structuralChanges: report.structuralChanges, // contains 1 change!
      findings: [],
    };

    const result = validateAnalysisReport(invalidReport);
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.issues.find((i) => i.code === "INVALID_STATUS_COMBINATION");
      expect(issue).toBeDefined();
      expect(issue!.message).toContain("structuralChanges contains 1 items");
    }
  });

  it("rejects an AnalysisReport with INCOMPLETE_FUNCTION_MISSING status when limitations array is empty", () => {
    const report = createValidReport();
    const invalidReport = {
      ...report,
      status: "INCOMPLETE_FUNCTION_MISSING" as const,
      limitations: [],
      findings: [],
    };

    const result = validateAnalysisReport(invalidReport);
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.issues.find((i) => i.code === "INVALID_STATUS_COMBINATION");
      expect(issue).toBeDefined();
      expect(issue!.path).toBe("report.limitations");
    }
  });

  it("rejects CommitInfo when roles are swapped or SHAs are malformed", () => {
    const report = createValidReport();
    const invalidReport = {
      ...report,
      baseCommit: {
        ...report.baseCommit,
        role: "HEAD" as const, // Swapped role!
        sha: "not-a-valid-sha",
      },
    };

    const result = validateAnalysisReport(invalidReport);
    expect(result.success).toBe(false);
    if (!result.success) {
      const roleIssue = result.issues.find((i) => i.path === "report.baseCommit.role");
      expect(roleIssue).toBeDefined();
      expect(roleIssue!.code).toBe("INVALID_ENUM_VALUE");

      const shaIssue = result.issues.find((i) => i.path === "report.baseCommit.sha");
      expect(shaIssue).toBeDefined();
      expect(shaIssue!.code).toBe("INVALID_FORMAT");
    }
  });

  it("rejects AnalysisRequest with path traversal segments (..)", () => {
    const invalidReq: AnalysisRequest = {
      repoPath: "C:/repo",
      targetFilePath: "../secrets/token.ts", // Path traversal!
      targetFunctionName: "verify",
      baseRevisionInput: "main~1",
      headRevisionInput: "main",
    };

    const result = validateAnalysisRequest(invalidReq);
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.issues.find((i) => i.code === "SECURITY_VIOLATION");
      expect(issue).toBeDefined();
      expect(issue!.message).toContain("cannot contain '..' segments");
    }
  });

  it("rejects AnalysisRequest with revision input starting with dash (-)", () => {
    const invalidReq: AnalysisRequest = {
      repoPath: "C:/repo",
      targetFilePath: "src/token.ts",
      targetFunctionName: "verify",
      baseRevisionInput: "--upload-pack=exploit", // Git flag injection attempt!
      headRevisionInput: "main",
    };

    const result = validateAnalysisRequest(invalidReq);
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.issues.find((i) => i.code === "SECURITY_VIOLATION");
      expect(issue).toBeDefined();
      expect(issue!.message).toContain("cannot start with a dash");
    }
  });

  it("assertValidAnalysisReport throws ValidationError with detailed issue paths", () => {
    const report = createValidReport();
    const invalidReport = {
      ...report,
      schemaVersion: "2.0.0" as any,
      generatedAtIso: "invalid-date",
    };

    expect(() => assertValidAnalysisReport(invalidReport)).toThrowError(ValidationError);
    try {
      assertValidAnalysisReport(invalidReport);
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
      const valErr = err as ValidationError;
      expect(valErr.issues.length).toBeGreaterThanOrEqual(2);
      expect(valErr.message).toContain("report.schemaVersion");
      expect(valErr.message).toContain("report.generatedAtIso");
    }
  });
});

