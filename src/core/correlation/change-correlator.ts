/**
 * Change Archaeologist - Conservative Change-to-Test Correlation Engine
 *
 * Implements deterministic, conservative correlation rules relating production-code
 * structural changes to test-code changes across the same Git revision range.
 *
 * Epistemic Rules:
 * - Rule A: Shared-file correlation (shared file path alone does not prove relationship).
 * - Rule B: Same-commit correlation (temporal co-occurrence only; does not establish causation).
 * - Rule C: Assertion addition or modification (conservative unverified inference).
 * - Rule D: Assertion removal (flags potential testing concern with explicit caveats).
 * - Rule E: Test declaration addition or removal (temporal co-occurrence; no coverage claims).
 * - Rule F: Unchanged tests (reported as structurally unchanged companion tests).
 * - Rule G: Missing or ambiguous information (preserves upstream limitations without manufacturing matches).
 *
 * Invariant: Never claims runtime coverage, regression, or defect causality.
 */

import type {
  AnalysisReport,
  CorrelationAnalysisStatus,
  CorrelationClassification,
  CorrelationItem,
  CorrelationReport,
  CorrelationResult,
  CorrelationStatus,
  EvidenceItem,
  Finding,
  InferenceStatement,
  Observation,
  ReviewAttentionLevel,
  RuleId,
  TestAnalysisReport,
  TestChange,
  UnknownStatement,
} from "../domain/types.js";
import { assertValidCorrelationReport } from "../domain/schemas.js";

export class ChangeCorrelator {
  static getEvidenceIdsForStructuralChange(
    scId: string,
    prodReport: AnalysisReport
  ): string[] {
    const evIds: string[] = [];
    for (const f of prodReport.findings) {
      if (f.structuralChangeIds.includes(scId)) {
        for (const obs of f.observed) {
          evIds.push(...obs.evidenceIds);
        }
      }
    }
    return evIds;
  }

  static getEvidenceIdsForTestChange(
    tcId: string,
    testReport: TestAnalysisReport
  ): string[] {
    const evIds: string[] = [];
    for (const f of testReport.findings) {
      for (const obs of f.observed) {
        evIds.push(...obs.evidenceIds);
      }
    }
    return evIds;
  }

  /**
   * Correlates an AnalysisReport (production changes) with a TestAnalysisReport (test changes).
   * Pure deterministic function that never mutates its inputs.
   */
  static correlate(
    productionReport: AnalysisReport,
    testReport: TestAnalysisReport
  ): CorrelationReport {
    const nowIso = new Date().toISOString();

    const correlations: CorrelationResult[] = [];
    const correlationItems: CorrelationItem[] = [];
    const findings: Finding[] = [];
    const limitations: string[] = [];
    const errors = [...productionReport.errors, ...testReport.errors];

    // Combine existing evidence from both reports without mutation or dangling references
    const evidenceMap = new Map<string, EvidenceItem>();
    for (const ev of productionReport.evidence) {
      evidenceMap.set(ev.id, ev);
    }
    for (const ev of testReport.evidence) {
      evidenceMap.set(ev.id, ev);
    }
    const combinedEvidence = Array.from(evidenceMap.values());

    // Deterministic ID generators
    let corrCount = 1;
    let itemCount = 1;
    let fndCount = 1;
    let obsCount = 1;
    let infCount = 1;
    let unkCount = 1;

    const nextCorrId = () => `CORR-${String(corrCount++).padStart(3, "0")}`;
    const nextItemId = () => `CORR-ITEM-${String(itemCount++).padStart(3, "0")}`;
    const nextFndId = () => `FND-CORR-${String(fndCount++).padStart(3, "0")}`;
    const nextObsId = () => `OBS-CORR-${String(obsCount++).padStart(3, "0")}`;
    const nextInfId = () => `INF-CORR-${String(infCount++).padStart(3, "0")}`;
    const nextUnkId = () => `UNK-CORR-${String(unkCount++).padStart(3, "0")}`;

    // ------------------------------------------------------------------------
    // Step 1: Upstream Revisions and Status Validation (Rule G)
    // ------------------------------------------------------------------------
    const baseMismatch = productionReport.baseCommit.sha !== testReport.baseCommit.sha;
    const headMismatch = productionReport.headCommit.sha !== testReport.headCommit.sha;

    if (baseMismatch || headMismatch) {
      limitations.push(
        `Production analysis and test analysis were performed on differing Git revisions (BASE: ${productionReport.baseCommit.shortSha} vs ${testReport.baseCommit.shortSha}, HEAD: ${productionReport.headCommit.shortSha} vs ${testReport.headCommit.shortSha}); correlation cannot be established.`
      );

      const report: CorrelationReport = {
        schemaVersion: "1.0.0",
        generatedAtIso: nowIso,
        status: "INCOMPLETE_UPSTREAM_ANALYSIS",
        repository: productionReport.repository,
        baseCommit: productionReport.baseCommit,
        headCommit: productionReport.headCommit,
        correlations: [],
        correlationItems: [],
        findings: [],
        evidence: combinedEvidence,
        limitations,
        errors,
      };

      assertValidCorrelationReport(report);
      return report;
    }

    const isProductionIncomplete =
      productionReport.status !== "COMPLETED_WITH_FINDINGS" &&
      productionReport.status !== "COMPLETED_NO_STRUCTURAL_CHANGES";

    const isTestIncomplete =
      testReport.status !== "COMPLETED_WITH_CHANGES" &&
      testReport.status !== "COMPLETED_NO_CHANGES";

    if (isProductionIncomplete || isTestIncomplete) {
      if (isProductionIncomplete) {
        limitations.push(
          `Production analysis was incomplete (status: '${productionReport.status}'). Upstream limitations: ${productionReport.limitations.join("; ")}`
        );
      }
      if (isTestIncomplete) {
        limitations.push(
          `Test analysis was incomplete (status: '${testReport.status}'). Upstream limitations: ${testReport.limitations.join("; ")}`
        );
      }

      const report: CorrelationReport = {
        schemaVersion: "1.0.0",
        generatedAtIso: nowIso,
        status: "INCOMPLETE_UPSTREAM_ANALYSIS",
        repository: productionReport.repository,
        baseCommit: productionReport.baseCommit,
        headCommit: productionReport.headCommit,
        correlations: [],
        correlationItems: [],
        findings: [],
        evidence: combinedEvidence,
        limitations,
        errors,
      };

      assertValidCorrelationReport(report);
      return report;
    }

    // Check for ambiguous test declaration matching (Rule G)
    const hasAmbiguousTestMatches = testReport.limitations.some(
      (lim) =>
        lim.toLowerCase().includes("duplicate test descriptions") ||
        lim.toLowerCase().includes("ambiguous")
    );

    if (hasAmbiguousTestMatches) {
      limitations.push(
        "Ambiguous test matches detected in upstream test analysis; correlation cannot pair ambiguous declarations with production changes."
      );
    }

    // ------------------------------------------------------------------------
    // Step 2: Handle Case Where Target Production Function Has No Changes
    // ------------------------------------------------------------------------
    const structuralChanges = [...productionReport.structuralChanges].sort((a, b) =>
      a.id.localeCompare(b.id)
    );

    const hasTestChanges =
      testReport.testChanges.some(
        (tc) =>
          tc.assertionChanges.length > 0 ||
          tc.fileChangeStatus === "ADDED" ||
          tc.fileChangeStatus === "DELETED"
      ) || testReport.declarationChanges.length > 0;

    if (structuralChanges.length === 0) {
      if (hasTestChanges) {
        const corrId = nextCorrId();
        correlations.push({
          id: corrId,
          structuralChangeId: "",
          status: "NONE",
          relatedTestChangeIds: testReport.testChanges.map((tc) => tc.id),
          untouchedCompanionTestFiles: [],
          rationale: `Test modifications occurred without detected structural modifications to target function '${productionReport.request.targetFunctionName}'.`,
        });

        for (const tc of testReport.testChanges) {
          if (tc.assertionChanges.length > 0) {
            correlationItems.push({
              id: nextItemId(),
              correlationId: corrId,
              structuralChangeId: null,
              testChangeId: tc.id,
              posixTestFilePath: tc.posixTestFilePath,
              classification: "NO_PRODUCTION_CHANGES_OBSERVED",
              status: "NONE",
              rationale: `Test changes were observed in '${tc.posixTestFilePath}', but no structural changes were detected in target function '${productionReport.request.targetFunctionName}'.`,
              observedFact: `Test assertions changed in '${tc.posixTestFilePath}' while target function '${productionReport.request.targetFunctionName}' remained structurally unchanged.`,
              inferredRelationship: "Test changes occurred without detected structural modifications to the target function.",
              unknowns: [
                "Static analysis cannot determine whether test changes exercise other production functions or reflect test refactoring.",
              ],
              evidenceIds: combinedEvidence.map((e) => e.id).slice(0, 1),
            });
          }
        }

        const validEv = combinedEvidence[0];
        if (validEv) {
          const obsId = nextObsId();
          const obs: Observation = {
            id: obsId,
            category: "OBSERVED",
            statement: `Test modifications were detected in companion test files, but target function '${productionReport.request.targetFunctionName}' has 0 structural changes.`,
            evidenceIds: [validEv.id],
          };

          const infId = nextInfId();
          const inf: InferenceStatement = {
            id: infId,
            category: "INFERRED",
            statement: `Test suite was modified without detected structural modifications to the target function.`,
            ruleId: "RULE_CORRELATION_NO_PRODUCTION_CHANGES",
            supportingObservationIds: [obsId],
          };

          const unkId = nextUnkId();
          const unk: UnknownStatement = {
            id: unkId,
            category: "UNKNOWN",
            statement: `Static analysis cannot determine whether test changes exercise other production functions or reflect refactoring.`,
            reasonCategory: "RUNTIME_TEST_EXECUTION_UNVERIFIED",
          };

          findings.push({
            id: nextFndId(),
            title: `Test changes observed with no production structural changes`,
            category: "TEST_CORRELATION",
            attentionLevel: "INFORMATIONAL",
            structuralChangeIds: [],
            correlationId: corrId,
            observed: [obs],
            inferred: [inf],
            unknown: [unk],
          });
        }
      }

      const report: CorrelationReport = {
        schemaVersion: "1.0.0",
        generatedAtIso: nowIso,
        status: "COMPLETE_NO_CORRELATIONS",
        repository: productionReport.repository,
        baseCommit: productionReport.baseCommit,
        headCommit: productionReport.headCommit,
        correlations,
        correlationItems,
        findings,
        evidence: combinedEvidence,
        limitations: [
          ...limitations,
          `No structural changes were detected in target function '${productionReport.request.targetFunctionName}'.`,
        ],
        errors,
      };

      assertValidCorrelationReport(report);
      return report;
    }

    // ------------------------------------------------------------------------
    // Step 3: Handle Case Where Production Changes Exist with No Test Changes
    // ------------------------------------------------------------------------
    if (!hasTestChanges) {
      for (const sc of structuralChanges) {
        const corrId = nextCorrId();
        correlations.push({
          id: corrId,
          structuralChangeId: sc.id,
          status: "NONE",
          relatedTestChangeIds: [],
          untouchedCompanionTestFiles: [...testReport.request.testFilePaths],
          rationale: `Production structural change '${sc.summary}' occurred with no corresponding test changes in the analyzed companion test files.`,
        });

        correlationItems.push({
          id: nextItemId(),
          correlationId: corrId,
          structuralChangeId: sc.id,
          testChangeId: null,
          posixTestFilePath: null,
          classification: "NO_TEST_CHANGES_OBSERVED",
          status: "NONE",
          rationale: `Production structural change '${sc.summary}' occurred with no detected changes in companion test files.`,
          observedFact: `Production structural change '${sc.summary}' was observed, but 0 test changes were detected in the analyzed test files.`,
          inferredRelationship: "Production behavior changed without accompanying test changes in the specified test files.",
          unknowns: [
            "Static analysis cannot prove that tests do not exist in other files or that existing tests fail to exercise the changed code.",
          ],
          evidenceIds: combinedEvidence.map((e) => e.id).slice(0, 1),
        });

        const validEv = combinedEvidence[0];
        if (validEv) {
          const obsId = nextObsId();
          const obs: Observation = {
            id: obsId,
            category: "OBSERVED",
            statement: `Production structural change '${sc.summary}' occurred, but companion test files were unmodified.`,
            evidenceIds: [validEv.id],
          };

          const infId = nextInfId();
          const inf: InferenceStatement = {
            id: infId,
            category: "INFERRED",
            statement: `Production change occurred without accompanying test changes in the analyzed test files.`,
            ruleId: "RULE_CORRELATION_NO_TEST_CHANGES",
            supportingObservationIds: [obsId],
          };

          const unkId = nextUnkId();
          const unk: UnknownStatement = {
            id: unkId,
            category: "UNKNOWN",
            statement: `Static analysis cannot prove that tests do not exist in other files or that existing tests fail to exercise the changed code.`,
            reasonCategory: "TEST_CORRELATION_AMBIGUOUS",
          };

          findings.push({
            id: nextFndId(),
            title: `Production change with no companion test modifications: ${sc.summary}`,
            category: "TEST_CORRELATION",
            attentionLevel: "MODERATE_ATTENTION",
            structuralChangeIds: [sc.id],
            correlationId: corrId,
            observed: [obs],
            inferred: [inf],
            unknown: [unk],
          });
        }
      }

      const report: CorrelationReport = {
        schemaVersion: "1.0.0",
        generatedAtIso: nowIso,
        status: "COMPLETE_NO_CORRELATIONS",
        repository: productionReport.repository,
        baseCommit: productionReport.baseCommit,
        headCommit: productionReport.headCommit,
        correlations,
        correlationItems,
        findings,
        evidence: combinedEvidence,
        limitations: [
          ...limitations,
          "Production structural changes were detected, but no companion test changes were observed in the supplied test paths.",
        ],
        errors,
      };

      assertValidCorrelationReport(report);
      return report;
    }

    // ------------------------------------------------------------------------
    // Step 4: Correlate Production Changes with Test Changes
    // ------------------------------------------------------------------------
    const testChanges = [...testReport.testChanges].sort((a, b) => a.id.localeCompare(b.id));

    for (const sc of structuralChanges) {
      const corrId = nextCorrId();
      const relatedTcIds: string[] = [];
      const untouchedTestFiles: string[] = [];

      for (const tc of testChanges) {
        if (tc.assertionChanges.length === 0 && tc.fileChangeStatus === "UNMODIFIED_COMPANION") {
          untouchedTestFiles.push(tc.posixTestFilePath);
          continue;
        }

        relatedTcIds.push(tc.id);

        // Rule A Check: Shared file path
        if (tc.posixTestFilePath === productionReport.request.targetFilePath) {
          limitations.push(
            `Production change and test change occurred in the same source file '${tc.posixTestFilePath}'. Shared file path alone does not establish a causal relationship.`
          );
        }

        // Rule B & C & D: Examine assertion changes
        for (const astChange of tc.assertionChanges) {
          const isRemoved = astChange.changeType === "ASSERTION_REMOVED";
          const isModified = astChange.changeType === "ASSERTION_MODIFIED_OR_REWRITTEN";
          const isAdded = astChange.changeType === "ASSERTION_ADDED";

          // Determine syntactic closeness
          const hasDirectCall = astChange.callsTargetFunctionInBlock;
          const mentionsOrImports = tc.importsTargetFile || tc.mentionsTargetFunction;

          let status: CorrelationStatus = "WEAK";
          if (hasDirectCall) {
            status = "STRONG";
          } else if (mentionsOrImports) {
            status = "WEAK";
          } else {
            status = "WEAK";
          }

          let classification: CorrelationClassification = "TEMPORAL_CO_OCCURRENCE_ONLY";
          if (isRemoved) {
            classification = mentionsOrImports || hasDirectCall
              ? "POTENTIALLY_RELATED_ASSERTION_REMOVED"
              : "TEMPORAL_CO_OCCURRENCE_ONLY";
          } else if (isModified) {
            classification = mentionsOrImports || hasDirectCall
              ? "POTENTIALLY_RELATED_ASSERTION_MODIFIED"
              : "TEMPORAL_CO_OCCURRENCE_ONLY";
          } else if (isAdded) {
            classification = mentionsOrImports || hasDirectCall
              ? "POTENTIALLY_RELATED_ASSERTION_ADDED"
              : "TEMPORAL_CO_OCCURRENCE_ONLY";
          }

          let rationale = "";
          let observedFact = "";
          let inferredRel = "";
          let ruleId: RuleId = "RULE_CORRELATION_TEMPORAL_CO_OCCURRENCE";
          const unknowns: string[] = [];
          let attentionLevel: ReviewAttentionLevel = "INFORMATIONAL";

          if (classification === "TEMPORAL_CO_OCCURRENCE_ONLY") {
            rationale = `Changes occurred in the same revision range (temporal co-occurrence). Test file neither imports target file nor explicitly calls target function.`;
            observedFact = `Production structural change '${sc.summary}' and test change in '${tc.posixTestFilePath}' occurred in the same revision range.`;
            inferredRel = `Changes occurred in the same revision range; relationship is temporal co-occurrence only, not functional verification.`;
            ruleId = "RULE_CORRELATION_TEMPORAL_CO_OCCURRENCE";
            unknowns.push(
              "Static analysis cannot determine whether the test exercises the changed production function or if changes are unrelated."
            );
          } else if (isRemoved) {
            // Rule D: Assertion removal
            attentionLevel = "HIGH_ATTENTION";
            const otherAssertionsNote =
              tc.assertionChanges.length > 1
                ? ` Other assertions remain in '${tc.posixTestFilePath}'; verification for the behavior was not proven eliminated.`
                : "";
            rationale = `Assertion removal observed alongside production structural change '${sc.summary}'.${otherAssertionsNote}`;
            observedFact = `Assertion '${astChange.beforeAssertionText}' was structurally removed in '${tc.posixTestFilePath}'. Production structural change '${sc.summary}' occurred in the same revision range.${otherAssertionsNote}`;
            inferredRel = `Possible testing concern: An assertion was removed alongside production structural change '${sc.summary}'; relationship is inferred, not proven.`;
            ruleId = "RULE_CORRELATION_ASSERTION_REMOVED";
            unknowns.push(
              "The relationship between production change and removed assertion is inferred, not proven.",
              "Other assertions or companion tests may still check the relevant behavior.",
              "Static analysis cannot determine whether runtime behavior was affected or if a defect exists."
            );
          } else if (isModified) {
            // Rule C: Assertion modified
            attentionLevel = "MODERATE_ATTENTION";
            rationale = `Assertion modified alongside production structural change '${sc.summary}'. Relationship is unverified.`;
            observedFact = `Assertion was modified from '${astChange.beforeAssertionText}' to '${astChange.afterAssertionText}' in '${tc.posixTestFilePath}'. Production structural change '${sc.summary}' occurred in the same revision range.`;
            inferredRel = `Potential relationship: Assertion was modified alongside production structural change; relationship remains unverified.`;
            ruleId = "RULE_CORRELATION_ASSERTION_MODIFIED";
            unknowns.push(
              "Static analysis cannot prove that the modified assertion verifies the changed production code.",
              "Static analysis cannot determine runtime test passing status or whether runtime behavior changed."
            );
          } else if (isAdded) {
            // Rule C: Assertion added
            attentionLevel = "INFORMATIONAL";
            rationale = `Assertion added alongside production structural change '${sc.summary}'. Relationship is unverified.`;
            observedFact = `Assertion '${astChange.afterAssertionText}' was introduced in '${tc.posixTestFilePath}'. Production structural change '${sc.summary}' occurred in the same revision range.`;
            inferredRel = `Potential relationship: New assertion was introduced alongside production structural change; relationship remains unverified.`;
            ruleId = "RULE_CORRELATION_ASSERTION_ADDED";
            unknowns.push(
              "Static analysis cannot confirm whether the added assertion tests the changed production behavior.",
              "Static analysis cannot determine whether the test passes at runtime."
            );
          }

          // Gather evidence IDs for this correlation item
          const prodEvIds = ChangeCorrelator.getEvidenceIdsForStructuralChange(
            sc.id,
            productionReport
          );
          const testEvIds = ChangeCorrelator.getEvidenceIdsForTestChange(
            tc.id,
            testReport
          );
          const itemEvidenceIds = Array.from(new Set([...prodEvIds, ...testEvIds]));
          if (itemEvidenceIds.length === 0 && combinedEvidence.length > 0) {
            itemEvidenceIds.push(combinedEvidence[0].id);
          }

          correlationItems.push({
            id: nextItemId(),
            correlationId: corrId,
            structuralChangeId: sc.id,
            testChangeId: tc.id,
            posixTestFilePath: tc.posixTestFilePath,
            classification,
            status,
            rationale,
            observedFact,
            inferredRelationship: inferredRel,
            unknowns,
            evidenceIds: itemEvidenceIds,
          });

          // Emit Finding
          if (itemEvidenceIds.length > 0) {
            const obsId = nextObsId();
            const obs: Observation = {
              id: obsId,
              category: "OBSERVED",
              statement: observedFact,
              evidenceIds: [itemEvidenceIds[0]],
            };

            const infId = nextInfId();
            const inf: InferenceStatement = {
              id: infId,
              category: "INFERRED",
              statement: inferredRel,
              ruleId,
              supportingObservationIds: [obsId],
            };

            const unkStatements: [UnknownStatement, ...UnknownStatement[]] = [
              {
                id: nextUnkId(),
                category: "UNKNOWN",
                statement: unknowns[0] ?? "Static analysis cannot establish runtime test execution or coverage.",
                reasonCategory: "RUNTIME_TEST_EXECUTION_UNVERIFIED",
              },
            ];

            for (let u = 1; u < unknowns.length; u++) {
              unkStatements.push({
                id: nextUnkId(),
                category: "UNKNOWN",
                statement: unknowns[u],
                reasonCategory: "RUNTIME_TEST_EXECUTION_UNVERIFIED",
              });
            }

            findings.push({
              id: nextFndId(),
              title: `${classification.replace(/_/g, " ")}: ${sc.summary}`,
              category: "TEST_CORRELATION",
              attentionLevel,
              structuralChangeIds: [sc.id],
              correlationId: corrId,
              observed: [obs],
              inferred: [inf],
              unknown: unkStatements,
            });
          }
        }
      }

      // Check Rule E: Test declaration changes
      for (const tdc of testReport.declarationChanges) {
        correlationItems.push({
          id: nextItemId(),
          correlationId: corrId,
          structuralChangeId: sc.id,
          testChangeId: null,
          posixTestFilePath: tdc.posixTestFilePath,
          classification: "POTENTIALLY_RELATED_TEST_DECLARATION_CHANGED",
          status: "WEAK",
          rationale: `Test declaration was ${tdc.changeType.toLowerCase()} in '${tdc.posixTestFilePath}' alongside production structural change '${sc.summary}'.`,
          observedFact: `Test declaration "${tdc.fullTitle}" was ${tdc.changeType.toLowerCase()} in '${tdc.posixTestFilePath}' in the same revision range as production change '${sc.summary}'.`,
          inferredRelationship: `Test declaration was ${tdc.changeType.toLowerCase()} in the same revision range as production structural change.`,
          unknowns: [
            "Static analysis cannot conclude that an added test validates the changed function or that a removed test was the only protection for a behavior.",
            "Static analysis cannot determine test execution or coverage.",
          ],
          evidenceIds: combinedEvidence.length > 0 ? [combinedEvidence[0].id] : [],
        });
      }

      correlations.push({
        id: corrId,
        structuralChangeId: sc.id,
        status: relatedTcIds.length > 0 ? "WEAK" : "NONE",
        relatedTestChangeIds: relatedTcIds,
        untouchedCompanionTestFiles: untouchedTestFiles,
        rationale:
          relatedTcIds.length > 0
            ? `Production change '${sc.summary}' co-occurred with ${relatedTcIds.length} test changes.`
            : `Production change '${sc.summary}' occurred with no corresponding companion test changes.`,
      });
    }

    // Sort deterministically
    correlations.sort((a, b) => a.id.localeCompare(b.id));
    correlationItems.sort((a, b) => a.id.localeCompare(b.id));
    findings.sort((a, b) => a.id.localeCompare(b.id));

    const finalStatus: CorrelationAnalysisStatus =
      hasAmbiguousTestMatches && correlations.length === 0
        ? "INCOMPLETE_AMBIGUOUS_MATCHES"
        : correlations.some((c) => c.status !== "NONE")
        ? "COMPLETE_CORRELATED"
        : "COMPLETE_NO_CORRELATIONS";

    const report: CorrelationReport = {
      schemaVersion: "1.0.0",
      generatedAtIso: nowIso,
      status: finalStatus,
      repository: productionReport.repository,
      baseCommit: productionReport.baseCommit,
      headCommit: productionReport.headCommit,
      correlations,
      correlationItems,
      findings,
      evidence: combinedEvidence,
      limitations,
      errors,
    };

    assertValidCorrelationReport(report);
    return report;
  }
}

/**
 * Functional entrypoint for correlating production-code and test-code changes.
 */
export function correlateChanges(
  productionReport: AnalysisReport,
  testReport: TestAnalysisReport
): CorrelationReport {
  return ChangeCorrelator.correlate(productionReport, testReport);
}
