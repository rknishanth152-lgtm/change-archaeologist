/**
 * Change Archaeologist - Design Token Availability & Architecture Tests
 *
 * Verifies that all tokens specified in DESIGN.md are properly defined
 * in src/viewer/styles/tokens.css, that no undefined references exist,
 * and that the three-tier token hierarchy is strictly preserved.
 */

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("Design Token System & Three-Tier Architecture", () => {
  const tokensPath = path.resolve("src/viewer/styles/tokens.css");
  const tokensCss = fs.readFileSync(tokensPath, "utf-8");

  it("tokens.css exists and is non-empty", () => {
    expect(tokensCss.length).toBeGreaterThan(100);
  });

  it("defines the light and dark surface and text ramps", () => {
    const requiredPrimitives = [
      "--primitive-mineral-50",
      "--primitive-mineral-200",
      "--primitive-mineral-500",
      "--primitive-basalt-950",
      "--primitive-basalt-850",
      "--primitive-basalt-700",
      "--primitive-ink-900",
      "--primitive-ink-600",
      "--primitive-frost-100",
      "--primitive-frost-400",
    ];

    for (const token of requiredPrimitives) {
      expect(tokensCss, `Missing primitive token: ${token}`).toContain(`${token}:`);
    }
  });

  it("defines the accent and status primitives for both themes", () => {
    const requiredAccents = [
      "--primitive-verdigris-700",
      "--primitive-verdigris-300",
      "--primitive-green-700",
      "--primitive-green-300",
      "--primitive-red-700",
      "--primitive-red-300",
      "--primitive-amber-700",
      "--primitive-amber-300",
      "--primitive-violet-700",
      "--primitive-violet-300",
    ];

    for (const token of requiredAccents) {
      expect(tokensCss, `Missing accent token: ${token}`).toContain(`${token}:`);
    }
  });

  it("defines Tier 2 semantic role-based tokens", () => {
    const requiredSemantics = [
      "--surface-ground",
      "--surface-panel",
      "--surface-elevated",
      "--surface-hover",
      "--surface-active",
      "--surface-code",
      "--border-hairline",
      "--border-subtle",
      "--border-interactive",
      "--border-focus",
      "--text-primary",
      "--text-secondary",
      "--text-muted",
      "--text-accent",
      "--action-primary-bg",
      "--status-added-fg",
      "--status-removed-fg",
      "--status-modified-fg",
      "--status-strong-fg",
      "--status-weak-fg",
      "--status-none-fg",
      "--status-none-bg",
      "--status-none-border",
      "--status-uncertain-fg",
      "--status-uncertain-bg",
      "--status-uncertain-border",
      "--status-unknown-fg",
    ];

    for (const token of requiredSemantics) {
      expect(tokensCss, `Missing semantic token: ${token}`).toContain(`${token}:`);
    }
  });

  it("contains no undefined CSS variable references in tokens.css", () => {
    // Find all var(--...) usages
    const varMatches = Array.from(tokensCss.matchAll(/var\((--[a-zA-Z0-9_-]+)\)/g)).map(
      (m) => m[1]
    );

    // Collect all defined --... tokens
    const definedTokens = new Set(
      Array.from(tokensCss.matchAll(/(--[a-zA-Z0-9_-]+):/g)).map((m) => m[1])
    );

    for (const usedVar of varMatches) {
      expect(
        definedTokens.has(usedVar),
        `Undefined CSS variable used in tokens.css: ${usedVar}`
      ).toBe(true);
    }
  });

  it("defines reduced-motion reset media query", () => {
    expect(tokensCss).toContain("@media (prefers-reduced-motion: reduce)");
    expect(tokensCss).toContain("animation-duration: 0.01ms");
  });
});

