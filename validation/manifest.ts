/**
 * Change Archaeologist - Predefined Validation Manifest
 *
 * Defines explicit, machine-readable expectations for each of the 12 validation scenarios
 * PRIOR to execution. These benchmarks establish ground truth and enforce epistemic boundaries.
 */

import { ExitCode } from "../src/cli/types.js";
import type { ScenarioExpectations, ValidationScenarioId } from "./types.js";

export const VALIDATION_MANIFEST: Record<ValidationScenarioId, ScenarioExpectations> = {
  A: {
    id: "A",
    title: "Guard Clause Removal",
    description:
      "A production function has an early guard clause in the base revision which is deleted in HEAD.",
    targetFilePath: "src/payment.ts",
    targetFunctionName: "processPayment",
    expectedExitCode: ExitCode.SUCCESS,
    expectedReportStatus: "COMPLETED_WITH_FINDINGS",
    minStructuralChanges: 1,
    maxStructuralChanges: 1,
    expectedStructuralCategories: ["GUARD_CLAUSE"],
    expectedRules: ["RULE_GUARD_REMOVED"],
    expectedForbiddenRules: [],
    forbiddenClaims: [
      "proves a regression",
      "regression introduced",
      "bug introduced",
      "proven breaking change",
      "coverage decreased",
    ],
    knownLimitationsRationale:
      "Static analysis observes the structural removal of the guard AST node; it cannot prove whether downstream callers or tests depended on the guard throwing.",
  },

  B: {
    id: "B",
    title: "Conditional Operator Change",
    description:
      "A conditional expression changes its logical binary operator from logical AND (&&) to logical OR (||).",
    targetFilePath: "src/auth.ts",
    targetFunctionName: "authorizeUser",
    expectedExitCode: ExitCode.SUCCESS,
    expectedReportStatus: "COMPLETED_WITH_FINDINGS",
    minStructuralChanges: 1,
    maxStructuralChanges: 1,
    expectedStructuralCategories: ["CONDITIONAL_EXPRESSION"],
    expectedRules: ["RULE_CONDITIONAL_MODIFIED"],
    forbiddenClaims: [
      "proves runtime failure",
      "security vulnerability introduced",
      "proven test failure",
      "broken authorization",
    ],
    knownLimitationsRationale:
      "Detects the operator mutation in the binary expression; cannot evaluate runtime boolean evaluation order or side effects.",
  },

  C: {
    id: "C",
    title: "Throw-to-Return Change",
    description:
      "A function branch that originally threw an Error is modified to return a fallback value instead.",
    targetFilePath: "src/config.ts",
    targetFunctionName: "parseConfig",
    expectedExitCode: ExitCode.SUCCESS,
    expectedReportStatus: "COMPLETED_WITH_FINDINGS",
    minStructuralChanges: 1,
    maxStructuralChanges: 2,
    expectedStructuralCategories: ["GUARD_CLAUSE"],
    expectedRules: ["RULE_THROW_TO_RETURN_CONVERSION"],
    forbiddenClaims: [
      "proven regression",
      "guaranteed to break callers",
      "causes production crash",
    ],
    knownLimitationsRationale:
      "Detects the semantic shift from throwing to returning; correlation to any test assertion must remain an inference rather than proof.",
  },

  D: {
    id: "D",
    title: "Formatting-Only Change",
    description:
      "Source formatting, whitespace, indentation, and comments are altered without changing AST node structure.",
    targetFilePath: "src/pricing.ts",
    targetFunctionName: "calculateDiscount",
    expectedExitCode: ExitCode.SUCCESS,
    expectedReportStatus: "COMPLETED_NO_STRUCTURAL_CHANGES",
    minStructuralChanges: 0,
    maxStructuralChanges: 0,
    forbiddenClaims: [
      "regression",
      "structural change",
      "breaking change",
      "functional change",
    ],
    knownLimitationsRationale:
      "AST normalization filters out comments, trailing spaces, and semicolon variances; identical normalized AST structures yield zero structural differences.",
  },

  E: {
    id: "E",
    title: "Production Change With Unchanged Test File",
    description:
      "Target production function is structurally modified while the specified companion test file remains completely untouched.",
    targetFilePath: "src/discount.ts",
    targetFunctionName: "applyDiscount",
    testFilePaths: ["tests/discount.test.ts"],
    expectedExitCode: ExitCode.SUCCESS,
    expectedReportStatus: "COMPLETED_WITH_FINDINGS",
    expectedTestStatus: "COMPLETED_NO_CHANGES",
    minStructuralChanges: 1,
    maxStructuralChanges: 1,
    minTestChanges: 0,
    maxTestChanges: 0,
    expectedCorrelationClassifications: ["NO_TEST_CHANGES_OBSERVED"],
    forbiddenClaims: [
      "tests cover this change",
      "tests fail to cover this change",
      "coverage increased",
      "coverage decreased",
      "proves a regression",
    ],
    knownLimitationsRationale:
      "The tool identifies an untouched companion test file and notes lack of test modifications; it must strictly avoid claiming whether tests still pass or execute the code.",
  },

  F: {
    id: "F",
    title: "Related-Looking Test Change",
    description:
      "Production guard boundary condition modified in tandem with aligned test assertion in companion test file.",
    targetFilePath: "src/validate.ts",
    targetFunctionName: "validateAge",
    testFilePaths: ["tests/validate.test.ts"],
    expectedExitCode: ExitCode.SUCCESS,
    expectedReportStatus: "COMPLETED_WITH_FINDINGS",
    expectedTestStatus: "COMPLETED_WITH_CHANGES",
    expectedCorrelationAnalysisStatus: "COMPLETE_CORRELATED",
    expectedCorrelationStatus: "STRONG",
    minStructuralChanges: 1,
    maxStructuralChanges: 1,
    expectedStructuralCategories: ["GUARD_CLAUSE"],
    expectedRules: ["RULE_GUARD_MODIFIED"],
    minTestChanges: 1,
    expectedCorrelationClassifications: ["POTENTIALLY_RELATED_ASSERTION_MODIFIED"],
    forbiddenClaims: [
      "causation proven",
      "proven causal link",
      "proves test coverage",
      "guaranteed verification",
    ],
    knownLimitationsRationale:
      "Both production guard and test assertion modified in tandem; classified as STRONG correlation due to shared identifiers, but co-occurrence is explicitly non-causal.",
  },

  G: {
    id: "G",
    title: "Unrelated Test Change",
    description:
      "Production function modified, but companion test file only changes a test block for a completely different function.",
    targetFilePath: "src/math.ts",
    targetFunctionName: "computeRatio",
    testFilePaths: ["tests/math.test.ts"],
    expectedExitCode: ExitCode.SUCCESS,
    expectedReportStatus: "COMPLETED_WITH_FINDINGS",
    expectedTestStatus: "COMPLETED_WITH_CHANGES",
    minStructuralChanges: 1,
    maxStructuralChanges: 1,
    minTestChanges: 1,
    forbiddenClaims: [
      "strong relationship",
      "test change proves production change",
      "caused by",
      "causal correlation",
    ],
    knownLimitationsRationale:
      "Even though test changes exist in the companion file, the modified test does not reference the target function. Correlation must remain UNCERTAIN or NONE.",
  },

  H: {
    id: "H",
    title: "Missing Function",
    description:
      "Requested target function exists in base revision but was removed or renamed in HEAD revision.",
    targetFilePath: "src/user.ts",
    targetFunctionName: "getUser",
    expectedExitCode: ExitCode.INCOMPLETE_ANALYSIS,
    expectedReportStatus: "INCOMPLETE_FUNCTION_MISSING",
    minStructuralChanges: 0,
    maxStructuralChanges: 0,
    forbiddenClaims: [
      "completed successfully",
      "no changes found",
      "function matched",
    ],
    expectedLimitations: [
      "Target function 'getUser' was not found in HEAD revision.",
    ],
    knownLimitationsRationale:
      "Historical comparator halts when target function cannot be located in either revision and outputs a valid INCOMPLETE report.",
  },

  I: {
    id: "I",
    title: "Syntax Error in Production Code",
    description:
      "Malformed TypeScript/JavaScript source introduced into HEAD revision preventing successful AST extraction.",
    targetFilePath: "src/parser.ts",
    targetFunctionName: "parseItem",
    expectedExitCode: ExitCode.INCOMPLETE_ANALYSIS,
    expectedReportStatus: "INCOMPLETE_PARSE_ERROR",
    minStructuralChanges: 0,
    maxStructuralChanges: 0,
    forbiddenClaims: [
      "comparison successful",
      "0 changes detected",
      "AST matched",
    ],
    knownLimitationsRationale:
      "Syntactic parse diagnostics (TS1000-1999) prevent complete AST generation. Emits structured error records and halts.",
  },

  J: {
    id: "J",
    title: "Ambiguous Function Name",
    description:
      "Source file contains multiple declarations matching the target function name (e.g. top-level function and class method).",
    targetFilePath: "src/items.ts",
    targetFunctionName: "processItem",
    expectedExitCode: ExitCode.INCOMPLETE_ANALYSIS,
    expectedReportStatus: "INCOMPLETE_AMBIGUOUS_TARGET",
    minStructuralChanges: 0,
    maxStructuralChanges: 0,
    forbiddenClaims: [
      "completed comparison",
      "arbitrarily selected",
      "first match chosen",
    ],
    knownLimitationsRationale:
      "When locator finds >= 2 matching functions in one snapshot, it refuses to guess which declaration was intended.",
  },

  K: {
    id: "K",
    title: "Nested Function Boundary Isolation",
    description:
      "Target function contains nested callback/closure. Changes occur only inside the nested callback while outer function statements are untouched.",
    targetFilePath: "src/collection.ts",
    targetFunctionName: "transformList",
    expectedExitCode: ExitCode.SUCCESS,
    expectedReportStatus: "COMPLETED_NO_STRUCTURAL_CHANGES",
    minStructuralChanges: 0,
    maxStructuralChanges: 0,
    forbiddenClaims: [
      "outer guard removed",
      "parent function modified",
      "regression in transformList",
    ],
    knownLimitationsRationale:
      "AST extractor treats function bodies strictly within their boundary; statements inside nested arrow functions or function expressions are isolated.",
  },

  L: {
    id: "L",
    title: "Missing or Malformed Test Input",
    description:
      "Companion test file specified via CLI contains syntax errors preventing test analysis.",
    targetFilePath: "src/token.ts",
    targetFunctionName: "verifyToken",
    testFilePaths: ["tests/malformed.test.ts"],
    expectedExitCode: ExitCode.INCOMPLETE_ANALYSIS,
    expectedReportStatus: "COMPLETED_WITH_FINDINGS", // Production comparison completes
    expectedTestStatus: "INCOMPLETE_PARSE_ERROR",   // Test analysis halts
    forbiddenClaims: [
      "test comparison completed successfully",
      "all tests passed",
      "verified assertions",
    ],
    knownLimitationsRationale:
      "When companion test file fails syntactic analysis, the unified report preserves production findings but marks test analysis as INCOMPLETE_PARSE_ERROR and exits 1.",
  },
};
