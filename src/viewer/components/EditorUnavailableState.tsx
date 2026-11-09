import React from "react";
import { AlertOctagon, FileX2, Info, ArrowLeftRight } from "lucide-react";

export type UnavailableReason =
  | "FUNCTION_DELETED"
  | "FUNCTION_ABSENT"
  | "SOURCE_UNAVAILABLE"
  | "INITIALIZATION_FAILED"
  | "INCOMPLETE_ANALYSIS";

interface EditorUnavailableStateProps {
  readonly reason: UnavailableReason;
  readonly message?: string;
  readonly targetFunctionName?: string;
  readonly targetFilePath?: string;
  readonly baseSnippet?: string | null;
  readonly headSnippet?: string | null;
  readonly onRetry?: () => void;
}

export const EditorUnavailableState: React.FC<EditorUnavailableStateProps> = ({
  reason,
  message,
  targetFunctionName,
  targetFilePath,
  baseSnippet,
  headSnippet,
  onRetry,
}) => {
  const getHeader = () => {
    switch (reason) {
      case "FUNCTION_DELETED":
        return {
          title: "This function isn't in the newer version",
          subtitle: "It existed in the older version, and was deleted or renamed after that.",
          icon: <AlertOctagon size={24} strokeWidth={1.5} className="text-status-removed" />,
          statusBadge: "Removed",
          badgeClass: "text-status-removed bg-status-removed-bg border-status-removed-border",
        };
      case "FUNCTION_ABSENT":
        return {
          title: "This function isn't in the older version",
          subtitle: "It was added in the newer version.",
          icon: <Info size={24} strokeWidth={1.5} className="text-status-added" />,
          statusBadge: "New",
          badgeClass: "text-status-added bg-status-added-bg border-status-added-border",
        };
      case "INCOMPLETE_ANALYSIS":
        return {
          title: "This analysis is incomplete",
          subtitle: "The function's code couldn't be read from one or both versions.",
          icon: <AlertOctagon size={24} strokeWidth={1.5} className="text-status-modified" />,
          statusBadge: "Incomplete",
          badgeClass: "text-status-modified bg-status-modified-bg border-status-modified-border",
        };
      case "INITIALIZATION_FAILED":
        return {
          title: "The code comparison couldn't start",
          subtitle: "The code is shown as plain text below instead.",
          icon: <FileX2 size={24} strokeWidth={1.5} className="text-status-uncertain" />,
          statusBadge: "Plain text",
          badgeClass: "text-status-uncertain bg-status-uncertain-bg border-status-uncertain-border",
        };
      case "SOURCE_UNAVAILABLE":
      default:
        return {
          title: "No code in this report",
          subtitle: "The report doesn't include the function's code for either version.",
          icon: <FileX2 size={24} strokeWidth={1.5} className="text-text-muted" />,
          statusBadge: "No code",
          badgeClass: "text-text-muted bg-surface-elevated border-hairline",
        };
    }
  };

  const header = getHeader();

  return (
    <div className="flex flex-col h-full bg-ground p-4 overflow-y-auto">
      {/* Informational Banner */}
      <div className="rounded-md border border-hairline bg-panel p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-sm bg-surface-elevated border border-hairline">
              {header.icon}
            </div>
            <div>
              <h3 className="font-display font-semibold text-sm text-text-primary">
                {header.title}
              </h3>
              <p className="font-body text-xs text-text-secondary mt-0.5">
                {message ?? header.subtitle}
              </p>
            </div>
          </div>
          <span className={`font-sans text-xs font-semibold px-2 py-0.5 rounded-xs border ${header.badgeClass}`}>
            {header.statusBadge}
          </span>
        </div>

        {/* Entity Coordinates */}
        {(targetFunctionName || targetFilePath) && (
          <div className="pt-2 border-t border-hairline flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs text-text-secondary">
            {targetFunctionName && (
              <div>
                                <span className="text-text-primary font-medium">{targetFunctionName}</span>
              </div>
            )}
            {targetFilePath && (
              <div>
                                <span className="text-text-secondary">{targetFilePath}</span>
              </div>
            )}
          </div>
        )}

        {onRetry && (
          <div className="pt-2">
            <button
              type="button"
              onClick={onRetry}
              className="px-3 py-1 text-xs font-sans rounded-sm bg-surface-elevated hover:bg-surface-hover border border-border-interactive text-text-primary transition-colors"
            >
              Try again
            </button>
          </div>
        )}
      </div>

      {/* Available Snippet Fallback Panels (if partial snippets exist) */}
      {(baseSnippet || headSnippet) && (
        <div className="mt-4 space-y-3 font-sans text-xs">
          <div className="flex items-center space-x-1.5 text-text-secondary text-xs font-semibold">
            <ArrowLeftRight size={13} strokeWidth={1.5} />
            <span>Code from the report</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* BASE Snippet */}
            <div className="rounded-md border border-hairline bg-panel overflow-hidden">
              <div className="h-7 px-3 bg-surface-elevated border-b border-hairline flex items-center justify-between text-xs text-status-removed font-medium">
                <span>Before</span>
              </div>
              <pre className="p-3 text-xs font-mono text-text-primary overflow-x-auto bg-surface-code leading-relaxed">
                <code>{baseSnippet || "// Not in this version"}</code>
              </pre>
            </div>

            {/* HEAD Snippet */}
            <div className="rounded-md border border-hairline bg-panel overflow-hidden">
              <div className="h-7 px-3 bg-surface-elevated border-b border-hairline flex items-center justify-between text-xs text-status-added font-medium">
                <span>After</span>
              </div>
              <pre className="p-3 text-xs font-mono text-text-primary overflow-x-auto bg-surface-code leading-relaxed">
                <code>{headSnippet || "// Not in this version"}</code>
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

