# Change Archaeologist

**Change Archaeologist** is a local-first static-analysis tool for JavaScript and TypeScript that analyzes historical control-flow and AST changes in a named function across Git revisions and conservatively correlates those changes with companion test changes.

The tool strictly separates:
- **`OBSERVED`**: Traceable, evidence-backed facts directly extracted from committed source ASTs and Git metadata.
- **`INFERRED`**: Rule-based interpretations and hypotheses supported by observed facts.
- **`UNKNOWN`**: Explicit epistemic boundaries acknowledging what static analysis cannot prove.

> **Project Status:** Core static-analysis engine, domain schemas, historical AST comparison, companion test analysis, conservative correlation, JSON/Markdown reporting, CLI orchestration, security hardening, end-to-end demonstration environment, and the interactive Evidence Atlas web viewer are fully implemented and verified with automated test suites (359 passing tests across 29 test files, 6/6 demonstration scenarios passing).

---

## Quick Start: One-Command Demonstration

To experience Change Archaeologist immediately on a deterministic, realistic Git history without configuring target repositories:

```bash
npm run demo
```

This command:
1. Programmatically builds a synthetic Git repository in `examples/demo-repository/` with fixed commits.
2. Executes Change Archaeologist across 6 core scenarios (guard removal, operator mutation, throw-to-return conversion, companion test changes, conservative correlation, and missing functions).
3. Verifies outputs against predefined expectations in `examples/demo-expectations.json`.
4. Writes sample Markdown (`.md`) and JSON (`.json`) reports into `examples/output/`.

See [Docs/demo-guide.md](Docs/demo-guide.md) for full scenario walkthroughs and inspection details.

---

## Important Limitations & Epistemic Boundaries

1. **No Runtime Execution**: Change Archaeologist never compiles, executes, or runs your application code or test suites.
2. **No Dynamic Test Coverage**: The tool does **NOT** measure, calculate, or claim runtime code coverage, branch coverage, or test passing/failing status.
3. **Correlation is Not Causation**: Identifying that an assertion changed in the same commit as a function does not prove the test exercises the altered branch or verifies the behavior.
4. **No Regression Proof**: Control-flow or guard changes do not prove that a bug or defect was introduced.
5. **Absence of Proof**: The absence of detected changes or correlations does not prove the absence of runtime behavioral impact.

---

## System Requirements

- **Node.js**: $\ge$ 20.0.0 (verified on Node.js v24.15.0).
- **Git**: Installed and available on your system `PATH` (Git $\ge$ 2.30 recommended).
- **Operating System**: Windows, macOS, or Linux.

---

## Installation & Setup

Clone the repository and install dependencies:

```bash
git clone <repository-url>
cd change-archaeologist
npm install
```

### Build (Optional)

Compile TypeScript to JavaScript:

```bash
npm run build
```

Verify tests and type safety:

```bash
npm run typecheck
npm run test
```

---

## Interactive Evidence Atlas (Web Viewer)

Change Archaeologist includes a local-first, interactive forensic analysis viewer called **Evidence Atlas**. It provides side-by-side Monaco code comparison, an archaeological change timeline, and an interactive Production–Test Correlation Graph.

### 1. Launch the Viewer Locally

```bash
# Start local development server (Vite on http://localhost:5173)
npm run dev

# Or preview the production build
npm run build
npm run preview
```

### 2. Inspecting Reports

- **Preloaded Demonstrations:** Use the **Demo Preset** dropdown in the header to switch between Scenarios A through F with zero setup.
- **Importing CLI Reports:** Generate a JSON report via the CLI (`--format json --output report.json`), then click **Import JSON** in the top navigation to load and explore it.
- **How to Read This Report Guide:** Click **Guide** in the header for an interactive explanation of what changed, what tests tell us, and epistemic boundaries.

---

## Command-Line Interface (CLI)

The CLI can be invoked using the `analyze` subcommand or directly with options.

### Basic Syntax

```bash
# Using the executable launcher
node bin/change-archaeologist.js analyze [OPTIONS]

# Or after building
node dist/src/cli/index.js analyze [OPTIONS]
```

### Required Options

| Option | Flag | Description |
| :--- | :--- | :--- |
| `--repo <path>` | `-r` | Path to the local Git repository |
| `--file <path>` | `-f` | Repository-relative production source file (e.g. `src/auth.ts`) |
| `--function <name>` | `-fn` | Target function or method name (e.g. `verifyToken`) |
| `--base <revision>` | `-b` | Base Git revision (commit SHA, branch, or tag, e.g. `main~1`) |
| `--head <revision>` | | Head Git revision (commit SHA, branch, or tag, e.g. `main`) |

### Optional Configuration

| Option | Flag | Default | Description |
| :--- | :--- | :--- | :--- |
| `--format <json\|markdown>` | | `markdown` | Serialization format for the report |
| `--output <path>` | `-o` | *(stdout)* | Destination file path to save the generated report |
| `--force` | | `false` | Overwrite the destination file if it already exists |
| `--test-file <path>` | `-t` | *(none)* | Companion test file to analyze (can be repeated or comma-separated) |
| `--debug` | | `false` | Print detailed error traces on unexpected failures |
| `--help` | `-h` | | Show usage help text and exit |
| `--version` | `-v` | | Print tool version and exit |

---

## Exit Codes

Change Archaeologist defines stable, documented exit codes to facilitate CI integration and scripting:

| Code | Name | Meaning |
| :---: | :--- | :--- |
| **0** | `SUCCESS` | Complete analysis executed; valid complete report produced. |
| **1** | `INCOMPLETE_ANALYSIS` | Analysis was incomplete (e.g. target function missing in one revision, test syntax error); valid partial report produced. |
| **2** | `INVALID_ARGUMENTS` | Missing mandatory arguments, unknown options, or malformed parameters. |
| **3** | `INVALID_REPOSITORY_OR_REVISION` | Repository path not found, not a Git repository, invalid revision, or path traversal detected. |
| **4** | `ANALYSIS_FAILURE` | Unexpected AST parsing or internal extraction failure preventing report generation. |
| **5** | `OUTPUT_FAILURE` | File write failure, destination exists without `--force`, or path targets `.git`. |

---

## Examples

### 1. Markdown Report to stdout

```bash
# Windows
node bin/change-archaeologist.js analyze --repo "C:\projects\my-app" --file "src/auth/token.ts" --function "verifyToken" --base "main~1" --head "main" --format markdown

# Linux / macOS
node bin/change-archaeologist.js analyze --repo "/home/user/my-app" --file "src/auth/token.ts" --function "verifyToken" --base "main~1" --head "main" --format markdown
```

### 2. JSON Report Written to File

```bash
# Writes JSON report cleanly without progress message interference
node bin/change-archaeologist.js analyze \
  --repo "./my-app" \
  --file "src/services/billing.ts" \
  --function "calculateDiscount" \
  --base "v1.2.0" \
  --head "v1.3.0" \
  --format json \
  --output "reports/billing-investigation.json"
```

### 3. Overwriting an Existing Report with `--force`

```bash
node bin/change-archaeologist.js analyze \
  --repo "./my-app" \
  --file "src/services/billing.ts" \
  --function "calculateDiscount" \
  --base "HEAD~1" \
  --head "HEAD" \
  --output "reports/billing.md" \
  --force
```

### 4. Analyzing Companion Test Changes

```bash
node bin/change-archaeologist.js analyze \
  --repo "./my-app" \
  --file "src/auth/token.ts" \
  --function "verifyToken" \
  --base "v1.0" \
  --head "v2.0" \
  --test-file "tests/auth/token.test.ts" \
  --test-file "tests/e2e/login.test.ts" \
  --format markdown \
  --output "investigation.md"
```

---

## Architecture Principles

- **Zero Third-Party Domain Dependencies**: Core domain types, runtime schemas, and serializers are built with standard TypeScript and Node.js built-ins.
- **Pure Static AST Analysis**: Powered in-memory by `ts-morph` and the TypeScript Compiler API.
- **Subprocess Isolation**: Git access is managed via a strict subprocess runner (`shell: false`) with strict argument arrays, preventing shell injection vulnerabilities.
- **Repository Non-Modification**: All Git queries inspect committed historical blobs; working tree, index, and Git refs are never modified.
- **Safe Output Writing**: Atomic writes via temporary files; protects internal `.git` directories and prevents accidental code overwrites.

---

## Project Principle

**Show the evidence. Label the inference. Admit what is unknown.**

---

## License

MIT © 2026 Change Archaeologist Authors. See [LICENSE](LICENSE) for details.
