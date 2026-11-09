# Change Archaeologist — Visual Design System Specification (DESIGN.md)

> **Document Status:** Canonical Design Authority
> **Version:** 3.0.0
> **Stack Target:** React 19, TypeScript, Vite, Tailwind CSS, Motion, Monaco Editor, Lucide Icons

---

## 1. Product Design Principles

Change Archaeologist is a local-first, deterministic static analysis tool. Its viewer is a working instrument used beside an editor, so clarity and scanning speed outrank expression.

1. **Evidence is the subject.** Code, line numbers and commit hashes carry the page. Chrome stays quiet.
2. **Colour has a job.** Neutrals are cool and mineral. One verdigris accent marks actions and selection. Status hues appear only where they carry meaning.
3. **Claims stay honest.** Correlation is never styled as causation, and absence of evidence is never styled as proof of absence. The statuses `STRONG`, `WEAK`, `UNCERTAIN` and `NONE` are preserved exactly.
4. **Local means local.** Fonts and workers ship with the app. The viewer makes no network requests.

---

## 2. Tokens

`src/viewer/styles/tokens.css` is the source of truth, in three tiers: primitives, semantic roles, and component tokens. Components use semantic roles only, so a theme is one block of overrides.

- **Themes:** light values live on `:root`, dark overrides on `:root[data-theme="dark"]`. `index.html` sets `data-theme` before first paint, from a stored choice or the system setting. `utils/theme.ts` owns changes.
- **Contrast:** every text role meets 4.5:1 on every surface in both themes, including status text on its own tint.
- **Monaco:** editor themes in `CodeComparison.tsx` mirror the tokens and must use hex colours, because Monaco renders anything else as solid red.
- **Radii:** 3, 4, 6, 8 and 12px. Motion: 120ms feedback, 200ms reveals, `cubic-bezier(0.23, 1, 0.32, 1)` for entrances.

---

## Identity

The mark is a stone cut into strata with one artifact at its core, symmetrical on both axes and drawn in one colour on a 256 grid (`components/icons/LogoMark.tsx`, `public/favicon.svg`). It is tested from 16px up, in both themes.

Heading icons in `components/icons/HeadingGlyphs.tsx` share a 20-unit grid and one 1.5 stroke, and reuse the mark's strata, cuts and diamond.

**Layout grid:** every panel uses a 16px gutter. View headers are 56px tall and share the same lines across the split.

---

## 3. Typography

- **IBM Plex Sans** for all interface text, self-hosted with `@fontsource`.
- **IBM Plex Mono** only for code, identifiers, spans, hashes and file paths. Never for ordinary labels.
- **12px is the minimum text size.** 14px is the body size.

---

## 4. The Dig (Production-Test Correlation View)

The correlation view draws a validated `AnalysisReport` as an excavation cross-section. Geometry comes from `utils/dig-model.ts` and `utils/dig-layout.ts`; nothing is drawn that the report does not contain.

- **Rock layers:** the target function's real source lines in BASE (left) and HEAD (right). Long functions compress unchanged runs.
- **Faults:** each structural change, joining its BASE and HEAD lines. A removed or added change pinches to a point on the side where it has no lines.
- **Shafts:** each correlation, drilled from its fault to an assertion or test file. Shape carries status, always with a text label: `STRONG` solid, `WEAK` broken, `UNCERTAIN` dotted, `NONE` hollow and ending in open ground.
- **Never dug:** a hatched band below the tests marks what static analysis cannot see. Shafts never enter it.
- **Absence stays distinct:** a change with no correlation record gets a thin dotted probe, which is not the same as a `NONE` correlation.
- **Sizing:** text renders at true size and columns reflow to the pane. The diagram scrolls sideways below 760px or when test cards need more room.
- **Accessible alternative:** `GraphAccessibleView` lists every entity and correlation, including links with no test-change ID, and is the default below 768px.

## 5. Epistemic Guardrails and Non-Causality

1. **Non-Causality Rule:** Static AST analysis establishes syntactic proximity and co-occurrence. It does not prove that a test executed, verified runtime behavior, or caused a defect.
2. **Honest Incompleteness:** When functions are removed (`FUNCTION_DELETED`) or code cannot be parsed, the interface displays dedicated boundary banners rather than synthetic or guessed states.
3. **Evidence Anchors:** Every mutation and correlation item provides deep-links to explicit evidence anchors (`EV-xxx`) and exact source coordinate spans.

---

## 6. Accessibility & Responsive Standards

- **WCAG 2.2 Level AA Compliance:** All body and metadata text pairs meet the 4.5:1 contrast requirement in both themes.
- **Visible Focus Rings:** Standardized `:focus-visible` indicators using `2px solid var(--border-focus)` with `2px` offset.
- **Roving Tabindex:** Tab controls implement the WAI-ARIA tablist pattern with arrow-key navigation (`ArrowRight`, `ArrowLeft`, `Home`, `End`).
- **Modal Dialog Focus Trapping:** Dialogs trap focus on open and restore focus to triggering elements upon dismissal via `Escape` or the Close button.
- **Reduced Motion:** Automatic reset under `prefers-reduced-motion: reduce`.

---

## 7. Structure and Language

1. **Start screen:** with no report open, the app explains what it answers and offers a drop zone, the CLI command, and samples named by what they show.
2. **Header:** one row names the report being read. The next gives a verdict sentence, built only from report counts, and the three views.
3. **Views:** The Dig, Code & tests, and Findings. The detail panel beside them is resizable and follows the single active selection. Code & tests gives it most of the width for a side-by-side diff.
4. **Plain language:** report enums pass through `utils/labels.ts`. Raw values appear only as tooltips. Correlation statuses keep their exact names, with a short gloss.
5. **Always the same order:** what we saw, what that suggests, what we can't tell.
6. **Components:** interactive primitives come from shadcn/ui where they earn their place, currently Resizable, on Tailwind CSS v4.
