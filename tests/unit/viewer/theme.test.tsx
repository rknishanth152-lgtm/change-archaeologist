// @vitest-environment jsdom
/**
 * Change Archaeologist - Theme Tests
 *
 * Verifies the theme applies to the document, persists an explicit choice,
 * and that the light and dark tokens define the same semantic roles.
 */

import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import fs from "node:fs";
import path from "node:path";
import React from "react";

import { Navbar } from "../../../src/viewer/components/Navbar.js";
import { getTheme, setTheme, THEME_STORAGE_KEY } from "../../../src/viewer/utils/theme.js";

describe("theme", () => {
  beforeEach(() => {
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      callback(0);
      return 0;
    });
    delete document.documentElement.dataset.theme;
    localStorage.removeItem(THEME_STORAGE_KEY);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("defaults to light when the document has no theme set", () => {
    expect(getTheme()).toBe("light");
  });

  it("applies and remembers an explicit choice", () => {
    setTheme("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
  });

  it("toggles from the header", () => {
    render(<Navbar report={null} onLoadClick={vi.fn()} onSelectScenario={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Switch to dark theme" }));
    expect(getTheme()).toBe("dark");

    fireEvent.click(screen.getByRole("button", { name: "Switch to light theme" }));
    expect(getTheme()).toBe("light");
  });
});

describe("theme tokens", () => {
  const css = fs.readFileSync(path.resolve("src/viewer/styles/tokens.css"), "utf-8");
  const darkStart = css.indexOf(':root[data-theme="dark"]');
  const declared = (block: string) => new Set(Array.from(block.matchAll(/^\s*(--[a-z0-9-]+):/gm), (m) => m[1]));

  it("overrides only tokens that the light theme also defines", () => {
    const light = declared(css.slice(0, darkStart));
    for (const token of declared(css.slice(darkStart))) {
      expect(light.has(token), `${token} has no light value`).toBe(true);
    }
  });

  it("gives every text and surface role a dark value", () => {
    const dark = declared(css.slice(darkStart));
    for (const token of [
      "--surface-ground",
      "--surface-panel",
      "--surface-code",
      "--text-primary",
      "--text-secondary",
      "--text-muted",
      "--text-accent",
      "--status-strong-fg",
      "--status-weak-fg",
      "--status-uncertain-fg",
    ]) {
      expect(dark.has(token), `${token} has no dark value`).toBe(true);
    }
  });

  it("loads no fonts from a remote host", () => {
    const html = fs.readFileSync(path.resolve("index.html"), "utf-8");
    expect(html).not.toMatch(/fonts\.(googleapis|gstatic)\.com/);
  });
});
