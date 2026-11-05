# Report Schema and Epistemic Semantics

**Change Archaeologist** &bull; Independent LLM Frontend Redesign Context  
**Repository:** `E:\change-archaeologist`  
**Document:** `Docs/llm-handoff/REPORT_SCHEMA_AND_SEMANTICS.md`  
**Source Definitions:** [`src/core/domain/types.ts`](file:///e:/change-archaeologist/src/core/domain/types.ts), [`src/core/domain/schemas.ts`](file:///e:/change-archaeologist/src/core/domain/schemas.ts)

---

## Part 1: Core Epistemic Model & System Invariants

Change Archaeologist is designed with strict epistemic humility. The system never claims that code works or that tests passed because it does not execute code. It only establishes verifiable AST mutations and companion test updates.

### The Four-Tier Epistemic Hierarchy

```
+-------------------------------------------------------------------+
|                        1. EVIDENCE (Anchor)                       |
|   Inspectable proof anchor: file path, commit SHA, line span,     |
|   and raw code snippet extracted directly from Git revisions.      |
+-------------------------------------------------------------------+
                                  |
                                  v
+-------------------------------------------------------------------+
|                       2. OBSERVATION (Fact)                       |
|   Direct factual statement derived from the AST comparator.       |
|   INVARIANT: Must reference >= 1 EvidenceItem ID.                 |
+-------------------------------------------------------------------+
                                  |
                                  v
+-------------------------------------------------------------------+
|                      3. INFERENCE (Hypothesis)                    |
|   Rule-derived interpretation or correlation claim.               |
|   INVARIANT: Must reference >= 1 Observation ID within finding.   |
+-------------------------------------------------------------------+
                                  |
                                  v
+-------------------------------------------------------------------+
|                        4. UNKNOWN (Limit)                         |
|   Explicit boundary statement declaring what static analysis      |
|   cannot prove (e.g. runtime execution, coverage, values).        |
|   INVARIANT: Every Finding must declare >= 1 UnknownStatement.    |
+-------------------------------------------------------------------+
```

### Hard System Invariants Enforced by `schemas.ts`

1. **Referential Integrity of Observations:**
   * Every `Observation` must cite one or more valid `EvidenceItem` identifiers in its `evidenceIds` array (`readonly [string, ...string[]]`).
   * An observation without verifiable evidence is strictly rejected by the validator.
2. **Referential Integrity of Inferences:**
   * Every `InferenceStatement` must cite one or more existing `Observation` identifiers in its `supportingObservationIds` array (`readonly [string, ...string[]]`).
   * Speculative claims cannot exist without direct observational grounding.
3. **Mandatory Epistemic Boundaries:**
   * Every `Finding` object must contain at least one `Observation` in its `observed` array and at least one `UnknownStatement` in its `unknown` array.
   * Reports that omit unknowns are rejected as epistemically invalid.
4. **Structural Change Referencing:**
   * Any `structuralChangeId` referenced by a `Finding` or `CorrelationResult` must exist in the report's `structuralChanges` array.
5. **No False Runtime Claims:**
   * The status `STRONG` does not mean tests passed or covered code at runtime. It strictly means the companion test AST contains a direct invocation of the modified function within the analyzed commit.

---

## Part 2: Field-by-Field Domain Type Definitions

### 1. `AnalysisReport` (Top-Level Report Contract)

The primary serialized report output from the CLI and ingested by the frontend:

```typescript
export interface AnalysisReport {
  readonly schemaVersion: SchemaVersion;                    // Always "1.0.0"
  readonly generatedAtIso: string;                          // ISO 8601 timestamp (e.g. "2026-11-05T12:00:00.000Z")
  readonly status: AnalysisStatus;                          // Run outcome status
  readonly request: AnalysisRequest;                        // CLI arguments and target configuration
  readonly repository: RepositoryInfo;                      // Local Git repository path and version
  readonly baseCommit: CommitInfo;                          // Baseline revision metadata (from)
  readonly headCommit: CommitInfo;                          // Target revision metadata (to)
  readonly baseFunction?: FunctionSnapshot | null;          // AST snapshot of function in base revision
  readonly headFunction?: FunctionSnapshot | null;          // AST snapshot of function in head revision
  readonly evidence: readonly EvidenceItem[];               // All inspectable source anchors
  readonly structuralChanges: readonly StructuralChange[];  // Categorized AST mutations in target function
  readonly testChanges: readonly TestChange[];              // Companion test suite changes
  readonly declarationChanges?: readonly TestDeclarationChange[]; // Discrete test block changes (describe/it)
  readonly correlations: readonly CorrelationResult[];      // High-level structural-to-test correlations
  readonly correlationItems?: readonly CorrelationItem[];  // Detailed correlation item rationales
  readonly testAnalysisStatus?: TestAnalysisStatus;         // Test analysis outcome status
  readonly correlationAnalysisStatus?: CorrelationAnalysisStatus; // Correlation outcome status
  readonly findings: readonly Finding[];                    // Investigative conclusions with unknowns
  readonly limitations: readonly string[];                  // Global analysis boundary statements
  readonly errors: readonly AnalysisErrorRecord[];          // Non-fatal or fatal error records
}
```

### 2. `StructuralChange` (AST Mutation Contract)

Represents a discrete structural difference in the target function's AST:

```typescript
export interface StructuralChange {
  readonly id: string;                           // Unique identifier (e.g. "SC-001")
  readonly ruleId: RuleId;                       // Specific rule triggered (e.g. "RULE_GUARD_ADDED")
  readonly category: StructuralChangeCategory;   // AST category (GUARD_CLAUSE, CONDITIONAL_EXPRESSION, etc.)
  readonly changeType: "ADDED" | "REMOVED" | "MODIFIED";
  readonly summary: string;                      // Human-readable summary of mutation
  readonly beforeSpan: SourceSpan | null;        // 1-indexed coordinates in base revision
  readonly afterSpan: SourceSpan | null;         // 1-indexed coordinates in head revision
  readonly beforeSnippet: string | null;         // Code snippet in base revision
  readonly afterSnippet: string | null;          // Code snippet in head revision
  readonly details?: Record<string, unknown>;    // Additional AST metadata
}
```

### 3. `TestChange` & `AssertionChangeRecord`

Represents companion test file modifications and assertion mutations:

```typescript
export interface TestChange {
  readonly id: string;                           // e.g. "TC-001"
  readonly posixTestFilePath: string;            // POSIX relative path, e.g. "tests/auth.test.ts"
  readonly fileChangeStatus: "MODIFIED" | "ADDED" | "DELETED" | "UNMODIFIED_COMPANION";
  readonly importsTargetFile: boolean;           // True if test imports the target production file
  readonly mentionsTargetFunction: boolean;       // True if target function name appears in test
  readonly assertionChanges: readonly AssertionChangeRecord[];
}

export interface AssertionChangeRecord {
  readonly changeType: AssertionChangeType;      // "ASSERTION_ADDED" | "ASSERTION_REMOVED" | "ASSERTION_MODIFIED_OR_REWRITTEN"
  readonly enclosingTestBlock: string | null;    // Name of test block (e.g. "it('rejects expired tokens')")
  readonly callsTargetFunctionInBlock: boolean;  // True if test block calls target function directly
  readonly beforeAssertionText: string | null;   // Assertion code before
  readonly afterAssertionText: string | null;    // Assertion code after
  readonly beforeSpan: SourceSpan | null;        // Coordinate before
  readonly afterSpan: SourceSpan | null;         // Coordinate after
}
```

### 4. `CorrelationResult` & `CorrelationItem`

Conservative correlation mapping between production mutations and test modifications:

```typescript
export interface CorrelationResult {
  readonly id: string;                                   // e.g. "CORR-001"
  readonly structuralChangeId: string;                   // Reference to StructuralChange.id
  readonly status: CorrelationStatus;                    // "STRONG" | "WEAK" | "NONE" | "UNCERTAIN"
  readonly relatedTestChangeIds: readonly string[];      // References to TestChange.id
  readonly untouchedCompanionTestFiles: readonly string[]; // Discovered test files that were NOT updated
  readonly rationale: string;                            // Explicit justification for status
}

export interface CorrelationItem {
  readonly id: string;                                   // e.g. "CORR-ITEM-001"
  readonly correlationId: string;                        // References CorrelationResult.id
  readonly structuralChangeId: string | null;
  readonly testChangeId: string | null;
  readonly posixTestFilePath: string | null;
  readonly classification: CorrelationClassification;
  readonly status: CorrelationStatus;
  readonly rationale: string;
  readonly observedFact: string;                         // Verifiable AST observation
  readonly inferredRelationship: string;                 // Inferred analytical relationship
  readonly unknowns: readonly string[];                  // Explicit unknown limits
  readonly evidenceIds: readonly string[];               // Supporting evidence IDs
}
```

### 5. `Finding` (Investigative Synthesis)

Combines facts, deductions, and explicit boundaries into an actionable conclusion:

```typescript
export interface Finding {
  readonly id: string;                                   // e.g. "FND-001"
  readonly title: string;                                // Concise finding headline
  readonly category: FindingCategory;                    // Structural category or test correlation
  readonly attentionLevel: ReviewAttentionLevel;         // "HIGH_ATTENTION" | "MODERATE_ATTENTION" | "INFORMATIONAL"
  readonly structuralChangeIds: readonly string[];       // Referenced structural changes
  readonly correlationId: string | null;                 // Referenced correlation result
  readonly observed: readonly [Observation, ...Observation[]];       // >=1 mandatory observations
  readonly inferred: readonly InferenceStatement[];                  // Deductions (if any)
  readonly unknown: readonly [UnknownStatement, ...UnknownStatement[]]; // >=1 mandatory unknowns
}
```

### 6. `EvidenceItem`, `Observation`, `InferenceStatement`, `UnknownStatement`

```typescript
export interface EvidenceItem {
  readonly id: string;                                   // e.g. "EV-001"
  readonly kind: EvidenceKind;                           // "SOURCE_BEFORE" | "SOURCE_AFTER" | "TEST_BEFORE" | "TEST_AFTER" | "GIT_METADATA"
  readonly commitRole: RevisionRole;                     // "BASE" | "HEAD"
  readonly commitSha: string;                            // Git commit SHA
  readonly posixFilePath: string;                        // POSIX file path
  readonly span: SourceSpan | null;                      // Line and column span
  readonly codeSnippet: string | null;                   // Verbatim code extract
  readonly description: string;                          // Contextual description
}

export interface Observation {
  readonly id: string;                                   // e.g. "OBS-001"
  readonly category: "OBSERVED";
  readonly statement: string;
  readonly evidenceIds: readonly [string, ...string[]];  // Must cite >= 1 EvidenceItem
  readonly span?: SourceSpan | null;
  readonly snippet?: string | null;
}

export interface InferenceStatement {
  readonly id: string;                                   // e.g. "INF-001"
  readonly category: "INFERRED";
  readonly statement: string;
  readonly ruleId: string;
  readonly supportingObservationIds: readonly [string, ...string[]]; // Must cite >= 1 Observation
}

export interface UnknownStatement {
  readonly id: string;                                   // e.g. "UNK-001"
  readonly category: "UNKNOWN";
  readonly statement: string;
  readonly reasonCategory: UnknownReasonCategory;
}
```

---

## Part 3: Complete Enumeration Variants

### `AnalysisStatus`
* `COMPLETED_WITH_FINDINGS`: Analysis succeeded; structural changes and findings were identified.
* `COMPLETED_NO_STRUCTURAL_CHANGES`: Target function AST is identical between both revisions.
* `INCOMPLETE_FILE_MISSING_IN_ONE_REVISION`: Target file does not exist in `base` or `head` revision.
* `INCOMPLETE_FUNCTION_MISSING`: File exists but target function symbol was not found in one or both revisions.
* `INCOMPLETE_AMBIGUOUS_TARGET`: Multiple functions matching the target symbol were discovered in the same file.
* `INCOMPLETE_PARSE_ERROR`: TypeScript AST parser encountered fatal syntax errors in the file.

### `CorrelationStatus`
* `STRONG`: Direct, verifiable invocation. Companion test AST explicitly calls target function in an added/modified test block within the analyzed commit.
* `WEAK`: Co-occurring test update. Companion test suite or file was modified, but direct call references to the modified AST node cannot be proven statically.
* `NONE`: Zero companion test updates. Structural changes occurred in production code, but companion tests were unmodified.
* `UNCERTAIN`: Ambiguous relationship. Test changes exist, but target invocation is indirect, dynamic, or obscured by abstraction layers.

### `ReviewAttentionLevel`
* `HIGH_ATTENTION`: Critical review risk (e.g. guard removed or error throw modified with `NONE` test correlation).
* `MODERATE_ATTENTION`: Elevated review risk (e.g. conditional modified with `WEAK` correlation or unmodified companion tests).
* `INFORMATIONAL`: Routine update (e.g. matching test assertions added with `STRONG` correlation).

### `StructuralChangeCategory`
* `GUARD_CLAUSE`: Early return or exit throw validating preconditions (e.g. `if (!token) throw new Error()`).
* `CONDITIONAL_EXPRESSION`: Branching logic, `if` statements, ternary expressions, or `switch` statements.
* `THROW_STATEMENT`: Explicit exception throws and error creations.
* `RETURN_STATEMENT`: Value returns, early exits, or void return statements.

### `AssertionChangeType`
* `ASSERTION_ADDED`: New test assertion created in head revision.
* `ASSERTION_REMOVED`: Assertion deleted from head revision.
* `ASSERTION_MODIFIED_OR_REWRITTEN`: Assertion arguments, matcher, or expected values modified.

### `UnknownReasonCategory`
* `EXTERNAL_CALLER_BEHAVIOR`: Static analysis cannot determine what arguments external callers pass at runtime.
* `HELPER_DELEGATION_POSSIBLE`: Modified logic may be tested through unanalyzed higher-level integration tests.
* `RUNTIME_TEST_EXECUTION_UNVERIFIED`: Static analysis cannot verify whether companion tests pass or fail when executed.
* `TEST_CORRELATION_AMBIGUOUS`: Dynamic test generation, mocks, or helper wrappers prevent exact AST call tracing.
* `LINEAGE_OR_PARSE_BOUNDARY`: Target file syntax complexity exceeds static AST inspection boundaries.

---

## Part 4: Incomplete, Partial, and Ambiguous Scenarios

The frontend must gracefully handle incomplete, partial, or edge-case analysis reports without crashing or showing broken layouts.

### Built-in Demonstration Scenarios (`src/viewer/fixtures/demo-fixtures.ts`)

| Scenario | Identifier | Archetype | Structural Status | Correlation Status | Attention Level | Key Educational & Analytical Insight |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Scenario A** | `scenario-a` | Full Refactoring with Matching Test Updates | Multiple mutations (`GUARD_CLAUSE`, `RETURN_STATEMENT`) | `STRONG` | `INFORMATIONAL` | Ideal archaeological state: production changes are matched by direct companion test assertions. |
| **Scenario B** | `scenario-b` | Structural Mutation Without Test Coverage | Guard clause removed, throw removed | `NONE` | `HIGH_ATTENTION` | Critical review risk: defensive error handling removed while companion tests were completely untouched. |
| **Scenario C** | `scenario-c` | Signature & Type Overhaul | Function parameter and return type modified | `WEAK` | `MODERATE_ATTENTION` | Test suite file was touched, but assertions do not directly verify the changed parameter semantics. |
| **Scenario D** | `scenario-d` | Branch Divergence & Control Flow | Complex nested ternary and switch added | `STRONG` / `WEAK` | `MODERATE_ATTENTION` | Multi-path logic mutation with partial assertion coverage across conditional branches. |
| **Scenario E** | `scenario-e` | Async Pipeline & Promise Migration | Converted synchronous function to `async`/`await` | `STRONG` | `INFORMATIONAL` | Async return type mutation with companion tests updated to `await` the result. |
| **Scenario F** | `scenario-f` | Ambiguous Indirect Call Relationship | Internal helper modified | `UNCERTAIN` | `MODERATE_ATTENTION` | Test file tests public facade; static analysis cannot prove whether the modified internal helper is invoked. |

### Edge Case Handling in UI

1. **Target Function Missing in Base Revision (`INCOMPLETE_FUNCTION_MISSING`):**
   * Occurs when a function was newly created in `head`.
   * `baseFunction` is `null`, `beforeSpan` is `null`, `beforeSnippet` is `null`.
   * UI must render "Function did not exist in base commit" rather than empty Monaco editor error.
2. **Target Function Deleted in Head Revision:**
   * Occurs when a function was removed in `head`.
   * `headFunction` is `null`, `afterSpan` is `null`, `afterSnippet` is `null`.
   * UI displays "Function removed in target commit" with deletion marker.
3. **No Companion Test Files Discovered:**
   * `testChanges` is an empty array `[]`.
   * UI displays empty state in Test Changes tab: "No companion test files discovered in repository for target function."
   * Correlation status defaults to `NONE`.
4. **Syntax or Parse Errors (`INCOMPLETE_PARSE_ERROR`):**
   * `status` is `"INCOMPLETE_PARSE_ERROR"`.
   * Report contains `errors` array with diagnostic message, line number, and recoverable flag.
   * UI displays error alert banner in workspace while keeping report metadata accessible.

