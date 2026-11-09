Change Archaeologist: Complete Architecture and Implementation Blueprint

PHASE A: REQUIREMENTS AND SYSTEM BOUNDARIES

A.1 Concise Product Definition

Change Archaeologist is a local-first, deterministic command-line tool and static-analysis engine for JavaScript and TypeScript repositories. Given a local Git repository, a target source file path, a named function, and two Git revisions (base and head), the tool extracts the historical source snapshots, compares the target function's Abstract Syntax Tree (AST) using ts-morph, inspects candidate test files modified between those revisions, and emits a structured JSON and Markdown investigation report. Every finding strictly separates directly observed syntax and Git facts (OBSERVED), rule-derived behavioral implications (INFERRED), and static-analysis limitations (UNKNOWN), without executing repository code or calling external AI APIs.

A.2 Primary User Journey

Invocation: A developer investigating a regression opens a terminal on Windows, macOS, or Linux and runs:npx change-archaeologist analyze --repo ./my-app --file src/auth/session.ts --function verifyToken --base a1b2c3d --head f4e5d6c --out ./report

Validation & Resolution: The CLI validates the arguments, confirms ./my-app is a readable Git repository, resolves a1b2c3d and f4e5d6c to immutable 40-character commit SHAs, and verifies that the repository remains untouched throughout execution.

Extraction & AST Comparison: The engine retrieves src/auth/session.ts at both revisions via read-only Git plumbing (git show), parses both snapshots into memory via ts-morph, locates verifyToken unambiguously in both snapshots, and extracts normalized structural descriptors for guard clauses, conditional expressions, throw statements, and return statements.

Test Discovery & Correlation: The engine inspects the diff manifest between base and head to identify changed test files (*.test.ts, *.spec.ts, etc.) and discovers unmodified candidate test files matching naming or import conventions. It parses relevant test snapshots to detect added, removed, or modified assertion call expressions (expect, assert).

Finding Synthesis & Reporting: The engine evaluates deterministic correlation rules to pair structural code changes with test observations, constructs Finding records containing explicit OBSERVED, INFERRED, and UNKNOWN items linked to exact line numbers and code snippets, and writes report.json and report.md.

A.3 Functional Requirements (FR)

ID

Status

Requirement Description

Satisfying Component(s)

Verification Test(s)

FR-001

Confirmed

Accept a local Git repository path, a relative file path, a target function name, a base revision, and a head revision via CLI arguments.

CliParser, RequestValidator

tests/unit/cli-parser.test.ts

FR-002

Confirmed

Resolve arbitrary revision specifiers (commits, tags, branches, HEAD~1) to exact 40-character commit SHAs and metadata via read-only Git subprocess calls.

GitRunner, RevisionResolver

tests/integration/git-resolver.test.ts

FR-003

Confirmed

Retrieve the exact historical text content of the target file at both base and head revisions without modifying the working tree or index.

HistoricalSourceLoader

tests/integration/source-loader.test.ts

FR-004

Confirmed

Parse JS/TS/JSX/TSX source snapshots in memory using ts-morph and locate the named function (FunctionDeclaration, MethodDeclaration, or named variable initialized to ArrowFunction/FunctionExpression).

AstParser, FunctionLocator

tests/unit/function-locator.test.ts

FR-005

Confirmed

Halt comparison and report an explicit limitation when the target function is missing in one/both revisions, overloaded/ambiguous (e.g., duplicate same-name declarations in nested scopes), or unparsable due to syntax errors.

FunctionLocator, FindingGenerator

tests/unit/function-edge-cases.test.ts

FR-006

Confirmed

Detect guard-clause additions and removals (IfStatement near the top of a block or function body whose consequent terminates control flow via return or throw).

StructuralComparator (GuardClauseRule)

tests/unit/rules/guard-rule.test.ts

FR-007

Confirmed

Detect conditional-expression modifications (IfStatement condition expressions, SwitchStatement discriminants, and ConditionalExpression ternaries).

StructuralComparator (ConditionalRule)

tests/unit/rules/conditional-rule.test.ts

FR-008

Confirmed

Detect ThrowStatement additions, removals, and thrown expression structural changes within the target function.

StructuralComparator (ThrowRule)

tests/unit/rules/throw-rule.test.ts

FR-009

Confirmed

Detect ReturnStatement additions, removals, and structural return-value category changes (e.g., void return vs. value return).

StructuralComparator (ReturnRule)

tests/unit/rules/return-rule.test.ts

FR-010

Confirmed

Ignore whitespace, comment, and formatting-only edits when evaluating structural change rules.

AstNormalizer, StructuralComparator

tests/unit/rules/formatting-noise.test.ts

FR-011

Confirmed

Identify candidate test files changed between base and head or associated by naming/import convention, and detect added, removed, or modified test assertion expressions (expect, assert).

TestDiscovery, TestAstAnalyzer

tests/unit/test-analyzer.test.ts

FR-012

Confirmed

Correlate structural function changes with observed test changes using explicit association tiers (STRONG, WEAK, NONE, UNCERTAIN).

CorrelationEngine

tests/unit/correlation.test.ts

FR-013

Confirmed

Classify every output claim strictly into OBSERVED, INFERRED, or UNKNOWN, requiring every INFERRED item to reference at least one valid EvidenceItem ID.

EvidenceBuilder, FindingGenerator

tests/unit/evidence-integrity.test.ts

FR-014

Confirmed

Serialize the complete investigation into schema-versioned JSON (report.json) and human-readable Markdown (report.md).

JsonReportSerializer, MarkdownReportSerializer

tests/unit/serializers.test.ts

A.4 Non-Functional Requirements (NFR)

ID

Status

Requirement Description

Satisfying Component(s)

Verification Test(s)

NFR-001

Confirmed

Repository Immutability: Executing an analysis must never alter the target repository's working tree, staging index, refs, or configuration.

GitRunner

tests/security/repo-immutability.test.ts

NFR-002

Confirmed

Subprocess Safety: All Git invocations must use child_process.execFile with shell: false, explicit argument arrays, -- path separators, disabled hooks, disabled external diff helpers, timeouts, and buffer caps.

GitRunner, PathValidator

tests/security/git-injection.test.ts

NFR-003

Confirmed

Zero External AI / Offline Execution: The runtime engine must operate 100% locally and deterministically without network access or LLM APIs.

Entire src/core/

tests/e2e/offline-execution.test.ts

NFR-004

Confirmed

Cross-Platform Compatibility: All path resolution, temporary directory creation, and Git pathspec formatting must pass on Windows, macOS, and Linux.

PathNormalizer, GitRunner

CI Matrix (windows-latest, ubuntu-latest)

NFR-005

Proposed

Bounded Resource Consumption: Source snapshots exceeding 2 MB or Git outputs exceeding 10 MB must be rejected cleanly with a structured error rather than exhausting Node.js heap memory.

GitRunner, HistoricalSourceLoader

tests/security/resource-limits.test.ts

NFR-006

Confirmed

UI Decoupling: Core analysis modules (src/core/) must have zero dependencies on CLI presentation (commander, process.exit) or web frameworks (react).

Module boundary lint & tsconfig.json

tests/architecture/dependency-direction.test.ts

A.5 Explicit Non-Goals (Initial Scope)

No Arbitrary Cross-File Function Lineage: v1.0 analyzes a named function within a specified file path across two revisions. It will not attempt heuristic similarity search across the entire repository to guess if a deleted function moved to another module.

No Dynamic Execution or Coverage Measurement: The tool will never execute npm test, build the target project, or measure runtime code coverage.

No Inter-Procedural Dataflow or Type Solver Proofs: ts-morph is used in fast, syntax-only in-memory AST mode (useInMemoryFileSystem: true). The tool does not resolve imported third-party types across node_modules or prove mathematical equivalence of refactored boolean expressions (e.g., De Morgan's laws).

No Multi-Commit Timeline Mining in v1.0 Core: While a wrapper can iterate over adjacent commit pairs later, the foundational v1.0 analysis boundary compares two explicit revisions (base and head) to ensure precision before longitudinal aggregation.

No React Web UI Prior to Core Completion: The web viewer is deferred until the CLI and core engine pass all verification gates.

A.6 Assumptions, Constraints, and Dependencies

Assumptions:

ASM-01: Target repositories have a standard git binary (v2.25+) installed and accessible on the host PATH.

ASM-02: Target source files are UTF-8 encoded .js, .jsx, .ts, or .tsx files. Binary files or non-UTF-8 encodings are treated as unsupported.

ASM-03: Conventional test files in JS/TS repositories either reside in __tests__/ directories or end with .test.{js,ts,jsx,tsx} or .spec.{js,ts,jsx,tsx}.

Constraints:

CON-01: Primary development machine is Windows; all scripts in package.json must work in PowerShell/CMD without bash-specific syntax (rm -rf, inline env vars FOO=bar cmd).

CON-02: All AI-assisted coding is performed via Gemini 3.8 Flash in Google Antigravity. Tasks must have bounded context and deterministic verification commands.

Core Dependencies:

Runtime: Node.js >= 20.0.0, ts-morph (AST parsing), zod (boundary validation), commander (CLI argument parsing).

Dev/Test: typescript, vitest, @types/node.

A.7 Major Technical Risks and Mitigations

Risk ID

Risk Description

Impact

Architectural Mitigation

RISK-A

AST ≠ Semantic Proof: Refactored validation (e.g., moving an if (!x) throw into a helper assertValid(x)) looks like a removed guard in the local AST.

False alarm if reported as a bug.

Never label structural changes as bugs. Always emit an UNKNOWN item stating that validation may have moved to a helper or caller.

RISK-B

Function Identity Ambiguity: Same-named functions inside nested scopes, class method overloads, or anonymous default exports.

Comparing the wrong AST node between base and head.

FunctionLocator builds a qualified structural path (e.g., ClassDeclaration[AuthService].MethodDeclaration[login]). If multiple runtime bodies match or only TypeScript overload signatures exist without a body, abort with AMBIGUOUS_TARGET.

RISK-C

Misleading Test Correlation: A commit touches auth.ts and auth.test.ts, but the test change is for logout() while the structural change is in login().

False correlation between unrelated changes.

TestAstAnalyzer checks whether the modified test()/it() block references the target function identifier (login). If auth.test.ts changed in another it() block that does not reference login, correlation is downgraded to WEAK or UNCERTAIN.

RISK-D

Windows Git Path & Subprocess Quirks: Windows path.join emits \, whereas git show <sha>:<path> strictly requires POSIX /. Malicious refs starting with - can trigger Git flags.

Subprocess failure on Windows or argument injection.

PathNormalizer converts all repo-relative paths to POSIX / before Git calls; RequestValidator rejects revision strings starting with - and enforces -- where applicable.

RISK-E

Statement Matching Drift: When lines are inserted above a guard clause, simple index-based statement comparison (statements[0] vs statements[0]) fails.

Reporting a moved guard as deleted and re-added.

Match extracted structural descriptors by normalized AST fingerprint (kind + normalized condition/expression tokens) before computing additions, removals, and modifications.

A.8 Unresolved Decisions & Recommended Resolution Strategy

Decision ID

Ambiguity / Competing Interpretations

Recommended Decision for v1.0

Validation Experiment to Confirm

DEC-01: Definition of a "Guard Clause"







Interpretation 1: Only top-level if statements at the very beginning of a function body before any non-declaration statements.

Interpretation 2: Any if statement anywhere in the function body whose then branch unconditionally terminates (return or throw) without an else branch (or where the else branch does not terminate).

Adopt Interpretation 2 (Unconditional Early-Exit Conditional), tagged with a positional property (isLeadingGuard: boolean if preceded only by variable declarations or other guards). This captures mid-function validation guards (e.g., after fetching a record) without losing distinction from entry guards.

Tested directly in the Phase P First Validation Experiment using Fixture 1 (entry guard) and Fixture 6 (nested/mid-function guard).

DEC-02: Scope of Candidate Test File Discovery



Interpretation 1: Only inspect test files that actually changed in the diff between base and head.

Interpretation 2: Also search the repository at head for existing companion test files (e.g., foo.test.ts for foo.ts) that did not change between base and head.

Adopt Interpretation 2. Discovering that src/auth.ts had a guard removed while src/auth.test.ts exists at head and had zero modifications between base and head is one of the highest-value investigative findings.

Verified in TestDiscovery unit tests (tests/unit/test-discovery.test.ts).

PHASE B: SYSTEM ARCHITECTURE

B.1 Logical Architecture Diagram

Code snippet

graph TD
    subgraph Presentation["Presentation & Entry Layer (src/cli/)"]
        CLI["CliEntrypoint (commander)"]
    end

    subgraph Orchestration["Orchestration & Validation Layer (src/core/orchestrator/)"]
        Validator["RequestValidator (zod + PathNormalizer)"]
        Coordinator["AnalysisCoordinator"]
    end

    subgraph GitLayer["Git Integration Layer (src/core/git/)"]
        GitRun["GitRunner (execFile wrapper)"]
        RevRes["RevisionResolver"]
        SrcLoad["HistoricalSourceLoader"]
    end

    subgraph AstLayer["AST & Structural Analysis Layer (src/core/ast/)"]
        Parser["AstParser (ts-morph in-memory)"]
        Locator["FunctionLocator"]
        Extractor["StructuralExtractor"]
        Comparator["StructuralComparator (Rules Engine)"]
    end

    subgraph TestLayer["Test Analysis & Correlation Layer (src/core/test-analysis/)"]
        TestDisc["TestDiscovery"]
        TestAst["TestAstAnalyzer"]
        Correlator["CorrelationEngine"]
    end

    subgraph Synthesis["Evidence, Finding & Reporting Layer (src/core/reporting/)"]
        EvBuilder["EvidenceBuilder"]
        FindGen["FindingGenerator"]
        JsonSer["JsonReportSerializer"]
        MdSer["MarkdownReportSerializer"]
    end

    CLI --> Validator
    Validator --> Coordinator
    Coordinator --> RevRes
    Coordinator --> SrcLoad
    RevRes --> GitRun
    SrcLoad --> GitRun

    Coordinator --> Parser
    Parser --> Locator
    Locator --> Extractor
    Extractor --> Comparator

    Coordinator --> TestDisc
    TestDisc --> GitRun
    TestDisc --> SrcLoad
    Coordinator --> TestAst
    TestAst --> Parser
    Coordinator --> Correlator
    Comparator --> Correlator
    TestAst --> Correlator

    Correlator --> EvBuilder
    EvBuilder --> FindGen
    FindGen --> JsonSer
    FindGen --> MdSer


Prose Explanation of Architecture & Dependency Direction:
The architecture enforces a strict top-down, acyclic dependency flow:

Presentation (src/cli/) depends on Orchestration (src/core/orchestrator/) and Reporting (src/core/reporting/), converting command-line flags into an AnalysisRequest and writing serialized output strings to disk or stdout.

Orchestration (AnalysisCoordinator) coordinates the pipeline. It calls the Git Integration Layer to obtain immutable SourceSnapshot objects, passes those strings to the AST Layer and Test Analysis Layer, and feeds their outputs into the Synthesis Layer.

Pure In-Memory Analysis (src/core/ast/ and src/core/test-analysis/TestAstAnalyzer) has zero dependency on Git or the filesystem. It operates exclusively on in-memory source strings (SourceSnapshot), making it 100% unit-testable without creating Git repositories.

All layers depend inward on src/core/domain/types.ts, which defines pure TypeScript data contracts and Zod schemas with zero external logic.

B.2 Component Specification Table

Component

Purpose & Responsibilities

Explicitly Does NOT Do

Inputs

Outputs

Dependencies

Error Conditions

Testing Requirements

Rationale for Separation

CliEntrypoint & RequestValidator

Parses CLI args, validates strings via Zod, normalizes Windows/POSIX paths, blocks path traversal (..) and leading-dash (-) revision injection.

Does not run Git commands or parse source code.

process.argv: string[]

ValidatedAnalysisRequest

commander, zod, node:path

INVALID_ARGUMENTS, UNSAFE_PATH, INVALID_REVISION_FORMAT

Unit tests with malformed flags, Windows C:\ paths, and --upload-pack injection strings.

Isolates untrusted user input parsing from core domain logic.

GitRunner

Executes read-only git commands via child_process.execFile with shell: false, disabled hooks, timeouts, and byte limits.

Does not interpret diffs or domain semantics; never executes mutating Git commands.

repoRoot: string, args: readonly string[]

GitExecResult { stdout, stderr, exitCode }

node:child_process

GIT_NOT_FOUND, GIT_TIMEOUT, GIT_OUTPUT_LIMIT_EXCEEDED, GIT_EXEC_ERROR

Integration tests verifying timeout kill, buffer overflow handling, and shell: false safety.

Single security choke point for all OS subprocess creation.

RevisionResolver & HistoricalSourceLoader

Verifies repo root (rev-parse), resolves base/head SHAs, lists changed files (diff-tree), and loads file contents (git show <sha>:<posixPath>).

Does not parse TypeScript or touch working tree files directly.

ValidatedAnalysisRequest

RepositoryInfo, CommitInfo, SourceSnapshot

GitRunner

NOT_A_GIT_REPOSITORY, REVISION_NOT_FOUND, FILE_NOT_IN_REVISION, BINARY_FILE_UNSUPPORTED

Integration tests against temporary synthetic Git repos on Windows/Linux.

Decouples Git plumbing syntax from AST analysis.

AstParser & FunctionLocator

Parses SourceSnapshot text into a ts-morph SourceFile and locates the target function node unambiguously at both revisions.

Does not compare before/after nodes or access Git.

SourceSnapshot, targetFunctionName: string

FunctionSnapshot (or TargetResolutionStatus failure)

ts-morph

SOURCE_PARSE_ERROR, FUNCTION_NOT_FOUND, FUNCTION_AMBIGUOUS

In-memory unit tests for function f(), const f = () => {}, class methods, overloads, and duplicates.

Isolates tricky TypeScript symbol resolution before structural rule comparison runs.

StructuralExtractor & StructuralComparator

Walks the located function AST to extract normalized descriptors for guards, conditionals, throws, and returns; diffs base vs. head descriptors.

Does not infer bug severity or inspect test files.

baseFn: FunctionSnapshot, headFn: FunctionSnapshot

StructuralChange[]

ts-morph, Domain Types

None (total function over valid FunctionSnapshot pairs).

Exhaustive AST rule unit tests across all positive and negative fixtures.

Pure deterministic core of the application; testable in milliseconds.

TestDiscovery & TestAstAnalyzer

Identifies candidate test files (changed in diff or matching companion naming/import rules) and extracts expect/assert call deltas and enclosing it/test blocks.

Does not execute tests or measure runtime coverage.

ChangedFileEntry[], SourceSnapshot[] (test files), targetFunctionName

TestFileAnalysis[], TestChange[]

HistoricalSourceLoader, AstParser

TEST_PARSE_ERROR (degrades gracefully to partial result + UNKNOWN).

Unit tests for assertion additions, removals, rewrites, and helper movements.

Keeps test heuristics independent from implementation AST rules.

CorrelationEngine

Pairs StructuralChange[] with TestChange[] and untouched companion test metadata to assign association status (STRONG, WEAK, NONE, UNCERTAIN).

Does not format Markdown or claim causal proof.

StructuralChange[], TestAnalysisSummary

CorrelationResult[]

Domain Types

None

Unit tests covering all combinations of structural changes and test deltas.

Encapsulates conservative pairing rules in one auditable module.

EvidenceBuilder & FindingGenerator

Constructs immutable EvidenceItem records (with snippets and line spans) and synthesizes Finding objects with OBSERVED, INFERRED, and UNKNOWN lists.

Does not perform AST traversal or Git I/O.

StructuralChange[], CorrelationResult[], CommitInfo

EvidenceItem[], Finding[], AnalysisReport

Domain Types

EVIDENCE_INTEGRITY_VIOLATION (internal invariant check if inference lacks observation ID).

Unit tests verifying every INFERRED statement links to a valid EvidenceItem ID.

Enforces the core epistemic contract (OBSERVED / INFERRED / UNKNOWN).

JsonReportSerializer & MarkdownReportSerializer

Validates the final AnalysisReport against the Zod schema and formats it into JSON and escaped Markdown.

Does not modify findings or run analysis.

AnalysisReport

string (JSON / Markdown)

zod

REPORT_VALIDATION_ERROR, FILE_WRITE_ERROR

Schema validation tests and Markdown injection/escaping tests.

Allows multiple presentation targets without changing finding generation.

B.3 Reusability for a Future React Viewer

Because AnalysisCoordinator.run(request) returns a strongly typed, schema-versioned AnalysisReport object (and JsonReportSerializer writes it to report.json), a future React + Vite interface can integrate in two zero-duplication ways:

Static Artifact Mode (Zero Backend Needed): The user drags and drops report.json (generated by the CLI) into the React app, which imports only src/core/domain/types.ts and src/core/domain/schema.ts to validate and render the interactive forensic view.

Local Loopback API Mode: A thin 60-line Node HTTP handler wraps AnalysisCoordinator.run(request) and returns the exact same AnalysisReport JSON to the React frontend. Zero analysis logic ever moves into React components.

PHASE C: END-TO-END WORKFLOW

C.1 Execution Sequence Diagram

Code snippet

sequenceDiagram
    actor User
    participant CLI as CliEntrypoint
    participant Val as RequestValidator
    participant Coord as AnalysisCoordinator
    participant Git as GitLayer (Resolver + Loader)
    participant AST as AstLayer (Locator + Comparator)
    participant Test as TestLayer (Discovery + Analyzer)
    participant Corr as CorrelationEngine
    participant Synth as FindingGenerator & Serializers

    User->>CLI: npx change-archaeologist analyze --repo ...
    CLI->>Val: validate(rawArgs)
    alt Invalid Args or Unsafe Path
        Val-->>CLI: Err(ValidationError)
        CLI-->>User: Exit Code 2 (User Input Error)
    end
    Val-->>CLI: Ok(ValidatedAnalysisRequest)
    CLI->>Coord: execute(request)
    Coord->>Git: resolveRepoAndRevisions(request)
    alt Not a Git Repo or Invalid Revision
        Git-->>Coord: Err(GitDomainError)
        Coord-->>CLI: Err(GitDomainError)
        CLI-->>User: Exit Code 3 (Repository/Git Error)
    end
    Git-->>Coord: Ok(RepositoryInfo, baseCommit, headCommit)
    Coord->>Git: loadTargetSnapshots(filePath, baseSha, headSha)
    Git-->>Coord: Ok(baseSnapshot, headSnapshot)
    Coord->>AST: locateAndCompare(baseSnapshot, headSnapshot, functionName)
    alt Function Missing, Ambiguous, or Parse Error
        AST-->>Coord: Partial/Limitation Status (e.g., FUNCTION_MISSING_IN_BASE)
    else Function Located in Both
        AST-->>Coord: Ok(baseFn, headFn, StructuralChange[])
    end
    Coord->>Test: analyzeRelatedTests(repoInfo, baseSha, headSha, filePath, functionName)
    Test->>Git: listChangedFiles & loadTestSnapshots
    Git-->>Test: Changed test files & contents
    Test-->>Coord: Ok(TestAnalysisSummary)
    Coord->>Corr: correlate(StructuralChange[], TestAnalysisSummary)
    Corr-->>Coord: Ok(CorrelationResult[])
    Coord->>Synth: buildReport(request, commits, changes, correlations)
    Synth-->>Coord: Ok(AnalysisReport)
    Coord-->>CLI: Ok(AnalysisReport)
    CLI->>Synth: serializeJson(report) & serializeMarkdown(report)
    CLI-->>User: Write report.json & report.md, Exit Code 0


C.2 Numbered Step-by-Step Lifecycle & Failure Paths

Step 1: CLI Invocation & Argument Parsing

Trigger: User executes the CLI command.

Component: CliEntrypoint -> RequestValidator.

Input: process.argv.

Processing: Parses --repo, --file, --function, --base, --head, --out. Validates via Zod: ensures file is a relative path without .. segments or null bytes, ensures base and head match /^[a-zA-Z0-9_.~^/@-]+$/ and do not start with - (preventing Git option injection), and resolves repo to an absolute OS path.

Output: Immutable ValidatedAnalysisRequest.

Failure Behavior: Immediately halts before spawning any subprocess; prints actionable validation message to stderr; exits with code 2.

Step 2: Repository Verification & Revision Resolution

Trigger: Validated request passed to AnalysisCoordinator.

Component: RevisionResolver -> GitRunner.

Input: ValidatedAnalysisRequest.

Processing: Executes git rev-parse --show-toplevel inside repoPath to confirm a valid Git repository, then executes git rev-parse --verify <rev>^{commit} and git show -s --format=%H%n%an%n%cI%n%s <sha> for both base and head.

Output: RepositoryInfo, baseCommit: CommitInfo, headCommit: CommitInfo.

Failure Behavior:

Invalid directory / Non-Git directory / Git binary missing: Halts analysis; returns structured error (NOT_A_GIT_REPOSITORY or GIT_EXEC_ERROR); exits with code 3.

Invalid revision identifier: Halts analysis; returns REVISION_NOT_FOUND specifying which revision failed; exits with code 3.

Step 3: Historical Target Source Retrieval

Trigger: Successful revision resolution.

Component: HistoricalSourceLoader -> GitRunner.

Input: RepositoryInfo, posixFilePath, baseCommit.sha, headCommit.sha.

Processing: Executes git cat-file -e <sha>:<posixFilePath> to check existence, checks blob size via git cat-file -s <sha>:<posixFilePath> (rejecting blobs > 2 MB), and retrieves UTF-8 source text via git show <sha>:<posixFilePath>. Also checks git diff-tree --no-commit-id -M -r --name-status <baseSha> <headSha> to see if the target file was added, deleted, modified, or renamed.

Output: baseSnapshot: SourceSnapshot | null, headSnapshot: SourceSnapshot | null, and fileChangeStatus.

Failure Behavior:

File missing in both revisions: Halts analysis (FILE_NOT_FOUND_IN_EITHER_REVISION, exit code 4).

File missing in one revision (e.g., newly created file or deleted file) or detected as renamed: Produces a Completed Report with Limitation (PARTIAL_LINEAGE_LIMITATION) rather than crashing—recording an OBSERVED file-level addition/deletion/rename and an UNKNOWN item explaining why pairwise function comparison across the two revisions could not proceed.

Step 4: AST Parsing & Unambiguous Function Identification

Trigger: Both baseSnapshot and headSnapshot exist and contain text.

Component: AstParser & FunctionLocator.

Input: baseSnapshot, headSnapshot, targetFunctionName.

Processing: Creates two separate in-memory ts-morph SourceFile instances (base__<sha>.tsx and head__<sha>.tsx). Checks getPreEmitDiagnostics() for syntax-breaking parser errors. Searches for targetFunctionName across top-level functions, variable arrow/function expressions, and class methods.

Output: baseFn: FunctionSnapshot, headFn: FunctionSnapshot.

Failure Behavior:

Source parsing failure / Unsupported syntax: Produces an AnalysisReport with status: "INCOMPLETE_PARSE_ERROR", recording the syntax diagnostic location.

Function missing in one revision: Produces an AnalysisReport with status: "INCOMPLETE_FUNCTION_MISSING", recording OBSERVED presence in one revision and absence in the other, plus an UNKNOWN noting that the function may have been renamed, inlined, or moved.

Ambiguous function identification (e.g., 2+ functions with the same name in nested scopes or class hierarchy within the same file): Produces status: "INCOMPLETE_AMBIGUOUS_TARGET", listing the line numbers of all conflicting candidates so the user can qualify the symbol (e.g., ClassName.methodName).

Step 5: Structural Extraction & Rule Comparison

Trigger: Both baseFn and headFn are unambiguously identified.

Component: StructuralExtractor -> StructuralComparator.

Input: baseFn, headFn.

Processing: Extracts normalized structural descriptors (GuardDescriptor, ConditionalDescriptor, ThrowDescriptor, ReturnDescriptor) for both snapshots and applies the four structural comparison rules.

Output: StructuralChange[].

Failure Behavior:

No structural changes detected (including formatting-only edits): Returns an empty StructuralChange[] array. If the raw function text differed, records an OBSERVED note that the function text changed without triggering any of the monitored structural rules (NO_MONITORED_STRUCTURAL_CHANGES).

Step 6: Candidate Test Discovery & Test Assertion Analysis

Trigger: Completion of Step 5.

Component: TestDiscovery -> TestAstAnalyzer.

Input: Diff manifest between base and head, targetFilePath, targetFunctionName.

Processing: Identifies test files modified between base and head AND unmodified companion test files at head (e.g., session.test.ts or session.spec.ts). For modified test files, loads base and head snapshots and compares expect(...) / assert(...) call expressions and enclosing test(...) / it(...) blocks.

Output: TestAnalysisSummary (containing TestChange[] and discovered unmodified test files).

Failure Behavior:

No relevant tests found: Populates TestAnalysisSummary with candidateFilesFound: 0 and adds an UNKNOWN item stating no matching test files were identified.

Test file parse error: Logs a warning in report limitations, marks test correlation as UNCERTAIN, and continues so structural findings are not lost.

Step 7: Conservative Change Correlation & Finding Generation

Trigger: Completion of Steps 5 and 6.

Component: CorrelationEngine -> EvidenceBuilder -> FindingGenerator.

Input: StructuralChange[], TestAnalysisSummary.

Processing: Pairs structural changes with test observations, constructs EvidenceItem records with exact code snippets and line spans, and generates Finding objects containing observed, inferred, and unknown entries.

Output: AnalysisReport.

Failure Behavior:

Test correlation too uncertain (e.g., 15 test files changed in a large revision range): Sets correlation status to UNCERTAIN and emits an explicit UNKNOWN explaining why specific test changes cannot be uniquely attributed to the target function change.

Step 8: Report Validation & Serialization

Trigger: AnalysisReport assembled.

Component: JsonReportSerializer & MarkdownReportSerializer.

Input: AnalysisReport, output path.

Processing: Validates the report against AnalysisReportSchema (Zod), enforces the invariant that every inference cites at least one valid observation ID, and writes report.json and report.md.

Output: Files written to disk; CLI exits with code 0.

Failure Behavior: If disk write fails (e.g., read-only output directory or invalid path), prints error to stderr and exits with code 5.

PHASE D: DATA-FLOW DESIGN

D.1 End-to-End Data-Flow Diagram (DFD)

Code snippet

flowchart TD
    D1[/"1. Raw CLI Input\n(string[])"/] -->|RequestValidator| D2["2. ValidatedAnalysisRequest\n(Immutable Value Object)"]
    D2 -->|RevisionResolver| D3["3. RepositoryInfo & CommitInfo Pair\n(baseCommit, headCommit - Immutable)"]
    D2 & D3 -->|HistoricalSourceLoader| D4["4. SourceSnapshot Pair\n(baseSnapshot, headSnapshot - Immutable)"]
    D4 -->|AstParser| D5["5. In-Memory ts-morph SourceFiles\n(Ephemeral AST Handles)"]
    D5 -->|FunctionLocator| D6["6. FunctionSnapshot Pair\n(baseFn, headFn + Normalized Descriptors)"]
    D6 -->|StructuralComparator| D7["7. StructuralChange[]\n(Immutable Diff Records)"]

    D3 -->|TestDiscovery| D8["8. CandidateTestFile[] &\nTest SourceSnapshot Pairs"]
    D8 -->|TestAstAnalyzer| D9["9. TestChange[] &\nUntouchedTestFile[]"]

    D7 & D9 -->|CorrelationEngine| D10["10. CorrelationResult[]\n(Immutable Pairing Records)"]
    D4 & D6 & D7 & D9 & D10 -->|EvidenceBuilder| D11["11. EvidenceItem[]\n(Immutable Code & Git Citations)"]
    D7 & D10 & D11 -->|FindingGenerator| D12["12. Finding[]\n(OBSERVED / INFERRED / UNKNOWN)"]
    D2 & D3 & D11 & D12 -->|ReportAssembler & Serializers| D13[/"13. Final AnalysisReport\n(report.json & report.md)"/]


D.2 Plain-Language Explanation of Data Transformations and Immutability

Every data object crossing a component boundary (Nodes D2, D3, D4, D6, D7, D8, D9, D10, D11, D12, D13) is a deeply readonly immutable plain TypeScript object. Only Node D5 (ts-morph SourceFile AST wrapper) holds internal compiler state, and it is strictly encapsulated inside src/core/ast/ and discarded immediately after FunctionSnapshot (D6) and TestChange[] (D9) are extracted.

How the System Prevents Revision Confusion (base vs. head)

A classic bug in historical analyzers is accidentally swapping base and head source code or line numbers. Our data-flow design prevents this structurally through three mechanisms:

Explicit RevisionRole Tagging on Every Snapshot (D4, D6): Every SourceSnapshot and FunctionSnapshot carries both role: "BASE" | "HEAD" and commitSha: CommitSha (branded 40-char hex string).

Distinct Virtual Filenames in ts-morph (D5): When AstParser loads source into the in-memory ts-morph project, it prefixes the virtual path with the role and SHA: /__virtual__/BASE_<baseSha>/<posixFilePath> and /__virtual__/HEAD_<headSha>/<posixFilePath>. It is impossible for a file path collision in the in-memory filesystem to overwrite one revision with the other.

Explicit before and after Slots in EvidenceItem (D11) and StructuralChange (D7): No diff record uses untagged arrays of locations. Every location is stored under beforeLocation: SourceSpan | null (bound to baseCommit.sha) and afterLocation: SourceSpan | null (bound to headCommit.sha).

How Verifiable Traceability Is Preserved

When StructuralExtractor visits an AST node (such as an IfStatement guard clause), it immediately extracts:

startLine and endLine (1-indexed, inclusive, matching standard editor and GitHub line numbers).

startColumn and endColumn (1-indexed).

rawText (the exact unformatted substring from SourceSnapshot.content for display) and normalizedText (whitespace/comment-stripped canonical string for comparison).
These coordinates are carried directly into StructuralChange (D7) and packaged into an EvidenceItem (D11) with a stable deterministic ID (e.g., EV-001). Every Finding (D12) references EV-001 in its observed and inferred records, allowing the user to open the target repository and run git show <sha>:<filePath> to verify the exact lines.

PHASE E: DOMAIN MODEL AND DATA CONTRACTS

E.1 Entity Purpose and Relationship Summary

Entity

Purpose

Required Fields

Optional Fields

Relationships

AnalysisRequest

Validated user parameters defining the investigation boundary.

repoPath, targetFilePath (POSIX), targetFunctionName, baseRevisionInput, headRevisionInput

outputDir, maxDiffFiles

Root input to AnalysisReport.

RepositoryInfo

Verified local Git repository metadata.

rootPath, gitVersion, isCleanWorkingTreeAtStart

None

Included in AnalysisReport.

CommitInfo

Resolved immutable Git commit metadata.

role (BASE|HEAD), sha (40-char), shortSha (7-char), authorName, committedAtIso, subject

None

Referenced by SourceSnapshot and EvidenceItem.

SourceSnapshot

Exact UTF-8 text of a file at a specific commit.

role, commitSha, posixFilePath, content, byteLength, lineCount

None

Input to FunctionSnapshot and TestChange.

FunctionSnapshot

Extracted AST representation and structural descriptors of the target function at one revision.

role, commitSha, posixFilePath, qualifiedName, kind, span, signatureText, rawBodyText, normalizedBodyHash, guards, conditionals, throws, returns

None

Compared pairwise to produce StructuralChange[].

StructuralChange

A single deterministic AST difference detected between base and head inside the target function.

id, ruleId, category, changeType (ADDED|REMOVED|MODIFIED), summary

beforeSpan, afterSpan, beforeSnippet, afterSnippet, details

Referenced by CorrelationResult and EvidenceItem.

TestChange

An observed change (or confirmed non-change) in a candidate test file between base and head.

id, posixTestFilePath, fileStatus, mentionsTargetFunction, assertionChanges

enclosingTestBlockName, beforeSpan, afterSpan

Referenced by CorrelationResult and EvidenceItem.

CorrelationResult

Links a StructuralChange to relevant TestChange records and classifies association strength.

id, structuralChangeId, status (STRONG|WEAK|NONE|UNCERTAIN), relatedTestChangeIds, untouchedCompanionTestFiles, rationale

None

Consumed by FindingGenerator.

EvidenceItem

Inspectable proof anchor linking a claim to a specific commit, file path, line span, and snippet.

id, kind, commitRole, commitSha, posixFilePath, description

span, codeSnippet

Referenced by ID inside ObservationItem and InferenceItem.

Finding

A complete investigative conclusion combining OBSERVED, INFERRED, and UNKNOWN statements.

id, title, category, attentionLevel, structuralChangeIds, correlationId, observed, inferred, unknown

None

Contained in AnalysisReport.

AnalysisReport

Top-level schema-versioned output artifact.

schemaVersion, generatedAtIso, status, request, repository, baseCommit, headCommit, evidence, structuralChanges, testAnalysis, correlations, findings, limitations, errors

None

Root output serialized to JSON and Markdown.

E.2 Concrete TypeScript Domain Contracts (src/core/domain/types.ts)

TypeScript

export type SchemaVersion = "1.0.0";
export type RevisionRole = "BASE" | "HEAD";

export interface SourceSpan {
  readonly startLine: number;   // 1-indexed inclusive
  readonly startColumn: number; // 1-indexed inclusive
  readonly endLine: number;     // 1-indexed inclusive
  readonly endColumn: number;   // 1-indexed inclusive
}

export interface AnalysisRequest {
  readonly repoPath: string;
  readonly targetFilePath: string; // Normalized POSIX relative path, e.g., "src/auth/token.ts"
  readonly targetFunctionName: string; // e.g., "verifyToken" or "TokenService.verify"
  readonly baseRevisionInput: string;
  readonly headRevisionInput: string;
  readonly outputDir?: string;
}

export interface RepositoryInfo {
  readonly rootPath: string;
  readonly gitVersion: string;
}

export interface CommitInfo {
  readonly role: RevisionRole;
  readonly sha: string;      // 40-char lowercase hex
  readonly shortSha: string; // 7-char lowercase hex
  readonly authorName: string;
  readonly committedAtIso: string;
  readonly subject: string;
}

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

export interface FunctionSnapshot {
  readonly role: RevisionRole;
  readonly commitSha: string;
  readonly posixFilePath: string;
  readonly qualifiedName: string;
  readonly kind: FunctionSyntaxKind;
  readonly span: SourceSpan;
  readonly signatureText: string;
  readonly normalizedBodyHash: string;
  readonly guards: readonly GuardDescriptor[];
  readonly conditionals: readonly ConditionalDescriptor[];
  readonly throws: readonly ThrowDescriptor[];
  readonly returns: readonly ReturnDescriptor[];
}

export type RuleId =
  | "RULE_GUARD_ADDED"
  | "RULE_GUARD_REMOVED"
  | "RULE_CONDITIONAL_MODIFIED"
  | "RULE_THROW_ADDED"
  | "RULE_THROW_REMOVED"
  | "RULE_THROW_MODIFIED"
  | "RULE_RETURN_ADDED"
  | "RULE_RETURN_REMOVED"
  | "RULE_RETURN_MODIFIED";

export type StructuralChangeCategory =
  | "GUARD_CLAUSE"
  | "CONDITIONAL_EXPRESSION"
  | "THROW_STATEMENT"
  | "RETURN_STATEMENT";

export interface StructuralChange {
  readonly id: string; // e.g., "SC-001"
  readonly ruleId: RuleId;
  readonly category: StructuralChangeCategory;
  readonly changeType: "ADDED" | "REMOVED" | "MODIFIED";
  readonly summary: string;
  readonly beforeSpan: SourceSpan | null;
  readonly afterSpan: SourceSpan | null;
  readonly beforeSnippet: string | null;
  readonly afterSnippet: string | null;
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

export interface TestChange {
  readonly id: string; // e.g., "TC-001"
  readonly posixTestFilePath: string;
  readonly fileChangeStatus: "MODIFIED" | "ADDED" | "DELETED" | "UNMODIFIED_COMPANION";
  readonly importsTargetFile: boolean;
  readonly mentionsTargetFunction: boolean;
  readonly assertionChanges: readonly AssertionChangeRecord[];
}

export type CorrelationStatus = "STRONG" | "WEAK" | "NONE" | "UNCERTAIN";

export interface CorrelationResult {
  readonly id: string; // e.g., "CORR-001"
  readonly structuralChangeId: string;
  readonly status: CorrelationStatus;
  readonly relatedTestChangeIds: readonly string[];
  readonly untouchedCompanionTestFiles: readonly string[];
  readonly rationale: string;
}

export interface EvidenceItem {
  readonly id: string; // e.g., "EV-001"
  readonly kind: "SOURCE_BEFORE" | "SOURCE_AFTER" | "TEST_BEFORE" | "TEST_AFTER" | "GIT_METADATA";
  readonly commitRole: RevisionRole;
  readonly commitSha: string;
  readonly posixFilePath: string;
  readonly span: SourceSpan | null;
  readonly codeSnippet: string | null;
  readonly description: string;
}

export interface ObservationStatement {
  readonly id: string; // e.g., "OBS-001"
  readonly category: "OBSERVED";
  readonly statement: string;
  readonly evidenceIds: readonly [string, ...string[]]; // Non-empty tuple: MUST reference >=1 EvidenceItem
}

export interface InferenceStatement {
  readonly id: string; // e.g., "INF-001"
  readonly category: "INFERRED";
  readonly statement: string;
  readonly supportingObservationIds: readonly [string, ...string[]]; // Non-empty tuple: MUST reference >=1 ObservationStatement
  readonly ruleId: string;
}

export interface UnknownStatement {
  readonly id: string; // e.g., "UNK-001"
  readonly category: "UNKNOWN";
  readonly statement: string;
  readonly reasonCategory:
    | "EXTERNAL_CALLER_BEHAVIOR"
    | "HELPER_DELEGATION_POSSIBLE"
    | "RUNTIME_TEST_EXECUTION_UNVERIFIED"
    | "TEST_CORRELATION_AMBIGUOUS"
    | "LINEAGE_OR_PARSE_BOUNDARY";
}

export type ReviewAttentionLevel = "HIGH_ATTENTION" | "MODERATE_ATTENTION" | "INFORMATIONAL";

export interface Finding {
  readonly id: string; // e.g., "FND-001"
  readonly title: string;
  readonly category: StructuralChangeCategory | "LINEAGE_LIMITATION";
  readonly attentionLevel: ReviewAttentionLevel;
  readonly structuralChangeIds: readonly string[];
  readonly correlationId: string | null;
  readonly observed: readonly [ObservationStatement, ...ObservationStatement[]];
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

export interface AnalysisReport {
  readonly schemaVersion: SchemaVersion;
  readonly generatedAtIso: string;
  readonly status: AnalysisStatus;
  readonly request: AnalysisRequest;
  readonly repository: RepositoryInfo;
  readonly baseCommit: CommitInfo;
  readonly headCommit: CommitInfo;
  readonly evidence: readonly EvidenceItem[];
  readonly structuralChanges: readonly StructuralChange[];
  readonly testChanges: readonly TestChange[];
  readonly correlations: readonly CorrelationResult[];
  readonly findings: readonly Finding[];
  readonly limitations: readonly string[];
  readonly errors: readonly AnalysisErrorRecord[];
}


E.3 Structural & Runtime Enforcement of Epistemic Integrity

Compile-Time Enforcement via Non-Empty Tuples:
Notice in ObservationStatement and InferenceStatement above:

evidenceIds: readonly [string, ...string[]] (cannot be an empty array [] at compile time).

supportingObservationIds: readonly [string, ...string[]] (an InferenceStatement cannot be constructed in TypeScript without at least one supporting ObservationStatement ID).

unknown: readonly [UnknownStatement, ...UnknownStatement[]] (every Finding must state at least one explicit boundary of what static analysis cannot know).

Runtime Boundary Validation via Zod (src/core/domain/schema.ts):
Because TypeScript types erase at runtime, we implement a Zod schema (AnalysisReportSchema) with .superRefine() cross-reference checks:

Every evidenceId inside observed is verified to exist in report.evidence.

Every supportingObservationId inside inferred is verified to exist in that finding's observed list.

JsonReportSerializer runs AnalysisReportSchema.parse(report) before writing output, and any future React UI runs AnalysisReportSchema.parse(jsonInput) before rendering.

PHASE F: AST ANALYSIS ENGINE

F.1 Internal Nine-Stage Pipeline

Historical Source Acquisition: Receives immutable baseSnapshot and headSnapshot UTF-8 strings from HistoricalSourceLoader.

Source Parsing: Instantiates a single ts-morph Project configured for deterministic, fast syntax-only parsing:

TypeScript

const project = new Project({
  useInMemoryFileSystem: true,
  skipFileDependencyResolution: true,
  skipLoadingLibFiles: true,
  compilerOptions: {
    target: ScriptTarget.ESNext,
    allowJs: true,
    jsx: ts.JsxEmit.Preserve,
  },
});


Creates virtual source files using the original extension (.ts, .tsx, .js, .jsx) so JSX vs. generic <T> syntax disambiguation works identically to the real file.

Function Identification (FunctionLocator):
Supports two target formats:

Unqualified name (verifyToken): Matches top-level FunctionDeclaration, top-level VariableDeclaration whose initializer is an ArrowFunction or FunctionExpression, or a single uniquely named MethodDeclaration inside the file.

Qualified name (AuthService.verifyToken): Matches ClassDeclaration (AuthService) -> MethodDeclaration (verifyToken), or object-literal method assignment.

Ambiguity Guard: If more than one AST node with a body matches the target name (for example, two inner helper functions with the same name in different nested scopes, or two classes in the same file with a .validate() method when the user passed unqualified validate), FunctionLocator returns FUNCTION_AMBIGUOUS with the line numbers of all matches. TypeScript overload declarations without an implementation body (fn.getBody() === undefined) are ignored during body lookup so that a standard TypeScript overloaded function resolves cleanly to its single implementation body.

AST Node Extraction (StructuralExtractor):
Walks only the statements and expressions belonging to the target function's own body—explicitly stopping traversal at nested function boundaries (FunctionDeclaration, FunctionExpression, ArrowFunction declared inside the target function, unless that inner arrow function is examined separately) so that a return inside an inner .map(x => { return x + 1; }) callback is never confused with a return from the outer target function!

Structural Representation & Normalization (AstNormalizer):
To distinguish formatting changes from structural changes, AstNormalizer strips trivia (comments, whitespace, newlines) and redundant outer parentheses (ParenthesizedExpression around a single condition) by iterating over the node's child AST tokens (node.getDescendantNodes() / token stream) rather than raw text substrings.

Before-and-After Comparison (StructuralComparator):
Uses a two-pass matching algorithm for each descriptor list (guards, conditionals, throws, returns):

Pass 1 (Exact Match): Pairs base and head descriptors with identical fingerprint (composed of normalized AST structure + normalized expression text). Matched descriptors are unchanged and ignored.

Pass 2 (Positional/Similarity Match for Modifications): Among unmatched descriptors of the same construct kind and nesting depth, pairs a base descriptor with a head descriptor if they share the same exit action or control-flow slot (producing a MODIFIED change). Remaining unmatched base items become REMOVED, and remaining unmatched head items become ADDED.

Rule Evaluation: Applies the four initial rule families detailed in Section F.2 below.

Evidence Location: Maps each StructuralChange back to baseFn and headFn SourceSpan coordinates and extracts exact line-bounded code snippets.

Finding Construction: Passes StructuralChange[] to the correlation and synthesis stages.

F.2 Detailed Rule Specifications

Rule Family 1: Guard-Clause Additions and Removals (RULE_GUARD_ADDED, RULE_GUARD_REMOVED)

Precise Condition Checked: An IfStatement belonging to the target function's control flow (not inside an inner callback) is classified as a Guard Clause if and only if:

It has no else branch (ifStmt.getElseStatement() === undefined), AND

Its then branch (ifStmt.getThenStatement()) is either a single ReturnStatement / ThrowStatement OR a Block whose final executable statement is an unconditional ReturnStatement or ThrowStatement.

It is tagged isLeadingGuard: true if it appears at the top level of the function body preceded only by variable declarations or other guard clauses, and isLeadingGuard: false if it appears later in the function body.

Relevant AST Node Types: SyntaxKind.IfStatement, SyntaxKind.Block, SyntaxKind.ReturnStatement, SyntaxKind.ThrowStatement.

Comparison Strategy: Compares baseFn.guards vs. headFn.guards by normalizedCondition + exitKind. If a guard present in baseFn has no match in headFn, emits RULE_GUARD_REMOVED (or RULE_CONDITIONAL_MODIFIED if the guard remained at the same position with the same exit statement, but its condition expression mutated).

Before-and-After Code Example:

TypeScript

// BASE (Commit a1b2c3d)
export function withdraw(amount: number, balance: number): number {
  if (amount <= 0) {
    throw new RangeError("Amount must be positive");
  }
  return balance - amount;
}

// HEAD (Commit f4e5d6c)
export function withdraw(amount: number, balance: number): number {
  return balance - amount;
}


Expected Observed Result:

RULE_GUARD_REMOVED: Guard clause if (amount <= 0) with exit THROW (throw new RangeError("Amount must be positive")) at BASE lines 2–4 is absent in HEAD.

Potential False Positives: Developer extracted if (amount <= 0) throw ... into a helper function assertPositive(amount) called on line 2. (Handled by emitting UNKNOWN with HELPER_DELEGATION_POSSIBLE).

Potential False Negatives: Guard written as a short-circuit logical expression amount <= 0 && throwError() rather than an IfStatement.

Known Limitations: Does not evaluate whether an upstream caller now validates amount <= 0.

Corresponding Test Fixtures: FX-01-guard-removed, FX-02-guard-added, FX-07-nested-guards.

Rule Family 2: Conditional-Expression Changes (RULE_CONDITIONAL_MODIFIED)

Precise Condition Checked: Inspects the condition expression of every IfStatement (ifStmt.getExpression()), the condition of every ternary ConditionalExpression (ternary.getCondition()), and the discriminant/case expressions of SwitchStatement within the target function's scope. Emits RULE_CONDITIONAL_MODIFIED when a conditional structure remains present in both base and head (e.g., same then/else branch structure or same guard exit), or when a condition's relational/logical operator tokens (===, !==, <, <=, >, >=, &&, ||, !) or operands change.

Relevant AST Node Types: SyntaxKind.IfStatement, SyntaxKind.ConditionalExpression, SyntaxKind.SwitchStatement, SyntaxKind.BinaryExpression, SyntaxKind.PrefixUnaryExpression.

Comparison Strategy: Tokenizes the condition expression AST (ignoring parentheses and whitespace). If baseCond.normalizedCondition !== headCond.normalizedCondition for a paired conditional statement, emits RULE_CONDITIONAL_MODIFIED and highlights the specific operator or operand token delta (e.g., > changed to >=, or && isAdmin removed from compound condition).

Before-and-After Code Example:

TypeScript

// BASE
function canAccess(user: User): boolean {
  if (user.isActive && user.role === "admin") {
    return true;
  }
  return false;
}

// HEAD
function canAccess(user: User): boolean {
  if (user.isActive || user.role === "admin") {
    return true;
  }
  return false;
}


Expected Observed Result:

RULE_CONDITIONAL_MODIFIED: Compound condition in IfStatement at line 2 changed logical operator from && (user.isActive && user.role === "admin") to || (user.isActive || user.role === "admin").

Potential False Positives: Equivalent boolean refactoring (e.g., !(a && b) rewritten as !a || !b, or x !== null when x is guaranteed non-undefined).

Potential False Negatives: Condition delegates to a boolean variable (const allowed = ...; if (allowed)) where the variable initializer changed rather than the if (...) expression itself.

Known Limitations: Does not include a SAT solver to prove boolean equivalence.

Corresponding Test Fixtures: FX-03-conditional-changed, FX-08-compound-condition.

Rule Family 3: Throw-Statement Additions, Removals, and Modifications (RULE_THROW_ADDED, RULE_THROW_REMOVED, RULE_THROW_MODIFIED)

Precise Condition Checked: Inspects all ThrowStatement nodes within the target function scope. Tracks additions (RULE_THROW_ADDED), removals (RULE_THROW_REMOVED), and modifications to the thrown error class or expression (RULE_THROW_MODIFIED, e.g., throw new AuthError(...) changed to throw new Error(...)).

Deduplication with Guard Rule: When a Guard Clause whose exit is a ThrowStatement is removed, StructuralComparator emits both RULE_GUARD_REMOVED and RULE_THROW_REMOVED linked to the same span, or links the ThrowDescriptor inside the guard finding so the user clearly sees both that a conditional guard disappeared and that an exception path disappeared.

Relevant AST Node Types: SyntaxKind.ThrowStatement, SyntaxKind.NewExpression, SyntaxKind.TryStatement, SyntaxKind.CatchClause.

Comparison Strategy: Compares baseFn.throws vs. headFn.throws by normalized thrown expression and enclosing condition context.

Before-and-After Code Example:

TypeScript

// BASE
function parseConfig(raw: string): Config {
  if (!raw) throw new SyntaxError("Empty config");
  return JSON.parse(raw);
}

// HEAD
function parseConfig(raw: string): Config | null {
  if (!raw) return null;
  return JSON.parse(raw);
}


Expected Observed Result:

RULE_THROW_REMOVED: throw new SyntaxError("Empty config") at BASE line 2 was removed.

RULE_RETURN_ADDED: Early return return null at HEAD line 2 was added under condition !raw (Throw-to-Return conversion).

Potential False Positives: Replacing throw new Error(...) with a helper throwHttpError(400) (since throwHttpError is a CallExpression, not a ThrowStatement).

Potential False Negatives: Exceptions thrown indirectly by called functions.

Corresponding Test Fixtures: FX-04-throw-to-return.

Rule Family 4: Return-Statement Additions, Removals, and Structural Modifications (RULE_RETURN_ADDED, RULE_RETURN_REMOVED, RULE_RETURN_MODIFIED)

Precise Condition Checked: Inspects all ReturnStatement nodes belonging to the target function (plus implicit arrow-function expression bodies, e.g., const fn = (x: number) => x + 1, normalized as a single EXPRESSION return). Classifies each return into VOID_OR_EMPTY (return;), NULL_OR_UNDEFINED (return null; / return undefined;), BOOLEAN_LITERAL (return true; / return false;), or EXPRESSION (return value;).

Relevant AST Node Types: SyntaxKind.ReturnStatement, SyntaxKind.ArrowFunction.

Comparison Strategy: Compares baseFn.returns vs. headFn.returns. Flags added/removed return paths (RULE_RETURN_ADDED, RULE_RETURN_REMOVED) and modifications to returned expressions or return categories (RULE_RETURN_MODIFIED, e.g., changing return true to return false, or changing return user to return null).

Before-and-After Code Example:

TypeScript

// BASE
function getDiscount(isVip: boolean): number {
  if (isVip) return 0.2;
  return 0.05;
}

// HEAD
function getDiscount(isVip: boolean): number {
  if (isVip) return 0.2;
  return 0;
}


Expected Observed Result:

RULE_RETURN_MODIFIED: Terminal ReturnStatement at line 3 changed returned expression from 0.05 to 0.

Potential False Positives: Renaming a local variable returned at the end of a function (const res = ...; return res; -> const output = ...; return output;).

Potential False Negatives: Mutating a property on an object before returning the same identifier (obj.valid = false; return obj;).

Corresponding Test Fixtures: FX-05-return-changed.

F.3 Distinguishing Formatting-Only Changes from Structural Changes

When a commit reformats code with Prettier (adding trailing commas, wrapping a 1-line if (a && b) return; across 4 lines, or adding JSDoc comments), the raw text changes, and line numbers shift. However:

AstNormalizer constructs every expression string from the AST token sequence omitting trivia (SyntaxKind.SingleLineCommentTrivia, SyntaxKind.MultiLineCommentTrivia, whitespace, and formatting newlines).

A single-statement if (!x) return; and a braced block if (!x) {\n  return;\n} both normalize to GuardDescriptor { normalizedCondition: "!x", exitKind: "RETURN", exitText: "return" }.

Consequently, StructuralComparator produces zero StructuralChange records for formatting/bracing/comment-only edits, satisfying FR-010.

PHASE G: GIT INTEGRATION AND HISTORICAL SOURCE

G.1 Safe Subprocess Wrapper (GitRunner)

All Git interactions pass through a single class GitRunner (src/core/git/git-runner.ts):

Execution API: child_process.execFile(gitBinary, fullArgs, options) with:

shell: false (strictly prevents shell command injection on both Windows cmd.exe and Unix /bin/sh).

cwd: verifiedRepoRoot.

timeout: 15_000 (15 seconds hard timeout per command; kills child process on hang).

maxBuffer: 10 * 1024 * 1024 (10 MB buffer cap; prevents OOM on giant blobs).

windowsHide: true (prevents console window popups on Windows).

Environment hardening: GIT_TERMINAL_PROMPT: "0", GIT_OPTIONAL_LOCKS: "0" (CRITICAL: GIT_OPTIONAL_LOCKS=0 instructs Git not to take opportunistic write locks to refresh .git/index during read-only operations!).

Global Safety Flags Prepended to Every Invocation:["-c", "core.hooksPath=", "-c", "core.fsmonitor=false", "--no-pager"]

G.2 Repository Root Discovery, Revision Resolution, and Historical File Retrieval

Repository Path Validation & Root Discovery:

Verify fs.statSync(repoPath).isDirectory().

Run git rev-parse --show-toplevel to resolve the canonical repository root.

Revision Resolution (RevisionResolver):

Reject any revision input starting with - or containing whitespace/control characters (!/^[a-zA-Z0-9_.~^/@-]+$/).

Run git rev-parse --verify --quiet <rev>^{commit}. This guarantees the string resolves to a valid commit object and returns its 40-char SHA.

Fetch commit metadata via git show -s --format=%H%x00%h%x00%an%x00%cI%x00%s <sha> --.

Historical File Path Normalization & Retrieval (HistoricalSourceLoader):

Convert any user-supplied path (e.g., src\auth\token.ts on Windows) to a canonical repository-relative POSIX path (src/auth/token.ts). Reject paths containing .. or leading /.

Check blob type and size at revision <sha> via git cat-file -t <sha>:<posixPath> (must equal blob) and git cat-file -s <sha>:<posixPath> (must be <= 2_097_152 bytes).

Retrieve raw content via git show <sha>:<posixPath>. Check the first 8,000 bytes for null bytes (\0) to reject binary files cleanly.

Representing Missing Files and Renames:

Run git diff-tree --no-commit-id -M90% -r --name-status <baseSha> <headSha> -- to get the file change manifest between the two revisions.

If posixPath is missing in baseSha and the diff-tree output shows R<score>\t<oldPath>\t<posixPath>, the loader records an OBSERVED file rename from <oldPath> to <posixPath> in the report limitations and either loads <oldPath> at baseSha (if exact rename match is unambiguous) or reports INCOMPLETE_FILE_MISSING_IN_ONE_REVISION with the rename evidence clearly cited.

G.3 Verifying Repository Non-Modification (NFR-001)

We do not merely assume read-only intent; we test it explicitly in tests/security/repo-immutability.test.ts:

Before running AnalysisCoordinator, the test harness records:

The output of git status --porcelain --ignored.

The SHA-256 hash and mtimeMs of .git/HEAD, .git/index, and every file in the working tree (ensuring GIT_OPTIONAL_LOCKS=0 prevented even background index stat refreshes).

After running AnalysisCoordinator, the test asserts that all hashes, mtimeMs values, and git status outputs are bit-for-bit identical.

PHASE H: TEST ANALYSIS AND CORRELATION ENGINE

H.1 Six-Stage Test Evidence Pipeline

Discovering Candidate Test Files (TestDiscovery):
Produces a bounded list of candidate test files (max 20 files) from two sources:

Diff-Modified Tests: Any file in git diff-tree --no-commit-id -r --name-status <baseSha> <headSha> matching test naming conventions (/\.(test|spec)\.[jt]sx?$/ or /(__tests__|test|tests)\/.*\.[jt]sx?$/).

Unmodified Companion Tests at HEAD: Using git ls-tree -r --name-only <headSha>, checks for companion test files matching the target source file's basename (e.g., if target is src/auth/verify.ts, checks for verify.test.ts, verify.spec.ts anywhere in the repo). If found and not in the diff-modified list, records them with fileChangeStatus: "UNMODIFIED_COMPANION".

Comparing Historical Test Versions & Associating Tests with the Target Function:
For each candidate test file, loads base and head snapshots (or head snapshot for unmodified companions) into TestAstAnalyzer:

Import Check (importsTargetFile): Inspects ImportDeclaration and CallExpression (require(...)) module specifiers to check if the test file imports the target file's basename.

Identifier Reference Check (mentionsTargetFunction): Checks whether any Identifier inside the test file matches targetFunctionName.

Detecting Assertion-Related Structural Changes (TestAstAnalyzer):
Walks CallExpression nodes inside each test file to locate:

Enclosing Test Block: Nearest ancestor CallExpression whose callee is it, test, it.skip, test.skip, it.todo, or describe, extracting the first string literal argument as enclosingTestBlock (e.g., "rejects negative withdrawal amounts").

Target Call in Block (callsTargetFunctionInBlock): Checks whether targetFunctionName is invoked inside that specific it(...) / test(...) callback.

Assertion Expressions: Any CallExpression rooted at expect(...) (including chained matchers like expect(fn()).toThrow()) or assert.*(...) / assert(...).

Diffing Assertions (base vs. head):

Normalized assertion strings within the same enclosingTestBlock are compared.

Unmatched in base only -> ASSERTION_REMOVED.

Unmatched in head only -> ASSERTION_ADDED.

Paired in the same test block where the matcher or expected value changed (e.g., expect(res).toBe(true) -> expect(res).toBe(false), or expect(() => fn()).toThrow() -> expect(fn()).toBeNull()) -> ASSERTION_MODIFIED_OR_REWRITTEN.

H.2 Conservative Correlation Rules (CorrelationEngine)

We do not invent arbitrary numeric probabilities. Instead, CorrelationEngine assigns one of four transparent, rule-defined CorrelationStatus levels for each StructuralChange:

Correlation Status

Exact Deterministic Condition

How It Is Explained to the User

STRONG

A candidate test file both importsTargetFile === true AND contains an AssertionChangeRecord (ADDED, REMOVED, or MODIFIED_OR_REWRITTEN) inside an it/test block where callsTargetFunctionInBlock === true.

"A test block directly invoking <functionName> in <testFile> had assertion changes between base and head alongside this structural change."

WEAK

A candidate test file modified between base and head either (a) imports the target file, or (b) modifies assertions in a block that does not directly reference <functionName> (e.g., calls a higher-level integration wrapper).

"Test file <testFile> was modified between base and head, but the changed test block does not directly invoke <functionName>. The relationship may be indirect or coincidental."

NONE

The target function underwent a StructuralChange, zero test files modified between base and head reference the target file/function, AND at least one UNMODIFIED_COMPANION test file exists at head (or zero test files changed at all).

"No test changes referencing <functionName> were observed between base and head (companion test <testFile> remained unmodified)."

UNCERTAIN

More than 10 test files were modified between base and head without a direct call match, OR a test file could not be parsed, OR assertions were moved into a custom helper function (expectValidResult(res)).

"Test relationship cannot be established with confidence statically due to wide revision scope or indirect helper abstractions."

H.3 Handling Removed, Rewritten, Moved, and Unrelated Test Assertions (Examples)

Assertion Removed: expect(() => withdraw(-5)).toThrow() exists in base inside it("rejects negative") and is absent in head -> Recorded as ASSERTION_REMOVED (callsTargetFunctionInBlock: true -> STRONG correlation).

Assertion Rewritten: expect(withdraw(-5)).toBe(null) in base becomes expect(withdraw(-5)).toBeUndefined() in head inside the same it() block -> Paired as ASSERTION_MODIFIED_OR_REWRITTEN rather than separate false-positive deletion + addition.

Assertion Moved to Helper: expect(res.status).toBe(200) is replaced by assertSuccessResponse(res) -> Recorded as ASSERTION_REMOVED in OBSERVED, accompanied by a mandatory UNKNOWN item (HELPER_DELEGATION_POSSIBLE) noting that assertion logic may have been moved into a custom helper function assertSuccessResponse.

Unrelated Test Modifications in Same Commit: auth.test.ts modifies assertions inside it("logs out user"), which calls logout(), while the structural change occurred in login(). Because callsTargetFunctionInBlock for login is false, CorrelationEngine refuses to mark it STRONG and labels it WEAK, preventing unrelated test edits from being presented as proof of test updates for login().

PHASE I: EVIDENCE AND FINDING MODEL

I.1 Finding Generation Rules & Attention Levels

Instead of misleading bug probabilities, each Finding carries a ReviewAttentionLevel that describes why a human reviewer should inspect the evidence:

HIGH_ATTENTION: A guard clause or throw statement was removed (RULE_GUARD_REMOVED, RULE_THROW_REMOVED), OR a conditional expression was modified (RULE_CONDITIONAL_MODIFIED), while test correlation is NONE (companion tests untouched) or shows ASSERTION_REMOVED.

MODERATE_ATTENTION: A structural change (GUARD, CONDITIONAL, THROW, RETURN) occurred alongside STRONG or WEAK test additions/modifications, or a guard/throw was added.

INFORMATIONAL: Lineage/missing-function boundaries or structural additions fully accompanied by new test assertions.

When a Finding Must Be Withheld or Marked Inconclusive:

If FunctionLocator cannot uniquely identify the function in both revisions, all structural comparison findings are withheld, and a single LINEAGE_LIMITATION finding is emitted explaining the exact observation (e.g., function absent in base).

No InferenceStatement may ever be emitted unless its supportingObservationIds array contains at least one valid ObservationStatement ID from the same finding.

I.2 Two Concrete Sample Findings

Sample Finding 1: Guard Clause & Exception Path Removed Alongside Deleted Test Assertion (HIGH_ATTENTION)

JSON

{
  "id": "FND-001",
  "title": "Leading guard clause and RangeError throw removed in withdraw()",
  "category": "GUARD_CLAUSE",
  "attentionLevel": "HIGH_ATTENTION",
  "structuralChangeIds": ["SC-001", "SC-002"],
  "correlationId": "CORR-001",
  "observed": [
    {
      "id": "OBS-001",
      "category": "OBSERVED",
      "statement": "In BASE (commit a1b2c3d, src/account.ts:12-14), function withdraw() contained a leading guard clause `if (amount <= 0)` that terminated with `throw new RangeError(\"Amount must be positive\")`. In HEAD (commit f4e5d6c, src/account.ts:12-15), this guard clause and throw statement are absent.",
      "evidenceIds": ["EV-001", "EV-002"]
    },
    {
      "id": "OBS-002",
      "category": "OBSERVED",
      "statement": "In companion test file src/account.test.ts (test block \"rejects non-positive withdrawal\"), the assertion `expect(() => withdraw(-10, 100)).toThrow(RangeError)` present at BASE lines 28-30 was removed in HEAD.",
      "evidenceIds": ["EV-003", "EV-004"]
    }
  ],
  "inferred": [
    {
      "id": "INF-001",
      "category": "INFERRED",
      "statement": "Direct invocations of withdraw() with `amount <= 0` will no longer throw a RangeError inside withdraw() and will instead proceed to the subtraction return path (`balance - amount`).",
      "supportingObservationIds": ["OBS-001"],
      "ruleId": "RULE_GUARD_REMOVED"
    },
    {
      "id": "INF-002",
      "category": "INFERRED",
      "statement": "The removal of the negative-amount test assertion in src/account.test.ts coincides with the removal of the input guard in withdraw() (Correlation: STRONG).",
      "supportingObservationIds": ["OBS-001", "OBS-002"],
      "ruleId": "CORR_STRONG_DIRECT_CALL"
    }
  ],
  "unknown": [
    {
      "id": "UNK-001",
      "category": "UNKNOWN",
      "statement": "Static analysis of withdraw() cannot determine whether `amount <= 0` validation was intentionally relocated to an upstream caller or middleware.",
      "reasonCategory": "EXTERNAL_CALLER_BEHAVIOR"
    },
    {
      "id": "UNK-002",
      "category": "UNKNOWN",
      "statement": "Change Archaeologist does not execute the test suite and cannot confirm whether all remaining tests pass at HEAD.",
      "reasonCategory": "RUNTIME_TEST_EXECUTION_UNVERIFIED"
    }
  ]
}


Sample Finding 2: Insufficient Evidence / Unrelated Test Change (MODERATE_ATTENTION / UNCERTAIN)

JSON

{
  "id": "FND-002",
  "title": "Conditional operator modified in canRetry(); test relationship uncertain",
  "category": "CONDITIONAL_EXPRESSION",
  "attentionLevel": "MODERATE_ATTENTION",
  "structuralChangeIds": ["SC-003"],
  "correlationId": "CORR-002",
  "observed": [
    {
      "id": "OBS-003",
      "category": "OBSERVED",
      "statement": "In src/retry.ts, the if-condition in canRetry() changed from `attempts < maxRetries` (BASE commit 112233a, line 8) to `attempts <= maxRetries` (HEAD commit 445566b, line 8).",
      "evidenceIds": ["EV-005", "EV-006"]
    },
    {
      "id": "OBS-004",
      "category": "OBSERVED",
      "statement": "Test file src/retry.test.ts was modified between BASE and HEAD (lines 45-52), but the modified test block (`it(\"formats backoff delay\")`) invokes `formatDelay()` and does not reference `canRetry()`.",
      "evidenceIds": ["EV-007"]
    }
  ],
  "inferred": [
    {
      "id": "INF-003",
      "category": "INFERRED",
      "statement": "The boundary condition when `attempts === maxRetries` now evaluates the if-branch as true rather than false.",
      "supportingObservationIds": ["OBS-003"],
      "ruleId": "RULE_CONDITIONAL_MODIFIED"
    }
  ],
  "unknown": [
    {
      "id": "UNK-003",
      "category": "UNKNOWN",
      "statement": "Although src/retry.test.ts changed between BASE and HEAD, the modified assertions do not directly call canRetry() (Correlation: WEAK). It is unknown whether indirect integration tests cover the `attempts === maxRetries` boundary.",
      "reasonCategory": "TEST_CORRELATION_AMBIGUOUS"
    }
  ]
}


PHASE J: ERROR HANDLING AND OBSERVABILITY

J.1 Error Taxonomy and Disposition Matrix

Error Category

Error Code

Disposition

CLI Exit Code

Report Behavior

Invalid User Input

ERR_INVALID_ARGS, ERR_UNSAFE_PATH, ERR_INVALID_REVISION_FORMAT

Halt Immediately

2

No report written; actionable validation error printed to stderr.

Invalid Repository State / Git Execution Failure

ERR_NOT_A_GIT_REPO, ERR_REVISION_NOT_FOUND, ERR_GIT_TIMEOUT, ERR_GIT_EXEC_FAILED

Halt Immediately

3

No report written; sanitized Git error code and command context printed to stderr.

Target File Missing in Both Revisions

ERR_FILE_MISSING_BOTH

Halt Immediately

4

No report written; states file path was not found in base or head.

Missing Historical Source (Present in 1 Revision Only)

LIM_FILE_MISSING_ONE_REV

Partial Result + Explicit Unknown

0

Writes valid AnalysisReport with status: "INCOMPLETE_FILE_MISSING_IN_ONE_REVISION".

Ambiguous Target or Function Missing in 1 Revision

LIM_FUNCTION_MISSING, LIM_FUNCTION_AMBIGUOUS

Partial Result + Explicit Unknown

0

Writes valid AnalysisReport with status: "INCOMPLETE_FUNCTION_MISSING" or "INCOMPLETE_AMBIGUOUS_TARGET".

Source Parsing Failure / Unsupported Syntax

LIM_SOURCE_PARSE_ERROR, ERR_BINARY_OR_OVERSIZED_FILE

Partial Result (or Halt if Binary)

0 (or 4)

Records syntax error line/column in report.errors and sets status: "INCOMPLETE_PARSE_ERROR".

Test File Parsing Failure

WARN_TEST_PARSE_ERROR

Continue with Degraded Test Correlation

0

Preserves all structural findings; adds warning to report.limitations and sets correlation to UNCERTAIN.

Report Serialization / Disk Write Failure

ERR_REPORT_WRITE_FAILED, ERR_SCHEMA_VALIDATION

Halt

5

Prints serialization/filesystem error to stderr.

J.2 Observability & Safe Logging Policy

No Source Code or Secret Leakage in Logs: Diagnostic logs written to stderr (when --verbose is passed) record only timing metrics, resolved 40-char commit SHAs, relative file paths, and AST node counts. The tool never dumps full source files, environment variables (process.env), or raw untracked files to logs.

No Silent Partial Success: Every AnalysisReport features a prominent top-level status banner in both JSON and Markdown. If status starts with INCOMPLETE_, the Markdown header renders a bold [!WARNING] Analysis Incomplete: <Reason> callout at line 1 so a partial run can never be mistaken for a clean "no changes found" run.

PHASE K: SECURITY AND REPOSITORY SAFETY

K.1 Threat Model, Mitigations, and Verification Tests

Threat Vector

Scope (CLI vs. Future Web UI)

Concrete Mitigation

Verification Test

1. Shell Injection via Filenames or Revisions

Both

Use child_process.execFile("git", args, { shell: false }) exclusively. Never use exec() or string interpolation.

tests/security/shell-injection.test.ts (passes $(calc.exe) and ; rm -rf / in args).

2. Git Argument / Flag Injection

Both

Validate revision inputs with /^[a-zA-Z0-9_.~^/@-]+$/ and explicitly reject strings starting with - (e.g., --upload-pack=... or --output=...). Always separate revisions and file paths with -- where Git syntax supports it.

tests/security/git-flag-injection.test.ts

3. Path Traversal (..) & Symlink Escape

Both

PathNormalizer rejects targetFilePath if path.posix.normalize(p) starts with .. or /. Output files (--out) are resolved and checked to ensure they do not overwrite files inside .git/.

tests/security/path-traversal.test.ts

4. Malicious Repository Git Hooks / Filters / Diffs

Both

Every Git invocation prepends -c core.hooksPath= -c core.fsmonitor=false, and diff commands include --no-ext-diff --no-textconv. Only plumbing commands (rev-parse, cat-file, show, diff-tree, ls-tree) are used.

tests/security/git-hooks-disabled.test.ts

5. Accidental Repository Modification

Both

Pass GIT_OPTIONAL_LOCKS=0 in execFile env; never invoke checkout, switch, reset, clean, stash, or commit.

tests/security/repo-immutability.test.ts

6. Resource Exhaustion (Giant Blobs / Deep ASTs / Diff Floods)

Both

Check blob size via git cat-file -s before loading (max 2 MB); enforce maxBuffer: 10 MB and timeout: 15000ms on execFile; cap analyzed candidate test files at 20.

tests/security/resource-limits.test.ts

7. Markdown / HTML Injection via Untrusted Source or Commit Messages

Both

Commit subjects and function/test names rendered in report.md have HTML tags (<, >) escaped and code snippets wrapped in dynamic-length backtick fences (````) so source code containing triple backticks (```) cannot break out of code blocks and inject malicious Markdown/HTML.

tests/security/markdown-escaping.test.ts

8. Future Local HTTP API & Browser Viewer Risks (CSRF / DNS Rebinding / Arbitrary Repo Read)

Future Web UI Only

Bind any future local server strictly to 127.0.0.1 (never 0.0.0.0); verify Origin / Host headers; require a startup-scoped random session token or restrict selectable repositories to an explicit workspace directory passed at server startup.

Deferred to Phase 12 (Web UI security tests).

PHASE L: IMPLEMENTATION ARCHITECTURE AND FILE STRUCTURE

L.1 Staged Project Directory Structure

Plaintext

change-archaeologist/
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── README.md
├── src/
│   ├── core/                              # PURE ANALYSIS ENGINE (Zero CLI/React imports)
│   │   ├── domain/                        # [Stage 1 - Essential]
│   │   │   ├── types.ts                   # All readonly domain interfaces & discriminated unions
│   │   │   ├── schema.ts                  # Zod runtime schemas & epistemic integrity refinements
│   │   │   └── errors.ts                  # Structured domain error classes & error codes
│   │   ├── ast/                           # [Stage 1 - Essential]
│   │   │   ├── ast-parser.ts              # In-memory ts-morph Project & SourceFile factory
│   │   │   ├── ast-normalizer.ts          # Trivia-stripping token normalizer & hash helper
│   │   │   ├── function-locator.ts        # Unambiguous function/method/arrow locator
│   │   │   ├── structural-extractor.ts    # Extracts Guard, Conditional, Throw, Return descriptors
│   │   │   └── structural-comparator.ts   # Evaluates Rules 1-4 between baseFn and headFn
│   │   ├── git/                           # [Stage 2 - Essential]
│   │   │   ├── path-normalizer.ts         # Windows-to-POSIX path conversion & traversal guards
│   │   │   ├── git-runner.ts              # Hardened execFile("git") wrapper with timeouts/limits
│   │   │   ├── revision-resolver.ts       # Validates repo root and resolves base/head CommitInfo
│   │   │   └── source-loader.ts           # Loads historical blobs & diff-tree file manifests
│   │   ├── test-analysis/                 # [Stage 3 - Essential]
│   │   │   ├── test-discovery.ts          # Finds modified & unmodified companion test files
│   │   │   ├── test-ast-analyzer.ts       # Extracts expect/assert changes & enclosing it() blocks
│   │   │   └── correlation-engine.ts      # Applies STRONG/WEAK/NONE/UNCERTAIN pairing rules
│   │   ├── reporting/                     # [Stage 4 - Essential]
│   │   │   ├── evidence-builder.ts        # Builds EvidenceItem[] with exact spans & snippets
│   │   │   ├── finding-generator.ts       # Synthesizes OBSERVED, INFERRED, and UNKNOWN items
│   │   │   ├── json-serializer.ts         # Schema-validated JSON serialization
│   │   │   └── markdown-serializer.ts     # Fence-safe, HTML-escaped Markdown generator
│   │   └── orchestrator/                  # [Stage 4 - Essential]
│   │       ├── request-validator.ts       # Validates AnalysisRequest inputs via Zod
│   │       └── analysis-coordinator.ts    # End-to-end pure orchestration pipeline
│   ├── cli/                               # [Stage 5 - Essential CLI Presentation Layer]
│   │   └── index.ts                       # Commander CLI entrypoint, file output, exit codes
│   └── web/                               # [Stage 6 - Deferred Later Stage ONLY]
│       └── (Introduced only after CLI & Core pass all Milestone 1-11 gates)
├── spike/                                 # [Stage 0 - Validation Spike]
│   └── validate-ast-core.test.ts          # Phase P First Validation Experiment
└── tests/
    ├── helpers/
    │   └── temp-git-repo.ts               # Programmatic disposable Git repo builder for Windows/Linux
    ├── unit/                              # Fast in-memory unit & AST rule tests
    ├── integration/                       # Git subprocess & historical loader tests
    ├── security/                          # Injection, traversal, immutability, & escaping tests
    └── e2e/                               # Full CLI-to-Report end-to-end fixture tests


L.2 Module Dependency Rules

src/core/domain/ imports nothing from any other local directory (only zod).

src/core/ast/, src/core/git/, src/core/test-analysis/, and src/core/reporting/ import from src/core/domain/ (and test-analysis may import AstParser/HistoricalSourceLoader interfaces), but never import from src/cli/ or src/web/.

src/core/orchestrator/ wires git, ast, test-analysis, and reporting together.

src/cli/ imports only src/core/orchestrator/, src/core/reporting/, and src/core/domain/.

PHASE M: TESTING AND VALIDATION STRATEGY

M.1 Nine-Layer Test Strategy

Unit Tests (tests/unit/): Verify PathNormalizer, RequestValidator, AstNormalizer, FunctionLocator, CorrelationEngine, and FindingGenerator in memory.

AST Rule Tests (tests/unit/rules/): Verify StructuralExtractor and StructuralComparator across all 4 rule families using in-memory source string pairs.

Git Integration Tests (tests/integration/): Use tests/helpers/temp-git-repo.ts (which creates real disposable Git repos inside fs.mkdtempSync(path.join(os.tmpdir(), "ca-test-")) using execFile("git", ...)) to test RevisionResolver, HistoricalSourceLoader, and TestDiscovery.

End-to-End CLI Tests (tests/e2e/): Invoke the CLI pipeline against synthetic multi-commit repositories and assert on generated report.json and report.md files.

Error-Path Tests (tests/unit/errors.test.ts & tests/integration/error-paths.test.ts): Verify deterministic handling of missing functions, ambiguous symbols, syntax errors, and missing revisions.

Security Tests (tests/security/): Test flag injection (--upload-pack), path traversal (../), repository immutability (git status + .git/index mtime), resource limits, and Markdown fence escaping.

Cross-Platform Tests: Run the entire Vitest suite on Windows and Linux (windows-latest and ubuntu-latest in GitHub Actions), explicitly testing paths with spaces (C:\Users\Temp User\repo dir).

Report Schema & Epistemic Integrity Tests (tests/unit/schema-integrity.test.ts): Verify that AnalysisReportSchema rejects any report where an INFERRED item lacks a valid supportingObservationIds reference or an OBSERVED item lacks a valid evidenceIds reference.

Regression Corpus Tests: Lock in every discovered edge case as a permanent fixture test.

M.2 Mandatory 19-Fixture Matrix and Expected Outcomes

Fixture ID

Scenario Description

Expected AnalysisStatus

Expected StructuralChange (ruleId)

Expected TestChange & CorrelationStatus

Expected Epistemic Output (OBSERVED / INFERRED / UNKNOWN)

FX-01

Guard clause removed (if (!token) return null; deleted).

COMPLETED_WITH_FINDINGS

RULE_GUARD_REMOVED, RULE_RETURN_REMOVED

Companion test untouched -> NONE

OBSERVED: Guard removed. INFERRED: Early exit on !token removed. UNKNOWN: Caller/helper validation unknown.

FX-02

Guard clause added (if (x < 0) throw new Error(); added).

COMPLETED_WITH_FINDINGS

RULE_GUARD_ADDED, RULE_THROW_ADDED

Test adds toThrow() -> STRONG

OBSERVED: Guard & test assertion added. INFERRED: Function now rejects x < 0. UNKNOWN: Runtime pass unverified.

FX-03

Conditional changed (if (a && b) -> if (a || b)).

COMPLETED_WITH_FINDINGS

RULE_CONDITIONAL_MODIFIED

Companion test untouched -> NONE

OBSERVED: Operator && -> ||. INFERRED: Branch condition relaxed. UNKNOWN: Caller invariants unknown.

FX-04

Throw changed to return (if (!ok) throw err -> if (!ok) return null).

COMPLETED_WITH_FINDINGS

RULE_THROW_REMOVED, RULE_RETURN_ADDED, RULE_GUARD_REMOVED/ADDED

Test changes .toThrow() to .toBeNull() -> STRONG

OBSERVED: Throw replaced by return null; test updated. INFERRED: Error signaling shifted from exception to null return.

FX-05

Return behavior structurally changed (return user.id -> return null).

COMPLETED_WITH_FINDINGS

RULE_RETURN_MODIFIED (EXPRESSION -> NULL_OR_UNDEFINED)

Companion test untouched -> NONE

OBSERVED: Return category changed to null. INFERRED: Callers receive null. UNKNOWN: Downstream handling unknown.

FX-06

Formatting-only changes (Prettier line wraps, added comments, added {} block around single-line guard).

COMPLETED_NO_STRUCTURAL_CHANGES

[] (Zero structural changes)

[]

findings: []; note in report confirming text differed only in trivia/formatting.

FX-07

Nested guards (Outer if (user) containing inner guard if (!user.active) return false; removed).

COMPLETED_WITH_FINDINGS

RULE_GUARD_REMOVED (isLeadingGuard: false, nestingDepth: 1)

Companion test untouched -> NONE

OBSERVED: Nested guard at depth 1 removed. INFERRED: Inactive user branch no longer exits early here.

FX-08

Compound conditions (if (a > 0 && b < 10 && c !== null) drops && c !== null).

COMPLETED_WITH_FINDINGS

RULE_CONDITIONAL_MODIFIED

Companion test untouched -> NONE

OBSERVED: Clause c !== null removed from compound condition. INFERRED: Null c no longer excluded by condition.

FX-09

Assertion removed (Guard removed in fn() AND expect(fn()).toThrow() deleted in fn.test.ts).

COMPLETED_WITH_FINDINGS

RULE_GUARD_REMOVED

ASSERTION_REMOVED (callsTargetFunctionInBlock: true) -> STRONG

OBSERVED: Guard and test assertion both removed. INFERRED: Paired removal (HIGH_ATTENTION).

FX-10

Assertion rewritten (expect(fn(1)).toEqual({ok: true}) -> expect(fn(1)).toStrictEqual({ok: true, v: 2})).

COMPLETED_WITH_FINDINGS

RULE_RETURN_MODIFIED

ASSERTION_MODIFIED_OR_REWRITTEN -> STRONG

OBSERVED: Return expression and test expectation both modified in same it() block.

FX-11

Assertion moved or replaced by helper (expect(res).toBeValid() replaced by verifyResponseHelper(res)).

COMPLETED_WITH_FINDINGS

RULE_RETURN_MODIFIED

ASSERTION_REMOVED -> STRONG (with helper caveat)

OBSERVED: Direct expect call removed; call to verifyResponseHelper present. UNKNOWN: HELPER_DELEGATION_POSSIBLE.

FX-12

Test unchanged despite source change (fn.ts guard removed; fn.test.ts exists at HEAD with 0 diff lines).

COMPLETED_WITH_FINDINGS

RULE_GUARD_REMOVED

UNMODIFIED_COMPANION (fn.test.ts) -> NONE

OBSERVED: Guard removed; fn.test.ts untouched. INFERRED: Existing tests were not updated for this guard removal.

FX-13

Function missing from one revision (fn added in head, did not exist in base).

INCOMPLETE_FUNCTION_MISSING

[]

[]

Single LINEAGE_LIMITATION finding: OBSERVED absent in base, present in head; UNKNOWN rename/move possibility.

FX-14

Ambiguous function name (Two nested functions named validate inside the same file).

INCOMPLETE_AMBIGUOUS_TARGET

[]

[]

Single limitation finding listing both candidate line spans (L10-L18 and L42-L50).

FX-15

Historical file renamed or missing (src/old.ts renamed to src/new.ts between base and head).

INCOMPLETE_FILE_MISSING_IN_ONE_REVISION

[]

[]

Records OBSERVED diff-tree rename status (R100 src/old.ts -> src/new.ts) and explains lineage boundary.

FX-16

Malformed source (Syntax error function broken( { committed in base).

INCOMPLETE_PARSE_ERROR

[]

[]

Records LIM_SOURCE_PARSE_ERROR with exact line/column diagnostic; emits zero fabricated AST diffs.

FX-17

Git failure (Non-existent commit SHA deadbeef1234 or non-Git folder).

Halts with CLI Exit Code 3

N/A

N/A

Structured error message on stderr; no partial/corrupt report file emitted.

FX-18

Empty or irrelevant change (Other function otherFn() in target.ts changed; targetFn() untouched).

COMPLETED_NO_STRUCTURAL_CHANGES

[]

[]

findings: []; confirms targetFn() body was identical between base and head.

FX-19

Unrelated test modifications (targetFn() changed; target.test.ts changed only inside it("tests otherFn")).

COMPLETED_WITH_FINDINGS

RULE_GUARD_REMOVED

ASSERTION_ADDED (callsTargetFunctionInBlock: false) -> WEAK

OBSERVED: target.test.ts changed in an it() block that does not call targetFn(). Correlation downgraded to WEAK.

M.3 Measuring False Positives and False Negatives on the Defined Corpus

On the 19-fixture controlled test corpus (FX-01 through FX-19), each fixture defines a ground-truth array of expected RuleIds and expected CorrelationStatus. Automated test assertions verify:

Corpus Recall (Sensitivity): \text{Detected Expected Rules} / \text{Total Ground-Truth Expected Rules} (Target on controlled synthetic fixtures: 19/19 exact match).

Corpus False Positive Rate: Number of unexpected StructuralChange records or false STRONG correlations emitted on negative/noise fixtures (FX-06, FX-18, FX-19) (Target on controlled synthetic fixtures: 0).Explicit Scope Disclaimer: Perfect accuracy on the 19 synthetic fixtures validates that the AST rules behave as specified on supported patterns; it does not guarantee zero false positives or false negatives on arbitrary third-party repositories using metaprogramming, dynamic proxies, or complex macro patterns.

PHASE N: DEVELOPMENT WORKFLOW USING GOOGLE ANTIGRAVITY AND GEMINI

N.1 Model-Effort Strategy

When working in Google Antigravity with Gemini 3.8 Flash (or if the interface provides High / Medium / Low thinking/effort toggles or a standard mode fallback):

High Effort (or explicit "Plan & Verify Step-by-Step before writing code" prompt prefix if no effort toggle is visible): Reserve for tasks with subtle edge cases—specifically:

Designing src/core/domain/types.ts and schema.ts (Epistemic invariants).

Implementing FunctionLocator and StructuralExtractor/StructuralComparator (ts-morph traversal boundaries and nested-function exclusion).

Implementing GitRunner and PathNormalizer (security & Windows path edge cases).

Implementing CorrelationEngine and FindingGenerator.

Medium Effort: Use for HistoricalSourceLoader, TestDiscovery, TestAstAnalyzer, and temp-git-repo.ts test helpers.

Low Effort: Use for straightforward mechanical tasks with zero architectural ambiguity—such as JsonReportSerializer, MarkdownReportSerializer, CLI flag wiring in src/cli/index.ts, and README.md formatting.

Practical Fallback Rule: If your version of Google Antigravity does not expose a High/Medium/Low reasoning selector for Gemini 3.8 Flash, simulate High Effort by splitting the task into two turns: Turn 1: "Read the target files and list the exact AST edge cases and function signatures you will write. Do not edit files yet." Turn 2: "Now implement the file and run npx vitest run <test-file>."

N.2 Standard Task Specification Template for Antigravity Prompts

Copy and fill out this bounded prompt structure for every implementation step in Antigravity so Gemini 3.8 Flash never invents architecture or modifies unrelated files:

Markdown

### Task Specification for Google Antigravity (Gemini 3.8 Flash)
1. **Objective:** [Single sentence describing the exact module to implement]
2. **Relevant Architecture Decisions:**
   - Pure TypeScript (`ts-morph` in-memory mode `useInMemoryFileSystem: true`).
   - Strictly preserve `OBSERVED`, `INFERRED`, and `UNKNOWN` separation.
   - Windows & POSIX path safety: normalize repo-relative paths to forward slashes `/`.
3. **Files in Scope (CREATE / EDIT ONLY THESE):**
   - `src/core/...`
   - `tests/...`
4. **Explicit Invariants:**
   - Do NOT use `child_process.exec` (use `execFile` with `shell: false` only in `git-runner.ts`).
   - Do NOT traverse inside nested function declarations/arrows when extracting outer function statements.
   - Do NOT add unrequested npm packages.
5. **Required Tests:** Implement unit/integration tests in `tests/...` covering normal behavior and listed edge cases.
6. **Verification Commands:**
   - `npx tsc --noEmit`
   - `npx vitest run <path-to-test-file>`
7. **Acceptance Criteria:** Zero TypeScript compile errors and 100% passing tests in `<path-to-test-file>`.
8. **Prohibited Changes:** Do NOT modify `src/core/domain/types.ts` or any file outside Section 3 without asking first.


N.3 Independent Developer Verification Discipline

Never take the AI coding agent's word that "all tests pass." Before completing any phase in Phase O below, you (the developer) must run these checks in your Windows terminal:

npx tsc --noEmit (Must return exit code 0 with zero output).

npx vitest run (Verify the actual test count and green pass summary in the terminal output; ensure Gemini did not pass a failing test by adding .skip or deleting assertions!).

git diff src/core/domain/types.ts (Ensure the agent did not weaken domain types to any or string[] to bypass a compiler error).

If a phase fails its acceptance criteria: Do not proceed to the next phase. Copy the exact compiler or Vitest failure stack trace and instruct Gemini to fix only the failing module and re-run the test.

N.4 Strict Separation of AI Assistant vs. Runtime Engine

Gemini 3.8 Flash is used only inside Google Antigravity while writing the TypeScript source code. The Change Archaeologist application itself must contain zero imports of @google/generative-ai, openai, or fetch calls to external inference endpoints.

PHASE O: IMPLEMENTATION ROADMAP

The implementation is ordered into 13 dependency-aware phases. Notice that Phases 1, 2, and 3 require zero Git subprocesses—allowing you to validate the entire AST analysis engine in memory first.

Phase ID

Goal

Dependencies

Components Affected

Implementation Tasks

Suggested Model Effort

Required Tests

Deliverables

Acceptance Criteria

Exit Gate

Major Risks

Phase 1

First Validation Experiment (AST Spike)

Node.js 20+, npm init

spike/validate-ast-core.test.ts

Initialize package.json, install typescript, ts-morph, vitest, zod. Implement and run the Phase P validation experiment on 6 in-memory code pairs.

High

spike/validate-ast-core.test.ts (6 core cases)

Working ts-morph spike proving guard, conditional, throw/return, and formatting-noise differentiation.

All 6 spike tests pass in < 3s on Windows; tsc --noEmit passes.

Spike passes 100% without false positives on formatting noise.

Traversing into nested callbacks or failing to strip trivia.

Phase 2

Shared Domain Types & Zod Schemas

Phase 1

src/core/domain/types.ts, schema.ts, errors.ts

Define all readonly interfaces from Phase E.2 and AnalysisReportSchema with .superRefine() epistemic checks.

High

tests/unit/schema-integrity.test.ts

Compile-time and runtime contracts enforcing OBSERVED / INFERRED / UNKNOWN links.

Schema test proves an inference without a valid observation ID throws a ZodError.

types.ts and schema.ts frozen and passing tests.

Overly loose types (any or optional IDs).

Phase 3

In-Memory AST Locator & Structural Comparator

Phase 2

src/core/ast/* (5 files)

Implement AstParser, AstNormalizer, FunctionLocator, StructuralExtractor, and StructuralComparator (Rules 1–4).

High

tests/unit/function-locator.test.ts, tests/unit/rules/*.test.ts (FX-01 to FX-08, FX-13, FX-14, FX-16, FX-18)

Complete in-memory structural diff engine.

All 12 AST fixture scenarios pass in memory with exact line spans.

npx vitest run tests/unit/ passes 100%.

Statement index shift causing false removal+addition pairs.

Phase 4

Disposable Git Test Harness & Hardened GitRunner

Phase 2 (Can run in parallel with Phase 3)

src/core/git/path-normalizer.ts, git-runner.ts, tests/helpers/temp-git-repo.ts

Build programmatic temp Git repo helper and hardened execFile("git") wrapper with Windows-to-POSIX normalization and safety flags.

High

tests/security/git-flag-injection.test.ts, tests/security/path-traversal.test.ts, tests/integration/git-runner.test.ts

Safe Git execution primitive and disposable repo test generator.

Rejects - flag injection and .. paths; passes on Windows temp directories with spaces.

Security & runner unit tests pass on Windows.

Backslashes \ leaking into Git pathspecs on Windows.

Phase 5

Git Revision Resolver & Historical Source Loader

Phase 4

src/core/git/revision-resolver.ts, source-loader.ts

Resolve base/head CommitInfo, check blob sizes (<= 2MB), load SourceSnapshot text, and detect missing/renamed files via diff-tree.

Medium

tests/integration/source-loader.test.ts, tests/security/repo-immutability.test.ts (FX-15, FX-17)

Historical snapshot retrieval from real temporary Git commits.

Loads historical files accurately; .git/index and git status remain untouched (NFR-001).

Integration and immutability tests pass.

Missing GIT_OPTIONAL_LOCKS=0 touching .git/index mtime.

Phase 6

Test Discovery & Test Assertion AST Analyzer

Phases 3 & 5

src/core/test-analysis/test-discovery.ts, test-ast-analyzer.ts

Discover modified and unmodified companion test files; extract expect/assert changes and check if enclosing it() block invokes targetFunctionName.

Medium

tests/unit/test-analyzer.test.ts (FX-09, FX-10, FX-11, FX-12, FX-19)

Test change extraction with enclosing test-block context.

Accurately distinguishes removed, rewritten, helper-moved, and unrelated test assertions.

Test analyzer unit tests pass 100%.

Treating any edit in *.test.ts as related to targetFunctionName.

Phase 7

Conservative Change Correlation Engine

Phases 3 & 6

src/core/test-analysis/correlation-engine.ts

Implement STRONG, WEAK, NONE, and UNCERTAIN correlation pairing logic and rationale generation.

High

tests/unit/correlation.test.ts

Deterministic pairing between StructuralChange[] and TestChange[].

FX-09 yields STRONG; FX-12 yields NONE; FX-19 (unrelated it() block) yields WEAK.

All correlation unit tests pass.

Overstating correlation when multiple unrelated functions change.

Phase 8

Evidence Builder & Finding Generator

Phases 2, 3, 7

src/core/reporting/evidence-builder.ts, finding-generator.ts

Construct EvidenceItem[] with exact snippets/spans and generate Finding[] with OBSERVED, INFERRED, and UNKNOWN statements.

High

tests/unit/finding-generator.test.ts

Epistemically sound finding synthesis engine.

Every generated finding passes AnalysisReportSchema validation and includes mandatory UNKNOWN boundaries.

Finding generator tests pass.

Emitting an inference without linking its observation ID.

Phase 9

JSON & Markdown Report Serializers

Phase 8

src/core/reporting/json-serializer.ts, markdown-serializer.ts

Serialize AnalysisReport to formatted JSON and escaped, dynamic-fence Markdown.

Low

tests/unit/serializers.test.ts, tests/security/markdown-escaping.test.ts

Safe, inspectable JSON and Markdown report generators.

Code snippets containing triple backticks (```) or <script> tags are safely escaped in Markdown.

Serializer and security escaping tests pass.

Unescaped backticks in source breaking Markdown structure.

Phase 10

Orchestrator & CLI Integration

Phases 5, 8, 9

src/core/orchestrator/*, src/cli/index.ts

Wire RequestValidator, AnalysisCoordinator, and commander CLI with documented exit codes (0, 2, 3, 4, 5).

Medium

tests/e2e/cli-e2e.test.ts (Full 19-fixture end-to-end verification)

Complete working CLI application (npx tsx src/cli/index.ts analyze ...).

All 19 fixtures in Phase M.2 pass end-to-end via the orchestrator and CLI.

MVP Core & CLI Complete Gate.

Calling process.exit inside core modules instead of CLI layer.

Phase 11

Security & Cross-Platform Hardening

Phase 10

.github/workflows/ci.yml, tests/security/*

Add resource-limit tests (oversized blobs, timeouts) and GitHub Actions CI matrix (windows-latest, ubuntu-latest).

Medium

Full test suite (unit, integration, security, e2e).

Verified cross-platform & security-hardened CLI release.

100% of test suite passes on Windows and Linux.

All security and CI checks green.

OS-specific line ending (\r\n vs \n) mismatches in snippet assertions.

Phase 12

Optional React Report Viewer (Deferred Post-MVP)

Phase 11

src/web/*

Build read-only React + Vite viewer that loads report.json (generated by the CLI) to inspect findings and side-by-side snippets visually.

Low-Medium

tests/web/report-viewer.test.tsx

Visual forensic report viewer with zero duplicated analysis logic.

Renders any valid report.json including incomplete/limitation reports cleanly.

Viewer component tests pass.

Moving AST or Git logic into React components (prohibited).

Phase 13

Demo Seed Script & Portfolio Documentation

Phase 11 (or 12)

scripts/seed-demo-repo.ts, README.md, docs/ARCHITECTURE.md, docs/SECURITY.md

Create one-command reproducible demo repo generator (npm run demo) and final architecture/security documentation.

Low

tests/e2e/demo-script.test.ts

Interview-ready public GitHub repository.

Cloning repo and running npm test && npm run demo succeeds out of the box on Windows.

Project complete.

Documenting features that were not implemented.

PHASE P: FIRST VALIDATION EXPERIMENT

Before creating the full directory tree, execute this minimal, self-contained Validation Experiment (spike/validate-ast-core.test.ts) to prove that ts-morph in-memory AST comparison accurately satisfies the core structural detection and epistemic rules.

P.1 Minimum Files and Dependencies Needed

package.json with only:

devDependencies: "typescript": "^5.6.0", "vitest": "^2.1.0", "@types/node": "^20.0.0"

dependencies: "ts-morph": "^24.0.0"

tsconfig.json (strict mode enabled).

spike/validate-ast-core.test.ts (single self-contained file containing a ~150-line prototype comparator and 6 deterministic test cases).

P.2 Spike Test Matrix and Expected Outcomes

Test Case ID

Controlled base Code Input

Controlled head Code Input

Expected Detected Rule(s)

Expected Preserved Evidence

Expected Epistemic Uncertainty (UNKNOWN)

EXP-01: Guard Removal

function pay(amt: number) {\n  if (amt <= 0) return false;\n  return process(amt);\n}

function pay(amt: number) {\n  return process(amt);\n}

RULE_GUARD_REMOVED, RULE_RETURN_REMOVED

baseSpan: Lines 2–2, condition amt <= 0, exit return false

States EXTERNAL_CALLER_BEHAVIOR (cannot verify if caller now validates amt <= 0).

EXP-02: Conditional Operator Change

function check(a: boolean, b: boolean) {\n  if (a && b) {\n    return 1;\n  }\n  return 0;\n}

function check(a: boolean, b: boolean) {\n  if (a || b) {\n    return 1;\n  }\n  return 0;\n}

RULE_CONDITIONAL_MODIFIED

base: a && b (L2), head: a || b (L2)

States that static AST diff does not prove whether upstream callers constrain a and b.

EXP-03: Throw-to-Return Conversion

function parse(s: string) {\n  if (!s) throw new Error("Empty");\n  return s.trim();\n}

function parse(s: string) {\n  if (!s) return "";\n  return s.trim();\n}

RULE_THROW_REMOVED, RULE_RETURN_ADDED

base: throw new Error("Empty") (L2), head: return "" (L2)

States caller exception-handling impact is unknown statically.

EXP-04: Formatting & Comment Noise Only

function calc(x: number) {\n  if (!x) return 0;\n  return x * 2;\n}

function calc(\n  x: number // input\n) {\n  if ((!x)) {\n    return 0;\n  }\n  return x * 2;\n}

[] (Zero structural changes emitted!)

Raw body text differs, but normalized descriptors match 100%.

None (no structural finding emitted).

EXP-05: Inner Callback Isolation

function list(items: number[]) {\n  return items.map(x => {\n    if (x < 0) return 0;\n    return x;\n  });\n}

function list(items: number[]) {\n  return items.map(x => {\n    return x;\n  });\n}

Outer function list has zero outer RULE_GUARD_REMOVED (inner callback statements are not misattributed as outer list guards).

Outer ReturnStatement (items.map(...)) identified at L2.

Notes inner callback body modification without claiming list() lost an outer guard.

EXP-06: Missing / Renamed Function

function oldName(x: number) { return x; }

function newName(x: number) { return x; } (searching for oldName)

Halts structural comparison; returns status FUNCTION_MISSING_IN_HEAD.

baseSpan: L1, headSpan: null

Explicitly emits LINEAGE_OR_PARSE_BOUNDARY (oldName may have been renamed or removed).

P.3 Success Criteria vs. Design Revision Triggers

Success Criteria: Running npx vitest run spike/validate-ast-core.test.ts on Windows passes all 6 cases (EXP-01 through EXP-06) in under 3 seconds, with EXP-04 (formatting noise) and EXP-05 (inner callback isolation) producing zero false-positive guard removals.

What Failure Would Indicate & How to Revise:

If EXP-04 emits a false positive when {} braces or ((...)) parentheses are added: revise AstNormalizer to unwrap SyntaxKind.ParenthesizedExpression and unwrap single-statement SyntaxKind.Block nodes inside IfStatement.getThenStatement().

If EXP-05 misattributes the inner .map(x => { if (x < 0) return 0; }) guard to the outer function: revise StructuralExtractor's AST walker so its traversal predicate skips descending into child ArrowFunction, FunctionExpression, and FunctionDeclaration nodes.

PHASE Q: FINAL ARCHITECTURAL REVIEW

Q.1 Recommended Architecture Summary

Build Change Archaeologist as a modular, single-language TypeScript/Node.js system with a strict boundary between a Pure Core Analysis Engine (src/core/) and a CLI Presentation Layer (src/cli/). Use ts-morph in fast, in-memory syntax-only mode (useInMemoryFileSystem: true) for AST analysis of JavaScript and TypeScript snapshots, and use a hardened child_process.execFile("git") wrapper (shell: false, GIT_OPTIONAL_LOCKS=0, disabled hooks/ext-diffs) for read-only historical source retrieval.

Q.2 Most Important Architectural Trade-Offs

Two-Revision Pairwise Scope (base vs. head) vs. Whole-History Scan in v1.0:

Trade-off: Comparing two revisions of a named function in a single file does not automatically scan 500 commits at once.

Why it wins: Pairwise comparison is the foundational primitive. Once comparing Revision A to Revision B is 100% accurate and well-tested, scanning a commit list is merely a loop over adjacent (commit[i-1], commit[i]) pairs. Building the loop before the pairwise comparator is reliable would multiply debugging complexity.

Syntax-Only ts-morph (skipFileDependencyResolution: true) vs. Full Type-Checker Resolution:

Trade-off: We cannot resolve imported types from node_modules across historical commits.

Why it wins: Historical commits do not have node_modules installed! Syntax-only AST mode works on any historical Git blob in milliseconds with zero npm install inside the target repository.

Conservative Correlation Tiers (STRONG / WEAK / NONE / UNCERTAIN) vs. Numeric Confidence Scores:

Trade-off: Users do not get a flashy "87% Regression Probability" badge.

Why it wins: Numeric percentages without empirical calibration are scientifically invalid. Transparent rule tiers (STRONG = direct call in modified it() block; NONE = companion test untouched) are 100% explainable and defensible in a technical interview.

Q.3 The Five Highest-Risk Architectural Decisions

#

High-Risk Decision

Potential Consequence if Wrong

How to Validate It Early

1

Unwrapping Braces & Parentheses in AstNormalizer

If normalization is too weak, Prettier formatting commits trigger false structural changes; if too aggressive, meaningful operator precedence changes are hidden.

Validate in Phase 1 (EXP-02 & EXP-04) by testing both formatting-only parentheses (if ((a))) and operator precedence changes ((a && b) || c vs a && (b || c)).

2

Stopping AST Traversal at Nested Function Boundaries

If functions use immediately invoked closures or wrapper callbacks (db.transaction(() => { if (!ok) throw err; })), skipping nested arrow functions will miss guards inside the callback.

Validate in Phase 1 (EXP-05) and document in report.limitations that guards inside nested callbacks/closures are scoped to the inner callback rather than the outer function.

3

Statement Pairing via Structural Fingerprint in StructuralComparator

If a function has two identical guards (if (!res) return null; after two different calls) and one is removed, set-based fingerprint matching must still count multiplicity (2 -> 1).

Use multiset (count-aware, ordered) matching rather than deduplicated Set matching in StructuralComparator; verify with FX-07 in Phase 3.

4

Executing Git on Windows with GIT_OPTIONAL_LOCKS=0

Without GIT_OPTIONAL_LOCKS=0, read-only Git commands can refresh .git/index stat caches, failing strict file-mtime immutability checks.

Validate in Phase 5 (tests/security/repo-immutability.test.ts) by hashing .git/index before and after analysis on Windows.

5

Matching Test Blocks to Target Function by Identifier Name

If a test file aliases the imported function (import { verify as v }) or calls a class instance (service.verify()), naive identifier matching might miss or over-match.

In TestAstAnalyzer (Phase 6), match both direct identifier calls (verify(...)) and property access calls (*.verify(...)), and test both in tests/unit/test-analyzer.test.ts.

Q.4 Assumptions Still Needing Validation & Unresolved Questions

To Validate in Phase 1: Confirm ts-morph cold-start instantiation time in Vitest on your Windows machine is < 1.5 seconds when skipLoadingLibFiles: true and useInMemoryFileSystem: true are enabled.

To Validate in Phase 4: Confirm the exact git --version installed on your Windows machine supports git diff-tree -M90% and GIT_OPTIONAL_LOCKS=0 (standard since Git 2.15+).

Q.5 First Implementation Task After Architecture Approval

Once you approve this blueprint, your first implementation task in Google Antigravity is Phase 1 (The Phase P First Validation Experiment):

Files to Create: package.json, tsconfig.json, and spike/validate-ast-core.test.ts.

Recommended Antigravity / Gemini 3.8 Flash Effort Level: High Effort (because it establishes the exact ts-morph guard/conditional/throw/return extraction and trivia normalization patterns that Phase 3 will promote into src/core/ast/).

Exact Acceptance Criteria for Task 1:

npm install completes cleanly on Windows with zero node-gyp native build warnings.

npx tsc --noEmit exits with code 0.

npx vitest run spike/validate-ast-core.test.ts passes all 6 experiment cases (EXP-01 through EXP-06) in < 3 seconds.

Q.6 Readiness Checklist Before Entering Implementation

Verify each item below before prompting Gemini 3.8 Flash to create package.json:

Analysis Boundary Locked: Single named function in a single file compared across two Git revisions (base and head).

Epistemic Model Locked: Compile-time non-empty tuples and Zod runtime refinements enforce OBSERVED -> INFERRED -> UNKNOWN traceability.

Initial Rules Locked: Guard clauses (IfStatement with unconditional return/throw), conditional expressions, throw statements, and return statements.

Test Correlation Locked: Deterministic tiers (STRONG, WEAK, NONE, UNCERTAIN) based on import presence, it() block function calls, and expect/assert AST deltas.

Security Invariants Locked: execFile("git") with shell: false, -c core.hooksPath=, GIT_OPTIONAL_LOCKS=0, -- path separators, and Windows-to-POSIX path normalization.

Verification First: Phase 1 starts with the 6-case ts-morph validation spike (spike/validate-ast-core.test.ts) before building the rest of the application.