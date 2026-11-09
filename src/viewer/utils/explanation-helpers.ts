/**
 * Change Archaeologist — Plain-English Explanation Helpers
 *
 * Deterministic, data-grounded explanations for newcomers, non-technical users,
 * students, and experienced engineers.
 *
 * Epistemic Rules:
 * 1. Grounded strictly in validated AnalysisReport data.
 * 2. Never claim tests ran, passed, or failed unless established by data.
 * 3. Never equate correlation with causation.
 * 4. Explicitly state what is established vs what is NOT established.
 */

import type {
  AnalysisReport,
  StructuralChange,
  TestChange,
  CorrelationItem,
  CorrelationStatus,
  CorrelationGraphNode,
  CorrelationGraphEdge,
} from "../types/index.js";
import { formatSpanCoordinates } from "./source-location.js";

export interface PlainEnglishExplanation {
  readonly entityType: string;
  readonly plainTitle: string;
  readonly whatChanged: string;
  readonly evidenceSummary: string;
  readonly establishes: string;
  readonly doesNotEstablish: string;
  readonly technicalBadge?: string;
  readonly status?: CorrelationStatus;
}

export interface ReportReadingGuideData {
  readonly targetName: string;
  readonly targetPath: string;
  readonly commitRange: string;
  readonly whatChanged: {
    readonly summary: string;
    readonly details: string[];
  };
  readonly whatTestsTellUs: {
    readonly summary: string;
    readonly details: string[];
  };
  readonly whatWeCanConclude: {
    readonly summary: string;
    readonly details: string[];
  };
}

/**
 * Plain-English glossary of core technical concepts
 */
export const CONCEPT_EXPLANATIONS = {
  astMutation: {
    term: "Code change",
    plain: "A structural modification in the code syntax tree (like deleting a guard check or changing a return value), ignoring harmless formatting or whitespace differences.",
  },
  companionTest: {
    term: "Related test",
    plain: "A test file that was edited in the same Git commit range as the production code change.",
  },
  correlationLink: {
    term: "Link",
    plain: "A detected analytical link showing whether test changes reference or correspond to the changed production code.",
  },
  evidenceAnchor: {
    term: "Evidence",
    plain: "A verified proof record linking every observation directly to a Git commit, file path, line number, and code snippet.",
  },
  epistemicFindings: {
    term: "Finding",
    plain: "Facts observed directly in the code, rule-based hypotheses inferred from those facts, and explicit boundaries showing what static analysis cannot prove.",
  },
  strongStatus: {
    term: "STRONG",
    plain: "A test assertion directly calls or names the modified production function in the same commit.",
  },
  weakStatus: {
    term: "WEAK",
    plain: "A test block or test suite was modified in the same commit, but without a direct assertion targeting the specific changed function.",
  },
  uncertainStatus: {
    term: "UNCERTAIN",
    plain: "Changes were detected in both production code and tests, but relationships are ambiguous or incomplete.",
  },
  noneStatus: {
    term: "NONE",
    plain: "No related test changes were found for this production code change in the analyzed commit range.",
  },
  analysisBoundaries: {
    term: "Analysis Boundaries & Incomplete States",
    plain: "Explicit disclosures indicating where static analysis hit limits (e.g., function deleted in HEAD, syntax errors, or unanalyzed revisions).",
  },
};

/**
 * Explains a structural code change in plain English
 */
export function explainStructuralChange(
  sc: StructuralChange,
  functionName?: string
): PlainEnglishExplanation {
  const target = functionName ? `'${functionName}'` : "the function";
  let plainTitle = "Code Modification";
  let whatChanged = sc.summary;

  switch (sc.category) {
    case "GUARD_CLAUSE":
      if (sc.changeType === "REMOVED") {
        plainTitle = "Defensive Safety Check Removed";
        whatChanged = `A guard clause (input validation or prerequisite check) was removed from ${target}.`;
      } else if (sc.changeType === "ADDED") {
        plainTitle = "Defensive Safety Check Added";
        whatChanged = `A new guard clause was added to ${target} to check inputs or conditions early.`;
      } else {
        plainTitle = "Defensive Safety Check Modified";
        whatChanged = `An existing guard check in ${target} was altered.`;
      }
      break;

    case "CONDITIONAL_EXPRESSION":
      plainTitle = "Decision Logic Changed";
      whatChanged = `A conditional branch or boolean expression in ${target} was modified.`;
      break;

    case "RETURN_STATEMENT":
      plainTitle = "Returned Value or Output Changed";
      whatChanged = `The value or expression returned by ${target} was modified.`;
      break;

    case "THROW_STATEMENT":
      plainTitle = "Error Handling Changed";
      whatChanged = `An exception throwing statement in ${target} was modified or converted.`;
      break;

    default:
      plainTitle = "Structural Code Modification";
      whatChanged = sc.summary;
      break;
  }

  const spanStr = sc.afterSpan
    ? `HEAD ${formatSpanCoordinates(sc.afterSpan)}`
    : sc.beforeSpan
    ? `BASE ${formatSpanCoordinates(sc.beforeSpan)}`
    : "coordinates not specified";

  return {
    entityType: "Production Code Change",
    plainTitle,
    whatChanged,
    evidenceSummary: `Change ID: ${sc.id} | Location: ${spanStr}`,
    establishes: "The syntax tree of this function was structurally altered between the two Git commits.",
    doesNotEstablish: "Whether this change caused a bug, altered runtime behavior for callers, or passed code review.",
    technicalBadge: `${sc.changeType}: ${sc.category}`,
  };
}

/**
 * Explains a test change in plain English
 */
export function explainTestChange(
  tc: TestChange,
  targetFunctionName?: string
): PlainEnglishExplanation {
  const assertionCount = tc.assertionChanges.length;
  const targetStr = targetFunctionName ? `'${targetFunctionName}'` : "the target function";
  const callsTarget = tc.mentionsTargetFunction || tc.assertionChanges.some((a) => a.callsTargetFunctionInBlock);

  let plainTitle = "Related Test File Changed";
  let whatChanged = `'${tc.posixTestFilePath}' changed, with ${assertionCount} ${assertionCount === 1 ? "assertion" : "assertions"} updated.`;

  if (callsTarget) {
    plainTitle = "Test Calling Changed Function";
    whatChanged += ` This test file directly invokes or references ${targetStr}.`;
  } else {
    plainTitle = "Test in Same Commit (No Direct Call)";
    whatChanged += ` This test file does not directly call ${targetStr}.`;
  }

  return {
    entityType: "Related Test Change",
    plainTitle,
    whatChanged,
    evidenceSummary: `Test Change ID: ${tc.id} | File: ${tc.posixTestFilePath} | Assertions: ${assertionCount}`,
    establishes: `This test file was edited in the same commit range as the production code change.`,
    doesNotEstablish: "Whether this test was executed during CI/CD, whether it passed, or whether it tests the specific bug.",
    technicalBadge: callsTarget ? "Calls Target Function" : "No Direct Call",
  };
}

/**
 * Explains a correlation link between code and tests in plain English
 */
export function explainCorrelation(
  corr: CorrelationItem,
  targetFunctionName?: string
): PlainEnglishExplanation {
  const targetStr = targetFunctionName ? `'${targetFunctionName}'` : "the production function";
  let plainTitle = "Code–Test Relationship";
  let establishes = "Co-occurrence in the same Git commit and syntactic naming association.";
  let doesNotEstablish = "Runtime test execution, test passage, or dynamic verification.";

  switch (corr.status) {
    case "STRONG":
      plainTitle = "Direct Assertion Relationship (STRONG)";
      establishes = `A test assertion modified in this commit directly calls or checks ${targetStr}.`;
      doesNotEstablish = "That the test was run in CI, passed, or adequately validates the code change.";
      break;

    case "WEAK":
      plainTitle = "Enclosing Test Block Modified (WEAK)";
      establishes = `A test suite or description block was edited in the same commit, but without direct assertion targeting on ${targetStr}.`;
      doesNotEstablish = "Direct interaction between the modified test and the modified function.";
      break;

    case "UNCERTAIN":
      plainTitle = "Ambiguous Relationship (UNCERTAIN)";
      establishes = "Changes exist in both code and tests, but relationship cannot be conclusively determined from syntax alone.";
      doesNotEstablish = "Any causal or functional link between the code change and the test change.";
      break;

    case "NONE":
    default:
      plainTitle = "No Relationship Found (NONE)";
      establishes = `No companion test changes were linked to ${targetStr} in the analyzed commit range.`;
      doesNotEstablish = "That the code is untested — tests may exist in other unanalyzed files or commits.";
      break;
  }

  const evidenceSummary =
    corr.evidenceIds.length > 0
      ? `Evidence Anchors: ${corr.evidenceIds.join(", ")}`
      : "No direct evidence anchors attached";

  return {
    entityType: "Code–Test Relationship",
    plainTitle,
    whatChanged: corr.rationale,
    evidenceSummary: `Correlation ID: ${corr.id} | ${evidenceSummary}`,
    establishes,
    doesNotEstablish,
    technicalBadge: `[${corr.status}] ${corr.classification}`,
    status: corr.status,
  };
}

/**
 * Explains a graph node in plain English
 */
export function explainGraphNode(
  node: CorrelationGraphNode,
  report: AnalysisReport
): PlainEnglishExplanation {
  const targetName = report.request.targetFunctionName;

  switch (node.data.category) {
    case "PRODUCTION_FUNCTION":
      return {
        entityType: "Target Production Function",
        plainTitle: `Target Function: ${targetName}`,
        whatChanged: `The primary function under historical analysis in file '${report.request.targetFilePath}'.`,
        evidenceSummary: `Base Commit: ${report.baseCommit.shortSha} → Head Commit: ${report.headCommit.shortSha}`,
        establishes: `This function was present in the base revision and analyzed across revisions.`,
        doesNotEstablish: "Whether all callers across the codebase were analyzed.",
        technicalBadge: "PRODUCTION FUNCTION",
      };

    case "STRUCTURAL_CHANGE": {
      const sc = report.structuralChanges.find((s) => s.id === node.data.entityId);
      if (sc) {
        return explainStructuralChange(sc, targetName);
      }
      return {
        entityType: "Production Code Change",
        plainTitle: node.data.title,
        whatChanged: node.data.subtitle,
        evidenceSummary: `Change ID: ${node.data.entityId}`,
        establishes: "A structural AST mutation in the target function.",
        doesNotEstablish: "Runtime failure or bug causation.",
        technicalBadge: "STRUCTURAL CHANGE",
      };
    }

    case "TEST_FILE":
      return {
        entityType: "Related Test File",
        plainTitle: `Test File: ${node.data.title}`,
        whatChanged: `A companion test file modified within the same commit revision range.`,
        evidenceSummary: `File: ${node.data.title}`,
        establishes: "This file was touched in the analyzed commit range.",
        doesNotEstablish: "Whether the test suite was executed in CI/CD.",
        technicalBadge: "TEST FILE",
      };

    case "TEST_CHANGE": {
      const tc = report.testChanges.find((t) => t.id === node.data.entityId);
      if (tc) {
        return explainTestChange(tc, targetName);
      }
      return {
        entityType: "Test Change",
        plainTitle: node.data.title,
        whatChanged: node.data.subtitle,
        evidenceSummary: `Test Change ID: ${node.data.entityId}`,
        establishes: "An assertion change detected in the companion test file.",
        doesNotEstablish: "That the test passed or failed.",
        technicalBadge: "TEST CHANGE",
      };
    }

    case "TEST_DECLARATION": {
      return {
        entityType: "Test Block Header",
        plainTitle: `Test Block: ${node.data.title}`,
        whatChanged: node.data.subtitle,
        evidenceSummary: `Entity ID: ${node.data.entityId}`,
        establishes: "A test declaration block (it/test/describe) modified in the commit.",
        doesNotEstablish: "Assertion verification.",
        technicalBadge: "TEST DECLARATION",
      };
    }

    default:
      return {
        entityType: "Graph Node",
        plainTitle: node.data.title,
        whatChanged: node.data.subtitle,
        evidenceSummary: `ID: ${node.id}`,
        establishes: "Observed entity in the report model.",
        doesNotEstablish: "Runtime effects.",
      };
  }
}

/**
 * Explains a graph edge in plain English
 */
export function explainGraphEdge(
  edge: CorrelationGraphEdge,
  report: AnalysisReport
): PlainEnglishExplanation {
  const targetName = report.request.targetFunctionName;

  if (edge.data.category !== "CORRELATED_WITH") {
    return {
      entityType: "Containment Relationship",
      plainTitle: "Parent / Child Code Containment",
      whatChanged: "Shows that this mutation or test change is physically located within the parent file or function.",
      evidenceSummary: `Source: ${edge.source} → Target: ${edge.target}`,
      establishes: "Syntactic containment in the same source file.",
      doesNotEstablish: "Execution frequency or call counts.",
      technicalBadge: edge.data.category,
    };
  }

  // Correlation edge
  const corr = report.correlationItems?.find(
    (c) =>
      c.structuralChangeId === edge.data.sourceEntityId &&
      c.testChangeId === edge.data.targetEntityId
  );

  if (corr) {
    return explainCorrelation(corr, targetName);
  }

  const edgeStatus = edge.data.status ?? undefined;

  return {
    entityType: "Code–Test Relationship",
    plainTitle: `Correlation: ${edgeStatus ?? "DETECTED"}`,
    whatChanged: `Analytical link between production change '${edge.data.sourceEntityId}' and test change '${edge.data.targetEntityId}'.`,
    evidenceSummary: `Edge ID: ${edge.id}`,
    establishes: "Co-occurrence in Git revision history.",
    doesNotEstablish: "Dynamic runtime causality.",
    status: edgeStatus,
    technicalBadge: edgeStatus ? `[${edgeStatus}]` : "CORRELATED_WITH",
  };
}

/**
 * Derives comprehensive data for the "How to Read This Report" guide
 */
export function buildReportReadingGuideData(report: AnalysisReport): ReportReadingGuideData {
  const targetName = report.request.targetFunctionName;
  const targetPath = report.request.targetFilePath;
  const commitRange = `${report.baseCommit.shortSha} → ${report.headCommit.shortSha}`;

  const scCount = report.structuralChanges.length;
  const tcCount = report.testChanges.length;
  const corrCount = report.correlationItems?.length ?? report.correlations.length;

  const addedCount = report.structuralChanges.filter((s) => s.changeType === "ADDED").length;
  const modifiedCount = report.structuralChanges.filter((s) => s.changeType === "MODIFIED").length;
  const removedCount = report.structuralChanges.filter((s) => s.changeType === "REMOVED").length;

  const strongCount = report.correlationItems?.filter((c) => c.status === "STRONG").length ?? 0;
  const weakCount = report.correlationItems?.filter((c) => c.status === "WEAK").length ?? 0;

  // 1. What changed?
  let scSummary = `We compared '${targetName}' between ${commitRange} and found ${scCount} structural ${scCount === 1 ? "change" : "changes"}.`;
  if (scCount === 0) {
    scSummary = `No structural changes were found in '${targetName}' between ${commitRange}.`;
  }

  const scDetails: string[] = [];
  if (addedCount > 0) scDetails.push(`${addedCount} ${addedCount === 1 ? "part" : "parts"} added`);
  if (modifiedCount > 0) scDetails.push(`${modifiedCount} ${modifiedCount === 1 ? "part" : "parts"} changed`);
  if (removedCount > 0) scDetails.push(`${removedCount} ${removedCount === 1 ? "part" : "parts"} removed`);

  if (report.structuralChanges.length > 0) {
    const firstSc = report.structuralChanges[0];
    scDetails.push(`Main change: ${firstSc.summary}`);
  }

  // 2. What do the tests tell us?
  let testSummary = `We looked for test changes in the same range and found ${tcCount} ${tcCount === 1 ? "test change" : "test changes"}.`;
  const testDetails: string[] = [];
  if (tcCount === 0) {
    testSummary = `No test files changed in this range.`;
        testDetails.push("Existing tests might still cover this function. They just weren't edited here.");
  } else {
    const totalAssertions = report.testChanges.reduce((acc, t) => acc + t.assertionChanges.length, 0);
    testDetails.push(`${totalAssertions} ${totalAssertions === 1 ? "assertion" : "assertions"} changed.`);
    const callingTests = report.testChanges.filter(
      (t) => t.mentionsTargetFunction || t.assertionChanges.some((a) => a.callsTargetFunctionInBlock)
    );
    if (callingTests.length > 0) {
      testDetails.push(`Calls '${targetName}' directly: ${callingTests.length} of ${tcCount}.`);
    } else {
      testDetails.push(`None of them call '${targetName}' directly.`);
    }
  }

  // 3. What can we conclude?
  let concludeSummary = `From reading the code and its Git history:`;
  const concludeDetails: string[] = [];

  if (strongCount > 0) {
    concludeDetails.push(
      `${strongCount} STRONG ${strongCount === 1 ? "link" : "links"}: a changed test directly calls '${targetName}'.`
    );
  } else if (weakCount > 0) {
    concludeDetails.push(
      `${weakCount} WEAK ${weakCount === 1 ? "link" : "links"}: a test file changed, but nothing points at '${targetName}' directly.`
    );
  } else if (scCount > 0 && tcCount === 0) {
    concludeDetails.push(
      `The code changed with no test changes in the same range.`
    );
  } else {
    concludeDetails.push(
      `${corrCount} ${corrCount === 1 ? "link" : "links"} recorded.`
    );
  }

  concludeDetails.push(
    "This tool read the code. It did not run the tests."
  );
  concludeDetails.push(
    "A link doesn't prove a test passed, or that it caught or prevented a bug."
  );

  return {
    targetName,
    targetPath,
    commitRange,
    whatChanged: {
      summary: scSummary,
      details: scDetails,
    },
    whatTestsTellUs: {
      summary: testSummary,
      details: testDetails,
    },
    whatWeCanConclude: {
      summary: concludeSummary,
      details: concludeDetails,
    },
  };
}
