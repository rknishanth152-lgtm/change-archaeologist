/**
 * Change Archaeologist - Report Security Unit Tests
 *
 * Validates safe Markdown and JSON serialization of untrusted repository-derived content:
 * 1. Commit subjects containing Markdown headers, links, and pipe characters.
 * 2. Function names containing HTML tags and angle brackets (<script>, <T>).
 * 3. Source snippets containing triple backticks (```) and quad backticks (````).
 * 4. Source snippets containing HTML tags and scripts.
 * 5. File paths containing Markdown-special characters and brackets.
 * 6. Test names containing Markdown links, tables, and markup.
 * 7. Verification that generated Markdown structure cannot be broken or injected.
 * 8. Verification that JSON output remains strictly valid and schema-compliant.
 */

import { describe, it, expect } from "vitest";
import {
  serializeReportToMarkdown,
  safeEscapeTableCell,
  safeEscapeText,
  formatInlineCode,
  formatCodeBlock,
} from "../../../src/core/reporting/markdown-report-serializer.js";
import { serializeReportToJson } from "../../../src/core/reporting/json-report-serializer.js";
import { assertValidAnalysisReport, validateAnalysisReport } from "../../../src/core/domain/schemas.js";
import type { AnalysisReport } from "../../../src/core/domain/types.js";

function createMaliciousReport(): AnalysisReport {
  return {
    schemaVersion: "1.0.0",
    generatedAtIso: "2026-11-04T12:00:00.000Z",
    status: "COMPLETED_WITH_FINDINGS",
    request: {
      repoPath: "/safe/repo",
      targetFilePath: "src/weird [path] (1) #file & more.ts",
      targetFunctionName: "do<Something>Bad",
      baseRevisionInput: "HEAD~1",
      headRevisionInput: "HEAD",
    },
    repository: {
      rootPath: "/safe/repo",
      gitVersion: "git version 2.45.0",
      isCleanWorkingTreeAtStart: true,
    },
    baseCommit: {
      sha: "1111111111111111111111111111111111111111",
      shortSha: "11111111",
      authorName: "Attacker <evil@attacker.local>",
      committedAtIso: "2026-11-04T10:00:00.000Z",
      subject: "# Injected Top Heading\n## Subheading\n[evil link](javascript:alert(1)) | pipe | injection |",
      role: "BASE",
    },
    headCommit: {
      sha: "2222222222222222222222222222222222222222",
      shortSha: "22222222",
      authorName: "Attacker 2",
      committedAtIso: "2026-11-04T11:00:00.000Z",
      subject: "Normal commit subject",
      role: "HEAD",
    },
    baseFunction: {
      role: "BASE",
      commitSha: "1111111111111111111111111111111111111111",
      posixFilePath: "src/weird [path] (1) #file & more.ts",
      qualifiedName: "do<Something>Bad",
      functionName: "do<Something>Bad",
      kind: "FUNCTION_DECLARATION",
      span: { startLine: 1, startColumn: 1, endLine: 10, endColumn: 2 },
      signatureText: "function do<Something>Bad(): void",
      rawBodyText: "{\n  // empty\n}",
      normalizedBodyHash: "hash-base",
      guards: [],
      returns: [],
      throws: [],
      conditionals: [],
    },
    headFunction: {
      role: "HEAD",
      commitSha: "2222222222222222222222222222222222222222",
      posixFilePath: "src/weird [path] (1) #file & more.ts",
      qualifiedName: "do<Something>Bad",
      functionName: "do<Something>Bad",
      kind: "FUNCTION_DECLARATION",
      span: { startLine: 1, startColumn: 1, endLine: 15, endColumn: 2 },
      signatureText: "function do<Something>Bad(): void",
      rawBodyText: "{\n  // modified\n}",
      normalizedBodyHash: "hash-head",
      guards: [],
      returns: [],
      throws: [],
      conditionals: [],
    },
    evidence: [
      {
        id: "EV-001",
        kind: "SOURCE_AFTER",
        commitRole: "HEAD",
        commitSha: "2222222222222222222222222222222222222222",
        posixFilePath: "src/weird [path] (1) #file & more.ts",
        span: { startLine: 5, startColumn: 3, endLine: 7, endColumn: 4 },
        codeSnippet: "```ts\n// Dangerous snippet with triple backticks and <iframe>\n<iframe src=\"evil\"></iframe>\n````\nconst x = `template`;\n````",
        description: "Evidence containing <raw> HTML and backticks",
      },
    ],
    structuralChanges: [
      {
        id: "SC-001",
        ruleId: "RULE_GUARD_ADDED",
        category: "GUARD_CLAUSE",
        changeType: "ADDED",
        summary: "Added guard clause <script>alert('xss')</script> | pipe test",
        beforeSpan: null,
        afterSpan: { startLine: 5, startColumn: 3, endLine: 7, endColumn: 4 },
        beforeSnippet: null,
        afterSnippet: "if (!token) return <null>;",
      },
    ],
    testChanges: [
      {
        id: "TC-001",
        posixTestFilePath: "tests/weird | test [link](http://evil.com).ts",
        fileChangeStatus: "MODIFIED",
        importsTargetFile: true,
        mentionsTargetFunction: true,
        assertionChanges: [
          {
            changeType: "ASSERTION_ADDED",
            enclosingTestBlock: "test <script> | pipe",
            callsTargetFunctionInBlock: true,
            beforeAssertionText: null,
            afterAssertionText: "expect(doSomething()).toBe(<bad>);",
            beforeSpan: null,
            afterSpan: { startLine: 10, startColumn: 5, endLine: 10, endColumn: 40 },
          },
        ],
      },
    ],
    declarationChanges: [
      {
        id: "TDC-001",
        posixTestFilePath: "tests/weird | test [link](http://evil.com).ts",
        changeType: "ADDED",
        fullTitle: "Suite | Test <bad> [link](http://evil.com)",
        beforeDescription: null,
        afterDescription: "Test <bad> [link](http://evil.com)",
        beforeSpan: null,
        afterSpan: { startLine: 9, startColumn: 3, endLine: 12, endColumn: 4 },
      },
    ],
    correlations: [
      {
        id: "CORR-001",
        structuralChangeId: "SC-001",
        status: "STRONG",
        relatedTestChangeIds: ["TC-001"],
        untouchedCompanionTestFiles: [],
        rationale: "Added assertion in test with | pipe and <script> tags",
      },
    ],
    correlationItems: [
      {
        id: "ITEM-001",
        correlationId: "CORR-001",
        structuralChangeId: "SC-001",
        testChangeId: "TC-001",
        posixTestFilePath: "tests/weird | test [link](http://evil.com).ts",
        classification: "POTENTIALLY_RELATED_ASSERTION_ADDED",
        status: "STRONG",
        rationale: "Rationale with | pipe and <tags>",
        observedFact: "Observed fact with <b>bold</b> and | pipes |",
        inferredRelationship: "Inferred relationship with <script>",
        unknowns: ["Unknown 1 with | pipe", "Unknown 2 with <tag>"],
        evidenceIds: ["EV-001"],
      },
    ],
    findings: [
      {
        id: "FND-001",
        category: "GUARD_CLAUSE",
        title: "Added Guard Clause <script>alert('title')</script>",
        attentionLevel: "INFORMATIONAL",
        structuralChangeIds: ["SC-001"],
        correlationId: null,
        observed: [
          {
            id: "OBS-001",
            category: "OBSERVED",
            statement: "Observed statement with | pipe | and <tag>",
            evidenceIds: ["EV-001"],
          },
        ],
        inferred: [
          {
            id: "INF-001",
            category: "INFERRED",
            statement: "Inferred statement with [markdown link](http://evil.com)",
            ruleId: "RULE_GUARD_ADDED",
            supportingObservationIds: ["OBS-001"],
          },
        ],
        unknown: [
          {
            id: "UNK-001",
            category: "UNKNOWN",
            statement: "Unknown statement with <b>html</b>",
            reasonCategory: "RUNTIME_TEST_EXECUTION_UNVERIFIED",
          },
        ],
      },
    ],
    limitations: [
      "Limitation with | pipe | and <script>alert('lim')</script>",
    ],
    errors: [],
  };
}

describe("Report Security & Serialization Hardening", () => {
  it("safeEscapeTableCell replaces unescaped pipes and angle brackets", () => {
    const raw = "foo | bar <script>alert(1)</script> \r\n newline";
    const escaped = safeEscapeTableCell(raw);

    expect(escaped).not.toContain("<script>");
    expect(escaped).toContain("&lt;script&gt;");
    expect(escaped).toContain("\\|");
    expect(escaped).toContain("<br>");
  });

  it("safeEscapeText escapes leading hash characters and angle brackets", () => {
    const raw = "# Injected H1\n## Injected H2\n<div>html</div>";
    const escaped = safeEscapeText(raw);

    expect(escaped).toContain("\\# Injected H1");
    expect(escaped).toContain("\\## Injected H2");
    expect(escaped).toContain("&lt;div&gt;html&lt;/div&gt;");
  });

  it("formatInlineCode wraps code containing backticks in expanding fences", () => {
    const withBackticks = "foo `bar` baz";
    const formatted = formatInlineCode(withBackticks);

    expect(formatted.startsWith("`` ")).toBe(true);
    expect(formatted.endsWith(" ``")).toBe(true);
  });

  it("formatCodeBlock expands fence delimiters to enclose snippets with backticks", () => {
    const snippetWithQuadBackticks = "const s = ````nested````;";
    const formatted = formatCodeBlock(snippetWithQuadBackticks, "ts");

    // Must use at least 5 backticks so quad backticks don't break the fence
    expect(formatted.startsWith("`````ts\n")).toBe(true);
    expect(formatted.endsWith("\n`````")).toBe(true);
  });

  it("safely serializes malicious repository content to Markdown without breaking structure", () => {
    const report = createMaliciousReport();
    const markdown = serializeReportToMarkdown(report);

    // 1. Check required headers are intact
    expect(markdown).toContain("# Investigation Summary");
    expect(markdown).toContain("## Repository and Revision Information");
    expect(markdown).toContain("## Production Structural Changes");
    expect(markdown).toContain("## Change-to-Test Correlation");
    expect(markdown).toContain("## Observed Evidence");
    expect(markdown).toContain("## Inferred Implications");
    expect(markdown).toContain("## Unknowns and Limitations");

    // 2. Check that raw script tags were escaped
    expect(markdown).not.toContain("<script>alert('title')</script>");
    expect(markdown).toContain("&lt;script&gt;alert('title')&lt;/script&gt;");
    expect(markdown).not.toContain("<script>alert('xss')</script>");
    expect(markdown).toContain("&lt;script&gt;alert('xss')&lt;/script&gt;");

    // 3. Check that injected heading was escaped
    expect(markdown).not.toContain("\n# Injected Top Heading\n");
    expect(markdown).toContain("\\# Injected Top Heading");

    // 4. Check that table cells escaped pipes
    expect(markdown).toContain("\\| pipe and");

    // 5. Check code block with 4 backticks was safely fenced with 5 backticks
    expect(markdown).toContain("`````ts\n");
  });

  it("safely serializes malicious repository content to strictly valid JSON", () => {
    const report = createMaliciousReport();
    const json = serializeReportToJson(report);

    // Must be strictly parseable JSON
    expect(() => JSON.parse(json)).not.toThrow();

    const parsed = JSON.parse(json);
    expect(parsed.baseCommit.subject).toContain("# Injected Top Heading");
    expect(parsed.request.targetFunctionName).toBe("do<Something>Bad");

    // Must validate against domain schema
    const validation = validateAnalysisReport(parsed);
    expect(validation.success).toBe(true);
  });
});
