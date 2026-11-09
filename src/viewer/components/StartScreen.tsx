/**
 * Change Archaeologist — Start screen
 *
 * What someone sees before any report is open: what the tool answers,
 * how to produce a report, and samples to try.
 */

import React, { useState } from "react";
import { Check, Copy } from "lucide-react";
import type { ReportLoadResult } from "../types/index.js";
import { ReportIntake } from "./ReportIntake.js";

const CLI_COMMAND =
  "node bin/change-archaeologist.js analyze --repo . --file src/auth.ts --function verifyToken --base main~1 --head main --format json --output report.json";

export interface StartScreenProps {
  readonly onOpened: (result: ReportLoadResult, sampleId: string | null) => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({ onOpened }) => {
  const [copied, setCopied] = useState(false);

  const copyCommand = () => {
    navigator.clipboard?.writeText(CLI_COMMAND).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main className="flex-1 overflow-y-auto px-4 py-10 sm:py-14">
      <div className="max-w-2xl mx-auto space-y-8">
        <header className="space-y-3">
          <h2 className="m-0 text-3xl font-semibold tracking-tight text-text-primary text-balance">
            See what changed in a function, and whether the tests moved with it
          </h2>
          <p className="m-0 text-base text-text-secondary text-pretty">
            Open a report to compare one function across two Git versions. You'll see what was observed, what that
            suggests, and what static analysis can't tell you. Reports stay on this computer.
          </p>
        </header>

        <ReportIntake onOpened={onOpened} />

        <section aria-label="Create a report" className="space-y-2">
          <h3 className="m-0 text-sm font-semibold text-text-primary">Create a report from your own repository</h3>
          <div className="flex items-start gap-2 p-3 rounded-md bg-surface-code border border-hairline">
            <code className="flex-1 min-w-0 font-mono text-xs text-text-primary break-words">{CLI_COMMAND}</code>
            <button
              type="button"
              onClick={copyCommand}
              aria-label={copied ? "Command copied" : "Copy command"}
              className="p-1.5 shrink-0 rounded-sm text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors duration-fast focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            >
              {copied ? <Check size={14} strokeWidth={1.5} /> : <Copy size={14} strokeWidth={1.5} />}
            </button>
          </div>
          <p className="m-0 text-xs text-text-secondary">Then drop the resulting report.json above.</p>
        </section>
      </div>
    </main>
  );
};
