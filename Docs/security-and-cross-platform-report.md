# Change Archaeologist — Milestone 11 Security & Cross-Platform Hardening Report

**Document Status:** Complete & Verified  
**Date:** November 4, 2026  
**System Under Test:** Change Archaeologist Static Analysis Engine & CLI (`change-archaeologist@0.1.0`)  
**Repository Visibility:** PRIVATE  
**Git Remote:** `https://github.com/rknishanth152-lgtm/change-archaeologist.git`  
**Baseline Commit:** `75a97c2`  
**Hardened & Verified Commit:** `a080c38`  
**GitHub Actions CI Run:** [Run 41855690732](https://github.com/rknishanth152-lgtm/change-archaeologist/actions/runs/41855690732) (`main` branch)

---

## 1. Executive Summary

Milestone 11 completes the **security, resource-limit, and cross-platform verification stage** of Change Archaeologist prior to introducing graphical viewer components. Change Archaeologist is designed from first principles as a local-first, zero-network, tamper-free forensic tool. As such, it must withstand malicious or malformed repositories, path traversal exploits, Git argument injection, denial-of-service via resource exhaustion, and subtle operating system differences between Windows and Linux.

### Key Milestones Achieved
1. **GitHub Actions Multi-OS CI:** Established `.github/workflows/ci.yml` running on both `windows-latest` and `ubuntu-latest` with clean lockfile installation (`npm ci`), TypeScript typechecking, complete Vitest execution, and production compilation.
2. **Resource-Limit Hardening:** Bounded file sizes (2 MB ceiling per blob), subprocess output buffers (10 MB default with custom cap enforcement), process timeouts (15s default), syntax error handling without unhandled panics, and multi-test candidate scaling.
3. **Git Subprocess & Path Safety:** Fully validated flag injection defense (rejections of revisions starting with `-`), shell metacharacter blocking, space-containing directory handling, path traversal (`..`) blocking, Windows drive/UNC path rejections, null-byte input rejection, and case-insensitive `.git` protection.
4. **Repository Non-Modification Invariants:** Verified bit-for-bit preservation of `HEAD`, tree objects, Git index, Git configuration, committed source, and dirty working trees before and after analysis.
5. **Report Serialization Hardening:** Verified that Markdown heading injections, script tags, HTML entities, pipe characters in table cells, and quad-backtick code fences in untrusted source text cannot compromise document structure or inject executable tags. Verified schema validity and JSON formatting.
6. **Cross-Platform Bug Fix & Verification:** Discovered and fixed a genuine platform discrepancy between Windows NT and Linux glibc/kernel child process stdio buffer handling. Both `windows-latest` (3m 38s) and `ubuntu-latest` (1m 14s) now pass 100% of the 177 automated tests in GitHub Actions.

---

## 2. Threat Model

Change Archaeologist analyzes untrusted repositories provided by developers, security researchers, or CI systems. The threat model accounts for the following vectors:

| Threat ID | Threat Vector | Potential Impact | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **T-01** | **Git Argument Injection** | Arbitrary command execution via maliciously crafted revisions (e.g. `--upload-pack`) | Strict argument array invocation (`execFile` with `shell: false`); validation rejecting revision strings starting with `-` or non-standard characters. |
| **T-02** | **Path Traversal / Escape** | Reading or exposing sensitive host files (`/etc/passwd`, `C:\Windows`) | `normalizeRepoRelativePath` strictly forbids `..`, drive letters, UNC paths, and leading slashes. |
| **T-03** | **Repository Mutation** | Accidental or malicious alteration of repository refs, working tree, or Git index | `GIT_OPTIONAL_LOCKS: "0"`, read-only `cat-file` and `show` plumbing commands, global safety flags (`core.hooksPath=`, `core.fsmonitor=false`, `--no-pager`). |
| **T-04** | **Denial of Service (DoS)** | Memory exhaustion or process hangs via massive files, endless streams, or deadlocks | `MAX_BLOB_SIZE_BYTES = 2 MB` cap, output buffer limits, 15-second subprocess timeouts, `GIT_TERMINAL_PROMPT: "0"`. |
| **T-05** | **Report Injection / XSS** | Breaking Markdown document structure, injecting false headers, or injecting malicious HTML | Rigorous escaping (`safeEscapeText`, `safeEscapeTableCell`), dynamic code fence delimiter scaling (`formatCodeBlock`), and schema validation prior to JSON serialization. |
| **T-06** | **Protected File Overwrite** | Overwriting internal `.git/` files or production code with report files | `safeWriteReportFile` enforces destination path validation, blocks `.git` (case-insensitive across POSIX/Windows), and forbids overwriting target code files. |

---

## 3. GitHub Actions Continuous Integration

A multi-platform CI workflow was introduced at `.github/workflows/ci.yml`.

### Workflow Configuration
- **Triggers:** `push` to `main`, `pull_request` against `main`.
- **Operating System Matrix:** `windows-latest`, `ubuntu-latest`.
- **Node.js Environment:** Node.js 22 LTS with `cache: npm`.
- **Execution Pipeline:**
  1. `actions/checkout@v4`
  2. `actions/setup-node@v4` with Node 22
  3. `npm ci` (clean, lockfile-reproducible dependency installation)
  4. `npm run typecheck` (`tsc --noEmit`)
  5. `npm run test` (`vitest run`)
  6. `npm run build` (`tsc --outDir dist`)
- **Security Posture:** No build artifacts or repository files are published or uploaded to public endpoints.

---

## 4. Test Results: Local vs. GitHub Actions CI

To maintain epistemic integrity, tests executed locally on the developer workstation are strictly distinguished from tests executed remotely in GitHub Actions:

### Test Execution Summary

| Test Suite / Phase | Test File | Local (Windows 11 x64) | CI: Windows (`windows-latest`) | CI: Linux (`ubuntu-latest`) | Test Count |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Domain Models & Validation** | `tests/unit/domain/domain-model.test.ts` | ✓ Passed | ✓ Passed | ✓ Passed | 14 |
| **AST Spike Baseline** | `spike/validate-ast-core.test.ts` | ✓ Passed | ✓ Passed | ✓ Passed | 8 |
| **Git History Adapter** | `tests/integration/git/git-adapter.test.ts` | ✓ Passed | ✓ Passed | ✓ Passed | 10 |
| **Historical Function Comparator** | `tests/integration/comparison/historical-function-comparator.test.ts` | ✓ Passed | ✓ Passed | ✓ Passed | 15 |
| **Test-Change Analysis** | `tests/integration/test-analysis/test-analysis-service.test.ts` | ✓ Passed | ✓ Passed | ✓ Passed | 22 |
| **Change-to-Test Correlation** | `tests/unit/correlation/change-correlator.test.ts` | ✓ Passed | ✓ Passed | ✓ Passed | 22 |
| **Report Serialization** | `tests/unit/reporting/reporting.test.ts` | ✓ Passed | ✓ Passed | ✓ Passed | 27 |
| **CLI & Orchestration** | `tests/integration/cli/cli.test.ts` | ✓ Passed | ✓ Passed | ✓ Passed | 22 |
| **Validation Corpus (Milestone 9)** | `tests/integration/validation/validation-corpus.test.ts` | ✓ Passed | ✓ Passed | ✓ Passed | 15 |
| **Resource Limits (Milestone 11)** | `tests/integration/security/resource-limits.test.ts` | ✓ Passed | ✓ Passed | ✓ Passed | 6 |
| **Git & Path Security (Milestone 11)** | `tests/integration/security/git-path-security.test.ts` | ✓ Passed | ✓ Passed | ✓ Passed | 10 |
| **Report Security (Milestone 11)** | `tests/unit/security/report-security.test.ts` | ✓ Passed | ✓ Passed | ✓ Passed | 6 |
| **TOTALS** | **12 Test Suites** | **177 / 177 Passed** | **177 / 177 Passed** | **177 / 177 Passed** | **177** |

### Verified CI Runs on GitHub
- **Run ID:** `41855690732`
- **Commit:** `a080c38`
- **Result:** **Success (All jobs green)**
  - `Build & Test (windows-latest)`: Completed in 3m 38s
  - `Build & Test (ubuntu-latest)`: Completed in 1m 14s

---

## 5. Security & Hardening Verification Details

### 5.1 Resource Limits & DoS Resistance
- **Blob Size Ceiling:** Verified that a committed file exceeding 2 MB (`2 * 1024 * 1024 + 1024` bytes) triggers `GitError` code `BLOB_SIZE_EXCEEDED` and causes the CLI to halt cleanly with exit code 3 (`INVALID_REPOSITORY_OR_REVISION`), outputting clear diagnostic errors to stderr without unhandled crashes.
- **Output Buffer Cap:** Verified that subprocess output exceeding `maxBufferBytes` rejects with `GIT_OUTPUT_LIMIT_EXCEEDED`.
- **Subprocess Timeout:** Verified that unresponsive commands reject with `GIT_TIMEOUT` after the configured timeout threshold.
- **Malformed Source Code:** Verified that severely syntactically broken code (e.g. unclosed parentheses, dangling keywords) is safely isolated by `ts-morph` and reported as `INCOMPLETE_PARSE_ERROR` with structured diagnostic records, without throwing unhandled AST traversal panics.
- **Multi-File Test Scaling:** Verified that a large batch of 10 companion test files executes sequentially, keeping memory bounded and producing a valid `TestAnalysisReport`.

### 5.2 Git Subprocess & Path Safety
- **Option Injection Defense:** Verified that revision specifiers starting with a dash (`-p`, `--upload-pack=malicious`, `--help`, `-c core.pager=cat`) are rejected by `validateRevisionSpecifier` with `INVALID_REVISION`.
- **Shell Metacharacters:** Verified that revisions containing semicolons, pipes, backticks, dollar expansions, or newlines are rejected.
- **Space-Containing Paths:** Verified that repository directories containing spaces (`ca test space-...`) are handled without argument fragmentation because `execFile` passes argv arrays directly to the OS kernel without invoking `cmd.exe` or `/bin/sh`.
- **Path Traversal Protection:** Verified that paths containing `..`, `../`, `..\\`, or internal traversal sequences are rejected with `INVALID_PATH`.
- **Drive Letter & UNC Rejection:** Verified that Windows drive paths (`C:\...`, `D:/...`) and UNC paths (`\\server\share`) are strictly rejected as repository-relative targets.
- **Null-Byte Injection:** Verified that null bytes (`\0`) in paths or revision strings are immediately rejected.
- **Symlink Boundary Isolation:** Verified that Git blobs representing symlinks point only to text records within Git's object store and cannot cause host filesystem reads.

### 5.3 Repository Non-Modification
Using isolated disposable repositories initialized in temporary storage, full analysis was run against repositories containing:
- Committed historical files
- Uncommitted dirty working-tree files
- Custom `.git/config` entries (`custom.auditor = change-archaeologist`)

**Non-Modification Assertions:**
- `git rev-parse HEAD`: Identical pre- and post-analysis
- `git rev-parse HEAD^{tree}`: Identical pre- and post-analysis
- `git status --porcelain`: Identical pre- and post-analysis
- `sha256(.git/HEAD)`: Bit-for-bit identical
- `sha256(.git/config)`: Bit-for-bit identical
- `sha256(.git/index)`: Bit-for-bit identical
- `sha256(src/security.ts)`: Bit-for-bit identical (uncommitted edits preserved intact)

### 5.4 Report Serialization Security
- **Markdown Header Escaping:** Lines in commit subjects or findings starting with `#` are escaped (`\#`), preventing injected top-level headings from breaking document outline.
- **HTML Script Tag Neutralization:** Raw `<script>` and HTML tags in function names, summaries, or descriptions are escaped to `&lt;script&gt;`, eliminating browser execution risks.
- **Table Cell Integrity:** Pipe characters (`|`) in table cells are escaped (`\|`), and newlines are normalized to `<br>`, preventing table layout collapse.
- **Dynamic Code Fence Delimiters:** Verified that code snippets containing quad backticks (````) automatically trigger expanded code fences with 5 backticks (`````ts ... `````), preventing premature code block closure.
- **JSON Schema Compliance:** Malicious repository content serialized via `serializeReportToJson` produces valid, parseable JSON that satisfies `assertValidAnalysisReport`.

---

## 6. Verified Defects Discovered & Fixed

During Phase 7 cross-platform execution on GitHub Actions, a genuine platform-dependent defect was discovered and resolved:

### Defect 1: Discrepancy in `child_process.execFile` Buffer Limit Enforcement on Linux
- **Symptom:** On `ubuntu-latest`, `tests/integration/security/resource-limits.test.ts` failed because `constrainedRunner.exec(repo.dir, ["log", "-n", "1"])` with `maxBuffer: 32` resolved successfully with 140 bytes of output instead of rejecting. On `windows-latest`, the test passed.
- **Root Cause:** In Node.js on Linux, when a child process produces small output (~140 bytes) and exits immediately (within ~1 ms), the child process exits with code 0 before Node's stdio stream handler registers that the buffer threshold was exceeded. On Windows NT, slower process teardown caused Node's internal buffer check to fire first.
- **Fix:** Enhanced `src/core/git/git-runner.ts` to perform an explicit, cross-platform byte length check (`Buffer.byteLength(stdoutStr, "utf8") > maxBuffer`) immediately after subprocess execution completes. If output exceeds `maxBuffer`, it rejects with `GIT_OUTPUT_LIMIT_EXCEEDED` regardless of kernel timing.
- **Verification:** Both Windows and Ubuntu CI runners passed the test suite on the subsequent push (Commit `a080c38`).

### Defect 2: Case-Insensitive `.git` Path Check in Safe File Writer
- **Symptom:** `safeWriteReportFile` used `normalizedSegments.includes(".git")`. On Windows NTFS filesystems (which are case-insensitive), writing to `.GIT/HEAD` or `.Git/config` would not have matched the lowercase string `.git`.
- **Fix:** Updated `src/cli/safe-file-writer.ts` to split paths across both `/` and `\` separators and perform a case-insensitive check: `normalizedSegments.some((s) => s.toLowerCase() === ".git")`.
- **Verification:** Dedicated regression test added in `tests/integration/security/git-path-security.test.ts` asserting that writing to `.GIT/HEAD` is rejected.

---

## 7. Remaining Limitations & Boundaries

1. **Subprocess Spawning Overhead on Windows:** Running multiple Git commands sequentially takes approximately 2–3x longer on Windows compared to Linux due to Windows process creation overhead. Timeouts in integration tests are calibrated to 30–60 seconds to accommodate this difference without flakes.
2. **Read-Only Scope vs. Report Writing:** While analysis and source loading are guaranteed strictly read-only, if a user specifies `--output <path>`, the CLI writes to that file destination. This is controlled and documented behavior, protected by destination validation (`safeWriteReportFile`).
3. **Static Analysis Epistemic Limits:** The system statically observes AST structures; it cannot prove whether a modified test actually executed or passed at runtime.

---

## 8. Conclusion

Change Archaeologist has passed all security, resource-limit, and cross-platform criteria. The codebase is deterministic, resilient against malicious repository inputs, and verified across both Windows and Ubuntu on GitHub Actions. The project is fully prepared for Milestone 12 (React Graphical Viewer).
