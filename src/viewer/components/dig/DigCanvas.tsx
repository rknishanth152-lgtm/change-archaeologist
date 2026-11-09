/**
 * Change Archaeologist — The Dig canvas
 *
 * Draws one report as an excavation cross-section. Status is carried by shaft
 * shape and a text label, so it never depends on colour alone.
 */

import React from "react";
import type { CorrelationStatus } from "../../types/index.js";
import type { DigChangeType, DigFocus, DigShaft } from "../../types/dig.js";
import type { DigLitSet } from "../../utils/dig-model.js";
import type { DigLayout, LaidOutColumn, LaidOutShaft } from "../../utils/dig-layout.js";
import { truncate } from "../../utils/dig-layout.js";
import { CONCEPT_EXPLANATIONS } from "../../utils/explanation-helpers.js";
import { GlyphAfter, GlyphBefore, GlyphFlask } from "../icons/HeadingGlyphs.js";

export const STATUS_MEANING: Record<CorrelationStatus, string> = {
  STRONG: CONCEPT_EXPLANATIONS.strongStatus.plain,
  WEAK: CONCEPT_EXPLANATIONS.weakStatus.plain,
  UNCERTAIN: CONCEPT_EXPLANATIONS.uncertainStatus.plain,
  NONE: CONCEPT_EXPLANATIONS.noneStatus.plain,
};

export const SHAFT_STYLE: Record<
  CorrelationStatus,
  { readonly dash: string; readonly cap: "butt" | "round"; readonly hollow: boolean; readonly color: string }
> = {
  STRONG: { dash: "", cap: "butt", hollow: false, color: "var(--dig-shaft-strong)" },
  WEAK: { dash: "13 9", cap: "butt", hollow: false, color: "var(--dig-shaft-weak)" },
  UNCERTAIN: { dash: "1 11", cap: "round", hollow: false, color: "var(--dig-shaft-uncertain)" },
  NONE: { dash: "", cap: "butt", hollow: true, color: "var(--dig-shaft-none)" },
};

const CHANGE_FILL: Record<DigChangeType, string> = {
  ADDED: "var(--dig-added)",
  REMOVED: "var(--dig-removed)",
  MODIFIED: "var(--dig-modified)",
};

const CHANGE_STROKE: Record<DigChangeType, string> = {
  ADDED: "var(--status-added-fg)",
  REMOVED: "var(--status-removed-fg)",
  MODIFIED: "var(--status-modified-fg)",
};

const CHANGE_VERB: Record<DigChangeType, string> = {
  ADDED: "Added",
  REMOVED: "Removed",
  MODIFIED: "Changed",
};

interface PickProps {
  readonly focus: DigFocus;
  readonly label: string;
  readonly hint: string;
  readonly isActive: boolean;
  readonly isDimmed: boolean;
  readonly onPick: (focus: DigFocus) => void;
  readonly onHint: (text: string | null) => void;
  readonly children: React.ReactNode;
}

const Pick: React.FC<PickProps> = ({ focus, label, hint, isActive, isDimmed, onPick, onHint, children }) => (
  <g
    role="button"
    tabIndex={0}
    aria-label={label}
    aria-pressed={isActive}
    className={`dig-pick ${isDimmed ? "dig-dimmed" : ""}`}
    onClick={() => onPick(focus)}
    onKeyDown={(event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onPick(focus);
      }
    }}
    onMouseEnter={() => onHint(hint)}
    onMouseLeave={() => onHint(null)}
    onFocus={() => onHint(hint)}
    onBlur={() => onHint(null)}
  >
    {children}
  </g>
);

const ColumnStrata: React.FC<{ readonly column: LaidOutColumn; readonly codeTop: number; readonly codeHeight: number }> = ({
  column,
  codeTop,
  codeHeight,
}) => {
  if (column.column.state !== "PRESENT") {
    const message =
      column.column.state === "ABSENT" ? "Function not found in this version" : "Source not included in this report";
    const middle = codeTop + codeHeight / 2;
    return (
      <g>
        <rect x={column.x} y={codeTop} width={column.width} height={codeHeight - 2} rx={3} fill="url(#dig-hatch)" />
        <rect x={column.x + 30} y={middle - 16} width={column.width - 60} height={30} rx={4} className="dig-canvas-fill" />
        <text x={column.x + column.width / 2} y={middle + 4} textAnchor="middle" className="dig-note">
          {message}
        </text>
      </g>
    );
  }

  return (
    <g>
      {column.rows.map((laid) => {
        if (laid.row.kind === "gap") {
          return (
            <g key={`gap-${laid.row.from}`}>
              <rect x={laid.x} y={laid.y} width={laid.width} height={laid.height} rx={2} className="dig-gap" />
              <text x={laid.x + 10} y={laid.y + 16} className="dig-small">
                {laid.row.count} lines hidden
              </text>
            </g>
          );
        }
        const { line } = laid.row;
        const fill = line.changeType
          ? CHANGE_FILL[line.changeType]
          : laid.striped
          ? "var(--dig-stratum-b)"
          : "var(--dig-stratum-a)";
        return (
          <g key={line.number}>
            <rect x={laid.x} y={laid.y} width={laid.width} height={laid.height} rx={2} style={{ fill }} />
            <text x={laid.x + 8} y={laid.y + 16} className="dig-small">
              {line.number}
            </text>
            <text x={laid.x + 40} y={laid.y + 16} xmlSpace="preserve" className="dig-code">
              {truncate(line.text, column.maxChars)}
            </text>
          </g>
        );
      })}
    </g>
  );
};

const ShaftStroke: React.FC<{ readonly path: string; readonly status: CorrelationStatus }> = ({ path, status }) => {
  const style = SHAFT_STYLE[status];
  return (
    <>
      <path
        d={path}
        fill="none"
        strokeWidth={6}
        strokeDasharray={style.dash || undefined}
        strokeLinecap={style.cap}
        style={{ stroke: style.color }}
      />
      {style.hollow && <path d={path} fill="none" strokeWidth={2.5} style={{ stroke: "var(--dig-canvas)" }} />}
    </>
  );
};

function shaftLabel(shaft: DigShaft): string {
  const target = shaft.testChangeId ?? shaft.testFilePath ?? "no test";
  return `${shaft.status} link from ${shaft.faultId} to ${target}. ${STATUS_MEANING[shaft.status]}`;
}

export interface DigCanvasProps {
  readonly layout: DigLayout;
  readonly functionName: string;
  readonly lit: DigLitSet | null;
  readonly focus: DigFocus | null;
  readonly statusFilter: CorrelationStatus | null;
  readonly drillKey: string;
  readonly onPick: (focus: DigFocus) => void;
  readonly onHint: (text: string | null) => void;
}

export const DigCanvas: React.FC<DigCanvasProps> = ({
  layout,
  functionName,
  lit,
  focus,
  statusFilter,
  drillKey,
  onPick,
  onHint,
}) => {
  const isShaftLit = (laid: LaidOutShaft) =>
    (!lit || lit.shafts.has(laid.shaft.id)) && (!statusFilter || laid.shaft.status === statusFilter);
  const isFocused = (kind: DigFocus["kind"], id: string) => focus?.kind === kind && focus.id === id;

  return (
    <svg
      width={layout.width}
      height={layout.height}
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      role="group"
      aria-label={`Excavation of ${functionName}`}
      className="dig block"
    >
      <defs>
        <pattern id="dig-hatch" width={9} height={9} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1={0} y1={0} x2={0} y2={9} strokeWidth={2} style={{ stroke: "var(--dig-hatch)" }} />
        </pattern>
      </defs>

      <GlyphBefore x={layout.base.x} y={18} size={16} className="dig-glyph" />
      <text x={layout.base.x + 22} y={31} className="dig-layer">Your code, before</text>
      <text x={layout.base.x + layout.base.width} y={31} textAnchor="end" className="dig-small">{layout.base.column.shortSha}</text>
      <GlyphAfter x={layout.head.x} y={18} size={16} className="dig-glyph" />
      <text x={layout.head.x + 22} y={31} className="dig-layer">Your code, after</text>
      <text x={layout.head.x + layout.head.width} y={31} textAnchor="end" className="dig-small">{layout.head.column.shortSha}</text>

      <ColumnStrata column={layout.base} codeTop={layout.codeTop} codeHeight={layout.codeHeight} />
      <ColumnStrata column={layout.head} codeTop={layout.codeTop} codeHeight={layout.codeHeight} />

      {layout.faults.map(({ fault, points }) => (
        <Pick
          key={fault.id}
          focus={{ kind: "fault", id: fault.id }}
          label={`${CHANGE_VERB[fault.change.changeType]}: ${fault.change.summary}`}
          hint={fault.change.summary}
          isActive={isFocused("fault", fault.id)}
          isDimmed={lit !== null && !lit.faults.has(fault.id)}
          onPick={onPick}
          onHint={onHint}
        >
          <polygon
            points={points}
            strokeWidth={1}
            className="dig-hit-solid"
            style={{ fill: CHANGE_FILL[fault.change.changeType], stroke: CHANGE_STROKE[fault.change.changeType] }}
          />
        </Pick>
      ))}

      <line x1={layout.margin} x2={layout.width - layout.margin} y1={layout.datumY} y2={layout.datumY} className="dig-rule" />
      <GlyphFlask x={layout.margin} y={layout.datumY - 22} size={16} className="dig-glyph" />
      <text x={layout.margin + 22} y={layout.datumY - 9} className="dig-layer">Tests changed in this range</text>

      {layout.files.length === 0 && (
        <g>
          <rect
            x={layout.margin}
            y={layout.testTop}
            width={layout.width - layout.margin * 2}
            height={layout.testEmptyHeight}
            rx={4}
            strokeDasharray="5 5"
            className="dig-empty"
          />
          <text x={layout.width / 2} y={layout.testTop + 30} textAnchor="middle" className="dig-note">
            No test changes in this report. That does not mean the code is untested.
          </text>
        </g>
      )}

      {layout.files.map((file) => (
        <g key={file.path}>
          <rect x={file.x} y={file.y} width={file.width} height={file.height} rx={3} style={{ fill: "var(--dig-test)" }} />
          {file.cards.map((laid) => {
            if (laid.card.kind === "DECLARATION") {
              const { declaration } = laid.card;
              return (
                <g key={laid.card.id}>
                  <rect x={laid.x} y={laid.y} width={laid.width} height={laid.height} rx={4} className="dig-empty" />
                  <text x={laid.x + 10} y={laid.y + 20} className="dig-small">Test title {declaration.changeType.toLowerCase()}</text>
                  <text x={laid.x + 10} y={laid.y + 42} className="dig-note">{truncate(declaration.fullTitle, laid.maxChars)}</text>
                </g>
              );
            }
            const { testChange, firstAssertion, extraAssertions } = laid.card;
            const title = firstAssertion?.enclosingTestBlock ?? testChange.posixTestFilePath;
            return (
              <Pick
                key={laid.card.id}
                focus={{ kind: "test", id: laid.card.id }}
                label={`Test change: ${title}`}
                hint={`Test change: ${title}`}
                isActive={isFocused("test", laid.card.id)}
                isDimmed={lit !== null && !lit.tests.has(laid.card.id)}
                onPick={onPick}
                onHint={onHint}
              >
                <rect x={laid.x} y={laid.y} width={laid.width} height={laid.height} rx={4} className="dig-hit-solid dig-test-card" />
                <text x={laid.x + 10} y={laid.y + 20} className="dig-note">{truncate(title, laid.maxChars)}</text>
                {firstAssertion ? (
                  <>
                    <text x={laid.x + 10} y={laid.y + 42} className="dig-code dig-before">
                      − {truncate(firstAssertion.beforeAssertionText ?? "(no earlier assertion)", laid.maxChars - 2)}
                    </text>
                    <text x={laid.x + 10} y={laid.y + 62} className="dig-code dig-after">
                      + {truncate(firstAssertion.afterAssertionText ?? "(assertion removed)", laid.maxChars - 2)}
                    </text>
                  </>
                ) : (
                  <text x={laid.x + 10} y={laid.y + 42} className="dig-small">File changed, no assertion differences</text>
                )}
                {extraAssertions > 0 && (
                  <text x={laid.x + laid.width - 10} y={laid.y + 20} textAnchor="end" className="dig-small">+{extraAssertions} more</text>
                )}
              </Pick>
            );
          })}
        </g>
      ))}

      <rect x={layout.margin} y={layout.unknownTop} width={layout.width - layout.margin * 2} height={layout.unknownHeight} rx={4} fill="url(#dig-hatch)" />
      <rect x={layout.width / 2 - 300} y={layout.unknownTop + 14} width={600} height={34} rx={4} className="dig-canvas-fill" />
      <text x={layout.width / 2} y={layout.unknownTop + 36} textAnchor="middle" className="dig-note">
        Never dug: whether these tests ran, passed, or actually reach this code.
      </text>

      <g key={drillKey} className="dig-drill">
        {layout.probes.map((probe) => (
          <g key={probe.faultId} className={lit && !lit.faults.has(probe.faultId) ? "dig-dimmed" : ""} pointerEvents="none">
            <path d={`M${probe.x} ${probe.startY}V${probe.endY}`} fill="none" strokeWidth={2} strokeDasharray="3 5" className="dig-probe" />
            <circle cx={probe.x} cy={probe.endY + 6} r={6} strokeWidth={2} className="dig-probe-end" />
          </g>
        ))}

        {layout.shafts.map((laid) => {
          const { shaft } = laid;
          const labelWidth = shaft.status.length * 7.6 + 12;
          return (
            <Pick
              key={shaft.id}
              focus={{ kind: "shaft", id: shaft.id }}
              label={shaftLabel(shaft)}
              hint={`${shaft.status}: ${STATUS_MEANING[shaft.status]}`}
              isActive={isFocused("shaft", shaft.id)}
              isDimmed={!isShaftLit(laid)}
              onPick={onPick}
              onHint={onHint}
            >
              <path d={laid.path} fill="none" strokeWidth={20} className="dig-hit-line" />
              <ShaftStroke path={laid.path} status={shaft.status} />
              {shaft.end === "OPEN" && (
                <circle cx={laid.endX} cy={laid.endY + 6} r={6} strokeWidth={2} className="dig-probe-end" />
              )}
              <rect x={laid.labelX - labelWidth / 2} y={laid.labelY - 9} width={labelWidth} height={18} rx={3} className="dig-canvas-fill" />
              <text x={laid.labelX} y={laid.labelY + 4} textAnchor="middle" className="dig-status">{shaft.status}</text>
            </Pick>
          );
        })}
      </g>

      {/* File names sit above the shafts so a shaft passing through never crosses the text. */}
      {layout.files.map((file) => {
        const label = truncate(file.path, file.maxChars);
        return (
          <g key={file.path} pointerEvents="none">
            <rect x={file.x} y={file.y} width={label.length * 7.25 + 20} height={file.height} rx={3} style={{ fill: "var(--dig-test)" }} />
            <text x={file.x + 10} y={file.y + 16} className="dig-code">{label}</text>
          </g>
        );
      })}
    </svg>
  );
};
