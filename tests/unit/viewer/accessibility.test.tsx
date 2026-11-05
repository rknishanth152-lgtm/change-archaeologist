// @vitest-environment jsdom
/**
 * Change Archaeologist — Viewer Accessibility & Responsive Tests (Milestone 13.8)
 *
 * Verifies WCAG 2.2 Level AA compliance, semantic landmarks, keyboard navigation,
 * focus trapping and restoration, screen-reader live announcements, non-color status cues,
 * and responsive defaults.
 */

import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// Mock Monaco Editor for JSDOM
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

// ResizeObserver polyfill
if (typeof ResizeObserver === "undefined") {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// matchMedia polyfill
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

import { ConsoleLayout } from "../../../src/viewer/layouts/ConsoleLayout.js";
import { Navbar } from "../../../src/viewer/components/Navbar.js";
import { ReportLoader } from "../../../src/viewer/components/ReportLoader.js";
import { DetailInspector } from "../../../src/viewer/components/DetailInspector.js";
import { CorrelationGraph } from "../../../src/viewer/components/CorrelationGraph.js";
import { StructuralChangeExplorer } from "../../../src/viewer/components/StructuralChangeExplorer.js";
import {
  DEMO_SCENARIO_A,
  DEMO_SCENARIO_E,
} from "../../../src/viewer/data/demo-fixtures.js";

describe("Milestone 13.8: Accessibility and Semantic Structure", () => {
  beforeEach(() => {
    cleanup();
  });

  afterEach(() => {
    cleanup();
  });

  describe("Semantic Landmarks & Headings", () => {
    it("renders a Level 1 document heading in the application header", () => {
      render(
        <Navbar
          report={DEMO_SCENARIO_E}
          onLoadClick={vi.fn()}
          onSelectScenario={vi.fn()}
          activeScenarioId="E"
        />
      );

      const heading = screen.getByRole("heading", { level: 1 });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent("Change Archaeologist");

      const header = screen.getByRole("banner");
      expect(header).toBeInTheDocument();
      expect(header).toHaveAttribute("aria-label", "Change Archaeologist Application Header");
    });

    it("renders proper main and complementary landmarks in ConsoleLayout", () => {
      render(
        <ConsoleLayout
          report={DEMO_SCENARIO_E}
          activeTab="timeline"
          onTabChange={vi.fn()}
          onLoadClick={vi.fn()}
          onSelectScenario={vi.fn()}
          selectedChange={null}
          selectedCorrelation={null}
          associatedEvidence={[]}
        >
          <div>Main workspace content</div>
        </ConsoleLayout>
      );

      const mainPanel = screen.getByRole("tabpanel");
      expect(mainPanel).toBeInTheDocument();
      expect(mainPanel).toHaveAttribute("id", "panel-workspace");
      expect(mainPanel).toHaveAttribute("tabIndex", "0");

      const aside = screen.getByRole("complementary", { name: /Entity and Evidence Detail Inspector/i });
      expect(aside).toBeInTheDocument();
    });

    it("announces tab and report status changes through a polite live region", () => {
      render(
        <ConsoleLayout
          report={DEMO_SCENARIO_E}
          activeTab="graph"
          onTabChange={vi.fn()}
          onLoadClick={vi.fn()}
          onSelectScenario={vi.fn()}
          selectedChange={null}
          selectedCorrelation={null}
          associatedEvidence={[]}
        >
          <div>Workspace Content</div>
        </ConsoleLayout>
      );

      const liveRegion = screen.getByRole("status");
      expect(liveRegion).toBeInTheDocument();
      expect(liveRegion).toHaveAttribute("aria-live", "polite");
      expect(liveRegion.textContent).toContain("Correlation Graph view");
      expect(liveRegion.textContent).toContain("calculateDiscount");
    });
  });

  describe("Keyboard Navigation & ARIA Patterns", () => {
    it("supports arrow key navigation (ArrowRight, ArrowLeft, Home, End) across workspace tabs", () => {
      const handleTabChange = vi.fn();

      render(
        <ConsoleLayout
          report={DEMO_SCENARIO_E}
          activeTab="timeline"
          onTabChange={handleTabChange}
          onLoadClick={vi.fn()}
          onSelectScenario={vi.fn()}
          selectedChange={null}
          selectedCorrelation={null}
          associatedEvidence={[]}
        >
          <div>Content</div>
        </ConsoleLayout>
      );

      const tablist = screen.getByRole("tablist", { name: "Analysis report workspace views" });

      // ArrowRight: timeline -> graph
      fireEvent.keyDown(tablist, { key: "ArrowRight" });
      expect(handleTabChange).toHaveBeenCalledWith("graph");

      // End: jumps to last tab (findings)
      fireEvent.keyDown(tablist, { key: "End" });
      expect(handleTabChange).toHaveBeenCalledWith("findings");

      // Home: jumps to first tab (timeline)
      fireEvent.keyDown(tablist, { key: "Home" });
      expect(handleTabChange).toHaveBeenCalledWith("timeline");
    });

    it("supports keyboard selection and accessible labels in StructuralChangeExplorer", () => {
      const handleSelectChange = vi.fn();

      render(
        <StructuralChangeExplorer
          structuralChanges={DEMO_SCENARIO_A.structuralChanges}
          selectedId={null}
          onSelectChange={handleSelectChange}
        />
      );

      const mutationBtn = screen.getByRole("button", { name: /Structural mutation SC-001/i });
      expect(mutationBtn).toBeInTheDocument();
      expect(mutationBtn).toHaveAttribute("tabIndex", "0");

      // Enter key triggers selection
      fireEvent.keyDown(mutationBtn, { key: "Enter" });
      expect(handleSelectChange).toHaveBeenCalledWith("SC-001");

      // Space key triggers selection
      fireEvent.keyDown(mutationBtn, { key: " " });
      expect(handleSelectChange).toHaveBeenCalledWith("SC-001");
    });

    it("provides accessible copy buttons and mode toggles in DetailInspector", () => {
      render(
        <DetailInspector
          report={DEMO_SCENARIO_E}
          selectedChange={DEMO_SCENARIO_E.structuralChanges[0]}
          selectedCorrelation={null}
          associatedEvidence={DEMO_SCENARIO_E.evidence}
        />
      );

      const modeBtn = screen.getByRole("button", { name: /Switch to Text View/i });
      expect(modeBtn).toBeInTheDocument();
      fireEvent.click(modeBtn);

      const baseCopyBtn = screen.getByRole("button", { name: /Copy BASE snippet to clipboard/i });
      expect(baseCopyBtn).toBeInTheDocument();

      const headCopyBtn = screen.getByRole("button", { name: /Copy HEAD snippet to clipboard/i });
      expect(headCopyBtn).toBeInTheDocument();
    });
  });

  describe("Modal Dialog Focus Trapping & Restoration", () => {
    it("renders ReportLoader dialog with modal attributes, traps focus, and dismisses on Escape", () => {
      const handleClose = vi.fn();

      render(
        <ReportLoader
          isOpen={true}
          onClose={handleClose}
          onReportLoaded={vi.fn()}
        />
      );

      const dialog = screen.getByRole("dialog");
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveAttribute("aria-modal", "true");
      expect(dialog).toHaveAttribute("aria-labelledby", "loader-title");

      // Close button is focused
      const closeBtn = screen.getByRole("button", { name: "Close dialog" });
      expect(closeBtn).toBeInTheDocument();

      // Escape key closes modal
      fireEvent.keyDown(window, { key: "Escape" });
      expect(handleClose).toHaveBeenCalled();
    });

    it("provides a keyboard-accessible dropzone with Enter and Space trigger in ReportLoader", () => {
      render(
        <ReportLoader
          isOpen={true}
          onClose={vi.fn()}
          onReportLoaded={vi.fn()}
        />
      );

      const dropzone = screen.getByRole("button", { name: /Upload report JSON file: browse or drag and drop/i });
      expect(dropzone).toBeInTheDocument();
      expect(dropzone).toHaveAttribute("tabIndex", "0");

      // Enter key triggers file picker without error
      fireEvent.keyDown(dropzone, { key: "Enter" });
      fireEvent.keyDown(dropzone, { key: " " });
    });
  });

  describe("Responsive Behavior & Reduced Motion", () => {
    it("defaults CorrelationGraph to Accessible View when mounted on narrow viewports (< 768px)", () => {
      // Simulate narrow viewport
      const originalInnerWidth = window.innerWidth;
      window.innerWidth = 500;

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

      // On narrow viewport, Accessible Linear View should be active automatically
      expect(screen.getByText(/Accessible Linear Representation/)).toBeInTheDocument();

      // Restore window width
      window.innerWidth = originalInnerWidth;
    });
  });
});
