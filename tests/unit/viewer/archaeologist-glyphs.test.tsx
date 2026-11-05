// @vitest-environment jsdom
/**
 * Change Archaeologist — Archaeological Glyphs Unit Tests
 *
 * Verifies all 14 domain glyphs:
 * - Render valid SVG elements
 * - Default to 16x16 with viewBox="0 0 16 16"
 * - Support custom sizing and className
 * - Provide accessible labeling (aria-hidden when decorative, role="img" + <title> when titled)
 * - Retain distinct geometric structures
 */

import React from "react";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

import {
  GlyphMark,
  GlyphGuardClause,
  GlyphConditional,
  GlyphThrowStmt,
  GlyphReturnStmt,
  GlyphDeltaAdded,
  GlyphDeltaModified,
  GlyphDeltaRemoved,
  GlyphCorrStrong,
  GlyphCorrWeak,
  GlyphCorrUncertain,
  GlyphCorrNone,
  GlyphEvidencePin,
  GlyphEpistemicTier,
} from "../../../src/viewer/components/icons/ArchaeologistGlyphs.js";

const ALL_GLYPHS = [
  { name: "GlyphMark", Component: GlyphMark },
  { name: "GlyphGuardClause", Component: GlyphGuardClause },
  { name: "GlyphConditional", Component: GlyphConditional },
  { name: "GlyphThrowStmt", Component: GlyphThrowStmt },
  { name: "GlyphReturnStmt", Component: GlyphReturnStmt },
  { name: "GlyphDeltaAdded", Component: GlyphDeltaAdded },
  { name: "GlyphDeltaModified", Component: GlyphDeltaModified },
  { name: "GlyphDeltaRemoved", Component: GlyphDeltaRemoved },
  { name: "GlyphCorrStrong", Component: GlyphCorrStrong },
  { name: "GlyphCorrWeak", Component: GlyphCorrWeak },
  { name: "GlyphCorrUncertain", Component: GlyphCorrUncertain },
  { name: "GlyphCorrNone", Component: GlyphCorrNone },
  { name: "GlyphEvidencePin", Component: GlyphEvidencePin },
  { name: "GlyphEpistemicTier", Component: GlyphEpistemicTier },
];

describe("ArchaeologistGlyphs Component Suite", () => {
  beforeEach(() => {
    cleanup();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders all 14 domain glyphs with default 16x16 size and viewBox", () => {
    ALL_GLYPHS.forEach(({ name, Component }) => {
      const { container } = render(<Component data-testid={`glyph-${name}`} />);
      const svg = container.querySelector("svg");

      expect(svg, `Expected ${name} to render an SVG element`).not.toBeNull();
      expect(svg).toHaveAttribute("viewBox", "0 0 16 16");
      expect(svg).toHaveAttribute("width", "16");
      expect(svg).toHaveAttribute("height", "16");
      expect(svg).toHaveAttribute("aria-hidden", "true");
      expect(svg).toHaveAttribute("fill", "none");
      expect(svg).toHaveAttribute("stroke", "currentColor");
      cleanup();
    });
  });

  it("applies custom sizing and className", () => {
    const { container } = render(
      <GlyphMark size={24} className="text-terracotta custom-class" data-testid="sized-glyph" />
    );
    const svg = container.querySelector("svg");

    expect(svg).toHaveAttribute("width", "24");
    expect(svg).toHaveAttribute("height", "24");
    expect(svg).toHaveClass("text-terracotta", "custom-class");
  });

  it("provides accessible role and title when title prop is specified", () => {
    render(<GlyphEvidencePin title="Source line 42 anchor" />);
    const img = screen.getByRole("img", { name: "Source line 42 anchor" });

    expect(img).toBeInTheDocument();
    expect(img).not.toHaveAttribute("aria-hidden");
    expect(img.querySelector("title")).toHaveTextContent("Source line 42 anchor");
  });

  it("distinguishes correlation statuses geometrically", () => {
    const { container: cStrong } = render(<GlyphCorrStrong data-testid="strong" />);
    const { container: cNone } = render(<GlyphCorrNone data-testid="none" />);
    const { container: cWeak } = render(<GlyphCorrWeak data-testid="weak" />);
    const { container: cUncertain } = render(<GlyphCorrUncertain data-testid="uncertain" />);

    const htmlStrong = cStrong.innerHTML;
    const htmlNone = cNone.innerHTML;
    const htmlWeak = cWeak.innerHTML;
    const htmlUncertain = cUncertain.innerHTML;

    // Strong has double bridge paths (h5), None has severance slash (l2-7), Weak has dashed segments
    expect(htmlStrong).not.toEqual(htmlNone);
    expect(htmlStrong).not.toEqual(htmlWeak);
    expect(htmlWeak).not.toEqual(htmlUncertain);
    expect(htmlNone).toContain("l2-7"); // severance slash
  });

  it("distinguishes delta mutation statuses geometrically", () => {
    const { container: cAdded } = render(<GlyphDeltaAdded />);
    const { container: cModified } = render(<GlyphDeltaModified />);
    const { container: cRemoved } = render(<GlyphDeltaRemoved />);

    const htmlAdded = cAdded.innerHTML;
    const htmlMod = cModified.innerHTML;
    const htmlRem = cRemoved.innerHTML;

    expect(htmlAdded).toContain("M8 4.5v7"); // vertical plus bar
    expect(htmlMod).toContain("M8 2.5L13.5 13H2.5z"); // delta triangle
    expect(htmlRem).toContain("stroke-width=\"2\""); // bold minus strike
  });
});

