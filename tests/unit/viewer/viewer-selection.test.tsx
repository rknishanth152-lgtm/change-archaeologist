// @vitest-environment jsdom
/**
 * Change Archaeologist - Workspace Selection Tests
 *
 * Verifies one item is selected at a time, that the inspector follows it,
 * and that its evidence list contains only what relates to that item.
 */

import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

vi.mock("@monaco-editor/react", () => ({
  DiffEditor: () => <div data-testid="monaco-diff-editor" />,
  loader: { config: vi.fn() },
}));

if (typeof ResizeObserver === "undefined") {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
    onchange: null,
  }));
}

import { ViewerPage } from "../../../src/viewer/pages/ViewerPage.js";
import { DEMO_SCENARIO_E, DEMO_SCENARIO_F } from "../../../src/viewer/data/demo-fixtures.js";
import {
  evidenceForSelection,
  initialSelection,
  resolveEvidenceId,
} from "../../../src/viewer/utils/selection.js";
import { CROWDED_REPORT } from "../../helpers/crowded-report.js";

describe("selection helpers", () => {
  it("starts on the first code change", () => {
    expect(initialSelection(DEMO_SCENARIO_E)).toEqual({ kind: "change", id: "SC-001" });
  });

  it("starts with nothing selected when a report has nothing to select", () => {
    expect(initialSelection(DEMO_SCENARIO_F)).toBeNull();
  });

  it("limits evidence to the selected correlation", () => {
    const evidence = evidenceForSelection(DEMO_SCENARIO_E, { kind: "correlation", id: "CORR-ITEM-002" });
    expect(evidence.map((e) => e.id)).toEqual(["EV-001"]);
  });

  it("gathers evidence for a test from its correlations", () => {
    const evidence = evidenceForSelection(DEMO_SCENARIO_E, { kind: "test", id: "TC-001" });
    expect(evidence.map((e) => e.id)).toEqual(["EV-001", "EV-002"]);
  });

  it("returns no evidence for a test with no recorded links", () => {
    const report = { ...CROWDED_REPORT, correlationItems: [] };
    expect(evidenceForSelection(report, { kind: "test", id: "TC-001" })).toEqual([]);
  });

  it("shows all evidence when nothing is selected", () => {
    expect(evidenceForSelection(DEMO_SCENARIO_F, null)).toEqual(DEMO_SCENARIO_F.evidence);
  });

  it("keeps the preferred evidence only when it applies", () => {
    const evidence = evidenceForSelection(DEMO_SCENARIO_E, { kind: "test", id: "TC-001" });
    expect(resolveEvidenceId(evidence, "EV-002")).toBe("EV-002");
    expect(resolveEvidenceId(evidence, "EV-999")).toBe("EV-001");
    expect(resolveEvidenceId([], "EV-001")).toBeNull();
  });
});

describe("editor theme", () => {
  it("defines every color as hex, the only format Monaco can parse", async () => {
    vi.resetModules();
    const { registerEditorTheme } = await import("../../../src/viewer/components/CodeComparison.js");
    const defineTheme = vi.fn();
    registerEditorTheme({ editor: { defineTheme } } as never);

    expect(defineTheme).toHaveBeenCalled();
    for (const [, theme] of defineTheme.mock.calls) {
      for (const color of Object.values(theme.colors)) {
        expect(color).toMatch(/^#[0-9a-f]{6,8}$/i);
      }
    }
  });
});

describe("ViewerPage selection", () => {
  afterEach(cleanup);

  const inspector = () => within(screen.getByRole("complementary", { name: /Details of the selected item/ }));
  const openTab = (id: string) => fireEvent.click(document.getElementById(id) as HTMLElement);
  const click = (label: RegExp) => fireEvent.click(screen.getByRole("button", { name: label }));
  const openSample = () => {
    render(<ViewerPage />);
    click(/How strong is the link/);
  };

  it("starts on the start screen with no report", () => {
    render(<ViewerPage />);
    expect(screen.getByRole("button", { name: /Choose a report file/ })).toBeInTheDocument();
    expect(screen.queryByRole("tablist")).toBeNull();
  });

  it("opens a sample with a matching title and id", () => {
    openSample();
    expect(inspector().getByRole("heading", { name: "Returned Value or Output Changed" })).toBeInTheDocument();
    expect(inspector().getByText("SC-001")).toBeInTheDocument();
  });

  it("follows a test selection", () => {
    openSample();
    openTab("tab-code");
    click(/^tests\/order\.test\.ts/);

    expect(inspector().getByRole("heading", { name: "Test Calling Changed Function" })).toBeInTheDocument();
    expect(inspector().getByText("TC-001")).toBeInTheDocument();
  });

  it("follows a link selection and narrows its evidence", () => {
    openSample();
    click(/^WEAK link from SC-001/);

    expect(inspector().getByText("CORR-ITEM-002")).toBeInTheDocument();
    expect(within(inspector().getByRole("region", { name: "Evidence" })).getAllByRole("button")).toHaveLength(1);
  });

  it("returns to the finding's code change when a finding is selected", () => {
    openSample();
    openTab("tab-code");
    click(/^tests\/order\.test\.ts/);
    openTab("tab-findings");
    click(/^Return statement modified.*For information/);

    expect(inspector().getByText("SC-001")).toBeInTheDocument();
  });

  it("resets selection when another sample is shown", () => {
    openSample();
    openTab("tab-code");
    click(/^tests\/order\.test\.ts/);

    fireEvent.change(screen.getByRole("combobox", { name: "Open a sample report" }), { target: { value: "A" } });
    expect(inspector().getByRole("heading", { name: "Defensive Safety Check Removed" })).toBeInTheDocument();
  });
});
