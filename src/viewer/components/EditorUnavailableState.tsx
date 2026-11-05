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
          title: "Target Function Removed in HEAD",
          subtitle: "The target function existed in the BASE revision but was deleted or renamed in HEAD.",
          icon: <AlertOctagon size={24} strokeWidth={1.5} className="text-status-removed" />,
          statusBadge: "DELETED IN HEAD",
          badgeClass: "text-status-removed bg-status-removed-bg border-status-removed-border",
        };
      case "FUNCTION_ABSENT":
        return {
          title: "Target Function Absent in BASE",
          subtitle: "The target function was introduced in the HEAD revision and does not exist in BASE.",
          icon: <Info size={24} strokeWidth={1.5} className="text-status-added" />,
          statusBadge: "INTRODUCED IN HEAD",
          badgeClass: "text-status-added bg-status-added-bg border-status-added-border",
        };
      case "INCOMPLETE_ANALYSIS":
        return {
          title: "Incomplete Analysis Report",
          subtitle: "AST function snapshots were not preserved due to upstream parse or revision limitations.",
          icon: <AlertOctagon size={24} strokeWidth={1.5} className="text-status-modified" />,
          statusBadge: "INCOMPLETE ANALYSIS",
          badgeClass: "text-status-modified bg-status-modified-bg border-status-modified-border",
        };
      case "INITIALIZATION_FAILED":
        return {
          title: "Editor Engine Unavailable",
          subtitle: "Monaco could not initialize. Plaintext fallback code snippets are rendered below.",
          icon: <FileX2 size={24} strokeWidth={1.5} className="text-status-uncertain" />,
          statusBadge: "FALLBACK VIEW",
          badgeClass: "text-status-uncertain bg-status-uncertain-bg border-status-uncertain-border",
        };
      case "SOURCE_UNAVAILABLE":
      default:
        return {
          title: "Source Code Unavailable",
          subtitle: "Neither BASE nor HEAD function bodies were recorded in the analysis report.",
          icon: <FileX2 size={24} strokeWidth={1.5} className="text-text-muted" />,
          statusBadge: "NO SOURCE PRESERVED",
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
          <span className={`font-mono text-[10px] font-semibold px-2 py-0.5 rounded-xs border ${header.badgeClass}`}>
            [{header.statusBadge}]
          </span>
        </div>

        {/* Entity Coordinates */}
        {(targetFunctionName || targetFilePath) && (
          <div className="pt-2 border-t border-hairline flex items-center space-x-4 font-mono text-xs text-text-muted">
            {targetFunctionName && (
              <div>
                <span className="text-text-muted">Function: </span>
                <span className="text-text-primary font-medium">{targetFunctionName}</span>
              </div>
            )}
            {targetFilePath && (
              <div>
                <span className="text-text-muted">Path: </span>
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
              className="px-3 py-1 text-xs font-mono rounded-sm bg-surface-elevated hover:bg-surface-hover border border-border-interactive text-text-primary transition-colors"
            >
              Retry Editor Initialization
            </button>
          </div>
        )}
      </div>

      {/* Available Snippet Fallback Panels (if partial snippets exist) */}
      {(baseSnippet || headSnippet) && (
        <div className="mt-4 space-y-3 font-mono text-xs">
          <div className="flex items-center space-x-1.5 text-text-muted text-[11px] font-semibold uppercase">
            <ArrowLeftRight size={13} strokeWidth={1.5} />
            <span>Preserved Textual Snippets (Plain Text Fallback)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* BASE Snippet */}
            <div className="rounded-md border border-hairline bg-panel overflow-hidden">
              <div className="h-7 px-3 bg-surface-elevated border-b border-hairline flex items-center justify-between text-[11px] text-status-removed font-medium">
                <span>[-] BASE Revision Content</span>
              </div>
              <pre className="p-3 text-[11px] font-mono text-text-primary overflow-x-auto bg-surface-code leading-relaxed">
                <code>{baseSnippet || "// (absent in BASE)"}</code>
              </pre>
            </div>

            {/* HEAD Snippet */}
            <div className="rounded-md border border-hairline bg-panel overflow-hidden">
              <div className="h-7 px-3 bg-surface-elevated border-b border-hairline flex items-center justify-between text-[11px] text-status-added font-medium">
                <span>[+] HEAD Revision Content</span>
              </div>
              <pre className="p-3 text-[11px] font-mono text-text-primary overflow-x-auto bg-surface-code leading-relaxed">
                <code>{headSnippet || "// (absent in HEAD)"}</code>
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

