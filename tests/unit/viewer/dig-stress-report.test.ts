/**
 * Change Archaeologist - Dig stress report tests
 *
 * Proves the checked-in stress report is schema-valid, that its before and
 * after code agrees with every span, and that The Dig stays readable at scale.
 */

import fs from "node:fs";
import { describe, it, expect } from "vitest";
import { buildDigStressReport } from "../../../scripts/generate-dig-stress-report.js";
import { loadReportFromJsonString } from "../../../src/viewer/utils/report-loader.js";
import { extractFunctionSource } from "../../../src/viewer/utils/source-location.js";
import {
  buildDigModel,
  buildDigOverview,
  DIG_SECTION_SIZE,
  sectionIndexForFocus,
} from "../../../src/viewer/utils/dig-model.js";
import { layoutDig } from "../../../src/viewer/utils/dig-layout.js";
import type { AnalysisReport, SourceSpan } from "../../../src/viewer/types/index.js";

const REPORT_PATH = "examples/stress/settlement-engine-stress-report.json";
const raw = fs.readFileSync(REPORT_PATH, "utf8");
const result = loadReportFromJsonString(raw, "stress.json");
const report = result.report as AnalysisReport;
const sectionCount = Math.ceil(report.structuralChanges.length / DIG_SECTION_SIZE);
const sections = Array.from({ length: sectionCount }, (_, sectionIndex) => buildDigModel(report, { sectionIndex }));

const sourceLines = (fn: AnalysisReport["baseFunction"]) => extractFunctionSource(fn).source.split("\n");
const textAt = (lines: readonly string[], span: SourceSpan, first: number) =>
  lines.slice(span.startLine - first, span.endLine - first + 1).map((line) => line.trim()).join("\n");

describe("Dig stress report", () => {
  it("passes the application's own report validation", () => {
    expect(result.issues ?? []).toEqual([]);
    expect(result.success).toBe(true);
  });

  it("is exactly what the generator produces", () => {
    expect(JSON.parse(raw)).toEqual(JSON.parse(JSON.stringify(buildDigStressReport())));
  });

  it("carries complete before and after code", () => {
    expect(sourceLines(report.baseFunction).length).toBeGreaterThan(700);
    expect(sourceLines(report.headFunction).length).toBeGreaterThan(700);
    expect(extractFunctionSource(report.baseFunction).source).not.toBe(extractFunctionSource(report.headFunction).source);
  });

  it("has snippets that match the source at every span", () => {
    const base = sourceLines(report.baseFunction);
    const head = sourceLines(report.headFunction);
    for (const change of report.structuralChanges) {
      if (change.beforeSpan) expect(textAt(base, change.beforeSpan, report.baseFunction!.span.startLine)).toBe(change.beforeSnippet);
      if (change.afterSpan) expect(textAt(head, change.afterSpan, report.headFunction!.span.startLine)).toBe(change.afterSnippet);
    }
  });

  it("covers every change kind and correlation status", () => {
    expect(new Set(report.structuralChanges.map((c) => c.changeType))).toEqual(new Set(["ADDED", "REMOVED", "MODIFIED"]));
    expect(new Set(report.structuralChanges.map((c) => c.category)).size).toBe(4);
    expect(new Set(report.correlationItems!.map((i) => i.status))).toEqual(new Set(["STRONG", "WEAK", "UNCERTAIN", "NONE"]));
  });
});

describe("The Dig at scale", () => {
  it("draws every change and anchored link across its sections", () => {
    const anchored = report.correlationItems!.filter((item) => item.structuralChangeId);
    expect(sections.flatMap((s) => s.faults).length).toBe(report.structuralChanges.length);
    expect(sections.flatMap((s) => s.shafts).map((s) => s.id).sort()).toEqual(anchored.map((i) => i.id).sort());
  });

  it("gives every section a readable canvas with shafts inside it", () => {
    for (const section of sections) {
      const layout = layoutDig(section, 900);
      expect(layout.width).toBe(900);
      expect(layout.height).toBeLessThan(3500);
      expect(layout.shafts).toHaveLength(section.shafts.length);
      for (const shaft of layout.shafts) {
        expect(shaft.endX).toBeLessThanOrEqual(layout.width);
        expect(shaft.endX).toBeGreaterThanOrEqual(0);
        expect(shaft.endY).toBeLessThan(layout.unknownTop);
      }
    }
  });

  it("lands each stacked shaft on the card it names", () => {
    for (const section of sections) {
      const layout = layoutDig(section, 900);
      const cards = new Map(layout.files.flatMap((file) => file.cards.map((card) => [card.card.id, card])));
      for (const laid of layout.shafts.filter((s) => s.shaft.end === "ASSERTION")) {
        const card = cards.get(laid.shaft.testChangeId as string);
        expect(card).toBeDefined();
      }
    }
  });

  it("nests the stacked rails so they never cross", () => {
    for (const section of sections) {
      const rails = layoutDig(section, 900)
        .shafts.filter((s) => s.shaft.end !== "OPEN")
        .map((s) => ({ trunk: Number(/H([\d.]+)Q/.exec(s.path)?.[1]), entry: s.endY }))
        .sort((a, b) => a.trunk - b.trunk);
      for (let i = 1; i < rails.length; i++) expect(rails[i].entry).toBeLessThanOrEqual(rails[i - 1].entry);
    }
  });

  it("summarises the whole report and finds the section of a selection", () => {
    const ticks = buildDigOverview(report);
    expect(ticks).toHaveLength(96);
    expect(new Set(ticks.map((t) => t.tone))).toEqual(new Set(["STRONG", "WEAK", "UNCERTAIN", "NONE", "UNLINKED"]));
    expect(sectionIndexForFocus(report, { kind: "fault", id: "SC-096" })).toBe(sectionCount - 1);
  });

  it("leaves small reports unsectioned", () => {
    const small = { ...report, structuralChanges: report.structuralChanges.slice(0, DIG_SECTION_SIZE) };
    expect(buildDigModel(small).section).toBeNull();
  });
});
