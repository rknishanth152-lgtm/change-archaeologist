# Change Archaeologist

**Change Archaeologist** is a local-first static-analysis tool for JavaScript and TypeScript that analyzes historical control-flow and AST changes in a named function across Git revisions and conservatively correlates those changes with companion test changes.

The tool strictly separates:
- **`OBSERVED`**: Traceable, evidence-backed facts directly extracted from committed source ASTs and Git metadata.
- **`INFERRED`**: Rule-based interpretations and hypotheses supported by observed facts.
- **`UNKNOWN`**: Explicit epistemic boundaries acknowledging what static analysis cannot prove.

> **Project Status:** Core static-analysis engine, domain schemas, historical AST comparison, test-change analysis, conservative correlation, reporting, and CLI are fully implemented and verified with automated test suites (139 passing tests). Web viewer and UI components remain out of scope for the current MVP.

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
