import React, { useState } from "react";
import type { StructuralChange } from "../types/index.js";
import {
  GlyphDeltaAdded,
  GlyphDeltaModified,
  GlyphDeltaRemoved,
} from "./icons/ArchaeologistGlyphs.js";
import { CHANGE_CATEGORY_LABEL, CHANGE_TYPE_LABEL, formatLines } from "../utils/labels.js";

interface StructuralChangeExplorerProps {
  readonly structuralChanges: readonly StructuralChange[];
  readonly selectedId: string | null;
  readonly onSelectChange: (id: string) => void;
}

const TYPE_GLYPH = {
  ADDED: <GlyphDeltaAdded size={14} className="text-status-added shrink-0" />,
  REMOVED: <GlyphDeltaRemoved size={14} className="text-status-removed shrink-0" />,
  MODIFIED: <GlyphDeltaModified size={14} className="text-status-modified shrink-0" />,
};

const selectClass =
  "h-7 px-1.5 max-w-full bg-transparent border border-border-interactive rounded-sm text-xs text-text-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus";

export const StructuralChangeExplorer: React.FC<StructuralChangeExplorerProps> = ({
  structuralChanges,
  selectedId,
  onSelectChange,
}) => {
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");

  const filtered = structuralChanges.filter(
    (change) =>
      (categoryFilter === "ALL" || change.category === categoryFilter) &&
      (typeFilter === "ALL" || change.changeType === typeFilter)
  );

  return (
    <section aria-labelledby="code-changes-heading" className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="code-changes-heading" className="m-0 text-base font-semibold text-text-primary">
          Code changes <span className="font-normal text-text-secondary tabular-nums">{structuralChanges.length}</span>
        </h2>
        {structuralChanges.length > 1 && (
          <div className="flex flex-wrap gap-2">
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} aria-label="Filter by kind of change" className={selectClass}>
              <option value="ALL">All kinds</option>
              {Object.entries(CHANGE_CATEGORY_LABEL).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} aria-label="Filter by added, changed or removed" className={selectClass}>
              <option value="ALL">Added, changed, removed</option>
              {Object.entries(CHANGE_TYPE_LABEL).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {structuralChanges.length === 0 ? (
        <p className="m-0 text-sm text-text-secondary">No structural changes were found in this function.</p>
      ) : filtered.length === 0 ? (
        <p className="m-0 text-sm text-text-secondary">No changes match these filters.</p>
      ) : (
        filtered.map((change) => {
          const isSelected = selectedId === change.id;
          const lines = formatLines(change.afterSpan ?? change.beforeSpan);
          return (
            <button
              key={change.id}
              type="button"
              onClick={() => onSelectChange(change.id)}
              aria-pressed={isSelected}
              className={`w-full p-3 rounded-md border text-left transition-colors duration-fast focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus ${
                isSelected ? "bg-surface-elevated border-border-focus" : "bg-panel border-hairline hover:bg-surface-hover"
              }`}
            >
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-secondary">
                {TYPE_GLYPH[change.changeType]}
                <span className="font-semibold text-text-primary">
                  {CHANGE_TYPE_LABEL[change.changeType]}: {CHANGE_CATEGORY_LABEL[change.category].toLowerCase()}
                </span>
                {lines && <span>{lines}</span>}
                <span className="font-mono ml-auto">{change.id}</span>
              </span>
              <span className="block mt-1.5 text-sm text-text-secondary leading-relaxed">{change.summary}</span>
            </button>
          );
        })
      )}
    </section>
  );
};
