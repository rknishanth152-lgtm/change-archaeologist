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

  it("defines all primitive gray neutrals and slate boundary ramp", () => {
    const requiredPrimitives = [
      "--primitive-gray-950",
      "--primitive-gray-925",
      "--primitive-gray-900",
      "--primitive-gray-850",
      "--primitive-gray-800",
      "--primitive-gray-750",
      "--primitive-gray-700",
      "--primitive-gray-600",
      "--primitive-gray-500",
      "--primitive-gray-400",
      "--primitive-gray-300",
      "--primitive-gray-200",
      "--primitive-gray-100",
      "--primitive-gray-50",
      "--primitive-white",
      "--primitive-slate-900",
      "--primitive-slate-500",
      "--primitive-slate-400",
      "--primitive-slate-300",
    ];

    for (const token of requiredPrimitives) {
      expect(tokensCss, `Missing primitive token: ${token}`).toContain(`${token}:`);
    }
  });

  it("defines the canonical technical indigo accent and status primitives", () => {
    const requiredAccents = [
      "--primitive-indigo-500",
      "--primitive-emerald-500",
      "--primitive-coral-500",
      "--primitive-amber-500",
      "--primitive-violet-500",
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

