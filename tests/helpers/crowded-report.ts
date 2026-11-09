/**
 * An invented but schema-valid report that stresses The Dig: a long function,
 * several changes, tests across two files, and every correlation status.
 */

import { DEMO_SCENARIO_E } from "../../src/viewer/data/demo-fixtures.js";
import type { AnalysisReport, CorrelationItem, StructuralChange, TestChange } from "../../src/viewer/types/index.js";

const START_LINE = 10;
const signature = "export function applyCoupon(cart: Cart, code: string): Cart {";

function functionBody(edits: Readonly<Record<number, string>>): string {
  const lines = Array.from({ length: 58 }, (_, i) => edits[i] ?? `  step${i}(cart);`);
  return `{\n${lines.join("\n")}\n}`;
}

const lineOf = (bodyIndex: number) => START_LINE + 1 + bodyIndex;
const span = (bodyIndex: number) => ({
  startLine: lineOf(bodyIndex),
  startColumn: 3,
  endLine: lineOf(bodyIndex),
  endColumn: 30,
});

function change(
  id: string,
  category: StructuralChange["category"],
  changeType: StructuralChange["changeType"],
  bodyIndex: number,
  summary: string
): StructuralChange {
  return {
    ...DEMO_SCENARIO_E.structuralChanges[0],
    id,
    category,
    changeType,
    summary,
    beforeSpan: changeType === "ADDED" ? null : span(bodyIndex),
    afterSpan: changeType === "REMOVED" ? null : span(bodyIndex),
    beforeSnippet: changeType === "ADDED" ? null : "before",
    afterSnippet: changeType === "REMOVED" ? null : "after",
  };
}

function testChange(id: string, path: string, block: string, before: string, after: string, calls: boolean): TestChange {
  return {
    ...DEMO_SCENARIO_E.testChanges[0],
    id,
    posixTestFilePath: path,
    assertionChanges: [
      {
        ...DEMO_SCENARIO_E.testChanges[0].assertionChanges[0],
        enclosingTestBlock: block,
        beforeAssertionText: before,
        afterAssertionText: after,
        callsTargetFunctionInBlock: calls,
      },
    ],
  };
}

function link(
  id: string,
  structuralChangeId: string | null,
  testChangeId: string | null,
  posixTestFilePath: string | null,
  status: CorrelationItem["status"]
): CorrelationItem {
  return {
    ...DEMO_SCENARIO_E.correlationItems![0],
    id,
    correlationId: "CORR-001",
    structuralChangeId,
    testChangeId,
    posixTestFilePath,
    status,
  };
}

const CART = "tests/cart.test.ts";
const CHECKOUT = "tests/flows/checkout.test.ts";

export const CROWDED_REPORT: AnalysisReport = {
  ...DEMO_SCENARIO_E,
  request: { ...DEMO_SCENARIO_E.request, targetFunctionName: "applyCoupon", targetFilePath: "src/cart.ts" },
  baseFunction: {
    ...DEMO_SCENARIO_E.baseFunction!,
    span: { startLine: START_LINE, startColumn: 1, endLine: START_LINE + 59, endColumn: 2 },
    signatureText: signature,
    rawBodyText: functionBody({ 8: "  throw new ExpiredError(code);", 30: "  if (cart.total > 100) {", 31: "  return discount(cart, 0.2);" }),
  },
  headFunction: {
    ...DEMO_SCENARIO_E.headFunction!,
    span: { startLine: START_LINE, startColumn: 1, endLine: START_LINE + 59, endColumn: 2 },
    signatureText: signature,
    rawBodyText: functionBody({ 8: "  return cart;", 30: "  if (cart.total >= 100) {", 31: "  return discount(cart, 0.25);", 50: "  if (cart.locked) throw new LockError();" }),
  },
  structuralChanges: [
    change("SC-001", "THROW_STATEMENT", "MODIFIED", 8, "Throw replaced by a return when the coupon has expired."),
    change("SC-002", "CONDITIONAL_EXPRESSION", "MODIFIED", 30, "Condition changed from > to >=."),
    change("SC-003", "RETURN_STATEMENT", "MODIFIED", 31, "Discount rate changed from 0.2 to 0.25."),
    change("SC-004", "GUARD_CLAUSE", "ADDED", 50, "New guard throws when the cart is locked."),
    change("SC-005", "RETURN_STATEMENT", "REMOVED", 55, "A trailing return was removed."),
  ],
  testChanges: [
    testChange("TC-001", CART, "coupon > expired returns cart", "expect(() => apply(c, x)).toThrow()", "expect(apply(c, x)).toBe(c)", true),
    testChange("TC-002", CART, "coupon > large cart", "expect(total).toBe(80)", "expect(total).toBe(75)", true),
    testChange("TC-003", CHECKOUT, "checkout > happy path", "expect(res.ok).toBe(true)", "expect(res.status).toBe(200)", false),
  ],
  declarationChanges: [],
  correlations: DEMO_SCENARIO_E.correlations,
  correlationItems: [
    link("LINK-1", "SC-001", "TC-001", CART, "STRONG"),
    link("LINK-2", "SC-003", "TC-002", CART, "STRONG"),
    link("LINK-3", "SC-002", null, CART, "WEAK"),
    link("LINK-4", "SC-003", "TC-003", CHECKOUT, "UNCERTAIN"),
    link("LINK-5", "SC-004", null, null, "NONE"),
    link("LINK-6", null, "TC-003", CHECKOUT, "NONE"),
  ],
};
