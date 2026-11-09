# Change Archaeologist — Milestone 9 Real-World Validation Report

**Document Status:** Complete & Verified  
**Date:** November 4, 2026  
**System Under Test:** Change Archaeologist CLI & Analysis Engine (`change-archaeologist@0.1.0`)  
**Git Remote:** `https://github.com/rknishanth152-lgtm/change-archaeologist.git`

---

## 1. Executive Summary

Milestone 9 establishes an empirical, reproducible validation corpus that evaluates Change Archaeologist on realistic, controlled Git histories rather than relying solely on isolated unit tests. 

A dedicated validation harness was constructed (`validation/manifest.ts`, `validation/fixtures/fixture-builder.ts`, `validation/runner.ts`, and `tests/integration/validation/validation-corpus.test.ts`) covering 12 distinct code evolution scenarios (Scenarios A through L) and 3 critical security and repository integrity checks. Every fixture executes the actual production CLI entry point (`runCli`) against disposable synthetic Git repositories in isolated temporary file systems.

### Key Results
- **Corpus Scenarios Executed:** 12
- **Security & Integrity Checks:** 3
- **Passed Scenarios:** 15 / 15 (100% agreement with predefined manifest expectations)
- **Failed Scenarios:** 0
- **Inconclusive Scenarios:** 0
- **Total Test Suite:** 155 passing tests across 9 test suites
- **Defects Discovered & Fixed:** 1 defect in `RULE_GUARD_MODIFIED` finding synthesis
- **Regression Tests Added:** 1 dedicated integration test (`tests/integration/comparison/historical-function-comparator.test.ts` Test 15)
- **Repository Non-Mutation:** Bit-for-bit verified (HEAD commit SHA, tree object SHA, working tree, and uncommitted dirty files preserved)

---

## 2. Test Environment & Tool Versions

| Component | Version / Environment | Notes |
| :--- | :--- | :--- |
| **Node.js** | `v24.15.0` | Execution runtime |
| **TypeScript** | `5.7.0` | Compiler (`tsc --noEmit`, `tsc --outDir dist`) |
| **Vitest** | `v3.2.7` | Test runner and harness harness |
| **ts-morph** | `^24.0.0` | In-memory AST parser and TypeScript compiler wrapper |
| **Git** | `2.x` (Windows system git) | Subprocess execution |
| **Operating System** | Windows 11 Pro (x64) | Shell: PowerShell / Node.js subprocess |
| **Architecture** | Local-First, Zero-Dependency Core | Zero third-party network or runtime dependencies |

---

## 3. Validation Methodology

To avoid circularity, expected outcomes for every scenario were formulated and committed to a machine-readable fixture manifest (`validation/manifest.ts`) **prior** to running the validation harness. Expected results were not reverse-engineered from tool output.

### Multi-Phase Execution Protocol
For each scenario:
1. **Isolated Disposable Repository:** A pristine Git repository is initialized inside `os.tmpdir()` using `TempGitRepo`. Base and head commits are created with exact synthetic code snapshots.
2. **Pre-Execution Snapshot:** The harness records:
   - `git rev-parse HEAD`
   - `git rev-parse HEAD^{tree}`
   - `git status --porcelain`
   - SHA-256 hashes of all working-tree files
3. **CLI Execution (JSON Mode):** The real CLI orchestrator (`runCli`) is invoked with arguments `--repo`, `--file`, `--function`, `--base`, `--head`, `--format json`, and companion test files.
   - Captures numeric exit code, pure stdout, and stderr.
4. **Post-Execution Non-Mutation Audit:**
   - The harness re-evaluates `HEAD`, `HEAD^{tree}`, porcelain status, and file hashes, asserting bit-for-bit equality to prove read-only non-mutation.
5. **Schema & Referential Integrity Validation:**
   - Verifies stdout is strictly parseable JSON without extraneous diagnostic logs.
   - Executes domain runtime validator `assertValidAnalysisReport(parsed)`.
   - Validates referential integrity: every Observation references valid Evidence IDs; every Inference references valid Observation IDs; every Finding references valid Structural Change IDs.
6. **Expectation Comparison:**
   - Actual exit codes, report statuses, structural change categories, rule IDs, and correlation classifications are compared against the predefined manifest.
7. **Epistemic Constraint Check:**
   - Both stdout and stderr are scanned for forbidden causal overclaims (e.g. *"proves a regression"*, *"bug introduced"*, *"coverage increased"*).
8. **CLI Execution (Markdown Mode):**
   - The CLI is re-run with `--format markdown` to ensure equivalent exit codes and verify required human-readable sections (`# Investigation Summary`, `## Observed Evidence`, `## Inferred Implications`, `## Unknowns and Limitations`, `## Analysis Scope and Method Limitations`).
9. **Safe Teardown:** The fixture repository is completely pruned from temporary storage in a `finally` block.

---

## 4. Controlled Validation Corpus (Scenarios A through L)

### Scenario A: Guard Clause Removal
- **Goal:** Verify that deleting an early validation guard clause is accurately reported as an AST difference with line spans and code snippets, without fabricating regression or breakage claims.
- **Base:** `processPayment` with `if (!payment.valid) throw new Error("Invalid payment");`.
- **Head:** Guard removed; direct processing remains.
- **Expected:** Exit Code 0, Status `COMPLETED_WITH_FINDINGS`, Rule `RULE_GUARD_REMOVED`, Category `GUARD_CLAUSE`.

### Scenario B: Conditional Operator Change
- **Goal:** Verify detection of logical operator mutation (`&&` to `||`) inside conditional expressions.
- **Base:** `if (user.isAdmin && user.isOwner) return true;`.
- **Head:** `if (user.isAdmin || user.isOwner) return true;`.
- **Expected:** Exit Code 0, Status `COMPLETED_WITH_FINDINGS`, Rule `RULE_CONDITIONAL_MODIFIED`, Category `CONDITIONAL_EXPRESSION`.

### Scenario C: Throw-to-Return Conversion
- **Goal:** Verify that converting an error throw into a fallback return value is identified as a control-flow shift without overstepping into caller causality claims.
- **Base:** `if (!raw) throw new Error("Missing config");`.
- **Head:** `if (!raw) return {};`.
- **Expected:** Exit Code 0, Status `COMPLETED_WITH_FINDINGS`, Rule `RULE_THROW_TO_RETURN_CONVERSION`, Category `GUARD_CLAUSE`.

### Scenario D: Formatting-Only Changes
- **Goal:** Verify that whitespace, indentation, comments, and semicolon variations are normalized away by AST comparison, emitting zero spurious changes.
- **Base:** Standard calculation function `calculateDiscount`.
- **Head:** Added inline comments, multiline spacing, and trailing semicolons.
- **Expected:** Exit Code 0, Status `COMPLETED_NO_STRUCTURAL_CHANGES`, 0 structural changes, 0 findings.

### Scenario E: Production Change With Unchanged Test File
- **Goal:** Verify conservative correlation behavior when a companion test file is provided but remained completely untouched across the revision range.
- **Base:** `applyDiscount` with guard; companion `tests/discount.test.ts`.
- **Head:** `applyDiscount` guard removed; `tests/discount.test.ts` identical.
- **Expected:** Exit Code 0, Production Status `COMPLETED_WITH_FINDINGS`, Test Status `COMPLETED_NO_CHANGES`, Correlation Classification `NO_TEST_CHANGES_OBSERVED`, Correlation Status `NONE`. Must NOT claim tests pass or fail to cover the changed code.

### Scenario F: Related-Looking Test Change
- **Goal:** Verify detection when production guard behavior and test assertions are modified in tandem.
- **Base:** Guard returns false on negative age; test asserts `expect(validateAge(-1)).toBe(false)`.
- **Head:** Guard modified to return true on negative age; test asserts `expect(validateAge(-1)).toBe(true)`.
- **Expected:** Exit Code 0, Production Status `COMPLETED_WITH_FINDINGS`, Test Status `COMPLETED_WITH_CHANGES`, Correlation Analysis `COMPLETE_CORRELATED`, Correlation Status `STRONG`, Classification `POTENTIALLY_RELATED_ASSERTION_MODIFIED`.

### Scenario G: Unrelated Test Change
- **Goal:** Verify that modifying an unrelated test block in the same companion file does not trigger a false-positive strong correlation.
- **Base:** Production `computeRatio`; test file contains tests for `computeRatio` and `formatRatio`.
- **Head:** Production `computeRatio` conditional modified (`&&` to `||`); test file modifies test description and assertion in `formatRatio`.
- **Expected:** Exit Code 0, Production Status `COMPLETED_WITH_FINDINGS`, Test Status `COMPLETED_WITH_CHANGES`, Correlation Classification `TEMPORAL_CO_OCCURRENCE_ONLY` or status `WEAK`/`NONE` with respect to `computeRatio`.

### Scenario H: Missing Function
- **Goal:** Verify honest reporting when the requested target function exists at BASE but is removed or renamed in HEAD.
- **Base:** `getUser` declared in `src/user.ts`.
- **Head:** `getUser` renamed to `findUserById`.
- **Expected:** Exit Code 1 (`INCOMPLETE_ANALYSIS`), Status `INCOMPLETE_FUNCTION_MISSING`, valid schema report with explicit limitations explaining the missing function in HEAD.

### Scenario I: Syntax Error in Production Code
- **Goal:** Verify that malformed TypeScript/JavaScript source in HEAD does not crash or silently succeed as 0 changes.
- **Base:** Valid `parseItem`.
- **Head:** Syntactically malformed source with missing closing parenthesis and invalid tokens.
- **Expected:** Exit Code 1 (`INCOMPLETE_ANALYSIS`), Status `INCOMPLETE_PARSE_ERROR`, error record code `SYNTAX_PARSE_ERROR`, limitations declaring parse diagnostics.

### Scenario J: Ambiguous Function Name
- **Goal:** Verify locator behavior when multiple matching function declarations exist in the target file.
- **Base:** Top-level `processItem` function and `ItemHandler.processItem` method in `src/items.ts`.
- **Head:** Modified bodies for both declarations.
- **Expected:** Exit Code 1 (`INCOMPLETE_ANALYSIS`), Status `INCOMPLETE_AMBIGUOUS_TARGET`, report explicitly halts without arbitrary selection.

### Scenario K: Nested Function Boundary Isolation
- **Goal:** Verify that AST extraction treats function bodies strictly within their boundary, ensuring statements inside nested closures are not misattributed to the outer function.
- **Base:** `transformList` with an early guard `if (items.length === 0) return 0;` and a `.forEach()` callback containing an inner guard `if (x < 0) count++;`.
- **Head:** Inner guard removed inside `.forEach()`; outer guard and outer return remain identical.
- **Expected:** Exit Code 0, Status `COMPLETED_NO_STRUCTURAL_CHANGES`, 0 structural changes on `transformList`. Nested callback changes are isolated from parent function statements.

### Scenario L: Missing or Malformed Test Input
- **Goal:** Verify error handling when companion test files contain syntax errors.
- **Base:** Valid production function and valid companion test file.
- **Head:** Valid production change, but companion test file has malformed syntax (`it( {`).
- **Expected:** Exit Code 1 (`INCOMPLETE_ANALYSIS`), Production Status `COMPLETED_WITH_FINDINGS`, Test Status `INCOMPLETE_PARSE_ERROR`.

---

## 5. Predefined Expectations vs. Actual Results

| ID | Scenario Name | Target Function | Expected Exit | Actual Exit | Expected Status | Actual Status | Findings / Rules | Outcome |
| :---: | :--- | :--- | :---: | :---: | :--- | :--- | :--- | :---: |
| **A** | Guard Clause Removal | `processPayment` | 0 | 0 | `COMPLETED_WITH_FINDINGS` | `COMPLETED_WITH_FINDINGS` | 1 change (`RULE_GUARD_REMOVED`) | **PASS** |
| **B** | Conditional Operator Change | `authorizeUser` | 0 | 0 | `COMPLETED_WITH_FINDINGS` | `COMPLETED_WITH_FINDINGS` | 1 change (`RULE_CONDITIONAL_MODIFIED`) | **PASS** |
| **C** | Throw-to-Return Change | `parseConfig` | 0 | 0 | `COMPLETED_WITH_FINDINGS` | `COMPLETED_WITH_FINDINGS` | 1 change (`RULE_THROW_TO_RETURN_CONVERSION`) | **PASS** |
| **D** | Formatting-Only Change | `calculateDiscount` | 0 | 0 | `COMPLETED_NO_STRUCTURAL_CHANGES` | `COMPLETED_NO_STRUCTURAL_CHANGES` | 0 changes, 0 findings | **PASS** |
| **E** | Unchanged Test File | `applyDiscount` | 0 | 0 | `COMPLETED_WITH_FINDINGS` | `COMPLETED_WITH_FINDINGS` | Prod: 1 change; Test: `COMPLETED_NO_CHANGES`; Corr: `NONE` | **PASS** |
| **F** | Related Test Change | `validateAge` | 0 | 0 | `COMPLETED_WITH_FINDINGS` | `COMPLETED_WITH_FINDINGS` | Prod: 1 change (`RULE_GUARD_MODIFIED`); Test: 1 change; Corr: `STRONG` | **PASS** |
| **G** | Unrelated Test Change | `computeRatio` | 0 | 0 | `COMPLETED_WITH_FINDINGS` | `COMPLETED_WITH_FINDINGS` | Prod: 1 change; Test: 1 change; Corr: `TEMPORAL_CO_OCCURRENCE_ONLY` | **PASS** |
| **H** | Missing Function | `getUser` | 1 | 1 | `INCOMPLETE_FUNCTION_MISSING` | `INCOMPLETE_FUNCTION_MISSING` | 0 changes; Limitations explicit | **PASS** |
| **I** | Syntax Parse Error | `parseItem` | 1 | 1 | `INCOMPLETE_PARSE_ERROR` | `INCOMPLETE_PARSE_ERROR` | Error: `SYNTAX_PARSE_ERROR`; 0 changes | **PASS** |
| **J** | Ambiguous Function Name | `processItem` | 1 | 1 | `INCOMPLETE_AMBIGUOUS_TARGET` | `INCOMPLETE_AMBIGUOUS_TARGET` | Limitations: duplicate candidates found | **PASS** |
| **K** | Nested Boundary Isolation | `transformList` | 0 | 0 | `COMPLETED_NO_STRUCTURAL_CHANGES` | `COMPLETED_NO_STRUCTURAL_CHANGES` | 0 changes on outer function | **PASS** |
| **L** | Malformed Test Input | `verifyToken` | 1 | 1 | `COMPLETED_WITH_FINDINGS` | `COMPLETED_WITH_FINDINGS` | Test Status: `INCOMPLETE_PARSE_ERROR` | **PASS** |
| **SEC-1** | Dirty Working Tree | `verify` | 0 | 0 | `COMPLETED_WITH_FINDINGS` | `COMPLETED_WITH_FINDINGS` | Committed source read; dirty files preserved | **PASS** |
| **SEC-2** | Windows Path With Spaces | `greet` | 0 | 0 | `COMPLETED_WITH_FINDINGS` | `COMPLETED_WITH_FINDINGS` | Space path normalized and resolved cleanly | **PASS** |
| **SEC-3** | Protected Output Targets | `index` | 5 | 5 | N/A (CLI Error) | N/A (CLI Error) | Refuses overwriting source code or `.git` | **PASS** |

---

## 6. Defects Discovered & Resolved

### Defect 1: Missing Finding Synthesis for `RULE_GUARD_MODIFIED`
- **Component:** `src/core/ast/structural-comparator.ts` (lines 185–200).
- **Symptom:** During execution of Scenario F (where a guard clause condition remained `if (age < 0)` but its exit statement was modified from `return false;` to `return true;`), `StructuralComparator` appended a `StructuralChange` record with `ruleId: "RULE_GUARD_MODIFIED"` and flagged `status = "COMPLETED_WITH_FINDINGS"`. However, the code failed to synthesize the corresponding Evidence, Observation, Inference, and Finding objects.
- **Root Cause:** An incomplete `else` branch in Pass 2 of the guard comparison pipeline created the structural change record but did not construct the associated finding tree.
- **Failure Manifestation:** Domain schema validator threw `ValidationError`:
  `[INVALID_STATUS_COMBINATION] report.status: Status is 'COMPLETED_WITH_FINDINGS' but findings array is empty`.
- **Resolution:** Updated `src/core/ast/structural-comparator.ts` to construct the complete evidence items (`SOURCE_BEFORE`, `SOURCE_AFTER`), Observation statement, Inference statement (`RULE_GUARD_MODIFIED`), and Unknown limitation statement (`EXTERNAL_CALLER_BEHAVIOR`), appending a fully anchored Finding to `findings`.
- **Regression Test:** Added Test 15 to `tests/integration/comparison/historical-function-comparator.test.ts`:
  *"15. detects a guard exit modified (RULE_GUARD_MODIFIED) and synthesizes a valid finding and evidence"*.
- **Verification:** Both the unit regression test and Scenario F in the validation corpus now pass with zero discrepancies.

---

## 7. Security and Non-Modification Verification

Three dedicated security and filesystem integrity checks were conducted using disposable Git repositories:

1. **Uncommitted Working Tree Immunity:**
   - Introduced uncommitted dirty edits to the target source file and added untracked dirty files to the repository working tree.
   - Executed CLI analysis.
   - **Result:** The CLI retrieved the exact committed Git blobs corresponding to the requested revisions (`HEAD~1` and `HEAD`), completely ignoring working tree modifications. After analysis, `git status --porcelain` and all file contents remained bit-for-bit identical to the pre-analysis state.
2. **Windows Path Resilience:**
   - Initialized repositories in directory paths containing spaces (e.g. `src/sub folder/greet.ts`).
   - **Result:** Normalized relative and absolute paths without command-line splitting or escaping failures.
3. **Protected Output Destination Enforcement:**
   - Attempted to direct report output over the target source file itself (`--output src/index.ts --force`).
   - Attempted to direct report output into internal Git structures (`--output .git/injected-report.md`).
   - **Result:** Both attempts were immediately blocked with exit code `5` (`OUTPUT_FAILURE`), outputting explicit safety violation diagnostics without writing to disk.

---

## 8. Epistemic Model & Boundary Adherence

Change Archaeologist adheres strictly to the **OBSERVED -> INFERRED -> UNKNOWN** hierarchy:
- **Zero Hallucination of Regressions:** Across all 12 scenarios, neither stdout, stderr, nor generated Markdown/JSON reports contained forbidden terms such as *"proves a regression"*, *"bug introduced"*, or *"proven breaking change"*.
- **Absence of Proof != Proof of Absence:** When companion tests were unmodified (Scenario E), the engine explicitly recorded:
  > *"Static analysis cannot prove that tests do not exist in other files or that existing tests fail to exercise the changed code."*
- **Co-Occurrence != Causation:** When test changes co-occurred with production changes (Scenario F and G), the relationship was classified as `POTENTIALLY_RELATED_ASSERTION_MODIFIED` with explicit limitations stating that static co-occurrence does not establish execution causality.

---

## 9. Known False-Positive and False-Negative Risks

### False-Positive Risks
1. **Unrelated Shared-File Changes:** When production functions and test declarations are modified within the same Git commit, the correlation engine flags them as potentially related if the test block mentions the target function name, even if the test modification was purely cosmetic or refactoring unrelated assertions.
2. **Top-Level vs. Nested Class Method Ambiguity:** If a top-level function `foo` and a class method `Bar.foo` coexist in the same source file and the user specifies `--function foo`, the locator conservatively halts with `INCOMPLETE_AMBIGUOUS_TARGET` to avoid guessing.

### False-Negative Risks
1. **Dynamic Invocations:** Indirect calls via reflection, dynamic property lookups (`obj[fnName]()`), or higher-order callbacks passed through multiple abstraction layers cannot be detected by purely static AST matching.
2. **Drastically Renamed Test Declarations:** If a test description is rewritten without preserving any ancestor titles or identifiers, the comparator cannot pair the previous and new assertion statements, treating them instead as one removal and one addition.
3. **Custom Non-Standard Assertion Libraries:** Only standard assertion idioms (`expect(...)`, `assert(...)`) are recognized. Domain-specific assertion wrappers (e.g. `myCustomCheck(x)`) are treated as opaque function calls and surfaced in the report limitations.

---

## 10. Benchmark Limitations

While the synthetic validation corpus provides 100% reproducible ground-truth verification across controlled scenarios, the following limitations apply:
- **Synthetic Repository Scale:** Synthetic repositories contain small numbers of commits and files designed to test specific edge cases; they do not reproduce the commit volume, merge conflicts, or submodule structures of massive monorepos.
- **Language Scope:** The current validator targets ECMAScript/TypeScript syntax supported by `ts-morph` and the Node.js runtime. Non-JavaScript/TypeScript languages are outside the tool's defined scope.

---

## 11. Final Verification Matrix

| Verification Check | Target | Exit Code | Result |
| :--- | :--- | :---: | :---: |
| TypeScript Typecheck | `npx tsc --noEmit` | `0` | **PASS (0 errors)** |
| Project Build | `npm run build` (`tsc --outDir dist`) | `0` | **PASS (clean compilation)** |
| Full Test Suite | `npx vitest run` | `0` | **PASS (155 / 155 passed across 9 suites)** |
| Validation Corpus Tests | `vitest run validation-corpus.test.ts` | `0` | **PASS (15 / 15 passed)** |
| Git Repository Status | Remote `origin` on branch `main` | `0` | **PASS (Clean tree, PRIVATE visibility preserved)** |
