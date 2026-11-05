/**
 * LimitationsBanner Component
 *
 * Displays epistemic boundaries, unsupported syntax warnings, and unhandled errors.
 *
 * Integrated UI Components retrieved from:
 * - https://motion-primitives.com/c/disclosure.json (smooth animated height transitions)
 * - https://ui.shadcn.com/r/styles/default/badge.json (status badges)
 */

import React, { useState, useEffect } from "react";
import { AlertTriangle, AlertOctagon, ChevronDown, ChevronUp } from "lucide-react";
import type { AnalysisReport } from "../types/index.js";
import {
  Disclosure,
  DisclosureTrigger,
  DisclosureContent,
} from "./ui/Disclosure.js";
import { Badge } from "./ui/Badge.js";

interface LimitationsBannerProps {
  readonly report: AnalysisReport;
}

export const LimitationsBanner: React.FC<LimitationsBannerProps> = ({ report }) => {
  const isIncomplete = report.status.startsWith("INCOMPLETE");
  const hasErrors = report.errors.length > 0;
  const hasLimitations = report.limitations.length > 0;

  const [isExpanded, setIsExpanded] = useState<boolean>(isIncomplete || hasErrors);

  useEffect(() => {
    setIsExpanded(isIncomplete || hasErrors);
  }, [isIncomplete, hasErrors]);

  if (!isIncomplete && !hasErrors && !hasLimitations) {
    return (
      <footer className="h-7 border-t border-hairline bg-panel px-4 flex items-center justify-between text-[11px] font-mono text-text-muted">
        <span>Analysis verified complete: 0 unhandled errors, 0 boundary limitations.</span>
        <Badge variant="outline">Epistemic Model v1.0.0</Badge>
      </footer>
    );
  }

  return (
    <footer className="border-t border-hairline bg-panel transition-all">
      <Disclosure id="limitations-tray-content" open={isExpanded} onOpenChange={setIsExpanded}>
        {/* Toggle Bar */}
        <DisclosureTrigger>
          <button
            type="button"
            className="w-full h-8 px-4 flex items-center justify-between text-xs font-mono select-none hover:bg-surface-hover text-left focus:outline-none focus-visible:ring-1 focus-visible:ring-border-focus cursor-pointer"
            aria-expanded={isExpanded}
            aria-controls="limitations-tray-content"
          >
            <div className="flex items-center space-x-2">
              {hasErrors || isIncomplete ? (
                <AlertOctagon size={13} strokeWidth={1.5} className="text-status-removed" />
              ) : (
                <AlertTriangle size={13} strokeWidth={1.5} className="text-status-modified" />
              )}
              <span className="font-semibold text-text-primary">
                {isIncomplete ? `INCOMPLETE ANALYSIS: ${report.status}` : "ANALYSIS LIMITATIONS & NOTICES"}
              </span>
              <span className="text-[10px] text-text-muted">
                ({report.limitations.length} limitations, {report.errors.length} errors)
              </span>
            </div>

            <div className="flex items-center space-x-1 text-text-muted">
              <span className="text-[10px]">{isExpanded ? "Collapse" : "Expand"}</span>
              {isExpanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            </div>
          </button>
        </DisclosureTrigger>

        {/* Expanded Details with Motion height transition */}
        <DisclosureContent>
          <div
            className="p-4 border-t border-hairline bg-ground max-h-48 overflow-y-auto space-y-3 font-mono text-xs"
          >
            {/* Plain-English Explanation */}
            <div className="p-2 rounded-xs bg-panel border border-hairline text-text-secondary text-[11px] font-body leading-normal">
              <strong className="text-text-primary font-sans font-semibold">What this means: </strong>
              Static analysis reached an explicit boundary (such as a function missing from one revision, or unsupported syntax). The tool explicitly records what it cannot verify rather than making unverified guesses.
            </div>

            {/* Errors */}
            {hasErrors && (
              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-status-removed uppercase block">
                  Execution Errors
                </span>
                <ul className="space-y-1">
                  {report.errors.map((err, idx) => (
                    <li key={idx} className="p-2 rounded-xs bg-status-removed-bg border border-status-removed-border text-status-removed text-[11px] flex items-center justify-between">
                      <div>
                        <span className="font-bold">[{err.code}]</span>: {err.message}
                      </div>
                      <Badge variant="amber" dot>Error</Badge>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Limitations */}
            {hasLimitations && (
              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-status-modified uppercase block">
                  Upstream Lineage & Static Analysis Boundaries
                </span>
                <ul className="space-y-1">
                  {report.limitations.map((lim, idx) => (
                    <li key={idx} className="p-2 rounded-xs bg-surface-elevated border border-hairline text-text-secondary text-[11px]">
                      {lim}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </DisclosureContent>
      </Disclosure>
    </footer>
  );
};
