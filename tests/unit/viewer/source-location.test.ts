/**
 * Change Archaeologist — Source Coordinate & Location Unit Tests
 *
 * Verifies that source span translation, coordinate formatting, language detection,
 * and function source extraction operate conservatively without fabricating coordinates.
 */

import { describe, it, expect } from "vitest";
import {
  translateSpanToEditorRange,
  translateSpanRelativeToFunction,
  formatSpanCoordinates,
  detectSourceLanguage,
  extractFunctionSource,
} from "../../../src/viewer/utils/source-location.js";
import type { SourceSpan, FunctionSnapshot } from "../../../src/viewer/types/index.js";

describe("Source Coordinate & Location Utilities", () => {
  describe("translateSpanToEditorRange", () => {
    it("returns null when span is null or undefined", () => {
      expect(translateSpanToEditorRange(null)).toBeNull();
      expect(translateSpanToEditorRange(undefined)).toBeNull();
    });

    it("returns null when startLine or endLine are not valid numbers", () => {
      expect(translateSpanToEditorRange({ startLine: "1" as any, endLine: 5 })).toBeNull();
      expect(translateSpanToEditorRange({ startLine: 1, endLine: "5" as any })).toBeNull();
    });

    it("rejects 0-based or negative startLine", () => {
      expect(translateSpanToEditorRange({ startLine: 0, endLine: 5 })).toBeNull();
      expect(translateSpanToEditorRange({ startLine: -2, endLine: 5 })).toBeNull();
    });

    it("rejects inverted spans where endLine is less than startLine", () => {
      expect(translateSpanToEditorRange({ startLine: 10, endLine: 5 })).toBeNull();
    });

    it("returns null if startLine exceeds maxLine bounds", () => {
      expect(translateSpanToEditorRange({ startLine: 50, endLine: 60 }, 40)).toBeNull();
    });

    it("clamps endLine to maxLine bounds when specified", () => {
      const range = translateSpanToEditorRange({ startLine: 10, endLine: 50 }, 30);
      expect(range).toEqual({
        startLineNumber: 10,
        startColumn: 1,
        endLineNumber: 30,
        endColumn: 1000,
      });
    });

    it("translates valid span with columns into exact Monaco 1-based EditorRange", () => {
      const span: SourceSpan = {
        startLine: 14,
        startColumn: 3,
        endLine: 18,
        endColumn: 25,
      };
      const range = translateSpanToEditorRange(span);
      expect(range).toEqual({
        startLineNumber: 14,
        startColumn: 3,
        endLineNumber: 18,
        endColumn: 25,
      });
    });

    it("defaults missing startColumn to 1", () => {
      const span: Partial<SourceSpan> = {
        startLine: 5,
        endLine: 7,
      };
      const range = translateSpanToEditorRange(span);
      expect(range).toEqual({
        startLineNumber: 5,
        startColumn: 1,
        endLineNumber: 7,
        endColumn: 2,
      });
    });
  });

  describe("translateSpanRelativeToFunction", () => {
    it("returns null if either targetSpan or functionSpan is missing", () => {
      expect(translateSpanRelativeToFunction(null, { startLine: 10, endLine: 30 })).toBeNull();
      expect(translateSpanRelativeToFunction({ startLine: 12, endLine: 14 }, null)).toBeNull();
    });

    it("translates file-absolute coordinates into function-relative editor lines", () => {
      // Function begins at file line 20
      const functionSpan: Partial<SourceSpan> = { startLine: 20, endLine: 50 };
      // Change occurred at file lines 25-28
      const targetSpan: Partial<SourceSpan> = {
        startLine: 25,
        startColumn: 5,
        endLine: 28,
        endColumn: 12,
      };

      const range = translateSpanRelativeToFunction(targetSpan, functionSpan);
      expect(range).toEqual({
        startLineNumber: 6, // 25 - (20 - 1) = 6
        startColumn: 5,
        endLineNumber: 9,   // 28 - 19 = 9
        endColumn: 12,
      });
    });

    it("returns null if targetSpan begins before function start line", () => {
      const functionSpan: Partial<SourceSpan> = { startLine: 20, endLine: 50 };
      const targetSpan: Partial<SourceSpan> = { startLine: 15, endLine: 18 };

      expect(translateSpanRelativeToFunction(targetSpan, functionSpan)).toBeNull();
    });

    it("returns null if relative line exceeds displayedLineCount", () => {
      const functionSpan: Partial<SourceSpan> = { startLine: 20, endLine: 50 };
      const targetSpan: Partial<SourceSpan> = { startLine: 40, endLine: 45 };

      // Displayed line count is only 15 lines
      expect(translateSpanRelativeToFunction(targetSpan, functionSpan, 15)).toBeNull();
    });
  });

  describe("formatSpanCoordinates", () => {
    it("returns 'N/A' for null or undefined spans", () => {
      expect(formatSpanCoordinates(null)).toBe("N/A");
      expect(formatSpanCoordinates(undefined)).toBe("N/A");
    });

    it("formats line-and-column coordinates accurately", () => {
      const span: SourceSpan = {
        startLine: 12,
        startColumn: 5,
        endLine: 16,
        endColumn: 2,
      };
      expect(formatSpanCoordinates(span)).toBe("L12:C5-L16:C2");
    });

    it("formats multi-line span without columns as L{start}-L{end}", () => {
      const span: Partial<SourceSpan> = {
        startLine: 40,
        endLine: 48,
      };
      expect(formatSpanCoordinates(span)).toBe("L40-L48");
    });

    it("formats single-line span without columns as L{line}", () => {
      const span: Partial<SourceSpan> = {
        startLine: 55,
        endLine: 55,
      };
      expect(formatSpanCoordinates(span)).toBe("L55");
    });
  });

  describe("detectSourceLanguage", () => {
    it("detects TypeScript file extensions", () => {
      expect(detectSourceLanguage("src/services/payment.ts")).toBe("typescript");
      expect(detectSourceLanguage("components/Header.tsx")).toBe("typescript");
      expect(detectSourceLanguage("utils/math.mts")).toBe("typescript");
      expect(detectSourceLanguage("config/build.cts")).toBe("typescript");
    });

    it("detects JavaScript file extensions", () => {
      expect(detectSourceLanguage("lib/runner.js")).toBe("javascript");
      expect(detectSourceLanguage("views/App.jsx")).toBe("javascript");
      expect(detectSourceLanguage("index.mjs")).toBe("javascript");
      expect(detectSourceLanguage("legacy.cjs")).toBe("javascript");
    });

    it("falls back to plaintext for null, undefined, or other extensions", () => {
      expect(detectSourceLanguage(null)).toBe("plaintext");
      expect(detectSourceLanguage(undefined)).toBe("plaintext");
      expect(detectSourceLanguage("")).toBe("plaintext");
      expect(detectSourceLanguage("report.json")).toBe("plaintext");
      expect(detectSourceLanguage("README.md")).toBe("plaintext");
      expect(detectSourceLanguage("script.py")).toBe("plaintext");
    });
  });

  describe("extractFunctionSource", () => {
    it("identifies deleted function (null snapshot) with isDeleted: true (Scenario F)", () => {
      const result = extractFunctionSource(null);
      expect(result.isDeleted).toBe(true);
      expect(result.isAvailable).toBe(false);
      expect(result.source).toBe("");
      expect(result.span).toBeNull();
    });

    it("identifies undefined snapshot with isDeleted: false and isAvailable: false", () => {
      const result = extractFunctionSource(undefined);
      expect(result.isDeleted).toBe(false);
      expect(result.isAvailable).toBe(false);
      expect(result.source).toBe("");
      expect(result.span).toBeNull();
    });

    it("identifies empty signature and empty rawBody as unavailable", () => {
      const emptyFn: Partial<FunctionSnapshot> = {
        qualifiedName: "testFn",
        signatureText: "",
        rawBodyText: "",
        span: { startLine: 1, startColumn: 1, endLine: 5, endColumn: 1 },
      };
      const result = extractFunctionSource(emptyFn);
      expect(result.isAvailable).toBe(false);
      expect(result.isDeleted).toBe(false);
      expect(result.span).toEqual({ startLine: 1, startColumn: 1, endLine: 5, endColumn: 1 });
    });

    it("reconstructs function source when signature ends with opening brace", () => {
      const fn: Partial<FunctionSnapshot> = {
        qualifiedName: "calculateTotal",
        signatureText: "function calculateTotal(items: Item[]): number {",
        rawBodyText: "{\n  return items.reduce((acc, i) => acc + i.price, 0);\n}",
        span: { startLine: 10, startColumn: 1, endLine: 12, endColumn: 30 },
      };
      const result = extractFunctionSource(fn);
      expect(result.isAvailable).toBe(true);
      expect(result.isDeleted).toBe(false);
      expect(result.source).toContain("function calculateTotal(items: Item[]): number {");
      expect(result.source).toContain("return items.reduce");
      expect(result.span).toEqual({ startLine: 10, startColumn: 1, endLine: 12, endColumn: 30 });
    });

    it("reconstructs function source when signature does not end with brace", () => {
      const fn: Partial<FunctionSnapshot> = {
        qualifiedName: "logError",
        signatureText: "function logError(msg: string)",
        rawBodyText: "{\n  console.error(msg);\n}",
      };
      const result = extractFunctionSource(fn);
      expect(result.isAvailable).toBe(true);
      expect(result.source).toBe("function logError(msg: string) {\n  console.error(msg);\n}");
    });

    it("returns signature if rawBody is absent", () => {
      const fn: Partial<FunctionSnapshot> = {
        qualifiedName: "abstractFn",
        signatureText: "abstract function compute(): void;",
      };
      const result = extractFunctionSource(fn);
      expect(result.isAvailable).toBe(true);
      expect(result.source).toBe("abstract function compute(): void;");
    });
  });
});
