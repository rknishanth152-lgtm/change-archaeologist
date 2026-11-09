/**
 * Change Archaeologist — The Dig detail panel
 *
 * Says what is known about the focused item, always in the same order:
 * what was seen, what that suggests, and what cannot be told.
 */

import React from "react";
import type { AnalysisReport, Finding, ReviewAttentionLevel } from "../../types/index.js";
import type { DigFault, DigFocus, DigModel, DigShaft, DigTestCard } from "../../types/dig.js";
import { explainStructuralChange } from "../../utils/explanation-helpers.js";
import { plainFindingTitle } from "../../utils/labels.js";
import { STATUS_MEANING } from "./DigCanvas.js";
import { PartHeading } from "../ui/Headings.js";
import { GlyphBranch, GlyphEye, GlyphUndug } from "../icons/HeadingGlyphs.js";

const ATTENTION_ORDER: Record<ReviewAttentionLevel, number> = {
  HIGH_ATTENTION: 0,
  MODERATE_ATTENTION: 1,
  INFORMATIONAL: 2,
};

const Statements: React.FC<{ readonly heading: string; readonly icon: React.ReactNode; readonly items: readonly string[] }> = ({ heading, icon, items }) => (
  <div className="min-w-0 flex flex-col gap-1.5 [overflow-wrap:anywhere]">
    <h4><PartHeading icon={icon}>{heading}</PartHeading></h4>
    {items.length === 0 ? (
      <p className="text-sm text-text-secondary">Nothing recorded.</p>
    ) : (
      items.map((item, index) => (
        <p key={index} className="text-sm leading-relaxed text-text-secondary">
          {item}
        </p>
      ))
    )}
  </div>
);

const ThreeParts: React.FC<{
  readonly saw: readonly string[];
  readonly suggests: readonly string[];
  readonly unknown: readonly string[];
}> = ({ saw, suggests, unknown }) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
    <Statements heading="What we saw" icon={<GlyphEye size={14} />} items={saw} />
    <Statements heading="What that suggests" icon={<GlyphBranch size={14} />} items={suggests} />
    <Statements heading="What we can't tell" icon={<GlyphUndug size={14} />} items={unknown} />
  </div>
);

const Evidence: React.FC<{
  readonly ids: readonly string[];
  readonly onSelect: (id: string) => void;
}> = ({ ids, onSelect }) =>
  ids.length === 0 ? null : (
    <div className="flex flex-wrap items-center gap-2 text-xs text-text-secondary">
      <span>Evidence</span>
      {ids.map((id) => (
        <button
          key={id}
          type="button"
          onClick={() => onSelect(id)}
          className="min-h-6 px-2 py-1 font-mono text-xs rounded-sm border border-border-interactive bg-transparent text-text-primary hover:bg-surface-hover cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          {id}
        </button>
      ))}
    </div>
  );

const Heading: React.FC<{ readonly title: string; readonly tag?: string }> = ({ title, tag }) => (
  <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
    <h3 className="font-sans text-base font-semibold text-text-primary">{title}</h3>
    {tag && <span className="font-mono text-xs text-text-secondary">{tag}</span>}
  </header>
);

function findingParts(findings: readonly Finding[]) {
  return {
    saw: findings.flatMap((f) => f.observed.map((o) => o.statement)),
    suggests: findings.flatMap((f) => f.inferred.map((i) => i.statement)),
    unknown: Array.from(new Set(findings.flatMap((f) => f.unknown.map((u) => u.statement)))),
  };
}

const ShaftDetail: React.FC<{ readonly shaft: DigShaft; readonly onSelectEvidence: (id: string) => void }> = ({
  shaft,
  onSelectEvidence,
}) => (
  <>
    <Heading
      title={`${shaft.status} link`}
      tag={`${shaft.faultId} → ${shaft.testChangeId ?? shaft.testFilePath ?? "no test"}`}
    />
    <p className="text-sm text-text-secondary">{STATUS_MEANING[shaft.status]}</p>
    <ThreeParts saw={[shaft.observed]} suggests={shaft.inferred ? [shaft.inferred] : []} unknown={shaft.unknowns} />
    {shaft.conflictingResult && (
      <p className="text-sm text-text-primary">
        The report's overall verdict for {shaft.faultId} is {shaft.conflictingResult.status} (
        <span className="font-mono text-xs">{shaft.conflictingResult.id}</span>), while this individual link is{" "}
        {shaft.status}.
      </p>
    )}
    <Evidence ids={shaft.evidenceIds} onSelect={onSelectEvidence} />
  </>
);

const FaultDetail: React.FC<{
  readonly fault: DigFault;
  readonly shafts: readonly DigShaft[];
  readonly functionName: string;
  readonly onSelectEvidence: (id: string) => void;
}> = ({ fault, shafts, functionName, onSelectEvidence }) => {
  const explanation = explainStructuralChange(fault.change, functionName);
  const evidence = Array.from(
    new Set([
      ...fault.findings.flatMap((f) => f.observed.flatMap((o) => o.evidenceIds)),
      ...shafts.flatMap((s) => s.evidenceIds),
    ])
  );
  return (
    <>
      <Heading title={explanation.plainTitle} tag={fault.id} />
      <p className="text-sm text-text-secondary">{fault.change.summary}</p>
      {fault.findings.length > 0 && <ThreeParts {...findingParts(fault.findings)} />}
      <Evidence ids={evidence} onSelect={onSelectEvidence} />
    </>
  );
};

const TestDetail: React.FC<{ readonly card: DigTestCard; readonly onSelectEvidence: (id: string) => void }> = ({
  card,
  onSelectEvidence,
}) => (
  <>
    <Heading
      title={card.firstAssertion?.enclosingTestBlock ?? "Test change"}
      tag={`${card.id} · ${card.testChange.posixTestFilePath}`}
    />
    {card.testChange.assertionChanges.map((assertion, index) => (
      <div key={index} className="min-w-0 space-y-1">
        {card.testChange.assertionChanges.length > 1 && (
          <h4 className="font-sans text-xs font-semibold text-text-primary">
            {assertion.enclosingTestBlock ?? "Top-level assertion"}
          </h4>
        )}
        {assertion.beforeAssertionText && (
          <code className="block font-mono text-xs text-status-removed break-words">− {assertion.beforeAssertionText}</code>
        )}
        {assertion.afterAssertionText && (
          <code className="block font-mono text-xs text-status-added break-words">+ {assertion.afterAssertionText}</code>
        )}
        <p className="text-sm text-text-secondary">
          {assertion.callsTargetFunctionInBlock
            ? "This test block calls the function directly."
            : "This test block doesn't call the function directly."}
        </p>
      </div>
    ))}
    <p className="text-sm text-text-secondary">
      The analysis read this code but did not run it, so it can't say whether this test passes.
    </p>
    <Evidence ids={card.evidenceIds} onSelect={onSelectEvidence} />
  </>
);

export interface DigDetailProps {
  readonly model: DigModel;
  readonly report: AnalysisReport;
  readonly focus: DigFocus | null;
  readonly onSelectEvidence: (id: string) => void;
}

export const DigDetail: React.FC<DigDetailProps> = ({ model, report, focus, onSelectEvidence }) => {
  let content: React.ReactNode = null;

  if (focus?.kind === "shaft") {
    const shaft = model.shafts.find((s) => s.id === focus.id);
    if (shaft) content = <ShaftDetail shaft={shaft} onSelectEvidence={onSelectEvidence} />;
  } else if (focus?.kind === "fault") {
    const fault = model.faults.find((f) => f.id === focus.id);
    if (fault) {
      content = (
        <FaultDetail
          fault={fault}
          shafts={model.shafts.filter((s) => s.faultId === fault.id)}
          functionName={model.functionName}
          onSelectEvidence={onSelectEvidence}
        />
      );
    }
  } else if (focus?.kind === "test") {
    const card = model.testFiles
      .flatMap((file) => file.cards)
      .find((c): c is DigTestCard => c.kind === "TEST_CHANGE" && c.id === focus.id);
    if (card) content = <TestDetail card={card} onSelectEvidence={onSelectEvidence} />;
  }

  if (!content) {
    const top = [...report.findings].sort(
      (a, b) => ATTENTION_ORDER[a.attentionLevel] - ATTENTION_ORDER[b.attentionLevel]
    )[0];
    content = (
      <>
        {top && (
          <>
            <Heading title={plainFindingTitle(top.title)} />
            <ThreeParts {...findingParts([top])} />
          </>
        )}
      </>
    );
  }

  return (
    <div aria-live="polite" className="px-4 pb-4 flex flex-col gap-3">
      {content}
    </div>
  );
};
