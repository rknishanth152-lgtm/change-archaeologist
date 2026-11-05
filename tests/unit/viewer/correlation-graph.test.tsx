// @vitest-environment jsdom
/**
 * Change Archaeologist - Correlation Graph Component Tests
 *
 * Verifies interactive Production-Test Correlation Graph rendering,
 * visual vs accessible mode switching, legend, Scenario A through F,
 * and keyboard/selection navigation.
 */

import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// Polyfill ResizeObserver for JSDOM
if (typeof ResizeObserver === "undefined") {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// Polyfill matchMedia for JSDOM
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

import { CorrelationGraph } from "../../../src/viewer/components/CorrelationGraph.js";
import {
  DEMO_SCENARIO_A,
  DEMO_SCENARIO_E,
  DEMO_SCENARIO_F,
} from "../../../src/viewer/data/demo-fixtures.js";

describe("CorrelationGraph Component", () => {
  beforeEach(() => {
    cleanup();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders graph toolbar, title, and summary metrics", () => {
    render(
      <CorrelationGraph
        report={DEMO_SCENARIO_E}
        selectedChangeId={null}
        selectedTestChangeId={null}
        selectedEvidenceId={null}
        selectedCorrelationId={null}
        onSelectChange={vi.fn()}
        onSelectTestChange={vi.fn()}
        onSelectEvidence={vi.fn()}
        onSelectCorrelation={vi.fn()}
      />
    );

    expect(screen.getByText("Production-Test Correlation Graph")).toBeInTheDocument();
    expect(screen.getByText("Visual Graph")).toBeInTheDocument();
    expect(screen.getByText("Accessible View")).toBeInTheDocument();

    // Summary metric text: "2 Prod / 3 Test / 1 Corr"
    expect(screen.getByText(/Prod \/.*Test \/.*Corr/)).toBeInTheDocument();
  });

  it("switches to accessible view when Accessible View button is clicked", () => {
    render(
      <CorrelationGraph
        report={DEMO_SCENARIO_E}
        selectedChangeId={null}
        selectedTestChangeId={null}
        selectedEvidenceId={null}
        selectedCorrelationId={null}
        onSelectChange={vi.fn()}
        onSelectTestChange={vi.fn()}
        onSelectEvidence={vi.fn()}
        onSelectCorrelation={vi.fn()}
      />
    );

    const accessibleBtn = screen.getByRole("button", { name: /Accessible View/ });
    fireEvent.click(accessibleBtn);

    expect(screen.getByText(/Accessible Linear Representation/)).toBeInTheDocument();
    expect(screen.getByText(/1. Production Function & Structural Mutations/)).toBeInTheDocument();
    expect(screen.getByText(/2. Companion Test Files & Changes/)).toBeInTheDocument();
    expect(screen.getByText(/3. Analytical Correlation Links/)).toBeInTheDocument();
  });

  it("renders Scenario A with 1 production mutation and empty test notice in accessible view", () => {
    render(
      <CorrelationGraph
        report={DEMO_SCENARIO_A}
        selectedChangeId={null}
        selectedTestChangeId={null}
        selectedEvidenceId={null}
        selectedCorrelationId={null}
        onSelectChange={vi.fn()}
        onSelectTestChange={vi.fn()}
        onSelectEvidence={vi.fn()}
        onSelectCorrelation={vi.fn()}
      />
    );

    const accessibleBtn = screen.getByRole("button", { name: /Accessible View/ });
    fireEvent.click(accessibleBtn);

    // Target function and SC-001 should be present
    expect(screen.getByText("processPayment()")).toBeInTheDocument();
    expect(screen.getByText("SC-001")).toBeInTheDocument();

    // Notice that test side is empty
    expect(
      screen.getByText(/No companion test files or test assertion changes recorded in this report/)
    ).toBeInTheDocument();
  });

  it("renders Scenario E correlation links with STRONG status in accessible view", () => {
    render(
      <CorrelationGraph
        report={DEMO_SCENARIO_E}
        selectedChangeId={null}
        selectedTestChangeId={null}
        selectedEvidenceId={null}
        selectedCorrelationId={null}
        onSelectChange={vi.fn()}
        onSelectTestChange={vi.fn()}
        onSelectEvidence={vi.fn()}
        onSelectCorrelation={vi.fn()}
      />
    );

    const accessibleBtn = screen.getByRole("button", { name: /Accessible View/ });
    fireEvent.click(accessibleBtn);

    // Structural change SC-001
    expect(screen.getByText("SC-001")).toBeInTheDocument();
    // Test change TC-001
    expect(screen.getByText("TC-001")).toBeInTheDocument();
    // Declaration change TDC-001
    expect(screen.getByText("TDC-001")).toBeInTheDocument();

    // Correlation edge badge
    expect(screen.getByText("STRONG CORRELATION")).toBeInTheDocument();
  });

  it("renders Scenario F incomplete analysis boundary banner", () => {
    render(
      <CorrelationGraph
        report={DEMO_SCENARIO_F}
        selectedChangeId={null}
        selectedTestChangeId={null}
        selectedEvidenceId={null}
        selectedCorrelationId={null}
        onSelectChange={vi.fn()}
        onSelectTestChange={vi.fn()}
        onSelectEvidence={vi.fn()}
        onSelectCorrelation={vi.fn()}
      />
    );

    expect(screen.getByText("Comparative Analysis Incomplete:")).toBeInTheDocument();
  });

  it("triggers onSelectChange and onSelectEvidence when a mutation card is clicked", () => {
    const handleSelectChange = vi.fn();
    const handleSelectEvidence = vi.fn();

    render(
      <CorrelationGraph
        report={DEMO_SCENARIO_A}
        selectedChangeId={null}
        selectedTestChangeId={null}
        selectedEvidenceId={null}
        selectedCorrelationId={null}
        onSelectChange={handleSelectChange}
        onSelectTestChange={vi.fn()}
        onSelectEvidence={handleSelectEvidence}
        onSelectCorrelation={vi.fn()}
      />
    );

    const accessibleBtn = screen.getByRole("button", { name: /Accessible View/ });
    fireEvent.click(accessibleBtn);

    const scCard = screen.getByText("SC-001").closest('[role="listitem"]');
    expect(scCard).not.toBeNull();
    if (scCard) {
      fireEvent.click(scCard);
      expect(handleSelectChange).toHaveBeenCalledWith("SC-001");
      expect(handleSelectEvidence).toHaveBeenCalledWith("EV-001");
    }
  });

  it("triggers onSelectCorrelation when a correlation link card is clicked", () => {
    const handleSelectCorrelation = vi.fn();
    const handleSelectEvidence = vi.fn();

    render(
      <CorrelationGraph
        report={DEMO_SCENARIO_E}
        selectedChangeId={null}
        selectedTestChangeId={null}
        selectedEvidenceId={null}
        selectedCorrelationId={null}
        onSelectChange={vi.fn()}
        onSelectTestChange={vi.fn()}
        onSelectEvidence={handleSelectEvidence}
        onSelectCorrelation={handleSelectCorrelation}
      />
    );

    const accessibleBtn = screen.getByRole("button", { name: /Accessible View/ });
    fireEvent.click(accessibleBtn);

    const corrCard = screen.getByText("STRONG CORRELATION").closest('[role="listitem"]');
    expect(corrCard).not.toBeNull();
    if (corrCard) {
      fireEvent.click(corrCard);
      expect(handleSelectCorrelation).toHaveBeenCalled();
    }
  });

  it("displays Graph Legend with calibration statuses and non-causality principle", () => {
    render(
      <CorrelationGraph
        report={DEMO_SCENARIO_E}
        selectedChangeId={null}
        selectedTestChangeId={null}
        selectedEvidenceId={null}
        selectedCorrelationId={null}
        onSelectChange={vi.fn()}
        onSelectTestChange={vi.fn()}
        onSelectEvidence={vi.fn()}
        onSelectCorrelation={vi.fn()}
      />
    );

    expect(screen.getByText("Graph Legend & Calibration")).toBeInTheDocument();
    expect(screen.getByText("Node Categories")).toBeInTheDocument();
    expect(screen.getByText("Correlation Edge Statuses")).toBeInTheDocument();
    expect(screen.getByText(/Non-Causality Principle:/)).toBeInTheDocument();
  });

  it("renders the Fit View button and domain guide overlay in visual graph mode", () => {
    render(
      <CorrelationGraph
        report={DEMO_SCENARIO_E}
        selectedChangeId={null}
        selectedTestChangeId={null}
        selectedEvidenceId={null}
        selectedCorrelationId={null}
        onSelectChange={vi.fn()}
        onSelectTestChange={vi.fn()}
        onSelectEvidence={vi.fn()}
        onSelectCorrelation={vi.fn()}
      />
    );

    // Fit View button
    const fitViewBtn = screen.getByRole("button", { name: /Fit view to all nodes/ });
    expect(fitViewBtn).toBeInTheDocument();
    fireEvent.click(fitViewBtn); // Should not throw

    // Domain guide overlay banner
    expect(screen.getByText("Production Domain")).toBeInTheDocument();
    expect(screen.getByText("Test Domain")).toBeInTheDocument();
  });

  it("toggles Focus Mode and displays active 1-hop network banner for selected mutation", () => {
    render(
      <CorrelationGraph
        report={DEMO_SCENARIO_E}
        selectedChangeId="SC-001"
        selectedTestChangeId={null}
        selectedEvidenceId={null}
        selectedCorrelationId={null}
        onSelectChange={vi.fn()}
        onSelectTestChange={vi.fn()}
        onSelectEvidence={vi.fn()}
        onSelectCorrelation={vi.fn()}
      />
    );

    const focusBtn = screen.getByRole("button", { name: /Focus Mode/ });
    expect(focusBtn).toBeInTheDocument();
    expect(focusBtn).toHaveAttribute("aria-pressed", "false");

    // Click to activate focus mode
    fireEvent.click(focusBtn);
    expect(focusBtn).toHaveAttribute("aria-pressed", "true");

    // Focus mode banner should be visible with target SC-001
    expect(screen.getByText(/Focus Mode:/)).toBeInTheDocument();
    expect(screen.getAllByText("SC-001").length).toBeGreaterThanOrEqual(1);

    // Click Exit Focus
    const exitBtn = screen.getByText("Exit Focus");
    fireEvent.click(exitBtn);
    expect(focusBtn).toHaveAttribute("aria-pressed", "false");
  });

  it("renders search filter input, category filter pills, and status filter pills in sub-toolbar", () => {
    render(
      <CorrelationGraph
        report={DEMO_SCENARIO_E}
        selectedChangeId={null}
        selectedTestChangeId={null}
        selectedEvidenceId={null}
        selectedCorrelationId={null}
        onSelectChange={vi.fn()}
        onSelectTestChange={vi.fn()}
        onSelectEvidence={vi.fn()}
        onSelectCorrelation={vi.fn()}
      />
    );

    // Search input
    const searchInput = screen.getByPlaceholderText("Search nodes or coordinates...");
    expect(searchInput).toBeInTheDocument();

    // Category filter pills
    expect(screen.getByText("Scope:")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Production" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tests" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Correlated" })).toBeInTheDocument();

    // Status filter pills
    expect(screen.getByText("Status:")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "STRONG" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "WEAK" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "UNCERTAIN" })).toBeInTheDocument();
  });

  it("filters nodes in accessible view when search query is entered", () => {
    render(
      <CorrelationGraph
        report={DEMO_SCENARIO_E}
        selectedChangeId={null}
        selectedTestChangeId={null}
        selectedEvidenceId={null}
        selectedCorrelationId={null}
        onSelectChange={vi.fn()}
        onSelectTestChange={vi.fn()}
        onSelectEvidence={vi.fn()}
        onSelectCorrelation={vi.fn()}
      />
    );

    // Switch to accessible view
    const accessibleBtn = screen.getByRole("button", { name: /Accessible View/ });
    fireEvent.click(accessibleBtn);

    // Both SC-001 and TC-001 initially present
    expect(screen.getByText("SC-001")).toBeInTheDocument();
    expect(screen.getByText("TC-001")).toBeInTheDocument();

    // Type "calculate" into search input
    const searchInput = screen.getByPlaceholderText("Search nodes or coordinates...");
    fireEvent.change(searchInput, { target: { value: "calculate" } });

    // Target function / SC-001 matching "calculate" is present
    expect(screen.getByText(/calculateDiscount/)).toBeInTheDocument();

    // Clear search
    const clearBtn = screen.getByTitle("Clear search");
    fireEvent.click(clearBtn);
    expect(searchInput).toHaveValue("");
  });

  it("displays dedicated correlation edge inspection card when selectedCorrelationId is set", () => {
    const handleSelectEvidence = vi.fn();
    render(
      <CorrelationGraph
        report={DEMO_SCENARIO_E}
        selectedChangeId={null}
        selectedTestChangeId={null}
        selectedEvidenceId={null}
        selectedCorrelationId="CORR-ITEM-001"
        onSelectChange={vi.fn()}
        onSelectTestChange={vi.fn()}
        onSelectEvidence={handleSelectEvidence}
        onSelectCorrelation={vi.fn()}
      />
    );

    // Correlation card header
    expect(screen.getByText("STRONG Correlation")).toBeInTheDocument();
    expect(screen.getAllByText("SC-001").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("TC-001").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Does not establish:/)).toBeInTheDocument();

    // Evidence button in card
    const evBtn = screen.getByRole("button", { name: "EV-001" });
    expect(evBtn).toBeInTheDocument();
    fireEvent.click(evBtn);
    expect(handleSelectEvidence).toHaveBeenCalledWith("EV-001");
  });

  it("toggles minimap and graph legend visibility buttons", () => {
    render(
      <CorrelationGraph
        report={DEMO_SCENARIO_E}
        selectedChangeId={null}
        selectedTestChangeId={null}
        selectedEvidenceId={null}
        selectedCorrelationId={null}
        onSelectChange={vi.fn()}
        onSelectTestChange={vi.fn()}
        onSelectEvidence={vi.fn()}
        onSelectCorrelation={vi.fn()}
      />
    );

    const legendTitle = () => screen.queryByText("Graph Legend & Calibration");
    expect(legendTitle()).toBeInTheDocument();

    const toggleLegendBtn = screen.getByRole("button", { name: "Toggle graph legend" });
    fireEvent.click(toggleLegendBtn);
    expect(legendTitle()).toBeNull();

    fireEvent.click(toggleLegendBtn);
    expect(legendTitle()).toBeInTheDocument();
  });
});

