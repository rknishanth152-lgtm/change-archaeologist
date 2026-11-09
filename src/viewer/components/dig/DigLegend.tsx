/**
 * Change Archaeologist — The Dig legend
 *
 * Doubles as a filter: selecting a status isolates those shafts.
 */

import React from "react";
import type { CorrelationStatus } from "../../types/index.js";
import { SHAFT_STYLE } from "./DigCanvas.js";

const ENTRIES: readonly { readonly status: CorrelationStatus; readonly gloss: string }[] = [
  { status: "STRONG", gloss: "direct call" },
  { status: "WEAK", gloss: "same file only" },
  { status: "UNCERTAIN", gloss: "unclear" },
  { status: "NONE", gloss: "none found" },
];

export interface DigLegendProps {
  readonly active: CorrelationStatus | null;
  readonly counts: Readonly<Record<CorrelationStatus, number>>;
  readonly onToggle: (status: CorrelationStatus) => void;
}

export const DigLegend: React.FC<DigLegendProps> = ({ active, counts, onToggle }) => (
  <div role="group" aria-label="Link strength. Select one to show only those links." className="flex flex-wrap gap-x-2 gap-y-1 -ml-2">
    {ENTRIES.map(({ status, gloss }) => {
      const style = SHAFT_STYLE[status];
      const isActive = active === status;
      return (
        <button
          key={status}
          type="button"
          aria-pressed={isActive}
          aria-label={`${status}: ${gloss}, ${counts[status]} ${counts[status] === 1 ? "link" : "links"}`}
          disabled={counts[status] === 0}
          onClick={() => onToggle(status)}
          className={`min-h-8 px-2 py-1 inline-flex items-center gap-2 rounded-sm border text-sm text-text-secondary transition-colors duration-fast focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-default enabled:cursor-pointer enabled:hover:bg-surface-hover ${
            isActive ? "border-border-focus bg-surface-elevated" : "border-transparent bg-transparent"
          }`}
        >
          <svg width={36} height={10} aria-hidden="true" className="shrink-0">
            <line x1={0} x2={36} y1={5} y2={5} strokeWidth={6} strokeDasharray={style.dash || undefined} strokeLinecap={style.cap} style={{ stroke: style.color }} />
            {style.hollow && <line x1={0} x2={36} y1={5} y2={5} strokeWidth={2.5} style={{ stroke: "var(--surface-ground)" }} />}
          </svg>
          <span className="font-semibold text-text-primary">{status}</span>
          <span>{gloss}</span>
          <span className="tabular-nums">({counts[status]})</span>
        </button>
      );
    })}
  </div>
);
