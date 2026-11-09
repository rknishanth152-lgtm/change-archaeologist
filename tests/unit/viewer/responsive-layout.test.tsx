// @vitest-environment jsdom
/**
 * Change Archaeologist — Work Package 3 Responsive Layout Test Suite
 *
 * Validates layout behavior, component presence, and interaction across
 * all 6 required viewports:
 * - 1664x926 (Large desktop / wide monitor)
 * - 1440x900 (Standard desktop laptop)
 * - 1280x720 (Compact desktop / HD)
 * - 1024x768 (Tablet landscape / small laptop)
 * - 768x900  (Tablet portrait)
 * - 390x844  (Mobile portrait / phone)
 *
 * Verifies Area A (Global Header), Area B (Code Comparison Toolbar), and
 * Area C (Correlation Graph Toolbar).
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

import { Navbar } from "../../../src/viewer/components/Navbar.js";
import { CodeComparisonToolbar } from "../../../src/viewer/components/CodeComparisonToolbar.js";
import { CorrelationGraph } from "../../../src/viewer/components/CorrelationGraph.js";
import {
  DEMO_SCENARIO_A,
  DEMO_SCENARIO_E,
} from "../../../src/viewer/data/demo-fixtures.js";
import type { EvidenceItem } from "../../../src/viewer/types/index.js";

const VIEWPORTS = [
  { name: "1664x926 (Large Desktop)", width: 1664, height: 926 },
  { name: "1440x900 (Standard Desktop)", width: 1440, height: 900 },
  { name: "1280x720 (Compact Desktop)", width: 1280, height: 720 },
  { name: "1024x768 (Tablet Landscape)", width: 1024, height: 768 },
  { name: "768x900 (Tablet Portrait)", width: 768, height: 900 },
  { name: "390x844 (Mobile Portrait)", width: 390, height: 844 },
] as const;

function setViewport(width: number, height: number) {
  Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: width });
  Object.defineProperty(window, "innerHeight", { writable: true, configurable: true, value: height });
  window.dispatchEvent(new Event("resize"));
}

describe("Responsive Viewport Validation Suite", () => {
  beforeEach(() => {
    cleanup();
  });

  afterEach(() => {
    cleanup();
  });

  describe("Area A: Global Application Header (Navbar)", () => {
    VIEWPORTS.forEach(({ name, width, height }) => {
      it(`renders branding and primary actions cleanly at ${name}`, () => {
        setViewport(width, height);
        const handleLoad = vi.fn();
        const handleToggleGuide = vi.fn();

        render(
          <Navbar
            report={DEMO_SCENARIO_E}
            onLoadClick={handleLoad}
            onSelectScenario={vi.fn()}
            onToggleGuide={handleToggleGuide}
            isGuideOpen={false}
          />
        );

        // Branding
        expect(screen.getByRole("heading", { level: 1, name: "Change Archaeologist" })).toBeInTheDocument();

        // Global actions: Import JSON and Guide
        const importBtn = screen.getByRole("button", { name: "Open a report" });
        expect(importBtn).toBeInTheDocument();
        fireEvent.click(importBtn);
        expect(handleLoad).toHaveBeenCalledTimes(1);

        const guideBtn = screen.getByRole("button", { name: /How to read this report/i });
        expect(guideBtn).toBeInTheDocument();
        fireEvent.click(guideBtn);
        expect(handleToggleGuide).toHaveBeenCalledTimes(1);

        // Subject context & commit bridge
        expect(screen.getByText("calculateDiscount()")).toBeInTheDocument();
        expect(screen.getByText(`${DEMO_SCENARIO_E.baseCommit.shortSha} → ${DEMO_SCENARIO_E.headCommit.shortSha}`)).toBeInTheDocument();
      });
    });
  });

  describe("Area B: Code Comparison Toolbar", () => {
    const mockEvidence: EvidenceItem[] = [
      {
        id: "EV-001",
        kind: "SOURCE_BEFORE",
        description: "Discount calculation logic modified",
        commitSha: "9a8bf4e",
        commitRole: "BASE",
        posixFilePath: "src/order.ts",
        span: { startLine: 14, startColumn: 3, endLine: 16, endColumn: 20 },
        codeSnippet: "if (!auth) throw new Error();",
      },
      {
        id: "EV-002",
        kind: "TEST_AFTER",
        description: "Test assertion added",
        commitSha: "a8265d8",
        commitRole: "HEAD",
        posixFilePath: "tests/order.test.ts",
        span: { startLine: 40, startColumn: 1, endLine: 42, endColumn: 30 },
        codeSnippet: "expect(discount).toBe(0.1);",
      },
    ];

    VIEWPORTS.forEach(({ name, width, height }) => {
      it(`renders diff mode toggle, coordinates, and evidence navigation at ${name}`, () => {
        setViewport(width, height);
        const handleDiffModeChange = vi.fn();
        const handleSelectEvidence = vi.fn();

        render(
          <CodeComparisonToolbar
            diffMode="side-by-side"
            onDiffModeChange={handleDiffModeChange}
            baseRevisionLabel="BASE (9a8bf4e)"
            headRevisionLabel="HEAD (a8265d8)"
            targetFunctionName="calculateDiscount"
            targetFilePath="src/order.ts"
            activeSpan={{ startLine: 14, startColumn: 3, endLine: 16, endColumn: 20 }}
            evidenceList={mockEvidence}
            selectedEvidenceId="EV-001"
            onSelectEvidence={handleSelectEvidence}
          />
        );

        // Diff mode layout toggle
        const sbsBtn = screen.getByRole("button", { name: "Side by side diff layout" });
        const unifiedBtn = screen.getByRole("button", { name: "Unified diff layout" });
        expect(sbsBtn).toBeInTheDocument();
        expect(unifiedBtn).toBeInTheDocument();

        fireEvent.click(unifiedBtn);
        expect(handleDiffModeChange).toHaveBeenCalledWith("unified");

        // Revision context
        expect(screen.getByText("BASE (9a8bf4e)")).toBeInTheDocument();
        expect(screen.getByText("HEAD (a8265d8)")).toBeInTheDocument();
        expect(screen.getByText("L14:C3-L16:C20")).toBeInTheDocument();

        // Evidence navigation stepper
        expect(screen.getByText("EV-001 (1/2)")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Previous evidence" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Next evidence" })).toBeInTheDocument();
      });
    });
  });

  describe("Area C: Correlation Graph Toolbar & Controls", () => {
    VIEWPORTS.forEach(({ name, width, height }) => {
      it(`renders graph header, search, filter chips, and accessible switch at ${name}`, () => {
        setViewport(width, height);

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

        // Header Title
        expect(screen.getByText("How this change reaches the tests")).toBeInTheDocument();

        // Mode switch
        expect(screen.getByRole("button", { name: "The Dig" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Table view/ })).toBeInTheDocument();

        // Under 768px the Accessible View opens with search; otherwise The Dig with its legend filter
        if (width >= 768) {
          expect(screen.getByRole("button", { name: "The Dig" })).toHaveAttribute("aria-pressed", "true");
          expect(screen.getByRole("button", { name: /^STRONG: direct/ })).toBeInTheDocument();
          expect(screen.getByRole("button", { name: /^WEAK: same file/ })).toBeInTheDocument();
          expect(screen.getByRole("button", { name: /^UNCERTAIN: unclear/ })).toBeInTheDocument();
        } else {
          expect(screen.getByRole("button", { name: /Table view/ })).toHaveAttribute("aria-pressed", "true");
          expect(screen.getByPlaceholderText("Search changes and tests")).toBeInTheDocument();
        }
      });
    });
  });
});
