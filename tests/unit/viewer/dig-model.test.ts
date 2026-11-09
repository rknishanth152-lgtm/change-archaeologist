/**
 * Change Archaeologist - The Dig model and layout tests
 *
 * Verifies The Dig draws only what a report contains, keeps every correlation
 * visible, and stays within bounds on crowded reports.
 */

import { describe, it, expect } from "vitest";
import {
  DEMO_SCENARIO_A,
  DEMO_SCENARIO_E,
  DEMO_SCENARIO_F,
} from "../../../src/viewer/data/demo-fixtures.js";
import { buildDigModel, relatedToFocus } from "../../../src/viewer/utils/dig-model.js";
import { DIG_MIN_WIDTH, layoutDig, truncate } from "../../../src/viewer/utils/dig-layout.js";
import { buildCorrelationGraphModel } from "../../../src/viewer/utils/graph-model.js";
import { loadReportFromJsonString } from "../../../src/viewer/utils/report-loader.js";
import { CROWDED_REPORT } from "../../helpers/crowded-report.js";

describe("buildDigModel", () => {
  it("draws the whole function in both versions and marks the changed line", () => {
    const model = buildDigModel(DEMO_SCENARIO_E);
    expect(model.base.state).toBe("PRESENT");
    expect(model.head.lineCount).toBe(6);

    const row = model.head.rows[4];
    expect(row.kind === "line" && row.line.number).toBe(5);
    expect(row.kind === "line" && row.line.changeType).toBe("MODIFIED");
  });

  it("keeps a file-level correlation that has no test-change id", () => {
    const shafts = buildDigModel(DEMO_SCENARIO_E).shafts;
    expect(shafts).toHaveLength(2);

    const fileLevel = shafts.find((s) => s.id === "CORR-ITEM-002");
    expect(fileLevel?.status).toBe("WEAK");
    expect(fileLevel?.end).toBe("FILE");
  });

  it("flags when a link's status differs from the report-level verdict", () => {
    const strong = buildDigModel(DEMO_SCENARIO_E).shafts.find((s) => s.id === "CORR-ITEM-001");
    expect(strong?.conflictingResult).toEqual({ id: "CORR-001", status: "WEAK" });
  });

  it("does not invent links when the report records none", () => {
    const model = buildDigModel(DEMO_SCENARIO_A);
    expect(model.shafts).toHaveLength(0);
    expect(model.unprobedFaultIds).toEqual(["SC-001"]);
    expect(model.testFiles).toHaveLength(0);
  });

  it("marks a function missing from HEAD as absent and the report as incomplete", () => {
    const model = buildDigModel(DEMO_SCENARIO_F);
    expect(model.head.state).toBe("ABSENT");
    expect(model.base.state).toBe("PRESENT");
    expect(model.isIncomplete).toBe(true);
    expect(model.verdict).toContain("not found in HEAD");
  });

  it("falls back to report-level results when correlation items are absent", () => {
    const model = buildDigModel({ ...DEMO_SCENARIO_E, correlationItems: undefined });
    expect(model.shafts).toHaveLength(1);
    expect(model.shafts[0].correlationItemId).toBeNull();
    expect(model.shafts[0].end).toBe("ASSERTION");
  });

  it("ends NONE links in open ground even when a file is named", () => {
    const report = {
      ...DEMO_SCENARIO_E,
      correlationItems: [{ ...DEMO_SCENARIO_E.correlationItems![1], status: "NONE" as const }],
    };
    expect(buildDigModel(report).shafts[0].end).toBe("OPEN");
  });

  it("hides unchanged runs in long functions and can show them all", () => {
    const compressed = buildDigModel(CROWDED_REPORT);
    expect(compressed.hiddenLineCount).toBeGreaterThan(20);
    expect(compressed.base.rows.some((r) => r.kind === "gap")).toBe(true);

    const expanded = buildDigModel(CROWDED_REPORT, { expandAll: true });
    expect(expanded.hiddenLineCount).toBe(0);
    expect(expanded.base.rows).toHaveLength(expanded.base.lineCount);
  });

  it("counts links that are not tied to a drawn change", () => {
    expect(buildDigModel(CROWDED_REPORT).unanchoredLinkCount).toBe(1);
  });

  it("uses a report the real loader accepts for the crowded fixture", () => {
    const result = loadReportFromJsonString(JSON.stringify(CROWDED_REPORT), "crowded.json");
    expect(result.issues ?? []).toEqual([]);
    expect(result.success).toBe(true);
  });
});

describe("relatedToFocus", () => {
  const model = buildDigModel(CROWDED_REPORT);

  it("returns null with nothing focused", () => {
    expect(relatedToFocus(model, null)).toBeNull();
  });

  it("lights a fault's shafts and the tests they reach", () => {
    const lit = relatedToFocus(model, { kind: "fault", id: "SC-003" });
    expect([...lit!.shafts].sort()).toEqual(["LINK-2", "LINK-4"]);
    expect([...lit!.tests].sort()).toEqual(["TC-002", "TC-003"]);
  });

  it("lights a test's shafts and their faults", () => {
    const lit = relatedToFocus(model, { kind: "test", id: "TC-001" });
    expect([...lit!.faults]).toEqual(["SC-001"]);
  });
});

describe("layoutDig", () => {
  const coordinates = (path: string) => (path.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);

  it("never lays out narrower than the minimum width", () => {
    expect(layoutDig(buildDigModel(DEMO_SCENARIO_E), 300).width).toBe(DIG_MIN_WIDTH);
  });

  it("reflows columns to the available width instead of scaling text", () => {
    const narrow = layoutDig(buildDigModel(DEMO_SCENARIO_E), 800);
    const wide = layoutDig(buildDigModel(DEMO_SCENARIO_E), 1400);
    expect(wide.base.width).toBeGreaterThan(narrow.base.width);
    expect(wide.base.maxChars).toBeGreaterThan(narrow.base.maxChars);
  });

  it("lands a file-level shaft on the file band and an assertion shaft on its card", () => {
    const layout = layoutDig(buildDigModel(DEMO_SCENARIO_E), 980);
    const card = layout.files[0].cards[0];
    const strong = layout.shafts.find((s) => s.shaft.id === "CORR-ITEM-001")!;
    const weak = layout.shafts.find((s) => s.shaft.id === "CORR-ITEM-002")!;
    expect(strong.endY).toBe(card.y);
    expect(weak.endY).toBe(layout.testTop);
  });

  it("keeps every shaft inside the canvas on a crowded report", () => {
    const layout = layoutDig(buildDigModel(CROWDED_REPORT), 900);
    expect(layout.shafts).toHaveLength(5);
    for (const laid of layout.shafts) {
      const values = coordinates(laid.path);
      expect(Math.max(...values)).toBeLessThanOrEqual(Math.max(layout.width, layout.height));
      expect(Math.min(...values)).toBeGreaterThanOrEqual(0);
      expect(laid.endY).toBeLessThan(layout.unknownTop);
    }
  });

  it("stacks many test cards rather than crushing them or widening the canvas", () => {
    const manyTests = {
      ...CROWDED_REPORT,
      testChanges: Array.from({ length: 12 }, (_, i) => ({
        ...CROWDED_REPORT.testChanges[0],
        id: `TC-${i}`,
        posixTestFilePath: `tests/t${i}.test.ts`,
      })),
    };
    const layout = layoutDig(buildDigModel(manyTests), 900);
    expect(layout.files[0].cards[0].width).toBeGreaterThanOrEqual(210);
    expect(layout.width).toBe(900);
    const tops = layout.files.flatMap((file) => file.cards.map((card) => card.y));
    expect(new Set(tops).size).toBe(tops.length);
  });

  it("truncates with an ellipsis only when needed", () => {
    expect(truncate("short", 10)).toBe("short");
    expect(truncate("a long line of code", 8)).toBe("a long …");
    expect(truncate(null, 8)).toBe("");
  });
});

describe("Accessible View data", () => {
  it("exposes correlations that have no drawable edge", () => {
    const model = buildCorrelationGraphModel(DEMO_SCENARIO_E);
    expect(model.unattachedItems.map((item) => item.id)).toEqual(["CORR-ITEM-002"]);
  });
});
