/**
 * Change Archaeologist — Start screen
 *
 * Two columns on one top edge: what the tool answers on the left,
 * the ways to open a report on the right.
 */

import React, { useState } from "react";
import { Check, Copy } from "lucide-react";
import type { ReportLoadResult } from "../types/index.js";
import { ReportIntake } from "./ReportIntake.js";
import { LogoMark } from "./icons/LogoMark.js";
import { GlyphPrompt, HowItReadsArt } from "./icons/HeadingGlyphs.js";
import { SectionHeading } from "./ui/Headings.js";

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
    <main className="flex-1 overflow-y-auto">
      <div className="min-h-full max-w-6xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-2 gap-x-16 gap-y-10 items-stretch content-center">
        <div className="min-w-0 flex flex-col justify-between gap-8">
          <header className="flex flex-col gap-4">
            <LogoMark size={48} className="text-text-accent" />
            <h2 className="text-4xl leading-[1.15] font-semibold tracking-tight text-text-primary text-balance">
              See what changed in a function, and whether the tests moved with it
            </h2>
            <p className="text-base leading-relaxed text-text-secondary text-pretty">
              Compare one function across two Git versions. You'll see what was observed, what that suggests, and what
              static analysis can't tell you. Reports stay on this computer.
            </p>
          </header>

          <HowItReadsArt />
        </div>

        <div className="min-w-0">
          <ReportIntake onOpened={onOpened} />
        </div>

        <section aria-label="Create a report" className="lg:col-span-2 flex flex-col gap-3">
          <SectionHeading icon={<GlyphPrompt />}>Create a report from your own repository</SectionHeading>
          <div className="flex items-start gap-3 p-3 rounded-md bg-surface-code border border-hairline">
            <code className="flex-1 min-w-0 font-mono text-xs leading-relaxed text-text-primary break-words">{CLI_COMMAND}</code>
            <button
              type="button"
              onClick={copyCommand}
              aria-label={copied ? "Command copied" : "Copy command"}
              className="p-1.5 -m-0.5 shrink-0 rounded-sm text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors duration-fast focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            >
              {copied ? <Check size={14} strokeWidth={1.5} /> : <Copy size={14} strokeWidth={1.5} />}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
};
