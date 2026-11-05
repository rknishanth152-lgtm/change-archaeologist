/**
 * Change Archaeologist — Change Timeline Model Unit Tests
 *
 * Verifies timeline model derivation across real demonstration reports:
 * - BASE and HEAD revision anchor formatting and commit metadata preservation
 * - Structural changes without test changes (Scenario A)
 * - Companion test changes and test declaration changes (Scenario E)
 * - Incomplete analysis and deleted functions (Scenario F)
 * - Filtering behavior (all, structural, tests, correlated)
 * - Deduplication of findings and traceable evidence IDs
 */

import { describe, it, expect } from "vitest";
import { buildTimelineModel, filterTimelineItems } from "../../../src/viewer/utils/timeline-model.js";
import {
  DEMO_SCENARIO_A,
  DEMO_SCENARIO_C,
  DEMO_SCENARIO_E,
  DEMO_SCENARIO_F,
} from "../../../src/viewer/data/demo-fixtures.js";
import type { AnalysisReport } from "../../../src/viewer/types/index.js";

describe("Change Timeline Model Generator", () => {
  it("generates two revision anchors from real report metadata (Scenario A)", () => {
    const model = buildTimelineModel(DEMO_SCENARIO_A);

    expect(model.baseAnchor).toBeDefined();
    expect(model.headAnchor).toBeDefined();

    expect(model.baseAnchor.role).toBe("BASE");
    expect(model.baseAnchor.shortSha).toBe(DEMO_SCENARIO_A.baseCommit.shortSha);
    expect(model.baseAnchor.sha).toBe(DEMO_SCENARIO_A.baseCommit.sha);
    expect(model.baseAnchor.functionStatus).toBe("PRESENT");
    expect(model.baseAnchor.formattedLabel).toBe(`BASE (${DEMO_SCENARIO_A.baseCommit.shortSha})`);

    expect(model.headAnchor.role).toBe("HEAD");
    expect(model.headAnchor.shortSha).toBe(DEMO_SCENARIO_A.headCommit.shortSha);
    expect(model.headAnchor.sha).toBe(DEMO_SCENARIO_A.headCommit.sha);
    expect(model.headAnchor.functionStatus).toBe("PRESENT");
    expect(model.headAnchor.formattedLabel).toBe(`HEAD (${DEMO_SCENARIO_A.headCommit.shortSha})`);

    expect(model.comparisonDirection).toBe(
      `${DEMO_SCENARIO_A.baseCommit.shortSha} → ${DEMO_SCENARIO_A.headCommit.shortSha}`
    );
    expect(model.isIncomplete).toBe(false);
  });

  it("handles structural changes without companion test changes (Scenario A)", () => {
    const model = buildTimelineModel(DEMO_SCENARIO_A);

    expect(model.structuralCount).toBe(1);
    expect(model.testChangeCount).toBe(0);
    expect(model.declarationCount).toBe(0);
    expect(model.totalChangesCount).toBe(1);

    const item = model.items[0];
    expect(item.itemType).toBe("STRUCTURAL_CHANGE");
    expect(item.sourceEntityId).toBe("SC-001");
    expect(item.category).toBe("GUARD_CLAUSE");
    expect(item.changeType).toBe("REMOVED");
    expect(item.epistemicTag).toBe("OBSERVED");
    expect(item.filePath).toBe("src/auth.ts");
    expect(item.isSourceAvailable).toBe(true);
    expect(item.evidenceIds.length).toBeGreaterThan(0);
  });

  it("generates complete multi-track timeline with test and declaration changes (Scenario E)", () => {
    const model = buildTimelineModel(DEMO_SCENARIO_E);

    expect(model.structuralCount).toBe(1);
    expect(model.testChangeCount).toBe(1);
    expect(model.declarationCount).toBe(1);
    expect(model.totalChangesCount).toBe(3);
    expect(model.correlatedCount).toBeGreaterThan(0);

    // Structural item
    const scItem = model.items.find((i) => i.itemType === "STRUCTURAL_CHANGE");
    expect(scItem).toBeDefined();
    expect(scItem?.category).toBe("RETURN_STATEMENT");
    expect(scItem?.changeType).toBe("MODIFIED");
    expect(scItem?.correlationStatus).toBe("STRONG");
    expect(scItem?.correlationRationale).toContain("Assertion modified");

    // Test change item
    const tcItem = model.items.find((i) => i.itemType === "TEST_CHANGE");
    expect(tcItem).toBeDefined();
    expect(tcItem?.sourceEntityId).toBe("TC-001");
    expect(tcItem?.changeType).toBe("MODIFIED");
    expect(tcItem?.correlationStatus).toBe("STRONG");

    // Declaration change item
    const tdcItem = model.items.find((i) => i.itemType === "DECLARATION_CHANGE");
    expect(tdcItem).toBeDefined();
    expect(tdcItem?.sourceEntityId).toBe("TDC-001");
    expect(tdcItem?.title).toBe("order calculation > calculates regular discount");
    expect(tdcItem?.correlationStatus).toBe("WEAK");
  });

  it("correctly identifies incomplete analysis and deleted function (Scenario F)", () => {
    const model = buildTimelineModel(DEMO_SCENARIO_F);

    expect(model.isIncomplete).toBe(true);
    expect(model.headAnchor.functionStatus).toBe("DELETED");
    expect(model.baseAnchor.functionStatus).toBe("PRESENT");
    expect(model.structuralCount).toBe(0);
    expect(model.incompleteReason).toContain("deprecatedHelper");
  });

  it("handles missing optional fields cleanly without throwing", () => {
    // Construct minimal report with missing optional fields
    const minimalReport: AnalysisReport = {
      ...DEMO_SCENARIO_A,
      declarationChanges: undefined,
      correlationItems: undefined,
      limitations: [],
      structuralChanges: [
        {
          id: "SC-TEST",
          ruleId: "RULE_RETURN_MODIFIED",
          category: "RETURN_STATEMENT",
          changeType: "MODIFIED",
          summary: "Minimal return",
          beforeSpan: null,
          afterSpan: null,
          beforeSnippet: null,
          afterSnippet: null,
        },
      ],
      testChanges: [],
      findings: [],
      correlations: [],
    };

    const model = buildTimelineModel(minimalReport);
    expect(model).toBeDefined();
    expect(model.declarationCount).toBe(0);
    expect(model.items.length).toBe(1);
    expect(model.items[0].isSourceAvailable).toBe(false);
    expect(model.items[0].evidenceIds).toEqual([]);
    expect(model.items[0].correlationStatus).toBeNull();
  });

  it("filters timeline items accurately by category", () => {
    const model = buildTimelineModel(DEMO_SCENARIO_E);

    const allItems = filterTimelineItems(model.items, "all");
    expect(allItems.length).toBe(3);

    const structuralOnly = filterTimelineItems(model.items, "structural");
    expect(structuralOnly.length).toBe(1);
    expect(structuralOnly[0].itemType).toBe("STRUCTURAL_CHANGE");

    const testsOnly = filterTimelineItems(model.items, "tests");
    expect(testsOnly.length).toBe(2);
    expect(testsOnly.every((i) => i.itemType === "TEST_CHANGE" || i.itemType === "DECLARATION_CHANGE")).toBe(true);

    const correlatedOnly = filterTimelineItems(model.items, "correlated");
    expect(correlatedOnly.length).toBe(3);
    expect(correlatedOnly.every((i) => i.correlationStatus !== null)).toBe(true);
  });

  it("deduplicates evidence IDs when multiple findings reference the same change", () => {
    const reportWithSharedFindings: AnalysisReport = {
      ...DEMO_SCENARIO_C,
      findings: [
        {
          id: "FND-001",
          title: "First Finding",
          category: "GUARD_CLAUSE",
          attentionLevel: "HIGH_ATTENTION",
          structuralChangeIds: ["SC-001"],
          correlationId: null,
          observed: [
            {
              id: "OBS-001",
              category: "OBSERVED",
              statement: "Obs 1",
              evidenceIds: ["EV-001", "EV-002"],
            },
          ],
          inferred: [],
          unknown: [
            {
              id: "UNK-001",
              category: "UNKNOWN",
              statement: "Unk 1",
              reasonCategory: "RUNTIME_TEST_EXECUTION_UNVERIFIED",
            },
          ],
        },
        {
          id: "FND-002",
          title: "Second Finding",
          category: "GUARD_CLAUSE",
          attentionLevel: "HIGH_ATTENTION",
          structuralChangeIds: ["SC-001"],
          correlationId: null,
          observed: [
            {
              id: "OBS-002",
              category: "OBSERVED",
              statement: "Obs 2",
              evidenceIds: ["EV-002", "EV-003"], // EV-002 is repeated
            },
          ],
          inferred: [],
          unknown: [
            {
              id: "UNK-002",
              category: "UNKNOWN",
              statement: "Unk 2",
              reasonCategory: "RUNTIME_TEST_EXECUTION_UNVERIFIED",
            },
          ],
        },
      ],
    };

    const model = buildTimelineModel(reportWithSharedFindings);
    const item = model.items[0];

    // EV-002 should appear only once
    expect(item.evidenceIds).toEqual(["EV-001", "EV-002", "EV-003"]);
    expect(item.findingIds).toEqual(["FND-001", "FND-002"]);
  });
});
