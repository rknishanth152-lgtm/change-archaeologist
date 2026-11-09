/**
 * Change Archaeologist — The Dig overview strip
 *
 * Large reports are read a section at a time. Each section is one button, and
 * each tick inside it is one change, so the shape of the whole report stays visible.
 */

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { DigOverviewTick } from "../../types/dig.js";

const TICK_COLOR: Record<DigOverviewTick["tone"], string> = {
  STRONG: "var(--dig-shaft-strong)",
  WEAK: "var(--dig-shaft-weak)",
  UNCERTAIN: "var(--dig-shaft-uncertain)",
  NONE: "var(--dig-shaft-none)",
  UNLINKED: "var(--border-interactive)",
};

export interface DigOverviewProps {
  readonly ticks: readonly DigOverviewTick[];
  readonly pageSize: number;
  readonly page: number;
  readonly onPageChange: (page: number) => void;
}

const navClass =
  "h-8 w-8 inline-flex items-center justify-center rounded-sm text-text-secondary transition-colors duration-fast enabled:hover:bg-surface-hover enabled:hover:text-text-primary disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus";

export const DigOverview: React.FC<DigOverviewProps> = ({ ticks, pageSize, page, onPageChange }) => {
  const pageCount = Math.ceil(ticks.length / pageSize);
  const first = page * pageSize + 1;
  const last = Math.min(ticks.length, (page + 1) * pageSize);

  return (
    <div className="px-4 py-2 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-hairline">
      <div className="flex items-center gap-1 shrink-0">
        <button type="button" aria-label="Previous changes" disabled={page === 0} onClick={() => onPageChange(page - 1)} className={navClass}>
          <ChevronLeft size={16} strokeWidth={1.5} />
        </button>
        <button type="button" aria-label="Next changes" disabled={page === pageCount - 1} onClick={() => onPageChange(page + 1)} className={navClass}>
          <ChevronRight size={16} strokeWidth={1.5} />
        </button>
        <p className="ml-1 text-sm text-text-primary whitespace-nowrap tabular-nums">
          Changes {first}–{last} <span className="text-text-secondary">of {ticks.length}</span>
        </p>
      </div>

      <div role="group" aria-label="Sections of this report" className="flex-1 basis-64 min-w-0 flex items-stretch gap-1">
        {Array.from({ length: pageCount }, (_, index) => {
          const section = ticks.slice(index * pageSize, (index + 1) * pageSize);
          const isCurrent = index === page;
          return (
            <button
              key={index}
              type="button"
              aria-pressed={isCurrent}
              aria-label={`Show changes ${index * pageSize + 1} to ${index * pageSize + section.length}`}
              onClick={() => onPageChange(index)}
              className={`flex-1 min-w-0 h-8 px-0.5 flex items-center justify-center gap-px rounded-sm border transition-colors duration-fast focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus ${
                isCurrent ? "border-border-focus bg-surface-elevated" : "border-transparent hover:bg-surface-hover"
              }`}
            >
              {section.map((tick) => (
                <span
                  key={tick.faultId}
                  className="flex-1 max-w-1 h-4 rounded-[1px]"
                  style={{ background: TICK_COLOR[tick.tone] }}
                />
              ))}
            </button>
          );
        })}
      </div>
    </div>
  );
};
