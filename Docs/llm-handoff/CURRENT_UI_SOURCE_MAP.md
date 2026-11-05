# Current UI Source Map & Layout Reference

**Change Archaeologist** &bull; Independent LLM Frontend Redesign Context  
**Repository:** `E:\change-archaeologist`  
**Document:** `Docs/llm-handoff/CURRENT_UI_SOURCE_MAP.md`  
**Purpose:** Precise visual-to-code cross-reference mapping every visual screen region, layout container, and component boundary to exact TypeScript/React source files.

---

## Part 1: Visual Region to TSX Component Map

```
+===================================================================================================+
| REGION 1: Top Header Level 1 (Global Brand & Actions)                                             |
| [Compass] CHANGE ARCHAEOLOGIST  Evidence Atlas                [How to Read Guide]  [Import JSON]  |
| Source File: src/viewer/components/Navbar.tsx (Lines 20-65)                                      |
+---------------------------------------------------------------------------------------------------+
| REGION 2: Top Header Level 2 (Analysis Context & Filter)                                          |
| Target: verifyToken    Span: 3a1f8b..9c4d2e    Status: [ANALYZED]    Scenario: [Scenario A v]     |
| Source File: src/viewer/components/Navbar.tsx (Lines 66-125)                                     |
+===================================================================================================+
| REGION 3: Executive Summary Ribbon (Key Metrics & Guardrails)                                     |
| [Target Pill]  [Mutations: 3]  [Tests: 2]  [Correlations: 1 Strong 1 Weak]  [Findings: 2]        |
| Banner: "Static AST analysis • No code executed • Companion tests are not runtime coverage"       |
| Source File: src/viewer/components/ExecutiveSummaryStrip.tsx                                     |
+===================================================================================================+
| REGION 4: Workspace Navigation Tab Bar                                                            |
| [Timeline]  [Correlation Graph]  [Code Changes]  [Test Changes]  [Correlation Matrix]  [Findings] |
| Source File: src/viewer/layouts/ConsoleLayout.tsx (Lines 45-95)                                   |
+===================================================================================================+
|                                    MAIN CONTENT SPLIT                                             |
|-----------------------------------------------------------------+---------------------------------|
| REGION 5: Primary Workspace Viewport (Active Tab Content)       | REGION 6: Detail Inspector      |
|                                                                 | (Persistent / Collapsible)      |
| Tab 1: ChangeTimeline.tsx                                       | Source File:                    |
| Tab 2: CorrelationGraph.tsx                                     | src/viewer/components/          |
|        - CustomNodes.tsx (structuralNode, testNode)             |   DetailInspector.tsx           |
|        - CustomEdges.tsx (correlationEdge)                      |                                 |
|        - GraphLegend.tsx                                        | Embedded Components:            |
|        - GraphAccessibleView.tsx                                | - CodeComparison.tsx            |
| Tab 3: StructuralChangeExplorer.tsx                             |   (Monaco Diff Editor)          |
| Tab 4: TestChangesInspector.tsx                                 | - CodeComparisonToolbar.tsx     |
| Tab 5: CorrelationMatrixTable.tsx                               | - EditorUnavailableState.tsx    |
| Tab 6: FindingsSummary.tsx                                      |                                 |
|                                                                 | Tab navigation:                 |
| (60% to 70% width on desktop)                                   | Overview | Diff | Tests | Evidence|
|                                                                 | (30% to 40% width on desktop)   |
+=================================================================+=================================+
| REGION 7: Modal Overlays & Drawers (Conditional)                                                  |
| - ReportLoader.tsx (Import JSON Dialog, Drag/Drop, Paste with Zod validation)                      |
| - ReportReadingGuide.tsx (Educational Guide: What changed? What do tests tell us? Unknowns?)       |
+===================================================================================================+
```

---

## Part 2: Detailed Component Responsibilities & Layout Roles

### Region 1 & 2: Dual-Tier Header
* **Source File:** [`src/viewer/components/Navbar.tsx`](file:///e:/change-archaeologist/src/viewer/components/Navbar.tsx)
* **Parent Container:** [`src/viewer/layouts/ConsoleLayout.tsx`](file:///e:/change-archaeologist/src/viewer/layouts/ConsoleLayout.tsx)
* **Visual Role:**
  * Separates brand identity and global utility actions (Row 1) from report-specific metadata and scenario filters (Row 2).
  * Prevents horizontal congestion on screens under 1400px.
* **Component Breakdown:**
  * Brand logo (`LucideCompass` icon with terracotta accent).
  * Product name (`font-mono tracking-tight font-bold text-text-primary`).
  * Subtitle badge (`Evidence Atlas`).
  * `TactileButton` triggers for `ReportReadingGuide` and `ReportLoader`.
  * Contextual chips for target function (`monospace font`), commit range (with arrow delimiter), and status badge (`ANALYZED`).
  * Native styled `<select>` dropdown for rapid switching between demo scenarios.

### Region 3: Executive Summary Ribbon
* **Source File:** [`src/viewer/components/ExecutiveSummaryStrip.tsx`](file:///e:/change-archaeologist/src/viewer/components/ExecutiveSummaryStrip.tsx)
* **Parent Container:** [`src/viewer/layouts/ConsoleLayout.tsx`](file:///e:/change-archaeologist/src/viewer/layouts/ConsoleLayout.tsx)
* **Visual Role:**
  * Immediate high-level overview of report findings and health.
  * Displays the essential epistemic guardrail notice front-and-center.
* **Component Breakdown:**
  * Target function and commit span pill.
  * Mutation count badge (`variant="terracotta"`).
  * Companion test count badge (`variant="verdigris"`).
  * Correlation status distribution pills (`STRONG`, `WEAK`, `NONE`, `UNCERTAIN`).
  * Findings count with attention level badge.
  * Static-analysis guardrail callout warning users that no code execution or runtime test execution occurred.

### Region 4: Workspace Navigation
* **Source File:** [`src/viewer/layouts/ConsoleLayout.tsx`](file:///e:/change-archaeologist/src/viewer/layouts/ConsoleLayout.tsx)
* **Visual Role:**
  * Tab bar with 6 distinct analytical lenses.
  * Features terracotta active underlines and counts for each category.
* **Tab Identifiers:**
  1. `"timeline"` &rarr; `ChangeTimeline`
  2. `"graph"` &rarr; `CorrelationGraph`
  3. `"changes"` &rarr; `StructuralChangeExplorer`
  4. `"tests"` &rarr; `TestChangesInspector`
  5. `"matrix"` &rarr; `CorrelationMatrixTable`
  6. `"findings"` &rarr; `FindingsSummary`

### Region 5: Active Workspace Panels

#### 1. Timeline View
* **Source File:** [`src/viewer/components/ChangeTimeline.tsx`](file:///e:/change-archaeologist/src/viewer/components/ChangeTimeline.tsx)
* **Data Model:** [`src/viewer/utils/timeline-model.ts`](file:///e:/change-archaeologist/src/viewer/utils/timeline-model.ts)
* **Visual Structure:** Vertical chronological railway spine connecting revision cards, AST mutation cards, and companion test changes.

#### 2. Correlation Graph View
* **Source File:** [`src/viewer/components/CorrelationGraph.tsx`](file:///e:/change-archaeologist/src/viewer/components/CorrelationGraph.tsx)
* **Subcomponents:**
  * [`src/viewer/components/graph/CustomNodes.tsx`](file:///e:/change-archaeologist/src/viewer/components/graph/CustomNodes.tsx): `structuralNode` (amber/terracotta border), `testNode` (blue/verdigris border).
  * [`src/viewer/components/graph/CustomEdges.tsx`](file:///e:/change-archaeologist/src/viewer/components/graph/CustomEdges.tsx): Smooth curved cubic bezier edges with status badges.
  * [`src/viewer/components/graph/GraphLegend.tsx`](file:///e:/change-archaeologist/src/viewer/components/graph/GraphLegend.tsx): Floating collapsible legend card.
  * [`src/viewer/components/graph/GraphAccessibleView.tsx`](file:///e:/change-archaeologist/src/viewer/components/graph/GraphAccessibleView.tsx): Screen-reader accessible alternative table.
* **Layout Model:** [`src/viewer/utils/graph-model.ts`](file:///e:/change-archaeologist/src/viewer/utils/graph-model.ts) computes 2-column or 3-column layered coordinates.

#### 3. Code Changes View
* **Source File:** [`src/viewer/components/StructuralChangeExplorer.tsx`](file:///e:/change-archaeologist/src/viewer/components/StructuralChangeExplorer.tsx)
* **Visual Structure:** List of AST mutation cards with category filter pills, statement line spans, and snippet previews.

#### 4. Test Changes View
* **Source File:** [`src/viewer/components/TestChangesInspector.tsx`](file:///e:/change-archaeologist/src/viewer/components/TestChangesInspector.tsx)
* **Visual Structure:** Companion test file cards with assertion change breakdown (`ADDED`, `MODIFIED`, `REMOVED`) and direct call verification badges.

#### 5. Correlation Matrix View
* **Source File:** [`src/viewer/components/CorrelationMatrixTable.tsx`](file:///e:/change-archaeologist/src/viewer/components/CorrelationMatrixTable.tsx)
* **Visual Structure:** Tabular grid mapping production changes against test changes, color-coded by correlation status (`STRONG`, `WEAK`, etc.).

#### 6. Findings Summary View
* **Source File:** [`src/viewer/components/FindingsSummary.tsx`](file:///e:/change-archaeologist/src/viewer/components/FindingsSummary.tsx)
* **Visual Structure:** Stack of finding cards using `Disclosure` for expanding observations, unknowns, and review recommendations.

### Region 6: Detail Inspector & Monaco Code Comparison
* **Source File:** [`src/viewer/components/DetailInspector.tsx`](file:///e:/change-archaeologist/src/viewer/components/DetailInspector.tsx)
* **Subcomponents:**
  * [`src/viewer/components/CodeComparison.tsx`](file:///e:/change-archaeologist/src/viewer/components/CodeComparison.tsx): Monaco Diff Editor container.
  * [`src/viewer/components/CodeComparisonToolbar.tsx`](file:///e:/change-archaeologist/src/viewer/components/CodeComparisonToolbar.tsx): Monaco toolbar with Diff/Single toggle and copy buttons.
  * [`src/viewer/components/EditorUnavailableState.tsx`](file:///e:/change-archaeologist/src/viewer/components/EditorUnavailableState.tsx): Accessible `<pre>` fallback if Monaco fails.
* **Visual Structure:**
  * Multi-tab side drawer (or bottom pane on smaller screens) displaying AST details, unified diff, companion test details, and verifiable evidence anchors.

### Region 7: Dialogs & Overlay Drawers
* **Report Loader:** [`src/viewer/components/ReportLoader.tsx`](file:///e:/change-archaeologist/src/viewer/components/ReportLoader.tsx)
  * Modal with drop zone, file picker, raw JSON paste textarea with live Zod validation, and scenario preset pills.
* **Reading Guide:** [`src/viewer/components/ReportReadingGuide.tsx`](file:///e:/change-archaeologist/src/viewer/components/ReportReadingGuide.tsx)
  * Slide-over banner or modal explaining the 3 questions and epistemic glossary using `Disclosure` accordions.

---

## Part 3: Confirmed Layout Constraints & Quirks

When designing or restructuring the layout, the new UI designer must account for the following technical constraints in the current implementation:

1. **Monaco Editor Height Constraints:**
   * Monaco Editor (`@monaco-editor/react`) requires an explicit container height (e.g. `h-[400px]`, `h-full` within a fixed-height parent, or `calc(100vh - 200px)`).
   * If placed inside a flex container without an explicit or calculated pixel/percentage height, Monaco collapses to 0px height.
2. **React Flow Canvas Sizing:**
   * React Flow (`@xyflow/react`) requires its parent element to have non-zero `width` and `height` dimensions at mount time.
   * If rendered inside a hidden or collapsed tab container, `fitView` will miscalculate coordinates until manually resized.
3. **Dual-Pane Split vs Drawer:**
   * On wide screens (`>= 1280px`), the Detail Inspector is persistent on the right side (`w-[380px]` to `w-[440px]`).
   * On screens `< 1280px`, the Detail Inspector must behave as a slide-over drawer or stacked bottom panel to prevent crushing the primary workspace tabs.
4. **Target Function Name Truncation:**
   * Target function names can be long (e.g. `AuthenticationService.prototype.verifyJwtTokenWithFallback`).
   * Headers and chips must use `truncate` with `title` tooltips to prevent breaking horizontal navigation layouts.
5. **Reduced Motion Support:**
   * Any new layout transition, drawer animation, or accordion must check `useReducedMotion()` from `motion/react` and omit motion when requested by the OS.

