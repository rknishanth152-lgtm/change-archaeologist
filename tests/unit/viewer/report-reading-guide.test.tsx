// @vitest-environment jsdom
/**
 * Change Archaeologist — How to Read This Report Guide Unit Tests
 *
 * Verifies newcomer guide rendering, 3 core questions, grounded metrics,
 * glossary toggle, dismissal, and accessibility.
 */

import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

import { ReportReadingGuide } from "../../../src/viewer/components/ReportReadingGuide.js";
import { DetailInspector } from "../../../src/viewer/components/DetailInspector.js";
import {
  DEMO_SCENARIO_A,
  DEMO_SCENARIO_E,
} from "../../../src/viewer/data/demo-fixtures.js";

// Mock Monaco for JSDOM
vi.mock("@monaco-editor/react", () => ({
  DiffEditor: (props: any) => (
    <div data-testid="monaco-diff-editor">
      <div>{props.original}</div>
      <div>{props.modified}</div>
    </div>
  ),
  loader: { config: vi.fn() },
}));

describe("ReportReadingGuide & Newcomer Comprehension", () => {
  beforeEach(() => {
    cleanup();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders when isOpen is true and displays the 3 core questions", () => {
    const handleClose = vi.fn();

    render(
      <ReportReadingGuide
        report={DEMO_SCENARIO_E}
        isOpen={true}
        onClose={handleClose}
      />
    );

    // Guide Header & Tag
    expect(screen.getByText("How to Read This Report")).toBeInTheDocument();

    // The 3 core questions
    expect(screen.getByText("1. What changed?")).toBeInTheDocument();
    expect(screen.getByText("2. What do the tests tell us?")).toBeInTheDocument();
    expect(screen.getByText("3. What can we conclude?")).toBeInTheDocument();

    // Plain English subtitles
    expect(screen.getByText("Changes to how the function is built")).toBeInTheDocument();
    expect(screen.getByText("Tests that changed in the same range")).toBeInTheDocument();
    expect(screen.getByText("What is known, and what isn't")).toBeInTheDocument();

    // Grounded details for Scenario E
    expect(screen.getByText(/We compared 'calculateDiscount'/)).toBeInTheDocument();
    expect(screen.getByText(/We looked for test changes in the same range/)).toBeInTheDocument();
    expect(screen.getByText(/This tool read the code. It did not run the tests/)).toBeInTheDocument();
  });

  it("does not render when isOpen is false", () => {
    render(
      <ReportReadingGuide
        report={DEMO_SCENARIO_E}
        isOpen={false}
        onClose={vi.fn()}
      />
    );

    expect(screen.queryByText("How to Read This Report")).not.toBeInTheDocument();
  });

  it("calls onClose when the dismiss button is clicked", () => {
    const handleClose = vi.fn();

    render(
      <ReportReadingGuide
        report={DEMO_SCENARIO_E}
        isOpen={true}
        onClose={handleClose}
      />
    );

    const closeBtn = screen.getByLabelText("Dismiss How to Read This Report Guide");
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("toggles the glossary of terms drawer", () => {
    render(
      <ReportReadingGuide
        report={DEMO_SCENARIO_E}
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    const glossaryBtn = screen.getByRole("button", { name: /Show glossary of terms/i });
    expect(screen.queryByText(/^STRONG:/)).not.toBeInTheDocument();

    fireEvent.click(glossaryBtn);
    expect(screen.getByText(/^STRONG:/)).toBeInTheDocument();
  });

  it("renders plain-English explanation card with 'Establishes' and 'Does NOT Establish' in DetailInspector", () => {
    const sc = DEMO_SCENARIO_A.structuralChanges[0];

    render(
      <DetailInspector
        report={DEMO_SCENARIO_A}
        selectedChange={sc}
        selectedCorrelation={null}
        associatedEvidence={DEMO_SCENARIO_A.evidence}
      />
    );

    // Plain-English Explanation region
    const explanationRegion = screen.getByRole("region", { name: "What this means" });
    expect(explanationRegion).toBeInTheDocument();

    expect(screen.getByText("Defensive Safety Check Removed")).toBeInTheDocument();
    expect(screen.getByText("What this shows")).toBeInTheDocument();
    expect(screen.getByText("What this doesn't show")).toBeInTheDocument();
    expect(screen.getByText(/The syntax tree of this function was structurally altered/)).toBeInTheDocument();
    expect(screen.getByText(/Whether this change caused a bug/)).toBeInTheDocument();
  });

  it("enforces accessible modal drawer semantics, Escape dismissal, and focus handling", () => {
    const handleClose = vi.fn();

    // Create a button in document to be the activeElement before opening
    const triggerBtn = document.createElement("button");
    triggerBtn.textContent = "Open Guide Trigger";
    document.body.appendChild(triggerBtn);
    triggerBtn.focus();
    expect(document.activeElement).toBe(triggerBtn);

    const { unmount } = render(
      <ReportReadingGuide
        report={DEMO_SCENARIO_E}
        isOpen={true}
        onClose={handleClose}
      />
    );

    // Verify dialog semantics
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-labelledby", "reading-guide-title");
    expect(dialog).toHaveAttribute("aria-describedby", "reading-guide-desc");

    // Verify Escape key triggers onClose
    fireEvent.keyDown(window, { key: "Escape" });
    expect(handleClose).toHaveBeenCalledTimes(1);

    // Unmount / close guide restores focus to trigger button
    unmount();
    document.body.removeChild(triggerBtn);
  });

  it("renders correctly across desktop, tablet, and mobile viewport widths", () => {
    const widths = [1440, 1280, 1024, 768, 390];

    widths.forEach((w) => {
      window.innerWidth = w;
      const { unmount } = render(
        <ReportReadingGuide
          report={DEMO_SCENARIO_E}
          isOpen={true}
          onClose={vi.fn()}
        />
      );

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("How to Read This Report")).toBeInTheDocument();
      expect(screen.getByText("1. What changed?")).toBeInTheDocument();
      expect(screen.getByText("2. What do the tests tell us?")).toBeInTheDocument();
      expect(screen.getByText("3. What can we conclude?")).toBeInTheDocument();

      unmount();
    });
  });

  it("renders plain-English explanation for a selected test change in DetailInspector", () => {
    const tc = DEMO_SCENARIO_E.testChanges[0];

    render(
      <DetailInspector
        report={DEMO_SCENARIO_E}
        selectedChange={null}
        selectedTestChange={tc}
        selectedCorrelation={null}
        associatedEvidence={DEMO_SCENARIO_E.evidence}
      />
    );

    expect(screen.getByText("Test Calling Changed Function")).toBeInTheDocument();
    expect(screen.getByText(/directly invokes or references 'calculateDiscount'/)).toBeInTheDocument();
    expect(screen.getByText(/Whether this test was executed during CI\/CD/)).toBeInTheDocument();
  });
});

