/**
 * Change Archaeologist — Light and dark theme
 *
 * index.html sets data-theme before first paint. This module keeps it in sync
 * with an explicit choice, or with the system when no choice has been made.
 */

import { useSyncExternalStore } from "react";

export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "change-archaeologist-theme";

const listeners = new Set<() => void>();

export function getTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function hasStoredChoice(): boolean {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  // Without this every colour transition fires at once and the switch smears.
  root.classList.add("theme-switching");
  root.dataset.theme = theme;
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove("theme-switching")));
  listeners.forEach((listener) => listener());
}

export function setTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Private windows can refuse storage. The theme still applies for this visit.
  }
  applyTheme(theme);
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const media = window.matchMedia?.("(prefers-color-scheme: dark)");
  const onSystemChange = (event: MediaQueryListEvent) => {
    if (!hasStoredChoice()) applyTheme(event.matches ? "dark" : "light");
  };
  media?.addEventListener?.("change", onSystemChange);
  return () => {
    listeners.delete(listener);
    media?.removeEventListener?.("change", onSystemChange);
  };
}

export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, getTheme, () => "light");
}
