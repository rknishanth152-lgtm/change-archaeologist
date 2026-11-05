# Change Archaeologist: Complete Project Context

**Document:** `PROJECT_CONTEXT.md`  
**Purpose:** Handoff briefing for an independent frontend evaluation and redesign.  
**Audience:** Independent LLM acting as frontend architect and product designer.  
**Repository:** `E:\change-archaeologist`  
**Baseline Git Commit:** `812ddd6 docs(security): add Milestone 11 security and cross-platform report`  
**Working Tree Status:** Clean core engine (`src/core/`, `src/cli/`); active presentation layer under `src/viewer/`.

---

## 1. What Change Archaeologist Actually Is

**Change Archaeologist** is a **local-first static analysis tool** written in TypeScript for Node.js and modern browsers. It analyzes JavaScript and TypeScript source files across Git history to answer a precise software engineering question:

> *"Between two Git revisions (BASE and HEAD), how did a specific production function change structurally, what companion test changes were committed alongside it, and what conservative analytical correlations link the code shifts to the test shifts?"*

The product consists of two distinct components:
1. **Core Analysis Engine & CLI (`src/core/`, `src/cli/`):** A headless CLI tool (`change-archaeologist`) that queries a local Git repository, parses Abstract Syntax Trees (ASTs) using `ts-morph`, extracts discrete structural mutations, inspects test declarations and assertions, computes conservative correlations, and serializes a strictly validated `AnalysisReport` (JSON or Markdown).
2. **Evidence Atlas Report Viewer (`src/viewer/`):** A client-side, local-first web application (built with React 19, TypeScript, Vite, Tailwind CSS, Motion, Monaco Editor, and React Flow) that ingests, visualizes, and navigates `AnalysisReport` datasets without transmitting data to any cloud service.

---

## 2. The Core Philosophy: Epistemic Humility

The foundational principle of Change Archaeologist is **epistemic non-causality**:
- **Static analysis examines code structure in Git; it does NOT execute code or run test runners.**
- The tool explicitly distinguishes between:
  1. **`OBSERVED`:** Factual data points directly supported by committed code (e.g., *"Guard clause `if (!token) return null;` removed in commit `a8265d8` at line 14"*).
  2. **`INFERRED`:** Algorithmic interpretations derived from co-occurrence or syntactic proximity (e.g., *"Test assertion updated in the same commit to call the modified function"*).
  3. **`UNKNOWN`:** Explicit boundary statements declaring what static analysis cannot establish (e.g., *"Whether this change caused a bug, whether tests passed in CI, or whether runtime callers were affected"*).
- **Hard Rule for UI Design:** No status badge, label, icon, or color in Change Archaeologist may ever imply that a test "passed" or "failed", or that code has verified "runtime coverage". The tool observes committed artifacts, not dynamic executions.

---

## 3. Target Audience & User Personas

1. **Senior Software Engineers & Tech Leads:**
   - *Need:* Investigating subtle regression bugs, analyzing legacy Git commits, reviewing refactors where defensive checks or exit points were altered.
   - *Behavior:* Scans commit-to-commit timeline, examines side-by-side AST Monaco diffs, traces which test assertions were updated.
2. **Quality Assurance & Systems Engineers:**
   - *Need:* Determining whether test suites were updated in the same revision as critical logic changes, identifying "unmatched" production changes committed without companion test updates.
   - *Behavior:* Uses Correlation Matrix, filters by `STRONG` vs `WEAK` vs `NONE`, inspects assertion diffs.
3. **Newcomers, Junior Engineers & Students:**
   - *Need:* Making sense of complex diffs and understanding why AST mutations matter more than line/whitespace changes.
   - *Behavior:* Reads the "How to Read This Report" newcomer guide, reads plain-English explanation cards ("What changed?", "What tests tell us?", "What can we conclude?").
4. **Security & Compliance Auditors:**
   - *Need:* Traceable, immutable proof linking every analytical assertion to an exact Git commit SHA, file path, and source span coordinates.
   - *Behavior:* Clicks evidence anchors (`§ EV-001`) to verify exact line/column coordinates in the committed snapshot.

---

## 4. Input Parameters Required for Analysis

To execute an analysis run via the CLI, the following parameters are required:

| Parameter | Flag | Description | Example |
|---|---|---|---|
| **Repository Path** | `-r, --repo <path>` | Path to a local Git repository on disk | `./my-repo` or `C:\dev\repo` |
| **Production File** | `-f, --file <path>` | Repository-relative path to a JS/TS source file | `src/order.ts` |
| **Target Function** | `-fn, --function <name>` | Qualified or simple name of target function/method | `calculateDiscount` |
| **Base Revision** | `-b, --base <rev>` | Base Git commit SHA, branch, or tag | `main~1` or `9a8bf4e` |
| **Head Revision** | `--head <rev>` | Head Git commit SHA, branch, or tag | `main` or `a8265d8` |
| **Test Files** (Optional) | `-t, --test-file <path>` | Repository-relative companion test file(s) | `tests/order.test.ts` |
| **Format** (Optional) | `--format <format>` | Output serialization (`markdown` or `json`) | `--format json` (default: markdown) |
| **Output Path** (Optional) | `-o, --output <path>` | Destination path to save report (defaults to stdout) | `-o report.json` |
| **Force** (Optional) | `--force` | Overwrite existing output file | `--force` |

### Important Architectural Boundary: Local Analysis Only
> [!IMPORTANT]
> Change Archaeologist operates **exclusively on local Git repositories on the local filesystem**. It does **NOT** support querying arbitrary GitHub URLs (e.g. `https://github.com/org/repo`) over HTTP. Remote repositories must be cloned locally first before running Change Archaeologist.

---

## 5. What the Analysis Engine Actually Does

```
Local Git Repository on Disk
           │
           ▼
   [Git History Adapter] ──> Extracts committed snapshots via zero-mutation `git show`
           │
     ┌─────┴─────────────────────────┐
     ▼                               ▼
[Base Snapshot]                [Head Snapshot]
     │                               │
     ▼                               ▼
[ts-morph AST Parser]          [ts-morph AST Parser]
     │                               │
     ├─ Function Locator             ├─ Function Locator
     ├─ AST Normalizer               ├─ AST Normalizer
     └─ Structural Extractor         └─ Structural Extractor
           │                               │
           └───────────────┬───────────────┘
                           ▼
             [Historical AST Comparator]
             • Guard clauses (added/removed/modified)
             • Conditionals (operators/branches)
             • Throw statements vs Return statements
             • Structural mutations categorized
                           │
     ┌─────────────────────┴─────────────────────┐
     ▼                                           ▼
[Companion Test Analysis]              [Production Mutations]
• Locate describe / test / it          • Discrete Structural Changes
• Extract assertion expressions        • Exact Source Spans
• Detect calls to target function      • Clean Code Snippets
     │                                           │
     └─────────────────────┬─────────────────────┘
                           ▼
             [Conservative Change Correlator]
             • STRONG: Direct assertion call in same commit
             • WEAK: Modified test block without direct call
             • UNCERTAIN: Ambiguous or indirect linkage
             • NONE: No companion test modifications observed
                           │
                           ▼
             [Unified Report Assembler]
             • Strict Validation against domain schema v1.0.0
             • Serialization to JSON / Markdown
```

### 1. Zero-Mutation Git Subprocesses
- The Git adapter executes read-only subprocess commands (`git rev-parse`, `git show <commit>:<file>`, `git log`).
- It **never** modifies the Git working tree, Git index, Git reflog, or configuration. It runs cleanly even when the user's working tree contains uncommitted dirty edits.
- Path security strictly prevents command injection, directory traversal (`../`), null-byte poisoning, and Windows drive-letter escapement.

### 2. AST Parsing and Normalization
- Rather than calculating a raw text diff (which is polluted by whitespace, indentation, comments, or formatting shifts), `ts-morph` parses the TypeScript/JavaScript Abstract Syntax Tree.
- It extracts:
  - **Guard Clauses:** Leading defensive checks (`if (!input) return;` or `if (error) throw err;`).
  - **Conditional Expressions:** If-statements, ternary expressions (`? :`), switch statements, and logical operators (`&&`, `||`).
  - **Throw Statements:** Expressions thrown, enclosing guards, nesting depth.
  - **Return Statements:** Early returns, return values, exit categories (`VOID_OR_EMPTY`, `BOOLEAN_LITERAL`, `EXPRESSION`).

### 3. Companion Test Analysis
- Companion test files are parsed to extract test suites (`describe`) and test declarations (`it`, `test`).
- Recognizes standard testing frameworks (Vitest, Jest, Mocha).
- Extracts individual assertion expressions (`expect(fn()).toBe(...)`, `assert.strictEqual(...)`).
- Determines whether the test file imports the target production file and whether individual test blocks or assertions call or reference the target function.

### 4. Conservative Correlation Engine
- Correlates production structural changes with test changes using strict analytical rules:
  - **`STRONG`:** The test file was modified in the analyzed revision range AND contains an assertion directly referencing/calling the target function.
  - **`WEAK`:** The test file or enclosing block was modified in the revision range, but does not directly call the target function.
  - **`UNCERTAIN`:** Indirect, ambiguous, or incomplete link (e.g. delegated through an unverified helper).
  - **`NONE`:** A production mutation exists, but zero test changes were detected in the analyzed revision range.

---

## 6. What the Current Frontend Supports

The frontend (`src/viewer/`) is an offline-capable single-page application:
1. **Interactive Demo Scenarios:** Includes six deterministic demonstration datasets precompiled into the app (`src/viewer/data/demo-fixtures.ts`):
   - **Scenario A:** Guard Clause Removal (`processPayment`).
   - **Scenario B:** Conditional Expression Modification (`authorizeUser`).
   - **Scenario C:** Throw-to-Return Conversion (`loadConfig`).
   - **Scenario D:** Companion Test Change Detection (`calculateDiscount`).
   - **Scenario E:** Conservative Production-Test Correlation (`calculateDiscount`).
   - **Scenario F:** Incomplete Evidence / Missing Function (`deprecatedHelper`).
2. **Arbitrary Report Ingestion:** Users can drag-and-drop or select any valid `AnalysisReport` JSON file generated by the CLI. The frontend validates the JSON at runtime against `src/core/domain/schemas.ts`.
3. **Multi-Track Change Timeline:** Visualizes chronological progression from BASE to HEAD, segregating production mutations, companion test modifications, and declaration changes.
4. **Interactive Correlation Graph:** Uses React Flow (`@xyflow/react`) to map production functions, structural mutations, test files, and assertions into an interactive graph with an instant toggle to a WCAG-compliant Accessible Table View.
5. **Monaco Side-by-Side Code Comparison:** Embeds the Monaco Editor (`@monaco-editor/react`) to render side-by-side diffs anchored directly to the AST source spans, with evidence jumping controls.
6. **Detail Inspector:** Right-hand panel displaying plain-English interpretations, technical badges, evidence anchors, and explicit "Establishes vs Does NOT Establish" epistemic boundaries.
7. **Newcomer Reading Guide:** Dismissible guide answering the three core questions ("What changed?", "What do tests tell us?", "What can we conclude?").

---

## 7. Current Boundaries & What is Unimplemented

To ensure the receiving LLM does not hallucinate non-existent features:
- **No Multi-Function Whole-Repository Graph:** The core analysis engine analyzes **one named function in one production file** between two Git commits. It does not construct an entire project-wide AST call graph.
- **No Dynamic Test Execution:** The tool does not run tests, does not calculate code coverage percentages, and does not capture runtime call stacks.
- **No Remote Repository Querying:** The tool cannot analyze a GitHub URL directly; the repository must exist on the local filesystem.
- **Single-Commit or Two-Commit Comparison:** The engine compares two points in Git history (Commit A to Commit B). It does not analyze a continuous slider of 50 intermediate commits simultaneously.

