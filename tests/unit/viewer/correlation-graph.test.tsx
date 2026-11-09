// @vitest-environment jsdom
/**
 * Change Archaeologist - Correlation View Component Tests
 *
 * Verifies The Dig renders real report entities, selection reports through
 * the shared callbacks, and the Accessible View exposes the same relationships.
 */

import React from "react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

if (typeof ResizeObserver === "undefined") {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

import { CorrelationGraph } from "../../../src/viewer/components/CorrelationGraph.js";
import {
  DEMO_SCENARIO_A,
  DEMO_SCENARIO_E,
  DEMO_SCENARIO_F,
} from "../../../src/viewer/data/demo-fixtures.js";
import type { AnalysisReport } from "../../../src/viewer/types/index.js";
import { CROWDED_REPORT } from "../../helpers/crowded-report.js";

function renderGraph(report: AnalysisReport) {
  const handlers = {
    onSelectChange: vi.fn(),
    onSelectTestChange: vi.fn(),
    onSelectEvidence: vi.fn(),
    onSelectCorrelation: vi.fn(),
  };
  render(
    <CorrelationGraph
      report={report}
      selectedChangeId={null}
      selectedTestChangeId={null}
      selectedEvidenceId={null}
      selectedCorrelationId={null}
      {...handlers}
    />
  );
  return handlers;
}

const openAccessibleView = () => fireEvent.click(screen.getByRole("button", { name: /Table view/ }));
const strongShaft = () => screen.getByRole("button", { name: /STRONG link from SC-001 to TC-001/ });

describe("The Dig", () => {
  afterEach(cleanup);

  it("opens on The Dig with its layers and the real function source", () => {
    renderGraph(DEMO_SCENARIO_E);

    expect(screen.getByRole("button", { name: "The Dig" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Your code, before")).toBeInTheDocument();
    expect(screen.getByText("Tests changed in this range")).toBeInTheDocument();
    expect(screen.getByText(/Never dug:/)).toBeInTheDocument();
    expect(screen.getByText("return price * 0.15;")).toBeInTheDocument();
  });

  it("draws the file-level WEAK link alongside the STRONG one", () => {
    renderGraph(DEMO_SCENARIO_E);

    expect(strongShaft()).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /WEAK link from SC-001 to tests\/order\.test\.ts/ })).toBeInTheDocument();
  });

  it("selects a correlation, shows the three-part explanation, and flags a verdict conflict", () => {
    const handlers = renderGraph(DEMO_SCENARIO_E);
    fireEvent.click(strongShaft());

    expect(handlers.onSelectCorrelation).toHaveBeenCalledWith("CORR-ITEM-001");
    expect(handlers.onSelectEvidence).toHaveBeenCalledWith("EV-001");
    expect(strongShaft()).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("heading", { name: "STRONG link" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "What we can't tell" })).toBeInTheDocument();
    expect(screen.getByText(/overall verdict for SC-001 is WEAK/)).toBeInTheDocument();
  });

  it("opens evidence from the detail panel", () => {
    const handlers = renderGraph(DEMO_SCENARIO_E);
    fireEvent.click(strongShaft());
    fireEvent.click(screen.getByRole("button", { name: "EV-002" }));
    expect(handlers.onSelectEvidence).toHaveBeenLastCalledWith("EV-002");
  });

  it("selects a code change from its fault", () => {
    const handlers = renderGraph(DEMO_SCENARIO_E);
    fireEvent.click(screen.getByRole("button", { name: /^Changed: Return statement modified/ }));
    expect(handlers.onSelectChange).toHaveBeenCalledWith("SC-001");
  });

  it("selects a test and says the code was not run", () => {
    const handlers = renderGraph(DEMO_SCENARIO_E);
    fireEvent.click(screen.getByRole("button", { name: /^Test change: order calculation/ }));

    expect(handlers.onSelectTestChange).toHaveBeenCalledWith("TC-001");
    expect(screen.getByText(/did not run it/)).toBeInTheDocument();
  });

  it("supports the keyboard and clears focus with Escape or a second click", () => {
    renderGraph(DEMO_SCENARIO_E);

    fireEvent.keyDown(strongShaft(), { key: "Enter" });
    expect(strongShaft()).toHaveAttribute("aria-pressed", "true");

    fireEvent.keyDown(strongShaft(), { key: "Escape" });
    expect(strongShaft()).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(strongShaft());
    fireEvent.click(strongShaft());
    expect(strongShaft()).toHaveAttribute("aria-pressed", "false");
  });

  it("uses the legend as a status filter and disables statuses with no links", () => {
    renderGraph(DEMO_SCENARIO_E);

    const weak = screen.getByRole("button", { name: /^WEAK: same file/ });
    fireEvent.click(weak);
    expect(weak).toHaveAttribute("aria-pressed", "true");
    expect(strongShaft().getAttribute("class")).toContain("dig-dimmed");
    expect(screen.getByRole("button", { name: /^UNCERTAIN: unclear/ })).toBeDisabled();
  });

  it("keeps absence honest when a report has no test changes", () => {
    renderGraph(DEMO_SCENARIO_A);
    expect(screen.getByText(/does not mean the code is untested/)).toBeInTheDocument();
  });

  it("shows a missing function as a broken layer", () => {
    renderGraph(DEMO_SCENARIO_F);
    expect(screen.getByText("Function not found in this version")).toBeInTheDocument();
      });

  it("compresses long functions on demand and notes unanchored links", () => {
    renderGraph(CROWDED_REPORT);

    expect(screen.getAllByText(/lines hidden/).length).toBeGreaterThan(0);
    expect(screen.getByText(/1 recorded link isn't tied/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Show all lines" }));
    expect(screen.queryByText(/lines hidden/)).toBeNull();
    expect(screen.getByRole("button", { name: "Hide unchanged lines" })).toBeInTheDocument();
  });
});

describe("Accessible View", () => {
  afterEach(cleanup);

  it("lists production entities, tests, and correlation links", () => {
    renderGraph(DEMO_SCENARIO_E);
    openAccessibleView();

    expect(screen.getByText(/Everything in The Dig as a list/)).toBeInTheDocument();
    expect(screen.getByText("SC-001")).toBeInTheDocument();
    expect(screen.getByText("TC-001")).toBeInTheDocument();
    expect(screen.getByText("TDC-001")).toBeInTheDocument();
    expect(screen.getByText("STRONG")).toBeInTheDocument();
  });

  it("includes the file-level link and reports its selection", () => {
    const handlers = renderGraph(DEMO_SCENARIO_E);
    openAccessibleView();

    expect(screen.getByText(/^Links \(2\)/)).toBeInTheDocument();
    const row = screen.getByText("WEAK").closest('[role="listitem"]');
    fireEvent.click(row as Element);
    expect(handlers.onSelectCorrelation).toHaveBeenCalledWith("CORR-ITEM-002");
  });

  it("shows an empty-test notice for Scenario A", () => {
    renderGraph(DEMO_SCENARIO_A);
    openAccessibleView();

    expect(screen.getByText("processPayment()")).toBeInTheDocument();
    expect(
      screen.getByText(/No test changes in this report/)
    ).toBeInTheDocument();
  });

  it("selects a mutation and its evidence", () => {
    const handlers = renderGraph(DEMO_SCENARIO_A);
    openAccessibleView();

    fireEvent.click(screen.getByText("SC-001").closest('[role="listitem"]') as Element);
    expect(handlers.onSelectChange).toHaveBeenCalledWith("SC-001");
    expect(handlers.onSelectEvidence).toHaveBeenCalledWith("EV-001");
  });

  it("selects a drawn correlation link", () => {
    const handlers = renderGraph(DEMO_SCENARIO_E);
    openAccessibleView();

    fireEvent.click(screen.getByText("STRONG").closest('[role="listitem"]') as Element);
    expect(handlers.onSelectCorrelation).toHaveBeenCalledWith("CORR-ITEM-001");
  });

  it("filters by search and clears", () => {
    renderGraph(DEMO_SCENARIO_E);
    openAccessibleView();

    const input = screen.getByPlaceholderText("Search changes and tests");
    fireEvent.change(input, { target: { value: "calculate" } });
    expect(screen.getByText(/calculateDiscount/)).toBeInTheDocument();
    expect(screen.queryByText("TC-001")).toBeNull();

    fireEvent.click(screen.getByTitle("Clear search"));
    expect(input).toHaveValue("");
    expect(screen.getByText("TC-001")).toBeInTheDocument();
  });
});
