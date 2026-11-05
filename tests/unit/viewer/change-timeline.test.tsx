// @vitest-environment jsdom
/**
 * Change Archaeologist - Change Timeline Component Unit Tests
 *
 * Verifies commit-to-commit comparative change timeline rendering,
 * revision overview, epistemic humility notices, category filtering,
 * interactive card selection, evidence pill navigation, and incomplete state handling.
 */

import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

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

import { ChangeTimeline } from "../../../src/viewer/components/ChangeTimeline.js";
import {
  DEMO_SCENARIO_A,
  DEMO_SCENARIO_E,
  DEMO_SCENARIO_F,
} from "../../../src/viewer/data/demo-fixtures.js";

describe("ChangeTimeline Component", () => {
  beforeEach(() => {
    cleanup();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders BASE and HEAD revision cards with commit metadata", () => {
    const handleSelectChange = vi.fn();
    const handleSelectTestChange = vi.fn();
    const handleSelectEvidence = vi.fn();

    render(
      <ChangeTimeline
        report={DEMO_SCENARIO_A}
        selectedChangeId={null}
        selectedTestChangeId={null}
        selectedEvidenceId={null}
        onSelectChange={handleSelectChange}
        onSelectTestChange={handleSelectTestChange}
        onSelectEvidence={handleSelectEvidence}
      />
    );

    // Timeline heading
    expect(screen.getByText("Commit-to-Commit Change Timeline")).toBeInTheDocument();

    // BASE and HEAD labels
    expect(screen.getByText("BASE (PREVIOUS)")).toBeInTheDocument();
    expect(screen.getByText("HEAD (CURRENT)")).toBeInTheDocument();

    // Commit authors and subjects
    const authors = screen.getAllByText(DEMO_SCENARIO_A.baseCommit.authorName);
    expect(authors.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(DEMO_SCENARIO_A.baseCommit.subject)).toBeInTheDocument();
    expect(screen.getByText(DEMO_SCENARIO_A.headCommit.subject)).toBeInTheDocument();

    // Short SHAs
    expect(screen.getByText(DEMO_SCENARIO_A.baseCommit.sha.slice(0, 7))).toBeInTheDocument();
    expect(screen.getByText(DEMO_SCENARIO_A.headCommit.sha.slice(0, 7))).toBeInTheDocument();

    // Epistemic non-causality callout
    expect(screen.getByText(/Epistemic Non-Causality Principle/)).toBeInTheDocument();
  });

  it("renders Scenario A with 1 structural change and empty companion test notice", () => {
    render(
      <ChangeTimeline
        report={DEMO_SCENARIO_A}
        selectedChangeId="SC-001"
        selectedTestChangeId={null}
        selectedEvidenceId={null}
        onSelectChange={vi.fn()}
        onSelectTestChange={vi.fn()}
        onSelectEvidence={vi.fn()}
      />
    );

    // Structural change card should be present
    expect(screen.getByText("GUARD_CLAUSE")).toBeInTheDocument();
    const targetEntities = screen.getAllByText(/processPayment/);
    expect(targetEntities.length).toBeGreaterThanOrEqual(1);

    // Empty companion test track notice
    expect(
      screen.getByText(/No companion test mutations in this comparison/)
    ).toBeInTheDocument();
  });

  it("renders Scenario E with multi-track timeline including companion tests and declaration changes", () => {
    render(
      <ChangeTimeline
        report={DEMO_SCENARIO_E}
        selectedChangeId={null}
        selectedTestChangeId={null}
        selectedEvidenceId={null}
        onSelectChange={vi.fn()}
        onSelectTestChange={vi.fn()}
        onSelectEvidence={vi.fn()}
      />
    );

    // Check filter buttons with counts
    expect(screen.getByRole("button", { name: /All Changes/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Production Mutations/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Test Suite/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Correlated/ })).toBeInTheDocument();

    // Multiple changes should be rendered
    const itemCards = screen.getAllByRole("listitem");
    expect(itemCards.length).toBeGreaterThan(1);

    // Companion test should be present
    expect(screen.getByText("TC-001")).toBeInTheDocument();
    // Test declaration change should be present
    expect(screen.getByText("TDC-001")).toBeInTheDocument();
  });

  it("filters timeline items by category", () => {
    render(
      <ChangeTimeline
        report={DEMO_SCENARIO_E}
        selectedChangeId={null}
        selectedTestChangeId={null}
        selectedEvidenceId={null}
        onSelectChange={vi.fn()}
        onSelectTestChange={vi.fn()}
        onSelectEvidence={vi.fn()}
      />
    );

    // Initially all changes are shown
    const allItemsCount = screen.getAllByRole("listitem").length;

    // Filter to Production Mutations
    const prodButton = screen.getByRole("button", { name: /Production Mutations/ });
    fireEvent.click(prodButton);
    const prodItems = screen.getAllByRole("listitem");
    expect(prodItems.length).toBe(DEMO_SCENARIO_E.structuralChanges.length);

    // Filter to Test Suite
    const testButton = screen.getByRole("button", { name: /Test Suite/ });
    fireEvent.click(testButton);
    const testItems = screen.getAllByRole("listitem");
    const expectedTestCount =
      DEMO_SCENARIO_E.testChanges.length + (DEMO_SCENARIO_E.declarationChanges?.length ?? 0);
    expect(testItems.length).toBe(expectedTestCount);
  });

  it("renders Scenario F incomplete analysis banner and target function deleted state", () => {
    render(
      <ChangeTimeline
        report={DEMO_SCENARIO_F}
        selectedChangeId={null}
        selectedTestChangeId={null}
        selectedEvidenceId={null}
        onSelectChange={vi.fn()}
        onSelectTestChange={vi.fn()}
        onSelectEvidence={vi.fn()}
      />
    );

    // Incomplete analysis banner
    expect(screen.getByText("Comparative Analysis Incomplete")).toBeInTheDocument();
    expect(
      screen.getByText(/Target function 'deprecatedHelper' was not found in HEAD revision/)
    ).toBeInTheDocument();

    // HEAD revision badge should indicate DELETED
    expect(screen.getByText("[DELETED IN HEAD]")).toBeInTheDocument();
  });

  it("invokes onSelectChange and onSelectEvidence when a structural change card is clicked", () => {
    const handleSelectChange = vi.fn();
    const handleSelectTestChange = vi.fn();
    const handleSelectEvidence = vi.fn();

    render(
      <ChangeTimeline
        report={DEMO_SCENARIO_A}
        selectedChangeId={null}
        selectedTestChangeId={null}
        selectedEvidenceId={null}
        onSelectChange={handleSelectChange}
        onSelectTestChange={handleSelectTestChange}
        onSelectEvidence={handleSelectEvidence}
      />
    );

    const changeCard = screen.getByRole("listitem");
    fireEvent.click(changeCard);

    expect(handleSelectChange).toHaveBeenCalledWith("SC-001");
    // SC-001 has associated evidence EV-001, so onSelectEvidence should be called
    expect(handleSelectEvidence).toHaveBeenCalledWith("EV-001");
  });

  it("invokes onSelectEvidence directly when an evidence pill is clicked", () => {
    const handleSelectChange = vi.fn();
    const handleSelectTestChange = vi.fn();
    const handleSelectEvidence = vi.fn();

    render(
      <ChangeTimeline
        report={DEMO_SCENARIO_A}
        selectedChangeId={null}
        selectedTestChangeId={null}
        selectedEvidenceId={null}
        onSelectChange={handleSelectChange}
        onSelectTestChange={handleSelectTestChange}
        onSelectEvidence={handleSelectEvidence}
      />
    );

    const evidencePill = screen.getByRole("button", { name: "EV-001" });
    fireEvent.click(evidencePill);

    expect(handleSelectEvidence).toHaveBeenCalledWith("EV-001");
  });

  it("supports keyboard navigation with Enter and Space keys", () => {
    const handleSelectChange = vi.fn();
    const handleSelectTestChange = vi.fn();
    const handleSelectEvidence = vi.fn();

    render(
      <ChangeTimeline
        report={DEMO_SCENARIO_A}
        selectedChangeId={null}
        selectedTestChangeId={null}
        selectedEvidenceId={null}
        onSelectChange={handleSelectChange}
        onSelectTestChange={handleSelectTestChange}
        onSelectEvidence={handleSelectEvidence}
      />
    );

    const changeCard = screen.getByRole("listitem");

    // Enter key
    fireEvent.keyDown(changeCard, { key: "Enter" });
    expect(handleSelectChange).toHaveBeenCalledWith("SC-001");

    // Space key
    handleSelectChange.mockClear();
    fireEvent.keyDown(changeCard, { key: " " });
    expect(handleSelectChange).toHaveBeenCalledWith("SC-001");
  });
});
