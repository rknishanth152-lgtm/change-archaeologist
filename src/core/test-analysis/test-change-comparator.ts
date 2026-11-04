/**
 * Change Archaeologist - Test Change Comparator
 *
 * Compares extracted test declarations and assertions across base and head revisions.
 * Identifies:
 * - Test files added, deleted, modified, or unchanged
 * - Test declarations added, removed, or modified (description change)
 * - Assertions added, removed, or modified
 *
 * Enforces conservative, deterministic matching without claiming runtime test coverage.
 * Synthesizes OBSERVED, INFERRED, and UNKNOWN epistemic findings with full traceability.
 */

import type {
  AssertionChangeRecord,
  AssertionChangeType,
  EvidenceItem,
  Finding,
  InferenceStatement,
  Observation,
  ReviewAttentionLevel,
  RuleId,
  SourceSpan,
  TestChange,
  TestDeclarationChange,
  UnknownStatement,
} from "../domain/types.js";
import type { TestDeclaration } from "./test-locator.js";
import type { AssertionDescriptor } from "./assertion-extractor.js";

export interface CompareTestFileInput {
  readonly posixTestFilePath: string;
  readonly fileChangeStatus: "MODIFIED" | "ADDED" | "DELETED" | "UNMODIFIED_COMPANION";
  readonly baseDeclarations: readonly TestDeclaration[];
  readonly headDeclarations: readonly TestDeclaration[];
  readonly baseAssertions: readonly AssertionDescriptor[];
  readonly headAssertions: readonly AssertionDescriptor[];
  readonly baseCommitSha: string;
  readonly headCommitSha: string;
  readonly importsTargetFile: boolean;
  readonly mentionsTargetFunction: boolean;
  readonly targetFunctionName?: string;
  readonly idGenerator: {
    nextTcId: () => string;
    nextTdcId: () => string;
    nextEvId: () => string;
    nextObsId: () => string;
    nextInfId: () => string;
    nextUnkId: () => string;
    nextFndId: () => string;
  };
}

export interface FileComparisonResult {
  readonly testChange: TestChange;
  readonly declarationChanges: readonly TestDeclarationChange[];
  readonly evidence: readonly EvidenceItem[];
  readonly findings: readonly Finding[];
  readonly limitations: readonly string[];
}

export class TestChangeComparator {
  /**
   * Compares a single test file across base and head revisions.
   */
  static compareFile(input: CompareTestFileInput): FileComparisonResult {
    const {
      posixTestFilePath,
      fileChangeStatus,
      baseDeclarations,
      headDeclarations,
      baseAssertions,
      headAssertions,
      baseCommitSha,
      headCommitSha,
      importsTargetFile,
      mentionsTargetFunction,
      targetFunctionName,
      idGenerator,
    } = input;

    const declarationChanges: TestDeclarationChange[] = [];
    const assertionChanges: AssertionChangeRecord[] = [];
    const evidence: EvidenceItem[] = [];
    const findings: Finding[] = [];
    const limitations: string[] = [];

    // Helper map to check if a test declaration called target function
    const headBlockCallsTarget = new Map<string, boolean>();
    for (const d of headDeclarations) {
      headBlockCallsTarget.set(d.fullTitle, d.callsTargetFunction);
    }
    const baseBlockCallsTarget = new Map<string, boolean>();
    for (const d of baseDeclarations) {
      baseBlockCallsTarget.set(d.fullTitle, d.callsTargetFunction);
    }

    function checkCallsTarget(enclosingBlock: string | null): boolean {
      if (!enclosingBlock || !targetFunctionName) return false;
      return (
        headBlockCallsTarget.get(enclosingBlock) === true ||
        baseBlockCallsTarget.get(enclosingBlock) === true
      );
    }

    // ------------------------------------------------------------------------
    // Step 1: Compare Test Declarations
    // ------------------------------------------------------------------------
    const unmatchedBaseDecls = [...baseDeclarations];
    const unmatchedHeadDecls = [...headDeclarations];

    // Detect ambiguous declarations (duplicate titles in same file)
    const baseAmbiguities = baseDeclarations.filter((d) => d.isAmbiguous);
    const headAmbiguities = headDeclarations.filter((d) => d.isAmbiguous);
    if (baseAmbiguities.length > 0 || headAmbiguities.length > 0) {
      limitations.push(
        `Duplicate test descriptions detected in '${posixTestFilePath}'; ambiguous declarations were not paired arbitrarily.`
      );
    }

    // Match exact unambiguous fullTitles
    for (let b = unmatchedBaseDecls.length - 1; b >= 0; b--) {
      const bDecl = unmatchedBaseDecls[b];
      if (bDecl.isAmbiguous) continue;

      const hIndex = unmatchedHeadDecls.findIndex(
        (h) => !h.isAmbiguous && h.fullTitle === bDecl.fullTitle
      );
      if (hIndex !== -1) {
        const hDecl = unmatchedHeadDecls[hIndex];
        unmatchedBaseDecls.splice(b, 1);
        unmatchedHeadDecls.splice(hIndex, 1);

        // Check if body changed
        if (bDecl.normalizedBody !== hDecl.normalizedBody && bDecl.kind !== "DESCRIBE") {
          declarationChanges.push({
            id: idGenerator.nextTdcId(),
            posixTestFilePath,
            changeType: "MODIFIED",
            fullTitle: bDecl.fullTitle,
            beforeDescription: bDecl.description,
            afterDescription: hDecl.description,
            beforeSpan: bDecl.span,
            afterSpan: hDecl.span,
            details: `Test body modified in "${bDecl.fullTitle}"`,
          });
        }
      }
    }

    // Detect renamed descriptions within the same ancestor block
    for (let b = unmatchedBaseDecls.length - 1; b >= 0; b--) {
      const bDecl = unmatchedBaseDecls[b];
      if (bDecl.isAmbiguous || bDecl.kind === "DESCRIBE") continue;

      const bAncestors = bDecl.ancestorTitles.join(" > ");
      const matchingAncestors = unmatchedHeadDecls.filter(
        (h) => !h.isAmbiguous && h.kind !== "DESCRIBE" && h.ancestorTitles.join(" > ") === bAncestors
      );

      // If exactly one unmatched test exists in the same ancestor block, conservatively match as renamed
      if (matchingAncestors.length === 1) {
        const hDecl = matchingAncestors[0];
        const hIndex = unmatchedHeadDecls.indexOf(hDecl);
        unmatchedBaseDecls.splice(b, 1);
        unmatchedHeadDecls.splice(hIndex, 1);

        declarationChanges.push({
          id: idGenerator.nextTdcId(),
          posixTestFilePath,
          changeType: "MODIFIED",
          fullTitle: hDecl.fullTitle,
          beforeDescription: bDecl.description,
          afterDescription: hDecl.description,
          beforeSpan: bDecl.span,
          afterSpan: hDecl.span,
          details: `Test description changed from "${bDecl.description}" to "${hDecl.description}"`,
        });

        // Emit finding for description change
        const evBaseId = idGenerator.nextEvId();
        evidence.push({
          id: evBaseId,
          kind: "TEST_BEFORE",
          commitRole: "BASE",
          commitSha: baseCommitSha,
          posixFilePath: posixTestFilePath,
          span: bDecl.span,
          codeSnippet: bDecl.callNode.getText().slice(0, 140),
          description: `Test declaration before rename in ${posixTestFilePath}`,
        });

        const evHeadId = idGenerator.nextEvId();
        evidence.push({
          id: evHeadId,
          kind: "TEST_AFTER",
          commitRole: "HEAD",
          commitSha: headCommitSha,
          posixFilePath: posixTestFilePath,
          span: hDecl.span,
          codeSnippet: hDecl.callNode.getText().slice(0, 140),
          description: `Test declaration after rename in ${posixTestFilePath}`,
        });

        const obsId = idGenerator.nextObsId();
        const obs: Observation = {
          id: obsId,
          category: "OBSERVED",
          statement: `Test description changed from "${bDecl.description}" to "${hDecl.description}" in '${posixTestFilePath}'.`,
          evidenceIds: [evBaseId, evHeadId],
          span: hDecl.span,
          snippet: hDecl.callNode.getText().slice(0, 120),
        };

        const infId = idGenerator.nextInfId();
        const inf: InferenceStatement = {
          id: infId,
          category: "INFERRED",
          statement: `Test title or description was updated; intent or requirements expressed in test title modified.`,
          ruleId: "RULE_TEST_DECLARATION_MODIFIED",
          supportingObservationIds: [obsId],
        };

        const unkId = idGenerator.nextUnkId();
        const unk: UnknownStatement = {
          id: unkId,
          category: "UNKNOWN",
          statement: `Static analysis cannot determine whether changing the test title reflects changed functional requirements.`,
          reasonCategory: "RUNTIME_TEST_EXECUTION_UNVERIFIED",
        };

        findings.push({
          id: idGenerator.nextFndId(),
          title: `Test description changed: "${bDecl.description}" -> "${hDecl.description}"`,
          category: "TEST_CHANGE",
          attentionLevel: "INFORMATIONAL",
          structuralChangeIds: [],
          correlationId: null,
          observed: [obs],
          inferred: [inf],
          unknown: [unk],
        });
      }
    }

    // Remaining unmatched base declarations are REMOVED
    for (const bDecl of unmatchedBaseDecls) {
      if (bDecl.kind === "DESCRIBE") continue;
      declarationChanges.push({
        id: idGenerator.nextTdcId(),
        posixTestFilePath,
        changeType: "REMOVED",
        fullTitle: bDecl.fullTitle,
        beforeDescription: bDecl.description,
        afterDescription: null,
        beforeSpan: bDecl.span,
        afterSpan: null,
        details: `Test declaration removed: "${bDecl.fullTitle}"`,
      });

      const evId = idGenerator.nextEvId();
      evidence.push({
        id: evId,
        kind: "TEST_BEFORE",
        commitRole: "BASE",
        commitSha: baseCommitSha,
        posixFilePath: posixTestFilePath,
        span: bDecl.span,
        codeSnippet: bDecl.callNode.getText().slice(0, 140),
        description: `Removed test declaration in ${posixTestFilePath}`,
      });

      const obsId = idGenerator.nextObsId();
      const obs: Observation = {
        id: obsId,
        category: "OBSERVED",
        statement: `Test declaration "${bDecl.fullTitle}" at lines ${bDecl.span.startLine}-${bDecl.span.endLine} was removed in HEAD.`,
        evidenceIds: [evId],
        span: bDecl.span,
        snippet: bDecl.callNode.getText().slice(0, 120),
      };

      const infId = idGenerator.nextInfId();
      const inf: InferenceStatement = {
        id: infId,
        category: "INFERRED",
        statement: `Test case was removed from '${posixTestFilePath}'.`,
        ruleId: "RULE_TEST_DECLARATION_REMOVED",
        supportingObservationIds: [obsId],
      };

      const unkId = idGenerator.nextUnkId();
      const unk: UnknownStatement = {
        id: unkId,
        category: "UNKNOWN",
        statement: `Static analysis cannot determine whether test coverage exists elsewhere or if functionality was obsoleted.`,
        reasonCategory: "RUNTIME_TEST_EXECUTION_UNVERIFIED",
      };

      findings.push({
        id: idGenerator.nextFndId(),
        title: `Test declaration removed: "${bDecl.fullTitle}"`,
        category: "TEST_CHANGE",
        attentionLevel: "MODERATE_ATTENTION",
        structuralChangeIds: [],
        correlationId: null,
        observed: [obs],
        inferred: [inf],
        unknown: [unk],
      });
    }

    // Remaining unmatched head declarations are ADDED
    for (const hDecl of unmatchedHeadDecls) {
      if (hDecl.kind === "DESCRIBE") continue;
      declarationChanges.push({
        id: idGenerator.nextTdcId(),
        posixTestFilePath,
        changeType: "ADDED",
        fullTitle: hDecl.fullTitle,
        beforeDescription: null,
        afterDescription: hDecl.description,
        beforeSpan: null,
        afterSpan: hDecl.span,
        details: `Test declaration added: "${hDecl.fullTitle}"`,
      });

      const evId = idGenerator.nextEvId();
      evidence.push({
        id: evId,
        kind: "TEST_AFTER",
        commitRole: "HEAD",
        commitSha: headCommitSha,
        posixFilePath: posixTestFilePath,
        span: hDecl.span,
        codeSnippet: hDecl.callNode.getText().slice(0, 140),
        description: `Added test declaration in ${posixTestFilePath}`,
      });

      const obsId = idGenerator.nextObsId();
      const obs: Observation = {
        id: obsId,
        category: "OBSERVED",
        statement: `Test declaration "${hDecl.fullTitle}" was introduced in HEAD at lines ${hDecl.span.startLine}-${hDecl.span.endLine}.`,
        evidenceIds: [evId],
        span: hDecl.span,
        snippet: hDecl.callNode.getText().slice(0, 120),
      };

      const infId = idGenerator.nextInfId();
      const inf: InferenceStatement = {
        id: infId,
        category: "INFERRED",
        statement: `New test case was added to '${posixTestFilePath}'.`,
        ruleId: "RULE_TEST_DECLARATION_ADDED",
        supportingObservationIds: [obsId],
      };

      const unkId = idGenerator.nextUnkId();
      const unk: UnknownStatement = {
        id: unkId,
        category: "UNKNOWN",
        statement: `Static analysis cannot determine whether the added test passes or increases effective branch coverage.`,
        reasonCategory: "RUNTIME_TEST_EXECUTION_UNVERIFIED",
      };

      findings.push({
        id: idGenerator.nextFndId(),
        title: `Test declaration added: "${hDecl.fullTitle}"`,
        category: "TEST_CHANGE",
        attentionLevel: "INFORMATIONAL",
        structuralChangeIds: [],
        correlationId: null,
        observed: [obs],
        inferred: [inf],
        unknown: [unk],
      });
    }

    // ------------------------------------------------------------------------
    // Step 2: Compare Assertions
    // ------------------------------------------------------------------------
    if (fileChangeStatus === "ADDED") {
      // Entire file added: all assertions are added
      for (const hAst of headAssertions) {
        assertionChanges.push({
          changeType: "ASSERTION_ADDED",
          enclosingTestBlock: hAst.enclosingTestTitle,
          callsTargetFunctionInBlock: checkCallsTarget(hAst.enclosingTestTitle),
          beforeAssertionText: null,
          afterAssertionText: hAst.rawText,
          beforeSpan: null,
          afterSpan: hAst.span,
        });
      }
    } else if (fileChangeStatus === "DELETED") {
      // Entire file deleted: all assertions are removed
      for (const bAst of baseAssertions) {
        assertionChanges.push({
          changeType: "ASSERTION_REMOVED",
          enclosingTestBlock: bAst.enclosingTestTitle,
          callsTargetFunctionInBlock: checkCallsTarget(bAst.enclosingTestTitle),
          beforeAssertionText: bAst.rawText,
          afterAssertionText: null,
          beforeSpan: bAst.span,
          afterSpan: null,
        });
      }
    } else if (fileChangeStatus === "MODIFIED") {
      // Group assertions by enclosing test title
      const unmatchedBaseAsts = [...baseAssertions];
      const unmatchedHeadAsts = [...headAssertions];

      // Pass 2a: Exact matches on normalized text and enclosing block
      for (let b = unmatchedBaseAsts.length - 1; b >= 0; b--) {
        const bAst = unmatchedBaseAsts[b];
        const hIndex = unmatchedHeadAsts.findIndex(
          (h) =>
            h.enclosingTestTitle === bAst.enclosingTestTitle &&
            h.normalizedText === bAst.normalizedText
        );
        if (hIndex !== -1) {
          unmatchedBaseAsts.splice(b, 1);
          unmatchedHeadAsts.splice(hIndex, 1);
        }
      }

      // Pass 2b: Modified assertions (same enclosing block, same matcher, same target expression)
      for (let b = unmatchedBaseAsts.length - 1; b >= 0; b--) {
        const bAst = unmatchedBaseAsts[b];
        const hIndex = unmatchedHeadAsts.findIndex(
          (h) =>
            h.enclosingTestTitle === bAst.enclosingTestTitle &&
            h.matcherName === bAst.matcherName &&
            h.targetExpression !== null &&
            h.targetExpression === bAst.targetExpression &&
            h.normalizedText !== bAst.normalizedText
        );

        if (hIndex !== -1) {
          const hAst = unmatchedHeadAsts[hIndex];
          unmatchedBaseAsts.splice(b, 1);
          unmatchedHeadAsts.splice(hIndex, 1);

          assertionChanges.push({
            changeType: "ASSERTION_MODIFIED_OR_REWRITTEN",
            enclosingTestBlock: hAst.enclosingTestTitle,
            callsTargetFunctionInBlock: checkCallsTarget(hAst.enclosingTestTitle),
            beforeAssertionText: bAst.rawText,
            afterAssertionText: hAst.rawText,
            beforeSpan: bAst.span,
            afterSpan: hAst.span,
          });

          // Synthesize finding for modified assertion
          const evBaseId = idGenerator.nextEvId();
          evidence.push({
            id: evBaseId,
            kind: "TEST_BEFORE",
            commitRole: "BASE",
            commitSha: baseCommitSha,
            posixFilePath: posixTestFilePath,
            span: bAst.span,
            codeSnippet: bAst.rawText,
            description: `Assertion before modification at BASE in ${posixTestFilePath}`,
          });

          const evHeadId = idGenerator.nextEvId();
          evidence.push({
            id: evHeadId,
            kind: "TEST_AFTER",
            commitRole: "HEAD",
            commitSha: headCommitSha,
            posixFilePath: posixTestFilePath,
            span: hAst.span,
            codeSnippet: hAst.rawText,
            description: `Assertion after modification at HEAD in ${posixTestFilePath}`,
          });

          const obsId = idGenerator.nextObsId();
          const blockInfo = hAst.enclosingTestTitle ? ` in "${hAst.enclosingTestTitle}"` : "";
          const obs: Observation = {
            id: obsId,
            category: "OBSERVED",
            statement: `Assertion "${bAst.rawText}" at BASE lines ${bAst.span.startLine}-${bAst.span.endLine} was modified to "${hAst.rawText}" at HEAD lines ${hAst.span.startLine}-${hAst.span.endLine}${blockInfo}.`,
            evidenceIds: [evBaseId, evHeadId],
            span: hAst.span,
            snippet: hAst.rawText,
          };

          const infId = idGenerator.nextInfId();
          const inf: InferenceStatement = {
            id: infId,
            category: "INFERRED",
            statement: `Expected assertion expression was modified for target expression '${hAst.targetExpression}'.`,
            ruleId: "RULE_TEST_ASSERTION_MODIFIED",
            supportingObservationIds: [obsId],
          };

          const unkId = idGenerator.nextUnkId();
          const unk: UnknownStatement = {
            id: unkId,
            category: "UNKNOWN",
            statement: `Static analysis cannot determine whether the modified assertion loosened or tightened test expectations at runtime.`,
            reasonCategory: "RUNTIME_TEST_EXECUTION_UNVERIFIED",
          };

          findings.push({
            id: idGenerator.nextFndId(),
            title: `Assertion modified${blockInfo}: "${bAst.rawText}" -> "${hAst.rawText}"`,
            category: "TEST_CHANGE",
            attentionLevel: "MODERATE_ATTENTION",
            structuralChangeIds: [],
            correlationId: null,
            observed: [obs],
            inferred: [inf],
            unknown: [unk],
          });
        }
      }

      // Pass 2c: Remaining base assertions are REMOVED
      for (const bAst of unmatchedBaseAsts) {
        assertionChanges.push({
          changeType: "ASSERTION_REMOVED",
          enclosingTestBlock: bAst.enclosingTestTitle,
          callsTargetFunctionInBlock: checkCallsTarget(bAst.enclosingTestTitle),
          beforeAssertionText: bAst.rawText,
          afterAssertionText: null,
          beforeSpan: bAst.span,
          afterSpan: null,
        });

        const evId = idGenerator.nextEvId();
        evidence.push({
          id: evId,
          kind: "TEST_BEFORE",
          commitRole: "BASE",
          commitSha: baseCommitSha,
          posixFilePath: posixTestFilePath,
          span: bAst.span,
          codeSnippet: bAst.rawText,
          description: `Removed assertion at BASE in ${posixTestFilePath}`,
        });

        const obsId = idGenerator.nextObsId();
        const blockInfo = bAst.enclosingTestTitle ? ` in "${bAst.enclosingTestTitle}"` : "";
        const obs: Observation = {
          id: obsId,
          category: "OBSERVED",
          statement: `Assertion "${bAst.rawText}" at BASE lines ${bAst.span.startLine}-${bAst.span.endLine} was removed in HEAD${blockInfo}.`,
          evidenceIds: [evId],
          span: bAst.span,
          snippet: bAst.rawText,
        };

        const infId = idGenerator.nextInfId();
        const inf: InferenceStatement = {
          id: infId,
          category: "INFERRED",
          statement: `Assertion expression was removed from test suite.`,
          ruleId: "RULE_TEST_ASSERTION_REMOVED",
          supportingObservationIds: [obsId],
        };

        const unkId = idGenerator.nextUnkId();
        const unk: UnknownStatement = {
          id: unkId,
          category: "UNKNOWN",
          statement: `Static analysis cannot determine whether the tested behavior is asserted by another test or if verification was dropped.`,
          reasonCategory: "RUNTIME_TEST_EXECUTION_UNVERIFIED",
        };

        findings.push({
          id: idGenerator.nextFndId(),
          title: `Assertion removed${blockInfo}: "${bAst.rawText}"`,
          category: "TEST_CHANGE",
          attentionLevel: "MODERATE_ATTENTION",
          structuralChangeIds: [],
          correlationId: null,
          observed: [obs],
          inferred: [inf],
          unknown: [unk],
        });
      }

      // Pass 2d: Remaining head assertions are ADDED
      for (const hAst of unmatchedHeadAsts) {
        assertionChanges.push({
          changeType: "ASSERTION_ADDED",
          enclosingTestBlock: hAst.enclosingTestTitle,
          callsTargetFunctionInBlock: checkCallsTarget(hAst.enclosingTestTitle),
          beforeAssertionText: null,
          afterAssertionText: hAst.rawText,
          beforeSpan: null,
          afterSpan: hAst.span,
        });

        const evId = idGenerator.nextEvId();
        evidence.push({
          id: evId,
          kind: "TEST_AFTER",
          commitRole: "HEAD",
          commitSha: headCommitSha,
          posixFilePath: posixTestFilePath,
          span: hAst.span,
          codeSnippet: hAst.rawText,
          description: `Added assertion at HEAD in ${posixTestFilePath}`,
        });

        const obsId = idGenerator.nextObsId();
        const blockInfo = hAst.enclosingTestTitle ? ` in "${hAst.enclosingTestTitle}"` : "";
        const obs: Observation = {
          id: obsId,
          category: "OBSERVED",
          statement: `Assertion "${hAst.rawText}" was added at HEAD lines ${hAst.span.startLine}-${hAst.span.endLine}${blockInfo}.`,
          evidenceIds: [evId],
          span: hAst.span,
          snippet: hAst.rawText,
        };

        const infId = idGenerator.nextInfId();
        const inf: InferenceStatement = {
          id: infId,
          category: "INFERRED",
          statement: `New assertion was introduced into test suite.`,
          ruleId: "RULE_TEST_ASSERTION_ADDED",
          supportingObservationIds: [obsId],
        };

        const unkId = idGenerator.nextUnkId();
        const unk: UnknownStatement = {
          id: unkId,
          category: "UNKNOWN",
          statement: `Static analysis cannot determine whether the new assertion executes or passes at runtime.`,
          reasonCategory: "RUNTIME_TEST_EXECUTION_UNVERIFIED",
        };

        findings.push({
          id: idGenerator.nextFndId(),
          title: `Assertion added${blockInfo}: "${hAst.rawText}"`,
          category: "TEST_CHANGE",
          attentionLevel: "INFORMATIONAL",
          structuralChangeIds: [],
          correlationId: null,
          observed: [obs],
          inferred: [inf],
          unknown: [unk],
        });
      }
    }

    const testChange: TestChange = {
      id: idGenerator.nextTcId(),
      posixTestFilePath,
      fileChangeStatus,
      importsTargetFile,
      mentionsTargetFunction,
      assertionChanges,
    };

    return {
      testChange,
      declarationChanges,
      evidence,
      findings,
      limitations,
    };
  }
}

