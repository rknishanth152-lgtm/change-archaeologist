# Source Bundle Manifest

**Change Archaeologist** &bull; Independent LLM Frontend Redesign Context  
**Repository:** `E:\change-archaeologist`  
**Archive:** `Docs/llm-handoff/change-archaeologist-ui-context.zip`  
**File Size:** 417,688 bytes (approx. 0.40 MB)  
**SHA-256 Checksum:** `AE3EE9B9A50C0922EC7B95529CD47BEEEF21F9B03BA776C6B98B456BA0154253`  
**Total File Count:** 147 entries  
**Document:** `Docs/llm-handoff/SOURCE_BUNDLE_MANIFEST.md`

---

## Part 1: Purpose & Contents Summary

This archive contains the complete contextual source tree required for an independent LLM to evaluate, understand, and redesign the user interface of Change Archaeologist without missing domain invariants, schema types, or component behaviors.

### Summary of Included Categories
1. **Frontend Viewer Application (`src/viewer/`):** All components, layouts, pages, styles, fixtures, and utilities.
2. **Core Domain, AST, Git & Correlation Engine (`src/core/`):** Type contracts, schema validation, epistemic rules, AST comparator, and test correlation engine.
3. **CLI Orchestration & Reporting (`src/cli/`):** Analysis pipeline, Markdown/JSON formatters, and argument parsers.
4. **Complete Test Suites (`tests/`):** 27 test files covering unit domain logic, integration scenarios, security boundaries, and React viewer components.
5. **Demonstration Scenarios & Pipeline (`scripts/`, `examples/`):** Automated demo runners and validation corpora representing Scenarios A through F.
6. **Configuration & Design Specifications:** Build configs, Vite/Vitest setups, Tailwind theme tokens, and `DESIGN.md`.

---

## Part 2: Detailed File Manifest & Rationales

### 1. Root Configuration & Documentation Files
* `package.json`: Project manifest defining dependencies (`@monaco-editor/react`, `@xyflow/react`, `motion`, `lucide-react`, `tailwindcss`) and execution scripts.
* `tsconfig.json`: TypeScript configuration specifying compiler options, JSX runtime, and module resolution.
* `vite.config.ts`: Vite bundling configuration for the client-side viewer application.
* `vitest.config.ts`: Vitest test runner configuration with JSDOM environment and testing-library setup.
* `tailwind.config.js`: Tailwind theme definition containing all semantic color tokens (`terracotta`, `verdigris`, `sandstone`, etc.).
* `postcss.config.js`: PostCSS plugin configuration for Tailwind and Autoprefixer.
* `index.html`: Single-page application entrypoint mounting the React DOM tree to `#root`.
* `DESIGN.md`: Design philosophy, token specifications, epistemic guidelines, and typography scale.
* `README.md`: Product overview, CLI usage instructions, and viewer launch guide.

### 2. Frontend Viewer Codebase (`src/viewer/`)
* `src/viewer/main.tsx`: React 19 application entrypoint.
* `src/viewer/app/App.tsx`: Top-level app wrapper hosting `ViewerPage`.
* `src/viewer/pages/ViewerPage.tsx`: Primary application controller and sole state owner (active scenario, active tab, selection synchronization, modal states).
* `src/viewer/layouts/ConsoleLayout.tsx`: Master layout frame rendering the dual-tier header, executive summary strip, tabbed navigation, and detail inspector drawer.
* `src/viewer/components/Navbar.tsx`: Dual-tier application navigation bar.
* `src/viewer/components/ExecutiveSummaryStrip.tsx`: High-level metrics ribbon with epistemic guardrails.
* `src/viewer/components/ChangeTimeline.tsx`: Chronological visualization of structural and test mutations.
* `src/viewer/components/CorrelationGraph.tsx`: 2D node-link graph powered by `@xyflow/react`.
* `src/viewer/components/graph/CustomNodes.tsx`: Specialized React Flow nodes (`structuralNode`, `testNode`).
* `src/viewer/components/graph/CustomEdges.tsx`: Specialized React Flow edge (`correlationEdge`).
* `src/viewer/components/graph/GraphLegend.tsx`: Collapsible graph legend card.
* `src/viewer/components/graph/GraphAccessibleView.tsx`: Screen-reader accessible table view of graph data.
* `src/viewer/components/StructuralChangeExplorer.tsx`: AST mutation explorer with category filters.
* `src/viewer/components/TestChangesInspector.tsx`: Companion test suite explorer with assertion diffs.
* `src/viewer/components/CorrelationMatrixTable.tsx`: Tabular matrix mapping production changes to tests.
* `src/viewer/components/FindingsSummary.tsx`: Synthesis of findings, observations, and explicit unknowns.
* `src/viewer/components/DetailInspector.tsx`: Persistent/collapsible multi-tab inspector panel.
* `src/viewer/components/CodeComparison.tsx`: Monaco Editor integration for side-by-side AST diffs.
* `src/viewer/components/CodeComparisonToolbar.tsx`: Monaco toolbar for mode switching and snippet copying.
* `src/viewer/components/EditorUnavailableState.tsx`: Accessible fallback when Monaco is unavailable.
* `src/viewer/components/ReportLoader.tsx`: Modal dialog for importing JSON reports with live Zod validation.
* `src/viewer/components/ReportReadingGuide.tsx`: Educational onboarding guide for newcomers.
* `src/viewer/components/LimitationsBanner.tsx`: Static epistemic guardrail notice.
* `src/viewer/components/ui/Badge.tsx`: Semantic status badge primitive.
* `src/viewer/components/ui/TactileButton.tsx`: Tactile micro-interaction button primitive.
* `src/viewer/components/ui/Disclosure.tsx`: Motion-powered collapsible disclosure primitive.
* `src/viewer/components/ui/Accordion.tsx`: Accessible accordion primitive.
* `src/viewer/components/ui/AnimatedGroup.tsx`: Staggered entrance animation primitive.
* `src/viewer/data/demo-fixtures.ts`: Preloaded canonical test fixtures (Scenarios A through F).
* `src/viewer/styles/index.css`: Global base styles, scrollbar tokens, and focus rings.
* `src/viewer/styles/tokens.css`: Semantic CSS custom properties defining the Evidence Atlas color palette.
* `src/viewer/types/*.ts`: Frontend view model interfaces (`graph.ts`, `timeline.ts`, `index.ts`).
* `src/viewer/utils/*.ts`: Utility modules (`cn.ts`, `graph-model.ts`, `timeline-model.ts`, `report-loader.ts`, `source-location.ts`, `explanation-helpers.ts`).

### 3. Core Engine & CLI (`src/core/`, `src/cli/`)
* `src/core/domain/types.ts`: Immutable domain entities, epistemic model definitions, and report contracts.
* `src/core/domain/schemas.ts`: Pure-TypeScript runtime schema validators and referential integrity enforcers.
* `src/core/ast/comparator.ts`: TypeScript AST comparison engine using `ts-morph`.
* `src/core/tests/analyzer.ts`: Companion test discovery and assertion mutation analyzer.
* `src/core/correlation/engine.ts`: Conservative evidence correlation engine.
* `src/core/git/adapter.ts`: Local Git interface extracting historical snapshots via `git show`.
* `src/cli/orchestrator.ts`: Analysis pipeline orchestrating Git extraction, AST comparison, and report generation.
* `src/cli/formatters/*.ts`: JSON and Markdown report formatters.

### 4. Test Suites (`tests/`)
* `tests/unit/viewer/*.test.tsx`: 14 dedicated React viewer unit test suites (accessibility, navigation, timeline, graph, Monaco diffs, retrieved UI components).
* `tests/unit/domain/*.test.ts`: Epistemic invariant and schema validation tests.
* `tests/unit/correlation/*.test.ts`: Correlation engine logic tests.
* `tests/integration/cli/*.test.ts`: End-to-end CLI command tests.
* `tests/integration/demo/*.test.ts`: Demo runner pipeline validation tests.
* `tests/helpers/temp-git-repo.ts`: In-memory and temporary Git repository harness for testing.

### 5. Documentation & Handoff Materials (`Docs/`)
* `Docs/llm-handoff/PROJECT_CONTEXT.md`: High-level brief, epistemic principles, and constraints.
* `Docs/llm-handoff/ARCHITECTURE_AND_DATA_FLOW.md`: Architecture map and selection sync mechanics.
* `Docs/llm-handoff/FEATURE_AND_INTERACTION_INVENTORY.md`: Exhaustive feature and control table.
* `Docs/llm-handoff/FRONTEND_COMPONENT_CATALOG.md`: Component-by-component catalog and props interfaces.
* `Docs/llm-handoff/REPORT_SCHEMA_AND_SEMANTICS.md`: Formal schema contracts and epistemic definitions.
* `Docs/llm-handoff/CURRENT_UI_SOURCE_MAP.md`: Visual-to-code cross reference mapping.
* `Docs/llm-handoff/IMPLEMENTATION_AND_TEST_STATUS.md`: Git status baseline and verification commands.
* `Docs/demo-architecture.md`: Demonstration pipeline architecture.
* `Docs/demo-guide.md`: Demo execution manual.

---

## Part 3: Explicitly Excluded Files & Directories

The following directories, artifacts, and temporary files were strictly excluded from the archive to ensure zero noise, security compliance, and minimal bundle size:

| Excluded Path / Pattern | Reason for Exclusion |
| :--- | :--- |
| `node_modules/` | Third-party installed dependencies; re-installable via `npm install` (~350 MB). |
| `dist/` | Compiled build output; regenerated via `npm run build` (~25 MB). |
| `.git/` (and `examples/**/.git`) | Git version history and pack files (~15 MB). Avoids git-in-git conflicts. |
| `.vite/` | Vite build and dependency pre-bundling caches. |
| `*.log` | Runtime execution logs and debug output. |
| Credentials & API Keys | None exist in repository, but all potential `.env*` patterns are excluded. |

