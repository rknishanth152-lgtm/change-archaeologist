# Frontend Component Catalog

**Change Archaeologist** &bull; Independent LLM Frontend Redesign Context  
**Repository:** `E:\change-archaeologist`  
**Document:** `Docs/llm-handoff/FRONTEND_COMPONENT_CATALOG.md`  
**Purpose:** Comprehensive architectural inventory of all frontend components, props interfaces, state ownership, dependencies, and retrieved UI primitives.

---

## Part 1: External Dependencies & UI Library Versions

The frontend operates in a client-side Vite/React 19 environment. Below are the exact installed versions from `package.json`:

| Package | Version | Purpose & Usage in Codebase |
| :--- | :--- | :--- |
| **`react`** | `^19.3.1` | Core UI library. Uses standard hooks (`useState`, `useCallback`, `useMemo`, `useRef`, `useEffect`, `useId`). |
| **`react-dom`** | `^19.3.1` | DOM renderer and modal portal support. |
| **`@xyflow/react`** | `^12.12.1` | React Flow v12 canvas engine for 2D directed Correlation Graph. |
| **`motion`** | `^14.9.1` | Motion (Framer Motion v12+) animation engine for disclosure accordions, staggered entrance, and layout transitions. |
| **`@monaco-editor/react`** | `^4.7.0` | React wrapper for Microsoft Monaco Editor. Powers side-by-side AST diff viewer and single-file inspector. |
| **`monaco-editor`** | `^0.57.0` | Core Monaco Editor engine and language tokenizers. |
| **`lucide-react`** | `^1.68.0` | Icon system (monochrome SVG glyphs: arrows, chevrons, copy, check, alert, info, zoom, compass, eye, layers). |
| **`clsx`** | `^2.1.1` | Conditional class utility. |
| **`tailwind-merge`** | `^3.7.0` | Conflict-resolving Tailwind class merger via `src/viewer/utils/cn.ts`. |
| **`tailwindcss`** | `^3.4.19` | Utility-first CSS engine configured with custom design tokens in `tailwind.config.js`. |
| **`ts-morph`** | `^24.0.0` | AST parsing and manipulation (used primarily in core analysis engine). |

---

## Part 2: Retrieved UI Primitives (`src/viewer/components/ui/`)

These primitives were adapted from established UI component registries to provide accessible, tactile micro-interactions without third-party design drift.

### 1. `Badge` (`src/viewer/components/ui/Badge.tsx`)
* **Upstream Origin:** Retrieved from `https://ui.shadcn.com/r/styles/default/badge.json` and `https://originui.com/badges`.
* **Purpose:** Semantic status badges and micro-metric indicators for epistemic statuses, categories, and entities.
* **Interface:**
  ```typescript
  export type BadgeVariant = "terracotta" | "verdigris" | "sandstone" | "amber" | "ink" | "outline";
  export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    variant?: BadgeVariant;
    dot?: boolean; // Static, non-pulsing status dot to avoid false implications of live runtime activity
  }
  ```
* **Active Usage Sites in Production Screens:**
  1. `Navbar.tsx`: Analysis status badge (`ANALYZED`, `COMPLETE`).
  2. `ExecutiveSummaryStrip.tsx`: Mutation counts, test counts, findings counts, correlation status distribution.
  3. `StructuralChangeExplorer.tsx`: AST mutation category chips (`SIGNATURE`, `CONTROL_FLOW`, etc.).
  4. `TestChangesInspector.tsx`: Test status badges (`ADDED`, `MODIFIED`) and assertion category pills.
  5. `CorrelationMatrixTable.tsx`: Correlation classification badges (`STRONG`, `WEAK`, `NONE`, `UNCERTAIN`).
  6. `FindingsSummary.tsx`: Attention level badges (`CRITICAL`, `ELEVATED`, `STANDARD`, `INFORMATIONAL`).
  7. `DetailInspector.tsx`: Entity status indicators and coordinate pills.
* **Accessibility:** Native inline element with readable foreground/background contrast compliant with WCAG 2.2 AA.
* **Tests:** `tests/unit/viewer/retrieved-components.test.tsx`.

### 2. `TactileButton` (`src/viewer/components/ui/TactileButton.tsx`)
* **Upstream Origin:** Retrieved from `https://buttons.ibelick.com/`.
* **Purpose:** Physical tactile button with subtle active compression (`active:scale-[0.98]`), micro-highlight shadows, and terracotta focus rings.
* **Interface:**
  ```typescript
  export type ButtonVariant = "primary" | "secondary" | "ghost" | "outline";
  export type ButtonSize = "xs" | "sm" | "md";
  export interface TactileButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    icon?: React.ReactNode;
  }
  ```
* **Active Usage Sites in Production Screens:**
  1. `Navbar.tsx`: "How to Read Guide" toggle button, "Import JSON" modal button.
  2. `ExecutiveSummaryStrip.tsx`: Reading guide contextual link.
  3. `CodeComparisonToolbar.tsx`: Monaco mode toggles (Diff vs Single), revision switcher buttons, Copy Code button.
  4. `ReportLoader.tsx`: "Browse Files" button, "Validate & Ingest" primary button, demo scenario preset chips.
  5. `ReportReadingGuide.tsx`: Guide dismiss button, "Open Full Report" action.
* **Accessibility:** Explicit focus rings (`focus-visible:ring-2 focus-visible:ring-border-focus`), standard keyboard activation (`Enter`, `Space`), `motion-safe:` protection.
* **Tests:** `tests/unit/viewer/retrieved-components.test.tsx`.

### 3. `Disclosure` (`src/viewer/components/ui/Disclosure.tsx`)
* **Upstream Origin:** Retrieved from `https://motion-primitives.com/c/disclosure.json`.
* **Purpose:** Accessible animated collapsible disclosure container using Motion with height measurement and zero-height collapse.
* **Interface:**
  ```typescript
  export interface DisclosureProps {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    children: React.ReactNode;
    className?: string;
  }
  // Subcomponents: DisclosureProvider, DisclosureTrigger, DisclosureContent
  ```
* **Active Usage Sites in Production Screens:**
  1. `ReportReadingGuide.tsx`: Powers the 3 newcomer comprehension question accordions ("What changed?", "What do tests tell us?", "What is unknown?") and the Epistemic Glossary.
  2. `FindingsSummary.tsx`: Powers the expandable finding cards revealing detailed observations, unknown limits, and suggested review actions.
* **Accessibility:** Automatically links `aria-expanded` and `aria-controls` with unique deterministic React IDs. Uses native `<button>` controls so keyboard events are handled correctly without duplicate triggering. Automatically disables motion when `prefers-reduced-motion` is active.
* **Tests:** `tests/unit/viewer/retrieved-components.test.tsx`.

### 4. `Accordion` (`src/viewer/components/ui/Accordion.tsx`)
* **Upstream Origin:** Retrieved from `https://ui.shadcn.com/r/styles/default/accordion.json` combined with Motion Disclosure.
* **Purpose:** Multi-item stacked accordion with divided hairline borders and rotating chevron indicators.
* **Interface:**
  ```typescript
  export interface AccordionProps { children: React.ReactNode; className?: string; }
  export interface AccordionItemProps { defaultOpen?: boolean; open?: boolean; onOpenChange?: (open: boolean) => void; children: React.ReactNode; }
  // Subcomponents: AccordionItem, AccordionTrigger, AccordionContent
  ```
* **Current Status in Repository:** Fully implemented and thoroughly verified via unit tests (`tests/unit/viewer/retrieved-components.test.tsx`). The production reading guide and findings currently use `Disclosure` directly for custom container styling. `Accordion` is available as a verified primitive for the redesign.
* **Accessibility:** WAI-ARIA accordion pattern with keyboard navigation.

### 5. `AnimatedGroup` (`src/viewer/components/ui/AnimatedGroup.tsx`)
* **Upstream Origin:** Retrieved from `https://motion-primitives.com/c/animated-group.json`.
* **Purpose:** Staggered child entrance animation container for card grids, lists, and summary metrics.
* **Interface:**
  ```typescript
  export type PresetType = "fade" | "slide" | "scale";
  export interface AnimatedGroupProps {
    children: React.ReactNode;
    className?: string;
    preset?: PresetType;
    stagger?: number;
  }
  ```
* **Active Usage Sites in Production Screens:**
  1. `ExecutiveSummaryStrip.tsx`: Animates initial entrance of executive summary metric cards.
* **Accessibility:** Evaluates `useReducedMotion()`. If reduced motion is preferred, transitions duration to 0 and executes without movement.
* **Tests:** `tests/unit/viewer/retrieved-components.test.tsx`.

---

## Part 3: Complete Viewer Component Catalog (`src/viewer/`)

### Application Shell & Controller

#### `ViewerPage.tsx` (`src/viewer/pages/ViewerPage.tsx`)
* **Role:** Root application controller and sole state owner for the entire report viewer.
* **Internal State:**
  * `report: AnalysisReport` (Active report data, initialized from Scenario A).
  * `activeScenarioId: string` (Current scenario identifier: `"scenario-a"` through `"scenario-f"` or `"custom"`).
  * `activeTab: WorkspaceTabId` (`"timeline" | "graph" | "changes" | "tests" | "matrix" | "findings"`).
  * `selectedChangeId: string | null` (Active AST structural change).
  * `selectedTestChangeId: string | null` (Active companion test declaration).
  * `selectedCorrelationId: string | null` (Active correlation edge/pair).
  * `selectedFindingId: string | null` (Active finding card).
  * `selectedEvidenceId: string | null` (Active evidence item).
  * `isLoaderOpen: boolean` (Controls `ReportLoader` modal).
  * `isGuideOpen: boolean` (Controls `ReportReadingGuide` visibility).
* **Callbacks Provided to Children:**
  * `handleSelectScenario(scenarioId: string)`: Ingests fixture, resets selection state.
  * `handleReportLoaded(newReport: AnalysisReport)`: Validates and loads imported JSON report.
  * `handleSelectChange(id: string | null)`: Synchronizes change selection.
  * `handleSelectTestChange(id: string | null)`: Synchronizes test selection.
  * `handleSelectCorrelation(id: string | null)`: Synchronizes correlation selection.
  * `handleSelectFinding(id: string | null)`: Synchronizes finding selection.
  * `handleClearSelection()`: Resets all active selection IDs to null.
* **Consumers:** `App.tsx`.
* **Tests:** `tests/unit/viewer/viewer-components.test.tsx`, `tests/unit/viewer/accessibility.test.tsx`.

#### `ConsoleLayout.tsx` (`src/viewer/layouts/ConsoleLayout.tsx`)
* **Role:** Master structural layout wrapper. Renders the application header, executive summary strip, tabbed navigation bar, primary workspace viewport, and persistent/collapsible `DetailInspector`.
* **Props:**
  ```typescript
  export interface ConsoleLayoutProps {
    report: AnalysisReport;
    activeTab: WorkspaceTabId;
    onTabChange: (tab: WorkspaceTabId) => void;
    navbar: React.ReactNode;
    summaryStrip: React.ReactNode;
    readingGuide: React.ReactNode;
    detailInspector: React.ReactNode;
    hasSelection: boolean;
    children: React.ReactNode;
  }
  ```
* **Layout Mechanics:** Flexbox column container (`min-h-screen bg-ground text-text-primary`). Desktop layout splits main area into `flex-1` workspace and `w-96` / `w-[420px]` detail inspector drawer. Mobile stacks vertically.
* **Consumers:** `ViewerPage.tsx`.
* **Tests:** `tests/unit/viewer/navbar-layout.test.tsx`, `tests/unit/viewer/accessibility.test.tsx`.

#### `Navbar.tsx` (`src/viewer/components/Navbar.tsx`)
* **Role:** Dual-tier application navigation and context header.
* **Props:**
  ```typescript
  export interface NavbarProps {
    report: AnalysisReport;
    activeScenarioId: string;
    onSelectScenario: (id: string) => void;
    onOpenLoader: () => void;
    isGuideOpen: boolean;
    onToggleGuide: () => void;
  }
  ```
* **Render Structure:**
  * **Level 1 (Top Bar):** Brand mark (`Compass` icon), title `"CHANGE ARCHAEOLOGIST"`, subtitle `"Evidence Atlas"`, `"How to Read Guide"` tactile button, and `"Import JSON"` tactile button.
  * **Level 2 (Context Sub-bar):** Target function name pill, commit span pill (`from` &rarr; `to`), analysis status badge (`ANALYZED`), and scenario select dropdown.
* **Accessibility:** Uses `<header role="banner">`, native accessible `<select>`, tab-focusable buttons with explicit `aria-label` and `aria-expanded`.
* **Consumers:** `ViewerPage.tsx`.
* **Tests:** `tests/unit/viewer/navbar-layout.test.tsx`.

#### `ExecutiveSummaryStrip.tsx` (`src/viewer/components/ExecutiveSummaryStrip.tsx`)
* **Role:** High-level metrics ribbon displaying key indicators and static-analysis guardrail notices.
* **Props:**
  ```typescript
  export interface ExecutiveSummaryStripProps {
    report: AnalysisReport;
    onOpenGuide: () => void;
  }
  ```
* **Render Structure:**
  * Target function and commit span pill.
  * Structural change count badge (terracotta).
  * Companion test change count badge (verdigris).
  * Correlation status distribution (Strong, Weak, None, Uncertain).
  * Findings count badge with attention level indicator.
  * Epistemic guardrail notice ("Static AST analysis &bull; No code executed &bull; Companion tests are not runtime coverage").
* **Consumers:** `ViewerPage.tsx`.
* **Tests:** `tests/unit/viewer/navbar-layout.test.tsx`, `tests/unit/viewer/retrieved-components.test.tsx`.

---

### Workspace Tab Components

#### `ChangeTimeline.tsx` (`src/viewer/components/ChangeTimeline.tsx`)
* **Role:** Chronological visualization of structural changes and test modifications across commits and AST categories.
* **Props:**
  ```typescript
  export interface ChangeTimelineProps {
    report: AnalysisReport;
    selectedChangeId: string | null;
    selectedTestChangeId: string | null;
    onSelectChange: (id: string | null) => void;
    onSelectTestChange: (id: string | null) => void;
  }
  ```
* **Features:** Category filtering pills, correlation status filtering pills, expand/collapse all revisions, interactive change cards with line numbers and diff preview snippets.
* **Consumers:** `ViewerPage.tsx`.
* **Tests:** `tests/unit/viewer/change-timeline.test.tsx`, `tests/unit/viewer/timeline-model.test.ts`.

#### `CorrelationGraph.tsx` (`src/viewer/components/CorrelationGraph.tsx`)
* **Role:** 2D directed graph representing structural AST mutations linked to companion test declarations.
* **Props:**
  ```typescript
  export interface CorrelationGraphProps {
    report: AnalysisReport;
    selectedChangeId: string | null;
    selectedTestChangeId: string | null;
    selectedCorrelationId: string | null;
    onSelectChange: (id: string | null) => void;
    onSelectTestChange: (id: string | null) => void;
    onSelectCorrelation: (id: string | null) => void;
    onClearSelection: () => void;
  }
  ```
* **Engine:** Powered by `@xyflow/react`.
* **Internal Features:**
  * View mode toggle: Visual Graph vs `GraphAccessibleView` (HTML table/tree).
  * Automated layered dagre-style coordinate calculation (`buildCorrelationGraphModel` in `graph-model.ts`).
  * Custom node renderers (`structuralNode`, `testNode`).
  * Custom edge renderer (`correlationEdge`).
  * MiniMap and floating controls (Fit View, Zoom In, Zoom Out).
  * Expandable `GraphLegend` overlay.
* **Consumers:** `ViewerPage.tsx`.
* **Tests:** `tests/unit/viewer/correlation-graph.test.tsx`, `tests/unit/viewer/graph-model.test.ts`.

#### `GraphAccessibleView.tsx` (`src/viewer/components/graph/GraphAccessibleView.tsx`)
* **Role:** Pure HTML table and semantic list view representing the complete graph model for screen readers and keyboard-only navigation.
* **Props:**
  ```typescript
  export interface GraphAccessibleViewProps {
    nodes: GraphNode[];
    edges: GraphEdge[];
    selectedNodeId: string | null;
    selectedEdgeId: string | null;
    onSelectNode: (id: string) => void;
    onSelectEdge: (id: string) => void;
  }
  ```
* **Consumers:** `CorrelationGraph.tsx`.
* **Tests:** `tests/unit/viewer/accessibility.test.tsx`, `tests/unit/viewer/correlation-graph.test.tsx`.

#### `StructuralChangeExplorer.tsx` (`src/viewer/components/StructuralChangeExplorer.tsx`)
* **Role:** Granular catalog of all detected AST structural changes.
* **Props:**
  ```typescript
  export interface StructuralChangeExplorerProps {
    changes: StructuralChange[];
    selectedChangeId: string | null;
    onSelectChange: (id: string | null) => void;
  }
  ```
* **Features:** Category filtering pills, AST coordinate chips (line/column/statement index), syntax diff snippets, correlation linkage indicator.
* **Consumers:** `ViewerPage.tsx`.
* **Tests:** `tests/unit/viewer/viewer-components.test.tsx`.

#### `TestChangesInspector.tsx` (`src/viewer/components/TestChangesInspector.tsx`)
* **Role:** Companion test suite analyzer displaying test declarations, assertion diffs, and direct invocation counts.
* **Props:**
  ```typescript
  export interface TestChangesInspectorProps {
    testChanges: TestChange[];
    selectedTestChangeId: string | null;
    onSelectTestChange: (id: string | null) => void;
  }
  ```
* **Features:** Filter by assertion change type (`ADDED`, `MODIFIED`, `REMOVED`), assertion detail expanders, direct invocation verification indicator.
* **Consumers:** `ViewerPage.tsx`.
* **Tests:** `tests/unit/viewer/viewer-components.test.tsx`.

#### `CorrelationMatrixTable.tsx` (`src/viewer/components/CorrelationMatrixTable.tsx`)
* **Role:** Tabular matrix cross-referencing structural AST mutations with companion test declarations.
* **Props:**
  ```typescript
  export interface CorrelationMatrixTableProps {
    correlations: CorrelationResult[];
    selectedCorrelationId: string | null;
    onSelectCorrelation: (id: string | null) => void;
  }
  ```
* **Features:** Filter by correlation status (`STRONG`, `WEAK`, `NONE`, `UNCERTAIN`), classification explanations, direct selection synchronization.
* **Consumers:** `ViewerPage.tsx`.
* **Tests:** `tests/unit/viewer/viewer-components.test.tsx`.

#### `FindingsSummary.tsx` (`src/viewer/components/FindingsSummary.tsx`)
* **Role:** Synthesis of analytical findings, observational evidence, review risks, and epistemic unknowns.
* **Props:**
  ```typescript
  export interface FindingsSummaryProps {
    findings: Finding[];
    selectedFindingId: string | null;
    onSelectFinding: (id: string | null) => void;
  }
  ```
* **Features:** Attention level badges (`CRITICAL`, `ELEVATED`, `STANDARD`, `INFORMATIONAL`), expandable disclosures for observations and unknowns, "Inspect Evidence" quick action link.
* **Consumers:** `ViewerPage.tsx`.
* **Tests:** `tests/unit/viewer/viewer-components.test.tsx`.

---

### Detail Inspector & Code Comparison

#### `DetailInspector.tsx` (`src/viewer/components/DetailInspector.tsx`)
* **Role:** Multi-tab drawer inspecting selected AST mutation, companion test, or correlation.
* **Props:**
  ```typescript
  export interface DetailInspectorProps {
    report: AnalysisReport;
    selectedChangeId: string | null;
    selectedTestChangeId: string | null;
    selectedCorrelationId: string | null;
    selectedFindingId: string | null;
    onClose: () => void;
  }
  ```
* **Sub-tabs:** Overview, Monaco Code Diff, Companion Test Details, Verifiable Evidence List.
* **Consumers:** `ViewerPage.tsx` / `ConsoleLayout.tsx`.
* **Tests:** `tests/unit/viewer/viewer-components.test.tsx`, `tests/unit/viewer/code-comparison.test.tsx`.

#### `CodeComparison.tsx` (`src/viewer/components/CodeComparison.tsx`)
* **Role:** Embedded Monaco Editor wrapper providing side-by-side AST diff viewer and single-file viewer.
* **Props:**
  ```typescript
  export interface CodeComparisonProps {
    originalCode: string;
    modifiedCode: string;
    originalLabel?: string;
    modifiedLabel?: string;
    language?: string;
    highlightLines?: { from?: number[]; to?: number[] };
  }
  ```
* **Fallback:** Renders `EditorUnavailableState` if Monaco Web Worker fails to load.
* **Consumers:** `DetailInspector.tsx`.
* **Tests:** `tests/unit/viewer/code-comparison.test.tsx`.

#### `CodeComparisonToolbar.tsx` (`src/viewer/components/CodeComparisonToolbar.tsx`)
* **Role:** Utility toolbar above Monaco editor for toggling diff vs single view, toggling revisions, and copying code or unified diff.
* **Consumers:** `CodeComparison.tsx`.
* **Tests:** `tests/unit/viewer/code-comparison.test.tsx`.

#### `EditorUnavailableState.tsx` (`src/viewer/components/EditorUnavailableState.tsx`)
* **Role:** Accessible static fallback component displaying formatted code in `<pre><code>` blocks when Monaco is unavailable.
* **Consumers:** `CodeComparison.tsx`.
* **Tests:** `tests/unit/viewer/code-comparison.test.tsx`.

---

### Dialogs, Guides & Modals

#### `ReportLoader.tsx` (`src/viewer/components/ReportLoader.tsx`)
* **Role:** Modal dialog for loading analysis reports.
* **Props:**
  ```typescript
  export interface ReportLoaderProps {
    isOpen: boolean;
    onClose: () => void;
    onReportLoaded: (report: AnalysisReport) => void;
    onSelectScenario: (scenarioId: string) => void;
  }
  ```
* **Mechanisms:** Drag-and-drop file dropzone, file input button, raw JSON paste textarea with real-time Zod schema validation, demo scenario quick-switch pills.
* **Consumers:** `ViewerPage.tsx`.
* **Tests:** `tests/unit/viewer/report-loader.test.ts`, `tests/unit/viewer/viewer-components.test.tsx`.

#### `ReportReadingGuide.tsx` (`src/viewer/components/ReportReadingGuide.tsx`)
* **Role:** Dismissible educational guide for newcomers and developers explaining how to interpret Change Archaeologist findings.
* **Props:**
  ```typescript
  export interface ReportReadingGuideProps {
    isOpen: boolean;
    onClose: () => void;
  }
  ```
* **Sections:**
  1. What changed? (AST structural mutations vs line diffs).
  2. What do tests tell us? (Verifiable call relationships vs dynamic execution).
  3. What is still unknown? (Inherent boundaries of static analysis).
  4. Epistemic Status Glossary (`STRONG`, `WEAK`, `NONE`, `UNCERTAIN`, `OBSERVED`, `INFERRED`, `UNKNOWN`).
* **Consumers:** `ViewerPage.tsx`.
* **Tests:** `tests/unit/viewer/report-reading-guide.test.tsx`.

#### `LimitationsBanner.tsx` (`src/viewer/components/LimitationsBanner.tsx`)
* **Role:** Static notice banner highlighting epistemic guardrails and preventing false assumptions of runtime code execution.
* **Consumers:** `FindingsSummary.tsx`, `ExecutiveSummaryStrip.tsx`.
* **Tests:** `tests/unit/viewer/viewer-components.test.tsx`.

---

## Part 4: Frontend Utility & Model Modules

| Module Path | Primary Exported Functions & Types | Responsibilities |
| :--- | :--- | :--- |
| `src/viewer/utils/cn.ts` | `cn(...inputs: ClassValue[]): string` | Merges class names safely using `clsx` and `tailwind-merge`. |
| `src/viewer/utils/graph-model.ts` | `buildCorrelationGraphModel(report)` | Transforms `AnalysisReport` into React Flow nodes and edges with layered layout coordinates. |
| `src/viewer/utils/timeline-model.ts` | `buildTimelineModel(report)` | Aggregates and chronologically orders AST changes and test events. |
| `src/viewer/utils/report-loader.ts` | `validateReportJson(jsonString)` | Parses and validates JSON report strings using Zod schema. |
| `src/viewer/utils/source-location.ts` | `formatSourceSpan()`, `parseSpan()` | Formats and parses file paths, line ranges, and column offsets. |
| `src/viewer/utils/explanation-helpers.ts`| `getStatusDescription()`, `getAttentionBadge()` | Provides consistent human-readable explanations for epistemic statuses. |

