import React from "react";
import { FileCheck, CheckCircle2, AlertCircle, ArrowRight, CornerDownRight } from "lucide-react";
import type { TestChange, TestDeclarationChange } from "../types/index.js";

interface TestChangesInspectorProps {
  readonly testChanges: readonly TestChange[];
  readonly declarationChanges?: readonly TestDeclarationChange[];
  readonly selectedId: string | null;
  readonly onSelectChange: (id: string) => void;
}

export const TestChangesInspector: React.FC<TestChangesInspectorProps> = ({
  testChanges,
  declarationChanges,
  selectedId,
  onSelectChange,
}) => {
  if (testChanges.length === 0) {
    return (
      <div className="p-8 text-center text-xs font-mono text-text-muted border border-hairline rounded-md bg-panel m-4">
        Zero companion test changes detected across the analyzed revision range.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-ground overflow-y-auto p-3 space-y-3">
      {/* Plain-English Explanation Banner */}
      <div className="rounded-sm bg-panel border border-hairline p-2.5 flex items-center justify-between text-xs font-mono text-text-secondary">
        <div className="flex items-center space-x-2">
          <FileCheck size={14} className="text-status-strong shrink-0" />
          <span className="text-[11px] leading-normal font-body">
            <strong className="text-text-primary font-sans font-semibold">Related Tests (Companion Tests):</strong> Test files committed in the same revision range. Inspect the assertions below to see if tests were updated to test the modified production function.
          </span>
        </div>
      </div>

      {/* Test Declaration Changes Section (if present) */}
      {declarationChanges && declarationChanges.length > 0 && (
        <div className="rounded-md border border-hairline p-3 bg-panel space-y-2">
          <div className="flex items-center justify-between pb-1.5 border-b border-hairline">
            <span className="font-mono text-xs font-semibold text-text-primary">
              Test Block Declaration Mutations ({declarationChanges.length})
            </span>
            <span className="font-mono text-[10px] text-text-muted">
              describe / it block title changes
            </span>
          </div>
          <div className="space-y-1.5">
            {declarationChanges.map((tdc) => (
              <div
                key={tdc.id}
                className="p-2 rounded-sm bg-ground border border-hairline text-xs font-mono space-y-1"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-medium text-text-primary">{tdc.id}: {tdc.fullTitle}</span>
                  <span className="px-1.5 py-0.2 rounded-xs bg-surface-elevated text-text-secondary text-[10px]">
                    {tdc.changeType}
                  </span>
                </div>
                {tdc.beforeDescription && tdc.afterDescription && tdc.beforeDescription !== tdc.afterDescription && (
                  <div className="text-[10px] text-text-muted">
                    <span>"{tdc.beforeDescription}"</span> → <span className="text-text-accent">"{tdc.afterDescription}"</span>
                  </div>
                )}
                <div className="text-[10px] text-text-muted">
                  {tdc.posixTestFilePath}
                  {tdc.afterSpan && ` (L${tdc.afterSpan.startLine}:C${tdc.afterSpan.startColumn})`}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {testChanges.map((tc) => {
        const isSelected = selectedId === tc.id;

        return (
          <div
            key={tc.id}
            onClick={() => onSelectChange(tc.id)}
            role="button"
            tabIndex={0}
            aria-selected={isSelected}
            aria-label={`Test file change ${tc.posixTestFilePath}, status ${tc.fileChangeStatus}`}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelectChange(tc.id);
              }
            }}
            className={`rounded-md border p-3 bg-panel transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus ${
              isSelected ? "border-border-focus ring-1 ring-border-focus bg-surface-elevated" : "border-hairline hover:border-border-interactive hover:bg-surface-hover"
            }`}
          >
            {/* File Header */}
            <div className="flex items-center justify-between pb-2 border-b border-hairline">
              <div className="flex items-center space-x-2">
                <FileCheck size={14} strokeWidth={1.5} className="text-text-accent" />
                <span className="font-mono text-xs font-semibold text-text-primary">
                  {tc.posixTestFilePath}
                </span>
                <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-xs bg-surface-elevated border border-hairline text-text-secondary">
                  {tc.fileChangeStatus}
                </span>
              </div>
              <div className="flex items-center space-x-2 font-mono text-[11px] text-text-muted">
                {tc.mentionsTargetFunction && (
                  <span className="text-status-strong text-[10px]">Mentions Function</span>
                )}
                <span>{tc.assertionChanges.length} assertions</span>
              </div>
            </div>

            {/* Assertion Changes */}
            <div className="mt-3 space-y-2">
              {tc.assertionChanges.length === 0 ? (
                <div className="text-xs font-mono text-text-muted italic py-1">
                  File modified without detected assertion diffs in target scope.
                </div>
              ) : (
                tc.assertionChanges.map((ast, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-sm bg-ground border border-hairline text-xs font-mono space-y-1.5"
                  >
                    {/* Enclosing Block Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5 text-text-secondary">
                        <CornerDownRight size={12} strokeWidth={1.5} className="text-text-muted" />
                        <span className="font-medium truncate max-w-md">
                          {ast.enclosingTestBlock ?? "Top-level block"}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        {ast.callsTargetFunctionInBlock ? (
                          <span className="text-[10px] font-semibold text-status-strong bg-status-strong-bg border border-status-strong-border px-1.5 py-0.2 rounded-xs">
                            Calls Target Fn
                          </span>
                        ) : (
                          <span className="text-[10px] text-text-muted bg-surface-elevated px-1 py-0.2 rounded-xs">
                            Indirect Call
                          </span>
                        )}
                        <span className="text-[10px] px-1 py-0.2 rounded-xs bg-surface-elevated text-text-muted">
                          {ast.changeType}
                        </span>
                      </div>
                    </div>

                    {/* Assertion Text Diff */}
                    <div className="pt-1 space-y-1">
                      {ast.beforeAssertionText && (
                        <div className="px-2 py-1 rounded-xs bg-status-removed-bg border border-status-removed-border text-status-removed text-[11px] font-mono truncate">
                          - {ast.beforeAssertionText}
                        </div>
                      )}
                      {ast.afterAssertionText && (
                        <div className="px-2 py-1 rounded-xs bg-status-added-bg border border-status-added-border text-status-added text-[11px] font-mono truncate">
                          + {ast.afterAssertionText}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

