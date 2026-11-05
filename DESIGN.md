# Change Archaeologist — Visual Design System Specification (DESIGN.md)

> **Document Status:** Canonical Design Authority  
> **Version:** 2.0.0 (Evidence Atlas Redesign Specification)  
> **Aesthetic Archetype:** Investigative Evidence Atlas (`impeccable` *Operate* / *Read* mode + archival cartographic instrument)  
> **Stack Target:** React 19, TypeScript, Vite, Tailwind CSS, Motion, Monaco Editor, Lucide Icons, React Flow  
> **Verified Baseline:** 290 automated tests across 23 test suites; 6 deterministic demonstration scenarios  

---

## 1. Product Design Principles

Change Archaeologist is a local-first, deterministic static analysis tool that uncovers AST structural mutations across Git revisions and conservatively correlates them with companion test changes.

Its visual presentation embodies the metaphor of an **Investigative Evidence Atlas** — an archival record of software changes, mutations, and empirical relationships:

1. **The Investigative Evidence Atlas:**
   The interface feels like a precision archival instrument. Warm archival paper, charcoal ink typography, fine cartographic gridlines, and restrained terracotta accents convey historical provenance, empirical rigor, and craftsmanship.
2. **Data and Evidence Are the Heroes:**
   Code snippets, AST structural diffs, test assertions, line numbers, and commit hashes are the primary aesthetic assets. A bordered panel containing crisp monospaced code and precise line references outranks any decorative graphic.
3. **Epistemic Humility as a Visual Primitive:**
   Static analysis establishes observed structural facts, not dynamic runtime truth. Visual styling enforces this distinction:
   - Correlation is never styled as causation.
   - Absence of evidence is never presented as proof of absence.
   - Unknown boundaries and incomplete analysis limitations are surfaced prominently in dedicated trays and banners rather than obscured.
   - The four domain correlation statuses are strictly preserved: `STRONG`, `WEAK`, `NONE`, `UNCERTAIN`.
4. **Information Density Without Cognitive Overload:**
   Compact 11–13px interface typography, hairline borders, and subtle cartographic coordinate references allow extensive comparative analysis in a single viewport. Visual hierarchy is established through strict font contrast (editorial serif display vs. clean sans body vs. monospace evidence identifiers) and tonal surface depth.
5. **Anti-Slop Craft Floor:**
   Generic AI-dashboard tropes (indigo-to-purple gradient hero banners, frosted glassmorphism cards everywhere, generic rounded rectangles, and emoji icons) are strictly forbidden. Every border, margin, and token clarifies code relationships.

---

## 2. Token Architecture (Three Tiers)

Tokens strictly adhere to a three-tier model:
$$\text{Component Tokens} \longrightarrow \text{Semantic Tokens} \longrightarrow \text{Primitive Tokens} \longrightarrow \text{Raw Values}$$
Components never consume primitive tokens directly.

### Tier 1: Primitive Tokens (Raw Palette & Scales)

```css
:root {
  /* Primitive Neutrals — Warm Parchment Ramp */
  --primitive-parchment-50:  #FDFAF5; /* Lightest highlight */
  --primitive-parchment-100: #F9F4EC; /* Near-white parchment */
  --primitive-parchment-200: #F5F0E8; /* Page ground */
  --primitive-parchment-300: #EDE8DF; /* Panel surface */
  --primitive-parchment-400: #E6E0D5; /* Elevated surface */
  --primitive-parchment-500: #DDD7CC; /* Hover surface */
  --primitive-parchment-600: #D0C9BC; /* Active surface */
  --primitive-parchment-700: #BDB4A5; /* Strong border */
  --primitive-parchment-800: #A09689; /* Divider */

  /* Primitive Ink — Warm Charcoal Ramp */
  --primitive-ink-950: #0F0A04; /* Deepest ink */
  --primitive-ink-900: #1C1409; /* Primary text */
  --primitive-ink-800: #2E2010; /* Heading dark */
  --primitive-ink-700: #4A3728; /* Secondary text */
  --primitive-ink-600: #6B5240; /* Muted text */
  --primitive-ink-500: #8A7560; /* Tertiary / metadata */
  --primitive-ink-400: #A8957E; /* Subdued */
  --primitive-ink-300: #C4AE98; /* Placeholder */

  /* Primitive Alpha Borders — Warm Ink */
  --primitive-alpha-ink-6:  rgba(90, 70, 50, 0.06);
  --primitive-alpha-ink-12: rgba(90, 70, 50, 0.12);
  --primitive-alpha-ink-20: rgba(90, 70, 50, 0.20);
  --primitive-alpha-ink-35: rgba(90, 70, 50, 0.35);
  --primitive-alpha-ink-50: rgba(90, 70, 50, 0.50);

  /* Primitive Accent — Oxidized Terracotta / Burnt Orange */
  --primitive-terra-900: #6B1E0A;
  --primitive-terra-800: #8B2910;
  --primitive-terra-700: #A8371A;
  --primitive-terra-600: #C4521A; /* Canonical Brand Accent */
  --primitive-terra-500: #D4642A;
  --primitive-terra-400: #E07A45;
  --primitive-terra-200: rgba(196, 82, 26, 0.15);
  --primitive-terra-border: rgba(196, 82, 26, 0.30);

  /* Primitive Semantic Hues — Muted Archival Palette */
  --primitive-green-700: #1A5C2E;
  --primitive-green-600: #2E7D32;
  --primitive-green-500: #388E3C;
  --primitive-green-bg:  rgba(46, 125, 50, 0.08);
  --primitive-green-border: rgba(46, 125, 50, 0.25);

  --primitive-red-700: #8B1C1C;
  --primitive-red-600: #B71C1C;
  --primitive-red-500: #C62828;
  --primitive-red-bg:  rgba(183, 28, 28, 0.08);
  --primitive-red-border: rgba(183, 28, 28, 0.25);

  --primitive-amber-700: #7A4000;
  --primitive-amber-600: #E65100;
  --primitive-amber-bg:  rgba(230, 81, 0, 0.08);
  --primitive-amber-border: rgba(230, 81, 0, 0.25);

  --primitive-purple-700: #3D1B77;
  --primitive-purple-600: #5C3D99;
  --primitive-purple-bg:  rgba(92, 61, 153, 0.08);
  --primitive-purple-border: rgba(92, 61, 153, 0.25);

  --primitive-ochre-700: #7A5000;
  --primitive-ochre-600: #9E6B00;
  --primitive-ochre-bg:  rgba(158, 107, 0, 0.08);
  --primitive-ochre-border: rgba(158, 107, 0, 0.25);

  --primitive-gray-600: #5C6472;
  --primitive-gray-500: #6B7280;
  --primitive-gray-bg:  rgba(107, 114, 128, 0.08);
  --primitive-gray-border: rgba(107, 114, 128, 0.20);
}
```

### Tier 2: Semantic Tokens (Role-Based Meaning)

```css
:root {
  /* Surfaces — Warm Parchment Progression */
  --surface-ground:   var(--primitive-parchment-200); /* #F5F0E8 */
  --surface-panel:    var(--primitive-parchment-300); /* #EDE8DF */
  --surface-elevated: var(--primitive-parchment-400); /* #E6E0D5 */
  --surface-hover:    var(--primitive-parchment-500); /* #DDD7CC */
  --surface-active:   var(--primitive-parchment-600); /* #D0C9BC */
  --surface-code:     var(--primitive-parchment-100); /* #F9F4EC */

  /* Borders & Dividers */
  --border-hairline:    var(--primitive-alpha-ink-12);
  --border-subtle:      var(--primitive-alpha-ink-20);
  --border-interactive: var(--primitive-alpha-ink-35);
  --border-focus:       var(--primitive-terra-600);

  /* Typography Roles */
  --text-primary:   var(--primitive-ink-900);
  --text-secondary: var(--primitive-ink-700);
  --text-muted:     var(--primitive-ink-500);
  --text-accent:    var(--primitive-terra-600);

  /* Brand / Action */
  --action-primary-bg:    var(--primitive-terra-600);
  --action-primary-hover: var(--primitive-terra-700);
  --action-primary-text:  #FFFFFF;
  --action-ghost-hover:   var(--primitive-alpha-ink-6);

  /* Status Tokens */
  --status-added-fg:     var(--primitive-green-600);
  --status-added-bg:     var(--primitive-green-bg);
  --status-added-border: var(--primitive-green-border);

  --status-removed-fg:     var(--primitive-red-600);
  --status-removed-bg:     var(--primitive-red-bg);
  --status-removed-border: var(--primitive-red-border);

  --status-modified-fg:     var(--primitive-amber-600);
  --status-modified-bg:     var(--primitive-amber-bg);
  --status-modified-border: var(--primitive-amber-border);

  /* Correlation Tokens */
  --status-strong-fg:     var(--primitive-green-700);
  --status-strong-bg:     var(--primitive-green-bg);
  --status-strong-border: var(--primitive-green-border);

  --status-weak-fg:     var(--primitive-purple-600);
  --status-weak-bg:     var(--primitive-purple-bg);
  --status-weak-border: var(--primitive-purple-border);

  --status-none-fg:     var(--primitive-gray-500);
  --status-none-bg:     transparent;
  --status-none-border: var(--primitive-alpha-ink-12);

  --status-uncertain-fg:     var(--primitive-ochre-600);
  --status-uncertain-bg:     var(--primitive-ochre-bg);
  --status-uncertain-border: var(--primitive-ochre-border);

  --status-unknown-fg:     var(--primitive-gray-500);
  --status-unknown-bg:     var(--primitive-gray-bg);
  --status-unknown-border: var(--primitive-gray-border);
}
```

---

## 3. Typography & Cartographic Details

Change Archaeologist pairs three distinct typographic voices:
1. **Display Typography:** Editorial serif (`'Libre Baskerville', Georgia, serif`) for the masthead, target entity names, and major section titles.
2. **Interface Typography:** Highly legible system sans-serif (`'Inter', system-ui, sans-serif`) for summaries, labels, controls, and body text.
3. **Monospace Typography:** Monospace (`ui-monospace, 'JetBrains Mono', 'IBM Plex Mono', monospace`) reserved strictly for code, evidence identifiers (`EV-001`), line spans (`L14:C3-L16:C20`), commit SHAs, and rule identifiers (`RULE_GUARD_REMOVED`).
4. **Cartographic Annotation Grids:** Subtle 20px / 24px coordinate grid patterns (`.atlas-grid`) provide a cartographic foundation behind workspace canvases and data viewports without distracting from code readability.

---

## 4. Production-Test Correlation Graph Architecture

The correlation graph visualizes relationships strictly derived from validated `AnalysisReport` data across distinct spatial territories:

```
[ Production Realm ]                      [ Evidence Corridors ]                 [ Test Artifact Realm ]
+---------------------+                   +--------------------+                 +---------------------+
| Target Function     | --- contains ---> | Structural Mutation| === STRONG ===> | Companion Test Change| <--- contains --- [ Test File Suite ]
| (Production Anchor) |                   | (Observed Diff)    |   (Bezier Edge) | (Assertion Diff)     |
+---------------------+                   +--------------------+                 +---------------------+
```

- **Production Realm (West):** Target function anchor node (`x: 50`) and contained structural mutation nodes (`x: 410`).
- **Evidence Corridors (Center):** 260px bridge gap where bezier correlation edges are drawn with distinct status styling (`STRONG`, `WEAK`, `UNCERTAIN`, `NONE`) and accessible relationship labels.
- **Test Artifact Realm (East):** Companion test changes and declaration blocks (`x: 930`) linked to their parent test file suite roots (`x: 1290`).
- **Viewport Sizing:** Balanced fit-to-view framing with `minZoom: 0.65` and `padding: 0.12` prevents nodes from collapsing into an unreadable miniature strip.
- **Accessible Linear Alternative:** Complete structured table view (`GraphAccessibleView`) ensures 100% keyboard navigability and screen-reader accessibility.

---

## 5. Epistemic Guardrails and Non-Causality

1. **Non-Causality Rule:** Static AST analysis establishes syntactic proximity and co-occurrence. It does not prove that a test executed, verified runtime behavior, or caused a defect.
2. **Honest Incompleteness:** When functions are removed (`FUNCTION_DELETED`) or code cannot be parsed, the interface displays dedicated boundary banners rather than synthetic or guessed states.
3. **Evidence Anchors:** Every mutation and correlation item provides deep-links to explicit evidence anchors (`EV-xxx`) and exact source coordinate spans.

---

## 6. Accessibility & Responsive Standards

- **WCAG 2.2 Level AA Compliance:** All body and metadata text pairs exceed the 4.5:1 contrast requirement against warm parchment surfaces.
- **Visible Focus Rings:** Standardized `:focus-visible` indicators using `2px solid var(--border-focus)` (`#C4521A`) with `2px` offset.
- **Roving Tabindex:** Tab controls implement the WAI-ARIA tablist pattern with arrow-key navigation (`ArrowRight`, `ArrowLeft`, `Home`, `End`).
- **Modal Dialog Focus Trapping:** Dialogs trap focus on open and restore focus to triggering elements upon dismissal via `Escape` or the Close button.
- **Reduced Motion:** Automatic reset under `prefers-reduced-motion: reduce`.

---

## 7. Newcomer Comprehension & Plain-English Architecture

To ensure the interface is immediately understandable to newcomers, non-technical users, and computer science students while preserving analytical rigor for experienced engineers:

1. **"How to Read This Report" Guide (`ReportReadingGuide.tsx`):**
   - Accessible from the Executive Summary Strip and Navbar via a persistent, non-blocking toggle.
   - Structured around the three foundational questions of code change archaeology:
     1. **What changed?** Explains AST structural differences between the two Git revisions.
     2. **What do the tests tell us?** Explains detected companion test changes, assertion edits, and function targeting.
     3. **What can we conclude?** Clearly articulates observed evidence, inferences, and the inherent limits of static analysis.
   - Grounded directly in live data from the currently loaded `AnalysisReport`.
   - Includes an expandable plain-English glossary for static analysis terminology.

2. **Dual-Labeling System:**
   - Important sections pair intuitive plain-English headings with precise technical domain terms:
     - *Code Changes* (`STRUCTURAL MUTATIONS`)
     - *Related Tests* (`COMPANION TEST FILES`)
     - *Code–Test Links* (`CORRELATION LINKS`)
     - *What We Know* (`EPISTEMIC FINDINGS`)
     - *What Changed Between Versions* (`CHANGE TIMELINE`)
     - *Visual Relationships* (`CORRELATION GRAPH`)

3. **Data-Grounded Selection Explanations:**
   - Selecting any node, edge, mutation, or test change surfaces a structured explanation in `DetailInspector` and floating canvas cards:
     - **Entity Representation:** Plain-English role and category.
     - **Observed Mutation:** Clear narrative of what was modified.
     - **Evidence Anchors:** Explicit proof IDs (`EV-xxx`) and coordinates (`Lxx:Cxx`).
     - **Epistemic Invariant:** Explicit separation of what the evidence **Establishes** vs. what it **Does NOT Establish** (e.g., static analysis proves syntax changes; it never proves runtime test passage or dynamic correctness).
