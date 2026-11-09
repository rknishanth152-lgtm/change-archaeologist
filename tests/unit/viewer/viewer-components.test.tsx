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

if (typeof ResizeObserver === "undefined") {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

import { App } from "../../../src/viewer/app/App.js";
import { ExecutiveSummaryStrip } from "../../../src/viewer/components/ExecutiveSummaryStrip.js";
import { StructuralChangeExplorer } from "../../../src/viewer/components/StructuralChangeExplorer.js";
import { TestChangesInspector } from "../../../src/viewer/components/TestChangesInspector.js";
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

  it("starts on the start screen", () => {
    render(<App />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Change Archaeologist");
    expect(screen.getByRole("button", { name: /Choose a report file/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /A safety check was removed/ })).toBeInTheDocument();
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
    expect(screen.getByText("Removed: safety check")).toBeInTheDocument();
    expect(screen.getByText("Lines 2–4")).toBeInTheDocument();
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
    expect(screen.getByText(/calls this function directly/)).toBeInTheDocument();
    expect(screen.getByText("− expect(calculateDiscount(100)).toBe(10)")).toBeInTheDocument();
    expect(screen.getByText("+ expect(calculateDiscount(100)).toBe(15)")).toBeInTheDocument();
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
    expect(screen.getByText("For information")).toBeInTheDocument();
    expect(screen.getByText("Worth a look")).toBeInTheDocument();
    expect(screen.getAllByText("What we saw").length).toBeGreaterThan(0);
    expect(screen.getAllByText("What that suggests").length).toBeGreaterThan(0);
    expect(screen.getAllByText("What we can't tell").length).toBeGreaterThan(0);
  });

  it("renders LimitationsBanner in expanded state for incomplete report (Scenario F)", () => {
    render(<LimitationsBanner report={DEMO_SCENARIO_F} />);

    expect(screen.getByText("The function exists in only one of the two versions.")).toBeInTheDocument();
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
      screen.getByText(/No test changes in this report/)
    ).toBeInTheDocument();
  });

  it("switches between the three views for a sample", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /How strong is the link/ }));

    expect(screen.getByText(/1 code change and 1 test change, with 2 possible links/)).toBeInTheDocument();
    expect(screen.getByText("Your code, before")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /Code & tests/ }));
    expect(screen.getByRole("heading", { name: /Test changes/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /Findings/ }));
    expect(screen.getByText("Return statement modified")).toBeInTheDocument();
    expect(screen.getAllByText("What we saw").length).toBeGreaterThan(0);
  });

  it("switches to Scenario F via preset selector and displays incomplete analysis status", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /How strong is the link/ }));

    // Switch preset to Scenario F
    const presetSelect = screen.getByLabelText("Open a sample report");
    fireEvent.change(presetSelect, { target: { value: "F" } });

    // Target function is deprecatedHelper in src/legacy.ts
    expect(screen.getAllByText("deprecatedHelper").length).toBeGreaterThan(0);
    expect(screen.getAllByText("src/legacy.ts").length).toBeGreaterThan(0);

    // Status pill in navbar should show incomplete status
    expect(screen.getByText("Incomplete")).toHaveAttribute("title", "INCOMPLETE_FUNCTION_MISSING");

    // Limitations banner displays the boundary warning
    expect(screen.getAllByText(/Target function 'deprecatedHelper' was not found in HEAD revision/).length).toBeGreaterThan(0);
  });

  it("renders ReportLoader modal and dismisses on Escape key and backdrop click", () => {
    let closed = false;
    const { rerender } = render(
      <ReportLoader isOpen={true} onClose={() => { closed = true; }} onReportLoaded={() => {}} />
    );

    expect(screen.getByRole("heading", { name: "Open a report" })).toBeInTheDocument();

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

    expect(screen.getByText(/Test titles that changed/)).toBeInTheDocument();
    expect(screen.getByText(/Modified in/)).toBeInTheDocument();
  });

  it("enforces tablist and tabpanel semantics once a report is open", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /How strong is the link/ }));

    expect(screen.getByRole("tablist", { name: "Report views" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /The Dig/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: /Code & tests/ })).toHaveAttribute("aria-selected", "false");
    expect(screen.getByRole("tabpanel")).toHaveAttribute("aria-labelledby", "tab-dig");
  });
});
