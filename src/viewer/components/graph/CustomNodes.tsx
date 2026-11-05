/**
 * Change Archaeologist — Custom Graph Node Components
 *
 * Domain-specific forensic stratigraphy nodes rendered inside @xyflow/react.
 * Strictly derives visual elements from AnalysisReport data without inventing
 * intermediate history, synthetic dependencies, or runtime causality.
 */

import React, { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import {
  FileCode2,
  FileCheck,
  Tag,
  Layers,
} from "lucide-react";
import {
  GlyphMark,
  GlyphGuardClause,
  GlyphConditional,
  GlyphThrowStmt,
  GlyphReturnStmt,
  GlyphDeltaAdded,
  GlyphDeltaModified,
  GlyphDeltaRemoved,
  GlyphCorrStrong,
  GlyphCorrWeak,
  GlyphCorrUncertain,
  GlyphCorrNone,
  GlyphEvidencePin,
} from "../icons/ArchaeologistGlyphs.js";
import type { CorrelationGraphNodeData } from "../../types/index.js";
import { formatSpanCoordinates } from "../../utils/source-location.js";
import { Badge } from "../ui/Badge.js";

// Helper for structural category domain glyph
function getStructuralCategoryGlyph(category?: string) {
  const cat = (category ?? "").toUpperCase();
  if (cat.includes("GUARD")) {
    return <GlyphGuardClause size={13} className="text-status-modified shrink-0" />;
  }
  if (cat.includes("CONDITIONAL")) {
    return <GlyphConditional size={13} className="text-status-modified shrink-0" />;
  }
  if (cat.includes("THROW")) {
    return <GlyphThrowStmt size={13} className="text-status-modified shrink-0" />;
  }
  if (cat.includes("RETURN")) {
    return <GlyphReturnStmt size={13} className="text-status-modified shrink-0" />;
  }
  return <Layers size={13} className="text-status-modified shrink-0" />;
}

// Badge helper for change type with domain delta glyphs
function renderChangeBadge(changeType?: string) {
  if (!changeType) return null;
  const upper = changeType.toUpperCase();
  if (upper === "ADDED" || upper === "ADD") {
    return (
      <Badge variant="verdigris" className="text-[9px] px-1.5 py-0 font-semibold inline-flex items-center gap-1">
        <GlyphDeltaAdded size={10} className="shrink-0" />
        <span>[+] ADD</span>
      </Badge>
    );
  }
  if (upper === "MODIFIED" || upper === "MOD") {
    return (
      <Badge variant="terracotta" className="text-[9px] px-1.5 py-0 font-semibold inline-flex items-center gap-1">
        <GlyphDeltaModified size={10} className="shrink-0" />
        <span>[Δ] MOD</span>
      </Badge>
    );
  }
  if (upper === "REMOVED" || upper === "DELETED" || upper === "REM") {
    return (
      <Badge variant="amber" className="text-[9px] px-1.5 py-0 font-semibold inline-flex items-center gap-1">
        <GlyphDeltaRemoved size={10} className="shrink-0" />
        <span>[-] REM</span>
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-semibold">
      {changeType}
    </Badge>
  );
}

// Badge helper for correlation status with domain correlation glyphs
function renderCorrelationBadge(status?: string | null) {
  if (!status) return null;
  if (status === "STRONG") {
    return (
      <Badge variant="verdigris" className="text-[9px] px-1.5 py-0 font-semibold inline-flex items-center gap-1">
        <GlyphCorrStrong size={10} className="shrink-0" />
        <span>STRONG</span>
      </Badge>
    );
  }
  if (status === "WEAK") {
    return (
      <Badge variant="terracotta" className="text-[9px] px-1.5 py-0 font-semibold inline-flex items-center gap-1">
        <GlyphCorrWeak size={10} className="shrink-0" />
        <span>WEAK</span>
      </Badge>
    );
  }
  if (status === "UNCERTAIN") {
    return (
      <Badge variant="amber" className="text-[9px] px-1.5 py-0 font-semibold inline-flex items-center gap-1">
        <GlyphCorrUncertain size={10} className="shrink-0" />
        <span>UNCERTAIN</span>
      </Badge>
    );
  }
  if (status === "NONE") {
    return (
      <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-semibold inline-flex items-center gap-1 text-text-muted">
        <GlyphCorrNone size={10} className="shrink-0" />
        <span>NONE</span>
      </Badge>
    );
  }
  return null;
}

// Shared node base style supporting focus mode dimming and selected borders
function getNodeStyle(
  selected: boolean,
  isDimmed?: boolean,
  borderColor?: string,
  accentColor?: string
): React.CSSProperties {
  return {
    width: 250,
    minWidth: 250,
    maxWidth: 250,
    padding: "10px 12px",
    background: selected ? "var(--surface-elevated)" : "var(--surface-panel)",
    border: `1px solid ${selected ? (borderColor ?? "var(--text-accent)") : "var(--border-hairline)"}`,
    borderLeft: accentColor ? `3px solid ${accentColor}` : undefined,
    borderRadius: "3px",
    boxShadow: selected
      ? "0 0 0 2px rgba(196,82,26,0.22), 0 4px 12px rgba(90,70,50,0.12)"
      : "0 1px 3px rgba(90,70,50,0.08)",
    opacity: isDimmed ? 0.22 : 1,
    filter: isDimmed ? "grayscale(50%)" : undefined,
    transition: "border-color 150ms ease, box-shadow 150ms ease, opacity 200ms ease, filter 200ms ease",
    textAlign: "left" as const,
  };
}

// Handle style
const handleStyle: React.CSSProperties = {
  width: "8px",
  height: "8px",
  background: "var(--border-interactive)",
  border: "1px solid var(--surface-ground)",
  borderRadius: "1px",
};

// 1. Production Target Function Node (Central Anchor)
export const ProductionFunctionNode = memo(({ data, selected }: { data: CorrelationGraphNodeData; selected?: boolean }) => {
  const isDeleted = data.functionStatus === "DELETED";
  const spanStr = data.span ? formatSpanCoordinates(data.span) : null;

  return (
    <div
      role="treeitem"
      aria-label={`Target Function: ${data.title}`}
      style={{
        ...getNodeStyle(!!selected, data.isDimmed, "var(--text-accent)", "var(--text-accent)"),
        ...(isDeleted ? { borderColor: "var(--status-removed-border)", background: "var(--status-removed-bg)" } : {}),
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <GlyphMark size={13} className="text-text-accent shrink-0" />
          <span className="font-mono" style={{ fontSize: "9px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Target Entity
          </span>
        </div>
        {isDeleted ? (
          <span className="font-mono font-semibold" style={{ fontSize: "9px", padding: "1px 5px", borderRadius: "1px", color: "var(--status-removed-fg)", background: "var(--status-removed-bg)", border: "1px solid var(--status-removed-border)" }}>
            DELETED
          </span>
        ) : (
          <span className="font-mono" style={{ fontSize: "9px", padding: "1px 5px", borderRadius: "1px", color: "var(--text-muted)", background: "var(--surface-ground)", border: "1px solid var(--border-hairline)" }}>
            OBSERVED
          </span>
        )}
      </div>

      <div className="font-mono font-semibold truncate" style={{ fontSize: "12px", color: "var(--text-primary)" }} title={data.title}>
        {data.title}
      </div>
      <div className="font-mono truncate" style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px" }} title={data.filePath}>
        {data.filePath}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "8px", paddingTop: "6px", borderTop: "1px solid var(--border-hairline)" }}>
        <span className="font-mono" style={{ fontSize: "9px", color: "var(--text-muted)" }}>{spanStr ?? "File Scope"}</span>
        <span className="font-mono" style={{ fontSize: "9px", color: "var(--text-muted)", textTransform: "uppercase" }}>Production</span>
      </div>

      <Handle id="source-right" type="source" position={Position.Right} style={{ ...handleStyle, background: "var(--text-accent)" }} />
    </div>
  );
});

// 2. Structural Change Node (AST Mutation)
export const StructuralChangeNode = memo(({ data, selected }: { data: CorrelationGraphNodeData; selected?: boolean }) => {
  const spanStr = data.span ? formatSpanCoordinates(data.span) : null;
  const categoryGlyph = getStructuralCategoryGlyph(data.subtitle);

  return (
    <div
      role="treeitem"
      aria-label={`Structural Change: ${data.title}`}
      style={getNodeStyle(!!selected, data.isDimmed, "var(--status-modified-border)", "var(--status-modified-fg)")}
    >
      <Handle id="target-left" type="target" position={Position.Left} style={handleStyle} />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "5px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          {categoryGlyph}
          <span className="font-mono font-semibold" style={{ fontSize: "11px", color: "var(--text-primary)" }}>{data.title}</span>
        </div>
        {renderChangeBadge(data.changeType)}
      </div>

      <div className="font-mono truncate" style={{ fontSize: "10px", color: "var(--text-secondary)" }} title={data.subtitle}>
        {data.subtitle}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "7px", paddingTop: "5px", borderTop: "1px solid var(--border-hairline)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          {renderCorrelationBadge(data.correlationStatus) ?? (
            <span className="font-mono" style={{ fontSize: "9px", padding: "1px 5px", borderRadius: "1px", color: "var(--text-muted)", background: "var(--surface-ground)", border: "1px solid var(--border-hairline)" }}>
              UNLINKED
            </span>
          )}
          {spanStr && <span className="font-mono" style={{ fontSize: "9px", color: "var(--text-muted)", marginLeft: "2px" }}>{spanStr}</span>}
        </div>
        {data.evidenceIds.length > 0 && (
          <span className="font-mono font-semibold inline-flex items-center gap-1" style={{ fontSize: "9px", color: "var(--text-accent)" }} title={`${data.evidenceIds.length} Evidence Anchors`}>
            <GlyphEvidencePin size={10} className="shrink-0" />
            <span>{data.evidenceIds.length} EV</span>
          </span>
        )}
      </div>

      <Handle id="source-right" type="source" position={Position.Right} style={{ ...handleStyle, background: "var(--text-accent)" }} />
    </div>
  );
});

// 3. Test Change Node (Assertion or Block Mutation in Companion Test)
export const TestChangeNode = memo(({ data, selected }: { data: CorrelationGraphNodeData; selected?: boolean }) => {
  const spanStr = data.span ? formatSpanCoordinates(data.span) : null;

  return (
    <div
      role="treeitem"
      aria-label={`Test Change: ${data.title}`}
      style={getNodeStyle(!!selected, data.isDimmed, "var(--status-strong-border)", "var(--status-strong-fg)")}
    >
      <Handle id="target-left" type="target" position={Position.Left} style={{ ...handleStyle, background: "var(--status-strong-fg)" }} />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "5px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <FileCheck size={12} className="text-status-strong shrink-0" />
          <span className="font-mono font-semibold" style={{ fontSize: "11px", color: "var(--text-primary)" }}>{data.title}</span>
        </div>
        {renderChangeBadge(data.changeType)}
      </div>

      <div className="font-mono truncate" style={{ fontSize: "10px", color: "var(--text-secondary)" }} title={data.subtitle}>
        {data.subtitle}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "7px", paddingTop: "5px", borderTop: "1px solid var(--border-hairline)" }}>
        <span className="font-mono truncate" style={{ fontSize: "9px", color: "var(--text-muted)", maxWidth: "130px" }} title={data.filePath}>
          {data.filePath.split("/").pop()} {spanStr ? `(${spanStr})` : ""}
        </span>
        {data.evidenceIds.length > 0 && (
          <span className="font-mono font-semibold inline-flex items-center gap-1" style={{ fontSize: "9px", color: "var(--text-accent)" }} title={`${data.evidenceIds.length} Evidence Anchors`}>
            <GlyphEvidencePin size={10} className="shrink-0" />
            <span>{data.evidenceIds.length} EV</span>
          </span>
        )}
      </div>

      <Handle id="target-right" type="target" position={Position.Right} style={handleStyle} />
    </div>
  );
});

// 4. Test Declaration Node (Test Block / Suite Header)
export const TestDeclarationNode = memo(({ data, selected }: { data: CorrelationGraphNodeData; selected?: boolean }) => {
  const spanStr = data.span ? formatSpanCoordinates(data.span) : null;

  return (
    <div
      role="treeitem"
      aria-label={`Test Declaration: ${data.title}`}
      style={getNodeStyle(!!selected, data.isDimmed, "var(--status-weak-border)", "var(--status-weak-fg)")}
    >
      <Handle id="target-left" type="target" position={Position.Left} style={{ ...handleStyle, background: "var(--status-weak-fg)" }} />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "5px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <Tag size={12} className="text-status-weak shrink-0" />
          <span className="font-mono font-semibold" style={{ fontSize: "11px", color: "var(--text-primary)" }}>{data.title}</span>
        </div>
        {renderChangeBadge(data.changeType)}
      </div>

      <div
        className="font-mono"
        style={{ fontSize: "10px", color: "var(--text-secondary)", lineHeight: 1.4, display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 2, overflow: "hidden" }}
        title={data.subtitle}
      >
        {data.subtitle}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "7px", paddingTop: "5px", borderTop: "1px solid var(--border-hairline)" }}>
        <span className="font-mono" style={{ fontSize: "9px", color: "var(--text-muted)" }}>{spanStr ?? "Declaration"}</span>
        <span className="font-mono" style={{ fontSize: "9px", color: "var(--text-muted)", textTransform: "uppercase" }}>Test Block</span>
      </div>

      <Handle id="target-right" type="target" position={Position.Right} style={handleStyle} />
    </div>
  );
});

// 5. Test File Node (Companion Test Suite Root)
export const TestFileNode = memo(({ data, selected }: { data: CorrelationGraphNodeData; selected?: boolean }) => {
  return (
    <div
      role="treeitem"
      aria-label={`Test File: ${data.title}`}
      style={getNodeStyle(!!selected, data.isDimmed, "var(--status-strong-border)", "var(--status-strong-fg)")}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <FileCode2 size={12} className="text-status-strong shrink-0" />
          <span className="font-mono" style={{ fontSize: "9px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Companion Suite
          </span>
        </div>
        {renderChangeBadge(data.changeType)}
      </div>

      <div className="font-mono font-semibold truncate" style={{ fontSize: "12px", color: "var(--text-primary)" }} title={data.title}>
        {data.title}
      </div>
      <div className="font-mono truncate" style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px" }} title={data.filePath}>
        {data.filePath}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "8px", paddingTop: "6px", borderTop: "1px solid var(--border-hairline)" }}>
        <span className="font-mono" style={{ fontSize: "9px", color: "var(--text-muted)" }}>Syntactic Co-occurrence</span>
        <span className="font-mono" style={{ fontSize: "9px", color: "var(--text-muted)", textTransform: "uppercase" }}>Suite Root</span>
      </div>

      <Handle id="source-left" type="source" position={Position.Left} style={handleStyle} />
    </div>
  );
});
