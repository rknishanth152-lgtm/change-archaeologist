import { describe, it, expect } from "vitest";
import { buildCorrelationGraphModel } from "../../../src/viewer/utils/graph-model.js";
import {
  DEMO_SCENARIO_A,
  DEMO_SCENARIO_B,
  DEMO_SCENARIO_C,
  DEMO_SCENARIO_D,
  DEMO_SCENARIO_E,
  DEMO_SCENARIO_F,
} from "../../../src/viewer/data/demo-fixtures.js";

describe("buildCorrelationGraphModel", () => {
  it("builds a disconnected graph model for Scenario A with 1 production mutation and 0 test changes", () => {
    const model = buildCorrelationGraphModel(DEMO_SCENARIO_A);

    expect(model.nodes.length).toBe(2); // Target function + 1 structural change
    const targetFnNode = model.nodes.find((n) => n.data.category === "PRODUCTION_FUNCTION");
    const scNode = model.nodes.find((n) => n.data.category === "STRUCTURAL_CHANGE");

    expect(targetFnNode).toBeDefined();
    expect(targetFnNode?.data.title).toBe("processPayment()");
    expect(scNode).toBeDefined();
    expect(scNode?.data.entityId).toBe("SC-001");

    // Containment edge exists between target function and SC-001
    expect(model.edges.length).toBe(1);
    expect(model.edges[0].data.category).toBe("TARGET_CONTAINS_CHANGE");

    // No test nodes or correlation edges
    expect(model.summary.testNodeCount).toBe(0);
    expect(model.summary.correlationEdgeCount).toBe(0);
  });

  it("builds a graph model with test changes and 0 structural changes when structuralChanges is empty", () => {
    const reportNoStructuralChanges = {
      ...DEMO_SCENARIO_D,
      structuralChanges: [],
      correlations: [],
      correlationItems: [],
    };
    const model = buildCorrelationGraphModel(reportNoStructuralChanges);

    expect(model.summary.productionNodeCount).toBe(1); // Only target function
    expect(model.summary.testNodeCount).toBeGreaterThan(0); // Test file + test change + declaration

    // No correlation edges should exist because there are no structural mutations
    expect(model.summary.correlationEdgeCount).toBe(0);
  });

  it("builds Scenario E with cross-side correlation edge having STRONG status and rationale", () => {
    const model = buildCorrelationGraphModel(DEMO_SCENARIO_E);

    expect(model.summary.productionNodeCount).toBe(2); // process/calculate function + SC-001
    expect(model.summary.testNodeCount).toBeGreaterThanOrEqual(2); // Test file + TC-001 (+ TDC-001)

    // Strong correlation edge exists
    const corrEdge = model.edges.find((e) => e.data.category === "CORRELATED_WITH");
    expect(corrEdge).toBeDefined();
    expect(corrEdge?.data.status).toBe("STRONG");
    expect(corrEdge?.data.sourceEntityId).toBe("SC-001");
    expect(corrEdge?.data.targetEntityId).toBe("TC-001");
    expect(corrEdge?.data.rationale).toContain("unverified");

    expect(model.summary.strongCount).toBe(1);
    expect(model.summary.weakCount).toBe(1);
    expect(model.summary.noneCount).toBe(0);
  });

  it("flags Scenario F as incomplete with DELETED function status", () => {
    const model = buildCorrelationGraphModel(DEMO_SCENARIO_F);

    expect(model.isIncomplete).toBe(true);
    expect(model.incompleteReason).toBeDefined();

    const targetFnNode = model.nodes.find((n) => n.data.category === "PRODUCTION_FUNCTION");
    expect(targetFnNode).toBeDefined();
    expect(targetFnNode?.data.functionStatus).toBe("DELETED");
  });

  it("does not fabricate edges when correlation item has null testChangeId", () => {
    const reportWithUnmatchedCorr = {
      ...DEMO_SCENARIO_A,
      correlationItems: [
        {
          id: "CORR-ITEM-999",
          correlationId: "CORR-999",
          structuralChangeId: "SC-001",
          testChangeId: null,
          posixTestFilePath: null,
          classification: "NO_TEST_CHANGES_OBSERVED" as const,
          status: "NONE" as const,
          rationale: "No companion test mutations observed.",
          observedFact: "No test files were touched.",
          inferredRelationship: "Production change without companion test update.",
          unknowns: ["Runtime test execution unknown."],
          evidenceIds: [],
        },
      ],
    };

    const model = buildCorrelationGraphModel(reportWithUnmatchedCorr);
    // Should NOT have created a dangling edge
    const corrEdge = model.edges.find((e) => e.data.category === "CORRELATED_WITH");
    expect(corrEdge).toBeUndefined();
    expect(model.summary.noneCount).toBe(1);
    expect(model.summary.correlationEdgeCount).toBe(0);
  });

  it("preserves evidence IDs on structural and test change nodes", () => {
    const model = buildCorrelationGraphModel(DEMO_SCENARIO_E);
    const scNode = model.nodes.find((n) => n.data.category === "STRUCTURAL_CHANGE");

    expect(scNode).toBeDefined();
    expect(scNode?.data.evidenceIds.length).toBeGreaterThan(0);
    expect(scNode?.data.evidenceIds).toContain("EV-001");
  });

  it("applies refined 4-column layout coordinates with 260px bridge gap and explicit handles", () => {
    const model = buildCorrelationGraphModel(DEMO_SCENARIO_E);

    const targetFnNode = model.nodes.find((n) => n.data.category === "PRODUCTION_FUNCTION");
    const scNode = model.nodes.find((n) => n.data.category === "STRUCTURAL_CHANGE");
    const tcNode = model.nodes.find((n) => n.data.category === "TEST_CHANGE");
    const tfNode = model.nodes.find((n) => n.data.category === "TEST_FILE");

    expect(targetFnNode?.position.x).toBe(50);
    expect(scNode?.position.x).toBe(410);
    expect(tcNode?.position.x).toBe(930);
    expect(tfNode?.position.x).toBe(1290);

    // Node width is 260px, so gap between Col 2 and Col 3 is 930 - (410 + 260) = 260px
    const bridgeGap = (tcNode?.position.x ?? 0) - ((scNode?.position.x ?? 0) + 260);
    expect(bridgeGap).toBe(260);

    // Verify handle IDs for clean routing
    const prodContainmentEdge = model.edges.find((e) => e.data.category === "TARGET_CONTAINS_CHANGE");
    expect(prodContainmentEdge?.sourceHandle).toBe("source-right");
    expect(prodContainmentEdge?.targetHandle).toBe("target-left");

    const corrEdge = model.edges.find((e) => e.data.category === "CORRELATED_WITH");
    expect(corrEdge?.sourceHandle).toBe("source-right");
    expect(corrEdge?.targetHandle).toBe("target-left");

    const testContainmentEdge = model.edges.find((e) => e.data.category === "TEST_FILE_CONTAINS_CHANGE");
    expect(testContainmentEdge?.sourceHandle).toBe("source-left");
    expect(testContainmentEdge?.targetHandle).toBe("target-right");
  });
});
