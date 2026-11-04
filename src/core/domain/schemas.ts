/**
 * Change Archaeologist - Runtime Schema Validation & Epistemic Integrity Engine
 *
 * Implements pure TypeScript runtime schema and referential-integrity validation
 * without external third-party dependencies, adhering to the project's zero-dependency
 * domain invariant.
 *
 * Enforces:
 * 1. Structural schema compliance (types, mandatory properties, enum variants).
 * 2. Referential integrity:
 *    - Every Observation must cite >=1 existing EvidenceItem ID.
 *    - Every Inference must cite >=1 existing Observation ID within its finding.
 *    - Every Finding structuralChangeId must exist in the report's structuralChanges.
 * 3. Epistemic constraints:
 *    - Inferences cannot be emitted without supporting observations.
 *    - Every finding must declare >=1 unknown/limitation boundary.
 * 4. Status combination validity (e.g. COMPLETED_NO_STRUCTURAL_CHANGES cannot carry structural findings).
 * 5. Input safety constraints (path traversal and Git flag injection checks).
 */

import type {
  AnalysisReport,
  AnalysisRequest,
  CommitInfo,
  EvidenceItem,
  Finding,
  InferenceStatement,
  Observation,
  RepositoryInfo,
  RevisionRole,
  SourceSpan,
  StructuralChange,
  TestChange,
  CorrelationResult,
  UnknownStatement,
  AnalysisStatus,
  AnalysisErrorRecord,
  EvidenceKind,
  FindingCategory,
  ReviewAttentionLevel,
  RuleId,
  StructuralChangeCategory,
  UnknownReasonCategory,
  FunctionSnapshot,
  TestAnalysisReport,
  TestAnalysisRequest,
  TestAnalysisStatus,
  TestDeclarationChange,
  AssertionChangeRecord,
  AssertionChangeType,
  CorrelationReport,
  CorrelationItem,
  CorrelationAnalysisStatus,
  CorrelationClassification,
  CorrelationStatus,
} from "./types.js";

// ============================================================================
// VALIDATION RESULT TYPES AND ERROR CLASSES
// ============================================================================

export type ValidationIssueCode =
  | "INVALID_TYPE"
  | "MISSING_REQUIRED_FIELD"
  | "INVALID_FORMAT"
  | "INVALID_ENUM_VALUE"
  | "EMPTY_ARRAY"
  | "UNRESOLVED_REFERENCE"
  | "INVALID_STATUS_COMBINATION"
  | "SECURITY_VIOLATION";

export interface ValidationIssue {
  readonly path: string;
  readonly message: string;
  readonly code: ValidationIssueCode;
}

export interface ValidationSuccess<T> {
  readonly success: true;
  readonly data: T;
}

export interface ValidationFailure {
  readonly success: false;
  readonly issues: readonly ValidationIssue[];
}

export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

export class ValidationError extends Error {
  readonly issues: readonly ValidationIssue[];

  constructor(message: string, issues: readonly ValidationIssue[]) {
    const formattedIssues = issues
      .map((i) => `  - [${i.code}] ${i.path}: ${i.message}`)
      .join("\n");
    super(`${message}\n${formattedIssues}`);
    this.name = "ValidationError";
    this.issues = issues;
  }
}

// ============================================================================
// INTERNAL VALIDATION HELPERS
// ============================================================================

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && !Number.isNaN(value);
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

const HEX_SHA_40_REGEX = /^[0-9a-f]{40}$/i;
const SHORT_SHA_7_REGEX = /^[0-9a-f]{7,12}$/i;
const SAFE_REVISION_REGEX = /^[a-zA-Z0-9_.~^/@-]+$/;

const VALID_REVISION_ROLES: ReadonlySet<RevisionRole> = new Set(["BASE", "HEAD"]);

const VALID_EVIDENCE_KINDS: ReadonlySet<EvidenceKind> = new Set([
  "SOURCE_BEFORE",
  "SOURCE_AFTER",
  "TEST_BEFORE",
  "TEST_AFTER",
  "GIT_METADATA",
]);

const VALID_STRUCTURAL_CHANGE_CATEGORIES: ReadonlySet<StructuralChangeCategory> = new Set([
  "GUARD_CLAUSE",
  "CONDITIONAL_EXPRESSION",
  "THROW_STATEMENT",
  "RETURN_STATEMENT",
]);

const VALID_FINDING_CATEGORIES: ReadonlySet<FindingCategory> = new Set([
  "GUARD_CLAUSE",
  "CONDITIONAL_EXPRESSION",
  "THROW_STATEMENT",
  "RETURN_STATEMENT",
  "LINEAGE_LIMITATION",
  "TEST_CORRELATION",
  "TEST_CHANGE",
]);

const VALID_ATTENTION_LEVELS: ReadonlySet<ReviewAttentionLevel> = new Set([
  "HIGH_ATTENTION",
  "MODERATE_ATTENTION",
  "INFORMATIONAL",
]);

const VALID_UNKNOWN_REASON_CATEGORIES: ReadonlySet<UnknownReasonCategory> = new Set([
  "EXTERNAL_CALLER_BEHAVIOR",
  "HELPER_DELEGATION_POSSIBLE",
  "RUNTIME_TEST_EXECUTION_UNVERIFIED",
  "TEST_CORRELATION_AMBIGUOUS",
  "LINEAGE_OR_PARSE_BOUNDARY",
]);

const VALID_ANALYSIS_STATUSES: ReadonlySet<AnalysisStatus> = new Set([
  "COMPLETED_WITH_FINDINGS",
  "COMPLETED_NO_STRUCTURAL_CHANGES",
  "INCOMPLETE_FILE_MISSING_IN_ONE_REVISION",
  "INCOMPLETE_FUNCTION_MISSING",
  "INCOMPLETE_AMBIGUOUS_TARGET",
  "INCOMPLETE_PARSE_ERROR",
]);

const VALID_TEST_ANALYSIS_STATUSES: ReadonlySet<TestAnalysisStatus> = new Set([
  "COMPLETED_WITH_CHANGES",
  "COMPLETED_NO_CHANGES",
  "INCOMPLETE_PARSE_ERROR",
  "INCOMPLETE_FILE_MISSING",
]);

const VALID_RULE_IDS: ReadonlySet<RuleId> = new Set([
  "RULE_GUARD_ADDED",
  "RULE_GUARD_REMOVED",
  "RULE_GUARD_MODIFIED",
  "RULE_THROW_TO_RETURN_CONVERSION",
  "RULE_CONDITIONAL_MODIFIED",
  "RULE_THROW_ADDED",
  "RULE_THROW_REMOVED",
  "RULE_THROW_MODIFIED",
  "RULE_RETURN_ADDED",
  "RULE_RETURN_REMOVED",
  "RULE_RETURN_MODIFIED",
  "RULE_LINEAGE_LIMITATION",
  "RULE_TEST_ASSERTION_ADDED",
  "RULE_TEST_ASSERTION_REMOVED",
  "RULE_TEST_ASSERTION_MODIFIED",
  "RULE_TEST_DECLARATION_ADDED",
  "RULE_TEST_DECLARATION_REMOVED",
  "RULE_TEST_DECLARATION_MODIFIED",
  "RULE_TEST_FILE_ADDED",
  "RULE_TEST_FILE_REMOVED",
  "RULE_TEST_FILE_MODIFIED",
  "RULE_CORRELATION_ASSERTION_ADDED",
  "RULE_CORRELATION_ASSERTION_MODIFIED",
  "RULE_CORRELATION_ASSERTION_REMOVED",
  "RULE_CORRELATION_DECLARATION_CHANGED",
  "RULE_CORRELATION_TEMPORAL_CO_OCCURRENCE",
  "RULE_CORRELATION_NO_TEST_CHANGES",
  "RULE_CORRELATION_NO_PRODUCTION_CHANGES",
  "RULE_CORRELATION_UNCHANGED_COMPANION",
  "RULE_CORRELATION_AMBIGUOUS_OR_INCOMPLETE",
]);

const VALID_CORRELATION_STATUSES: ReadonlySet<CorrelationStatus> = new Set([
  "STRONG",
  "WEAK",
  "NONE",
  "UNCERTAIN",
]);

const VALID_CORRELATION_ANALYSIS_STATUSES: ReadonlySet<CorrelationAnalysisStatus> = new Set([
  "COMPLETE_CORRELATED",
  "COMPLETE_NO_CORRELATIONS",
  "INCOMPLETE_UPSTREAM_ANALYSIS",
  "INCOMPLETE_AMBIGUOUS_MATCHES",
]);

const VALID_CORRELATION_CLASSIFICATIONS: ReadonlySet<CorrelationClassification> = new Set([
  "POTENTIALLY_RELATED_ASSERTION_ADDED",
  "POTENTIALLY_RELATED_ASSERTION_MODIFIED",
  "POTENTIALLY_RELATED_ASSERTION_REMOVED",
  "POTENTIALLY_RELATED_TEST_DECLARATION_CHANGED",
  "TEMPORAL_CO_OCCURRENCE_ONLY",
  "UNMODIFIED_COMPANION_TEST",
  "NO_TEST_CHANGES_OBSERVED",
  "NO_PRODUCTION_CHANGES_OBSERVED",
  "AMBIGUOUS_OR_UNRESOLVED",
]);

// ============================================================================
// COMPONENT VALIDATORS
// ============================================================================

export function validateSourceSpan(input: unknown, path: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!isRecord(input)) {
    issues.push({ path, message: "Expected SourceSpan object", code: "INVALID_TYPE" });
    return issues;
  }

  for (const field of ["startLine", "startColumn", "endLine", "endColumn"] as const) {
    if (!isNumber(input[field]) || input[field] < 1) {
      issues.push({
        path: `${path}.${field}`,
        message: `${field} must be a 1-indexed positive number`,
        code: "INVALID_FORMAT",
      });
    }
  }

  if (
    isNumber(input.startLine) &&
    isNumber(input.endLine) &&
    input.startLine > input.endLine
  ) {
    issues.push({
      path: `${path}.startLine`,
      message: `startLine (${input.startLine}) cannot be greater than endLine (${input.endLine})`,
      code: "INVALID_FORMAT",
    });
  }

  return issues;
}

export function validateAnalysisRequest(input: unknown, path: string = "request"): ValidationResult<AnalysisRequest> {
  const issues: ValidationIssue[] = [];
  if (!isRecord(input)) {
    issues.push({ path, message: "Expected AnalysisRequest object", code: "INVALID_TYPE" });
    return { success: false, issues };
  }

  const { repoPath, targetFilePath, targetFunctionName, baseRevisionInput, headRevisionInput } = input;

  if (!isString(repoPath) || repoPath.trim() === "") {
    issues.push({ path: `${path}.repoPath`, message: "repoPath must be a non-empty string", code: "MISSING_REQUIRED_FIELD" });
  }

  if (!isString(targetFilePath) || targetFilePath.trim() === "") {
    issues.push({ path: `${path}.targetFilePath`, message: "targetFilePath must be a non-empty string", code: "MISSING_REQUIRED_FIELD" });
  } else {
    // Path traversal check
    if (targetFilePath.includes("..") || targetFilePath.startsWith("/") || targetFilePath.startsWith("\\")) {
      issues.push({
        path: `${path}.targetFilePath`,
        message: "targetFilePath must be a relative path and cannot contain '..' segments or leading slashes",
        code: "SECURITY_VIOLATION",
      });
    }
  }

  if (!isString(targetFunctionName) || targetFunctionName.trim() === "") {
    issues.push({ path: `${path}.targetFunctionName`, message: "targetFunctionName must be a non-empty string", code: "MISSING_REQUIRED_FIELD" });
  }

  for (const revField of ["baseRevisionInput", "headRevisionInput"] as const) {
    const val = input[revField];
    if (!isString(val) || val.trim() === "") {
      issues.push({ path: `${path}.${revField}`, message: `${revField} must be a non-empty string`, code: "MISSING_REQUIRED_FIELD" });
    } else {
      if (val.startsWith("-")) {
        issues.push({
          path: `${path}.${revField}`,
          message: `${revField} cannot start with a dash '-' to prevent Git option injection`,
          code: "SECURITY_VIOLATION",
        });
      }
      if (!SAFE_REVISION_REGEX.test(val)) {
        issues.push({
          path: `${path}.${revField}`,
          message: `${revField} contains invalid characters; must match ${SAFE_REVISION_REGEX}`,
          code: "INVALID_FORMAT",
        });
      }
    }
  }

  if (issues.length > 0) {
    return { success: false, issues };
  }

  return { success: true, data: input as unknown as AnalysisRequest };
}

export function validateCommitInfo(input: unknown, expectedRole: RevisionRole, path: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!isRecord(input)) {
    issues.push({ path, message: "Expected CommitInfo object", code: "INVALID_TYPE" });
    return issues;
  }

  if (input.role !== expectedRole) {
    issues.push({
      path: `${path}.role`,
      message: `Expected role '${expectedRole}', but received '${String(input.role)}'`,
      code: "INVALID_ENUM_VALUE",
    });
  }

  if (!isString(input.sha) || !HEX_SHA_40_REGEX.test(input.sha)) {
    issues.push({
      path: `${path}.sha`,
      message: "sha must be a 40-character hexadecimal string",
      code: "INVALID_FORMAT",
    });
  }

  if (!isString(input.shortSha) || !SHORT_SHA_7_REGEX.test(input.shortSha)) {
    issues.push({
      path: `${path}.shortSha`,
      message: "shortSha must be a 7-to-12 character hexadecimal string",
      code: "INVALID_FORMAT",
    });
  }

  if (!isString(input.authorName) || input.authorName.trim() === "") {
    issues.push({ path: `${path}.authorName`, message: "authorName must be a non-empty string", code: "MISSING_REQUIRED_FIELD" });
  }

  if (!isString(input.committedAtIso) || Number.isNaN(Date.parse(input.committedAtIso))) {
    issues.push({ path: `${path}.committedAtIso`, message: "committedAtIso must be a valid ISO-8601 date string", code: "INVALID_FORMAT" });
  }

  if (!isString(input.subject)) {
    issues.push({ path: `${path}.subject`, message: "subject must be a string", code: "MISSING_REQUIRED_FIELD" });
  }

  return issues;
}

export function validateEvidenceItem(input: unknown, path: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!isRecord(input)) {
    issues.push({ path, message: "Expected EvidenceItem object", code: "INVALID_TYPE" });
    return issues;
  }

  if (!isString(input.id) || input.id.trim() === "") {
    issues.push({ path: `${path}.id`, message: "id must be a non-empty string", code: "MISSING_REQUIRED_FIELD" });
  }

  if (!VALID_EVIDENCE_KINDS.has(input.kind as EvidenceKind)) {
    issues.push({
      path: `${path}.kind`,
      message: `kind must be one of: ${Array.from(VALID_EVIDENCE_KINDS).join(", ")}`,
      code: "INVALID_ENUM_VALUE",
    });
  }

  if (!VALID_REVISION_ROLES.has(input.commitRole as RevisionRole)) {
    issues.push({
      path: `${path}.commitRole`,
      message: "commitRole must be 'BASE' or 'HEAD'",
      code: "INVALID_ENUM_VALUE",
    });
  }

  if (!isString(input.commitSha) || !HEX_SHA_40_REGEX.test(input.commitSha)) {
    issues.push({
      path: `${path}.commitSha`,
      message: "commitSha must be a 40-character hexadecimal string",
      code: "INVALID_FORMAT",
    });
  }

  if (!isString(input.posixFilePath) || input.posixFilePath.trim() === "") {
    issues.push({ path: `${path}.posixFilePath`, message: "posixFilePath must be a non-empty string", code: "MISSING_REQUIRED_FIELD" });
  }

  if (input.span !== null && input.span !== undefined) {
    issues.push(...validateSourceSpan(input.span, `${path}.span`));
  }

  if (!isString(input.description) || input.description.trim() === "") {
    issues.push({ path: `${path}.description`, message: "description must be a non-empty string", code: "MISSING_REQUIRED_FIELD" });
  }

  return issues;
}

export function validateStructuralChange(input: unknown, path: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!isRecord(input)) {
    issues.push({ path, message: "Expected StructuralChange object", code: "INVALID_TYPE" });
    return issues;
  }

  if (!isString(input.id) || input.id.trim() === "") {
    issues.push({ path: `${path}.id`, message: "id must be a non-empty string", code: "MISSING_REQUIRED_FIELD" });
  }

  if (!VALID_RULE_IDS.has(input.ruleId as RuleId)) {
    issues.push({
      path: `${path}.ruleId`,
      message: `ruleId must be a valid RuleId, got: ${String(input.ruleId)}`,
      code: "INVALID_ENUM_VALUE",
    });
  }

  if (!VALID_STRUCTURAL_CHANGE_CATEGORIES.has(input.category as StructuralChangeCategory)) {
    issues.push({
      path: `${path}.category`,
      message: `category must be one of: ${Array.from(VALID_STRUCTURAL_CHANGE_CATEGORIES).join(", ")}`,
      code: "INVALID_ENUM_VALUE",
    });
  }

  if (input.changeType !== "ADDED" && input.changeType !== "REMOVED" && input.changeType !== "MODIFIED") {
    issues.push({
      path: `${path}.changeType`,
      message: "changeType must be 'ADDED', 'REMOVED', or 'MODIFIED'",
      code: "INVALID_ENUM_VALUE",
    });
  }

  if (!isString(input.summary) || input.summary.trim() === "") {
    issues.push({ path: `${path}.summary`, message: "summary must be a non-empty string", code: "MISSING_REQUIRED_FIELD" });
  }

  if (input.beforeSpan !== null && input.beforeSpan !== undefined) {
    issues.push(...validateSourceSpan(input.beforeSpan, `${path}.beforeSpan`));
  }
  if (input.afterSpan !== null && input.afterSpan !== undefined) {
    issues.push(...validateSourceSpan(input.afterSpan, `${path}.afterSpan`));
  }

  return issues;
}

export interface ReferentialContext {
  readonly availableEvidenceIds: ReadonlySet<string>;
  readonly availableStructuralChangeIds: ReadonlySet<string>;
  readonly availableCorrelationIds: ReadonlySet<string>;
}

export function validateObservation(
  input: unknown,
  availableEvidenceIds: ReadonlySet<string>,
  path: string
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!isRecord(input)) {
    issues.push({ path, message: "Expected Observation object", code: "INVALID_TYPE" });
    return issues;
  }

  if (!isString(input.id) || input.id.trim() === "") {
    issues.push({ path: `${path}.id`, message: "id must be a non-empty string", code: "MISSING_REQUIRED_FIELD" });
  }

  if (input.category !== "OBSERVED") {
    issues.push({ path: `${path}.category`, message: "Observation category must be 'OBSERVED'", code: "INVALID_ENUM_VALUE" });
  }

  if (!isString(input.statement) || input.statement.trim() === "") {
    issues.push({ path: `${path}.statement`, message: "statement must be a non-empty string", code: "MISSING_REQUIRED_FIELD" });
  }

  // Non-empty evidenceIds requirement
  if (!Array.isArray(input.evidenceIds) || input.evidenceIds.length === 0) {
    issues.push({
      path: `${path}.evidenceIds`,
      message: "Observation must reference at least one valid EvidenceItem ID (non-empty tuple required)",
      code: "EMPTY_ARRAY",
    });
  } else {
    for (let i = 0; i < input.evidenceIds.length; i++) {
      const evId = input.evidenceIds[i];
      if (!isString(evId) || evId.trim() === "") {
        issues.push({ path: `${path}.evidenceIds[${i}]`, message: "evidenceId must be a non-empty string", code: "INVALID_TYPE" });
      } else if (!availableEvidenceIds.has(evId)) {
        issues.push({
          path: `${path}.evidenceIds[${i}]`,
          message: `Referenced Evidence ID '${evId}' does not exist in report.evidence`,
          code: "UNRESOLVED_REFERENCE",
        });
      }
    }
  }

  return issues;
}

export function validateInferenceStatement(
  input: unknown,
  availableObservationIds: ReadonlySet<string>,
  path: string
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!isRecord(input)) {
    issues.push({ path, message: "Expected InferenceStatement object", code: "INVALID_TYPE" });
    return issues;
  }

  if (!isString(input.id) || input.id.trim() === "") {
    issues.push({ path: `${path}.id`, message: "id must be a non-empty string", code: "MISSING_REQUIRED_FIELD" });
  }

  if (input.category !== "INFERRED") {
    issues.push({ path: `${path}.category`, message: "Inference category must be 'INFERRED'", code: "INVALID_ENUM_VALUE" });
  }

  if (!isString(input.statement) || input.statement.trim() === "") {
    issues.push({ path: `${path}.statement`, message: "statement must be a non-empty string", code: "MISSING_REQUIRED_FIELD" });
  }

  if (!isString(input.ruleId) || input.ruleId.trim() === "") {
    issues.push({ path: `${path}.ruleId`, message: "ruleId must be a non-empty string", code: "MISSING_REQUIRED_FIELD" });
  }

  // Non-empty supportingObservationIds requirement
  if (!Array.isArray(input.supportingObservationIds) || input.supportingObservationIds.length === 0) {
    issues.push({
      path: `${path}.supportingObservationIds`,
      message: "Inference must reference at least one valid Observation ID (non-empty tuple required)",
      code: "EMPTY_ARRAY",
    });
  } else {
    for (let i = 0; i < input.supportingObservationIds.length; i++) {
      const obsId = input.supportingObservationIds[i];
      if (!isString(obsId) || obsId.trim() === "") {
        issues.push({ path: `${path}.supportingObservationIds[${i}]`, message: "observationId must be a non-empty string", code: "INVALID_TYPE" });
      } else if (!availableObservationIds.has(obsId)) {
        issues.push({
          path: `${path}.supportingObservationIds[${i}]`,
          message: `Referenced Observation ID '${obsId}' does not exist in finding's observed items`,
          code: "UNRESOLVED_REFERENCE",
        });
      }
    }
  }

  return issues;
}

export function validateUnknownStatement(input: unknown, path: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!isRecord(input)) {
    issues.push({ path, message: "Expected UnknownStatement object", code: "INVALID_TYPE" });
    return issues;
  }

  if (!isString(input.id) || input.id.trim() === "") {
    issues.push({ path: `${path}.id`, message: "id must be a non-empty string", code: "MISSING_REQUIRED_FIELD" });
  }

  if (input.category !== "UNKNOWN") {
    issues.push({ path: `${path}.category`, message: "category must be 'UNKNOWN'", code: "INVALID_ENUM_VALUE" });
  }

  if (!isString(input.statement) || input.statement.trim() === "") {
    issues.push({ path: `${path}.statement`, message: "statement must be a non-empty string", code: "MISSING_REQUIRED_FIELD" });
  }

  if (!VALID_UNKNOWN_REASON_CATEGORIES.has(input.reasonCategory as UnknownReasonCategory)) {
    issues.push({
      path: `${path}.reasonCategory`,
      message: `reasonCategory must be one of: ${Array.from(VALID_UNKNOWN_REASON_CATEGORIES).join(", ")}`,
      code: "INVALID_ENUM_VALUE",
    });
  }

  return issues;
}

export function validateFinding(
  input: unknown,
  context: ReferentialContext,
  path: string
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!isRecord(input)) {
    issues.push({ path, message: "Expected Finding object", code: "INVALID_TYPE" });
    return issues;
  }

  if (!isString(input.id) || input.id.trim() === "") {
    issues.push({ path: `${path}.id`, message: "id must be a non-empty string", code: "MISSING_REQUIRED_FIELD" });
  }

  if (!isString(input.title) || input.title.trim() === "") {
    issues.push({ path: `${path}.title`, message: "title must be a non-empty string", code: "MISSING_REQUIRED_FIELD" });
  }

  if (!VALID_FINDING_CATEGORIES.has(input.category as FindingCategory)) {
    issues.push({
      path: `${path}.category`,
      message: `category must be one of: ${Array.from(VALID_FINDING_CATEGORIES).join(", ")}`,
      code: "INVALID_ENUM_VALUE",
    });
  }

  if (!VALID_ATTENTION_LEVELS.has(input.attentionLevel as ReviewAttentionLevel)) {
    issues.push({
      path: `${path}.attentionLevel`,
      message: `attentionLevel must be one of: ${Array.from(VALID_ATTENTION_LEVELS).join(", ")}`,
      code: "INVALID_ENUM_VALUE",
    });
  }

  // Structural change ID references
  if (Array.isArray(input.structuralChangeIds)) {
    for (let i = 0; i < input.structuralChangeIds.length; i++) {
      const scId = input.structuralChangeIds[i];
      if (!isString(scId)) {
        issues.push({ path: `${path}.structuralChangeIds[${i}]`, message: "structuralChangeId must be a string", code: "INVALID_TYPE" });
      } else if (!context.availableStructuralChangeIds.has(scId)) {
        issues.push({
          path: `${path}.structuralChangeIds[${i}]`,
          message: `Referenced StructuralChange ID '${scId}' does not exist in report.structuralChanges`,
          code: "UNRESOLVED_REFERENCE",
        });
      }
    }
  }

  // Correlation ID reference
  if (input.correlationId !== null && input.correlationId !== undefined) {
    if (!isString(input.correlationId)) {
      issues.push({ path: `${path}.correlationId`, message: "correlationId must be a string or null", code: "INVALID_TYPE" });
    } else if (!context.availableCorrelationIds.has(input.correlationId)) {
      issues.push({
        path: `${path}.correlationId`,
        message: `Referenced Correlation ID '${input.correlationId}' does not exist in report.correlations`,
        code: "UNRESOLVED_REFERENCE",
      });
    }
  }

  // Observed items (non-empty tuple)
  const findingObservedIds = new Set<string>();
  if (!Array.isArray(input.observed) || input.observed.length === 0) {
    issues.push({
      path: `${path}.observed`,
      message: "Finding must contain at least one Observation statement (non-empty tuple required)",
      code: "EMPTY_ARRAY",
    });
  } else {
    for (let i = 0; i < input.observed.length; i++) {
      const obs = input.observed[i];
      if (isRecord(obs) && isString(obs.id)) {
        findingObservedIds.add(obs.id);
      }
      issues.push(...validateObservation(obs, context.availableEvidenceIds, `${path}.observed[${i}]`));
    }
  }

  // Inferred items (all inferences must reference an observation from this finding)
  if (Array.isArray(input.inferred)) {
    for (let i = 0; i < input.inferred.length; i++) {
      issues.push(
        ...validateInferenceStatement(input.inferred[i], findingObservedIds, `${path}.inferred[${i}]`)
      );
    }
  } else {
    issues.push({ path: `${path}.inferred`, message: "inferred must be an array", code: "INVALID_TYPE" });
  }

  // Unknown items (mandatory non-empty tuple to enforce epistemic humility)
  if (!Array.isArray(input.unknown) || input.unknown.length === 0) {
    issues.push({
      path: `${path}.unknown`,
      message: "Finding must contain at least one UnknownStatement (admitting analysis boundaries is required)",
      code: "EMPTY_ARRAY",
    });
  } else {
    for (let i = 0; i < input.unknown.length; i++) {
      issues.push(...validateUnknownStatement(input.unknown[i], `${path}.unknown[${i}]`));
    }
  }

  return issues;
}

// ============================================================================
// TOP-LEVEL REPORT VALIDATOR
// ============================================================================

export function validateAnalysisReport(input: unknown): ValidationResult<AnalysisReport> {
  const issues: ValidationIssue[] = [];

  if (!isRecord(input)) {
    return {
      success: false,
      issues: [{ path: "report", message: "Expected AnalysisReport root object", code: "INVALID_TYPE" }],
    };
  }

  // 1. Schema Version
  if (input.schemaVersion !== "1.0.0") {
    issues.push({
      path: "report.schemaVersion",
      message: "schemaVersion must be '1.0.0'",
      code: "INVALID_ENUM_VALUE",
    });
  }

  // 2. Generated Timestamp
  if (!isString(input.generatedAtIso) || Number.isNaN(Date.parse(input.generatedAtIso))) {
    issues.push({
      path: "report.generatedAtIso",
      message: "generatedAtIso must be a valid ISO-8601 timestamp string",
      code: "INVALID_FORMAT",
    });
  }

  // 3. Status
  const status = input.status as AnalysisStatus;
  if (!VALID_ANALYSIS_STATUSES.has(status)) {
    issues.push({
      path: "report.status",
      message: `status must be one of: ${Array.from(VALID_ANALYSIS_STATUSES).join(", ")}`,
      code: "INVALID_ENUM_VALUE",
    });
  }

  // 4. Request
  const requestRes = validateAnalysisRequest(input.request, "report.request");
  if (!requestRes.success) {
    issues.push(...requestRes.issues);
  }

  // 5. Repository Info
  if (!isRecord(input.repository)) {
    issues.push({ path: "report.repository", message: "repository must be an object", code: "MISSING_REQUIRED_FIELD" });
  } else {
    if (!isString(input.repository.rootPath) || input.repository.rootPath.trim() === "") {
      issues.push({ path: "report.repository.rootPath", message: "rootPath must be a non-empty string", code: "MISSING_REQUIRED_FIELD" });
    }
    if (!isString(input.repository.gitVersion) || input.repository.gitVersion.trim() === "") {
      issues.push({ path: "report.repository.gitVersion", message: "gitVersion must be a non-empty string", code: "MISSING_REQUIRED_FIELD" });
    }
  }

  // 6. Base and Head Commits
  issues.push(...validateCommitInfo(input.baseCommit, "BASE", "report.baseCommit"));
  issues.push(...validateCommitInfo(input.headCommit, "HEAD", "report.headCommit"));

  // 7. Evidence Collection (Gather all evidence IDs)
  const availableEvidenceIds = new Set<string>();
  if (!Array.isArray(input.evidence)) {
    issues.push({ path: "report.evidence", message: "evidence must be an array", code: "INVALID_TYPE" });
  } else {
    for (let i = 0; i < input.evidence.length; i++) {
      const item = input.evidence[i];
      if (isRecord(item) && isString(item.id)) {
        availableEvidenceIds.add(item.id);
      }
      issues.push(...validateEvidenceItem(item, `report.evidence[${i}]`));
    }
  }

  // 8. Structural Changes (Gather all structural change IDs)
  const availableStructuralChangeIds = new Set<string>();
  if (!Array.isArray(input.structuralChanges)) {
    issues.push({ path: "report.structuralChanges", message: "structuralChanges must be an array", code: "INVALID_TYPE" });
  } else {
    for (let i = 0; i < input.structuralChanges.length; i++) {
      const change = input.structuralChanges[i];
      if (isRecord(change) && isString(change.id)) {
        availableStructuralChangeIds.add(change.id);
      }
      issues.push(...validateStructuralChange(change, `report.structuralChanges[${i}]`));
    }
  }

  // 9. Test Changes
  if (!Array.isArray(input.testChanges)) {
    issues.push({ path: "report.testChanges", message: "testChanges must be an array", code: "INVALID_TYPE" });
  }

  // 10. Correlations (Gather all correlation IDs and validate each correlation)
  const availableCorrelationIds = new Set<string>();
  if (!Array.isArray(input.correlations)) {
    issues.push({ path: "report.correlations", message: "correlations must be an array", code: "INVALID_TYPE" });
  } else {
    for (let i = 0; i < input.correlations.length; i++) {
      const corr = input.correlations[i];
      if (isRecord(corr) && isString(corr.id)) {
        availableCorrelationIds.add(corr.id);
      }
      issues.push(...validateCorrelationResult(corr, `report.correlations[${i}]`));
    }
  }

  // 10a. Optional Declaration Changes
  if (input.declarationChanges !== undefined) {
    if (!Array.isArray(input.declarationChanges)) {
      issues.push({ path: "report.declarationChanges", message: "declarationChanges must be an array", code: "INVALID_TYPE" });
    } else {
      for (let i = 0; i < input.declarationChanges.length; i++) {
        issues.push(...validateTestDeclarationChange(input.declarationChanges[i], `report.declarationChanges[${i}]`));
      }
    }
  }

  // 10b. Optional Correlation Items
  if (input.correlationItems !== undefined) {
    if (!Array.isArray(input.correlationItems)) {
      issues.push({ path: "report.correlationItems", message: "correlationItems must be an array", code: "INVALID_TYPE" });
    } else {
      for (let i = 0; i < input.correlationItems.length; i++) {
        issues.push(...validateCorrelationItem(input.correlationItems[i], availableEvidenceIds, `report.correlationItems[${i}]`));
      }
    }
  }

  // 10c. Optional Sub-analysis Statuses
  if (input.testAnalysisStatus !== undefined && !VALID_TEST_ANALYSIS_STATUSES.has(input.testAnalysisStatus as TestAnalysisStatus)) {
    issues.push({
      path: "report.testAnalysisStatus",
      message: `testAnalysisStatus must be one of: ${Array.from(VALID_TEST_ANALYSIS_STATUSES).join(", ")}`,
      code: "INVALID_ENUM_VALUE",
    });
  }

  if (input.correlationAnalysisStatus !== undefined && !VALID_CORRELATION_ANALYSIS_STATUSES.has(input.correlationAnalysisStatus as CorrelationAnalysisStatus)) {
    issues.push({
      path: "report.correlationAnalysisStatus",
      message: `correlationAnalysisStatus must be one of: ${Array.from(VALID_CORRELATION_ANALYSIS_STATUSES).join(", ")}`,
      code: "INVALID_ENUM_VALUE",
    });
  }

  // 11. Findings (with referential integrity validation)
  const referentialContext: ReferentialContext = {
    availableEvidenceIds,
    availableStructuralChangeIds,
    availableCorrelationIds,
  };

  const findingsList = Array.isArray(input.findings) ? input.findings : [];
  if (!Array.isArray(input.findings)) {
    issues.push({ path: "report.findings", message: "findings must be an array", code: "INVALID_TYPE" });
  } else {
    for (let i = 0; i < input.findings.length; i++) {
      issues.push(...validateFinding(input.findings[i], referentialContext, `report.findings[${i}]`));
    }
  }

  // 12. Limitations
  const limitationsList = Array.isArray(input.limitations) ? input.limitations : [];
  if (!Array.isArray(input.limitations)) {
    issues.push({ path: "report.limitations", message: "limitations must be an array", code: "INVALID_TYPE" });
  }

  // 13. Errors
  if (!Array.isArray(input.errors)) {
    issues.push({ path: "report.errors", message: "errors must be an array", code: "INVALID_TYPE" });
  }

  // 14. Status Combination Invariants
  const structuralChangesList = Array.isArray(input.structuralChanges) ? input.structuralChanges : [];

  if (status === "COMPLETED_WITH_FINDINGS") {
    if (findingsList.length === 0) {
      issues.push({
        path: "report.status",
        message: "Status is 'COMPLETED_WITH_FINDINGS' but findings array is empty",
        code: "INVALID_STATUS_COMBINATION",
      });
    }
  } else if (status === "COMPLETED_NO_STRUCTURAL_CHANGES") {
    if (structuralChangesList.length > 0) {
      issues.push({
        path: "report.status",
        message: `Status is 'COMPLETED_NO_STRUCTURAL_CHANGES' but structuralChanges contains ${structuralChangesList.length} items`,
        code: "INVALID_STATUS_COMBINATION",
      });
    }
    const hasStructuralFinding = findingsList.some((f) =>
      isRecord(f) && VALID_STRUCTURAL_CHANGE_CATEGORIES.has(f.category as StructuralChangeCategory)
    );
    if (hasStructuralFinding) {
      issues.push({
        path: "report.findings",
        message: "Report declared 'COMPLETED_NO_STRUCTURAL_CHANGES' but contains structural findings",
        code: "INVALID_STATUS_COMBINATION",
      });
    }
  } else if (status === "INCOMPLETE_FUNCTION_MISSING") {
    if (limitationsList.length === 0) {
      issues.push({
        path: "report.limitations",
        message: "Status is 'INCOMPLETE_FUNCTION_MISSING' but limitations array is empty",
        code: "INVALID_STATUS_COMBINATION",
      });
    }
  }

  if (issues.length > 0) {
    return { success: false, issues };
  }

  return { success: true, data: input as unknown as AnalysisReport };
}

/**
 * Asserts that an arbitrary input is a valid AnalysisReport, throwing ValidationError if invalid.
 */
export function assertValidAnalysisReport(input: unknown): asserts input is AnalysisReport {
  const result = validateAnalysisReport(input);
  if (!result.success) {
    throw new ValidationError(
      `AnalysisReport validation failed with ${result.issues.length} issue(s)`,
      result.issues
    );
  }
}

/**
 * Validates an InvestigationReport (alias for AnalysisReport).
 */
export const validateInvestigationReport = validateAnalysisReport;

/**
 * Asserts that an input is a valid InvestigationReport (alias for AnalysisReport).
 */
export const assertValidInvestigationReport = assertValidAnalysisReport;

// ============================================================================
// TEST-CHANGE ANALYSIS VALIDATORS
// ============================================================================

const VALID_ASSERTION_CHANGE_TYPES: ReadonlySet<AssertionChangeType> = new Set([
  "ASSERTION_ADDED",
  "ASSERTION_REMOVED",
  "ASSERTION_MODIFIED_OR_REWRITTEN",
]);

const VALID_FILE_CHANGE_STATUSES: ReadonlySet<TestChange["fileChangeStatus"]> = new Set([
  "MODIFIED",
  "ADDED",
  "DELETED",
  "UNMODIFIED_COMPANION",
]);

export function validateAssertionChangeRecord(
  input: unknown,
  path: string
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!isRecord(input)) {
    issues.push({ path, message: "Expected AssertionChangeRecord object", code: "INVALID_TYPE" });
    return issues;
  }

  if (!VALID_ASSERTION_CHANGE_TYPES.has(input.changeType as AssertionChangeType)) {
    issues.push({
      path: `${path}.changeType`,
      message: `changeType must be one of: ${Array.from(VALID_ASSERTION_CHANGE_TYPES).join(", ")}`,
      code: "INVALID_ENUM_VALUE",
    });
  }

  if (typeof input.callsTargetFunctionInBlock !== "boolean") {
    issues.push({
      path: `${path}.callsTargetFunctionInBlock`,
      message: "callsTargetFunctionInBlock must be a boolean",
      code: "INVALID_TYPE",
    });
  }

  if (input.beforeSpan !== null && input.beforeSpan !== undefined) {
    issues.push(...validateSourceSpan(input.beforeSpan, `${path}.beforeSpan`));
  }
  if (input.afterSpan !== null && input.afterSpan !== undefined) {
    issues.push(...validateSourceSpan(input.afterSpan, `${path}.afterSpan`));
  }

  return issues;
}

export function validateTestChange(
  input: unknown,
  path: string
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!isRecord(input)) {
    issues.push({ path, message: "Expected TestChange object", code: "INVALID_TYPE" });
    return issues;
  }

  if (!isString(input.id) || input.id.trim() === "") {
    issues.push({ path: `${path}.id`, message: "id must be a non-empty string", code: "MISSING_REQUIRED_FIELD" });
  }

  if (!isString(input.posixTestFilePath) || input.posixTestFilePath.trim() === "") {
    issues.push({
      path: `${path}.posixTestFilePath`,
      message: "posixTestFilePath must be a non-empty string",
      code: "MISSING_REQUIRED_FIELD",
    });
  }

  if (!VALID_FILE_CHANGE_STATUSES.has(input.fileChangeStatus as TestChange["fileChangeStatus"])) {
    issues.push({
      path: `${path}.fileChangeStatus`,
      message: `fileChangeStatus must be one of: ${Array.from(VALID_FILE_CHANGE_STATUSES).join(", ")}`,
      code: "INVALID_ENUM_VALUE",
    });
  }

  if (typeof input.importsTargetFile !== "boolean") {
    issues.push({
      path: `${path}.importsTargetFile`,
      message: "importsTargetFile must be a boolean",
      code: "INVALID_TYPE",
    });
  }

  if (typeof input.mentionsTargetFunction !== "boolean") {
    issues.push({
      path: `${path}.mentionsTargetFunction`,
      message: "mentionsTargetFunction must be a boolean",
      code: "INVALID_TYPE",
    });
  }

  if (!Array.isArray(input.assertionChanges)) {
    issues.push({
      path: `${path}.assertionChanges`,
      message: "assertionChanges must be an array",
      code: "INVALID_TYPE",
    });
  } else {
    for (let i = 0; i < input.assertionChanges.length; i++) {
      issues.push(
        ...validateAssertionChangeRecord(input.assertionChanges[i], `${path}.assertionChanges[${i}]`)
      );
    }
  }

  return issues;
}

export function validateTestDeclarationChange(
  input: unknown,
  path: string
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!isRecord(input)) {
    issues.push({ path, message: "Expected TestDeclarationChange object", code: "INVALID_TYPE" });
    return issues;
  }

  if (!isString(input.id) || input.id.trim() === "") {
    issues.push({ path: `${path}.id`, message: "id must be a non-empty string", code: "MISSING_REQUIRED_FIELD" });
  }

  if (!isString(input.posixTestFilePath) || input.posixTestFilePath.trim() === "") {
    issues.push({
      path: `${path}.posixTestFilePath`,
      message: "posixTestFilePath must be a non-empty string",
      code: "MISSING_REQUIRED_FIELD",
    });
  }

  if (input.changeType !== "ADDED" && input.changeType !== "REMOVED" && input.changeType !== "MODIFIED") {
    issues.push({
      path: `${path}.changeType`,
      message: "changeType must be 'ADDED', 'REMOVED', or 'MODIFIED'",
      code: "INVALID_ENUM_VALUE",
    });
  }

  if (!isString(input.fullTitle) || input.fullTitle.trim() === "") {
    issues.push({ path: `${path}.fullTitle`, message: "fullTitle must be a non-empty string", code: "MISSING_REQUIRED_FIELD" });
  }

  if (input.beforeSpan !== null && input.beforeSpan !== undefined) {
    issues.push(...validateSourceSpan(input.beforeSpan, `${path}.beforeSpan`));
  }
  if (input.afterSpan !== null && input.afterSpan !== undefined) {
    issues.push(...validateSourceSpan(input.afterSpan, `${path}.afterSpan`));
  }

  return issues;
}

export function validateTestAnalysisRequest(
  input: unknown,
  path: string = "request"
): ValidationResult<TestAnalysisRequest> {
  const issues: ValidationIssue[] = [];
  if (!isRecord(input)) {
    issues.push({ path, message: "Expected TestAnalysisRequest object", code: "INVALID_TYPE" });
    return { success: false, issues };
  }

  const { repoPath, baseRevisionInput, headRevisionInput, testFilePaths } = input;

  if (!isString(repoPath) || repoPath.trim() === "") {
    issues.push({ path: `${path}.repoPath`, message: "repoPath must be a non-empty string", code: "MISSING_REQUIRED_FIELD" });
  }

  for (const revField of ["baseRevisionInput", "headRevisionInput"] as const) {
    const val = input[revField];
    if (!isString(val) || val.trim() === "") {
      issues.push({ path: `${path}.${revField}`, message: `${revField} must be a non-empty string`, code: "MISSING_REQUIRED_FIELD" });
    } else {
      if (val.startsWith("-")) {
        issues.push({
          path: `${path}.${revField}`,
          message: `${revField} cannot start with '-' (Git command injection protection)`,
          code: "SECURITY_VIOLATION",
        });
      }
      if (/[;&|`$><\n\r]/.test(val)) {
        issues.push({
          path: `${path}.${revField}`,
          message: `${revField} contains dangerous shell metacharacters`,
          code: "SECURITY_VIOLATION",
        });
      }
    }
  }

  if (!Array.isArray(testFilePaths) || testFilePaths.length === 0) {
    issues.push({
      path: `${path}.testFilePaths`,
      message: "testFilePaths must be a non-empty array of file path strings",
      code: "MISSING_REQUIRED_FIELD",
    });
  } else {
    for (let i = 0; i < testFilePaths.length; i++) {
      const p = testFilePaths[i];
      if (!isString(p) || p.trim() === "") {
        issues.push({
          path: `${path}.testFilePaths[${i}]`,
          message: "test file path must be a non-empty string",
          code: "INVALID_TYPE",
        });
      } else if (p.includes("..") || p.startsWith("/") || p.startsWith("\\")) {
        issues.push({
          path: `${path}.testFilePaths[${i}]`,
          message: "test file path must be a relative path without '..' segments or leading slashes",
          code: "SECURITY_VIOLATION",
        });
      }
    }
  }

  if (issues.length > 0) {
    return { success: false, issues };
  }

  return { success: true, data: input as unknown as TestAnalysisRequest };
}

export function validateTestAnalysisReport(
  input: unknown
): ValidationResult<TestAnalysisReport> {
  const issues: ValidationIssue[] = [];
  if (!isRecord(input)) {
    issues.push({ path: "report", message: "Expected TestAnalysisReport object", code: "INVALID_TYPE" });
    return { success: false, issues };
  }

  if (input.schemaVersion !== "1.0.0") {
    issues.push({
      path: "report.schemaVersion",
      message: "schemaVersion must be '1.0.0'",
      code: "INVALID_ENUM_VALUE",
    });
  }

  if (!isString(input.generatedAtIso) || isNaN(Date.parse(input.generatedAtIso))) {
    issues.push({
      path: "report.generatedAtIso",
      message: "generatedAtIso must be a valid ISO-8601 timestamp string",
      code: "INVALID_FORMAT",
    });
  }

  const status = input.status as TestAnalysisStatus;
  if (!VALID_TEST_ANALYSIS_STATUSES.has(status)) {
    issues.push({
      path: "report.status",
      message: `status must be one of: ${Array.from(VALID_TEST_ANALYSIS_STATUSES).join(", ")}`,
      code: "INVALID_ENUM_VALUE",
    });
  }

  const reqRes = validateTestAnalysisRequest(input.request, "report.request");
  if (!reqRes.success) {
    issues.push(...reqRes.issues);
  }

  // Repository Info
  if (!isRecord(input.repository)) {
    issues.push({ path: "report.repository", message: "repository must be an object", code: "MISSING_REQUIRED_FIELD" });
  } else {
    if (!isString(input.repository.rootPath) || input.repository.rootPath.trim() === "") {
      issues.push({ path: "report.repository.rootPath", message: "rootPath must be a non-empty string", code: "MISSING_REQUIRED_FIELD" });
    }
  }

  // Base and Head Commits
  issues.push(...validateCommitInfo(input.baseCommit, "BASE", "report.baseCommit"));
  issues.push(...validateCommitInfo(input.headCommit, "HEAD", "report.headCommit"));

  // Evidence
  const availableEvidenceIds = new Set<string>();
  if (!Array.isArray(input.evidence)) {
    issues.push({ path: "report.evidence", message: "evidence must be an array", code: "INVALID_TYPE" });
  } else {
    for (let i = 0; i < input.evidence.length; i++) {
      const item = input.evidence[i];
      if (isRecord(item) && isString(item.id)) {
        availableEvidenceIds.add(item.id);
      }
      issues.push(...validateEvidenceItem(item, `report.evidence[${i}]`));
    }
  }

  // Test Changes
  if (!Array.isArray(input.testChanges)) {
    issues.push({ path: "report.testChanges", message: "testChanges must be an array", code: "INVALID_TYPE" });
  } else {
    for (let i = 0; i < input.testChanges.length; i++) {
      issues.push(...validateTestChange(input.testChanges[i], `report.testChanges[${i}]`));
    }
  }

  // Declaration Changes
  if (!Array.isArray(input.declarationChanges)) {
    issues.push({ path: "report.declarationChanges", message: "declarationChanges must be an array", code: "INVALID_TYPE" });
  } else {
    for (let i = 0; i < input.declarationChanges.length; i++) {
      issues.push(...validateTestDeclarationChange(input.declarationChanges[i], `report.declarationChanges[${i}]`));
    }
  }

  // Findings
  const referentialContext: ReferentialContext = {
    availableEvidenceIds,
    availableStructuralChangeIds: new Set(),
    availableCorrelationIds: new Set(),
  };

  if (!Array.isArray(input.findings)) {
    issues.push({ path: "report.findings", message: "findings must be an array", code: "INVALID_TYPE" });
  } else {
    for (let i = 0; i < input.findings.length; i++) {
      issues.push(...validateFinding(input.findings[i], referentialContext, `report.findings[${i}]`));
    }
  }

  if (issues.length > 0) {
    return { success: false, issues };
  }

  return { success: true, data: input as unknown as TestAnalysisReport };
}

export function assertValidTestAnalysisReport(
  input: unknown
): asserts input is TestAnalysisReport {
  const result = validateTestAnalysisReport(input);
  if (!result.success) {
    throw new ValidationError(
      `TestAnalysisReport validation failed with ${result.issues.length} issue(s)`,
      result.issues
    );
  }
}

// ============================================================================
// CORRELATION VALIDATORS
// ============================================================================

export function validateCorrelationResult(
  input: unknown,
  path: string
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!isRecord(input)) {
    issues.push({ path, message: "Expected CorrelationResult object", code: "INVALID_TYPE" });
    return issues;
  }

  if (!isString(input.id) || input.id.trim() === "") {
    issues.push({ path: `${path}.id`, message: "id must be a non-empty string", code: "MISSING_REQUIRED_FIELD" });
  }

  if (!isString(input.structuralChangeId)) {
    issues.push({ path: `${path}.structuralChangeId`, message: "structuralChangeId must be a string", code: "INVALID_TYPE" });
  }

  if (!VALID_CORRELATION_STATUSES.has(input.status as CorrelationStatus)) {
    issues.push({
      path: `${path}.status`,
      message: `status must be one of: ${Array.from(VALID_CORRELATION_STATUSES).join(", ")}`,
      code: "INVALID_ENUM_VALUE",
    });
  }

  if (!Array.isArray(input.relatedTestChangeIds)) {
    issues.push({ path: `${path}.relatedTestChangeIds`, message: "relatedTestChangeIds must be an array", code: "INVALID_TYPE" });
  }

  if (!Array.isArray(input.untouchedCompanionTestFiles)) {
    issues.push({ path: `${path}.untouchedCompanionTestFiles`, message: "untouchedCompanionTestFiles must be an array", code: "INVALID_TYPE" });
  }

  if (!isString(input.rationale) || input.rationale.trim() === "") {
    issues.push({ path: `${path}.rationale`, message: "rationale must be a non-empty string", code: "MISSING_REQUIRED_FIELD" });
  }

  return issues;
}

export function validateCorrelationItem(
  input: unknown,
  availableEvidenceIds: ReadonlySet<string>,
  path: string
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!isRecord(input)) {
    issues.push({ path, message: "Expected CorrelationItem object", code: "INVALID_TYPE" });
    return issues;
  }

  if (!isString(input.id) || input.id.trim() === "") {
    issues.push({ path: `${path}.id`, message: "id must be a non-empty string", code: "MISSING_REQUIRED_FIELD" });
  }

  if (!isString(input.correlationId) || input.correlationId.trim() === "") {
    issues.push({ path: `${path}.correlationId`, message: "correlationId must be a non-empty string", code: "MISSING_REQUIRED_FIELD" });
  }

  if (!VALID_CORRELATION_CLASSIFICATIONS.has(input.classification as CorrelationClassification)) {
    issues.push({
      path: `${path}.classification`,
      message: `classification must be one of: ${Array.from(VALID_CORRELATION_CLASSIFICATIONS).join(", ")}`,
      code: "INVALID_ENUM_VALUE",
    });
  }

  if (!VALID_CORRELATION_STATUSES.has(input.status as CorrelationStatus)) {
    issues.push({
      path: `${path}.status`,
      message: `status must be one of: ${Array.from(VALID_CORRELATION_STATUSES).join(", ")}`,
      code: "INVALID_ENUM_VALUE",
    });
  }

  if (!isString(input.rationale) || input.rationale.trim() === "") {
    issues.push({ path: `${path}.rationale`, message: "rationale must be a non-empty string", code: "MISSING_REQUIRED_FIELD" });
  }

  if (!isString(input.observedFact) || input.observedFact.trim() === "") {
    issues.push({ path: `${path}.observedFact`, message: "observedFact must be a non-empty string", code: "MISSING_REQUIRED_FIELD" });
  }

  if (!isString(input.inferredRelationship) || input.inferredRelationship.trim() === "") {
    issues.push({ path: `${path}.inferredRelationship`, message: "inferredRelationship must be a non-empty string", code: "MISSING_REQUIRED_FIELD" });
  }

  if (!Array.isArray(input.unknowns)) {
    issues.push({ path: `${path}.unknowns`, message: "unknowns must be an array", code: "INVALID_TYPE" });
  }

  if (!Array.isArray(input.evidenceIds)) {
    issues.push({ path: `${path}.evidenceIds`, message: "evidenceIds must be an array", code: "INVALID_TYPE" });
  } else {
    for (let i = 0; i < input.evidenceIds.length; i++) {
      const evId = input.evidenceIds[i];
      if (!isString(evId)) {
        issues.push({ path: `${path}.evidenceIds[${i}]`, message: "evidenceId must be a string", code: "INVALID_TYPE" });
      } else if (!availableEvidenceIds.has(evId)) {
        issues.push({
          path: `${path}.evidenceIds[${i}]`,
          message: `Referenced Evidence ID '${evId}' does not exist in report.evidence`,
          code: "UNRESOLVED_REFERENCE",
        });
      }
    }
  }

  return issues;
}

export function validateCorrelationReport(
  input: unknown
): ValidationResult<CorrelationReport> {
  const issues: ValidationIssue[] = [];
  if (!isRecord(input)) {
    issues.push({ path: "report", message: "Expected CorrelationReport object", code: "INVALID_TYPE" });
    return { success: false, issues };
  }

  if (input.schemaVersion !== "1.0.0") {
    issues.push({
      path: "report.schemaVersion",
      message: "schemaVersion must be '1.0.0'",
      code: "INVALID_ENUM_VALUE",
    });
  }

  if (!isString(input.generatedAtIso) || isNaN(Date.parse(input.generatedAtIso))) {
    issues.push({
      path: "report.generatedAtIso",
      message: "generatedAtIso must be a valid ISO-8601 timestamp string",
      code: "INVALID_FORMAT",
    });
  }

  const status = input.status as CorrelationAnalysisStatus;
  if (!VALID_CORRELATION_ANALYSIS_STATUSES.has(status)) {
    issues.push({
      path: "report.status",
      message: `status must be one of: ${Array.from(VALID_CORRELATION_ANALYSIS_STATUSES).join(", ")}`,
      code: "INVALID_ENUM_VALUE",
    });
  }

  // Repository Info
  if (!isRecord(input.repository)) {
    issues.push({ path: "report.repository", message: "repository must be an object", code: "MISSING_REQUIRED_FIELD" });
  } else {
    if (!isString(input.repository.rootPath) || input.repository.rootPath.trim() === "") {
      issues.push({ path: "report.repository.rootPath", message: "rootPath must be a non-empty string", code: "MISSING_REQUIRED_FIELD" });
    }
  }

  // Base and Head Commits
  issues.push(...validateCommitInfo(input.baseCommit, "BASE", "report.baseCommit"));
  issues.push(...validateCommitInfo(input.headCommit, "HEAD", "report.headCommit"));

  // Evidence
  const availableEvidenceIds = new Set<string>();
  if (!Array.isArray(input.evidence)) {
    issues.push({ path: "report.evidence", message: "evidence must be an array", code: "INVALID_TYPE" });
  } else {
    for (let i = 0; i < input.evidence.length; i++) {
      const item = input.evidence[i];
      if (isRecord(item) && isString(item.id)) {
        availableEvidenceIds.add(item.id);
      }
      issues.push(...validateEvidenceItem(item, `report.evidence[${i}]`));
    }
  }

  // Correlations
  const availableCorrelationIds = new Set<string>();
  const availableStructuralChangeIds = new Set<string>();
  if (!Array.isArray(input.correlations)) {
    issues.push({ path: "report.correlations", message: "correlations must be an array", code: "INVALID_TYPE" });
  } else {
    for (let i = 0; i < input.correlations.length; i++) {
      const corr = input.correlations[i];
      if (isRecord(corr) && isString(corr.id)) {
        availableCorrelationIds.add(corr.id);
        if (isString(corr.structuralChangeId) && corr.structuralChangeId.trim() !== "") {
          availableStructuralChangeIds.add(corr.structuralChangeId);
        }
      }
      issues.push(...validateCorrelationResult(corr, `report.correlations[${i}]`));
    }
  }

  // Correlation Items
  if (!Array.isArray(input.correlationItems)) {
    issues.push({ path: "report.correlationItems", message: "correlationItems must be an array", code: "INVALID_TYPE" });
  } else {
    for (let i = 0; i < input.correlationItems.length; i++) {
      issues.push(
        ...validateCorrelationItem(input.correlationItems[i], availableEvidenceIds, `report.correlationItems[${i}]`)
      );
    }
  }

  // Findings
  const referentialContext: ReferentialContext = {
    availableEvidenceIds,
    availableStructuralChangeIds,
    availableCorrelationIds,
  };

  if (!Array.isArray(input.findings)) {
    issues.push({ path: "report.findings", message: "findings must be an array", code: "INVALID_TYPE" });
  } else {
    for (let i = 0; i < input.findings.length; i++) {
      issues.push(...validateFinding(input.findings[i], referentialContext, `report.findings[${i}]`));
    }
  }

  if (issues.length > 0) {
    return { success: false, issues };
  }

  return { success: true, data: input as unknown as CorrelationReport };
}

export function assertValidCorrelationReport(
  input: unknown
): asserts input is CorrelationReport {
  const result = validateCorrelationReport(input);
  if (!result.success) {
    throw new ValidationError(
      `CorrelationReport validation failed with ${result.issues.length} issue(s)`,
      result.issues
    );
  }
}



