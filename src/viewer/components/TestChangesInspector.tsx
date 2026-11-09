import React from "react";
import type { TestChange, TestDeclarationChange } from "../types/index.js";
import { ASSERTION_CHANGE_LABEL, formatLines, humanizeEnum } from "../utils/labels.js";

interface TestChangesInspectorProps {
  readonly testChanges: readonly TestChange[];
  readonly declarationChanges?: readonly TestDeclarationChange[];
  readonly selectedId: string | null;
  readonly onSelectChange: (id: string) => void;
}

export const TestChangesInspector: React.FC<TestChangesInspectorProps> = ({
  testChanges,
  declarationChanges = [],
  selectedId,
  onSelectChange,
}) => (
  <section aria-labelledby="test-changes-heading" className="space-y-2">
    <h2 id="test-changes-heading" className="m-0 text-base font-semibold text-text-primary">
      Test changes <span className="font-normal text-text-secondary tabular-nums">{testChanges.length}</span>
    </h2>

    {testChanges.length === 0 && (
      <p className="m-0 text-sm text-text-secondary">
        No test changes in this report. That does not mean the code is untested.
      </p>
    )}

    {testChanges.map((test) => {
      const isSelected = selectedId === test.id;
      return (
        <button
          key={test.id}
          type="button"
          onClick={() => onSelectChange(test.id)}
          aria-pressed={isSelected}
          className={`w-full p-3 rounded-md border text-left transition-colors duration-fast focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus ${
            isSelected ? "bg-surface-elevated border-border-focus" : "bg-panel border-hairline hover:bg-surface-hover"
          }`}
        >
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-secondary">
            <span className="font-mono text-sm font-medium text-text-primary break-all">{test.posixTestFilePath}</span>
            <span className="font-mono ml-auto">{test.id}</span>
          </span>

          {test.assertionChanges.length === 0 && (
            <span className="block mt-1.5 text-sm text-text-secondary">The file changed, with no assertion differences found.</span>
          )}

          {test.assertionChanges.map((assertion, index) => (
            <span key={index} className="block mt-2 space-y-1">
              <span className="block text-sm font-medium text-text-primary">
                {assertion.enclosingTestBlock ?? "Outside any test block"}
              </span>
              <span className="block text-xs text-text-secondary">
                {ASSERTION_CHANGE_LABEL[assertion.changeType]} ·{" "}
                {assertion.callsTargetFunctionInBlock ? "calls this function directly" : "doesn't call this function directly"}
              </span>
              {assertion.beforeAssertionText && (
                <code className="block font-mono text-xs text-status-removed break-words">− {assertion.beforeAssertionText}</code>
              )}
              {assertion.afterAssertionText && (
                <code className="block font-mono text-xs text-status-added break-words">+ {assertion.afterAssertionText}</code>
              )}
            </span>
          ))}
        </button>
      );
    })}

    {declarationChanges.length > 0 && (
      <div className="pt-2 space-y-1.5">
        <h3 className="m-0 text-sm font-semibold text-text-primary">Test titles that changed</h3>
        {declarationChanges.map((declaration) => (
          <div key={declaration.id} className="p-2.5 rounded-md border border-hairline text-sm text-text-secondary">
            <span className="font-medium text-text-primary">{declaration.fullTitle}</span>
            <span className="block mt-0.5 text-xs">
              {humanizeEnum(declaration.changeType)} in <span className="font-mono">{declaration.posixTestFilePath}</span>
              {formatLines(declaration.afterSpan) ? `, ${formatLines(declaration.afterSpan)?.toLowerCase()}` : ""}
            </span>
          </div>
        ))}
      </div>
    )}
  </section>
);
