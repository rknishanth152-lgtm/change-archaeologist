import React, { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { DiffEditor, loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import type { editor } from "monaco-editor";
import type { AnalysisReport, StructuralChange, EvidenceItem } from "../types/index.js";
import {
  extractFunctionSource,
  detectSourceLanguage,
  translateSpanRelativeToFunction,
  translateSpanToEditorRange,
  type EditorRange,
} from "../utils/source-location.js";
import { CodeComparisonToolbar, type DiffRenderMode } from "./CodeComparisonToolbar.js";
import { EditorUnavailableState, type UnavailableReason } from "./EditorUnavailableState.js";

// Ensure Monaco runs completely local-first without external CDN network requests
loader.config({ monaco });

// Register custom Evidence Atlas theme matching DESIGN.md
export const THEME_NAME = "change-archaeologist-atlas";

let themeRegistered = false;
export function registerEditorTheme(monacoInstance: typeof monaco): void {
  if (themeRegistered) return;
  try {
    if (typeof window !== "undefined" && !window.matchMedia) {
      window.matchMedia = ((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      })) as any;
    }

    monacoInstance.editor.defineTheme(THEME_NAME, {
      base: "vs",
      inherit: true,
      rules: [
        { token: "", background: "F9F4EC", foreground: "1C1409" },
        { token: "comment", foreground: "8A7560", fontStyle: "italic" },
        { token: "keyword", foreground: "C4521A", fontStyle: "bold" },
        { token: "string", foreground: "2E7D32" },
        { token: "number", foreground: "E65100" },
        { token: "type", foreground: "5C3D99" },
        { token: "identifier", foreground: "1C1409" },
        { token: "delimiter", foreground: "4A3728" },
      ],
      colors: {
        "editor.background": "#F9F4EC",
        "editor.foreground": "#1C1409",
        "editorLineNumber.foreground": "#8A7560",
        "editorLineNumber.activeForeground": "#1C1409",
        "editorGutter.background": "#F9F4EC",
        "editor.lineHighlightBackground": "#EDE8DF",
        "editor.selectionBackground": "rgba(196, 82, 26, 0.18)",
        "diffEditor.insertedTextBackground": "rgba(46, 125, 50, 0.16)",
        "diffEditor.removedTextBackground": "rgba(183, 28, 28, 0.16)",
        "diffEditor.insertedLineBackground": "rgba(46, 125, 50, 0.08)",
        "diffEditor.removedLineBackground": "rgba(183, 28, 28, 0.08)",
        "diffEditor.diagonalFill": "rgba(90, 70, 50, 0.06)",
        "editorOverviewRuler.border": "rgba(90, 70, 50, 0.15)",
      },
    });
    // Also define legacy theme alias for safety
    monacoInstance.editor.defineTheme("change-archaeologist-dark", {
      base: "vs",
      inherit: true,
      rules: [],
      colors: {
        "editor.background": "#F9F4EC",
        "editor.foreground": "#1C1409",
      },
    });
    themeRegistered = true;
  } catch {
    // Graceful fallback in non-browser/test environments
  }
}

interface CodeComparisonProps {
  readonly report: AnalysisReport;
  readonly selectedChange: StructuralChange | null;
  readonly selectedEvidence: EvidenceItem | null;
  readonly evidenceList: readonly EvidenceItem[];
  readonly onSelectEvidence: (evidenceId: string) => void;
}

export const CodeComparison: React.FC<CodeComparisonProps> = ({
  report,
  selectedChange,
  selectedEvidence,
  evidenceList,
  onSelectEvidence,
}) => {
  const [diffMode, setDiffMode] = useState<DiffRenderMode>("side-by-side");
  const [isCopied, setIsCopied] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  const diffEditorRef = useRef<editor.IStandaloneDiffEditor | null>(null);
  const originalDecorationsRef = useRef<string[]>([]);
  const modifiedDecorationsRef = useRef<string[]>([]);

  // Extract base and head sources from FunctionDescriptors
  const baseResult = useMemo(() => extractFunctionSource(report.baseFunction), [report.baseFunction]);
  const headResult = useMemo(() => extractFunctionSource(report.headFunction), [report.headFunction]);

  const language = useMemo(
    () => detectSourceLanguage(report.request.targetFilePath),
    [report.request.targetFilePath]
  );

  // Determine if function is deleted or absent
  const unavailableReason = useMemo<UnavailableReason | null>(() => {
    if (initError) return "INITIALIZATION_FAILED";
    if (report.status.startsWith("INCOMPLETE") && !baseResult.isAvailable && !headResult.isAvailable) {
      return "INCOMPLETE_ANALYSIS";
    }
    if (baseResult.isDeleted) return "FUNCTION_ABSENT";
    if (headResult.isDeleted) return "FUNCTION_DELETED";
    if (!baseResult.isAvailable && !headResult.isAvailable) return "SOURCE_UNAVAILABLE";
    return null;
  }, [initError, report.status, baseResult, headResult]);

  // Active span to highlight
  const activeSpan = useMemo(() => {
    if (selectedEvidence?.span) return selectedEvidence.span;
    if (selectedChange?.afterSpan) return selectedChange.afterSpan;
    if (selectedChange?.beforeSpan) return selectedChange.beforeSpan;
    return null;
  }, [selectedEvidence, selectedChange]);

  // Handle Copy
  const handleCopySource = useCallback(() => {
    const textToCopy = headResult.source || baseResult.source;
    if (!textToCopy) return;

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(textToCopy).catch(() => {});
    }
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  }, [headResult.source, baseResult.source]);

  // Monaco Editor Theme Initialization Callback
  const handleEditorBeforeMount = (monacoInstance: typeof monaco) => {
    registerEditorTheme(monacoInstance);
  };

  // Monaco Editor Mounting Callback
  const handleEditorDidMount = (diffEditor: editor.IStandaloneDiffEditor) => {
    diffEditorRef.current = diffEditor;
    applyEvidenceDecorations();
  };

  // Synchronize decorations and cursor position with active evidence/span
  const applyEvidenceDecorations = useCallback(() => {
    const diffEditor = diffEditorRef.current;
    if (!diffEditor) return;

    const originalEditor = diffEditor.getOriginalEditor();
    const modifiedEditor = diffEditor.getModifiedEditor();

    // Determine target span for BASE (original) vs HEAD (modified)
    let baseRange: EditorRange | null = null;
    let headRange: EditorRange | null = null;

    if (selectedEvidence) {
      if (selectedEvidence.commitRole === "BASE") {
        baseRange = translateSpanRelativeToFunction(selectedEvidence.span, baseResult.span);
      } else {
        headRange = translateSpanRelativeToFunction(selectedEvidence.span, headResult.span);
      }
    } else if (selectedChange) {
      if (selectedChange.beforeSpan) {
        baseRange = translateSpanRelativeToFunction(selectedChange.beforeSpan, baseResult.span);
      }
      if (selectedChange.afterSpan) {
        headRange = translateSpanRelativeToFunction(selectedChange.afterSpan, headResult.span);
      }
    }

    // Apply decorations to Original (BASE) Editor
    if (originalEditor && baseRange) {
      const monacoRange = new monaco.Range(
        baseRange.startLineNumber,
        baseRange.startColumn,
        baseRange.endLineNumber,
        baseRange.endColumn
      );

      originalDecorationsRef.current = originalEditor.deltaDecorations(
        originalDecorationsRef.current,
        [
          {
            range: monacoRange,
            options: {
              isWholeLine: true,
              className: "bg-status-removed-bg border-l-2 border-status-removed",
              marginClassName: "text-status-removed font-bold",
            },
          },
        ]
      );
      originalEditor.revealRangeInCenter(monacoRange);
    } else if (originalEditor) {
      originalDecorationsRef.current = originalEditor.deltaDecorations(originalDecorationsRef.current, []);
    }

    // Apply decorations to Modified (HEAD) Editor
    if (modifiedEditor && headRange) {
      const monacoRange = new monaco.Range(
        headRange.startLineNumber,
        headRange.startColumn,
        headRange.endLineNumber,
        headRange.endColumn
      );

      modifiedDecorationsRef.current = modifiedEditor.deltaDecorations(
        modifiedDecorationsRef.current,
        [
          {
            range: monacoRange,
            options: {
              isWholeLine: true,
              className: "bg-status-added-bg border-l-2 border-status-added",
              marginClassName: "text-status-added font-bold",
            },
          },
        ]
      );
      modifiedEditor.revealRangeInCenter(monacoRange);
    } else if (modifiedEditor) {
      modifiedDecorationsRef.current = modifiedEditor.deltaDecorations(modifiedDecorationsRef.current, []);
    }
  }, [selectedEvidence, selectedChange, baseResult.span, headResult.span]);

  // Re-apply decorations whenever active evidence/change changes
  useEffect(() => {
    applyEvidenceDecorations();
  }, [applyEvidenceDecorations]);

  // Editor Options per DESIGN.md Section 9
  const editorOptions: editor.IDiffEditorOptions = useMemo(
    () => ({
      readOnly: true,
      renderSideBySide: diffMode === "side-by-side",
      automaticLayout: true,
      scrollBeyondLastLine: false,
      minimap: { enabled: false },
      lineNumbers: "on",
      fontFamily: 'ui-monospace, "IBM Plex Mono", "JetBrains Mono", Menlo, monospace',
      fontSize: 12,
      lineHeight: 20,
      renderWhitespace: "selection",
      diffWordWrap: "off",
      contextMenu: false,
      folding: false,
      overviewRulerLanes: 0,
      renderOverviewRuler: false,
      hideUnchangedRegions: {
        enabled: false,
      },
    }),
    [diffMode]
  );

  // If source is missing, deleted, or incomplete, show EditorUnavailableState
  if (unavailableReason) {
    return (
      <div className="flex flex-col h-full bg-ground border border-hairline rounded-md overflow-hidden">
        <CodeComparisonToolbar
          diffMode={diffMode}
          onDiffModeChange={setDiffMode}
          baseRevisionLabel={`BASE (${report.baseCommit.shortSha})`}
          headRevisionLabel={`HEAD (${report.headCommit.shortSha})`}
          targetFunctionName={report.request.targetFunctionName}
          targetFilePath={report.request.targetFilePath}
          activeSpan={activeSpan}
          evidenceList={evidenceList}
          selectedEvidenceId={selectedEvidence?.id ?? null}
          onSelectEvidence={onSelectEvidence}
        />
        <EditorUnavailableState
          reason={unavailableReason}
          targetFunctionName={report.request.targetFunctionName}
          targetFilePath={report.request.targetFilePath}
          baseSnippet={report.baseFunction?.rawBodyText ?? selectedChange?.beforeSnippet}
          headSnippet={report.headFunction?.rawBodyText ?? selectedChange?.afterSnippet}
          onRetry={initError ? () => setInitError(null) : undefined}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-ground border border-hairline rounded-md overflow-hidden">
      {/* Navigation & Diff Toolbar */}
      <CodeComparisonToolbar
        diffMode={diffMode}
        onDiffModeChange={setDiffMode}
        baseRevisionLabel={`BASE (${report.baseCommit.shortSha})`}
        headRevisionLabel={`HEAD (${report.headCommit.shortSha})`}
        targetFunctionName={report.request.targetFunctionName}
        targetFilePath={report.request.targetFilePath}
        activeSpan={activeSpan}
        evidenceList={evidenceList}
        selectedEvidenceId={selectedEvidence?.id ?? null}
        onSelectEvidence={onSelectEvidence}
        onCopySource={handleCopySource}
        isCopied={isCopied}
      />

      {/* Monaco Diff Container */}
      <div className="flex-1 min-h-[300px] relative bg-surface-code">
        <DiffEditor
          original={baseResult.source}
          modified={headResult.source}
          language={language}
          theme={THEME_NAME}
          options={editorOptions}
          beforeMount={handleEditorBeforeMount}
          onMount={handleEditorDidMount}
          loading={
            <div className="flex items-center justify-center h-full text-xs font-mono text-text-muted">
              Loading local Monaco code comparison engine…
            </div>
          }
        />
      </div>
    </div>
  );
};

