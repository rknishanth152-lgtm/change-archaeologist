/**
 * Change Archaeologist - Shared Domain Contracts and Evidence Model
 *
 * This module defines the immutable domain entities and contracts for Change Archaeologist.
 *
 * Epistemic Model Principles:
 * 1. Evidence: Traceable supporting artifact (source span, code snippet, Git commit).
 * 2. Observation: Factual statement directly supported by >=1 Evidence item.
 * 3. Inference: Rule-derived interpretation supported by >=1 Observation item.
 * 4. Unknown: Explicit boundary statement of what static analysis cannot prove.
 *
 * Architectural Invariant:
 * Pure TypeScript types with zero dependencies on Git subprocesses, AST parsers,
 * filesystem I/O, or presentation frameworks.
 */

export type SchemaVersion = "1.0.0";
export type RevisionRole = "BASE" | "HEAD";

/**
 * 1-indexed inclusive source code coordinates matching GitHub and standard editors.
 */
export interface SourceSpan {
  readonly startLine: number;
  readonly startColumn: number;
  readonly endLine: number;
  readonly endColumn: number;
}

/**
 * Validated parameters for an analysis run.
 */
export interface AnalysisRequest {
  readonly repoPath: string;
  readonly targetFilePath: string; // POSIX relative path, e.g. "src/auth/token.ts"
  readonly targetFunctionName: string; // e.g. "verifyToken" or "TokenService.verify"
  readonly baseRevisionInput: string;
  readonly headRevisionInput: string;
  readonly outputDir?: string;
  readonly maxDiffFiles?: number;
}

/**
 * Verified local repository metadata.
 */
export interface RepositoryInfo {
  readonly rootPath: string;
  readonly gitVersion: string;
  readonly isCleanWorkingTreeAtStart?: boolean;
}

/**
 * Resolved immutable Git commit metadata.
 */
export interface CommitInfo {
  readonly role: RevisionRole;
  readonly sha: string;      // 40-character lowercase hex SHA
  readonly shortSha: string; // 7-character lowercase hex SHA
  readonly authorName: string;
  readonly committedAtIso: string;
  readonly subject: string;
}

/**
 * Historical snapshot of a source file at a specific commit.
 */
export interface SourceSnapshot {
  readonly role: RevisionRole;
  readonly commitSha: string;
  readonly posixFilePath: string;
  readonly content: string;
  readonly byteLength: number;
  readonly lineCount: number;
}

export type FunctionSyntaxKind =
  | "FUNCTION_DECLARATION"
  | "METHOD_DECLARATION"
  | "ARROW_FUNCTION_VARIABLE"
  | "FUNCTION_EXPRESSION_VARIABLE";

export interface GuardDescriptor {
  readonly fingerprint: string;
  readonly conditionText: string;
  readonly normalizedCondition: string;
  readonly exitKind: "RETURN" | "THROW";
  readonly exitText: string;
  readonly normalizedExit: string;
  readonly isLeadingGuard: boolean;
  readonly nestingDepth: number;
  readonly span: SourceSpan;
  readonly rawText: string;
}

export interface ConditionalDescriptor {
  readonly fingerprint: string;
  readonly constructKind: "IF_STATEMENT" | "TERNARY_EXPRESSION" | "SWITCH_STATEMENT";
  readonly conditionText: string;
  readonly normalizedCondition: string;
  readonly operatorTokens: readonly string[];
  readonly nestingDepth: number;
  readonly span: SourceSpan;
  readonly rawText: string;
}

export interface ThrowDescriptor {
  readonly fingerprint: string;
  readonly thrownExpressionText: string;
  readonly normalizedExpression: string;
  readonly enclosingGuardCondition: string | null;
  readonly nestingDepth: number;
  readonly span: SourceSpan;
  readonly rawText: string;
}

export interface ReturnDescriptor {
  readonly fingerprint: string;
  readonly returnCategory: "VOID_OR_EMPTY" | "NULL_OR_UNDEFINED" | "BOOLEAN_LITERAL" | "EXPRESSION";
  readonly expressionText: string | null;
  readonly normalizedExpression: string | null;
  readonly isEarlyReturn: boolean;
  readonly nestingDepth: number;
  readonly span: SourceSpan;
  readonly rawText: string;
}

/**
 * Extracted structural representation of the target function at a specific revision.
 */
export interface FunctionSnapshot {
  readonly role: RevisionRole;
  readonly commitSha?: string;
  readonly posixFilePath?: string;
  readonly qualifiedName: string;
  readonly functionName?: string;
  readonly kind: FunctionSyntaxKind;
  readonly span: SourceSpan;
  readonly signatureText: string;
  readonly rawBodyText?: string;
  readonly normalizedBodyHash?: string;
  readonly guards: readonly GuardDescriptor[];
  readonly conditionals: readonly ConditionalDescriptor[];
  readonly throws: readonly ThrowDescriptor[];
  readonly returns: readonly ReturnDescriptor[];
}

export type RuleId =
  | "RULE_GUARD_ADDED"
  | "RULE_GUARD_REMOVED"
  | "RULE_GUARD_MODIFIED"
  | "RULE_THROW_TO_RETURN_CONVERSION"
  | "RULE_CONDITIONAL_MODIFIED"
  | "RULE_THROW_ADDED"
  | "RULE_THROW_REMOVED"
  | "RULE_THROW_MODIFIED"
  | "RULE_RETURN_ADDED"
  | "RULE_RETURN_REMOVED"
  | "RULE_RETURN_MODIFIED"
  | "RULE_LINEAGE_LIMITATION"
  | "RULE_TEST_ASSERTION_ADDED"
  | "RULE_TEST_ASSERTION_REMOVED"
  | "RULE_TEST_ASSERTION_MODIFIED"
  | "RULE_TEST_DECLARATION_ADDED"
  | "RULE_TEST_DECLARATION_REMOVED"
  | "RULE_TEST_DECLARATION_MODIFIED"
  | "RULE_TEST_FILE_ADDED"
  | "RULE_TEST_FILE_REMOVED"
  | "RULE_TEST_FILE_MODIFIED"
  | "RULE_CORRELATION_ASSERTION_ADDED"
  | "RULE_CORRELATION_ASSERTION_MODIFIED"
  | "RULE_CORRELATION_ASSERTION_REMOVED"
  | "RULE_CORRELATION_DECLARATION_CHANGED"
  | "RULE_CORRELATION_TEMPORAL_CO_OCCURRENCE"
  | "RULE_CORRELATION_NO_TEST_CHANGES"
  | "RULE_CORRELATION_NO_PRODUCTION_CHANGES"
  | "RULE_CORRELATION_UNCHANGED_COMPANION"
  | "RULE_CORRELATION_AMBIGUOUS_OR_INCOMPLETE";

export type StructuralChangeCategory =
  | "GUARD_CLAUSE"
  | "CONDITIONAL_EXPRESSION"
  | "THROW_STATEMENT"
  | "RETURN_STATEMENT";

/**
 * A discrete AST structural difference between base and head.
 */
export interface StructuralChange {
  readonly id: string; // e.g. "SC-001"
  readonly ruleId: RuleId;
  readonly category: StructuralChangeCategory;
  readonly changeType: "ADDED" | "REMOVED" | "MODIFIED";
  readonly summary: string;
  readonly beforeSpan: SourceSpan | null;
  readonly afterSpan: SourceSpan | null;
  readonly beforeSnippet: string | null;
  readonly afterSnippet: string | null;
  readonly details?: Record<string, unknown>;
}

export type AssertionChangeType =
  | "ASSERTION_ADDED"
  | "ASSERTION_REMOVED"
  | "ASSERTION_MODIFIED_OR_REWRITTEN";

export interface AssertionChangeRecord {
  readonly changeType: AssertionChangeType;
  readonly enclosingTestBlock: string | null;
  readonly callsTargetFunctionInBlock: boolean;
  readonly beforeAssertionText: string | null;
  readonly afterAssertionText: string | null;
  readonly beforeSpan: SourceSpan | null;
  readonly afterSpan: SourceSpan | null;
}

/**
 * Observed change in a companion test file between base and head.
 */
export interface TestChange {
  readonly id: string; // e.g. "TC-001"
  readonly posixTestFilePath: string;
  readonly fileChangeStatus: "MODIFIED" | "ADDED" | "DELETED" | "UNMODIFIED_COMPANION";
  readonly importsTargetFile: boolean;
  readonly mentionsTargetFunction: boolean;
  readonly assertionChanges: readonly AssertionChangeRecord[];
}

export type CorrelationStatus = "STRONG" | "WEAK" | "NONE" | "UNCERTAIN";

export interface CorrelationResult {
  readonly id: string; // e.g. "CORR-001"
  readonly structuralChangeId: string;
  readonly status: CorrelationStatus;
  readonly relatedTestChangeIds: readonly string[];
  readonly untouchedCompanionTestFiles: readonly string[];
  readonly rationale: string;
}

export type EvidenceKind =
  | "SOURCE_BEFORE"
  | "SOURCE_AFTER"
  | "TEST_BEFORE"
  | "TEST_AFTER"
  | "GIT_METADATA";

/**
 * Evidence: inspectable proof anchor linking a claim to a specific commit,
 * file path, line span, and code snippet.
 */
export interface EvidenceItem {
  readonly id: string; // e.g. "EV-001"
  readonly kind: EvidenceKind;
  readonly commitRole: RevisionRole;
  readonly commitSha: string;
  readonly posixFilePath: string;
  readonly span: SourceSpan | null;
  readonly codeSnippet: string | null;
  readonly description: string;
}

/**
 * Observation: a factual statement directly supported by one or more Evidence items.
 *
 * Invariant: Must reference >=1 EvidenceItem ID via `evidenceIds`.
 */
export interface Observation {
  readonly id: string; // e.g. "OBS-001"
  readonly category: "OBSERVED";
  readonly statement: string;
  readonly evidenceIds: readonly [string, ...string[]]; // Non-empty tuple
  readonly span?: SourceSpan | null;
  readonly snippet?: string | null;
}

export type ObservationStatement = Observation;

/**
 * Inference: an interpretation or heuristic hypothesis supported by observations.
 *
 * Invariant: Must reference >=1 Observation ID via `supportingObservationIds`.
 */
export interface InferenceStatement {
  readonly id: string; // e.g. "INF-001"
  readonly category: "INFERRED";
  readonly statement: string;
  readonly ruleId: string;
  readonly supportingObservationIds: readonly [string, ...string[]]; // Non-empty tuple
}

export type UnknownReasonCategory =
  | "EXTERNAL_CALLER_BEHAVIOR"
  | "HELPER_DELEGATION_POSSIBLE"
  | "RUNTIME_TEST_EXECUTION_UNVERIFIED"
  | "TEST_CORRELATION_AMBIGUOUS"
  | "LINEAGE_OR_PARSE_BOUNDARY";

/**
 * Unknown: explicit boundary statement of what static analysis cannot establish.
 */
export interface UnknownStatement {
  readonly id: string; // e.g. "UNK-001"
  readonly category: "UNKNOWN";
  readonly statement: string;
  readonly reasonCategory: UnknownReasonCategory;
}

export type FindingCategory =
  | StructuralChangeCategory
  | "LINEAGE_LIMITATION"
  | "TEST_CORRELATION"
  | "TEST_CHANGE";

export type ReviewAttentionLevel =
  | "HIGH_ATTENTION"
  | "MODERATE_ATTENTION"
  | "INFORMATIONAL";

/**
 * Finding: an investigative conclusion combining OBSERVED, INFERRED, and UNKNOWN statements.
 *
 * Invariants:
 * - `observed` must contain >=1 Observation.
 * - `unknown` must contain >=1 UnknownStatement (enforcing epistemic humility).
 */
export interface Finding {
  readonly id: string; // e.g. "FND-001"
  readonly title: string;
  readonly category: FindingCategory;
  readonly attentionLevel: ReviewAttentionLevel;
  readonly structuralChangeIds: readonly string[];
  readonly correlationId: string | null;
  readonly observed: readonly [Observation, ...Observation[]];
  readonly inferred: readonly InferenceStatement[];
  readonly unknown: readonly [UnknownStatement, ...UnknownStatement[]];
}

export type AnalysisStatus =
  | "COMPLETED_WITH_FINDINGS"
  | "COMPLETED_NO_STRUCTURAL_CHANGES"
  | "INCOMPLETE_FILE_MISSING_IN_ONE_REVISION"
  | "INCOMPLETE_FUNCTION_MISSING"
  | "INCOMPLETE_AMBIGUOUS_TARGET"
  | "INCOMPLETE_PARSE_ERROR";

export interface AnalysisErrorRecord {
  readonly code: string;
  readonly message: string;
  readonly recoverable: boolean;
}

/**
 * Top-level serialized report (unified investigation report).
 */
export interface AnalysisReport {
  readonly schemaVersion: SchemaVersion;
  readonly generatedAtIso: string;
  readonly status: AnalysisStatus;
  readonly request: AnalysisRequest;
  readonly repository: RepositoryInfo;
  readonly baseCommit: CommitInfo;
  readonly headCommit: CommitInfo;
  readonly baseFunction?: FunctionSnapshot | null;
  readonly headFunction?: FunctionSnapshot | null;
  readonly evidence: readonly EvidenceItem[];
  readonly structuralChanges: readonly StructuralChange[];
  readonly testChanges: readonly TestChange[];
  readonly declarationChanges?: readonly TestDeclarationChange[];
  readonly correlations: readonly CorrelationResult[];
  readonly correlationItems?: readonly CorrelationItem[];
  readonly testAnalysisStatus?: TestAnalysisStatus;
  readonly correlationAnalysisStatus?: CorrelationAnalysisStatus;
  readonly findings: readonly Finding[];
  readonly limitations: readonly string[];
  readonly errors: readonly AnalysisErrorRecord[];
}

/**
 * Unified investigation report combining production function comparison,
 * companion test changes, and conservative correlations.
 */
export type InvestigationReport = AnalysisReport;

/**
 * Validated parameters for a test-change analysis run.
 */
export interface TestAnalysisRequest {
  readonly repoPath: string;
  readonly baseRevisionInput: string;
  readonly headRevisionInput: string;
  readonly testFilePaths: readonly string[]; // POSIX relative paths, e.g. ["tests/auth.test.ts"]
  readonly targetFilePath?: string;          // Optional production file path for import detection
  readonly targetFunctionName?: string;      // Optional production function name for call detection
}

export type TestAnalysisStatus =
  | "COMPLETED_WITH_CHANGES"
  | "COMPLETED_NO_CHANGES"
  | "INCOMPLETE_PARSE_ERROR"
  | "INCOMPLETE_FILE_MISSING";

/**
 * A discrete change in a test declaration (it/test/describe) between base and head.
 */
export interface TestDeclarationChange {
  readonly id: string; // e.g. "TDC-001"
  readonly posixTestFilePath: string;
  readonly changeType: "ADDED" | "REMOVED" | "MODIFIED";
  readonly fullTitle: string;
  readonly beforeDescription: string | null;
  readonly afterDescription: string | null;
  readonly beforeSpan: SourceSpan | null;
  readonly afterSpan: SourceSpan | null;
  readonly details?: string;
}

/**
 * Top-level report for test-change analysis across Git revisions.
 */
export interface TestAnalysisReport {
  readonly schemaVersion: SchemaVersion;
  readonly generatedAtIso: string;
  readonly status: TestAnalysisStatus;
  readonly request: TestAnalysisRequest;
  readonly repository: RepositoryInfo;
  readonly baseCommit: CommitInfo;
  readonly headCommit: CommitInfo;
  readonly testChanges: readonly TestChange[];
  readonly declarationChanges: readonly TestDeclarationChange[];
  readonly evidence: readonly EvidenceItem[];
  readonly findings: readonly Finding[];
  readonly limitations: readonly string[];
  readonly errors: readonly AnalysisErrorRecord[];
}

export type CorrelationClassification =
  | "POTENTIALLY_RELATED_ASSERTION_ADDED"
  | "POTENTIALLY_RELATED_ASSERTION_MODIFIED"
  | "POTENTIALLY_RELATED_ASSERTION_REMOVED"
  | "POTENTIALLY_RELATED_TEST_DECLARATION_CHANGED"
  | "TEMPORAL_CO_OCCURRENCE_ONLY"
  | "UNMODIFIED_COMPANION_TEST"
  | "NO_TEST_CHANGES_OBSERVED"
  | "NO_PRODUCTION_CHANGES_OBSERVED"
  | "AMBIGUOUS_OR_UNRESOLVED";

export type CorrelationAnalysisStatus =
  | "COMPLETE_CORRELATED"
  | "COMPLETE_NO_CORRELATIONS"
  | "INCOMPLETE_UPSTREAM_ANALYSIS"
  | "INCOMPLETE_AMBIGUOUS_MATCHES";

/**
 * A discrete correlation item explaining the relationship between a production change
 * and a test change.
 */
export interface CorrelationItem {
  readonly id: string; // e.g. "CORR-ITEM-001"
  readonly correlationId: string; // references CorrelationResult.id, e.g. "CORR-001"
  readonly structuralChangeId: string | null;
  readonly testChangeId: string | null;
  readonly posixTestFilePath: string | null;
  readonly classification: CorrelationClassification;
  readonly status: CorrelationStatus;
  readonly rationale: string;
  readonly observedFact: string;
  readonly inferredRelationship: string;
  readonly unknowns: readonly string[];
  readonly evidenceIds: readonly string[];
}

/**
 * Top-level report for change-to-test correlation.
 */
export interface CorrelationReport {
  readonly schemaVersion: SchemaVersion;
  readonly generatedAtIso: string;
  readonly status: CorrelationAnalysisStatus;
  readonly repository: RepositoryInfo;
  readonly baseCommit: CommitInfo;
  readonly headCommit: CommitInfo;
  readonly correlations: readonly CorrelationResult[];
  readonly correlationItems: readonly CorrelationItem[];
  readonly findings: readonly Finding[];
  readonly evidence: readonly EvidenceItem[];
  readonly limitations: readonly string[];
  readonly errors: readonly AnalysisErrorRecord[];
}



