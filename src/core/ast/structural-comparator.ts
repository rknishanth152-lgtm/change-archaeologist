/**
 * Change Archaeologist - AST Structural Comparator
 *
 * Compares two snapshots of a function (base vs. head) and produces:
 * - StructuralChange[] (AST diff records)
 * - EvidenceItem[] (Traceable code proof anchors)
 * - Finding[] (Epistemic findings separating OBSERVED, INFERRED, and UNKNOWN)
 *
 * Implements deterministic deduplication:
 * - Guard clause removals subsume enclosed exit returns/throws.
 * - Throw-to-return conversions produce a single consolidated finding.
 * - Condition mutations on guards are reported as conditional changes,
 *   suppressing duplicate guard remove/add findings.
 */

import type {
  EvidenceItem,
  Finding,
  FunctionSnapshot,
  InferenceStatement,
  Observation,
  ReviewAttentionLevel,
  SourceSpan,
  StructuralChange,
  UnknownStatement,
} from "../domain/types.js";

export interface ComparisonResult {
  readonly structuralChanges: readonly StructuralChange[];
  readonly evidence: readonly EvidenceItem[];
  readonly findings: readonly Finding[];
}

export class StructuralComparator {
  private static isSpanEnclosed(inner: SourceSpan, outer: SourceSpan): boolean {
    if (inner.startLine < outer.startLine || inner.endLine > outer.endLine) return false;
    if (inner.startLine === outer.startLine && inner.startColumn < outer.startColumn) return false;
    if (inner.endLine === outer.endLine && inner.endColumn > outer.endColumn) return false;
    return true;
  }

  /**
   * Compares base and head FunctionSnapshots and returns structured changes,
   * traceable evidence, and verified findings.
   */
  static compare(
    baseFn: FunctionSnapshot,
    headFn: FunctionSnapshot
  ): ComparisonResult {
    const structuralChanges: StructuralChange[] = [];
    const evidence: EvidenceItem[] = [];
    const findings: Finding[] = [];

    let changeSeq = 1;
    let evSeq = 1;
    let obsSeq = 1;
    let infSeq = 1;
    let unkSeq = 1;
    let fndSeq = 1;

    const nextChangeId = () => `SC-${String(changeSeq++).padStart(3, "0")}`;
    const nextEvId = () => `EV-${String(evSeq++).padStart(3, "0")}`;
    const nextObsId = () => `OBS-${String(obsSeq++).padStart(3, "0")}`;
    const nextInfId = () => `INF-${String(infSeq++).padStart(3, "0")}`;
    const nextUnkId = () => `UNK-${String(unkSeq++).padStart(3, "0")}`;
    const nextFndId = () => `FND-${String(fndSeq++).padStart(3, "0")}`;

    const baseSha = baseFn.commitSha ?? "base";
    const headSha = headFn.commitSha ?? "head";
    const baseFilePath = baseFn.posixFilePath ?? "file.ts";
    const headFilePath = headFn.posixFilePath ?? "file.ts";

    const removedGuardSpans: SourceSpan[] = [];
    const convertedGuardBaseSpans: SourceSpan[] = [];

    // ------------------------------------------------------------------------
    // Rule 1: Guard Clauses and Throw-to-Return Conversions
    // ------------------------------------------------------------------------
    const unmatchedBaseGuards = [...baseFn.guards];
    const unmatchedHeadGuards = [...headFn.guards];

    // Pass 1: Exact matches (fingerprint matches)
    for (let i = unmatchedBaseGuards.length - 1; i >= 0; i--) {
      const bGuard = unmatchedBaseGuards[i];
      const matchIdx = unmatchedHeadGuards.findIndex((h) => h.fingerprint === bGuard.fingerprint);
      if (matchIdx !== -1) {
        unmatchedBaseGuards.splice(i, 1);
        unmatchedHeadGuards.splice(matchIdx, 1);
      }
    }

    // Pass 2: Conversions under same condition or condition mutations on same exit
    const stillUnmatchedBaseGuards = [...unmatchedBaseGuards];

    for (const bGuard of unmatchedBaseGuards) {
      // Check 1: Same condition, exit converted (e.g. Throw to Return)
      const convIdx = unmatchedHeadGuards.findIndex(
        (h) => h.normalizedCondition === bGuard.normalizedCondition
      );

      if (convIdx !== -1) {
        const hGuard = unmatchedHeadGuards[convIdx];
        unmatchedHeadGuards.splice(convIdx, 1);
        const bIdx = stillUnmatchedBaseGuards.indexOf(bGuard);
        if (bIdx !== -1) stillUnmatchedBaseGuards.splice(bIdx, 1);
        convertedGuardBaseSpans.push(bGuard.span);

        if (bGuard.exitKind === "THROW" && hGuard.exitKind === "RETURN") {
          // Detected Throw-to-Return conversion!
          const changeId = nextChangeId();
          structuralChanges.push({
            id: changeId,
            ruleId: "RULE_THROW_TO_RETURN_CONVERSION",
            category: "GUARD_CLAUSE",
            changeType: "MODIFIED",
            summary: `Throw-to-return conversion under condition "${bGuard.normalizedCondition}": ${bGuard.exitText} replaced by ${hGuard.exitText}`,
            beforeSpan: bGuard.span,
            afterSpan: hGuard.span,
            beforeSnippet: bGuard.rawText,
            afterSnippet: hGuard.rawText,
          });

          const evBaseId = nextEvId();
          evidence.push({
            id: evBaseId,
            kind: "SOURCE_BEFORE",
            commitRole: "BASE",
            commitSha: baseSha,
            posixFilePath: baseFilePath,
            span: bGuard.span,
            codeSnippet: bGuard.rawText,
            description: `Throw guard at BASE lines ${bGuard.span.startLine}-${bGuard.span.endLine}`,
          });

          const evHeadId = nextEvId();
          evidence.push({
            id: evHeadId,
            kind: "SOURCE_AFTER",
            commitRole: "HEAD",
            commitSha: headSha,
            posixFilePath: headFilePath,
            span: hGuard.span,
            codeSnippet: hGuard.rawText,
            description: `Return guard at HEAD lines ${hGuard.span.startLine}-${hGuard.span.endLine}`,
          });

          const obsId = nextObsId();
          const obs: Observation = {
            id: obsId,
            category: "OBSERVED",
            statement: `Under condition "${bGuard.normalizedCondition}", throw statement "${bGuard.exitText}" at BASE lines ${bGuard.span.startLine}-${bGuard.span.endLine} was replaced with return statement "${hGuard.exitText}" at HEAD lines ${hGuard.span.startLine}-${hGuard.span.endLine}.`,
            evidenceIds: [evBaseId, evHeadId],
            span: bGuard.span,
            snippet: bGuard.rawText,
          };

          const infId = nextInfId();
          const inf: InferenceStatement = {
            id: infId,
            category: "INFERRED",
            statement: `Control flow changed from raising an exception to returning a value when condition "${bGuard.normalizedCondition}" is satisfied.`,
            ruleId: "RULE_THROW_TO_RETURN_CONVERSION",
            supportingObservationIds: [obsId],
          };

          const unkId = nextUnkId();
          const unk: UnknownStatement = {
            id: unkId,
            category: "UNKNOWN",
            statement: `Static analysis cannot determine whether external callers handle the return value or still expect an exception.`,
            reasonCategory: "EXTERNAL_CALLER_BEHAVIOR",
          };

          findings.push({
            id: nextFndId(),
            title: `Throw-to-return conversion under condition (${bGuard.normalizedCondition})`,
            category: "GUARD_CLAUSE",
            attentionLevel: "MODERATE_ATTENTION",
            structuralChangeIds: [changeId],
            correlationId: null,
            observed: [obs],
            inferred: [inf],
            unknown: [unk],
          });
        } else {
          // Guard exit modified
          const changeId = nextChangeId();
          structuralChanges.push({
            id: changeId,
            ruleId: "RULE_GUARD_MODIFIED",
            category: "GUARD_CLAUSE",
            changeType: "MODIFIED",
            summary: `Guard exit modified under condition "${bGuard.normalizedCondition}": ${bGuard.exitText} -> ${hGuard.exitText}`,
            beforeSpan: bGuard.span,
            afterSpan: hGuard.span,
            beforeSnippet: bGuard.rawText,
            afterSnippet: hGuard.rawText,
          });
        }
        continue;
      }

      // Check 2: Same exit statement and depth, but condition mutated
      // Handled by RULE_CONDITIONAL_MODIFIED; pair them here to prevent false duplicate guard remove/add findings
      const sameExitIdx = unmatchedHeadGuards.findIndex(
        (h) =>
          h.exitKind === bGuard.exitKind &&
          h.normalizedExit === bGuard.normalizedExit &&
          h.nestingDepth === bGuard.nestingDepth
      );

      if (sameExitIdx !== -1) {
        unmatchedHeadGuards.splice(sameExitIdx, 1);
        const bIdx = stillUnmatchedBaseGuards.indexOf(bGuard);
        if (bIdx !== -1) stillUnmatchedBaseGuards.splice(bIdx, 1);
        continue;
      }
    }

    // Remaining unmatched base guards are REMOVALS
    for (const bGuard of stillUnmatchedBaseGuards) {
      removedGuardSpans.push(bGuard.span);
      const changeId = nextChangeId();
      structuralChanges.push({
        id: changeId,
        ruleId: "RULE_GUARD_REMOVED",
        category: "GUARD_CLAUSE",
        changeType: "REMOVED",
        summary: `Guard clause removed: if (${bGuard.normalizedCondition}) with ${bGuard.exitKind} exit (${bGuard.exitText})`,
        beforeSpan: bGuard.span,
        afterSpan: null,
        beforeSnippet: bGuard.rawText,
        afterSnippet: null,
      });

      const evId = nextEvId();
      evidence.push({
        id: evId,
        kind: "SOURCE_BEFORE",
        commitRole: "BASE",
        commitSha: baseSha,
        posixFilePath: baseFilePath,
        span: bGuard.span,
        codeSnippet: bGuard.rawText,
        description: `Guard clause at BASE lines ${bGuard.span.startLine}-${bGuard.span.endLine}`,
      });

      const obsId = nextObsId();
      const obs: Observation = {
        id: obsId,
        category: "OBSERVED",
        statement: `Guard clause "if (${bGuard.conditionText})" with exit "${bGuard.exitText}" at BASE lines ${bGuard.span.startLine}-${bGuard.span.endLine} is absent in HEAD.`,
        evidenceIds: [evId],
        span: bGuard.span,
        snippet: bGuard.rawText,
      };

      const infId = nextInfId();
      const inf: InferenceStatement = {
        id: infId,
        category: "INFERRED",
        statement: `Early-exit validation guard for "${bGuard.normalizedCondition}" was removed from "${baseFn.qualifiedName}".`,
        ruleId: "RULE_GUARD_REMOVED",
        supportingObservationIds: [obsId],
      };

      const unkId = nextUnkId();
      const unk: UnknownStatement = {
        id: unkId,
        category: "UNKNOWN",
        statement: `Static analysis cannot determine whether upstream callers now validate "${bGuard.normalizedCondition}" or if this removal allows invalid arguments to reach subsequent logic.`,
        reasonCategory: "EXTERNAL_CALLER_BEHAVIOR",
      };

      findings.push({
        id: nextFndId(),
        title: `Guard clause removed: if (${bGuard.normalizedCondition})`,
        category: "GUARD_CLAUSE",
        attentionLevel: "MODERATE_ATTENTION",
        structuralChangeIds: [changeId],
        correlationId: null,
        observed: [obs],
        inferred: [inf],
        unknown: [unk],
      });
    }

    // Remaining unmatched head guards are ADDITIONS
    for (const hGuard of unmatchedHeadGuards) {
      const changeId = nextChangeId();
      structuralChanges.push({
        id: changeId,
        ruleId: "RULE_GUARD_ADDED",
        category: "GUARD_CLAUSE",
        changeType: "ADDED",
        summary: `Guard clause added: if (${hGuard.normalizedCondition}) with ${hGuard.exitKind} exit (${hGuard.exitText})`,
        beforeSpan: null,
        afterSpan: hGuard.span,
        beforeSnippet: null,
        afterSnippet: hGuard.rawText,
      });

      const evId = nextEvId();
      evidence.push({
        id: evId,
        kind: "SOURCE_AFTER",
        commitRole: "HEAD",
        commitSha: headSha,
        posixFilePath: headFilePath,
        span: hGuard.span,
        codeSnippet: hGuard.rawText,
        description: `Guard clause at HEAD lines ${hGuard.span.startLine}-${hGuard.span.endLine}`,
      });

      const obsId = nextObsId();
      const obs: Observation = {
        id: obsId,
        category: "OBSERVED",
        statement: `Guard clause "if (${hGuard.conditionText})" with exit "${hGuard.exitText}" was introduced at HEAD lines ${hGuard.span.startLine}-${hGuard.span.endLine}.`,
        evidenceIds: [evId],
        span: hGuard.span,
        snippet: hGuard.rawText,
      };

      const infId = nextInfId();
      const inf: InferenceStatement = {
        id: infId,
        category: "INFERRED",
        statement: `New early-exit guard was introduced for "${hGuard.normalizedCondition}".`,
        ruleId: "RULE_GUARD_ADDED",
        supportingObservationIds: [obsId],
      };

      const unkId = nextUnkId();
      const unk: UnknownStatement = {
        id: unkId,
        category: "UNKNOWN",
        statement: `Static analysis cannot confirm whether existing callers were updated for this new guard.`,
        reasonCategory: "EXTERNAL_CALLER_BEHAVIOR",
      };

      findings.push({
        id: nextFndId(),
        title: `Guard clause added: if (${hGuard.normalizedCondition})`,
        category: "GUARD_CLAUSE",
        attentionLevel: "INFORMATIONAL",
        structuralChangeIds: [changeId],
        correlationId: null,
        observed: [obs],
        inferred: [inf],
        unknown: [unk],
      });
    }

    // ------------------------------------------------------------------------
    // Rule 2: Conditional Expressions (e.g. && to ||)
    // ------------------------------------------------------------------------
    const minCondLen = Math.min(baseFn.conditionals.length, headFn.conditionals.length);
    for (let i = 0; i < minCondLen; i++) {
      const bCond = baseFn.conditionals[i];
      const hCond = headFn.conditionals[i];

      if (
        bCond.constructKind === hCond.constructKind &&
        bCond.normalizedCondition !== hCond.normalizedCondition
      ) {
        const bOps = bCond.operatorTokens.join(" ");
        const hOps = hCond.operatorTokens.join(" ");
        const opNote = bOps !== hOps ? ` (operator changed from "${bOps}" to "${hOps}")` : "";

        const changeId = nextChangeId();
        structuralChanges.push({
          id: changeId,
          ruleId: "RULE_CONDITIONAL_MODIFIED",
          category: "CONDITIONAL_EXPRESSION",
          changeType: "MODIFIED",
          summary: `Condition changed from "${bCond.conditionText}" to "${hCond.conditionText}"${opNote}`,
          beforeSpan: bCond.span,
          afterSpan: hCond.span,
          beforeSnippet: bCond.rawText,
          afterSnippet: hCond.rawText,
        });

        const evBaseId = nextEvId();
        evidence.push({
          id: evBaseId,
          kind: "SOURCE_BEFORE",
          commitRole: "BASE",
          commitSha: baseSha,
          posixFilePath: baseFilePath,
          span: bCond.span,
          codeSnippet: bCond.rawText,
          description: `Condition at BASE lines ${bCond.span.startLine}-${bCond.span.endLine}`,
        });

        const evHeadId = nextEvId();
        evidence.push({
          id: evHeadId,
          kind: "SOURCE_AFTER",
          commitRole: "HEAD",
          commitSha: headSha,
          posixFilePath: headFilePath,
          span: hCond.span,
          codeSnippet: hCond.rawText,
          description: `Condition at HEAD lines ${hCond.span.startLine}-${hCond.span.endLine}`,
        });

        const obsId = nextObsId();
        const obs: Observation = {
          id: obsId,
          category: "OBSERVED",
          statement: `Condition expression at BASE lines ${bCond.span.startLine}-${bCond.span.endLine} (${bCond.conditionText}) was replaced with (${hCond.conditionText}) at HEAD lines ${hCond.span.startLine}-${hCond.span.endLine}${opNote}.`,
          evidenceIds: [evBaseId, evHeadId],
          span: bCond.span,
          snippet: bCond.rawText,
        };

        const infId = nextInfId();
        const inf: InferenceStatement = {
          id: infId,
          category: "INFERRED",
          statement: `Conditional branching logic altered; evaluation rule changed between base and head.`,
          ruleId: "RULE_CONDITIONAL_MODIFIED",
          supportingObservationIds: [obsId],
        };

        const unkId = nextUnkId();
        const unk: UnknownStatement = {
          id: unkId,
          category: "UNKNOWN",
          statement: `Static analysis does not prove whether operands are constrained elsewhere or whether the new branch condition is reachable.`,
          reasonCategory: "EXTERNAL_CALLER_BEHAVIOR",
        };

        findings.push({
          id: nextFndId(),
          title: `Conditional expression modified: ${bCond.conditionText} -> ${hCond.conditionText}`,
          category: "CONDITIONAL_EXPRESSION",
          attentionLevel: "MODERATE_ATTENTION",
          structuralChangeIds: [changeId],
          correlationId: null,
          observed: [obs],
          inferred: [inf],
          unknown: [unk],
        });
      }
    }

    // ------------------------------------------------------------------------
    // Rule 3: Throw Statements (excluding those already subsumed by guard changes)
    // ------------------------------------------------------------------------
    for (const bThrow of baseFn.throws) {
      const isSubsumedByGuardRemoval = removedGuardSpans.some((gSpan) =>
        StructuralComparator.isSpanEnclosed(bThrow.span, gSpan)
      );
      const isSubsumedByConversion = convertedGuardBaseSpans.some((gSpan) =>
        StructuralComparator.isSpanEnclosed(bThrow.span, gSpan)
      );
      if (isSubsumedByGuardRemoval || isSubsumedByConversion) {
        continue;
      }

      const match = headFn.throws.find((h) => h.fingerprint === bThrow.fingerprint);
      if (!match) {
        const changeId = nextChangeId();
        structuralChanges.push({
          id: changeId,
          ruleId: "RULE_THROW_REMOVED",
          category: "THROW_STATEMENT",
          changeType: "REMOVED",
          summary: `Standalone throw statement removed: ${bThrow.rawText}`,
          beforeSpan: bThrow.span,
          afterSpan: null,
          beforeSnippet: bThrow.rawText,
          afterSnippet: null,
        });

        const evId = nextEvId();
        evidence.push({
          id: evId,
          kind: "SOURCE_BEFORE",
          commitRole: "BASE",
          commitSha: baseSha,
          posixFilePath: baseFilePath,
          span: bThrow.span,
          codeSnippet: bThrow.rawText,
          description: `Throw statement at BASE lines ${bThrow.span.startLine}-${bThrow.span.endLine}`,
        });

        const obsId = nextObsId();
        const obs: Observation = {
          id: obsId,
          category: "OBSERVED",
          statement: `Throw statement "${bThrow.rawText}" at BASE lines ${bThrow.span.startLine}-${bThrow.span.endLine} is absent in HEAD.`,
          evidenceIds: [evId],
          span: bThrow.span,
          snippet: bThrow.rawText,
        };

        const infId = nextInfId();
        const inf: InferenceStatement = {
          id: infId,
          category: "INFERRED",
          statement: `An exception path was eliminated from "${baseFn.qualifiedName}".`,
          ruleId: "RULE_THROW_REMOVED",
          supportingObservationIds: [obsId],
        };

        const unkId = nextUnkId();
        const unk: UnknownStatement = {
          id: unkId,
          category: "UNKNOWN",
          statement: `Callers handling this exception may no longer receive it.`,
          reasonCategory: "EXTERNAL_CALLER_BEHAVIOR",
        };

        findings.push({
          id: nextFndId(),
          title: `Throw statement removed`,
          category: "THROW_STATEMENT",
          attentionLevel: "MODERATE_ATTENTION",
          structuralChangeIds: [changeId],
          correlationId: null,
          observed: [obs],
          inferred: [inf],
          unknown: [unk],
        });
      }
    }

    // ------------------------------------------------------------------------
    // Rule 4: Return Statements (excluding those already subsumed by guard changes)
    // ------------------------------------------------------------------------
    for (const bRet of baseFn.returns) {
      const isSubsumedByGuardRemoval = removedGuardSpans.some((gSpan) =>
        StructuralComparator.isSpanEnclosed(bRet.span, gSpan)
      );
      const isSubsumedByConversion = convertedGuardBaseSpans.some((gSpan) =>
        StructuralComparator.isSpanEnclosed(bRet.span, gSpan)
      );
      if (isSubsumedByGuardRemoval || isSubsumedByConversion) {
        continue;
      }

      const match = headFn.returns.find((h) => h.fingerprint === bRet.fingerprint);
      if (!match) {
        const pairedHeadReturn = headFn.returns.find(
          (h) => h.isEarlyReturn === bRet.isEarlyReturn && h.nestingDepth === bRet.nestingDepth
        );
        if (pairedHeadReturn && pairedHeadReturn.fingerprint !== bRet.fingerprint) {
          const changeId = nextChangeId();
          structuralChanges.push({
            id: changeId,
            ruleId: "RULE_RETURN_MODIFIED",
            category: "RETURN_STATEMENT",
            changeType: "MODIFIED",
            summary: `Return statement modified: from "${bRet.rawText}" to "${pairedHeadReturn.rawText}"`,
            beforeSpan: bRet.span,
            afterSpan: pairedHeadReturn.span,
            beforeSnippet: bRet.rawText,
            afterSnippet: pairedHeadReturn.rawText,
          });

          const evBaseId = nextEvId();
          evidence.push({
            id: evBaseId,
            kind: "SOURCE_BEFORE",
            commitRole: "BASE",
            commitSha: baseSha,
            posixFilePath: baseFilePath,
            span: bRet.span,
            codeSnippet: bRet.rawText,
            description: `Return statement at BASE lines ${bRet.span.startLine}-${bRet.span.endLine}`,
          });

          const evHeadId = nextEvId();
          evidence.push({
            id: evHeadId,
            kind: "SOURCE_AFTER",
            commitRole: "HEAD",
            commitSha: headSha,
            posixFilePath: headFilePath,
            span: pairedHeadReturn.span,
            codeSnippet: pairedHeadReturn.rawText,
            description: `Return statement at HEAD lines ${pairedHeadReturn.span.startLine}-${pairedHeadReturn.span.endLine}`,
          });

          const obsId = nextObsId();
          const obs: Observation = {
            id: obsId,
            category: "OBSERVED",
            statement: `Return statement at BASE lines ${bRet.span.startLine}-${bRet.span.endLine} ("${bRet.rawText}") changed to ("${pairedHeadReturn.rawText}") at HEAD lines ${pairedHeadReturn.span.startLine}-${pairedHeadReturn.span.endLine}.`,
            evidenceIds: [evBaseId, evHeadId],
            span: bRet.span,
            snippet: bRet.rawText,
          };

          const infId = nextInfId();
          const inf: InferenceStatement = {
            id: infId,
            category: "INFERRED",
            statement: `Return value or return category was modified in "${baseFn.qualifiedName}".`,
            ruleId: "RULE_RETURN_MODIFIED",
            supportingObservationIds: [obsId],
          };

          const unkId = nextUnkId();
          const unk: UnknownStatement = {
            id: unkId,
            category: "UNKNOWN",
            statement: `Static analysis cannot determine whether callers expect the previous return value format.`,
            reasonCategory: "EXTERNAL_CALLER_BEHAVIOR",
          };

          findings.push({
            id: nextFndId(),
            title: `Return statement modified`,
            category: "RETURN_STATEMENT",
            attentionLevel: "INFORMATIONAL",
            structuralChangeIds: [changeId],
            correlationId: null,
            observed: [obs],
            inferred: [inf],
            unknown: [unk],
          });
        }
      }
    }

    return { structuralChanges, evidence, findings };
  }
}

