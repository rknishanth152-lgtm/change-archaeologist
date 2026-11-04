/**
 * Change Archaeologist - Markdown Report Serializer
 *
 * Deterministically serializes a validated InvestigationReport into a readable,
 * safely escaped Markdown document that strictly preserves the project's
 * epistemic model (OBSERVED -> INFERRED -> UNKNOWN).
 */

import type {
  AnalysisReport,
  Finding,
  EvidenceItem,
  StructuralChange,
  TestChange,
  CorrelationResult,
  CorrelationItem,
  TestDeclarationChange,
  AnalysisErrorRecord,
} from "../domain/types.js";
import { assertValidAnalysisReport } from "../domain/schemas.js";

// ============================================================================
// SAFE MARKDOWN FORMATTING HELPERS
// ============================================================================

/**
 * Escapes text for safe inclusion within Markdown table cells.
 * Replaces pipes, angle brackets, and converts newlines to `<br>`.
 */
export function safeEscapeTableCell(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\|/g, "\\|")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\r?\n/g, "<br>");
}

/**
 * Escapes inline text to prevent accidental HTML tag parsing or heading injection.
 */
export function safeEscapeText(text: string): string {
  return text
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .split(/\r?\n/)
    .map((line) => (line.trimStart().startsWith("#") ? `\\${line}` : line))
    .join("\n");
}

/**
 * Safely formats inline code spans, supporting text containing backticks.
 */
export function formatInlineCode(text: string): string {
  if (!text.includes("`")) {
    return `\`${text}\``;
  }
  const matches = text.match(/`+/g);
  const max = matches ? Math.max(...matches.map((m) => m.length)) : 1;
  const fence = "`".repeat(max + 1);
  return `${fence} ${text} ${fence}`;
}

/**
 * Safely wraps code snippets in fenced code blocks, dynamically sizing
 * the backtick delimiter if the snippet itself contains backticks.
 */
export function formatCodeBlock(snippet: string, language = "ts"): string {
  const matches = snippet.match(/`+/g);
  const maxBackticks = matches ? Math.max(...matches.map((m) => m.length)) : 0;
  const fence = "`".repeat(Math.max(3, maxBackticks + 1));
  return `${fence}${language}\n${snippet}\n${fence}`;
}

// ============================================================================
// MARKDOWN SERIALIZER
// ============================================================================

/**
 * Serializes an AnalysisReport (InvestigationReport) into a structured Markdown document.
 *
 * Follows the 10-section structure:
 * 1. Investigation Summary
 * 2. Repository and Revision Information
 * 3. Production Structural Changes
 * 4. Test Changes
 * 5. Change-to-Test Correlation
 * 6. Observed Evidence
 * 7. Inferred Implications
 * 8. Unknowns and Limitations
 * 9. Errors and Incomplete Analysis
 * 10. Analysis Scope and Method Limitations
 */
export function serializeReportToMarkdown(report: AnalysisReport): string {
  // 1. Validate report before serialization
  assertValidAnalysisReport(report);

  const sections: string[] = [];

  // --------------------------------------------------------------------------
  // SECTION 1: Investigation Summary
  // --------------------------------------------------------------------------
  const targetFunc = report.request.targetFunctionName ?? "N/A";
  const targetFile = report.request.targetFilePath ?? "N/A";

  const attentionLevels = (report.findings ?? []).map((f) => f.attentionLevel);
  const highestAttention = attentionLevels.includes("HIGH_ATTENTION")
    ? "HIGH_ATTENTION"
    : attentionLevels.includes("MODERATE_ATTENTION")
      ? "MODERATE_ATTENTION"
      : "INFORMATIONAL";

  const isIncomplete = report.status.startsWith("INCOMPLETE_");

  let summarySec = `# Investigation Summary\n\n`;
  if (isIncomplete) {
    summarySec += `> [!WARNING]\n> **Incomplete Analysis:** The investigation halted with status \`${report.status}\`.\n\n`;
  }
  summarySec += `- **Target Function**: ${formatInlineCode(targetFunc)} in ${formatInlineCode(targetFile)}\n`;
  summarySec += `- **Analysis Status**: \`${report.status}\`\n`;
  summarySec += `- **Overall Attention Level**: \`${highestAttention}\`\n`;
  summarySec += `- **Findings Count**: ${report.findings.length}\n`;
  summarySec += `- **Structural Changes Observed**: ${report.structuralChanges.length}\n`;
  summarySec += `- **Test Changes Observed**: ${report.testChanges.length}\n`;
  summarySec += `- **Correlations Computed**: ${report.correlations.length}\n`;
  sections.push(summarySec);

  // --------------------------------------------------------------------------
  // SECTION 2: Repository and Revision Information
  // --------------------------------------------------------------------------
  let repoSec = `## Repository and Revision Information\n\n`;
  repoSec += `- **Repository Root**: ${formatInlineCode(report.repository.rootPath)}\n`;
  repoSec += `- **Git Version**: ${formatInlineCode(report.repository.gitVersion)}\n`;
  repoSec += `- **Base Commit**: ${formatInlineCode(report.baseCommit.sha.slice(0, 8))} (${report.baseCommit.sha})\n`;
  repoSec += `  - *Author*: ${safeEscapeText(report.baseCommit.authorName)}\n`;
  repoSec += `  - *Committed*: \`${report.baseCommit.committedAtIso}\`\n`;
  repoSec += `  - *Subject*: ${safeEscapeText(report.baseCommit.subject)}\n`;
  repoSec += `- **Head Commit**: ${formatInlineCode(report.headCommit.sha.slice(0, 8))} (${report.headCommit.sha})\n`;
  repoSec += `  - *Author*: ${safeEscapeText(report.headCommit.authorName)}\n`;
  repoSec += `  - *Committed*: \`${report.headCommit.committedAtIso}\`\n`;
  repoSec += `  - *Subject*: ${safeEscapeText(report.headCommit.subject)}\n`;
  sections.push(repoSec);

  // --------------------------------------------------------------------------
  // SECTION 3: Production Structural Changes
  // --------------------------------------------------------------------------
  let structSec = `## Production Structural Changes\n\n`;
  if (report.structuralChanges.length === 0) {
    structSec += `*No production structural changes observed between base and head revisions.*\n`;
  } else {
    for (const sc of report.structuralChanges) {
      structSec += `### [${sc.id}] ${sc.category} (${sc.changeType})\n\n`;
      structSec += `- **Rule**: \`${sc.ruleId}\`\n`;
      structSec += `- **Summary**: ${safeEscapeText(sc.summary)}\n`;
      if (sc.beforeSpan) {
        structSec += `- **Base Revision Span**: Lines ${sc.beforeSpan.startLine}–${sc.beforeSpan.endLine}\n`;
      }
      if (sc.afterSpan) {
        structSec += `- **Head Revision Span**: Lines ${sc.afterSpan.startLine}–${sc.afterSpan.endLine}\n`;
      }

      if (sc.beforeSnippet) {
        structSec += `\n**Base Snippet:**\n\n${formatCodeBlock(sc.beforeSnippet)}\n`;
      }
      if (sc.afterSnippet) {
        structSec += `\n**Head Snippet:**\n\n${formatCodeBlock(sc.afterSnippet)}\n`;
      }
      structSec += `\n`;
    }
  }
  sections.push(structSec);

  // --------------------------------------------------------------------------
  // SECTION 4: Test Changes
  // --------------------------------------------------------------------------
  let testSec = `## Test Changes\n\n`;
  if (report.testChanges.length === 0) {
    testSec += `*No test changes observed across companion test files.*\n`;
  } else {
    testSec += `| Test File Path | File Status | Imports Target | Mentions Target | Assertion Changes |\n`;
    testSec += `| :--- | :--- | :--- | :--- | :--- |\n`;
    for (const tc of report.testChanges) {
      const assertionsCount = tc.assertionChanges?.length ?? 0;
      testSec += `| ${formatInlineCode(safeEscapeTableCell(tc.posixTestFilePath))} | \`${tc.fileChangeStatus}\` | ${tc.importsTargetFile ? "Yes" : "No"} | ${tc.mentionsTargetFunction ? "Yes" : "No"} | ${assertionsCount} |\n`;
    }
    testSec += `\n`;

    // Declaration changes if present
    const decChanges = report.declarationChanges ?? [];
    if (decChanges.length > 0) {
      testSec += `### Test Declaration Changes\n\n`;
      for (const tdc of decChanges) {
        testSec += `- **[${tdc.id}]** \`${tdc.changeType}\`: ${formatInlineCode(safeEscapeTableCell(tdc.fullTitle))} in ${formatInlineCode(tdc.posixTestFilePath)}\n`;
      }
      testSec += `\n`;
    }
  }
  sections.push(testSec);

  // --------------------------------------------------------------------------
  // SECTION 5: Change-to-Test Correlation
  // --------------------------------------------------------------------------
  let corrSec = `## Change-to-Test Correlation\n\n`;
  if (report.correlations.length === 0) {
    corrSec += `*No change-to-test correlations observed or computed.*\n`;
  } else {
    corrSec += `| Correlation ID | Status | Structural Change | Related Test Changes | Rationale |\n`;
    corrSec += `| :--- | :--- | :--- | :--- | :--- |\n`;
    for (const c of report.correlations) {
      const related = c.relatedTestChangeIds.length > 0 ? c.relatedTestChangeIds.join(", ") : "None";
      corrSec += `| \`${c.id}\` | \`${c.status}\` | ${c.structuralChangeId ? `\`${c.structuralChangeId}\`` : "N/A"} | ${related} | ${safeEscapeTableCell(c.rationale)} |\n`;
    }
    corrSec += `\n`;

    const items = report.correlationItems ?? [];
    if (items.length > 0) {
      corrSec += `### Correlation Details\n\n`;
      for (const item of items) {
        corrSec += `#### [${item.id}] ${item.classification} (Status: \`${item.status}\`)\n\n`;
        corrSec += `- **Observed Fact**: ${safeEscapeText(item.observedFact)}\n`;
        corrSec += `- **Inferred Relationship**: ${safeEscapeText(item.inferredRelationship)}\n`;
        if (item.unknowns.length > 0) {
          corrSec += `- **Unknowns**:\n`;
          for (const u of item.unknowns) {
            corrSec += `  - ${safeEscapeText(u)}\n`;
          }
        }
        corrSec += `\n`;
      }
    }
  }
  sections.push(corrSec);

  // --------------------------------------------------------------------------
  // SECTION 6: Observed Evidence
  // --------------------------------------------------------------------------
  let evSec = `## Observed Evidence\n\n`;
  if (report.evidence.length === 0) {
    evSec += `*No source or test evidence records available.*\n`;
  } else {
    evSec += `All conclusions are anchored in verified source snapshots and metadata:\n\n`;
    evSec += `| Evidence ID | Kind | Role | File Path | Span | Description |\n`;
    evSec += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`;
    for (const ev of report.evidence) {
      const spanStr = ev.span ? `L${ev.span.startLine}–L${ev.span.endLine}` : "N/A";
      evSec += `| \`${ev.id}\` | \`${ev.kind}\` | \`${ev.commitRole}\` | ${formatInlineCode(safeEscapeTableCell(ev.posixFilePath))} | ${spanStr} | ${safeEscapeTableCell(ev.description)} |\n`;
    }
    evSec += `\n`;

    // Code snippets for evidence items having codeSnippet
    const snippetEvs = report.evidence.filter((e) => e.codeSnippet !== null && e.codeSnippet !== undefined);
    if (snippetEvs.length > 0) {
      evSec += `### Evidence Code Snippets\n\n`;
      for (const ev of snippetEvs) {
        evSec += `#### Evidence ${ev.id} (${ev.kind} - ${ev.commitRole})\n\n`;
        evSec += `File: ${formatInlineCode(ev.posixFilePath)}\n\n`;
        evSec += `${formatCodeBlock(ev.codeSnippet!)}\n\n`;
      }
    }
  }
  sections.push(evSec);

  // --------------------------------------------------------------------------
  // SECTION 7: Inferred Implications
  // --------------------------------------------------------------------------
  let infSec = `## Inferred Implications\n\n`;
  infSec += `The following statements represent rule-based hypotheses supported by directly observed facts. They do NOT constitute runtime execution proofs.\n\n`;

  let totalInferences = 0;
  for (const f of report.findings) {
    if (f.inferred && f.inferred.length > 0) {
      infSec += `### Finding [${f.id}] ${safeEscapeText(f.title)}\n\n`;
      for (const inf of f.inferred) {
        totalInferences++;
        infSec += `- **[INFERRED] ${inf.id}** (Rule: \`${inf.ruleId}\`): ${safeEscapeText(inf.statement)}\n`;
        infSec += `  - *Supported by Observations*: ${inf.supportingObservationIds.map((id) => `\`${id}\``).join(", ")}\n`;
      }
      infSec += `\n`;
    }
  }

  if (totalInferences === 0) {
    infSec += `*No inferred implications generated.*\n`;
  }
  sections.push(infSec);

  // --------------------------------------------------------------------------
  // SECTION 8: Unknowns and Limitations
  // --------------------------------------------------------------------------
  let unkSec = `## Unknowns and Limitations\n\n`;
  unkSec += `The following explicit boundaries acknowledge conditions that static analysis cannot establish:\n\n`;

  let totalUnknowns = 0;
  for (const f of report.findings) {
    if (f.unknown && f.unknown.length > 0) {
      unkSec += `### Finding [${f.id}] Boundaries\n\n`;
      for (const unk of f.unknown) {
        totalUnknowns++;
        unkSec += `- **[UNKNOWN] ${unk.id}** (\`${unk.reasonCategory}\`): ${safeEscapeText(unk.statement)}\n`;
      }
      unkSec += `\n`;
    }
  }

  if (totalUnknowns === 0) {
    unkSec += `*No finding-specific unknown boundaries recorded.*\n`;
  }
  sections.push(unkSec);

  // --------------------------------------------------------------------------
  // SECTION 9: Errors and Incomplete Analysis
  // --------------------------------------------------------------------------
  let errSec = `## Errors and Incomplete Analysis\n\n`;
  if (isIncomplete) {
    errSec += `> **Incomplete Analysis Alert**: Status is \`${report.status}\`.\n\n`;
  }

  if (report.errors.length === 0) {
    errSec += `*No analysis errors recorded.*\n`;
  } else {
    errSec += `| Error Code | Message | Recoverable |\n`;
    errSec += `| :--- | :--- | :--- |\n`;
    for (const err of report.errors) {
      errSec += `| \`${err.code}\` | ${safeEscapeTableCell(err.message)} | ${err.recoverable ? "Yes" : "No"} |\n`;
    }
    errSec += `\n`;
  }
  sections.push(errSec);

  // --------------------------------------------------------------------------
  // SECTION 10: Analysis Scope and Method Limitations
  // --------------------------------------------------------------------------
  let scopeSec = `## Analysis Scope and Method Limitations\n\n`;
  scopeSec += `### Project Limitations\n\n`;
  if (report.limitations.length === 0) {
    scopeSec += `*No additional analysis limitations recorded.*\n\n`;
  } else {
    for (const lim of report.limitations) {
      scopeSec += `- ${safeEscapeText(lim)}\n`;
    }
    scopeSec += `\n`;
  }

  scopeSec += `### Epistemic and Methodological Boundaries\n\n`;
  scopeSec += `1. **Static AST Analysis**: Analysis operates strictly on syntax trees extracted from committed files; no code is compiled or executed.\n`;
  scopeSec += `2. **Conservative Test Correlation**: Correlations between production code changes and test assertions are conservative heuristics (import matching, call name matching, assertion changes) and do not measure or imply runtime test coverage or test pass/fail status.\n`;
  scopeSec += `3. **Absence of Proof**: The absence of observed changes or correlations does not prove the absence of behavioral impact or external dependencies.\n`;
  sections.push(scopeSec);

  return sections.join("\n").trim() + "\n";
}
