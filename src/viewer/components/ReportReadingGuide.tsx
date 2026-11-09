/**
 * Change Archaeologist — How to Read This Report Guide
 *
 * Slide-over drawer answering three core newcomer & engineer questions:
 * 1. What changed? (Structural code changes via AST diffs)
 * 2. What do the tests tell us? (Companion test changes & call relationships)
 * 3. What can we conclude? (Evidence, epistemic boundaries, limits of static analysis)
 *
 * Architecture:
 * - Slide-over modal sheet/drawer with backdrop overlay (does NOT push workspace down).
 * - Accessible dialog semantics: role="dialog", aria-modal="true", aria-labelledby, focus trap & restoration.
 * - Keyboard Escape dismissal.
 * - Integrated Motion animations with prefers-reduced-motion support.
 * - Uses domain glyphs: GlyphDeltaModified, GlyphCorrStrong, GlyphEpistemicTier.
 */

import React, { useState, useEffect, useRef } from "react";
import { X, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import type { AnalysisReport } from "../types/index.js";
import { buildReportReadingGuideData, CONCEPT_EXPLANATIONS } from "../utils/explanation-helpers.js";
import {
  Disclosure,
  DisclosureTrigger,
  DisclosureContent,
} from "./ui/Disclosure.js";
import { AnimatedGroup } from "./ui/AnimatedGroup.js";
import { TactileButton } from "./ui/TactileButton.js";
import {
  GlyphMark,
  GlyphDeltaModified,
  GlyphCorrStrong,
  GlyphEpistemicTier,
} from "./icons/ArchaeologistGlyphs.js";

export interface ReportReadingGuideProps {
  readonly report: AnalysisReport;
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

export const ReportReadingGuide: React.FC<ReportReadingGuideProps> = ({
  report,
  isOpen,
  onClose,
}) => {
  const [openSection1, setOpenSection1] = useState<boolean>(false);
  const [openSection2, setOpenSection2] = useState<boolean>(false);
  const [openSection3, setOpenSection3] = useState<boolean>(false);
  const [showGlossary, setShowGlossary] = useState<boolean>(false);

  const drawerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const shouldReduceMotion = useReducedMotion();

  const guideData = buildReportReadingGuideData(report);

  // Focus management: store previous activeElement on open, restore on close
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement | null;
      // Focus drawer or first button
      const timer = setTimeout(() => {
        const closeBtn = drawerRef.current?.querySelector<HTMLButtonElement>(
          'button[aria-label="Dismiss How to Read This Report Guide"]'
        );
        closeBtn?.focus();
      }, 50);
      return () => clearTimeout(timer);
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, [isOpen]);

  // Keyboard Escape handler
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0"
        style={{ backgroundColor: "var(--overlay-scrim)" }}
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Slide-over Drawer Panel */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reading-guide-title"
        aria-describedby="reading-guide-desc"
        className="relative z-10 w-full sm:w-[560px] md:w-[620px] lg:w-[680px] h-full bg-surface-elevated border-l border-hairline shadow-2xl flex flex-col overflow-hidden animate-slideInRight"
        style={{
          background: "var(--surface-elevated)",
          borderColor: "var(--border-hairline)",
        }}
      >
        {/* Header Bar */}
        <div className="px-5 py-4 border-b border-hairline flex items-start justify-between gap-3 shrink-0 bg-panel">
          <div className="flex items-start space-x-3 min-w-0">
            <div
              className="w-8 h-8 rounded-sm flex items-center justify-center text-text-accent shrink-0 mt-0.5"
              style={{ background: "var(--surface-ground)", border: "1px solid var(--border-hairline)" }}
              aria-hidden="true"
            >
              <GlyphMark size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h2
                  id="reading-guide-title"
                  className="font-display font-semibold text-base text-text-primary tracking-tight truncate"
                >
                  How to Read This Report
                </h2>
              </div>
              <p
                id="reading-guide-desc"
                className="font-body text-xs text-text-secondary mt-1 leading-normal"
              >
                What was found in{" "}
                <code className="font-mono text-xs text-text-primary font-medium">
                  {guideData.targetName}
                </code>{" "}
                between{" "}
                <code className="font-mono text-xs text-text-secondary">
                  {guideData.commitRange}
                </code>
                .
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <TactileButton
              variant="outline"
              size="xs"
              onClick={() => setShowGlossary(!showGlossary)}
              aria-expanded={showGlossary}
              aria-label={showGlossary ? "Hide glossary of terms" : "Show glossary of terms"}
            >
              {showGlossary ? "Hide terms" : "Terms"}
            </TactileButton>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xs hover:bg-surface-hover text-text-muted hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus transition-colors cursor-pointer"
              aria-label="Dismiss How to Read This Report Guide"
              title="Dismiss Guide (Esc)"
            >
              <X size={16} strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Scrollable Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* 3 Core Questions Grid with Motion-Primitives AnimatedGroup */}
          <AnimatedGroup preset="slide" stagger={0.06} className="space-y-3.5">
            {/* Question 1: What changed? */}
            <div
              className="rounded-md border border-hairline p-4 bg-ground space-y-3"
              style={{ borderColor: "var(--border-hairline)", background: "var(--surface-ground)" }}
            >
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-hairline">
                  <div className="flex items-center space-x-2 text-sm font-semibold text-text-primary">
                    <GlyphDeltaModified size={15} className="text-status-modified" />
                    <span>1. What changed?</span>
                  </div>
                  
                </div>
                <div className="font-sans font-medium text-xs text-text-primary mt-2">
                  Changes to how the function is built
                </div>
                <p className="font-body text-xs text-text-secondary mt-1 leading-relaxed">
                  {guideData.whatChanged.summary}
                </p>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-hairline">
                {guideData.whatChanged.details.map((detail, idx) => (
                  <div key={idx} className="flex items-start space-x-1.5 text-xs font-sans text-text-secondary">
                    <span className="text-text-accent mt-0.5">•</span>
                    <span>{detail}</span>
                  </div>
                ))}
              </div>

              {/* Motion-Primitives Disclosure for Question 1 details */}
              <Disclosure open={openSection1} onOpenChange={setOpenSection1}>
                <DisclosureTrigger>
                  <button
                    type="button"
                    className="w-full text-xs font-sans text-text-accent flex items-center justify-between pt-1 hover:underline focus:outline-none focus-visible:ring-1 focus-visible:ring-border-focus cursor-pointer"
                    aria-expanded={openSection1}
                    aria-label="Toggle details for Question 1: What changed?"
                  >
                    <span>{openSection1 ? "Hide details" : "How changes are detected"}</span>
                    {openSection1 ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                </DisclosureTrigger>

                <DisclosureContent>
                  <div className="p-2.5 mt-2 rounded-sm bg-panel border border-hairline text-xs font-body text-text-secondary space-y-1">
                    <p>
                      <strong>Structure, not text:</strong> A normal diff compares lines. This tool compares how the code is built (its syntax tree).
                    </p>
                    <p className="text-text-muted">
                      So it notices things like a removed <code className="font-mono">if (...)</code> check or altered <code className="font-mono">return</code> value, and ignores reformatting.
                    </p>
                  </div>
                </DisclosureContent>
              </Disclosure>
            </div>

            {/* Question 2: What do the tests tell us? */}
            <div
              className="rounded-md border border-hairline p-4 bg-ground space-y-3"
              style={{ borderColor: "var(--border-hairline)", background: "var(--surface-ground)" }}
            >
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-hairline">
                  <div className="flex items-center space-x-2 text-sm font-semibold text-text-primary">
                    <GlyphCorrStrong size={15} className="text-status-strong" />
                    <span>2. What do the tests tell us?</span>
                  </div>
                  
                </div>
                <div className="font-sans font-medium text-xs text-text-primary mt-2">
                  Tests that changed in the same range
                </div>
                <p className="font-body text-xs text-text-secondary mt-1 leading-relaxed">
                  {guideData.whatTestsTellUs.summary}
                </p>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-hairline">
                {guideData.whatTestsTellUs.details.map((detail, idx) => (
                  <div key={idx} className="flex items-start space-x-1.5 text-xs font-sans text-text-secondary">
                    <span className="text-status-strong mt-0.5">•</span>
                    <span>{detail}</span>
                  </div>
                ))}
              </div>

              {/* Motion-Primitives Disclosure for Question 2 details */}
              <Disclosure open={openSection2} onOpenChange={setOpenSection2}>
                <DisclosureTrigger>
                  <button
                    type="button"
                    className="w-full text-xs font-sans text-text-accent flex items-center justify-between pt-1 hover:underline focus:outline-none focus-visible:ring-1 focus-visible:ring-border-focus cursor-pointer"
                    aria-expanded={openSection2}
                    aria-label="Toggle details for Question 2: What do tests tell us?"
                  >
                    <span>{openSection2 ? "Hide details" : "Why this matters"}</span>
                    {openSection2 ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                </DisclosureTrigger>

                <DisclosureContent>
                  <div className="p-2.5 mt-2 rounded-sm bg-panel border border-hairline text-xs font-body text-text-secondary space-y-1">
                    <p>
                      <strong>Tests that move with code:</strong> When people change code, they often update its tests at the same time.
                    </p>
                    <p className="text-text-muted">
                      This shows whether any assertions changed alongside the code. It can't tell whether they cover the change.
                    </p>
                  </div>
                </DisclosureContent>
              </Disclosure>
            </div>

            {/* Question 3: What can we conclude? */}
            <div
              className="rounded-md border border-hairline p-4 bg-ground space-y-3"
              style={{ borderColor: "var(--border-hairline)", background: "var(--surface-ground)" }}
            >
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-hairline">
                  <div className="flex items-center space-x-2 text-sm font-semibold text-text-primary">
                    <GlyphEpistemicTier size={15} className="text-text-secondary" />
                    <span>3. What can we conclude?</span>
                  </div>
                  
                </div>
                <div className="font-sans font-medium text-xs text-text-primary mt-2">
                  What is known, and what isn't
                </div>
                <p className="font-body text-xs text-text-secondary mt-1 leading-relaxed">
                  {guideData.whatWeCanConclude.summary}
                </p>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-hairline">
                {guideData.whatWeCanConclude.details.map((detail, idx) => (
                  <div key={idx} className="flex items-start space-x-1.5 text-xs font-sans text-text-secondary">
                    <span className="text-text-secondary mt-0.5">•</span>
                    <span>{detail}</span>
                  </div>
                ))}
              </div>

              {/* Motion-Primitives Disclosure for Question 3 details */}
              <Disclosure open={openSection3} onOpenChange={setOpenSection3}>
                <DisclosureTrigger>
                  <button
                    type="button"
                    className="w-full text-xs font-sans text-text-accent flex items-center justify-between pt-1 hover:underline focus:outline-none focus-visible:ring-1 focus-visible:ring-border-focus cursor-pointer"
                    aria-expanded={openSection3}
                    aria-label="Toggle details for Question 3: What can we conclude?"
                  >
                    <span>{openSection3 ? "Hide details" : "What this tool can't do"}</span>
                    {openSection3 ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                </DisclosureTrigger>

                <DisclosureContent>
                  <div className="p-2.5 mt-2 rounded-sm bg-panel border border-hairline text-xs font-body text-text-secondary space-y-1">
                    <p>
                      <strong>It reads code and never runs it.</strong>
                    </p>
                    <p className="text-text-muted">
                      A &quot;STRONG&quot; correlation means a test directly calls the changed function in the same commit — it does{" "}
                      <span className="underline decoration-status-removed">not</span> prove the test passed or that a bug was fixed.
                    </p>
                  </div>
                </DisclosureContent>
              </Disclosure>
            </div>
          </AnimatedGroup>

          {/* Optional Expandable Glossary Section */}
          {showGlossary && (
            <div className="p-4 rounded-md border border-hairline bg-ground space-y-3 font-sans text-xs animate-fadeIn">
              <div className="flex items-center justify-between pb-2 border-b border-hairline">
                <span className="font-semibold text-text-primary">Terms</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div>
                  <strong className="text-text-primary">{CONCEPT_EXPLANATIONS.strongStatus.term}:</strong>{" "}
                  <span className="text-text-secondary font-body">{CONCEPT_EXPLANATIONS.strongStatus.plain}</span>
                </div>
                <div>
                  <strong className="text-text-primary">{CONCEPT_EXPLANATIONS.weakStatus.term}:</strong>{" "}
                  <span className="text-text-secondary font-body">{CONCEPT_EXPLANATIONS.weakStatus.plain}</span>
                </div>
                <div>
                  <strong className="text-text-primary">{CONCEPT_EXPLANATIONS.uncertainStatus.term}:</strong>{" "}
                  <span className="text-text-secondary font-body">{CONCEPT_EXPLANATIONS.uncertainStatus.plain}</span>
                </div>
                <div>
                  <strong className="text-text-primary">{CONCEPT_EXPLANATIONS.noneStatus.term}:</strong>{" "}
                  <span className="text-text-secondary font-body">{CONCEPT_EXPLANATIONS.noneStatus.plain}</span>
                </div>
                <div>
                  <strong className="text-text-primary">{CONCEPT_EXPLANATIONS.astMutation.term}:</strong>{" "}
                  <span className="text-text-secondary font-body">{CONCEPT_EXPLANATIONS.astMutation.plain}</span>
                </div>
                <div>
                  <strong className="text-text-primary">{CONCEPT_EXPLANATIONS.evidenceAnchor.term}:</strong>{" "}
                  <span className="text-text-secondary font-body">{CONCEPT_EXPLANATIONS.evidenceAnchor.plain}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Bar */}
        <div className="px-5 py-3 border-t border-hairline bg-panel flex items-center justify-between text-xs font-sans shrink-0">
          <span className="text-text-muted text-xs">
            Press <kbd className="px-1 py-0.5 rounded-xs bg-ground border border-hairline text-text-secondary">Esc</kbd> to dismiss
          </span>
          <TactileButton variant="secondary" size="xs" onClick={onClose}>
            Close
          </TactileButton>
        </div>
      </div>
    </div>
  );
};
