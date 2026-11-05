/**
 * Change Archaeologist — Change Timeline Model Generator
 *
 * Derives a typed commit-to-commit comparative timeline model strictly from
 * validated AnalysisReport domain objects without fabricating intermediate history,
 * timestamps, authors, or unverified runtime causal links.
 */

import type {
  AnalysisReport,
  RevisionAnchor,
  TimelineChangeItem,
  TimelineModel,
  TimelineFilter,
  StructuralChange,
  TestChange,
  TestDeclarationChange,
} from "../types/index.js";

/**
 * Builds a RevisionAnchor from report commit info and function snapshot.
 */
function buildRevisionAnchor(
  role: "BASE" | "HEAD",
  report: AnalysisReport
): RevisionAnchor {
  const commit = role === "BASE" ? report.baseCommit : report.headCommit;
  const fnSnapshot = role === "BASE" ? report.baseFunction : report.headFunction;

  let functionStatus: RevisionAnchor["functionStatus"] = "UNAVAILABLE";
  if (fnSnapshot === null) {
    functionStatus = "DELETED";
  } else if (fnSnapshot === undefined) {
    functionStatus = "ABSENT";
  } else {
    functionStatus = "PRESENT";
  }

  const shortSha = commit?.shortSha || (commit?.sha ? commit.sha.slice(0, 7) : "unknown");
  const sha = commit?.sha || shortSha;
  const authorName = commit?.authorName || "Unknown Author";
  const committedAtIso = commit?.committedAtIso || report.generatedAtIso;
  const subject = commit?.subject || (role === "BASE" ? "Base revision" : "Head revision");

  return {
    role,
    sha,
    shortSha,
    authorName,
    committedAtIso,
    subject,
    functionSnapshot: fnSnapshot,
    functionStatus,
    formattedLabel: `${role} (${shortSha})`,
  };
}

/**
 * Derives unique evidence identifiers linked to a given structural change.
 */
function getEvidenceIdsForStructuralChange(
  scId: string,
  report: AnalysisReport
): readonly string[] {
  const evSet = new Set<string>();

  // Collect from observations in findings linked to this change
  for (const finding of report.findings) {
    if (finding.structuralChangeIds.includes(scId)) {
      for (const obs of finding.observed) {
        for (const evId of obs.evidenceIds) {
          evSet.add(evId);
        }
      }
    }
  }

  // Collect from correlation items linked to this change
  if (report.correlationItems) {
    for (const item of report.correlationItems) {
      if (item.structuralChangeId === scId) {
        for (const evId of item.evidenceIds) {
          evSet.add(evId);
        }
      }
    }
  }

  return Array.from(evSet);
}

/**
 * Derives unique finding IDs linked to a given structural change.
 */
function getFindingIdsForStructuralChange(
  scId: string,
  report: AnalysisReport
): readonly string[] {
  const findingSet = new Set<string>();
  for (const finding of report.findings) {
    if (finding.structuralChangeIds.includes(scId)) {
      findingSet.add(finding.id);
    }
  }
  return Array.from(findingSet);
}

/**
 * Finds correlation status and rationale for a structural change.
 */
function getCorrelationForStructuralChange(
  scId: string,
  report: AnalysisReport
): { status: TimelineChangeItem["correlationStatus"]; rationale: string | null } {
  // Check correlationItems first
  if (report.correlationItems) {
    const item = report.correlationItems.find((c) => c.structuralChangeId === scId);
    if (item) {
      return { status: item.status, rationale: item.rationale };
    }
  }

  // Fallback to correlations
  const corr = report.correlations.find((c) => c.structuralChangeId === scId);
  if (corr) {
    return { status: corr.status, rationale: corr.rationale };
  }

  return { status: null, rationale: null };
}

/**
 * Converts a StructuralChange into a TimelineChangeItem.
 */
function mapStructuralChangeToTimelineItem(
  sc: StructuralChange,
  report: AnalysisReport
): TimelineChangeItem {
  const { status, rationale } = getCorrelationForStructuralChange(sc.id, report);
  const evidenceIds = getEvidenceIdsForStructuralChange(sc.id, report);
  const findingIds = getFindingIdsForStructuralChange(sc.id, report);

  const span = sc.afterSpan ?? sc.beforeSpan;
  const isSourceAvailable =
    sc.beforeSnippet !== null ||
    sc.afterSnippet !== null ||
    sc.beforeSpan !== null ||
    sc.afterSpan !== null;

  return {
    id: `timeline-sc-${sc.id}`,
    sourceEntityId: sc.id,
    itemType: "STRUCTURAL_CHANGE",
    title: sc.summary,
    subtitle: `${report.request.targetFunctionName}() in ${report.request.targetFilePath}`,
    category: sc.category,
    changeType: sc.changeType,
    filePath: report.request.targetFilePath,
    span,
    evidenceIds,
    findingIds,
    correlationStatus: status,
    correlationRationale: rationale,
    epistemicTag: "OBSERVED",
    isSourceAvailable,
    rawChange: sc,
  };
}

/**
 * Converts a TestChange into a TimelineChangeItem.
 */
function mapTestChangeToTimelineItem(
  tc: TestChange,
  report: AnalysisReport
): TimelineChangeItem {
  // Check if correlated
  let correlationStatus: TimelineChangeItem["correlationStatus"] = null;
  let correlationRationale: string | null = null;

  if (report.correlationItems) {
    const item = report.correlationItems.find((c) => c.testChangeId === tc.id);
    if (item) {
      correlationStatus = item.status;
      correlationRationale = item.rationale;
    }
  }

  if (!correlationStatus) {
    const corr = report.correlations.find((c) => c.relatedTestChangeIds.includes(tc.id));
    if (corr) {
      correlationStatus = corr.status;
      correlationRationale = corr.rationale;
    }
  }

  // Find evidence items for this test file
  const evidenceIds = report.evidence
    .filter((e) => e.posixFilePath === tc.posixTestFilePath)
    .map((e) => e.id);

  const primaryAssertion = tc.assertionChanges[0];
  const span = primaryAssertion?.afterSpan ?? primaryAssertion?.beforeSpan ?? null;

  let title = "";
  if (tc.assertionChanges.length > 0) {
    title = `${tc.assertionChanges.length} assertion change(s) in ${tc.posixTestFilePath}`;
  } else {
    title = `Companion test file ${tc.fileChangeStatus.toLowerCase()} (${tc.posixTestFilePath})`;
  }

  const category =
    tc.fileChangeStatus === "MODIFIED"
      ? "ASSERTION_MODIFIED"
      : `TEST_FILE_${tc.fileChangeStatus}`;

  const isSourceAvailable = tc.assertionChanges.length > 0;

  return {
    id: `timeline-tc-${tc.id}`,
    sourceEntityId: tc.id,
    itemType: "TEST_CHANGE",
    title,
    subtitle: tc.posixTestFilePath,
    category,
    changeType: tc.fileChangeStatus,
    filePath: tc.posixTestFilePath,
    span,
    evidenceIds,
    findingIds: [],
    correlationStatus,
    correlationRationale,
    epistemicTag: "OBSERVED",
    isSourceAvailable,
    rawChange: tc,
  };
}

/**
 * Converts a TestDeclarationChange into a TimelineChangeItem.
 */
function mapDeclarationChangeToTimelineItem(
  tdc: TestDeclarationChange,
  report: AnalysisReport
): TimelineChangeItem {
  // Check for weak or indirect declaration correlation
  let correlationStatus: TimelineChangeItem["correlationStatus"] = null;
  let correlationRationale: string | null = null;

  if (report.correlationItems) {
    const item = report.correlationItems.find(
      (c) =>
        c.classification === "POTENTIALLY_RELATED_TEST_DECLARATION_CHANGED" &&
        c.posixTestFilePath === tdc.posixTestFilePath
    );
    if (item) {
      correlationStatus = item.status;
      correlationRationale = item.rationale;
    }
  }

  const evidenceIds = report.evidence
    .filter((e) => e.posixFilePath === tdc.posixTestFilePath)
    .map((e) => e.id);

  const span = tdc.afterSpan ?? tdc.beforeSpan;
  const isSourceAvailable = span !== null;

  return {
    id: `timeline-tdc-${tdc.id}`,
    sourceEntityId: tdc.id,
    itemType: "DECLARATION_CHANGE",
    title: tdc.fullTitle,
    subtitle: tdc.details ?? tdc.posixTestFilePath,
    category: `TEST_DECLARATION_${tdc.changeType}`,
    changeType: tdc.changeType,
    filePath: tdc.posixTestFilePath,
    span,
    evidenceIds,
    findingIds: [],
    correlationStatus,
    correlationRationale,
    epistemicTag: "OBSERVED",
    isSourceAvailable,
    rawChange: tdc,
  };
}

/**
 * Constructs the complete presentation TimelineModel from an AnalysisReport.
 */
export function buildTimelineModel(report: AnalysisReport): TimelineModel {
  const baseAnchor = buildRevisionAnchor("BASE", report);
  const headAnchor = buildRevisionAnchor("HEAD", report);

  const items: TimelineChangeItem[] = [];

  // 1. Map structural production changes
  for (const sc of report.structuralChanges) {
    items.push(mapStructuralChangeToTimelineItem(sc, report));
  }

  // 2. Map test file changes
  for (const tc of report.testChanges) {
    items.push(mapTestChangeToTimelineItem(tc, report));
  }

  // 3. Map test declaration changes (if provided in report)
  if (report.declarationChanges && report.declarationChanges.length > 0) {
    for (const tdc of report.declarationChanges) {
      items.push(mapDeclarationChangeToTimelineItem(tdc, report));
    }
  }

  const structuralCount = report.structuralChanges.length;
  const testChangeCount = report.testChanges.length;
  const declarationCount = report.declarationChanges?.length ?? 0;
  const totalChangesCount = items.length;

  const correlatedCount = items.filter((item) => item.correlationStatus !== null).length;

  const isIncomplete =
    report.status.startsWith("INCOMPLETE") ||
    headAnchor.functionStatus === "DELETED" ||
    baseAnchor.functionStatus === "ABSENT";

  let incompleteReason: string | null = null;
  if (isIncomplete) {
    if (report.limitations.length > 0) {
      incompleteReason = report.limitations[0];
    } else if (headAnchor.functionStatus === "DELETED") {
      incompleteReason = `Target function '${report.request.targetFunctionName}' was deleted or renamed in HEAD.`;
    } else if (baseAnchor.functionStatus === "ABSENT") {
      incompleteReason = `Target function '${report.request.targetFunctionName}' was introduced in HEAD and did not exist in BASE.`;
    } else {
      incompleteReason = `Analysis status '${report.status}' prevented complete comparative snapshot.`;
    }
  }

  const comparisonDirection = `${baseAnchor.shortSha} → ${headAnchor.shortSha}`;

  return {
    baseAnchor,
    headAnchor,
    items,
    comparisonDirection,
    totalChangesCount,
    structuralCount,
    testChangeCount,
    declarationCount,
    correlatedCount,
    analysisStatus: report.status,
    isIncomplete,
    incompleteReason,
  };
}

/**
 * Filters timeline items according to active TimelineFilter.
 */
export function filterTimelineItems(
  items: readonly TimelineChangeItem[],
  filter: TimelineFilter
): TimelineChangeItem[] {
  switch (filter) {
    case "structural":
      return items.filter((item) => item.itemType === "STRUCTURAL_CHANGE");
    case "tests":
      return items.filter(
        (item) => item.itemType === "TEST_CHANGE" || item.itemType === "DECLARATION_CHANGE"
      );
    case "correlated":
      return items.filter((item) => item.correlationStatus !== null);
    case "all":
    default:
      return [...items];
  }
}

