/**
 * Change Archaeologist — Source Location & Coordinate Utilities
 *
 * Pure utilities for validating, formatting, and translating report source spans
 * into Monaco editor ranges without inventing coordinates or line numbers.
 */

import type { SourceSpan, FunctionSnapshot } from "../types/index.js";

export interface EditorRange {
  readonly startLineNumber: number;
  readonly startColumn: number;
  readonly endLineNumber: number;
  readonly endColumn: number;
}

export interface FunctionSourceResult {
  readonly source: string;
  readonly isAvailable: boolean;
  readonly isDeleted: boolean;
  readonly span: SourceSpan | null;
}

/**
 * Validates a SourceSpan and translates it into a 1-based Monaco EditorRange.
 * Returns null if the span is null, undefined, malformed, or out of bounds.
 */
export function translateSpanToEditorRange(
  span: Partial<SourceSpan> | null | undefined,
  maxLine?: number
): EditorRange | null {
  if (!span) return null;

  const { startLine, startColumn, endLine, endColumn } = span;

  if (typeof startLine !== "number" || typeof endLine !== "number") {
    return null;
  }

  // Lines must be 1-based positive integers
  if (startLine < 1 || endLine < startLine) {
    return null;
  }

  // Bounds check if maxLine provided
  if (maxLine !== undefined && maxLine > 0 && startLine > maxLine) {
    return null;
  }

  const validStartCol = typeof startColumn === "number" && startColumn >= 1 ? startColumn : 1;
  const validEndCol =
    typeof endColumn === "number" && endColumn >= 1
      ? endColumn
      : (maxLine !== undefined ? 1000 : validStartCol + 1);

  const boundedEndLine = maxLine !== undefined && maxLine > 0 ? Math.min(endLine, maxLine) : endLine;

  return {
    startLineNumber: startLine,
    startColumn: validStartCol,
    endLineNumber: boundedEndLine,
    endColumn: validEndCol,
  };
}

/**
 * Computes the relative editor range when Monaco displays only a function snippet
 * whose absolute start line in the original file is `functionStartLine`.
 */
export function translateSpanRelativeToFunction(
  targetSpan: Partial<SourceSpan> | null | undefined,
  functionSpan: Partial<SourceSpan> | null | undefined,
  displayedLineCount?: number
): EditorRange | null {
  if (!targetSpan || !functionSpan) return null;
  if (typeof targetSpan.startLine !== "number" || typeof functionSpan.startLine !== "number") return null;

  const targetEndLine = typeof targetSpan.endLine === "number" ? targetSpan.endLine : targetSpan.startLine;
  const offset = functionSpan.startLine - 1;
  const relativeStart = targetSpan.startLine - offset;
  const relativeEnd = targetEndLine - offset;

  if (relativeStart < 1) return null;
  if (displayedLineCount !== undefined && relativeStart > displayedLineCount) {
    return null;
  }

  const relativeSpan: Partial<SourceSpan> = {
    startLine: relativeStart,
    startColumn: targetSpan.startColumn,
    endLine: Math.max(relativeStart, relativeEnd),
    endColumn: targetSpan.endColumn,
  };

  return translateSpanToEditorRange(relativeSpan, displayedLineCount);
}

/**
 * Formats canonical coordinate notation: e.g. "L12:C5-L16:C2" or "L12-L16"
 */
export function formatSpanCoordinates(span: Partial<SourceSpan> | null | undefined): string {
  if (!span || typeof span.startLine !== "number") return "N/A";

  const endLine = typeof span.endLine === "number" ? span.endLine : span.startLine;

  const hasColumns =
    typeof span.startColumn === "number" &&
    span.startColumn >= 1 &&
    typeof span.endColumn === "number" &&
    span.endColumn >= 1;

  if (hasColumns) {
    return `L${span.startLine}:C${span.startColumn}-L${endLine}:C${span.endColumn}`;
  }

  if (span.startLine === endLine) {
    return `L${span.startLine}`;
  }

  return `L${span.startLine}-L${endLine}`;
}

/**
 * Detects Monaco language mode from repository target file path.
 */
export function detectSourceLanguage(filePath: string | null | undefined): "typescript" | "javascript" | "plaintext" {
  if (!filePath) return "plaintext";

  const lower = filePath.toLowerCase();
  if (lower.endsWith(".ts") || lower.endsWith(".tsx") || lower.endsWith(".mts") || lower.endsWith(".cts")) {
    return "typescript";
  }

  if (lower.endsWith(".js") || lower.endsWith(".jsx") || lower.endsWith(".mjs") || lower.endsWith(".cjs")) {
    return "javascript";
  }

  return "plaintext";
}

/**
 * Extracts and reconstructs the complete function source from a FunctionSnapshot.
 * Preserves source text and accurately flags deleted or missing source.
 */
export function extractFunctionSource(fn: Partial<FunctionSnapshot> | null | undefined): FunctionSourceResult {
  if (fn === null) {
    return {
      source: "",
      isAvailable: false,
      isDeleted: true,
      span: null,
    };
  }

  if (!fn) {
    return {
      source: "",
      isAvailable: false,
      isDeleted: false,
      span: null,
    };
  }

  const signature = (fn.signatureText ?? "").trim();
  const rawBody = fn.rawBodyText ?? "";

  // If both signature and rawBody are empty, source is genuinely unavailable
  if (!signature && !rawBody) {
    return {
      source: "",
      isAvailable: false,
      isDeleted: false,
      span: fn.span ?? null,
    };
  }

  let fullSource = "";
  if (signature && rawBody) {
    // If signature already contains the opening brace or rawBody starts with brace
    if (signature.endsWith("{")) {
      fullSource = `${signature}\n${rawBody.replace(/^\{\s*\n?/, "")}`;
    } else {
      fullSource = `${signature} ${rawBody}`;
    }
  } else {
    fullSource = signature || rawBody;
  }

  return {
    source: fullSource,
    isAvailable: true,
    isDeleted: false,
    span: fn.span ?? null,
  };
}
