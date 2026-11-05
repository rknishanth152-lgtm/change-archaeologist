import React, { useState, useRef, useEffect } from "react";
import { Upload, FileText, AlertTriangle, Check, X, ShieldAlert } from "lucide-react";
import { loadReportFromFile, loadReportFromJsonString } from "../utils/report-loader.js";
import { DEMO_FIXTURES } from "../data/demo-fixtures.js";
import type { ReportLoadResult } from "../types/index.js";
import { TactileButton } from "./ui/TactileButton.js";

interface ReportLoaderProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onReportLoaded: (result: ReportLoadResult) => void;
}

export const ReportLoader: React.FC<ReportLoaderProps> = ({
  isOpen,
  onClose,
  onReportLoaded,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [pastedJson, setPastedJson] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [issuesList, setIssuesList] = useState<readonly { path: string; code: string; message: string }[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Focus trap & restoration and Escape key dismiss
  useEffect(() => {
    if (!isOpen) return;

    previousActiveElement.current = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "Tab") {
        const dialog = dialogRef.current;
        if (!dialog) return;
        const focusable = dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      previousActiveElement.current?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleProcessResult = (result: ReportLoadResult) => {
    if (result.success && result.report) {
      setErrorMessage(null);
      setIssuesList(null);
      onReportLoaded(result);
      onClose();
    } else {
      setErrorMessage(result.error ?? "Failed to validate report.");
      setIssuesList(result.issues ?? null);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const res = await loadReportFromFile(file);
    handleProcessResult(res);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const res = await loadReportFromFile(file);
      handleProcessResult(res);
    }
  };

  const handlePasteSubmit = () => {
    if (!pastedJson.trim()) return;
    const res = loadReportFromJsonString(pastedJson, "pasted-report.json");
    handleProcessResult(res);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ backgroundColor: "rgba(28, 20, 9, 0.65)", backdropFilter: "blur(4px)" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="loader-title"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        className="w-full max-w-2xl bg-panel border border-border-interactive rounded-md shadow-2xl overflow-hidden flex flex-col my-8 focus:outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="h-12 px-4 border-b border-hairline flex items-center justify-between bg-surface-elevated">
          <div className="flex items-center space-x-2">
            <Upload size={16} strokeWidth={1.5} className="text-text-accent" aria-hidden="true" />
            <h2 id="loader-title" className="font-display font-semibold text-sm text-text-primary">
              Ingest Analysis Report
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="p-1 rounded-sm text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            aria-label="Close dialog"
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Error Banner */}
          {errorMessage && (
            <div
              role="alert"
              aria-live="assertive"
              className="p-3 rounded-md bg-status-removed-bg border border-status-removed-border text-status-removed text-xs font-mono space-y-1.5"
            >
              <div className="flex items-center space-x-2 font-semibold">
                <AlertTriangle size={14} strokeWidth={1.5} />
                <span>{errorMessage}</span>
              </div>
              {issuesList && issuesList.length > 0 && (
                <ul className="pl-5 list-disc space-y-0.5 text-[11px] text-text-secondary">
                  {issuesList.map((issue, idx) => (
                    <li key={idx}>
                      <span className="text-text-primary font-mono">{issue.path}</span> [{issue.code}]: {issue.message}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Drag & Drop Box */}
          <div
            role="button"
            tabIndex={0}
            aria-label="Upload report JSON file: browse or drag and drop"
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-md p-6 text-center cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus ${
              isDragging
                ? "border-border-focus bg-surface-elevated"
                : "border-border-interactive hover:border-text-secondary bg-ground"
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".json"
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
            />
            <div className="flex flex-col items-center space-y-2">
              <FileText size={28} strokeWidth={1.5} className="text-text-muted" aria-hidden="true" />
              <div className="text-xs text-text-primary font-medium">
                Drag and drop your <span className="font-mono text-text-accent">report.json</span> here, or click to browse
              </div>
              <div className="text-[11px] text-text-muted font-mono">
                Strictly validated with core pure TypeScript AnalysisReport schema (v1.0.0)
              </div>
            </div>
          </div>

          {/* Quick Preload Presets */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-text-muted">
              <span>PRELOAD DEMONSTRATION FIXTURE</span>
              <span className="text-[10px]">Deterministic Scenario Outputs</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {DEMO_FIXTURES.map((fixture) => (
                <button
                  key={fixture.id}
                  type="button"
                  onClick={() => {
                    handleProcessResult({
                      success: true,
                      fileName: `demo-scenario-${fixture.id.toLowerCase()}.json`,
                      report: fixture.report,
                    });
                  }}
                  className="p-2.5 rounded-sm bg-surface-elevated hover:bg-surface-hover border border-hairline text-left flex flex-col justify-between transition-colors group focus:outline-none focus-visible:ring-1 focus-visible:ring-border-focus"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold text-text-primary group-hover:text-text-accent">
                      Scenario {fixture.id}
                    </span>
                    <span className="font-mono text-[10px] text-text-muted">
                      {fixture.targetFunctionName}
                    </span>
                  </div>
                  <div className="text-[11px] text-text-secondary truncate mt-1">
                    {fixture.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Paste Raw JSON Accordion */}
          <details className="text-xs font-mono border border-hairline rounded-sm bg-ground">
            <summary className="px-3 py-2 cursor-pointer text-text-muted hover:text-text-secondary select-none focus:outline-none focus-visible:ring-1 focus-visible:ring-border-focus">
              Paste raw JSON string manually…
            </summary>
            <div className="p-3 border-t border-hairline space-y-2">
              <textarea
                value={pastedJson}
                onChange={(e) => setPastedJson(e.target.value)}
                placeholder='Paste raw {"schemaVersion": "1.0.0", ...} content here'
                aria-label="Raw report JSON text input"
                className="w-full h-32 p-2 font-mono text-xs bg-surface-code text-text-primary border border-hairline rounded-sm focus:border-border-focus focus:outline-none focus-visible:ring-1 focus-visible:ring-border-focus"
              />
              <TactileButton
                variant="primary"
                size="sm"
                onClick={handlePasteSubmit}
              >
                Validate and Ingest
              </TactileButton>
            </div>
          </details>
        </div>

        {/* Footer */}
        <div className="h-10 px-4 border-t border-hairline bg-surface-elevated flex items-center justify-between text-[11px] font-mono text-text-muted">
          <span>Zero cloud transmission — runs 100% locally in browser</span>
          <TactileButton
            variant="ghost"
            size="xs"
            onClick={onClose}
          >
            Cancel
          </TactileButton>
        </div>
      </div>
    </div>
  );
};

