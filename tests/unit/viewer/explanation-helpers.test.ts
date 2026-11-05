/**
 * Change Archaeologist — Plain-English Explanation Helpers Unit Tests
 *
 * Verifies data-grounded explanations, epistemic boundaries, and glossary definitions.
 */

import { describe, it, expect } from "vitest";
import {
  explainStructuralChange,
  explainTestChange,
  explainCorrelation,
  explainGraphNode,
  explainGraphEdge,
  buildReportReadingGuideData,
  CONCEPT_EXPLANATIONS,
} from "../../../src/viewer/utils/explanation-helpers.js";
import {
  DEMO_SCENARIO_A,
  DEMO_SCENARIO_D,
  DEMO_SCENARIO_E,
  DEMO_SCENARIO_F,
} from "../../../src/viewer/data/demo-fixtures.js";
import type { CorrelationGraphNode, CorrelationGraphEdge } from "../../../src/viewer/types/index.js";

describe("Plain-English Explanation Helpers", () => {
  describe("explainStructuralChange", () => {
    it("explains a removed guard clause with plain title and epistemic boundaries", () => {
      const sc = DEMO_SCENARIO_A.structuralChanges[0];
      const result = explainStructuralChange(sc, "processPayment");

      expect(result.entityType).toBe("Production Code Change");
      expect(result.plainTitle).toBe("Defensive Safety Check Removed");
      expect(result.whatChanged).toContain("A guard clause (input validation or prerequisite check) was removed from 'processPayment'");
      expect(result.establishes).toContain("The syntax tree of this function was structurally altered");
      expect(result.doesNotEstablish).toContain("Whether this change caused a bug");
      expect(result.technicalBadge).toBe("REMOVED: GUARD_CLAUSE");
    });

    it("explains a modified return statement in Scenario E", () => {
      const sc = DEMO_SCENARIO_E.structuralChanges[0];
      const result = explainStructuralChange(sc, "calculateDiscount");

      expect(result.plainTitle).toBe("Returned Value or Output Changed");
      expect(result.whatChanged).toContain("The value or expression returned by 'calculateDiscount' was modified");
      expect(result.establishes).toBeDefined();
      expect(result.doesNotEstablish).toBeDefined();
    });
  });

  describe("explainTestChange", () => {
    it("explains a test change that calls the target function", () => {
      const tc = DEMO_SCENARIO_D.testChanges[0];
      const result = explainTestChange(tc, "calculateDiscount");

      expect(result.entityType).toBe("Related Test Change");
      expect(result.plainTitle).toBe("Test Calling Changed Function");
      expect(result.whatChanged).toContain("directly invokes or references 'calculateDiscount'");
      expect(result.establishes).toContain("This test file was edited in the same commit range");
      expect(result.doesNotEstablish).toContain("Whether this test was executed during CI/CD");
      expect(result.technicalBadge).toBe("Calls Target Function");
    });
  });

  describe("explainCorrelation", () => {
    it("explains a STRONG correlation with direct assertion reference", () => {
      const corr = DEMO_SCENARIO_E.correlationItems![0];
      expect(corr.status).toBe("STRONG");

      const result = explainCorrelation(corr, "calculateDiscount");
      expect(result.plainTitle).toBe("Direct Assertion Relationship (STRONG)");
      expect(result.establishes).toContain("directly calls or checks 'calculateDiscount'");
      expect(result.doesNotEstablish).toContain("That the test was run in CI, passed, or adequately validates");
      expect(result.status).toBe("STRONG");
    });

    it("explains a WEAK correlation with enclosing test block", () => {
      const corr = DEMO_SCENARIO_E.correlationItems![1];
      expect(corr.status).toBe("WEAK");

      const result = explainCorrelation(corr, "calculateDiscount");
      expect(result.plainTitle).toBe("Enclosing Test Block Modified (WEAK)");
      expect(result.establishes).toContain("without direct assertion targeting");
      expect(result.doesNotEstablish).toContain("Direct interaction between the modified test and the modified function");
      expect(result.status).toBe("WEAK");
    });
  });

  describe("explainGraphNode & explainGraphEdge", () => {
    it("explains a PRODUCTION_FUNCTION graph node", () => {
      const node: CorrelationGraphNode = {
        id: "node-prod-0",
        type: "productionFunction",
        position: { x: 0, y: 0 },
        data: {
          id: "node-prod-0",
          category: "PRODUCTION_FUNCTION",
          title: "calculateDiscount",
          subtitle: "Target Function",
          entityId: "prod-0",
          filePath: "src/order.ts",
          span: null,
          evidenceIds: ["EV-001"],
          findingIds: [],
          epistemicTag: "OBSERVED",
          isSourceAvailable: true,
        },
      };

      const result = explainGraphNode(node, DEMO_SCENARIO_E);
      expect(result.entityType).toBe("Target Production Function");
      expect(result.plainTitle).toContain("Target Function: calculateDiscount");
      expect(result.establishes).toContain("present in the base revision");
    });

    it("explains a CORRELATED_WITH graph edge", () => {
      const edge: CorrelationGraphEdge = {
        id: "edge-corr-1",
        source: "node-sc-1",
        target: "node-tc-1",
        type: "correlation",
        data: {
          id: "edge-corr-1",
          category: "CORRELATED_WITH",
          sourceEntityId: "SC-001",
          targetEntityId: "TC-001",
          status: "STRONG",
          label: "STRONG",
          classification: "POTENTIALLY_RELATED_ASSERTION_MODIFIED",
          rationale: "Direct assertion update",
          confidence: "HIGH",
          epistemicTag: "INFERRED",
          evidenceIds: ["EV-001"],
        },
      };

      const result = explainGraphEdge(edge, DEMO_SCENARIO_E);
      expect(result.entityType).toBe("Code–Test Relationship");
      expect(result.status).toBe("STRONG");
      expect(result.establishes).toBeDefined();
      expect(result.doesNotEstablish).toBeDefined();
    });
  });

  describe("buildReportReadingGuideData", () => {
    it("generates grounded guide data for Scenario E with 3 core questions", () => {
      const data = buildReportReadingGuideData(DEMO_SCENARIO_E);

      expect(data.targetName).toBe("calculateDiscount");
      expect(data.targetPath).toBe("src/order.ts");

      // Question 1: What changed?
      expect(data.whatChanged.summary).toContain("calculateDiscount");
      expect(data.whatChanged.summary).toContain("1 structural code change");
      expect(data.whatChanged.details.some((d) => d.includes("syntax element(s) modified"))).toBe(true);

      // Question 2: What do the tests tell us?
      expect(data.whatTestsTellUs.summary).toContain("1 companion test file");
      expect(data.whatTestsTellUs.details.some((d) => d.includes("directly invoke 'calculateDiscount'"))).toBe(true);

      // Question 3: What can we conclude?
      expect(data.whatWeCanConclude.details.some((d) => d.includes("STRONG correlation"))).toBe(true);
      expect(data.whatWeCanConclude.details.some((d) => d.includes("Static analysis inspects code structure in Git; it does NOT run the tests"))).toBe(true);
    });

    it("generates grounded guide data for Scenario A with zero companion tests", () => {
      const data = buildReportReadingGuideData(DEMO_SCENARIO_A);

      expect(data.whatTestsTellUs.summary).toContain("Zero companion test files were touched in the same commit range");
      expect(data.whatWeCanConclude.details.some((d) => d.includes("Unaccompanied production change"))).toBe(true);
    });
  });

  describe("CONCEPT_EXPLANATIONS glossary", () => {
    it("contains plain-English definitions for all key static-analysis concepts", () => {
      expect(CONCEPT_EXPLANATIONS.astMutation.plain).toContain("syntax tree");
      expect(CONCEPT_EXPLANATIONS.strongStatus.plain).toContain("directly calls or names");
      expect(CONCEPT_EXPLANATIONS.weakStatus.plain).toContain("without a direct assertion");
      expect(CONCEPT_EXPLANATIONS.evidenceAnchor.plain).toContain("verified proof record");
      expect(CONCEPT_EXPLANATIONS.analysisBoundaries.plain).toContain("limits");
    });
  });
});
