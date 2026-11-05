# Change Archaeologist: Architecture and Data Flow

**Document:** `ARCHITECTURE_AND_DATA_FLOW.md`  
**Purpose:** Comprehensive architecture map, execution data flow, state ownership, and component synchronization for the frontend redesign.  
**Audience:** Independent LLM acting as frontend architect.

---

## 1. Directory-Level Architecture Map

```
E:\change-archaeologist\
├── bin/
│   └── change-archaeologist.js       # CLI executable entry point (# !/usr/bin/env node)
├── src/
│   ├── cli/                           # Command-line interface orchestration
│   │   ├── args.ts                    # Zero-dependency CLI argument parser (parseCliArgs)
│   │   ├── index.ts                   # CLI entry exports
│   │   ├── orchestrator.ts            # Main CLI execution pipeline (runCli)
│   │   ├── safe-file-writer.ts        # Output writer with protected path security
│   │   └── types.ts                   # CLI options, exit codes, IO interfaces
│   ├── core/                          # Pure headless analysis engine (zero UI/DOM)
│   │   ├── ast/                       # TypeScript AST parsing and AST difference detection
│   │   │   ├── ast-normalizer.ts      # Strips formatting, whitespace, comments
│   │   │   ├── function-locator.ts    # Extracts target function via ts-morph AST
│   │   │   ├── structural-comparator.ts # Detects Guard, Conditional, Throw, Return mutations
│   │   │   └── structural-extractor.ts  # Extracts descriptors (guards, returns, etc.)
│   │   ├── comparison/                # Historical function comparator
│   │   │   └── historical-function-comparator.ts # Coordinates base vs head function comparison
│   │   ├── correlation/               # Conservative change correlation
│   │   │   └── change-correlator.ts   # Computes STRONG / WEAK / UNCERTAIN / NONE links
│   │   ├── domain/                    # Immutable domain models and runtime schemas
│   │   │   ├── schemas.ts             # Runtime validators and validation errors
│   │   │   └── types.ts               # Core domain contracts (AnalysisReport, Finding, etc.)
│   │   ├── git/                       # Read-only Git subprocess adapter
│   │   │   ├── errors.ts              # Structured GitError class and error codes
│   │   │   ├── git-adapter.ts         # Primary git adapter facade
│   │   │   ├── git-runner.ts          # Safe child_process.execFile wrapper
│   │   │   ├── path-normalizer.ts     # Path traversal, drive, and security checks
│   │   │   ├── revision-resolver.ts   # Resolves tags, branches, relative revs to 40-char SHA
│   │   │   └── source-loader.ts       # Loads raw committed file snapshots via git show
│   │   ├── reporting/                 # Report assembly and serialization
│   │   │   ├── json-report-serializer.ts     # Validated JSON serializer
│   │   │   ├── markdown-report-serializer.ts # High-contrast tabular Markdown generator
│   │   │   └── report-assembler.ts           # Assembles unified InvestigationReport
│   │   └── test-analysis/             # Companion test-change inspection
│   │       ├── assertion-extractor.ts        # Extracts expect/assert statements
│   │       ├── test-analysis-service.ts      # Coordinates test file comparisons
│   │       ├── test-change-comparator.ts     # Detects added/removed/modified tests
│   │       └── test-locator.ts               # Locates describe/it/test declarations
│   └── viewer/                        # Frontend report viewer (Evidence Atlas)
│       ├── app/
│       │   └── App.tsx                # Application root mounting ViewerPage
│       ├── components/                # Viewer presentation components
│       │   ├── graph/                 # React Flow custom nodes, edges, legend
│       │   │   ├── CustomEdges.tsx    # Containment (dashed) & Correlation (solid) edges
│       │   │   ├── CustomNodes.tsx    # Production, Mutation, Test, Declaration nodes
│       │   │   ├── GraphAccessibleView.tsx # Accessible semantic table alternative
│       │   │   └── GraphLegend.tsx    # Graph key, status counts, non-causality notice
│       │   ├── ui/                    # Reusable atomic UI components
│       │   │   ├── Accordion.tsx      # Compound accessible accordion container
│       │   │   ├── AnimatedGroup.tsx  # Motion coordinated staggered entrance
│       │   │   ├── Badge.tsx          # Semantic status badge (terracotta, verdigris, etc.)
│       │   │   ├── Disclosure.tsx     # Motion animated height disclosure
│       │   │   └── TactileButton.tsx  # Precision micro-interaction tactile button
│       │   ├── ChangeTimeline.tsx     # Chronological commit-to-commit timeline view
│       │   ├── CodeComparison.tsx     # Embedded Monaco Editor side-by-side diff
│       │   ├── CodeComparisonToolbar.tsx # Monaco diff navigation & mode toggles
│       │   ├── CorrelationGraph.tsx   # Interactive React Flow correlation canvas
│       │   ├── CorrelationMatrixTable.tsx # Tabular code-test correlation matrix
│       │   ├── DetailInspector.tsx    # Right-side inspector & plain-English cards
│       │   ├── EditorUnavailableState.tsx # Monaco missing/deleted source fallbacks
│       │   ├── ExecutiveSummaryStrip.tsx # Top KPI metrics and epistemic guardrails
│       │   ├── FindingsSummary.tsx    # List of structured epistemic findings
│       │   ├── LimitationsBanner.tsx  # Bottom boundary warnings and execution errors
│       │   ├── Navbar.tsx             # Two-level application header & scenario picker
│       │   ├── ReportLoader.tsx       # JSON drag-and-drop & file picker modal
│       │   ├── ReportReadingGuide.tsx # 3-question newcomer orientation guide
│       │   ├── StructuralChangeExplorer.tsx # List of discrete AST mutations
│       │   └── TestChangesInspector.tsx     # Companion test declarations and assertions
│       ├── data/
│       │   └── demo-fixtures.ts       # 6 precompiled demonstration reports (Scenarios A-F)
│       ├── layouts/
│       │   └── ConsoleLayout.tsx      # Application shell: header, tabs, main, inspector
│       ├── pages/
│       │   └── ViewerPage.tsx         # Root state owner, scenario switcher, selection sync
│       ├── styles/
│       │   ├── index.css              # Global styles, tailwind base, custom scrollbars
│       │   └── tokens.css             # Evidence Atlas design tokens (Tier 1, 2, 3)
│       ├── types/
│       │   ├── graph.ts               # React Flow node/edge presentation types
│       │   ├── index.ts               # Re-exported domain types for viewer
│       │   └── timeline.ts            # Timeline track and group item types
│       └── utils/
│           ├── cn.ts                  # clsx + tailwind-merge helper
│           ├── explanation-helpers.ts # Plain-English explanation generators
│           ├── graph-model.ts         # Transforms AnalysisReport into React Flow nodes/edges
│           ├── report-loader.ts       # Runtime JSON schema validation and file loader
│           ├── source-location.ts     # Monaco span formatting and line conversion
│           └── timeline-model.ts      # Transforms AnalysisReport into timeline tracks
├── tests/
│   ├── integration/                   # End-to-end integration test suites
│   └── unit/                          # Unit test suites (core, CLI, viewer)
└── Docs/                              # Architecture and validation documentation
```

---

## 2. Text-Based Component Dependency Diagram

```
                               ┌─────────────┐
                               │  index.html │
                               └──────┬──────┘
                                      ▼
                               ┌─────────────┐
                               │  main.tsx   │
                               └──────┬──────┘
                                      ▼
                               ┌─────────────┐
                               │   App.tsx   │
                               └──────┬──────┘
                                      ▼
                             ┌─────────────────┐
                             │ ViewerPage.tsx  │ <── (Owns all selection state & active report)
                             └────────┬────────┘
                                      │
           ┌──────────────────────────┼──────────────────────────┐
           ▼                          ▼                          ▼
   ┌───────────────┐          ┌───────────────┐          ┌───────────────┐
   │ ConsoleLayout │          │ ReportLoader  │          │ demo-fixtures │
   └───────┬───────┘          └───────────────┘          └───────────────┘
           │
           ├──────────────────────────┬──────────────────────────┬──────────────────────────┐
           ▼                          ▼                          ▼                          ▼
   ┌───────────────┐          ┌───────────────┐          ┌───────────────┐          ┌───────────────┐
   │    Navbar     │          │ Executive-    │          │ ReportReading-│          │ Detail-       │
   │               │          │ SummaryStrip  │          │ Guide         │          │ Inspector     │
   └───────────────┘          └───────────────┘          └───────────────┘          └───────┬───────┘
                                                                                            │
                                                                   ┌────────────────────────┴────────┐
                                                                   ▼                                 ▼
                                                            ┌───────────────┐                 ┌─────────────┐
                                                            │CodeComparison │                 │Explanation- │
                                                            └───────┬───────┘                 │Helpers      │
                                                                    ▼                         └─────────────┘
                                                            ┌───────────────┐
                                                            │ Monaco Editor │
                                                            └───────────────┘

                 ══════════════════════════════════════════════════
                 ACTIVE WORKSPACE TAB (Rendered inside ConsoleLayout):
                 ══════════════════════════════════════════════════
                 • ChangeTimeline (timeline)
                 • CorrelationGraph (graph) ──> CustomNodes, CustomEdges, GraphLegend
                 • StructuralChangeExplorer (structural)
                 • TestChangesInspector (tests)
                 • CorrelationMatrixTable (correlations)
                 • FindingsSummary (findings)
```

---

## 3. End-to-End Data Flow Diagram

```
[CLI Invocation]
  change-archaeologist --repo ./repo --file src/order.ts --function calculateDiscount --base v1 --head v2
        │
        ▼
   args.ts (parseCliArgs)
        │
        ▼
   orchestrator.ts (runCli)
        │
        ├─> git-adapter.ts ──> git-runner.ts ──> [git show base:src/order.ts]
        │                                    ──> [git show head:src/order.ts]
        │
        ├─> historical-function-comparator.ts
        │     ├─> function-locator.ts (ts-morph AST locate calculateDiscount)
        │     ├─> ast-normalizer.ts (normalize whitespace, format)
        │     ├─> structural-extractor.ts (extract guards, conditionals, throws, returns)
        │     └─> structural-comparator.ts (compare AST snapshots ──> StructuralChange[])
        │
        ├─> test-analysis-service.ts
        │     ├─> git-adapter.ts (git show test files at base and head)
        │     ├─> test-locator.ts (locate describe, it, test blocks)
        │     ├─> assertion-extractor.ts (extract expect / assert calls)
        │     └─> test-change-comparator.ts (detect added/removed/modified assertions ──> TestChange[])
        │
        ├─> change-correlator.ts (correlateChanges: evaluate co-occurrence and calls ──> CorrelationResult[])
        │
        ├─> report-assembler.ts (assembleInvestigationReport: validate invariants ──> AnalysisReport)
        │
        ├─> json-report-serializer.ts / markdown-report-serializer.ts
        │
        └─> safe-file-writer.ts (safeWriteReportFile ──> report.json)

────────────────────────────────────────────────────────────────────────────────
                                  │
                                  ▼
[Browser Frontend Ingestion]
  User drops `report.json` onto ReportLoader OR selects a Demo Scenario in Navbar
        │
        ▼
   report-loader.ts (loadReportFromJsonString)
        │  Validates schemaVersion: "1.0.0", mandatory fields, commit SHAs
        ▼
   ViewerPage.tsx (`setReport(report)`)
        │
        ├─> ExecutiveSummaryStrip.tsx (Calculates counts: scCount, tcCount, corrCount, findings)
        │
        ├─> Navbar.tsx (Displays target function, target file, base/head commit SHAs, status badge)
        │
        ├─> graph-model.ts (Transforms AnalysisReport into React Flow GraphNodes & GraphEdges)
        │     └─> CorrelationGraph.tsx (Renders interactive visual graph or Accessible View)
        │
        ├─> timeline-model.ts (Groups items by BASE, HEAD, UNCHANGED into timeline tracks)
        │     └─> ChangeTimeline.tsx (Renders commit cards, change items, filters)
        │
        ├─> DetailInspector.tsx (Receives selectedChange, selectedTestChange, selectedCorrelation)
        │     ├─> explanation-helpers.ts (Generates plain-English summary, "Establishes", "Does NOT Establish")
        │     └─> CodeComparison.tsx (Sets up Monaco Editor with original vs modified snippets & spans)
        │
        └─> LimitationsBanner.tsx (Displays report.limitations and report.errors)
```

---

## 4. Selection Synchronization Architecture

The frontend uses **centralized top-down state synchronization** managed entirely by `ViewerPage.tsx`. No child workspace tab maintains independent selection state.

### Selection State Variables in `ViewerPage.tsx`

| State Variable | Type | Default Value | Purpose |
|---|---|---|---|
| `report` | `AnalysisReport \| null` | `DEMO_SCENARIO_E` | The active report data driving the entire application. |
| `activeScenarioId` | `string \| null` | `"E"` | Active demo scenario ('A'-'F'), or `null` if user ingested custom JSON. |
| `activeTab` | `WorkspaceTab` | `"structural"` | Active center tab ('timeline', 'graph', 'structural', 'tests', 'correlations', 'findings'). |
| `selectedChangeId` | `string \| null` | `report.structuralChanges[0]?.id` | Selected structural AST mutation ID (e.g. `"SC-001"`). |
| `selectedTestChangeId` | `string \| null` | `report.testChanges[0]?.id` | Selected test change ID (e.g. `"TC-001"`). |
| `selectedCorrelationId`| `string \| null` | `report.correlationItems[0]?.id`| Selected correlation link ID (e.g. `"CORR-ITEM-001"`). |
| `selectedFindingId` | `string \| null` | `report.findings[0]?.id` | Selected epistemic finding ID (e.g. `"FND-001"`). |
| `selectedEvidenceId` | `string \| null` | `report.evidence[0]?.id` | Selected evidence anchor ID (e.g. `"EV-001"`). |
| `isLoaderOpen` | `boolean` | `false` | Controls visibility of `ReportLoader` modal dialog. |
| `isGuideOpen` | `boolean` | `false` | Controls expansion of `ReportReadingGuide` newcomer banner. |

### How Selecting an Entity Affects Every Component

```
USER ACTION: Selects a Structural Mutation (e.g. "SC-001")
  │
  ├─ In CorrelationGraph: clicks node `node-sc-SC-001`
  ├─ OR in ChangeTimeline: clicks mutation card `SC-001`
  └─ OR in StructuralChangeExplorer: clicks row `SC-001`
  │
  ▼
Calls `onSelectChange("SC-001")` in `ViewerPage.tsx`:
  1. `setSelectedChangeId("SC-001")`
  2. `setSelectedCorrelationId(null)` (clears active correlation edge)
  │
  ▼
Downstream State Propagation:
  │
  ├─> DetailInspector (`selectedChange` prop):
  │     • Reads `report.structuralChanges.find(s => s.id === "SC-001")`
  │     • Generates Plain-English Explanation:
  │         - plainTitle: "Defensive Safety Check Removed"
  │         - whatChanged: Explains AST mutation in plain English
  │         - establishes: Observed AST shift in Git
  │         - doesNotEstablish: Runtime failure or bug causation
  │     • Sets up CodeComparison with:
  │         - original: selectedChange.beforeSnippet (or full base file)
  │         - modified: selectedChange.afterSnippet (or full head file)
  │
  ├─> CodeComparison / Monaco Editor:
  │     • Centers and reveals `selectedChange.beforeSpan` in original editor
  │     • Centers and reveals `selectedChange.afterSpan` in modified editor
  │     • Highlights line range with terracotta/verdigris diff decoration
  │
  ├─> CorrelationGraph:
  │     • Node `node-sc-SC-001` receives `selected: true`
  │     • Applies active ring: `0 0 0 2px rgba(196,82,26,0.15)`
  │     • Renders floating Selection Explanation Card above canvas
  │
  ├─> ChangeTimeline:
  │     • Card for `SC-001` receives `selected=true`
  │     • Applies active focus border and terracotta highlight
  │
  └─> Evidence Synchronization (`associatedEvidence` useMemo):
        • Filters `report.evidence` for items linked to `SC-001`
        • Updates evidence navigation pills in CodeComparison toolbar
```

### Edge Selection Synchronization (Correlation Link)
When the user clicks a correlation link in `CorrelationMatrixTable` or clicks a correlation edge (`edge-corr-CORR-001`) in `CorrelationGraph`:
1. `setSelectedCorrelationId("CORR-001")` is called; `setSelectedChangeId(null)` is called.
2. `DetailInspector` displays the correlation rationale, observed fact, inferred relationship, and unknown boundaries.
3. `associatedEvidence` filters exclusively for `correlation.evidenceIds`.
4. `CorrelationGraph` highlights the edge with bold stroke (`strokeWidth: 2.5`), darkens edge label, and opens the floating explanation card.

