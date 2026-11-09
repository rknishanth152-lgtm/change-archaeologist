/**
 * Change Archaeologist — Report intake
 *
 * The ways to open a report: drop a file, browse, paste JSON, or try a sample.
 * Shared by the start screen and the Open report dialog.
 */

import React, { useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { loadReportFromFile, loadReportFromJsonString } from "../utils/report-loader.js";
import { DEMO_FIXTURES } from "../data/demo-fixtures.js";
import { SAMPLE_LABELS, sampleName } from "../utils/labels.js";
import type { ReportLoadResult } from "../types/index.js";
import { TactileButton } from "./ui/TactileButton.js";
import { SectionHeading } from "./ui/Headings.js";
import { GlyphDrop, GlyphSpecimens, SampleArt } from "./icons/HeadingGlyphs.js";

export interface ReportIntakeProps {
  readonly onOpened: (result: ReportLoadResult, sampleId: string | null) => void;
}

export const ReportIntake: React.FC<ReportIntakeProps> = ({ onOpened }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [pastedJson, setPastedJson] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [issues, setIssues] = useState<readonly { path: string; code: string; message: string }[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleResult = (result: ReportLoadResult) => {
    if (result.success && result.report) {
      setErrorMessage(null);
      setIssues(null);
      onOpened(result, null);
    } else {
      setErrorMessage(result.error ?? "This file isn't a valid report.");
      setIssues(result.issues ?? null);
    }
  };

  const openFile = async (file: File | undefined) => {
    if (file) handleResult(await loadReportFromFile(file));
  };

  return (
    <div className="flex flex-col gap-6">
      {errorMessage && (
        <div
          role="alert"
          aria-live="assertive"
          className="p-3 rounded-md bg-status-removed-bg border border-status-removed-border text-sm space-y-1.5"
        >
          <div className="flex items-center gap-2 font-semibold text-status-removed">
            <AlertTriangle size={14} strokeWidth={1.5} aria-hidden="true" />
            <span>{errorMessage}</span>
          </div>
          {issues && issues.length > 0 && (
            <ul className="pl-5 list-disc space-y-0.5 text-xs text-text-secondary">
              {issues.map((issue, index) => (
                <li key={index}>
                  <span className="font-mono text-text-primary">{issue.path}</span>: {issue.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div
        role="button"
        tabIndex={0}
        aria-label="Choose a report file, or drop one here"
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          void openFile(event.dataTransfer.files?.[0]);
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg px-6 py-8 flex flex-col items-center gap-2 text-center transition-colors duration-fast focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus ${
          isDragging ? "border-border-focus bg-surface-elevated" : "border-border-interactive hover:bg-surface-elevated"
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={(event) => void openFile(event.target.files?.[0])}
          accept=".json"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
        />
        <GlyphDrop size={28} className="text-text-accent" />
        <p className="text-sm font-medium text-text-primary">Drop a report here, or click to choose a file</p>
        <p className="text-xs text-text-secondary">
          Accepts the <span className="font-mono">.json</span> report from the command-line tool
        </p>
      </div>

      <section aria-label="Sample reports" className="flex flex-col gap-3">
        <SectionHeading icon={<GlyphSpecimens />}>Or try a sample</SectionHeading>
        <div className="grid grid-cols-1 sm:grid-cols-2 auto-rows-fr gap-2">
          {DEMO_FIXTURES.map((fixture) => (
            <button
              key={fixture.id}
              type="button"
              onClick={() =>
                onOpened({ success: true, fileName: `sample-${fixture.id.toLowerCase()}.json`, report: fixture.report }, fixture.id)
              }
              className="p-3 flex items-center gap-3 rounded-md border border-hairline bg-transparent text-left transition-colors duration-fast hover:bg-surface-elevated focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            >
              <SampleArt id={fixture.id} />
              <span className="min-w-0 flex flex-col gap-0.5">
                <span className="text-sm font-medium text-text-primary">{sampleName(fixture.id)}</span>
                <span className="text-xs text-text-secondary">{SAMPLE_LABELS[fixture.id]?.teaches}</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <details className="rounded-md border border-hairline">
        <summary className="px-3 py-2 text-sm text-text-secondary select-none rounded-md cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus">
          Paste report JSON instead
        </summary>
        <div className="p-3 border-t border-hairline space-y-2">
          <textarea
            value={pastedJson}
            onChange={(event) => setPastedJson(event.target.value)}
            placeholder='{"schemaVersion": "1.0.0", ...}'
            aria-label="Report JSON"
            className="w-full h-32 p-2 font-mono text-xs bg-surface-code text-text-primary border border-border-interactive rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
          />
          <TactileButton
            variant="primary"
            size="sm"
            disabled={!pastedJson.trim()}
            onClick={() => handleResult(loadReportFromJsonString(pastedJson, "pasted-report.json"))}
          >
            Open report
          </TactileButton>
        </div>
      </details>
    </div>
  );
};
