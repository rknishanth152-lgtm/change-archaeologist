/**
 * Change Archaeologist - Historical Function Comparator (Core Orchestrator)
 *
 * Orchestrates:
 * 1. Historical source retrieval via GitAdapter (strictly from committed history).
 * 2. In-memory AST parsing and syntax diagnostics verification.
 * 3. Independent, unambiguous function identification at base and head revisions.
 * 4. Structural comparison and deterministic finding synthesis.
 * 5. Runtime report schema and referential-integrity validation.
 */

import { Project, type SourceFile } from "ts-morph";
import type {
  AnalysisErrorRecord,
  AnalysisReport,
  AnalysisRequest,
  AnalysisStatus,
  CommitInfo,
  EvidenceItem,
  Finding,
  FunctionSnapshot,
  Observation,
  RepositoryInfo,
  SourceSnapshot,
} from "../domain/types.js";
import { assertValidAnalysisReport, validateAnalysisRequest } from "../domain/schemas.js";
import { GitAdapter, type GitRunner } from "../git/index.js";
import { FunctionLocator, type FunctionCandidate } from "../ast/function-locator.js";
import { StructuralExtractor } from "../ast/structural-extractor.js";
import { StructuralComparator } from "../ast/structural-comparator.js";

export interface CompareHistoricalFunctionOptions {
  readonly runner?: GitRunner;
}

/**
 * Extracts syntactic error diagnostics (codes 1000-1999) from a parsed source file.
 */
function getSyntacticErrors(sourceFile: SourceFile): string[] {
  return sourceFile
    .getPreEmitDiagnostics()
    .filter((d) => d.getCode() >= 1000 && d.getCode() < 2000)
    .map((d) => {
      const msg = d.getMessageText();
      const text = typeof msg === "string" ? msg : msg.getMessageText();
      const line = d.getLineNumber() ?? 1;
      return `Line ${line}: ${text} (TS${d.getCode()})`;
    });
}

export class HistoricalFunctionComparator {
  readonly gitAdapter: GitAdapter;

  constructor(runner?: GitRunner) {
    this.gitAdapter = new GitAdapter(runner);
  }

  /**
   * Compares two in-memory SourceSnapshots for a named function.
   * Enables rapid unit testing without requiring an active Git subprocess.
   */
  compareSnapshots(
    request: AnalysisRequest,
    repository: RepositoryInfo,
    baseCommit: CommitInfo,
    headCommit: CommitInfo,
    baseSnapshot: SourceSnapshot | null,
    headSnapshot: SourceSnapshot | null
  ): AnalysisReport {
    const targetFilePath = request.targetFilePath;
    const targetFunctionName = request.targetFunctionName;
    const nowIso = new Date().toISOString();

    // ------------------------------------------------------------------------
    // Step 1: Handle absent files at either revision
    // ------------------------------------------------------------------------
    if (!baseSnapshot || !headSnapshot) {
      const missingRole = !baseSnapshot && !headSnapshot ? "BOTH" : !baseSnapshot ? "BASE" : "HEAD";
      const commit = missingRole === "HEAD" ? headCommit : baseCommit;
      const role = missingRole === "HEAD" ? "HEAD" : "BASE";

      const evId = "EV-001";
      const evidence: EvidenceItem[] = [
        {
          id: evId,
          kind: "GIT_METADATA",
          commitRole: role,
          commitSha: commit.sha,
          posixFilePath: targetFilePath,
          span: null,
          codeSnippet: null,
          description: `Target file '${targetFilePath}' was absent in ${missingRole} revision`,
        },
      ];

      const obsId = "OBS-001";
      const obs: Observation = {
        id: obsId,
        category: "OBSERVED",
        statement:
          missingRole === "BOTH"
            ? `Target file '${targetFilePath}' did not exist in either BASE (${baseCommit.shortSha}) or HEAD (${headCommit.shortSha}).`
            : `Target file '${targetFilePath}' did not exist in ${role} revision (${commit.shortSha}).`,
        evidenceIds: [evId],
      };

      const findings: Finding[] = [
        {
          id: "FND-001",
          title: `File absent in ${role} revision`,
          category: "LINEAGE_LIMITATION",
          attentionLevel: "HIGH_ATTENTION",
          structuralChangeIds: [],
          correlationId: null,
          observed: [obs],
          inferred: [
            {
              id: "INF-001",
              category: "INFERRED",
              statement: `Target file was either newly introduced, deleted, or moved across revisions.`,
              ruleId: "RULE_LINEAGE_LIMITATION",
              supportingObservationIds: [obsId],
            },
          ],
          unknown: [
            {
              id: "UNK-001",
              category: "UNKNOWN",
              statement: `Single-file analysis cannot track file lineage or moves across the repository.`,
              reasonCategory: "LINEAGE_OR_PARSE_BOUNDARY",
            },
          ],
        },
      ];

      const limitations = [
        missingRole === "BOTH"
          ? `Target file '${targetFilePath}' was absent in both revisions.`
          : `Target file '${targetFilePath}' was absent in ${role} revision '${commit.shortSha}'.`,
      ];

      const report: AnalysisReport = {
        schemaVersion: "1.0.0",
        generatedAtIso: nowIso,
        status: "INCOMPLETE_FILE_MISSING_IN_ONE_REVISION",
        request,
        repository,
        baseCommit,
        headCommit,
        baseFunction: null,
        headFunction: null,
        evidence,
        structuralChanges: [],
        testChanges: [],
        correlations: [],
        findings,
        limitations,
        errors: [],
      };

      assertValidAnalysisReport(report);
      return report;
    }

    // ------------------------------------------------------------------------
    // Step 2: Parse source snapshots in memory and inspect syntax
    // ------------------------------------------------------------------------
    const project = new Project({
      useInMemoryFileSystem: true,
      compilerOptions: {
        target: 99, // ESNext
        allowJs: true,
      },
    });

    const baseFile = project.createSourceFile("base.ts", baseSnapshot.content, { overwrite: true });
    const headFile = project.createSourceFile("head.ts", headSnapshot.content, { overwrite: true });

    const baseSyntaxErrors = getSyntacticErrors(baseFile);
    const headSyntaxErrors = getSyntacticErrors(headFile);

    if (baseSyntaxErrors.length > 0 || headSyntaxErrors.length > 0) {
      const errorRole = baseSyntaxErrors.length > 0 ? "BASE" : "HEAD";
      const errorList = baseSyntaxErrors.length > 0 ? baseSyntaxErrors : headSyntaxErrors;
      const commit = errorRole === "BASE" ? baseCommit : headCommit;

      const evId = "EV-001";
      const evidence: EvidenceItem[] = [
        {
          id: evId,
          kind: errorRole === "BASE" ? "SOURCE_BEFORE" : "SOURCE_AFTER",
          commitRole: errorRole,
          commitSha: commit.sha,
          posixFilePath: targetFilePath,
          span: null,
          codeSnippet: errorList[0],
          description: `Syntax parse error in ${errorRole} revision: ${errorList[0]}`,
        },
      ];

      const obsId = "OBS-001";
      const findings: Finding[] = [
        {
          id: "FND-001",
          title: `Syntax parse error in ${errorRole} revision`,
          category: "LINEAGE_LIMITATION",
          attentionLevel: "HIGH_ATTENTION",
          structuralChangeIds: [],
          correlationId: null,
          observed: [
            {
              id: obsId,
              category: "OBSERVED",
              statement: `Source file '${targetFilePath}' in ${errorRole} revision contains syntax error(s): ${errorList.join("; ")}`,
              evidenceIds: [evId],
            },
          ],
          inferred: [
            {
              id: "INF-001",
              category: "INFERRED",
              statement: `Invalid syntax prevents reliable AST construction; comparison cannot proceed.`,
              ruleId: "RULE_LINEAGE_LIMITATION",
              supportingObservationIds: [obsId],
            },
          ],
          unknown: [
            {
              id: "UNK-001",
              category: "UNKNOWN",
              statement: `Static analysis cannot parse malformed source code.`,
              reasonCategory: "LINEAGE_OR_PARSE_BOUNDARY",
            },
          ],
        },
      ];

      const errors: AnalysisErrorRecord[] = errorList.map((msg) => ({
        code: "SYNTAX_PARSE_ERROR",
        message: msg,
        recoverable: false,
      }));

      const report: AnalysisReport = {
        schemaVersion: "1.0.0",
        generatedAtIso: nowIso,
        status: "INCOMPLETE_PARSE_ERROR",
        request,
        repository,
        baseCommit,
        headCommit,
        baseFunction: null,
        headFunction: null,
        evidence,
        structuralChanges: [],
        testChanges: [],
        correlations: [],
        findings,
        limitations: [`Source file contains syntax parse errors in ${errorRole} revision.`],
        errors,
      };

      assertValidAnalysisReport(report);
      return report;
    }

    // ------------------------------------------------------------------------
    // Step 3: Function lookup and ambiguity verification
    // ------------------------------------------------------------------------
    const baseLookup = FunctionLocator.locate(baseFile, targetFunctionName);
    const headLookup = FunctionLocator.locate(headFile, targetFunctionName);

    // 3a. Ambiguity handling
    if (baseLookup.status === "AMBIGUOUS" || headLookup.status === "AMBIGUOUS") {
      const ambigRole = baseLookup.status === "AMBIGUOUS" ? "BASE" : "HEAD";
      const candidates = (
        baseLookup.status === "AMBIGUOUS" ? baseLookup.candidates : (headLookup as { candidates: readonly FunctionCandidate[] }).candidates
      );
      const commit = ambigRole === "BASE" ? baseCommit : headCommit;

      const evId = "EV-001";
      const evidence: EvidenceItem[] = [
        {
          id: evId,
          kind: ambigRole === "BASE" ? "SOURCE_BEFORE" : "SOURCE_AFTER",
          commitRole: ambigRole,
          commitSha: commit.sha,
          posixFilePath: targetFilePath,
          span: candidates[0].span,
          codeSnippet: `Candidate 1: ${candidates[0].qualifiedName} at L${candidates[0].span.startLine}`,
          description: `Multiple matching declarations for '${targetFunctionName}' in ${ambigRole}`,
        },
      ];

      const obsId = "OBS-001";
      const candLines = candidates.map((c) => `L${c.span.startLine} (${c.qualifiedName})`).join(", ");
      const findings: Finding[] = [
        {
          id: "FND-001",
          title: `Ambiguous function identifier in ${ambigRole} revision`,
          category: "LINEAGE_LIMITATION",
          attentionLevel: "HIGH_ATTENTION",
          structuralChangeIds: [],
          correlationId: null,
          observed: [
            {
              id: obsId,
              category: "OBSERVED",
              statement: `Identifier '${targetFunctionName}' matched ${candidates.length} candidate implementations in ${ambigRole} revision at ${candLines}.`,
              evidenceIds: [evId],
            },
          ],
          inferred: [
            {
              id: "INF-001",
              category: "INFERRED",
              statement: `Comparison was halted to prevent arbitrary selection between ambiguous symbols.`,
              ruleId: "RULE_LINEAGE_LIMITATION",
              supportingObservationIds: [obsId],
            },
          ],
          unknown: [
            {
              id: "UNK-001",
              category: "UNKNOWN",
              statement: `Static analysis cannot determine which candidate the user intended to compare without a qualified name (e.g. Class.method).`,
              reasonCategory: "LINEAGE_OR_PARSE_BOUNDARY",
            },
          ],
        },
      ];

      const report: AnalysisReport = {
        schemaVersion: "1.0.0",
        generatedAtIso: nowIso,
        status: "INCOMPLETE_AMBIGUOUS_TARGET",
        request,
        repository,
        baseCommit,
        headCommit,
        baseFunction: null,
        headFunction: null,
        evidence,
        structuralChanges: [],
        testChanges: [],
        correlations: [],
        findings,
        limitations: [
          `Target function '${targetFunctionName}' is ambiguous in ${ambigRole} revision; found ${candidates.length} candidates. Use a qualified name to disambiguate.`,
        ],
        errors: [],
      };

      assertValidAnalysisReport(report);
      return report;
    }

    // 3b. Missing function handling
    if (baseLookup.status === "NOT_FOUND" || headLookup.status === "NOT_FOUND") {
      const missingRole =
        baseLookup.status === "NOT_FOUND" && headLookup.status === "NOT_FOUND"
          ? "BOTH"
          : baseLookup.status === "NOT_FOUND"
          ? "BASE"
          : "HEAD";

      const evId = "EV-001";
      const evidence: EvidenceItem[] = [];

      if (missingRole === "HEAD" && baseLookup.status === "FOUND") {
        evidence.push({
          id: evId,
          kind: "SOURCE_BEFORE",
          commitRole: "BASE",
          commitSha: baseCommit.sha,
          posixFilePath: targetFilePath,
          span: baseLookup.candidate.span,
          codeSnippet: baseLookup.candidate.node.getText().slice(0, 120),
          description: `Function '${targetFunctionName}' was present at BASE lines ${baseLookup.candidate.span.startLine}-${baseLookup.candidate.span.endLine}`,
        });
      } else if (missingRole === "BASE" && headLookup.status === "FOUND") {
        evidence.push({
          id: evId,
          kind: "SOURCE_AFTER",
          commitRole: "HEAD",
          commitSha: headCommit.sha,
          posixFilePath: targetFilePath,
          span: headLookup.candidate.span,
          codeSnippet: headLookup.candidate.node.getText().slice(0, 120),
          description: `Function '${targetFunctionName}' was present at HEAD lines ${headLookup.candidate.span.startLine}-${headLookup.candidate.span.endLine}`,
        });
      } else {
        evidence.push({
          id: evId,
          kind: "GIT_METADATA",
          commitRole: "BASE",
          commitSha: baseCommit.sha,
          posixFilePath: targetFilePath,
          span: null,
          codeSnippet: null,
          description: `Function '${targetFunctionName}' not found in either revision`,
        });
      }

      const obsId = "OBS-001";
      const findings: Finding[] = [
        {
          id: "FND-001",
          title: `Function '${targetFunctionName}' missing in ${missingRole} revision`,
          category: "LINEAGE_LIMITATION",
          attentionLevel: "HIGH_ATTENTION",
          structuralChangeIds: [],
          correlationId: null,
          observed: [
            {
              id: obsId,
              category: "OBSERVED",
              statement:
                missingRole === "BOTH"
                  ? `Target function '${targetFunctionName}' could not be located in either revision of '${targetFilePath}'.`
                  : `Target function '${targetFunctionName}' was missing in ${missingRole} revision of '${targetFilePath}'.`,
              evidenceIds: [evId],
            },
          ],
          inferred: [
            {
              id: "INF-001",
              category: "INFERRED",
              statement: `Function may have been deleted, renamed, or extracted to another file across revisions.`,
              ruleId: "RULE_LINEAGE_LIMITATION",
              supportingObservationIds: [obsId],
            },
          ],
          unknown: [
            {
              id: "UNK-001",
              category: "UNKNOWN",
              statement: `Single-file static analysis cannot track function renames or moves without cross-file repository lineage tracking.`,
              reasonCategory: "LINEAGE_OR_PARSE_BOUNDARY",
            },
          ],
        },
      ];

      const limitations = [
        missingRole === "BOTH"
          ? `Target function '${targetFunctionName}' was not found in either BASE or HEAD revision.`
          : `Target function '${targetFunctionName}' was not found in ${missingRole} revision.`,
      ];

      const report: AnalysisReport = {
        schemaVersion: "1.0.0",
        generatedAtIso: nowIso,
        status: "INCOMPLETE_FUNCTION_MISSING",
        request,
        repository,
        baseCommit,
        headCommit,
        baseFunction:
          baseLookup.status === "FOUND"
            ? StructuralExtractor.extractSnapshot(
                baseLookup.candidate.node,
                baseLookup.candidate.qualifiedName,
                "BASE",
                baseCommit.sha,
                targetFilePath,
                baseLookup.candidate.kind
              )
            : null,
        headFunction:
          headLookup.status === "FOUND"
            ? StructuralExtractor.extractSnapshot(
                headLookup.candidate.node,
                headLookup.candidate.qualifiedName,
                "HEAD",
                headCommit.sha,
                targetFilePath,
                headLookup.candidate.kind
              )
            : null,
        evidence,
        structuralChanges: [],
        testChanges: [],
        correlations: [],
        findings,
        limitations,
        errors: [],
      };

      assertValidAnalysisReport(report);
      return report;
    }

    // ------------------------------------------------------------------------
    // Step 4: Extract function snapshots and compare structures
    // ------------------------------------------------------------------------
    const baseCandidate = baseLookup.candidate;
    const headCandidate = headLookup.candidate;

    const baseFunction = StructuralExtractor.extractSnapshot(
      baseCandidate.node,
      baseCandidate.qualifiedName,
      "BASE",
      baseCommit.sha,
      targetFilePath,
      baseCandidate.kind
    );

    const headFunction = StructuralExtractor.extractSnapshot(
      headCandidate.node,
      headCandidate.qualifiedName,
      "HEAD",
      headCommit.sha,
      targetFilePath,
      headCandidate.kind
    );

    const { structuralChanges, evidence, findings } = StructuralComparator.compare(
      baseFunction,
      headFunction
    );

    const hasChanges = structuralChanges.length > 0;
    const status: AnalysisStatus = hasChanges
      ? "COMPLETED_WITH_FINDINGS"
      : "COMPLETED_NO_STRUCTURAL_CHANGES";

    const limitations: string[] = [];
    if (!hasChanges && baseSnapshot.content !== headSnapshot.content) {
      limitations.push(
        `Target function has identical AST structure across both revisions; text differences (if any) are cosmetic or formatting only.`
      );
    }

    const report: AnalysisReport = {
      schemaVersion: "1.0.0",
      generatedAtIso: nowIso,
      status,
      request,
      repository,
      baseCommit,
      headCommit,
      baseFunction,
      headFunction,
      evidence: hasChanges ? evidence : [],
      structuralChanges,
      testChanges: [],
      correlations: [],
      findings: hasChanges ? findings : [],
      limitations,
      errors: [],
    };

    assertValidAnalysisReport(report);
    return report;
  }

  /**
   * High-level entrypoint: Retrieves historical source snapshots from Git and executes
   * complete AST structural comparison.
   *
   * Preserves structured GitError if Git operations fail (ensuring failures are never
   * misrepresented as an unchanged function).
   */
  async compareHistoricalFunction(
    request: AnalysisRequest,
    options: CompareHistoricalFunctionOptions = {}
  ): Promise<AnalysisReport> {
    // 1. Validate analysis request
    const validatedReq = validateAnalysisRequest(request);
    if (!validatedReq.success) {
      throw new Error(`Invalid AnalysisRequest: ${validatedReq.issues.map((i) => i.message).join("; ")}`);
    }

    // 2. Retrieve historical source through GitAdapter (preserves GitError)
    const targetSourceRevisions = await this.gitAdapter.retrieveHistoricalSource({
      repoPath: request.repoPath,
      targetFilePath: request.targetFilePath,
      baseRevisionInput: request.baseRevisionInput,
      headRevisionInput: request.headRevisionInput,
      runner: options.runner,
    });

    // 3. Delegate to pure in-memory snapshot comparison
    return this.compareSnapshots(
      request,
      targetSourceRevisions.repository,
      targetSourceRevisions.baseCommit,
      targetSourceRevisions.headCommit,
      targetSourceRevisions.baseSnapshot,
      targetSourceRevisions.headSnapshot
    );
  }
}

/**
 * Functional entrypoint for comparing a historical function across Git revisions.
 */
export async function compareHistoricalFunction(
  request: AnalysisRequest,
  options: CompareHistoricalFunctionOptions = {}
): Promise<AnalysisReport> {
  const comparator = new HistoricalFunctionComparator(options.runner);
  return comparator.compareHistoricalFunction(request, options);
}

