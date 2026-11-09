/**
 * Change Archaeologist - Dig stress report generator
 *
 * Builds one deterministic, schema-valid AnalysisReport for exercising The Dig
 * at scale: a large function in two versions, 96 structural changes, 32 test
 * changes, and every correlation shape the viewer can draw.
 *
 * Every span is computed from the generated source, so each fault lands on the
 * exact lines it describes. The data is invented and is labelled as such.
 */

import fs from "node:fs";
import path from "node:path";
import type {
  AnalysisReport,
  AssertionChangeRecord,
  CorrelationClassification,
  CorrelationItem,
  CorrelationResult,
  CorrelationStatus,
  EvidenceItem,
  Finding,
  FunctionSnapshot,
  ReviewAttentionLevel,
  RuleId,
  SourceSpan,
  StructuralChange,
  StructuralChangeCategory,
  TestChange,
  TestDeclarationChange,
  UnknownReasonCategory,
} from "../src/core/domain/types.js";

const TARGET_FILE = "src/payments/settlement.ts";
const FUNCTION_NAME = "settleTransfer";
const FUNCTION_START_LINE = 120;
const BASE_SHA = "a4f19c8e2d7b6a5031f0e9d8c7b6a5f4e3d2c1b0";
const HEAD_SHA = "d8b3a6f1c9e204758ab61d3f7e0c5a9b2d4f6e81";
const SIGNATURE = "export async function settleTransfer(transfer: Transfer, ctx: SettlementContext): Promise<SettlementResult> {";

const STAGES = [
  "identity", "sanctions", "limits", "fx", "fees", "ledger",
  "idempotency", "rails", "retry", "reconciliation", "notification", "audit",
] as const;

const TEST_FILES = [
  "tests/settlement/identity.test.ts",
  "tests/settlement/sanctions-screening.test.ts",
  "tests/settlement/limits.test.ts",
  "tests/settlement/fx-conversion.test.ts",
  "tests/settlement/ledger-postings.test.ts",
  "tests/settlement/retry-policy.test.ts",
  "tests/integration/payments/cross-border/settlement-reconciliation.integration.test.ts",
  "tests/e2e/checkout/settlement-happy-path.e2e.test.ts",
] as const;

type ChangeType = StructuralChange["changeType"];

interface ChangeShape {
  readonly category: StructuralChangeCategory;
  readonly changeType: ChangeType;
  readonly ruleId: RuleId;
  readonly summary: string;
  /** Offsets of the changed lines inside the block, inclusive. */
  readonly baseRange: readonly [number, number] | null;
  readonly headRange: readonly [number, number] | null;
}

interface Block {
  readonly base: readonly string[];
  readonly head: readonly string[];
  readonly change: ChangeShape;
}

/** Eight kinds of change, applied to each of the twelve settlement stages. */
function blockFor(stage: string, variant: number, stageIndex: number): Block {
  const code = stage.toUpperCase();
  switch (variant) {
    case 0: {
      const lines = [`  if (!ctx.${stage}.ready) {`, `    throw new SettlementError("${code}_NOT_READY", transfer.id);`, "  }"];
      return { base: lines, head: [], change: { category: "GUARD_CLAUSE", changeType: "REMOVED", ruleId: "RULE_GUARD_REMOVED", summary: `Guard clause removed: if (!ctx.${stage}.ready) with THROW exit`, baseRange: [0, 2], headRange: null } };
    }
    case 1: {
      const lines = [`  if (transfer.${stage}Hold?.active) {`, `    return reject(transfer, "${code}_ON_HOLD");`, "  }"];
      return { base: [], head: lines, change: { category: "GUARD_CLAUSE", changeType: "ADDED", ruleId: "RULE_GUARD_ADDED", summary: `Guard clause added: if (transfer.${stage}Hold?.active) with RETURN exit`, baseRange: null, headRange: [0, 2] } };
    }
    case 2:
      return {
        base: [`  if (transfer.amount > ctx.${stage}.ceiling) {`, `    return reject(transfer, "${code}_CEILING");`, "  }"],
        head: [`  if (transfer.amount >= ctx.${stage}.ceiling && !transfer.approvedOverride) {`, `    return reject(transfer, "${code}_CEILING");`, "  }"],
        change: { category: "GUARD_CLAUSE", changeType: "MODIFIED", ruleId: "RULE_GUARD_MODIFIED", summary: `Guard condition changed from "transfer.amount > ctx.${stage}.ceiling" to "transfer.amount >= ctx.${stage}.ceiling && !transfer.approvedOverride"`, baseRange: [0, 0], headRange: [0, 0] },
      };
    case 3:
      return {
        base: [`  if (ctx.${stage}.enabled && transfer.region === ctx.${stage}.region) {`, `    audit.mark("${stage}.eligible", transfer.id);`, "  }"],
        head: [`  if (ctx.${stage}.enabled || transfer.region === ctx.${stage}.region) {`, `    audit.mark("${stage}.eligible", transfer.id);`, "  }"],
        change: { category: "CONDITIONAL_EXPRESSION", changeType: "MODIFIED", ruleId: "RULE_CONDITIONAL_MODIFIED", summary: `Condition operator changed from "&&" to "||" in the ${stage} eligibility check`, baseRange: [0, 0], headRange: [0, 0] },
      };
    case 4:
      return {
        base: [`  if (ctx.${stage}.degraded) {`, `    throw new SettlementError("${code}_DEGRADED", transfer.id);`, "  }"],
        head: [`  if (ctx.${stage}.degraded) {`, `    throw new RetryableSettlementError("${code}_DEGRADED", transfer.id, { retryAfterMs: ${(stageIndex + 1) * 5000}, correlationId: ctx.trace.id });`, "  }"],
        change: { category: "THROW_STATEMENT", changeType: "MODIFIED", ruleId: "RULE_THROW_MODIFIED", summary: `Thrown error changed from SettlementError to RetryableSettlementError in the ${stage} stage`, baseRange: [1, 1], headRange: [1, 1] },
      };
    case 5:
      return {
        base: [`  if (!transfer.${stage}Token) {`, `    throw new SettlementError("${code}_TOKEN_MISSING", transfer.id);`, "  }"],
        head: [`  if (!transfer.${stage}Token) {`, `    return { status: "PENDING_REVIEW", transferId: transfer.id, reason: "${code}_TOKEN_MISSING" };`, "  }"],
        change: { category: "GUARD_CLAUSE", changeType: "MODIFIED", ruleId: "RULE_THROW_TO_RETURN_CONVERSION", summary: `Throw-to-return conversion under condition "!transfer.${stage}Token"`, baseRange: [1, 1], headRange: [1, 1] },
      };
    case 6:
      return {
        base: [`  if (ctx.${stage}.cached.has(transfer.id)) {`, `    return ctx.${stage}.cached.get(transfer.id);`, "  }"],
        head: [`  if (ctx.${stage}.cached.has(transfer.id)) {`, `    return { ...ctx.${stage}.cached.get(transfer.id), replayed: true, servedAt: ctx.clock.now() };`, "  }"],
        change: { category: "RETURN_STATEMENT", changeType: "MODIFIED", ruleId: "RULE_RETURN_MODIFIED", summary: `Return value in the ${stage} cache path now includes replay metadata`, baseRange: [1, 1], headRange: [1, 1] },
      };
    default: {
      const lines = [`  if (ctx.${stage}.shortCircuit) {`, `    return { status: "SKIPPED", stage: "${stage}", transferId: transfer.id };`, "  }"];
      return stageIndex % 2 === 0
        ? { base: lines, head: [], change: { category: "RETURN_STATEMENT", changeType: "REMOVED", ruleId: "RULE_RETURN_REMOVED", summary: `Early return removed from the ${stage} stage`, baseRange: [1, 1], headRange: null } }
        : { base: [], head: lines, change: { category: "RETURN_STATEMENT", changeType: "ADDED", ruleId: "RULE_RETURN_ADDED", summary: `Early return added to the ${stage} stage`, baseRange: null, headRange: [1, 1] } };
    }
  }
}

function fillerFor(stage: string, step: number): string[] {
  const lines = [
    `  const ${stage}Step${step} = await ctx.${stage}.prepare(transfer, { attempt: ${step}, traceId: ctx.trace.id });`,
    `  metrics.increment("settlement.${stage}.step", { step: ${step}, region: transfer.region });`,
    `  ledgerDraft.annotate("${stage}", ${stage}Step${step}.reference);`,
    `  ctx.logger.debug({ stage: "${stage}", step: ${step}, transferId: transfer.id }, "settlement step prepared");`,
    `  ctx.deadline.assertRemaining(${250 + step * 5});`,
  ];
  return lines.slice(0, 2 + (step % 4));
}

/** A long run of unchanged code at each stage boundary, so compression is exercised. */
function stageHeader(stage: string): string[] {
  const rows = Array.from({ length: 14 }, (_, i) => `  await ctx.${stage}.warmup("segment-${i}", { transferId: transfer.id, region: transfer.region });`);
  return [`  // ---- ${stage} stage ----`, ...rows];
}

const fnv = (text: string): string => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
};

const pad = (n: number) => String(n).padStart(3, "0");

function spanFor(lines: readonly string[], firstLine: number, from: number, to: number): SourceSpan {
  const start = lines[from];
  const end = lines[to];
  return {
    startLine: firstLine + from,
    startColumn: start.length - start.trimStart().length + 1,
    endLine: firstLine + to,
    endColumn: end.length + 1,
  };
}

/** Fills the snapshot's structural descriptors from the generated source. */
function describeBody(body: readonly string[], firstLine: number): Pick<FunctionSnapshot, "guards" | "conditionals" | "throws" | "returns"> {
  const guards: FunctionSnapshot["guards"][number][] = [];
  const conditionals: FunctionSnapshot["conditionals"][number][] = [];
  const throws: FunctionSnapshot["throws"][number][] = [];
  const returns: FunctionSnapshot["returns"][number][] = [];

  body.forEach((line, index) => {
    const text = line.trim();
    const span = spanFor(body, firstLine, index, index);
    const condition = /^if \((.*)\) \{$/.exec(text)?.[1];
    if (condition) {
      const exit = (body[index + 1] ?? "").trim();
      conditionals.push({ fingerprint: fnv(text), constructKind: "IF_STATEMENT", conditionText: condition, normalizedCondition: condition, operatorTokens: ["&&", "||", ">=", ">"].filter((op) => condition.includes(op)), nestingDepth: 1, span, rawText: text });
      if (exit.startsWith("throw ") || exit.startsWith("return ")) {
        guards.push({ fingerprint: fnv(text + exit), conditionText: condition, normalizedCondition: condition, exitKind: exit.startsWith("throw ") ? "THROW" : "RETURN", exitText: exit, normalizedExit: exit, isLeadingGuard: index < 20, nestingDepth: 1, span: spanFor(body, firstLine, index, index + 2), rawText: `${text} ${exit} }` });
      }
    } else if (text.startsWith("throw ")) {
      throws.push({ fingerprint: fnv(text), thrownExpressionText: text.slice(6, -1), normalizedExpression: text.slice(6, -1), enclosingGuardCondition: /^if \((.*)\) \{$/.exec((body[index - 1] ?? "").trim())?.[1] ?? null, nestingDepth: 2, span, rawText: text });
    } else if (text.startsWith("return ")) {
      returns.push({ fingerprint: fnv(text), returnCategory: "EXPRESSION", expressionText: text.slice(7, -1), normalizedExpression: text.slice(7, -1), isEarlyReturn: index < body.length - 1, nestingDepth: line.startsWith("    ") ? 2 : 1, span, rawText: text });
    }
  });

  return { guards, conditionals, throws, returns };
}

interface PlacedChange {
  readonly change: StructuralChange;
  readonly stage: string;
  readonly index: number;
}

export function buildDigStressReport(): AnalysisReport {
  const baseBody: string[] = [];
  const headBody: string[] = [];
  const placed: PlacedChange[] = [];
  const evidence: EvidenceItem[] = [];
  const evidenceFor = new Map<string, string[]>();
  let evidenceCounter = 0;

  const addEvidence = (item: Omit<EvidenceItem, "id">): string => {
    const id = `EV-${pad(++evidenceCounter)}`;
    evidence.push({ id, ...item });
    return id;
  };

  // Body lines start one line after the signature.
  const baseFirstBodyLine = FUNCTION_START_LINE + 1;
  const headFirstBodyLine = FUNCTION_START_LINE + 1;

  STAGES.forEach((stage, stageIndex) => {
    baseBody.push(...stageHeader(stage));
    headBody.push(...stageHeader(stage));

    for (let variant = 0; variant < 8; variant++) {
      const index = placed.length;
      const filler = fillerFor(stage, index);
      baseBody.push(...filler);
      headBody.push(...filler);

      const block = blockFor(stage, variant, stageIndex);
      const baseOffset = baseBody.length;
      const headOffset = headBody.length;
      baseBody.push(...block.base);
      headBody.push(...block.head);

      const { baseRange, headRange } = block.change;
      const beforeSpan = baseRange ? spanFor(baseBody, baseFirstBodyLine, baseOffset + baseRange[0], baseOffset + baseRange[1]) : null;
      const afterSpan = headRange ? spanFor(headBody, headFirstBodyLine, headOffset + headRange[0], headOffset + headRange[1]) : null;
      const beforeSnippet = baseRange ? block.base.slice(baseRange[0], baseRange[1] + 1).map((l) => l.trim()).join("\n") : null;
      const afterSnippet = headRange ? block.head.slice(headRange[0], headRange[1] + 1).map((l) => l.trim()).join("\n") : null;
      const id = `SC-${pad(index + 1)}`;

      const ids: string[] = [];
      if (beforeSpan) {
        ids.push(addEvidence({ kind: "SOURCE_BEFORE", commitRole: "BASE", commitSha: BASE_SHA, posixFilePath: TARGET_FILE, span: beforeSpan, codeSnippet: beforeSnippet, description: `${block.change.category} at BASE lines ${beforeSpan.startLine}-${beforeSpan.endLine}` }));
      }
      if (afterSpan) {
        ids.push(addEvidence({ kind: "SOURCE_AFTER", commitRole: "HEAD", commitSha: HEAD_SHA, posixFilePath: TARGET_FILE, span: afterSpan, codeSnippet: afterSnippet, description: `${block.change.category} at HEAD lines ${afterSpan.startLine}-${afterSpan.endLine}` }));
      }
      evidenceFor.set(id, ids);

      placed.push({
        stage,
        index,
        change: {
          id,
          ruleId: block.change.ruleId,
          category: block.change.category,
          changeType: block.change.changeType,
          summary: block.change.summary,
          beforeSpan,
          afterSpan,
          beforeSnippet,
          afterSnippet,
          details: { stage, variant },
        },
      });
    }
  });

  const closing = ["  ledgerDraft.seal(transfer.id);", '  return { status: "SETTLED", transferId: transfer.id, reference: ledgerDraft.reference };'];
  baseBody.push(...closing);
  headBody.push(...closing);

  // ---- Test changes ----
  const testEvidence = new Map<string, string[]>();
  const testChanges: TestChange[] = [];

  for (let i = 0; i < 32; i++) {
    const id = `TC-${pad(i + 1)}`;
    const posixTestFilePath = TEST_FILES[i % TEST_FILES.length];
    const stage = STAGES[i % STAGES.length];
    const fileChangeStatus: TestChange["fileChangeStatus"] = i === 13 ? "ADDED" : i === 22 ? "DELETED" : i === 29 ? "UNMODIFIED_COMPANION" : "MODIFIED";
    const assertionTotal = fileChangeStatus === "UNMODIFIED_COMPANION" ? 0 : 1 + (i % 3);
    const assertionChanges: AssertionChangeRecord[] = [];
    const ids: string[] = [];

    for (let a = 0; a < assertionTotal; a++) {
      const line = 20 + i * 11 + a * 4;
      const span: SourceSpan = { startLine: line, startColumn: 5, endLine: line, endColumn: 72 };
      const kind = fileChangeStatus === "ADDED" ? 0 : fileChangeStatus === "DELETED" ? 1 : (i + a) % 3;
      const changeType = (["ASSERTION_ADDED", "ASSERTION_REMOVED", "ASSERTION_MODIFIED_OR_REWRITTEN"] as const)[kind];
      const before = kind === 0 ? null : `expect(await ${FUNCTION_NAME}(fixtures.${stage}Case${a}, ctx)).toMatchObject({ status: "SETTLED" })`;
      const after = kind === 1 ? null : `expect(await ${FUNCTION_NAME}(fixtures.${stage}Case${a}, ctx)).toMatchObject({ status: "PENDING_REVIEW", reason: "${stage.toUpperCase()}_TOKEN_MISSING" })`;

      assertionChanges.push({
        changeType,
        enclosingTestBlock: `settlement > ${stage} > handles case ${a + 1} for scenario ${i + 1}`,
        callsTargetFunctionInBlock: (i + a) % 4 !== 3,
        beforeAssertionText: before,
        afterAssertionText: after,
        beforeSpan: before ? span : null,
        afterSpan: after ? span : null,
      });

      if (before) ids.push(addEvidence({ kind: "TEST_BEFORE", commitRole: "BASE", commitSha: BASE_SHA, posixFilePath: posixTestFilePath, span, codeSnippet: before, description: `Assertion at BASE line ${line}` }));
      if (after) ids.push(addEvidence({ kind: "TEST_AFTER", commitRole: "HEAD", commitSha: HEAD_SHA, posixFilePath: posixTestFilePath, span, codeSnippet: after, description: `Assertion at HEAD line ${line}` }));
    }

    testEvidence.set(id, ids);
    testChanges.push({ id, posixTestFilePath, fileChangeStatus, importsTargetFile: i % 5 !== 4, mentionsTargetFunction: i % 7 !== 6, assertionChanges });
  }

  const declarationChanges: TestDeclarationChange[] = Array.from({ length: 12 }, (_, i) => {
    const changeType = (["ADDED", "REMOVED", "MODIFIED"] as const)[i % 3];
    const stage = STAGES[i];
    const beforeDescription = changeType === "ADDED" ? null : `rejects ${stage} failures`;
    const afterDescription = changeType === "REMOVED" ? null : `routes ${stage} failures to manual review`;
    const span: SourceSpan = { startLine: 12 + i * 30, startColumn: 3, endLine: 26 + i * 30, endColumn: 5 };
    return {
      id: `TDC-${pad(i + 1)}`,
      posixTestFilePath: TEST_FILES[i % TEST_FILES.length],
      changeType,
      fullTitle: `settlement > ${stage} > ${afterDescription ?? beforeDescription}`,
      beforeDescription,
      afterDescription,
      beforeSpan: beforeDescription ? span : null,
      afterSpan: afterDescription ? span : null,
    };
  });

  // ---- Correlations: one repeating pattern covering every shape The Dig can draw ----
  const correlations: CorrelationResult[] = [];
  const correlationItems: CorrelationItem[] = [];
  let itemCounter = 0;

  interface LinkSpec {
    readonly status: CorrelationStatus;
    readonly classification: CorrelationClassification;
    readonly testIndex: number | null;
    readonly filePath: string | null;
  }

  const linksFor = (index: number): LinkSpec[] => {
    const test = index % testChanges.length;
    const other = (index + 11) % testChanges.length;
    const file = TEST_FILES[index % TEST_FILES.length];
    switch (index % 8) {
      case 0: return [{ status: "STRONG", classification: "POTENTIALLY_RELATED_ASSERTION_MODIFIED", testIndex: test, filePath: null }];
      case 1: return [{ status: "WEAK", classification: "TEMPORAL_CO_OCCURRENCE_ONLY", testIndex: test, filePath: null }];
      case 2: return [{ status: "WEAK", classification: "POTENTIALLY_RELATED_TEST_DECLARATION_CHANGED", testIndex: null, filePath: file }];
      case 3: return [{ status: "UNCERTAIN", classification: "AMBIGUOUS_OR_UNRESOLVED", testIndex: test, filePath: null }];
      case 4: return [
        { status: "STRONG", classification: "POTENTIALLY_RELATED_ASSERTION_ADDED", testIndex: test, filePath: null },
        { status: "WEAK", classification: "TEMPORAL_CO_OCCURRENCE_ONLY", testIndex: other, filePath: null },
      ];
      case 5: return [{ status: "NONE", classification: "UNMODIFIED_COMPANION_TEST", testIndex: null, filePath: file }];
      case 6: return [];
      default: return [
        { status: "STRONG", classification: "POTENTIALLY_RELATED_ASSERTION_REMOVED", testIndex: test, filePath: null },
        { status: "UNCERTAIN", classification: "AMBIGUOUS_OR_UNRESOLVED", testIndex: other, filePath: null },
        { status: "WEAK", classification: "POTENTIALLY_RELATED_TEST_DECLARATION_CHANGED", testIndex: null, filePath: TEST_FILES[(index + 3) % TEST_FILES.length] },
      ];
    }
  };

  const correlationIdFor = new Map<string, string>();

  for (const { change, index } of placed) {
    const links = linksFor(index);
    if (links.length === 0) continue;

    const correlationId = `CORR-${pad(index + 1)}`;
    correlationIdFor.set(change.id, correlationId);
    const related: string[] = [];

    for (const link of links) {
      const test = link.testIndex === null ? null : testChanges[link.testIndex];
      if (test) related.push(test.id);
      const filePath = test?.posixTestFilePath ?? link.filePath;
      correlationItems.push({
        id: `CORR-ITEM-${pad(++itemCounter)}`,
        correlationId,
        structuralChangeId: change.id,
        testChangeId: test?.id ?? null,
        posixTestFilePath: filePath,
        classification: link.classification,
        status: link.status,
        rationale: `${change.summary}. Compared with ${filePath ?? "the analyzed test files"} in the same revision range.`,
        observedFact: `${test ? `Test change ${test.id}` : "A companion test file"} was observed alongside production change ${change.id}.`,
        inferredRelationship: "The two changes may be related. The relationship remains unverified.",
        unknowns: [
          "Static analysis cannot prove that this test exercises the changed branch.",
          "Static analysis cannot determine whether the test passes at runtime.",
        ],
        evidenceIds: [...(evidenceFor.get(change.id) ?? []), ...(test ? (testEvidence.get(test.id) ?? []).slice(0, 2) : [])],
      });
    }

    // Report-level verdicts stay conservative, so some deliberately differ from their strongest item.
    const hasDirect = links.some((l) => l.status === "STRONG");
    const status: CorrelationStatus = hasDirect ? (links.length > 1 ? "WEAK" : "STRONG") : links[0].status;
    correlations.push({
      id: correlationId,
      structuralChangeId: change.id,
      status,
      relatedTestChangeIds: related,
      untouchedCompanionTestFiles: links.filter((l) => l.status === "NONE" && l.filePath).map((l) => l.filePath as string),
      rationale: `Production change ${change.id} compared with ${links.length} candidate test ${links.length === 1 ? "link" : "links"}.`,
    });
  }

  // Links with no specific code change, which the viewer must keep and report.
  for (const test of testChanges.slice(0, 3)) {
    correlationItems.push({
      id: `CORR-ITEM-${pad(++itemCounter)}`,
      correlationId: "CORR-UNANCHORED",
      structuralChangeId: null,
      testChangeId: test.id,
      posixTestFilePath: test.posixTestFilePath,
      classification: "NO_PRODUCTION_CHANGES_OBSERVED",
      status: "NONE",
      rationale: `Test changes in '${test.posixTestFilePath}' are not tied to a specific production change.`,
      observedFact: `Test change ${test.id} has no matching structural change.`,
      inferredRelationship: "No relationship was established.",
      unknowns: ["Static analysis cannot determine what other production code this test exercises."],
      evidenceIds: (testEvidence.get(test.id) ?? []).slice(0, 1),
    });
  }

  // ---- Findings ----
  const reasons: readonly UnknownReasonCategory[] = [
    "EXTERNAL_CALLER_BEHAVIOR",
    "RUNTIME_TEST_EXECUTION_UNVERIFIED",
    "HELPER_DELEGATION_POSSIBLE",
    "TEST_CORRELATION_AMBIGUOUS",
  ];

  const findings: Finding[] = placed.map(({ change, index, stage }) => {
    const number = pad(index + 1);
    const attentionLevel: ReviewAttentionLevel =
      change.changeType === "REMOVED" ? "HIGH_ATTENTION" : change.changeType === "ADDED" ? "INFORMATIONAL" : "MODERATE_ATTENTION";
    const ids = evidenceFor.get(change.id) as [string, ...string[]];
    return {
      id: `FND-${number}`,
      title: change.summary,
      category: change.category,
      attentionLevel,
      structuralChangeIds: [change.id],
      correlationId: correlationIdFor.get(change.id) ?? null,
      observed: [{ id: `OBS-${number}`, category: "OBSERVED", statement: `${change.summary}, in the ${stage} stage of ${FUNCTION_NAME}.`, evidenceIds: ids }],
      inferred: [{ id: `INF-${number}`, category: "INFERRED", statement: `Behaviour of the ${stage} stage may differ for callers that reach this path.`, ruleId: change.ruleId, supportingObservationIds: [`OBS-${number}`] }],
      unknown: [{ id: `UNK-${number}`, category: "UNKNOWN", statement: `Static analysis cannot determine how often production traffic reaches the ${stage} path.`, reasonCategory: reasons[index % reasons.length] }],
    };
  });

  const snapshot = (role: "BASE" | "HEAD", body: readonly string[], sha: string): FunctionSnapshot => {
    const rawBodyText = `{\n${body.join("\n")}\n}`;
    return {
      role,
      commitSha: sha,
      posixFilePath: TARGET_FILE,
      qualifiedName: FUNCTION_NAME,
      functionName: FUNCTION_NAME,
      kind: "FUNCTION_DECLARATION",
      span: { startLine: FUNCTION_START_LINE, startColumn: 1, endLine: FUNCTION_START_LINE + body.length + 1, endColumn: 2 },
      signatureText: SIGNATURE,
      rawBodyText,
      normalizedBodyHash: fnv(rawBodyText),
      ...describeBody(body, FUNCTION_START_LINE + 1),
    };
  };

  return {
    schemaVersion: "1.0.0",
    generatedAtIso: "2026-11-09T12:00:00.000Z",
    status: "COMPLETED_WITH_FINDINGS",
    request: {
      repoPath: "/fixtures/settlement-engine",
      targetFilePath: TARGET_FILE,
      targetFunctionName: FUNCTION_NAME,
      baseRevisionInput: BASE_SHA,
      headRevisionInput: HEAD_SHA,
    },
    repository: { rootPath: "/fixtures/settlement-engine", gitVersion: "git version 2.53.0" },
    baseCommit: { role: "BASE", sha: BASE_SHA, shortSha: BASE_SHA.slice(0, 7), authorName: "Stress Fixture", committedAtIso: "2026-10-01T09:00:00.000Z", subject: "Release 4.8: settlement engine" },
    headCommit: { role: "HEAD", sha: HEAD_SHA, shortSha: HEAD_SHA.slice(0, 7), authorName: "Stress Fixture", committedAtIso: "2026-11-01T09:00:00.000Z", subject: "Release 5.0: review routing and retries" },
    baseFunction: snapshot("BASE", baseBody, BASE_SHA),
    headFunction: snapshot("HEAD", headBody, HEAD_SHA),
    evidence,
    structuralChanges: placed.map((p) => p.change),
    testChanges,
    declarationChanges,
    correlations,
    correlationItems,
    testAnalysisStatus: "COMPLETED_WITH_CHANGES",
    correlationAnalysisStatus: "COMPLETE_CORRELATED",
    findings,
    limitations: [
      "Synthetic stress fixture: the code, commits and tests in this report are invented for exercising the viewer.",
      "Test files were compared at the assertion level only.",
    ],
    errors: [],
  };
}

const isDirectRun = process.argv[1] && path.basename(process.argv[1]).startsWith("generate-dig-stress-report");
if (isDirectRun) {
  const output = path.resolve(process.argv[2] ?? "examples/stress/settlement-engine-stress-report.json");
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(buildDigStressReport(), null, 2)}\n`);
  console.log(`Wrote ${path.relative(process.cwd(), output)}`);
}
