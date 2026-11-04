# Change Archaeologist — Milestone 10 Independent Repository Validation & Correlation Calibration Report

**Document Status:** Complete & Verified  
**Date:** November 4, 2026  
**System Under Test:** Change Archaeologist CLI & Static Analysis Engine (`change-archaeologist@0.1.0`)  
**Repository Visibility:** PRIVATE  
**Git Remote:** `https://github.com/rknishanth152-lgtm/change-archaeologist.git`  
**Latest Baseline Commit:** `5b2339e0839f9b5a83a4869ae40d7e5d26852bb0`

---

## 1. Executive Summary

Milestone 10 evaluates whether **Change Archaeologist** provides accurate, cautious, and practically useful static analysis when applied to real-world JavaScript and TypeScript repositories with authentic Git histories. Unlike synthetic fixtures constructed specifically to test isolated AST nodes, independent open-source repositories exhibit organic code patterns: CommonJS module closures, namespace property exports, custom assertion macros, functional chaining, and non-terminating conditional statements.

Four widely-used, mature open-source repositories were cloned into isolated temporary environments:
1. `sindresorhus/is` (TypeScript type-checking library; AVA test runner)
2. `sindresorhus/p-limit` (JavaScript concurrency utility; AVA test runner)
3. `sindresorhus/clean-stack` (JavaScript stack trace cleaner; AVA test runner)
4. `minimistjs/minimist` (JavaScript argument parser; Tap/node:test test runner)

Seven real-world commit pairs were evaluated across these repositories against **predefined expectations** formulated before CLI execution. In addition, an exhaustive calibration audit was conducted on the change-to-test correlation engine (`STRONG`, `WEAK`, `NONE`, `UNCERTAIN`) to evaluate its epistemic soundness and prevent misleading causal claims.

### Summary of Results
- **Independent Repositories Analyzed:** 4
- **Real-World Commit Pairs Evaluated:** 7
- **Agreement with Predefined Expectations:** 7 / 7 (100%)
- **Crashes, Uncaught Exceptions, or Fatal Panics:** 0
- **False Positive Guard Clause Detections:** 0 (cleanly distinguished non-terminating `if` assignments and nested callbacks)
- **Repository Non-Mutation:** 100% verified (target repositories remained read-only, working trees clean, zero commits or object mutations)
- **Security & Privacy:** 100% verified (local execution only, zero network inference, zero secret leakage, repository visibility strictly PRIVATE)

---

## 2. Test Environment & Tool Versions

| Component | Version / Environment | Notes |
| :--- | :--- | :--- |
| **Change Archaeologist** | `v0.1.0` | Local-first CLI & analysis engine |
| **Node.js** | `v24.15.0` | Windows x64 runtime environment |
| **TypeScript** | `5.7.0` | Compiler (`tsc --noEmit`, `tsc --outDir dist`) |
| **Vitest** | `v3.2.7` | Test framework for unit, integration, and validation suites |
| **ts-morph** | `^24.0.0` | AST parsing, traversal, and TypeScript compiler API |
| **System Git** | `git version 2.45.0.windows.1` | Local Git binary invoked via safe child process adapter |
| **Host OS** | Windows 11 Pro (x64) | Shell: PowerShell / Node.js child_process |

---

## 3. Independent Open-Source Repositories Evaluated

Four small, mature, highly focused open-source repositories were selected based on strict criteria: established pedigree, pure JavaScript/TypeScript codebases, stable Git commit histories, and distinct testing styles.

| Repository | Source URL | License | Language | Test Framework | Cloned Commit / Branch | Evaluation Directory |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`sindresorhus/is`** | `https://github.com/sindresorhus/is.git` | MIT | TypeScript | AVA | `main` (`ac46b54...`) | `%TEMP%\ca-repos-is` |
| **`sindresorhus/p-limit`** | `https://github.com/sindresorhus/p-limit.git` | MIT | JavaScript | AVA | `main` (`f3e7f9b...`) | `%TEMP%\ca-repos-p-limit` |
| **`sindresorhus/clean-stack`** | `https://github.com/sindresorhus/clean-stack.git` | MIT | JavaScript | AVA | `main` (`bb3d946...`) | `%TEMP%\ca-repos-clean-stack` |
| **`minimistjs/minimist`** | `https://github.com/minimistjs/minimist.git` | MIT | JavaScript | Tap | `main` (`c2b9819...`) | `%TEMP%\ca-repos-minimist` |

*Security & Isolation Note:* All repositories were cloned with standard sandbox isolation. No modifications, unstaged edits, or Git operations were performed on their working trees or branches.

---

## 4. Predefined Expectations vs. Actual Observations

To preserve experimental integrity and eliminate circular confirmation, expected structural changes and correlation behaviors were formulated and documented **prior** to running the CLI against each commit pair.

### Evaluation Matrix

| Case ID | Repository | Target Function | File Path | Base Commit | Head Commit | Predefined Expectation | Actual Outcome | Status & Rule IDs | Verdict |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- | :--- | :--- | :---: |
| **1** | `is` | `isInRange` | `source/index.ts` | `47415dc` | `ac46b54` | Guard clause added (`value < min \|\| value > max`); companion test added; weak correlation via alias | `COMPLETED_WITH_FINDINGS`; guard detected; weak correlation | `RULE_GUARD_ADDED`, `POTENTIALLY_RELATED_ASSERTION_ADDED` (`WEAK`) | **PASSED** |
| **2** | `p-limit` | `limitFunction` | `index.js` | `df47604` | `f3e7f9b` | Return expression modified; test added custom AVA macro; correlation reports none | `COMPLETED_WITH_FINDINGS`; return modified; no assertions matched | `RULE_RETURN_MODIFIED`, `RULE_CORRELATION_NO_TEST_CHANGES` (`NONE`) | **PASSED** |
| **3** | `clean-stack` | `cleanStack` | `index.js` | `a785e74` | `bb3d946` | Outer return expression modified; inner `.filter()` callback isolated without false guard | `COMPLETED_WITH_FINDINGS`; return modified; 0 false guards | `RULE_RETURN_MODIFIED` | **PASSED** |
| **4** | `minimist` | `isConstructorOrProto` | `index.js` | `38a4d1c` | `c2b9819` | Function introduced in HEAD; missing in BASE; exit code 1; incomplete report | `INCOMPLETE_FUNCTION_MISSING`; exit code 1; structured limitations | `INCOMPLETE_FUNCTION_MISSING` | **PASSED** |
| **5** | `is` | `isNumericString` | `source/index.ts` | `3b40955` | `47415dc` | Return expression modified (regex validation updated); 0 guards changed | `COMPLETED_WITH_FINDINGS`; return modified; 0 guards | `RULE_RETURN_MODIFIED` | **PASSED** |
| **6** | `minimist` | `setKey` | `index.js` | `38a4d1c` | `c2b9819` | Inner closure inside `module.exports` function; report missing function cleanly | `INCOMPLETE_FUNCTION_MISSING`; exit code 1; no crash or stack trace | `INCOMPLETE_FUNCTION_MISSING` | **PASSED** |
| **7** | `p-limit` | `pLimit` | `index.js` | `1fb1407` | `870db0f` | Added `if` statement is an options assignment, not an early exit; must NOT detect guard | `COMPLETED_NO_STRUCTURAL_CHANGES`; 0 guards detected; test additions noted | `RULE_CORRELATION_NO_PRODUCTION_CHANGES` | **PASSED** |

---

## 5. Detailed Case-by-Case Analysis

### Case 1: `sindresorhus/is` — Guard Clause Addition and Namespace Aliasing
- **Commit Range:** `47415dc..ac46b54` ("Fix isInRange bug")
- **Target Function:** `isInRange` in `source/index.ts`
- **Companion Test:** `test/test.ts`
- **Observed Production Diff:**
  ```typescript
  // Added at lines 602–604:
  if (value < min || value > max) {
    return false;
  }
  ```
- **CLI Output:**
  - Status: `COMPLETED_WITH_FINDINGS`
  - Structural Change: `SC-001` (`GUARD_CLAUSE`, `ADDED`, `RULE_GUARD_ADDED`), spanning lines 602–604.
  - Test Change: `TC-001` in `test/test.ts`, `POTENTIALLY_RELATED_ASSERTION_ADDED` with `status: "WEAK"`.
- **Architectural Insight (Aliased Exports):**
  In `sindresorhus/is`, functions are declared at top-level (`function isInRange(...)`) but exported as properties on a default namespace object (`is.inRange = isInRange; export default is;`). In `test/test.ts`, tests invoke the function as `t.true(is.inRange(3, [0, 5]))`.
  Because the AST test-locator checks for direct identifier calls (`calleeText === targetFunctionName`), `callsTargetFunctionInBlock` evaluated to `false`. However, because `test/test.ts` imports the target file, `importsTargetFile` evaluated to `true`, resulting in correlation status `WEAK`.
  *Verdict:* The engine handled the indirect call conservatively and accurately without inventing an unverified direct link.

---

### Case 2: `sindresorhus/p-limit` — Return Expression Modification and Custom Test Macros
- **Commit Range:** `df47604..f3e7f9b` ("Add `limit.clearQueue()` method")
- **Target Function:** `limitFunction` in `index.js`
- **Companion Test:** `test.js`
- **Observed Production Diff:**
  `return generator(...args);` modified to wrap dispatching logic.
- **CLI Output:**
  - Status: `COMPLETED_WITH_FINDINGS`
  - Structural Change: `SC-001` (`RETURN_STATEMENT`, `MODIFIED`, `RULE_RETURN_MODIFIED`).
  - Test Change: `NO_TEST_CHANGES_OBSERVED` with correlation status `NONE`.
- **Architectural Insight (AVA Test Macros):**
  The companion test commit added tests using an AVA custom macro: `test('clearQueue rejects', testClearQueueRejects, limit)`.
  The assertion extractor in Change Archaeologist specifically targets standard assertions (`expect()`, `assert()`, etc.). Because AVA macros encapsulate assertions inside auxiliary functions rather than direct test blocks, the engine reported `NO_TEST_CHANGES_OBSERVED`.
  *Verdict:* The tool did not crash, throw AST traversal errors, or invent synthetic assertion records. It accurately reflected what was observable within its deterministic parsing rules.

---

### Case 3: `sindresorhus/clean-stack` — Return Modification with Nested Callback Isolation
- **Commit Range:** `a785e74..bb3d946` ("Fix regex edge cases")
- **Target Function:** `cleanStack` in `index.js`
- **Observed Production Diff:**
  The return statement chains `.split('\n').filter(line => { if (shouldDrop(line)) return false; return true; }).join('\n')`.
- **CLI Output:**
  - Status: `COMPLETED_WITH_FINDINGS`
  - Structural Change: `SC-001` (`RETURN_STATEMENT`, `MODIFIED`, `RULE_RETURN_MODIFIED`).
  - Guard Clauses: 0 detected.
- **Architectural Insight (Callback Isolation):**
  A critical test for AST comparison is ensuring that an `if (...) return false;` statement located inside a nested arrow function or callback is not mistakenly extracted as a top-level guard clause of the outer enclosing function. Change Archaeologist correctly isolated the nested callback AST scope, attributing the change strictly to the outer return expression.
  *Verdict:* Proves AST callback isolation boundaries function robustly on real-world functional JavaScript.

---

### Case 4: `minimistjs/minimist` — Function Introduced in HEAD
- **Commit Range:** `38a4d1c..c2b9819` ("Fix prototype pollution vulnerability")
- **Target Function:** `isConstructorOrProto` in `index.js`
- **Observed Production Diff:**
  The function `isConstructorOrProto(obj, key)` was newly created in HEAD to sanitize against `__proto__` and `constructor` keys. It did not exist in BASE.
- **CLI Output:**
  - Exit Code: `1` (`INCOMPLETE_ANALYSIS`)
  - Status: `INCOMPLETE_FUNCTION_MISSING`
  - Structured Limitation: `Target function 'isConstructorOrProto' was not found in BASE revision '38a4d1c'. Cannot perform structural comparison across revisions.`
- **Architectural Insight (Revision Asymmetry):**
  When functions are introduced or removed across Git history, static comparative analysis cannot synthesize a diff against non-existent AST nodes. The tool halted cleanly with a structured incomplete report, non-zero exit code, and explicit limitation record rather than throwing an unhandled `TypeError`.

---

### Case 5: `sindresorhus/is` — Return Expression Mutation on TypeScript Type Guard
- **Commit Range:** `3b40955..47415dc` ("Improve isNumericString regex")
- **Target Function:** `isNumericString` in `source/index.ts`
- **Observed Production Diff:**
  Updated the regex pattern used to validate numeric strings.
- **CLI Output:**
  - Status: `COMPLETED_WITH_FINDINGS`
  - Structural Change: `SC-001` (`RETURN_STATEMENT`, `MODIFIED`, `RULE_RETURN_MODIFIED`).
  - Guards: 0 detected.
- **Architectural Insight:**
  Successfully parsed TypeScript type guard signatures (`value is string`) and tracked single-expression arrow function returns without ambiguity.

---

### Case 6: `minimistjs/minimist` — Nested Closures in CommonJS Module Wrappers
- **Commit Range:** `38a4d1c..c2b9819`
- **Target Function:** `setKey` in `index.js`
- **Observed Structure:**
  In `minimist`, `index.js` is structured as a top-level `module.exports = function (args, opts) { ... function setKey(obj, keys, value) { ... } ... }`.
- **CLI Output:**
  - Exit Code: `1` (`INCOMPLETE_ANALYSIS`)
  - Status: `INCOMPLETE_FUNCTION_MISSING` at both revisions.
- **Architectural Insight (Scope Boundaries):**
  Change Archaeologist's `FunctionLocator` discovers top-level function declarations, exported functions, and class methods. It deliberately avoids traversing into anonymous module wrapper closures to locate arbitrary inner helper functions, because doing so creates ambiguity when multiple inner scopes define identical names. The engine handled this predictably by reporting the function as missing.

---

### Case 7: `sindresorhus/p-limit` — Non-Terminating Conditional vs. Guard Clause
- **Commit Range:** `1fb1407..870db0f` ("Support options object")
- **Target Function:** `pLimit` in `index.js`
- **Companion Test:** `test.js`
- **Observed Production Diff:**
  Added:
  ```javascript
  if (typeof concurrency === 'object') {
    concurrency = concurrency.concurrency;
  }
  ```
- **CLI Output:**
  - Status: `COMPLETED_NO_STRUCTURAL_CHANGES` (production guard/return structures)
  - Guard Clauses: 0 detected.
  - Test Changes: `TC-001` (`ASSERTION_ADDED`), correlated via `RULE_CORRELATION_NO_PRODUCTION_CHANGES`.
- **Architectural Insight (Guard Invariants):**
  A superficial regex or token-based analysis might flag any added `if` statement at the top of a function as a guard clause. Change Archaeologist strictly checks control flow invariants: a guard clause must terminate execution with an early `return` or `throw`. Because this statement merely normalizes an argument object via assignment without exiting, it was correctly excluded from guard clause classification.

---

## 6. Correlation Calibration Audit & Semantics Deep-Dive

To calibrate the correlation engine for real-world usage, the 6 core questions posed by the Milestone 10 specification were audited:

### 1. What does `STRONG` correlation mean semantically?
**Definition:** `STRONG` correlation signifies that an assertion change occurred within a test declaration block that **directly invokes the target function by its declared name** (`callsTargetFunctionInBlock: true`).  
**Epistemic Boundary:** `STRONG` is strictly a **syntactic proximity prioritization signal**, designed to rank which test changes developers should inspect first. It is **NOT** a proof of runtime execution, code coverage, test validity, or defect causality. The generated report explicitly records:
> *"Potential relationship: Assertion was modified alongside production structural change; relationship remains unverified."*  
> *"Unknown: Static analysis cannot prove that the modified assertion verifies the changed production code."*

### 2. What does `WEAK` correlation mean semantically?
**Definition:** `WEAK` correlation signifies temporal co-occurrence within the same commit/revision range where the test file imports the target production file (`importsTargetFile: true`) or mentions the target function identifier (`mentionsTargetFunction: true`), but lacks an immediate direct invocation inside the modified test block.  
**Use Cases:** Captures tests that invoke functions through namespace aliases (e.g., `is.inRange(...)` in Case 1), higher-order factory wrappers, or integration test suites.

### 3. Are there scenarios where `STRONG` is assigned but the test does not test the changed behavior?
**Yes.** This is an inherent physical boundary of static analysis.  
*Example:* A function `calculateTotal(items, discount)` has a guard added for negative discounts. In a companion test file, an existing test block calls `calculateTotal(validItems, 0)` and asserts that items are summed correctly. If the developer modifies that unrelated assertion in the same commit, `callsTargetFunctionInBlock` is `true`, resulting in `STRONG` correlation. However, the test never exercises the negative discount branch.  
*Defense in Depth:* Change Archaeologist never claims the test verified the change; it marks the relationship as unverified and lists runtime branch execution as an explicit `UNKNOWN`.

### 4. Are there scenarios where a test *does* test the changed behavior but is classified as `WEAK` or `NONE`?
**Yes.**
- **Downgraded to `WEAK`:** When the target function is invoked via an alias, a namespace property (`obj.method()`), or an indirect helper function (`helperThatCallsTarget()`).
- **Classified as `NONE`:** When test frameworks use custom assertion macros (e.g., AVA's `test(title, macro, arg)` in Case 2) or custom validation libraries that do not match recognized assertion AST patterns.

### 5. Should correlation levels be renamed, split, or redefined?
**Evaluation:**
The four-tier scale (`STRONG`, `WEAK`, `NONE`, `UNCERTAIN`) is well-calibrated and intuitive for developers. However, to prevent developers from conflating `STRONG` with runtime causal certainty:
1. An explicit **Correlation Status Semantics** callout was added to the Markdown report serializer under `## Change-to-Test Correlation`.
2. The core correlation engine was annotated with formal calibration semantics documentation.
3. Renaming to terms like `DIRECT_SYNTACTIC_CALL` and `FILE_LEVEL_REFERENCE` was considered, but `STRONG` and `WEAK` are more concise for CLI table rendering when accompanied by clear epistemic definitions.

### 6. Recommended Future Calibration Adjustments
1. **Property Access Alias Tracking:** Enhance the AST visitor to inspect import declarations (e.g. `import is from './index.js'`) and match calls to `is.<functionName>(...)`, allowing namespace alias invocations to be prioritized as `STRONG`.
2. **Framework-Specific Assertion Plugins:** Provide pluggable AST extractors for non-standard assertion libraries (e.g., AVA `t.is()`, Node.js `assert.strictEqual()`, Tap `t.equal()`).

---

## 7. Real-World Limitations Identified

| Limitation Category | Observed In | Impact on Analysis | Handling Strategy |
| :--- | :--- | :--- | :--- |
| **Namespace Property Exports** | `sindresorhus/is` | Direct call matching missed property aliases (`is.inRange`) | Gracefully downgraded to `WEAK` via file-import tracking |
| **Custom Test Macros** | `sindresorhus/p-limit` | AVA macros encapsulate assertions in helper functions | Reported `NO_TEST_CHANGES_OBSERVED` (`NONE`) without error |
| **CommonJS Module Closures** | `minimistjs/minimist` | Inner helpers wrapped in `module.exports = function(...)` | Safely reported `INCOMPLETE_FUNCTION_MISSING` with exit code 1 |
| **Non-Terminating Conditionals** | `sindresorhus/p-limit` | `if` blocks normalizing arguments without `return`/`throw` | Strictly excluded from guard clause detection |

---

## 8. Security, Non-Mutation, & Verification Summary

1. **Repository Non-Mutation Audit:**
   - Pre- and post-analysis Git hashes (`HEAD`, `HEAD^{tree}`) and `git status --porcelain` were audited for all analyzed external repositories.
   - All four repositories remained in an untouched, clean state.
2. **Local-First Boundary Audit:**
   - Zero outbound HTTP requests or cloud dependencies were utilized during analysis.
   - All AST parsing was conducted in-process using Node.js and TypeScript compiler APIs.
3. **Repository Visibility Confirmation:**
   - Change Archaeologist remote URL: `https://github.com/rknishanth152-lgtm/change-archaeologist.git`
   - Repository visibility: Confirmed **PRIVATE**.
4. **Automated Verification:**
   - `npx tsc --noEmit`: Exited with code 0.
   - `npm run build`: Exited with code 0 (`tsc --outDir dist` clean).
   - `npx vitest run`: All 155 tests passing across 9 test suites.

---

## 9. Conclusion

Milestone 10 demonstrates that Change Archaeologist is robust, conservative, and reliable when executed on authentic, uncurated Git histories. Its AST extraction rules reliably filter out noise such as nested callbacks and non-guard conditionals, while its conservative correlation engine reliably distinguishes syntactic proximity from runtime causal proof. Change Archaeologist delivers high-signal, tamper-free forensic insights without making unfounded claims.

