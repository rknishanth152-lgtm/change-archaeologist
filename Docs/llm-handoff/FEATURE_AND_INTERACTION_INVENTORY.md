# Feature and Interactive Control Inventory

**Change Archaeologist** &bull; Independent LLM Frontend Redesign Context  
**Repository:** `E:\change-archaeologist`  
**Document:** `Docs/llm-handoff/FEATURE_AND_INTERACTION_INVENTORY.md`  
**Purpose:** Exhaustive catalog of system capabilities and detailed interactive control inventory for frontend redesign.

---

## Part 1: System Capability & Feature Inventory

### 1. Core Engine Capabilities
* **AST-Based Structural Comparison:**
  * Uses TypeScript AST analysis via `ts-morph` (`src/core/ast/comparator.ts`).
  * Compares exact function AST trees between two Git commits without running code or loading runtime dependencies.
  * Detects categorized structural mutations: `SIGNATURE`, `BODY_STATEMENT`, `CONTROL_FLOW`, `RETURN_EXPRESSION`, `ASYNC_GENERATOR`, `TYPE_SIGNATURE`, `PROPERTY_ACCESS`.
  * Computes AST node coordinates (line numbers, column offsets, statement indices) in old and new code revisions.
  * Reconstructs contextual unified diff snippets with surrounding AST statements.
* **Companion Test Analysis:**
  * Discovers associated test suites by analyzing test paths, test declaration names, and direct function invocation patterns (`src/core/tests/analyzer.ts`).
  * Parses test files via `ts-morph` to identify test blocks (`describe`, `it`, `test`).
  * Tracks test declaration modifications: `ADDED`, `MODIFIED`, `DELETED`, `RENAMED`, `UNCHANGED`.
  * Analyzes granular assertion mutations (`ADDED`, `MODIFIED`, `REMOVED`) and assertion types (`EXPECT_CALL`, `ASSERT_STRICT`, `ASSERT_THROWS`, `UNKNOWN`).
* **Conservative Evidence Correlation:**
  * Correlates structural changes with test modifications based strictly on verifiable AST evidence (`src/core/correlation/engine.ts`).
  * Classifies correlations into discrete epistemic statuses:
    * `STRONG`: The test explicitly invokes the modified function directly within the same commit.
    * `WEAK`: The test suite or enclosing file changed, but direct call references to the modified AST node cannot be verified statically.
    * `NONE`: Structural changes exist without any corresponding test changes.
    * `UNCERTAIN`: Ambiguous or indirect relationships (e.g. indirect dispatch, dynamic invocation).
  * Assigns explicit review attention levels: `CRITICAL`, `ELEVATED`, `STANDARD`, `INFORMATIONAL`.
* **Epistemic Invariant Enforcement:**
  * Distinguishes strictly between `OBSERVED` (verifiable concrete evidence items), `INFERRED` (deductive analytical observations), and `UNKNOWN` (explicit epistemic limits of static analysis).
  * Enforces invariant that every report contains at least one observation and at least one unknown statement to prevent unwarranted confidence.

---

### 2. CLI Tooling & Analysis Pipeline
* **Command-Line Interface:**
  * Executable via `bin/change-archaeologist.js` / `src/cli/index.ts`.
  * Accepts required options: `--target <path>`, `--symbol <name>`, `--from <commit>`, `--to <commit>`.
  * Optional arguments: `--tests <paths...>`, `--format <json|markdown>`, `--output <file>`, `--quiet`, `--verbose`.
* **Execution Orchestration:**
  * Orchestrated via `src/cli/orchestrator.ts`.
  * Invokes Git adapter to extract historical file revisions using `git show <commit>:<path>`.
  * Validates inputs, checks syntax, executes AST comparisons, analyzes tests, builds correlation results, and emits formatted reports.
  * Formats reports as machine-readable JSON (validated against Zod schema) or comprehensive human-readable Markdown summaries (`src/cli/formatters/`).

---

### 3. Frontend Viewer Architecture & Capabilities
* **Local-First Client-Side Web Application:**
  * Developed with React 19, TypeScript 5.8, Tailwind CSS v3.4, and Vite 6.2.
  * Runs entirely client-side without a persistent backend server.
  * Zero remote telemetry, zero arbitrary GitHub API scraping. Operates strictly on local JSON analysis reports.
* **Preloaded Demo Scenarios:**
  * Bundled with 6 canonical demo fixtures (`src/viewer/fixtures/demo-fixtures.ts`) representing distinct archaeological archetypes:
    * Scenario A: *Full Refactoring with Matching Test Updates* (Balanced, Strong correlation).
    * Scenario B: *Structural Mutation Without Test Coverage* (Missing test updates, None correlation, Critical attention).
    * Scenario C: *Signature & Type Overhaul* (Breaking API changes, Elevated attention).
    * Scenario D: *Edge-Case Logic & Branch Divergence* (Complex control flow modifications).
    * Scenario E: *Async Pipeline & Promise Migration* (Async/generator mutations).
    * Scenario F: *Ambiguous Indirect Call Relationship* (Uncertain correlation status).
* **Interactive JSON Ingestion (`ReportLoader`):**
  * Modal dialog supporting multiple report loading mechanisms:
    * Drag-and-drop file upload.
    * File picker browse action (`.json` files).
    * Direct JSON text paste with live JSON schema validation via Zod.
    * Quick-switch buttons for built-in demo scenarios.
* **Newcomer Onboarding & Explanation (`ReportReadingGuide`):**
  * Integrated onboarding guide explaining report interpretation to newcomers, students, and engineers:
    * "What changed?" (Structural code changes vs text diffs).
    * "What do the tests tell us?" (Companion tests vs runtime coverage).
    * "What is still unknown?" (Static limits: execution coverage, runtime values, flaky tests).
    * Expandable epistemic glossary defining `STRONG`, `WEAK`, `NONE`, `UNCERTAIN`, `OBSERVED`, `INFERRED`, and `UNKNOWN`.
* **Dual Header Shell (`Navbar`):**
  * Row 1 (Identity & Global Utility): Product branding, Evidence Atlas descriptor, Reading Guide toggle, Import JSON modal trigger.
  * Row 2 (Context & Workspace Filter): Target entity pill, Commit range pill, Analysis status badge, Scenario switcher select dropdown.
* **Executive Summary Strip (`ExecutiveSummaryStrip`):**
  * Persistent summary banner displaying high-level report metrics:
    * Target function and commit span.
    * Structural mutation count badge.
    * Test modification count badge.
    * Correlation status distribution pills (Strong, Weak, None, Uncertain).
    * Epistemic findings metric badge.
    * Static-analysis guardrail notice emphasizing that no runtime code was executed.
* **Workspace Tabbed Navigation (`ConsoleLayout`):**
  * 6 dedicated analytical perspectives:
    1. `Timeline`: Chronological progression of mutations and test updates across revisions.
    2. `Correlation Graph`: Interactive 2D node-link graph mapping structural nodes to test declarations.
    3. `Code Changes`: Granular AST structural change cards with line coordinates and code diffs.
    4. `Test Changes`: Companion test suite inspection with assertion diffs and call references.
    5. `Correlation Matrix`: Tabular matrix mapping structural changes directly to companion tests.
    6. `Findings`: Synthesis of observations, risks, and explicit unknowns.
* **Interactive Directed Correlation Graph (`CorrelationGraph`):**
  * Built using `@xyflow/react` (React Flow v12).
  * Custom node types: `structuralNode` (amber-tinted) and `testNode` (blue-tinted) with interactive selection and status indicators.
  * Custom edge types: `correlationEdge` with dashed/solid styles, animated paths, and status badge overlays (`STRONG`, `WEAK`, `UNCERTAIN`).
  * Layout engine: Automated multi-column layered dagre-style coordinate calculation (`graph-model.ts`).
  * Canvas tools: Fit view, zoom in/out, pan, minimap, expandable legend.
  * Dual-mode view: Visual canvas mode and accessible table/tree mode (`GraphAccessibleView`) for screen reader users and keyboard navigation.
* **Dual-Pane Detail Inspector & Monaco Editor (`DetailInspector` + `CodeComparison`):**
  * Synchronized detail panel inspects active structural change, correlation, or test change.
  * Embedded Monaco Editor (`@monaco-editor/react`) provides:
    * Side-by-side diff mode (`DiffEditor`) comparing `from` vs `to` revisions.
    * Single code editor mode with revision switcher.
    * AST syntax highlighting for TypeScript/JavaScript.
    * Line jump navigation directly targeting AST coordinate spans.
    * Graceful fallback (`EditorUnavailableState`) if Monaco Web Worker fails to load.

---

## Part 2: Exhaustive Interactive Control Inventory

The following table catalogs every interactive control, clickable surface, filter, tab, dialog trigger, and keyboard interaction in the frontend application.

| Control Identifier / Label | Component / File Location | User Trigger / Gesture | Target State / Handler | Visual Feedback & Result | Keyboard & Accessibility Support | Disabled States & Edge Cases |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Product Logo & Title** | `Navbar.tsx`<br>`src/viewer/components/Navbar.tsx` | Click | Navigates / resets view | Focus ring, cursor pointer, resets active scenario to default | Tab-focusable, `role="banner"` child, `Enter` / `Space` | None |
| **Guide Toggle Button** | `Navbar.tsx`<br>`src/viewer/components/Navbar.tsx` | Click | `setIsGuideOpen((v) => !v)` | Toggles `ReportReadingGuide` visibility; button changes active state | `aria-expanded={isGuideOpen}`, `aria-controls="reading-guide"`, keyboard accessible | Disabled if no report loaded |
| **Import JSON Button** | `Navbar.tsx`<br>`src/viewer/components/Navbar.tsx` | Click | `setIsLoaderOpen(true)` | Opens `ReportLoader` modal dialog with backdrop overlay | `aria-haspopup="dialog"`, `aria-label="Import JSON report"`, keyboard focus trap | None |
| **Scenario Switcher Select** | `Navbar.tsx`<br>`src/viewer/components/Navbar.tsx` | Select change / click option | `onSelectScenario(id)` | Ingests selected scenario fixture; updates URL/state; syncs all tabs | `<select>` standard keyboard navigation (`ArrowUp`/`ArrowDown`/`Enter`) | Disabled while loading |
| **Executive Strip Guide Button** | `ExecutiveSummaryStrip.tsx`<br>`src/viewer/components/` | Click | `onOpenGuide()` | Opens `ReportReadingGuide` | `aria-label="Open report interpretation guide"`, `Tab` focusable | Disabled if guide already open |
| **Workspace Navigation Tabs** (6 Tabs: Timeline, Graph, Code Changes, Test Changes, Matrix, Findings) | `ConsoleLayout.tsx`<br>`src/viewer/layouts/` | Click tab / Arrow keys | `setActiveTab(tabId)` | Switches primary viewport tab; updates bottom active pill/indicator; reveals tabpanel | `role="tablist"`, `role="tab"`, `aria-selected="true"`, `aria-controls`, `ArrowLeft`/`ArrowRight` tab switching | Tab disabled if data category empty |
| **Timeline Category Filter** | `ChangeTimeline.tsx`<br>`src/viewer/components/` | Click pill / checkbox | `setSelectedCategory(cat)` | Filters visible timeline nodes to selected AST category | `aria-pressed`, keyboard focusable | Shows "(0)" count if no items match |
| **Timeline Correlation Filter** | `ChangeTimeline.tsx`<br>`src/viewer/components/` | Click pill | `setSelectedCorrelation(status)` | Filters timeline nodes to selected correlation status (`STRONG`, etc.) | `aria-pressed`, keyboard focusable | Reset button appears when filter active |
| **Timeline Node Card** | `ChangeTimeline.tsx`<br>`src/viewer/components/` | Click card surface | `onSelectChange(id)` | Sets active selection; opens `DetailInspector`; scrolls Monaco to AST coordinate | `role="button"`, `tabIndex={0}`, `Enter`/`Space` activates | Unselected nodes dim slightly |
| **Timeline Expand All Button** | `ChangeTimeline.tsx`<br>`src/viewer/components/` | Click | `setAllExpanded(!allExpanded)` | Expands/collapses all timeline revision cards | `aria-expanded`, keyboard accessible | None |
| **Graph Mode Toggle** (Visual Graph vs Accessible Table) | `CorrelationGraph.tsx`<br>`src/viewer/components/` | Click toggle button | `setViewMode('graph' \| 'table')` | Switches between React Flow visual canvas and accessible HTML table view | `role="tablist"` or `role="switch"`, `aria-checked` | None |
| **Graph Fit View Button** | `CorrelationGraph.tsx`<br>`src/viewer/components/` | Click icon button | React Flow `fitView({ padding: 0.2 })` | Re-centers and scales the graph canvas to fit all nodes | `aria-label="Fit graph to viewport"`, keyboard focusable | Disabled if canvas has no nodes |
| **Graph Zoom In / Out** | `CorrelationGraph.tsx`<br>`src/viewer/components/` | Click `+` or `-` buttons | React Flow `zoomIn()`, `zoomOut()` | Smoothly zooms graph viewport in/out | `aria-label="Zoom in"`, `aria-label="Zoom out"` | Reaches zoom boundary limits (min 0.2, max 2.0) |
| **Graph Minimap** | `CorrelationGraph.tsx`<br>`src/viewer/components/` | Click/drag on minimap | React Flow pan/zoom | Pans main viewport to clicked coordinate in minimap | Non-keyboard interactive canvas (accessible view provided as alternative) | Hidden on narrow viewports |
| **Graph Legend Toggle** | `GraphLegend.tsx`<br>`src/viewer/components/graph/` | Click legend header | `setIsLegendExpanded((v) => !v)` | Expands/collapses legend overlay explaining node/edge colors | `aria-expanded`, `aria-label="Toggle graph legend"` | None |
| **Graph Structural Node** | `CustomNodes.tsx`<br>`src/viewer/components/graph/` | Click node | `onSelectChange(id)` | Highlights node; selects change; opens Detail Inspector; highlights connected edges | `role="button"`, `tabIndex={0}`, keyboard `Enter` selection supported | Disabled/dimmed when non-matching filter active |
| **Graph Test Node** | `CustomNodes.tsx`<br>`src/viewer/components/graph/` | Click node | `onSelectTestChange(id)` | Highlights test node; selects companion test; opens Inspector test tab | `role="button"`, `tabIndex={0}`, keyboard `Enter` selection supported | Disabled/dimmed when non-matching filter active |
| **Graph Correlation Edge** | `CustomEdges.tsx`<br>`src/viewer/components/graph/` | Click edge badge/path | `onSelectCorrelation(id)` | Highlights edge; sets active correlation in state and Detail Inspector | Click target enlarged via invisible buffer line | Non-keyboard focusable by default (synced with accessible table view) |
| **Graph Selection Dismiss** | `CorrelationGraph.tsx`<br>`src/viewer/components/` | Click "Clear Selection" / Escape | `onClearSelection()` | Clears active node/edge highlight; deselects inspector item | `aria-label="Clear selection"`, keyboard `Escape` handler | Hidden when nothing selected |
| **Structural Change Card** | `StructuralChangeExplorer.tsx`<br>`src/viewer/components/` | Click card / row | `onSelectChange(id)` | Sets active change; displays AST metadata, diff preview, and line jumps | `role="button"`, `tabIndex={0}`, `Enter`/`Space` | Border highlights on selected card |
| **Structural Category Pill Filter** | `StructuralChangeExplorer.tsx`<br>`src/viewer/components/` | Click category badge | `setActiveCategory(cat)` | Filters list to matching AST categories | `role="radio"`, `aria-checked`, keyboard focusable | Pill shows (0) if none match |
| **Test Suite Card / Row** | `TestChangesInspector.tsx`<br>`src/viewer/components/` | Click test item | `onSelectTestChange(id)` | Displays assertions, call counts, and associated companion test code | `role="button"`, `tabIndex={0}`, `Enter`/`Space` | Selected row displays accent indicator |
| **Assertion Filter Tabs** | `TestChangesInspector.tsx`<br>`src/viewer/components/` | Click tab | `setAssertionFilter(type)` | Filters assertion list by `ADDED`, `MODIFIED`, `REMOVED` | `role="tab"`, `aria-selected` | Badge counter shows 0 if none |
| **Correlation Matrix Row** | `CorrelationMatrixTable.tsx`<br>`src/viewer/components/` | Click matrix row | `onSelectCorrelation(id)` | Highlights matrix cell and opens unified inspector comparison | `role="row"`, `tabIndex={0}`, `Enter`/`Space` | Hover row highlight |
| **Matrix Status Filter** | `CorrelationMatrixTable.tsx`<br>`src/viewer/components/` | Click status pill | `setStatusFilter(status)` | Filters matrix rows to `STRONG`, `WEAK`, `NONE`, or `UNCERTAIN` | `aria-pressed`, keyboard accessible | Reset button displayed when active |
| **Finding Card / Expansion** | `FindingsSummary.tsx`<br>`src/viewer/components/` | Click disclosure trigger | `toggleFindingExpanded(id)` | Expands finding card to reveal observations, epistemic unknowns, and recommendations | `role="button"`, `aria-expanded`, `Enter`/`Space` | Critical findings styled with distinct alert border |
| **Finding Select Action** | `FindingsSummary.tsx`<br>`src/viewer/components/` | Click "Inspect Evidence" | `onSelectFinding(id)` | Switches tab to Code Changes/Graph and selects linked structural change | `role="link"`, keyboard accessible | Disabled if no direct evidence items linked |
| **Detail Inspector Mode Switcher** (Overview, Diff, Tests, Evidence) | `DetailInspector.tsx`<br>`src/viewer/components/` | Click sub-tab | `setInspectorTab(tabId)` | Switches inspector panel content between overview, Monaco diff, test details, and evidence list | `role="tablist"`, `role="tab"`, `aria-selected` | None |
| **Monaco View Mode Switch** | `CodeComparisonToolbar.tsx`<br>`src/viewer/components/` | Click toggle (Diff vs Single) | `setViewMode('diff' \| 'single')` | Toggles Monaco between side-by-side diff editor and single revision view | `aria-label="Toggle diff view"`, keyboard focusable | Disabled if file content unavailable |
| **Monaco Revision Toggle** | `CodeComparisonToolbar.tsx`<br>`src/viewer/components/` | Click 'From' / 'To' pill | `setActiveRevision('from' \| 'to')` | Switches active file displayed in single-view Monaco editor | `role="radio"`, `aria-checked` | Only active in single-editor mode |
| **Monaco Line Jump Button** | `DetailInspector.tsx`<br>`src/viewer/components/` | Click line coordinate chip (e.g. `L42-L58`) | Monaco `revealLineInCenter(line)` | Scrolls Monaco editor to exact AST coordinate and highlights lines | `aria-label="Jump to line in editor"`, keyboard focusable | Disabled if line number is null |
| **Copy Code / Snippet Button** | `CodeComparisonToolbar.tsx`<br>`src/viewer/components/` | Click copy icon | Clipboard API `writeText(code)` | Copies code snippet to system clipboard; shows checkmark tooltip | `aria-label="Copy snippet"`, keyboard accessible | Clipboard permission fallback |
| **Copy Diff Unified Button** | `CodeComparisonToolbar.tsx`<br>`src/viewer/components/` | Click copy diff icon | Clipboard API `writeText(diff)` | Copies unified diff format to clipboard | `aria-label="Copy diff"`, keyboard accessible | None |
| **Close Detail Inspector** | `DetailInspector.tsx`<br>`src/viewer/components/` | Click 'X' / Escape | `onCloseInspector()` | Collapses side drawer/bottom drawer inspector | `aria-label="Close inspector panel"`, `Escape` key | None |
| **Report Loader Drop Zone** | `ReportLoader.tsx`<br>`src/viewer/components/` | Drag & drop JSON file | File API `readAsText()` | Ingests dropped `.json` file; validates schema; updates state | Drop zone announces drag-over states | Rejects non-JSON MIME types with error alert |
| **Report Loader File Input** | `ReportLoader.tsx`<br>`src/viewer/components/` | Click browse / upload | Native `<input type="file">` | Opens native file dialog; reads file contents | Native file picker keyboard support | Rejects invalid schema with validation errors |
| **Report Loader Demo Buttons** (Scenarios A through F) | `ReportLoader.tsx`<br>`src/viewer/components/` | Click scenario badge | Ingests demo fixture directly | Loads scenario fixture; closes dialog; sets scenario state | `role="button"`, keyboard focusable | Current active scenario highlighted |
| **Report Loader Paste Input** | `ReportLoader.tsx`<br>`src/viewer/components/` | Paste JSON string / Type | Textarea `onChange` | Updates raw JSON input state; shows live character/syntax status | Standard textarea keyboard behavior | Syntax errors highlighted in real time |
| **Report Loader Validate Button** | `ReportLoader.tsx`<br>`src/viewer/components/` | Click "Validate & Ingest" | Zod parser `AnalysisReportSchema.safeParse()` | Validates JSON against schema; updates active report if valid; displays error list if invalid | `role="button"`, `Enter` triggers | Disabled if textarea is empty |
| **Report Loader Cancel / Close** | `ReportLoader.tsx`<br>`src/viewer/components/` | Click Close / Backdrop / `Escape` | `onClose()` | Dismisses modal dialog without modifying existing report state | Focus trap, `aria-modal="true"`, `Escape` listener | None |
| **Guide Dismiss Button** | `ReportReadingGuide.tsx`<br>`src/viewer/components/` | Click "Dismiss" / Close | `onClose()` | Dismisses the guide banner/modal; stores preference | `aria-label="Dismiss guide"`, keyboard accessible | None |
| **Guide Question Disclosures** (3 Accordions) | `ReportReadingGuide.tsx`<br>`src/viewer/components/` | Click header | Toggles question accordion open/closed | Expands/collapses explanatory copy for the selected question | `aria-expanded`, `aria-controls`, `Enter`/`Space` | Smooth accordion animation |
| **Guide Glossary Toggle** | `ReportReadingGuide.tsx`<br>`src/viewer/components/` | Click glossary pill | Toggles glossary open/closed | Reveals table of epistemic statuses (`STRONG`, `WEAK`, etc.) | `aria-expanded`, keyboard accessible | None |

---

## Part 3: Selection Synchronization Matrix

This matrix documents the reactive relationship between selecting an entity in one control and the corresponding state updates across all other visible surfaces.

| Primary Selection Trigger | Active State Field Updated | Timeline View Reaction | Correlation Graph Reaction | Code Changes View Reaction | Test Changes View Reaction | Correlation Matrix Reaction | Findings View Reaction | Detail Inspector / Monaco Reaction |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Select Structural Change Card** | `selectedChangeId` | Highlights change node; scrolls into view | Highlights matching `structuralNode`; pulses border; dims unrelated nodes | Highlights selected card; scrolls to element | Highlights tests associated with this change | Highlights matrix rows corresponding to this change ID | Dims findings not mentioning this change | Opens inspector; displays AST diff in Monaco; scrolls to line span |
| **Select Test Change Row** | `selectedTestChangeId` | Highlights matching test update card | Highlights matching `testNode`; dims unrelated nodes | Dims non-associated code changes | Highlights test row; reveals assertion diffs | Highlights matrix rows corresponding to this test change | Dims findings not mentioning this test suite | Opens inspector on Test tab; displays test file AST in Monaco |
| **Select Correlation Edge / Row** | `selectedCorrelationId` | Highlights paired mutation and test cards | Highlights connecting edge; highlights both source and target nodes | Highlights source structural change card | Highlights target test change row | Selects and highlights matrix cell | Filters to findings linked to this correlation | Opens inspector showing dual comparison of code change vs test assertion |
| **Select Finding Card** | `selectedFindingId` | Highlights mutations referenced in finding | Highlights all nodes referenced in finding | Highlights first structural change referenced | Highlights first test change referenced | Highlights matrix rows corresponding to finding | Expands finding card; displays badge | Opens inspector with epistemic unknowns and reasoning observations |
| **Clear Selection Action** | All `selected*Id` set to `null` | Resets all nodes to default opacity | Deselects nodes/edges; returns canvas to neutral state | Resets all cards to default neutral state | Resets all rows to default neutral state | Clears cell highlight in matrix | Collapses finding focus | Closes inspector panel (or returns to idle overview) |

---

## Part 4: Responsive Breakpoint & Viewport Behavior

* **Desktop Viewport (`>= 1280px`):**
  * Console layout uses a dual-pane split: primary workspace (tabs) on the left/center (60-70% width), `DetailInspector` persistent on the right (30-40% width).
  * Correlation graph displays canvas with side minimap and legend overlay simultaneously.
  * Executive summary displays all metric cards in a single horizontal row.
* **Tablet Viewport (`768px - 1279px`):**
  * Console layout stacks `DetailInspector` below the primary workspace or opens it as a slide-over drawer upon selection.
  * Executive summary stacks into a 2x3 grid of metric cards.
  * Graph minimap auto-collapses to conserve canvas touch area.
* **Mobile Viewport (`< 768px`):**
  * Workspace navigation switches to a horizontal scrollable tab strip with touch gestures.
  * Header collapses scenario select and actions into a stacked stack.
  * `DetailInspector` opens as a full-screen modal overlay with explicit back/close buttons.
  * Correlation graph presents a prompt recommending the `Accessible View (Table)` mode for optimal touch interaction.

