/**
 * Change Archaeologist — Open report dialog
 */

import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";
import type { ReportLoadResult } from "../types/index.js";
import { ReportIntake } from "./ReportIntake.js";

interface ReportLoaderProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onReportLoaded: (result: ReportLoadResult, sampleId: string | null) => void;
}

export const ReportLoader: React.FC<ReportLoaderProps> = ({ isOpen, onClose, onReportLoaded }) => {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      } else if (event.key === "Tab") {
        const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable || focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ backgroundColor: "var(--overlay-scrim)" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="loader-title"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        className="w-full max-w-2xl bg-panel rounded-xl shadow-2xl overflow-hidden flex flex-col my-8"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="h-12 px-4 border-b border-hairline flex items-center justify-between">
          <h2 id="loader-title" className="m-0 text-base font-semibold text-text-primary">
            Open a report
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="p-1 rounded-sm text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors duration-fast focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            aria-label="Close"
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>

        <div className="p-4 max-h-[75vh] overflow-y-auto overscroll-contain">
          <ReportIntake
            onOpened={(result, sampleId) => {
              onReportLoaded(result, sampleId);
              onClose();
            }}
          />
        </div>

        <p className="m-0 px-4 py-2.5 border-t border-hairline text-xs text-text-secondary">
          Reports are read in your browser and never leave this computer.
        </p>
      </div>
    </div>
  );
};
