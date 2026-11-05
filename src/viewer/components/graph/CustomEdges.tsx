/**
 * Change Archaeologist — Custom Graph Edge Components
 *
 * Renders containment and analytical correlation edges between production
 * AST mutations and companion test changes inside @xyflow/react.
 */

import React, { memo } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  getSmoothStepPath,
  type EdgeProps,
} from "@xyflow/react";
import {
  GlyphCorrStrong,
  GlyphCorrWeak,
  GlyphCorrUncertain,
  GlyphCorrNone,
} from "../icons/ArchaeologistGlyphs.js";
import type { CorrelationGraphEdgeData } from "../../types/index.js";

// Helper for status stroke color in Evidence Atlas palette
function getStatusStroke(status: string | null): string {
  switch (status) {
    case "STRONG":
      return "#1A5C2E"; // archival forest green
    case "WEAK":
      return "#5C3D99"; // archival purple
    case "UNCERTAIN":
      return "#9E6B00"; // archival ochre
    case "NONE":
    default:
      return "#8A7560"; // warm muted ink
  }
}

function getStatusBadgeStyle(status: string | null): React.CSSProperties {
  switch (status) {
    case "STRONG":
      return {
        color: "var(--status-strong-fg)",
        background: "var(--surface-panel)",
        border: "1px solid var(--status-strong-border)",
      };
    case "WEAK":
      return {
        color: "var(--status-weak-fg)",
        background: "var(--surface-panel)",
        border: "1px solid var(--status-weak-border)",
      };
    case "UNCERTAIN":
      return {
        color: "var(--status-uncertain-fg)",
        background: "var(--surface-panel)",
        border: "1px solid var(--status-uncertain-border)",
      };
    case "NONE":
    default:
      return {
        color: "var(--text-muted)",
        background: "var(--surface-panel)",
        border: "1px solid var(--border-hairline)",
      };
  }
}

function renderStatusGlyph(status: string | null) {
  switch (status) {
    case "STRONG":
      return <GlyphCorrStrong size={12} className="shrink-0 text-status-strong" />;
    case "WEAK":
      return <GlyphCorrWeak size={12} className="shrink-0 text-status-weak" />;
    case "UNCERTAIN":
      return <GlyphCorrUncertain size={12} className="shrink-0 text-status-uncertain" />;
    case "NONE":
    default:
      return <GlyphCorrNone size={12} className="shrink-0 text-text-muted" />;
  }
}

function formatClassification(classification?: string | null): string {
  if (!classification) return "";
  switch (classification) {
    case "POTENTIALLY_RELATED_ASSERTION_MODIFIED":
      return "Assertion Modified";
    case "POTENTIALLY_RELATED_ASSERTION_ADDED":
      return "Assertion Added";
    case "POTENTIALLY_RELATED_ASSERTION_REMOVED":
      return "Assertion Removed";
    case "POTENTIALLY_RELATED_TEST_DECLARATION_CHANGED":
      return "Declaration Changed";
    case "TEMPORAL_CO_OCCURRENCE_ONLY":
      return "Temporal Co-occurrence";
    case "UNMODIFIED_COMPANION_TEST":
      return "Unmodified Companion";
    case "NO_TEST_CHANGES_OBSERVED":
      return "No Test Changes";
    case "NO_PRODUCTION_CHANGES_OBSERVED":
      return "No Production Changes";
    case "AMBIGUOUS_OR_UNRESOLVED":
      return "Ambiguous Match";
    default:
      return classification.replace(/_/g, " ").toLowerCase();
  }
}

// 1. Structural Containment Edge (Function -> Mutation, TestFile -> TestChange)
export const ContainmentEdge = memo((props: EdgeProps) => {
  const edgeData = props.data as unknown as CorrelationGraphEdgeData | undefined;
  const isDimmed = edgeData?.isDimmed;

  const [edgePath] = getSmoothStepPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    sourcePosition: props.sourcePosition,
    targetX: props.targetX,
    targetY: props.targetY,
    targetPosition: props.targetPosition,
    borderRadius: 8,
  });

  return (
    <BaseEdge
      path={edgePath}
      style={{
        stroke: "rgba(90, 70, 50, 0.28)",
        strokeWidth: 1.5,
        opacity: isDimmed ? 0.12 : 1,
        transition: "opacity 200ms ease",
      }}
    />
  );
});

// 2. Cross-Side Correlation Edge (Structural Change <-> Test Change)
export const CorrelationEdge = memo((props: EdgeProps) => {
  const edgeData = props.data as unknown as CorrelationGraphEdgeData | undefined;
  const status = edgeData?.status ?? "NONE";
  const strokeColor = getStatusStroke(status);
  const isUncertain = status === "UNCERTAIN";
  const isNone = status === "NONE";
  const isDimmed = edgeData?.isDimmed;

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    sourcePosition: props.sourcePosition,
    targetX: props.targetX,
    targetY: props.targetY,
    targetPosition: props.targetPosition,
    curvature: 0.28,
  });

  return (
    <>
      {/* Invisible wide hitbox for comfortable selection */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={24}
        className="cursor-pointer"
      />

      <BaseEdge
        path={edgePath}
        style={{
          stroke: props.selected ? "var(--text-accent)" : strokeColor,
          strokeWidth: props.selected ? 3.5 : status === "STRONG" ? 2.5 : 2,
          strokeDasharray: isUncertain ? "6 4" : isNone ? "3 3" : undefined,
          filter: props.selected ? "drop-shadow(0 0 6px rgba(196, 82, 26, 0.45))" : undefined,
          opacity: isDimmed ? 0.12 : 1,
          transition: "opacity 200ms ease, stroke-width 150ms ease",
        }}
      />

      {edgeData && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: "all",
              opacity: isDimmed ? 0.15 : 1,
              transition: "opacity 200ms ease",
            }}
            className="nodrag nopan"
          >
            <button
              type="button"
              aria-label={`Correlation: ${edgeData.label}`}
              style={{
                ...getStatusBadgeStyle(status),
                boxShadow: "0 2px 6px rgba(90, 70, 50, 0.12)",
                ...(props.selected ? { outline: "2px solid var(--border-focus)", outlineOffset: "1px" } : {}),
              }}
              className="px-2 py-1 rounded-xs font-mono text-[9px] font-semibold transition-all cursor-pointer flex flex-col items-center gap-0.5 select-none hover:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
              title={`${edgeData.rationale ?? edgeData.label} (${edgeData.classification ?? "Analytical Link"})`}
            >
              <div className="flex items-center gap-1">
                {renderStatusGlyph(status)}
                <span>{edgeData.label}</span>
              </div>
              {edgeData.classification && (
                <span className="text-[8px] font-normal opacity-85 uppercase tracking-tight">
                  {formatClassification(edgeData.classification)}
                </span>
              )}
            </button>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});
