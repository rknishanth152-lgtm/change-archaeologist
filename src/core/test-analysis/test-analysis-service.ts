/**
 * Change Archaeologist - Test Analysis Service (Orchestrator)
 *
 * Orchestrates test-change analysis across Git history:
 * 1. Validates TestAnalysisRequest.
 * 2. Retrieves historical test source snapshots via GitAdapter from committed history.
 * 3. Inspects syntax diagnostics (codes 1000-1999) in memory to catch malformed test files.
 * 4. Extracts test declarations and recognized assertion expressions.
 * 5. Compares test structures and synthesizes traceably anchored domain findings.
 * 6. Validates the resulting report against runtime schemas.
 */

import { Project, type SourceFile } from "ts-morph";
import type {
  AnalysisErrorRecord,
  EvidenceItem,
  Finding,
  Observation,
  TestAnalysisReport,
  TestAnalysisRequest,
  TestAnalysisStatus,
  TestChange,
  TestDeclarationChange,
} from "../domain/types.js";
import {
  assertValidTestAnalysisReport,
  validateTestAnalysisRequest,
} from "../domain/schemas.js";
import { GitAdapter, type GitRunner } from "../git/index.js";
import { TestLocator, type TestDeclaration } from "./test-locator.js";
import { AssertionExtractor, type AssertionDescriptor } from "./assertion-extractor.js";
import { TestChangeComparator } from "./test-change-comparator.js";

export interface TestAnalysisServiceOptions {
  readonly runner?: GitRunner;
}

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

function checkImportsTargetFile(sourceFile: SourceFile, targetFilePath?: string): boolean {
  if (!targetFilePath) return false;
  const targetBaseName = targetFilePath.replace(/\.[^/.]+$/, "").split("/").pop();
  for (const importDecl of sourceFile.getImportDeclarations()) {
    const spec = importDecl.getModuleSpecifierValue();
    if (spec.includes(targetFilePath) || (targetBaseName && spec.endsWith(`/${targetBaseName}`))) {
      return true;
    }
  }
  return false;
}

function checkMentionsTargetFunction(
  sourceFile: SourceFile,
  targetFunctionName?: string
): boolean {
  if (!targetFunctionName) return false;
  const text = sourceFile.getText();
  const regex = new RegExp(`\\b${targetFunctionName}\\b`);
  return regex.test(text);
}

export class TestAnalysisService {
  readonly gitAdapter: GitAdapter;

  constructor(runner?: GitRunner) {
    this.gitAdapter = new GitAdapter(runner);
  }

  async analyzeTestChanges(
    request: TestAnalysisRequest,
    options: TestAnalysisServiceOptions = {}
  ): Promise<TestAnalysisReport> {
    const nowIso = new Date().toISOString();

    // 1. Validate request
    const validatedReq = validateTestAnalysisRequest(request);
    if (!validatedReq.success) {
      throw new Error(
        `Invalid TestAnalysisRequest: ${validatedReq.issues.map((i) => i.message).join("; ")}`
      );
    }

    const runner = options.runner ?? this.gitAdapter.runner;

    // 2. Fetch historical test files through GitAdapter
    // We fetch repository metadata and resolve commits using the first test file
    const firstTestFile = request.testFilePaths[0];
    const initialResult = await this.gitAdapter.retrieveHistoricalSource({
      repoPath: request.repoPath,
      targetFilePath: firstTestFile,
      baseRevisionInput: request.baseRevisionInput,
      headRevisionInput: request.headRevisionInput,
      runner,
    });

    const repository = initialResult.repository;
    const baseCommit = initialResult.baseCommit;
    const headCommit = initialResult.headCommit;

    // Retrieve historical snapshots for all requested test files
    const fileSnapshots = new Map<
      string,
      { baseContent: string | null; headContent: string | null }
    >();

    fileSnapshots.set(firstTestFile, {
      baseContent: initialResult.baseSnapshot ? initialResult.baseSnapshot.content : null,
      headContent: initialResult.headSnapshot ? initialResult.headSnapshot.content : null,
    });

    for (let i = 1; i < request.testFilePaths.length; i++) {
      const testPath = request.testFilePaths[i];
      const res = await this.gitAdapter.retrieveHistoricalSource({
        repoPath: request.repoPath,
        targetFilePath: testPath,
        baseRevisionInput: request.baseRevisionInput,
        headRevisionInput: request.headRevisionInput,
        runner,
      });
      fileSnapshots.set(testPath, {
        baseContent: res.baseSnapshot ? res.baseSnapshot.content : null,
        headContent: res.headSnapshot ? res.headSnapshot.content : null,
      });
    }

    // 3. Parse in-memory and inspect syntax
    const project = new Project({
      useInMemoryFileSystem: true,
      compilerOptions: {
        target: 99, // ESNext
        allowJs: true,
      },
    });

    // ID counters
    let tcCount = 1;
    let tdcCount = 1;
    let evCount = 1;
    let obsCount = 1;
    let infCount = 1;
    let unkCount = 1;
    let fndCount = 1;

    const idGenerator = {
      nextTcId: () => `TC-${String(tcCount++).padStart(3, "0")}`,
      nextTdcId: () => `TDC-${String(tdcCount++).padStart(3, "0")}`,
      nextEvId: () => `EV-${String(evCount++).padStart(3, "0")}`,
      nextObsId: () => `OBS-${String(obsCount++).padStart(3, "0")}`,
      nextInfId: () => `INF-${String(infCount++).padStart(3, "0")}`,
      nextUnkId: () => `UNK-${String(unkCount++).padStart(3, "0")}`,
      nextFndId: () => `FND-${String(fndCount++).padStart(3, "0")}`,
    };

    const allTestChanges: TestChange[] = [];
    const allDeclarationChanges: TestDeclarationChange[] = [];
    const allEvidence: EvidenceItem[] = [];
    const allFindings: Finding[] = [];
    const allLimitations: string[] = [];
    const allErrors: AnalysisErrorRecord[] = [];

    // Check for syntax errors across all files first
    for (const testPath of request.testFilePaths) {
      const { baseContent, headContent } = fileSnapshots.get(testPath)!;

      if (baseContent !== null) {
        const baseFile = project.createSourceFile(`base_${testPath.replace(/\//g, "_")}`, baseContent, {
          overwrite: true,
        });
        const errors = getSyntacticErrors(baseFile);
        if (errors.length > 0) {
          allErrors.push(
            ...errors.map((msg) => ({
              code: "SYNTAX_PARSE_ERROR",
              message: `Syntax error in BASE '${testPath}': ${msg}`,
              recoverable: false,
            }))
          );
        }
      }

      if (headContent !== null) {
        const headFile = project.createSourceFile(`head_${testPath.replace(/\//g, "_")}`, headContent, {
          overwrite: true,
        });
        const errors = getSyntacticErrors(headFile);
        if (errors.length > 0) {
          allErrors.push(
            ...errors.map((msg) => ({
              code: "SYNTAX_PARSE_ERROR",
              message: `Syntax error in HEAD '${testPath}': ${msg}`,
              recoverable: false,
            }))
          );
        }
      }
    }

    // If syntax errors detected, report INCOMPLETE_PARSE_ERROR
    if (allErrors.length > 0) {
      const evId = idGenerator.nextEvId();
      allEvidence.push({
        id: evId,
        kind: "GIT_METADATA",
        commitRole: "HEAD",
        commitSha: headCommit.sha,
        posixFilePath: request.testFilePaths[0],
        span: null,
        codeSnippet: allErrors[0].message,
        description: `Syntax parse error detected during test analysis`,
      });

      const obsId = idGenerator.nextObsId();
      const obs: Observation = {
        id: obsId,
        category: "OBSERVED",
        statement: `Test source file contains syntax errors: ${allErrors[0].message}`,
        evidenceIds: [evId],
      };

      allFindings.push({
        id: idGenerator.nextFndId(),
        title: `Syntax parse error in test source`,
        category: "LINEAGE_LIMITATION",
        attentionLevel: "HIGH_ATTENTION",
        structuralChangeIds: [],
        correlationId: null,
        observed: [obs],
        inferred: [
          {
            id: idGenerator.nextInfId(),
            category: "INFERRED",
            statement: `Syntax errors prevent reliable AST extraction; test comparison cannot proceed.`,
            ruleId: "RULE_LINEAGE_LIMITATION",
            supportingObservationIds: [obsId],
          },
        ],
        unknown: [
          {
            id: idGenerator.nextUnkId(),
            category: "UNKNOWN",
            statement: `Static analysis cannot parse malformed TypeScript/JavaScript test source.`,
            reasonCategory: "LINEAGE_OR_PARSE_BOUNDARY",
          },
        ],
      });

      const report: TestAnalysisReport = {
        schemaVersion: "1.0.0",
        generatedAtIso: nowIso,
        status: "INCOMPLETE_PARSE_ERROR",
        request,
        repository,
        baseCommit,
        headCommit,
        testChanges: [],
        declarationChanges: [],
        evidence: allEvidence,
        findings: allFindings,
        limitations: ["Test source file contains syntax parse errors; analysis halted."],
        errors: allErrors,
      };

      assertValidTestAnalysisReport(report);
      return report;
    }

    // 4. Analyze each test file
    for (const testPath of request.testFilePaths) {
      const { baseContent, headContent } = fileSnapshots.get(testPath)!;

      // Determine file change status
      let fileChangeStatus: "MODIFIED" | "ADDED" | "DELETED" | "UNMODIFIED_COMPANION";
      if (baseContent === null && headContent !== null) {
        fileChangeStatus = "ADDED";
      } else if (baseContent !== null && headContent === null) {
        fileChangeStatus = "DELETED";
      } else if (baseContent === null && headContent === null) {
        fileChangeStatus = "UNMODIFIED_COMPANION";
        allLimitations.push(`Test file '${testPath}' was absent in both revisions.`);
      } else if (baseContent === headContent) {
        fileChangeStatus = "UNMODIFIED_COMPANION";
      } else {
        fileChangeStatus = "MODIFIED";
      }

      // Check empty test file
      if (
        (baseContent !== null && baseContent.trim() === "") ||
        (headContent !== null && headContent.trim() === "")
      ) {
        allLimitations.push(`Test file '${testPath}' is empty in one or both revisions.`);
      }

      let baseDeclarations: readonly TestDeclaration[] = [];
      let headDeclarations: readonly TestDeclaration[] = [];
      let baseAssertions: readonly AssertionDescriptor[] = [];
      let headAssertions: readonly AssertionDescriptor[] = [];
      let importsTarget = false;
      let mentionsTarget = false;

      if (baseContent !== null) {
        const baseFile = project.createSourceFile(`base_${testPath.replace(/\//g, "_")}`, baseContent, {
          overwrite: true,
        });
        baseDeclarations = TestLocator.extractDeclarations(baseFile, request.targetFunctionName);
        const res = AssertionExtractor.extractAssertions(baseFile, baseDeclarations);
        baseAssertions = res.assertions;
      }

      if (headContent !== null) {
        const headFile = project.createSourceFile(`head_${testPath.replace(/\//g, "_")}`, headContent, {
          overwrite: true,
        });
        headDeclarations = TestLocator.extractDeclarations(headFile, request.targetFunctionName);
        const res = AssertionExtractor.extractAssertions(headFile, headDeclarations);
        headAssertions = res.assertions;
        importsTarget = checkImportsTargetFile(headFile, request.targetFilePath);
        mentionsTarget = checkMentionsTargetFunction(headFile, request.targetFunctionName);

        if (res.unsupportedAssertions.length > 0) {
          allLimitations.push(
            `Unsupported assertion patterns detected in '${testPath}' (e.g. ${res.unsupportedAssertions[0]}); only standard expect() and assert patterns are recognized.`
          );
        }
      } else if (baseContent !== null) {
        const baseFile = project.getSourceFile(`base_${testPath.replace(/\//g, "_")}`)!;
        importsTarget = checkImportsTargetFile(baseFile, request.targetFilePath);
        mentionsTarget = checkMentionsTargetFunction(baseFile, request.targetFunctionName);
      }

      // Run comparator
      const fileResult = TestChangeComparator.compareFile({
        posixTestFilePath: testPath,
        fileChangeStatus,
        baseDeclarations,
        headDeclarations,
        baseAssertions,
        headAssertions,
        baseCommitSha: baseCommit.sha,
        headCommitSha: headCommit.sha,
        importsTargetFile: importsTarget,
        mentionsTargetFunction: mentionsTarget,
        targetFunctionName: request.targetFunctionName,
        idGenerator,
      });

      allTestChanges.push(fileResult.testChange);
      allDeclarationChanges.push(...fileResult.declarationChanges);
      allEvidence.push(...fileResult.evidence);
      allFindings.push(...fileResult.findings);
      allLimitations.push(...fileResult.limitations);
    }

    // Determine status
    const hasAnyChanges =
      allTestChanges.some((tc) => tc.assertionChanges.length > 0 || tc.fileChangeStatus === "ADDED" || tc.fileChangeStatus === "DELETED") ||
      allDeclarationChanges.length > 0;

    const status: TestAnalysisStatus = hasAnyChanges
      ? "COMPLETED_WITH_CHANGES"
      : "COMPLETED_NO_CHANGES";

    if (!hasAnyChanges) {
      allLimitations.push(
        "No observable test changes were detected between the specified revisions for the supplied test paths."
      );
    }

    const report: TestAnalysisReport = {
      schemaVersion: "1.0.0",
      generatedAtIso: nowIso,
      status,
      request,
      repository,
      baseCommit,
      headCommit,
      testChanges: allTestChanges,
      declarationChanges: allDeclarationChanges,
      evidence: hasAnyChanges ? allEvidence : [],
      findings: hasAnyChanges ? allFindings : [],
      limitations: allLimitations,
      errors: [],
    };

    assertValidTestAnalysisReport(report);
    return report;
  }
}

/**
 * Functional entrypoint for analyzing test changes across Git revisions.
 */
export async function analyzeTestChanges(
  request: TestAnalysisRequest,
  options: TestAnalysisServiceOptions = {}
): Promise<TestAnalysisReport> {
  const service = new TestAnalysisService(options.runner);
  return service.analyzeTestChanges(request, options);
}

