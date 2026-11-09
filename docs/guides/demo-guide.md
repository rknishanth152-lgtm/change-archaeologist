# Change Archaeologist — Demonstration & Reproducibility Guide

**System:** Change Archaeologist CLI & Static Analysis Engine  
**Version:** `0.1.0`  
**Target Audience:** Evaluators, Security Engineers, and Software Archaeologists  
**Execution Environment:** Windows, macOS, and Linux (Ubuntu verified)

---

## 1. Overview & Objective

This guide explains how to generate a deterministic demonstration Git repository, execute **Change Archaeologist** against real historical commit pairs, and inspect the resulting JSON and Markdown investigation reports.

Change Archaeologist is a local-first developer tool that:
1. **Extracts Structural AST Deltas:** Identifies changes in function control flow (guard clauses, conditionals, return/throw exits) across Git revisions without compilation.
2. **Analyzes Companion Test Changes:** Detects modified, added, or deleted assertions and test declarations in companion test files.
3. **Applies Conservative Correlation:** Heuristically relates production changes to companion test modifications while preserving strict epistemic boundaries.
4. **Guarantees Epistemic Humility:** Distinguishes **`OBSERVED`** facts from **`INFERRED`** hypotheses and explicitly catalogs **`UNKNOWN`** conditions.

---

## 2. Prerequisites & Setup

### Requirements
- **Node.js**: `v20.0.0` or higher (tested on `v24.15.0` and `v22.x LTS`).
- **Git**: Installed and available on system `PATH` (Git $\ge$ 2.30 recommended).
- **Operating System**: Windows (PowerShell/CMD), Linux (Ubuntu), or macOS.

### Installation
Clone the repository and install dependencies using the reproducible lockfile:

```bash
git clone https://github.com/rknishanth152-lgtm/change-archaeologist.git
cd change-archaeologist
npm ci
```

Verify your installation:

```bash
npm run typecheck
npm run test
```

---

## 3. Quick Start: The One-Command Demonstration

To build the project, generate the synthetic demonstration repository, run all 6 validation scenarios, verify actual results against predefined expectations, and generate sample reports, run:

```bash
npm run demo
```

### Expected Output
```text
================================================================================
             CHANGE ARCHAEOLOGIST - END-TO-END DEMONSTRATION                   
================================================================================
Generating synthetic demonstration repository in:
  E:\change-archaeologist\examples\demo-repository

Repository ready:
  Base Tag: base (9a8bf4ea)
  Head Tag: head (a8265d8d)

[Scenario A] ✓ PASS: Guard Clause Removal (2034ms)
  Function: processPayment in src/auth.ts
  Status:   COMPLETED_WITH_FINDINGS (Exit: 0)
  Reports:  examples/output/scenario-a-guard-clause-removal.md

[Scenario B] ✓ PASS: Conditional Expression Modification (1757ms)
  Function: authorizeUser in src/access.ts
  Status:   COMPLETED_WITH_FINDINGS (Exit: 0)
  Reports:  examples/output/scenario-b-conditional-expression-modification.md

[Scenario C] ✓ PASS: Throw-to-Return Conversion (1718ms)
  Function: loadConfig in src/config.ts
  Status:   COMPLETED_WITH_FINDINGS (Exit: 0)
  Reports:  examples/output/scenario-c-throw-to-return-conversion.md

[Scenario D] ✓ PASS: Companion Test Change Detection (3603ms)
  Function: calculateDiscount in src/order.ts
  Status:   COMPLETED_WITH_FINDINGS (Exit: 0)
  Reports:  examples/output/scenario-d-companion-test-change-detection.md

[Scenario E] ✓ PASS: Conservative Change-to-Test Correlation (3531ms)
  Function: calculateDiscount in src/order.ts
  Status:   COMPLETED_WITH_FINDINGS (Exit: 0)
  Reports:  examples/output/scenario-e-conservative-change-to-test-correlation.md

[Scenario F] ✓ PASS: Unknown or Incomplete Evidence (Missing Function) (1719ms)
  Function: deprecatedHelper in src/legacy.ts
  Status:   INCOMPLETE_FUNCTION_MISSING (Exit: 1)
  Reports:  examples/output/scenario-f-unknown-or-incomplete-evidence-missing-function-.md

================================================================================
DEMONSTRATION RESULTS: 6 / 6 Scenarios Passed (14908ms)
================================================================================
All demonstration scenarios completed with 100% agreement with expectations.
Inspect generated reports in: E:\change-archaeologist\examples\output
================================================================================
```

---

## 4. The Demonstration Scenarios

The demonstration repository models realistic, pragmatic code changes across six distinct archetypes:

### Scenario A: Guard Clause Removal
- **Target:** `processPayment` in `src/auth.ts`
- **Revisions:** `base` $\rightarrow$ `head`
- **What Happened:** In `base`, `processPayment` validated incoming payments with `if (!payment.valid) throw new Error(...)`. In `head`, this defensive guard clause was removed.
- **Engine Detection:** Emits `RULE_GUARD_REMOVED` with precise before/after line spans and code snippets.
- **Epistemic Invariant:** The report never claims a "bug was introduced" or "a regression occurred"; it notes the structural fact that validation was eliminated at the function entry point.

### Scenario B: Conditional Operator Modification
- **Target:** `authorizeUser` in `src/access.ts`
- **Revisions:** `base` $\rightarrow$ `head`
- **What Happened:** In `base`, authorization required `if (user.isAdmin && user.isOwner)`. In `head`, the logical operator mutated to logical OR: `if (user.isAdmin || user.isOwner)`.
- **Engine Detection:** Emits `RULE_CONDITIONAL_MODIFIED` under category `CONDITIONAL_EXPRESSION`.
- **Epistemic Invariant:** Static analysis does not evaluate runtime permissions; it marks runtime authorization security implications as an explicit `UNKNOWN`.

### Scenario C: Throw-to-Return Conversion
- **Target:** `loadConfig` in `src/config.ts`
- **Revisions:** `base` $\rightarrow$ `head`
- **What Happened:** In `base`, missing configuration triggered `throw new Error(...)`. In `head`, it was replaced by a fallback return value: `return {};`.
- **Engine Detection:** Emits `RULE_THROW_TO_RETURN_CONVERSION` under category `GUARD_CLAUSE`.
- **Epistemic Invariant:** Identifies the shift from an exceptional exit to a non-exceptional exit without assuming whether callers anticipate the fallback object.

### Scenario D: Companion Test Change Detection
- **Target:** `calculateDiscount` in `src/order.ts` with companion test `tests/order.test.ts`
- **Revisions:** `base` $\rightarrow$ `head`
- **What Happened:** The companion test modified an assertion checking regular discount amounts.
- **Engine Detection:** Discovers the test block `order calculation > calculates regular discount`, extracting the before/after AST assertion change with 1-based column/line spans.

### Scenario E: Conservative Change-to-Test Correlation
- **Target:** `calculateDiscount` in `src/order.ts` with companion test `tests/order.test.ts`
- **Revisions:** `base` $\rightarrow$ `head`
- **What Happened:** In the same commit range, `calculateDiscount` changed its rate from 10% to 15%, and the companion test assertion updated from `toBe(10)` to `toBe(15)`.
- **Engine Correlation:** Emits correlation classification `POTENTIALLY_RELATED_ASSERTION_MODIFIED` with status `STRONG`.
- **Epistemic Invariant:** `STRONG` reflects **syntactic proximity prioritization** (the test block directly invokes `calculateDiscount`). The report explicitly states:
  > *"Potential relationship: Assertion was modified alongside production structural change; relationship remains unverified."*
  > *"Unknown: Static analysis cannot prove that the modified assertion verifies the changed production code, nor whether tests pass at runtime."*

### Scenario F: Missing Function in HEAD (Epistemic Boundary)
- **Target:** `deprecatedHelper` in `src/legacy.ts`
- **Revisions:** `base` $\rightarrow$ `head`
- **What Happened:** `deprecatedHelper` existed in `base` but was removed in `head`.
- **Engine Detection:** Halts gracefully with exit code `1` (`INCOMPLETE_ANALYSIS`) and status `INCOMPLETE_FUNCTION_MISSING`.
- **Epistemic Invariant:** Refuses to guess or synthesize artificial structural diffs when ground truth is missing; generates an audit trail explaining that the function cannot be resolved in HEAD.

---

## 5. Manual Execution & CLI Inspection

You can run individual investigations directly against the demonstration repository using the Change Archaeologist CLI:

```bash
# 1. Generate the demo repository
npm run build
node dist/scripts/create-demo-repository.js examples/demo-repository

# 2. Run Scenario A and output Markdown to console
node bin/change-archaeologist.js analyze \
  --repo examples/demo-repository \
  --file src/auth.ts \
  --function processPayment \
  --base base \
  --head head

# 3. Run Scenario E with test correlation and save JSON report
node bin/change-archaeologist.js analyze \
  --repo examples/demo-repository \
  --file src/order.ts \
  --function calculateDiscount \
  --base base \
  --head head \
  --test-file tests/order.test.ts \
  --format json \
  --output my-correlation-report.json
```

---

## 6. Inspecting the Generated Reports

Sample reports are saved in `examples/output/`:

### Markdown Reports (`*.md`)
Open any Markdown report (e.g. `examples/output/scenario-e-conservative-change-to-test-correlation.md`) in any Markdown viewer. Key sections include:
- **`# Investigation Summary`**: High-level metadata, analysis status, and attention level.
- **`## Production Structural Changes`**: AST changes categorized with line numbers and snippets.
- **`## Change-to-Test Correlation`**: Heuristic correlation table with syntactic proximity ratings.
- **`## Observed Evidence`**: Verified source snapshots anchored in commit SHAs and line spans.
- **`## Inferred Implications`**: Rule-based hypotheses explicitly linked to supporting observations.
- **`## Unknowns and Limitations`**: Explicit epistemological boundaries that static analysis cannot cross.

### JSON Reports (`*.json`)
Open any JSON report (e.g. `examples/output/scenario-e-conservative-change-to-test-correlation.json`) to inspect the machine-readable schema:
```json
{
  "schemaVersion": "1.0.0",
  "status": "COMPLETED_WITH_FINDINGS",
  "structuralChanges": [
    {
      "id": "SC-001",
      "ruleId": "RULE_RETURN_MODIFIED",
      "category": "RETURN_STATEMENT",
      "changeType": "MODIFIED",
      "summary": "Return statement modified: from \"return price * 0.10;\" to \"return price * 0.15;\"",
      "afterSpan": { "startLine": 5, "startColumn": 3, "endLine": 5, "endColumn": 23 }
    }
  ],
  "correlationItems": [
    {
      "id": "CORR-ITEM-001",
      "classification": "POTENTIALLY_RELATED_ASSERTION_MODIFIED",
      "status": "STRONG",
      "inferredRelationship": "Potential relationship: Assertion was modified alongside production structural change; relationship remains unverified."
    }
  ]
}
```

Every JSON report satisfies the strict domain schema validated by `validateAnalysisReport()`.

---

## 7. Cross-Platform Reproduction (Windows & Ubuntu)

The demonstration harness is strictly platform-independent:
- **Path Separation:** All repository-relative paths use POSIX `/` standard separators.
- **Git Execution:** Subprocesses are launched via `child_process.execFile` with `shell: false`, avoiding `cmd.exe` or `/bin/sh` shell escaping discrepancies.
- **Line Endings:** Git `core.autocrlf: false` is configured on synthetic repos to ensure LF/CRLF normalization differences never pollute AST comparisons.
- **Continuous Integration:** Both Windows Server 2022 (`windows-latest`) and Ubuntu 24.04 LTS (`ubuntu-latest`) run the complete test suite on every commit via GitHub Actions.

