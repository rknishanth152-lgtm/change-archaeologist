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
import { useTheme } from "../utils/theme.js";

// Ensure Monaco runs completely local-first without external CDN network requests
loader.config({ monaco });

// Editor themes matching the light and dark tokens in styles/tokens.css
export const THEME_NAME = "change-archaeologist-light";
export const THEME_NAME_DARK = "change-archaeologist-dark";

const EDITOR_PALETTES = {
  [THEME_NAME]: {
    base: "vs",
    code: "#FBFCFA",
    line: "#EFF2EF",
    ink: "#15201F",
    secondary: "#3D4B48",
    muted: "#4F5D5A",
    keyword: "#0B6B62",
    number: "#744B00",
    type: "#5A41A6",
    added: "#136639",
    removed: "#A02019",
  },
  [THEME_NAME_DARK]: {
    base: "vs-dark",
    code: "#151C1E",
    line: "#1A2225",
    ink: "#E9EFEC",
    secondary: "#BAC6C2",
    muted: "#A1AFAB",
    keyword: "#5CCFBE",
    number: "#E6B84C",
    type: "#B3A6F4",
    added: "#68D596",
    removed: "#F58D84",
  },
} as const;

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

    // Monaco parses theme colors as hex only; anything else renders as solid red.
    for (const [name, palette] of Object.entries(EDITOR_PALETTES)) {
      monacoInstance.editor.defineTheme(name, {
        base: palette.base,
        inherit: true,
        rules: [
          { token: "", background: palette.code.slice(1), foreground: palette.ink.slice(1) },
          { token: "comment", foreground: palette.muted.slice(1), fontStyle: "italic" },
          { token: "keyword", foreground: palette.keyword.slice(1) },
          { token: "string", foreground: palette.added.slice(1) },
          { token: "number", foreground: palette.number.slice(1) },
          { token: "type", foreground: palette.type.slice(1) },
          { token: "identifier", foreground: palette.ink.slice(1) },
          { token: "delimiter", foreground: palette.secondary.slice(1) },
        ],
        colors: {
          "editor.background": palette.code,
          "editor.foreground": palette.ink,
          "editorLineNumber.foreground": palette.muted,
          "editorLineNumber.activeForeground": palette.ink,
          "editorGutter.background": palette.code,
          "editor.lineHighlightBackground": palette.line,
          "editor.selectionBackground": `${palette.keyword}38`,
          "diffEditor.insertedTextBackground": `${palette.added}38`,
          "diffEditor.removedTextBackground": `${palette.removed}38`,
          "diffEditor.insertedLineBackground": `${palette.added}1A`,
          "diffEditor.removedLineBackground": `${palette.removed}1A`,
          "diffEditor.diagonalFill": `${palette.muted}26`,
          "editorOverviewRuler.border": `${palette.muted}40`,
        },
      });
    }
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
  readonly prefersSideBySide?: boolean;
}

export const CodeComparison: React.FC<CodeComparisonProps> = ({
  report,
  selectedChange,
  selectedEvidence,
  evidenceList,
  onSelectEvidence,
  prefersSideBySide = false,
}) => {
  const uiTheme = useTheme();
  const [chosenDiffMode, setDiffMode] = useState<DiffRenderMode | null>(null);
  const diffMode: DiffRenderMode = chosenDiffMode ?? (prefersSideBySide ? "side-by-side" : "unified");
  const [isCopied, setIsCopied] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  const diffEditorRef = useRef<editor.IStandaloneDiffEditor | null>(null);
  const originalDecorationsRef = useRef<string[]>([]);
  const modifiedDecorationsRef = useRef<string[]>([]);
  const diffModelsRef = useRef<editor.IDiffEditorModel | null>(null);

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
    diffModelsRef.current = diffEditor.getModel();
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

  // @monaco-editor/react disposes models before the diff widget resets, which throws.
  // It keeps them here, and they are released once the widget itself is gone.
  const isEditorMounted = unavailableReason === null;
  useEffect(() => {
    if (!isEditorMounted) return;
    return () => {
      const models = diffModelsRef.current;
      diffModelsRef.current = null;
      queueMicrotask(() => {
        models?.original.dispose();
        models?.modified.dispose();
      });
    };
  }, [isEditorMounted]);

  // Read-only diff options
  const editorOptions: editor.IDiffEditorOptions = useMemo(
    () => ({
      readOnly: true,
      renderSideBySide: diffMode === "side-by-side",
      useInlineViewWhenSpaceIsLimited: false,
      automaticLayout: true,
      scrollBeyondLastLine: false,
      minimap: { enabled: false },
      lineNumbers: "on",
      fontFamily: '"IBM Plex Mono", ui-monospace, Menlo, monospace',
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
          baseRevisionLabel={`Before (${report.baseCommit.shortSha})`}
          headRevisionLabel={`After (${report.headCommit.shortSha})`}
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
        baseRevisionLabel={`Before (${report.baseCommit.shortSha})`}
        headRevisionLabel={`After (${report.headCommit.shortSha})`}
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
          theme={uiTheme === "dark" ? THEME_NAME_DARK : THEME_NAME}
          options={editorOptions}
          keepCurrentOriginalModel
          keepCurrentModifiedModel
          beforeMount={handleEditorBeforeMount}
          onMount={handleEditorDidMount}
          loading={
            <div className="flex items-center justify-center h-full text-xs text-text-secondary">
              Loading the code comparison…
            </div>
          }
        />
      </div>
    </div>
  );
};

