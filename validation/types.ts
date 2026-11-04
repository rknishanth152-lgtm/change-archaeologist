/**
 * Change Archaeologist - Validation Manifest & Runner Types
 *
 * Defines strongly-typed expectations for the real-world validation corpus.
 */

import type {
  AnalysisStatus,
  FindingCategory,
  RuleId,
  StructuralChangeCategory,
  TestAnalysisStatus,
  CorrelationStatus,
  CorrelationAnalysisStatus,
  CorrelationClassification,
} from "../src/core/domain/types.js";
import type { ExitCode } from "../src/cli/types.js";

export type ValidationScenarioId =
  | "A" // Guard Clause Removal
  | "B" // Conditional Operator Change
  | "C" // Throw-to-Return Conversion
  | "D" // Formatting-Only Changes
  | "E" // Production Change With Unchanged Test File
  | "F" // Related-Looking Test Change
  | "G" // Unrelated Test Change
  | "H" // Missing Function
  | "I" // Syntax Error in Production Code
  | "J" // Ambiguous Function Name
  | "K" // Nested Function Boundary Isolation
  | "L"; // Missing or Malformed Test Input

export interface ScenarioExpectations {
  readonly id: ValidationScenarioId;
  readonly title: string;
  readonly description: string;
  readonly targetFilePath: string;
  readonly targetFunctionName: string;
  readonly testFilePaths?: readonly string[];
  readonly extraCliArgs?: readonly string[];

  // Expected exit codes & statuses
  readonly expectedExitCode: ExitCode;
  readonly expectedReportStatus: AnalysisStatus;
  readonly expectedTestStatus?: TestAnalysisStatus;
  readonly expectedCorrelationAnalysisStatus?: CorrelationAnalysisStatus;
  readonly expectedCorrelationStatus?: CorrelationStatus;

  // Expected findings & structural change expectations
  readonly minStructuralChanges?: number;
  readonly maxStructuralChanges?: number;
  readonly expectedStructuralCategories?: readonly StructuralChangeCategory[];
  readonly expectedRules?: readonly RuleId[];
  readonly expectedForbiddenRules?: readonly RuleId[];

  // Test analysis expectations
  readonly minTestChanges?: number;
  readonly maxTestChanges?: number;

  // Correlation expectations
  readonly expectedCorrelationClassifications?: readonly CorrelationClassification[];

  // Epistemic constraints: claims that MUST NOT appear in either stdout, stderr, or report
  readonly forbiddenClaims: readonly string[];

  // Limitations that must be declared or explicitly recognized
  readonly expectedLimitations?: readonly string[];

  // Known limitation or ambiguity rationale
  readonly knownLimitationsRationale?: string;
}

export interface ScenarioExecutionResult {
  readonly scenarioId: ValidationScenarioId;
  readonly passed: boolean;
  readonly exitCodeMatch: boolean;
  readonly statusMatch: boolean;
  readonly schemaValid: boolean;
  readonly referentialIntegrityValid: boolean;
  readonly repositoryUnmodified: boolean;
  readonly forbiddenClaimsRespected: boolean;
  readonly actualExitCode: number;
  readonly actualStatus?: string;
  readonly discrepancies: readonly string[];
  readonly executionTimeMs: number;
}
