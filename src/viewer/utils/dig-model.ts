/**
 * Change Archaeologist — The Dig presentation model
 *
 * Pure derivation from a validated AnalysisReport. Draws only what the report
 * contains, and keeps "no link recorded" distinct from a NONE correlation.
 */

import type {
  AnalysisReport,
  CorrelationItem,
  CorrelationResult,
  StructuralChange,
  TestChange,
} from "../types/index.js";
import type {
  DigCard,
  DigColumn,
  DigFault,
  DigFocus,
  DigLine,
  DigModel,
  DigRow,
  DigShaft,
  DigShaftEnd,
  DigTestCard,
  DigTestFile,
} from "../types/dig.js";
import { extractFunctionSource } from "./source-location.js";
import { buildVerdict } from "./verdict.js";

/** Functions at or below this many lines are always drawn in full. */
const COMPRESS_OVER_LINES = 24;
const CONTEXT_LINES = 2;
/** Hiding fewer lines than this saves no room once a gap row is drawn. */
const MIN_GAP_LINES = 3;

interface ChangedRange {
  readonly start: number;
  readonly end: number;
  readonly changeType: StructuralChange["changeType"];
}

function buildColumn(
  role: "BASE" | "HEAD",
  shortSha: string,
  fn: AnalysisReport["baseFunction"],
  ranges: readonly ChangedRange[],
  expandAll: boolean
): DigColumn {
  const source = extractFunctionSource(fn);
  if (!source.isAvailable) {
    return {
      role,
      shortSha,
      state: source.isDeleted ? "ABSENT" : "UNAVAILABLE",
      rows: [],
      lineCount: 0,
    };
  }

  const firstLine = source.span?.startLine ?? 1;
  const lines: DigLine[] = source.source.split("\n").map((text, index) => {
    const number = firstLine + index;
    const range = ranges.find((r) => number >= r.start && number <= r.end);
    return { number, text, changeType: range?.changeType ?? null };
  });

  const keep = (index: number): boolean => {
    if (expandAll || lines.length <= COMPRESS_OVER_LINES) return true;
    if (index === 0 || index === lines.length - 1) return true;
    const from = Math.max(0, index - CONTEXT_LINES);
    const to = Math.min(lines.length - 1, index + CONTEXT_LINES);
    return lines.slice(from, to + 1).some((line) => line.changeType !== null);
  };

  const rows: DigRow[] = [];
  let hidden: DigLine[] = [];
  const flushHidden = () => {
    if (hidden.length >= MIN_GAP_LINES) {
      rows.push({
        kind: "gap",
        from: hidden[0].number,
        to: hidden[hidden.length - 1].number,
        count: hidden.length,
      });
    } else {
      hidden.forEach((line) => rows.push({ kind: "line", line }));
    }
    hidden = [];
  };

  lines.forEach((line, index) => {
    if (keep(index)) {
      flushHidden();
      rows.push({ kind: "line", line });
    } else {
      hidden.push(line);
    }
  });
  flushHidden();

  return { role, shortSha, state: "PRESENT", rows, lineCount: lines.length };
}

function hasChangeId(id: string | null | undefined, faults: ReadonlyMap<string, DigFault>): id is string {
  return typeof id === "string" && faults.has(id);
}

function endFor(status: DigShaft["status"], hasTest: boolean, hasFile: boolean): DigShaftEnd {
  if (status === "NONE") return "OPEN";
  if (hasTest) return "ASSERTION";
  return hasFile ? "FILE" : "OPEN";
}

function conflictFor(
  faultId: string,
  status: DigShaft["status"],
  results: readonly CorrelationResult[]
): DigShaft["conflictingResult"] {
  const result = results.find((r) => r.structuralChangeId === faultId);
  return result && result.status !== status ? { id: result.id, status: result.status } : null;
}

function shaftFromItem(
  item: CorrelationItem,
  testIds: ReadonlySet<string>,
  results: readonly CorrelationResult[]
): DigShaft {
  const testChangeId = item.testChangeId && testIds.has(item.testChangeId) ? item.testChangeId : null;
  const faultId = item.structuralChangeId as string;
  return {
    id: item.id,
    correlationItemId: item.id,
    faultId,
    testChangeId,
    testFilePath: item.posixTestFilePath,
    status: item.status,
    classification: item.classification,
    end: endFor(item.status, testChangeId !== null, Boolean(item.posixTestFilePath)),
    observed: item.observedFact,
    inferred: item.inferredRelationship,
    unknowns: item.unknowns,
    evidenceIds: item.evidenceIds,
    conflictingResult: conflictFor(faultId, item.status, results),
  };
}

/** Older reports may carry only report-level results, without correlation items. */
function shaftsFromResult(
  result: CorrelationResult,
  testChanges: readonly TestChange[]
): DigShaft[] {
  const base = {
    correlationItemId: null,
    faultId: result.structuralChangeId,
    status: result.status,
    classification: null,
    observed: result.rationale,
    inferred: null,
    unknowns: [],
    evidenceIds: [],
    conflictingResult: null,
  };
  const related = result.relatedTestChangeIds
    .map((id) => testChanges.find((t) => t.id === id))
    .filter((t): t is TestChange => t !== undefined);

  if (related.length === 0) {
    return [{ ...base, id: result.id, testChangeId: null, testFilePath: null, end: "OPEN" }];
  }
  return related.map((test) => ({
    ...base,
    id: `${result.id}:${test.id}`,
    testChangeId: test.id,
    testFilePath: test.posixTestFilePath,
    end: endFor(result.status, true, true),
  }));
}

function buildTestFiles(report: AnalysisReport, shafts: readonly DigShaft[]): DigTestFile[] {
  const byPath = new Map<string, DigCard[]>();
  const cardsFor = (path: string): DigCard[] => {
    let cards = byPath.get(path);
    if (!cards) {
      cards = [];
      byPath.set(path, cards);
    }
    return cards;
  };

  for (const test of report.testChanges) {
    const card: DigTestCard = {
      kind: "TEST_CHANGE",
      id: test.id,
      testChange: test,
      firstAssertion: test.assertionChanges[0] ?? null,
      extraAssertions: Math.max(0, test.assertionChanges.length - 1),
      evidenceIds: Array.from(
        new Set(
          (report.correlationItems ?? [])
            .filter((item) => item.testChangeId === test.id)
            .flatMap((item) => item.evidenceIds)
        )
      ),
    };
    cardsFor(test.posixTestFilePath).push(card);
  }
  for (const declaration of report.declarationChanges ?? []) {
    cardsFor(declaration.posixTestFilePath).push({
      kind: "DECLARATION",
      id: declaration.id,
      declaration,
    });
  }
  // A link can name a test file that had no recorded change. It still needs a place to land.
  for (const shaft of shafts) {
    if (shaft.end === "FILE" && shaft.testFilePath) cardsFor(shaft.testFilePath);
  }

  return Array.from(byPath, ([path, cards]) => ({ path, cards }));
}

export function buildDigModel(
  report: AnalysisReport,
  options: { readonly expandAll?: boolean } = {}
): DigModel {
  const expandAll = options.expandAll ?? false;
  const changes = report.structuralChanges;

  const toRange = (
    span: StructuralChange["beforeSpan"],
    changeType: StructuralChange["changeType"]
  ): ChangedRange | null => (span ? { start: span.startLine, end: span.endLine, changeType } : null);

  const baseRanges = changes.flatMap((c) => toRange(c.beforeSpan, c.changeType) ?? []);
  const headRanges = changes.flatMap((c) => toRange(c.afterSpan, c.changeType) ?? []);
  const base = buildColumn("BASE", report.baseCommit.shortSha, report.baseFunction, baseRanges, expandAll);
  const head = buildColumn("HEAD", report.headCommit.shortSha, report.headFunction, headRanges, expandAll);

  const faults: DigFault[] = changes.map((change) => ({
    id: change.id,
    change,
    beforeLines: change.beforeSpan ? [change.beforeSpan.startLine, change.beforeSpan.endLine] : null,
    afterLines: change.afterSpan ? [change.afterSpan.startLine, change.afterSpan.endLine] : null,
    findings: report.findings.filter((f) => f.structuralChangeIds.includes(change.id)),
  }));
  const faultById = new Map(faults.map((fault) => [fault.id, fault]));
  const testIds = new Set(report.testChanges.map((t) => t.id));

  const items = report.correlationItems ?? [];
  const shafts: DigShaft[] =
    items.length > 0
      ? items
          .filter((item) => hasChangeId(item.structuralChangeId, faultById))
          .map((item) => shaftFromItem(item, testIds, report.correlations))
      : report.correlations
          .filter((result) => hasChangeId(result.structuralChangeId, faultById))
          .flatMap((result) => shaftsFromResult(result, report.testChanges));

  const probed = new Set(shafts.map((shaft) => shaft.faultId));
  const countHidden = (column: DigColumn) =>
    column.rows.reduce((sum, row) => sum + (row.kind === "gap" ? row.count : 0), 0);

  return {
    functionName: report.request.targetFunctionName,
    filePath: report.request.targetFilePath,
    base,
    head,
    faults,
    shafts,
    unprobedFaultIds: faults.filter((f) => !probed.has(f.id)).map((f) => f.id),
    testFiles: buildTestFiles(report, shafts),
    unanchoredLinkCount:
      items.length > 0 ? items.filter((i) => !hasChangeId(i.structuralChangeId, faultById)).length : 0,
    hiddenLineCount: Math.max(countHidden(base), countHidden(head)),
    isIncomplete: report.status.startsWith("INCOMPLETE") || base.state !== "PRESENT" || head.state !== "PRESENT",
    verdict: buildVerdict(report),
  };
}

export interface DigLitSet {
  readonly faults: ReadonlySet<string>;
  readonly shafts: ReadonlySet<string>;
  readonly tests: ReadonlySet<string>;
}

/** Everything connected to the focused item. Returns null when nothing is focused. */
export function relatedToFocus(model: DigModel, focus: DigFocus | null): DigLitSet | null {
  if (!focus) return null;

  const shafts = model.shafts.filter((shaft) => {
    if (focus.kind === "shaft") return shaft.id === focus.id;
    if (focus.kind === "fault") return shaft.faultId === focus.id;
    return shaft.testChangeId === focus.id;
  });

  const faults = new Set(shafts.map((shaft) => shaft.faultId));
  const tests = new Set(shafts.flatMap((shaft) => shaft.testChangeId ?? []));
  if (focus.kind === "fault") faults.add(focus.id);
  if (focus.kind === "test") tests.add(focus.id);

  return { faults, shafts: new Set(shafts.map((shaft) => shaft.id)), tests };
}
