/**
 * Change Archaeologist — Analysis limits
 *
 * Errors and limits stay on screen. An incomplete analysis opens by default.
 */

import React, { useEffect, useState } from "react";
import { AlertTriangle, AlertOctagon, ChevronDown, ChevronUp } from "lucide-react";
import type { AnalysisReport } from "../types/index.js";
import { INCOMPLETE_REASON } from "../utils/labels.js";
import { Disclosure, DisclosureTrigger, DisclosureContent } from "./ui/Disclosure.js";

interface LimitationsBannerProps {
  readonly report: AnalysisReport;
}

export const LimitationsBanner: React.FC<LimitationsBannerProps> = ({ report }) => {
  const isIncomplete = report.status.startsWith("INCOMPLETE");
  const hasErrors = report.errors.length > 0;
  const hasLimitations = report.limitations.length > 0;
  const [isExpanded, setIsExpanded] = useState(isIncomplete || hasErrors);

  useEffect(() => {
    setIsExpanded(isIncomplete || hasErrors);
  }, [isIncomplete, hasErrors]);

  if (!isIncomplete && !hasErrors && !hasLimitations) {
    return (
      <footer className="min-h-7 px-4 py-1 border-t border-hairline bg-panel flex items-center text-xs text-text-secondary shrink-0">
        No analysis errors or limits were recorded. This analysis read the code without running it.
      </footer>
    );
  }

  const heading = isIncomplete
    ? INCOMPLETE_REASON[report.status] ?? "This analysis is incomplete."
    : "This analysis has limits";
  const total = report.limitations.length + report.errors.length;

  return (
    <footer className="border-t border-hairline bg-panel shrink-0">
      <Disclosure id="limitations-tray-content" open={isExpanded} onOpenChange={setIsExpanded}>
        <DisclosureTrigger>
          <button
            type="button"
            className="w-full min-h-8 px-4 py-1 flex items-center justify-between gap-3 text-sm text-left hover:bg-surface-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            aria-expanded={isExpanded}
            aria-controls="limitations-tray-content"
          >
            <span className="flex items-center gap-2 min-w-0">
              {hasErrors || isIncomplete ? (
                <AlertOctagon size={14} strokeWidth={1.5} className="text-status-removed shrink-0" aria-hidden="true" />
              ) : (
                <AlertTriangle size={14} strokeWidth={1.5} className="text-status-modified shrink-0" aria-hidden="true" />
              )}
              <span className="font-semibold text-text-primary">{heading}</span>
              <span className="text-xs text-text-secondary tabular-nums">{total}</span>
            </span>
            <span className="flex items-center gap-1 text-xs text-text-secondary shrink-0">
              {isExpanded ? "Hide" : "Show"}
              {isExpanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            </span>
          </button>
        </DisclosureTrigger>

        <DisclosureContent>
          <div className="px-4 py-3 border-t border-hairline max-h-48 overflow-y-auto overscroll-contain space-y-2 text-sm text-text-secondary">
            {report.errors.map((error, index) => (
              <p key={index} className="m-0 text-status-removed">
                {error.message} <span className="font-mono text-xs">{error.code}</span>
              </p>
            ))}
            {report.limitations.map((limitation, index) => (
              <p key={index} className="m-0">{limitation}</p>
            ))}
          </div>
        </DisclosureContent>
      </Disclosure>
    </footer>
  );
};
