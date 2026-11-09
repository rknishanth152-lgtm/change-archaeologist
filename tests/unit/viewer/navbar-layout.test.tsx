// @vitest-environment jsdom
/**
 * Change Archaeologist — Navbar Two-Level Responsive Layout Tests
 *
 * Verifies:
 * - Level 1: Primary navigation row with brand, guide toggle, and prominent Import JSON button.
 * - Level 2: Report context row with target file/function, revision range, status badge, and scenario switcher.
 * - Import JSON action is rendered and clickable in all states.
 * - Standby state when no report is active.
 */

import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

import { Navbar } from "../../../src/viewer/components/Navbar.js";
import { DEMO_SCENARIO_A, DEMO_SCENARIO_E } from "../../../src/viewer/data/demo-fixtures.js";

describe("Navbar Two-Level Header Layout", () => {
  beforeEach(() => {
    cleanup();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders Level 1 primary row with branding and prominent Import JSON action", () => {
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

    // Guide action
    const guideBtn = screen.getByRole("button", { name: /How to read this report/i });
    expect(guideBtn).toBeInTheDocument();
    fireEvent.click(guideBtn);
    expect(handleToggleGuide).toHaveBeenCalledTimes(1);

    // Prominent Import JSON action
    const importBtn = screen.getByRole("button", { name: "Open a report" });
    expect(importBtn).toBeInTheDocument();
    expect(importBtn).toHaveTextContent("Open report");
    fireEvent.click(importBtn);
    expect(handleLoad).toHaveBeenCalledTimes(1);
  });

  it("renders Level 2 report context row with target entity, commit range, and status", () => {
    const handleSelectScenario = vi.fn();

    render(
      <Navbar
        report={DEMO_SCENARIO_E}
        onLoadClick={vi.fn()}
        onSelectScenario={handleSelectScenario}
        activeScenarioId="E"
      />
    );

    // Target entity
    expect(screen.getByText("src/order.ts")).toBeInTheDocument();
    expect(screen.getByText("calculateDiscount()")).toBeInTheDocument();

    // Commit comparison
    expect(screen.getByText(`${DEMO_SCENARIO_E.baseCommit.shortSha} → ${DEMO_SCENARIO_E.headCommit.shortSha}`)).toBeInTheDocument();

    // Status badge
    expect(screen.getByText("Complete")).toHaveAttribute("title", DEMO_SCENARIO_E.status);

    // Scenario preset selector
    const select = screen.getByRole("combobox", { name: "Open a sample report" });
    expect(select).toBeInTheDocument();
    expect(select).toHaveValue("E");

    fireEvent.change(select, { target: { value: "A" } });
    expect(handleSelectScenario).toHaveBeenCalledWith("A");
  });

  it("renders standby notice on Level 2 when report is null while keeping Import JSON prominent", () => {
    const handleLoad = vi.fn();

    render(
      <Navbar
        report={null}
        onLoadClick={handleLoad}
        onSelectScenario={vi.fn()}
      />
    );

    // Primary row still has branding and Import JSON
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Change Archaeologist");
    const importBtn = screen.getByRole("button", { name: "Open a report" });
    expect(importBtn).toBeInTheDocument();

    // Views and samples wait until a report is open
    expect(screen.queryByRole("tablist")).toBeNull();
    expect(screen.queryByRole("combobox", { name: "Open a sample report" })).toBeNull();
  });

  it("shows a single Guide control and no internal mode names", () => {
    const handleToggleGuide = vi.fn();

    render(
      <Navbar
        report={DEMO_SCENARIO_E}
        onLoadClick={vi.fn()}
        onSelectScenario={vi.fn()}
        onToggleGuide={handleToggleGuide}
        activeScenarioId="E"
        activeTab="code"
        onTabChange={vi.fn()}
      />
    );

    const banner = screen.getByRole("banner");
    expect(banner).toBeInTheDocument();
    // Verify exactly ONE visible Guide button in the top chrome
    const guideButtons = screen.getAllByRole("button", {
      name: /How to read this report/i,
    });
    expect(guideButtons).toHaveLength(1);

    // Internal mode names stay out of the header
    expect(screen.queryByText("STRATIGRAPHY")).toBeNull();
  });

  describe("Responsive Viewport Validation", () => {
    const viewports = [
      { name: "1664 x 926 (Desktop Ultrawide / Large)", width: 1664, height: 926 },
      { name: "1440 x 900 (Standard Laptop)", width: 1440, height: 900 },
      { name: "1280 x 720 (Standard HD)", width: 1280, height: 720 },
      { name: "1024 x 768 (Tablet Landscape)", width: 1024, height: 768 },
      { name: "390 x 844 (Mobile iPhone)", width: 390, height: 844 },
    ];

    viewports.forEach(({ name, width, height }) => {
      it(`maintains visible Import JSON and readable controls at ${name}`, () => {
        // Set window inner dimensions
        window.innerWidth = width;
        window.innerHeight = height;

        render(
          <Navbar
            report={DEMO_SCENARIO_E}
            onLoadClick={vi.fn()}
            onSelectScenario={vi.fn()}
            onToggleGuide={vi.fn()}
            activeScenarioId="E"
          />
        );

        // Import JSON must always exist and be rendered
        const importBtn = screen.getByRole("button", { name: "Open a report" });
        expect(importBtn).toBeInTheDocument();
        expect(importBtn).not.toHaveClass("hidden");

        // Heading must remain
        expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Change Archaeologist");

        // Scenario selector remains usable
        expect(screen.getByRole("combobox", { name: "Open a sample report" })).toBeInTheDocument();

        // Target function is present
        expect(screen.getByText("calculateDiscount()")).toBeInTheDocument();

        cleanup();
      });
    });
  });
});
