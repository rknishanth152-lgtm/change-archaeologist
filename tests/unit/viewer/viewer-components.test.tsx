// @vitest-environment jsdom
/**
 * Change Archaeologist - React Viewer Component Rendering Tests
 *
 * Tests component rendering, executive summary display, mutation explorer,
 * companion test inspector, correlation matrix table, and incomplete state handling.
 */

import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// Mock Monaco for JSDOM unit test environment
vi.mock("@monaco-editor/react", () => ({
  DiffEditor: (props: any) => (
    <div data-testid="monaco-diff-editor" data-language={props.language}>
      <div data-testid="monaco-original">{props.original}</div>
      <div data-testid="monaco-modified">{props.modified}</div>
    </div>
  ),
  loader: {
    config: vi.fn(),
  },
}));

// Provide matchMedia polyfill for JSDOM
if (typeof window !== "undefined" && !window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

import { App } from "../../../src/viewer/app/App.js";
import { ExecutiveSummaryStrip } from "../../../src/viewer/components/ExecutiveSummaryStrip.js";
import { StructuralChangeExplorer } from "../../../src/viewer/components/StructuralChangeExplorer.js";
import { TestChangesInspector } from "../../../src/viewer/components/TestChangesInspector.js";
import { CorrelationMatrixTable } from "../../../src/viewer/components/CorrelationMatrixTable.js";
import { FindingsSummary } from "../../../src/viewer/components/FindingsSummary.js";
import { LimitationsBanner } from "../../../src/viewer/components/LimitationsBanner.js";
import { ReportLoader } from "../../../src/viewer/components/ReportLoader.js";
import {
  DEMO_SCENARIO_A,
  DEMO_SCENARIO_D,
  DEMO_SCENARIO_E,
  DEMO_SCENARIO_F,
} from "../../../src/viewer/data/demo-fixtures.js";

describe("Viewer Component Rendering & Console Shell", () => {
  beforeEach(() => {
    cleanup();
  });

  afterEach(() => {
    cleanup();
  });

  it("initializes App without crashing and renders Console header", () => {
    render(<App />);
    expect(screen.getByText("Change Archaeologist")).toBeInTheDocument();
    expect(screen.getByText("Console v1.0")).toBeInTheDocument();
    expect(screen.getByText("TARGET ENTITY")).toBeInTheDocument();
  });

  it("correctly renders ExecutiveSummaryStrip with validated report metrics", () => {
    render(<ExecutiveSummaryStrip report={DEMO_SCENARIO_E} />);

    expect(screen.getByText("calculateDiscount")).toBeInTheDocument();
    expect(screen.getByText("src/order.ts")).toBeInTheDocument();
    expect(screen.getByText("STRUCTURAL MUTATIONS")).toBeInTheDocument();
    expect(screen.getByText("COMPANION TEST FILES")).toBeInTheDocument();
    expect(screen.getByText("CORRELATION LINKS")).toBeInTheDocument();
    expect(screen.getByText(/Epistemic Invariant:/)).toBeInTheDocument();
    expect(screen.getByText(/Unverified Runtime Causality/)).toBeInTheDocument();
  });

  it("renders StructuralChangeExplorer with mutation badges and summaries", () => {
    const onSelect = () => {};
    render(
      <StructuralChangeExplorer
        structuralChanges={DEMO_SCENARIO_A.structuralChanges}
        selectedId={null}
        onSelectChange={onSelect}
      />
    );

    expect(screen.getByText("SC-001")).toBeInTheDocument();
    expect(screen.getByText("-REM")).toBeInTheDocument();
    expect(screen.getByText("GUARD_CLAUSE")).toBeInTheDocument();
    expect(screen.getByText("RULE_GUARD_REMOVED")).toBeInTheDocument();
    expect(
      screen.getByText(/Guard clause removed: if \(!payment\.valid\)/)
    ).toBeInTheDocument();
  });

  it("renders TestChangesInspector with assertion text diffs", () => {
    const onSelect = () => {};
    render(
      <TestChangesInspector
        testChanges={DEMO_SCENARIO_D.testChanges}
        selectedId={null}
        onSelectChange={onSelect}
      />
    );

    expect(screen.getByText("tests/order.test.ts")).toBeInTheDocument();
    expect(
      screen.getByText("order calculation > calculates regular discount")
    ).toBeInTheDocument();
    expect(screen.getByText("Calls Target Fn")).toBeInTheDocument();
    expect(screen.getByText("- expect(calculateDiscount(100)).toBe(10)")).toBeInTheDocument();
    expect(screen.getByText("+ expect(calculateDiscount(100)).toBe(15)")).toBeInTheDocument();
  });

  it("renders CorrelationMatrixTable with STRONG and WEAK status badges", () => {
    const onSelect = () => {};
    render(
      <CorrelationMatrixTable
        correlationItems={DEMO_SCENARIO_E.correlationItems}
        selectedId={null}
        onSelectCorrelation={onSelect}
      />
    );

    expect(screen.getByText("CORR-ITEM-001")).toBeInTheDocument();
    expect(screen.getByText("[STRONG]")).toBeInTheDocument();
    expect(screen.getByText("POTENTIALLY_RELATED_ASSERTION_MODIFIED")).toBeInTheDocument();

    expect(screen.getByText("CORR-ITEM-002")).toBeInTheDocument();
    expect(screen.getByText("[WEAK]")).toBeInTheDocument();
    expect(screen.getByText("POTENTIALLY_RELATED_TEST_DECLARATION_CHANGED")).toBeInTheDocument();

    expect(screen.getAllByText("Observed Syntactic Fact").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Inferred Conservative Relationship").length).toBeGreaterThan(0);
  });

  it("renders FindingsSummary with observed, inferred, and unknown tiers", () => {
    const onSelect = () => {};
    render(
      <FindingsSummary
        findings={DEMO_SCENARIO_E.findings}
        selectedId={null}
        onSelectFinding={onSelect}
      />
    );

    expect(screen.getByText("Return statement modified")).toBeInTheDocument();
    expect(screen.getByText("INFORMATIONAL")).toBeInTheDocument();
    expect(screen.getByText("MODERATE ATTENTION")).toBeInTheDocument();
    expect(screen.getAllByText("[OBSERVED FACTS]").length).toBeGreaterThan(0);
    expect(screen.getAllByText("[INFERRED HYPOTHESES]").length).toBeGreaterThan(0);
    expect(screen.getAllByText("[ANALYSIS BOUNDARIES & UNKNOWNS]").length).toBeGreaterThan(0);
  });

  it("renders LimitationsBanner in expanded state for incomplete report (Scenario F)", () => {
    render(<LimitationsBanner report={DEMO_SCENARIO_F} />);

    expect(
      screen.getByText("INCOMPLETE ANALYSIS: INCOMPLETE_FUNCTION_MISSING")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Upstream Lineage & Static Analysis Boundaries")
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Target function 'deprecatedHelper' was not found in HEAD revision/)
    ).toBeInTheDocument();
  });

  it("renders empty state gracefully when there are zero companion test changes", () => {
    const onSelect = () => {};
    render(
      <TestChangesInspector
        testChanges={[]}
        selectedId={null}
        onSelectChange={onSelect}
      />
    );

    expect(
      screen.getByText("Zero companion test changes detected across the analyzed revision range.")
    ).toBeInTheDocument();
  });

  it("supports full workspace tab switching for Scenario E in App", () => {
    render(<App />);

    // Default view: Scenario E, Structural Mutations tab
    expect(screen.getAllByText("calculateDiscount").length).toBeGreaterThan(0);
    expect(screen.getByText("RULE_RETURN_MODIFIED")).toBeInTheDocument();

    // Switch to Companion Tests tab
    const testsTab = screen.getByRole("tab", { name: /Companion Tests/ });
    fireEvent.click(testsTab);
    expect(screen.getByText("tests/order.test.ts")).toBeInTheDocument();
    expect(screen.getByText("order calculation > calculates regular discount")).toBeInTheDocument();

    // Switch to Correlation Matrix tab
    const corrTab = screen.getByRole("tab", { name: /Correlation Matrix/ });
    fireEvent.click(corrTab);
    expect(screen.getByText("CORR-ITEM-001")).toBeInTheDocument();
    expect(screen.getByText("[STRONG]")).toBeInTheDocument();
    expect(screen.getByText("POTENTIALLY_RELATED_ASSERTION_MODIFIED")).toBeInTheDocument();

    // Switch to Findings tab
    const findingsTab = screen.getByRole("tab", { name: /Findings/ });
    fireEvent.click(findingsTab);
    expect(screen.getByText("Return statement modified")).toBeInTheDocument();
    expect(screen.getAllByText("[OBSERVED FACTS]").length).toBeGreaterThan(0);
  });

  it("switches to Scenario F via preset selector and displays incomplete analysis status", () => {
    render(<App />);

    // Switch preset to Scenario F
    const presetSelect = screen.getByLabelText("Select demonstration scenario");
    fireEvent.change(presetSelect, { target: { value: "F" } });

    // Target function is deprecatedHelper in src/legacy.ts
    expect(screen.getAllByText("deprecatedHelper").length).toBeGreaterThan(0);
    expect(screen.getAllByText("src/legacy.ts").length).toBeGreaterThan(0);

    // Status pill in navbar should show incomplete status
    expect(screen.getAllByText("[INCOMPLETE_FUNCTION_MISSING]").length).toBeGreaterThan(0);

    // Limitations banner displays the boundary warning
    expect(screen.getByText(/Target function 'deprecatedHelper' was not found in HEAD revision/)).toBeInTheDocument();
  });

  it("renders ReportLoader modal and dismisses on Escape key and backdrop click", () => {
    let closed = false;
    const { rerender } = render(
      <ReportLoader isOpen={true} onClose={() => { closed = true; }} onReportLoaded={() => {}} />
    );

    expect(screen.getByText("Ingest Analysis Report")).toBeInTheDocument();

    // Test Escape key dismissal
    fireEvent.keyDown(window, { key: "Escape" });
    expect(closed).toBe(true);

    // Test backdrop click dismissal
    closed = false;
    rerender(
      <ReportLoader isOpen={true} onClose={() => { closed = true; }} onReportLoaded={() => {}} />
    );
    const dialogBackdrop = screen.getByRole("dialog");
    fireEvent.click(dialogBackdrop);
    expect(closed).toBe(true);
  });

  it("renders test declaration changes in TestChangesInspector when present", () => {
    const onSelect = () => {};
    render(
      <TestChangesInspector
        testChanges={DEMO_SCENARIO_E.testChanges}
        declarationChanges={DEMO_SCENARIO_E.declarationChanges}
        selectedId={null}
        onSelectChange={onSelect}
      />
    );

    expect(screen.getByText(/Test Block Declaration Mutations \(1\)/)).toBeInTheDocument();
    expect(screen.getByText(/TDC-001: order calculation > calculates regular discount/)).toBeInTheDocument();
  });

  it("supports keyboard selection in CorrelationMatrixTable", () => {
    let selectedId: string | null = null;
    render(
      <CorrelationMatrixTable
        correlationItems={DEMO_SCENARIO_E.correlationItems}
        selectedId={null}
        onSelectCorrelation={(id) => { selectedId = id; }}
      />
    );

    // Epistemic disclaimer banner is visible
    expect(screen.getByText(/High Syntactic Proximity and Co-occurrence signals prioritize human review/)).toBeInTheDocument();

    // Select row via Enter key
    const row = screen.getByLabelText(/Correlation item CORR-ITEM-001/);
    fireEvent.keyDown(row, { key: "Enter" });
    expect(selectedId).toBe("CORR-ITEM-001");

    // Select row via Space key
    fireEvent.keyDown(row, { key: " " });
    expect(selectedId).toBe("CORR-ITEM-001");
  });

  it("enforces WCAG tablist and tabpanel semantics in ConsoleLayout", () => {
    render(<App />);

    const tablist = screen.getByRole("tablist", { name: "Analysis report workspace views" });
    expect(tablist).toBeInTheDocument();

    const structuralTab = screen.getByRole("tab", { name: /Structural Mutations/ });
    expect(structuralTab).toHaveAttribute("aria-selected", "true");

    const testsTab = screen.getByRole("tab", { name: /Companion Tests/ });
    expect(testsTab).toHaveAttribute("aria-selected", "false");

    const tabpanel = screen.getByRole("tabpanel");
    expect(tabpanel).toBeInTheDocument();
    expect(tabpanel).toHaveAttribute("aria-labelledby", "tab-structural");
  });
});
