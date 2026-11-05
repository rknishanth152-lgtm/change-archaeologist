// @vitest-environment jsdom
/**
 * Change Archaeologist — Monaco Code Comparison & Evidence Navigation Unit Tests
 *
 * Verifies CodeComparison, CodeComparisonToolbar, and EditorUnavailableState components:
 * - Switching between side-by-side and unified diff render modes
 * - Revision label display and active coordinate indicator
 * - Evidence navigation (prev/next, evidence counter)
 * - Graceful handling of deleted functions (Scenario F) and absent sources
 * - Interaction with DetailInspector and evidence anchor selection
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// Mock @monaco-editor/react for JSDOM unit test environment
vi.mock("@monaco-editor/react", () => ({
  DiffEditor: (props: any) => (
    <div
      data-testid="monaco-diff-editor"
      data-language={props.language}
      data-theme={props.theme}
      data-diff-mode={props.options?.renderSideBySide ? "side-by-side" : "unified"}
    >
      <div data-testid="monaco-diff-original">{props.original}</div>
      <div data-testid="monaco-diff-modified">{props.modified}</div>
    </div>
  ),
  loader: {
    config: vi.fn(),
  },
}));

import { CodeComparisonToolbar } from "../../../src/viewer/components/CodeComparisonToolbar.js";
import { EditorUnavailableState } from "../../../src/viewer/components/EditorUnavailableState.js";
import { CodeComparison } from "../../../src/viewer/components/CodeComparison.js";
import { DetailInspector } from "../../../src/viewer/components/DetailInspector.js";
import {
  DEMO_SCENARIO_A,
  DEMO_SCENARIO_E,
  DEMO_SCENARIO_F,
} from "../../../src/viewer/data/demo-fixtures.js";
import type { EvidenceItem } from "../../../src/viewer/types/index.js";

describe("Code Comparison & Evidence Navigation Components", () => {
  beforeEach(() => {
    cleanup();
  });

  afterEach(() => {
    cleanup();
  });

  describe("EditorUnavailableState", () => {
    it("renders FUNCTION_DELETED state for deleted function in HEAD (Scenario F)", () => {
      render(
        <EditorUnavailableState
          reason="FUNCTION_DELETED"
          targetFunctionName="legacyProcess"
          targetFilePath="src/legacy.ts"
          baseSnippet="function legacyProcess() { return 1; }"
        />
      );

      expect(screen.getByText("Target Function Removed in HEAD")).toBeInTheDocument();
      expect(screen.getByText(/was deleted or renamed in HEAD/)).toBeInTheDocument();
      expect(screen.getByText("legacyProcess")).toBeInTheDocument();
      expect(screen.getByText("[-] BASE Revision Content")).toBeInTheDocument();
      expect(screen.getByText(/function legacyProcess/)).toBeInTheDocument();
      expect(screen.getByText("[DELETED IN HEAD]")).toBeInTheDocument();
    });

    it("renders FUNCTION_ABSENT state when function is missing in BASE", () => {
      render(
        <EditorUnavailableState
          reason="FUNCTION_ABSENT"
          targetFunctionName="newFeature"
          targetFilePath="src/feature.ts"
          headSnippet="function newFeature() { return 2; }"
        />
      );

      expect(screen.getByText("Target Function Absent in BASE")).toBeInTheDocument();
      expect(screen.getByText(/does not exist in BASE/)).toBeInTheDocument();
      expect(screen.getByText("newFeature")).toBeInTheDocument();
      expect(screen.getByText("[+] HEAD Revision Content")).toBeInTheDocument();
      expect(screen.getByText(/function newFeature/)).toBeInTheDocument();
      expect(screen.getByText("[INTRODUCED IN HEAD]")).toBeInTheDocument();
    });

    it("renders INCOMPLETE_ANALYSIS state when analysis could not complete", () => {
      render(
        <EditorUnavailableState
          reason="INCOMPLETE_ANALYSIS"
          targetFunctionName="parseTarget"
          targetFilePath="src/target.ts"
        />
      );

      expect(screen.getByText("Incomplete Analysis Report")).toBeInTheDocument();
      expect(screen.getByText(/AST function snapshots were not preserved/)).toBeInTheDocument();
      expect(screen.getByText("[INCOMPLETE ANALYSIS]")).toBeInTheDocument();
    });

    it("renders INITIALIZATION_FAILED state with a retry button", () => {
      const handleRetry = vi.fn();
      render(
        <EditorUnavailableState
          reason="INITIALIZATION_FAILED"
          targetFunctionName="initTarget"
          targetFilePath="src/target.ts"
          onRetry={handleRetry}
        />
      );

      expect(screen.getByText("Editor Engine Unavailable")).toBeInTheDocument();
      const retryBtn = screen.getByRole("button", { name: /Retry Editor Initialization/i });
      expect(retryBtn).toBeInTheDocument();
      fireEvent.click(retryBtn);
      expect(handleRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe("CodeComparisonToolbar", () => {
    const mockEvidence: EvidenceItem[] = [
      {
        id: "EV-001",
        kind: "SOURCE_BEFORE",
        description: "Guard removed",
        commitSha: "a1b2c3d",
        commitRole: "BASE",
        posixFilePath: "src/payment.ts",
        span: { startLine: 14, startColumn: 1, endLine: 16, endColumn: 25 },
        codeSnippet: "if (!auth) throw new Error();",
      },
      {
        id: "EV-002",
        kind: "TEST_AFTER",
        description: "Assertion altered",
        commitSha: "e4f5g6h",
        commitRole: "HEAD",
        posixFilePath: "tests/payment.test.ts",
        span: { startLine: 40, startColumn: 1, endLine: 42, endColumn: 30 },
        codeSnippet: "expect(status).toBe(200);",
      },
    ];

    it("displays BASE and HEAD revision labels and active span", () => {
      render(
        <CodeComparisonToolbar
          diffMode="side-by-side"
          onDiffModeChange={vi.fn()}
          baseRevisionLabel="BASE (a1b2c3d)"
          headRevisionLabel="HEAD (e4f5g6h)"
          targetFunctionName="processPayment"
          targetFilePath="src/services/payment.ts"
          activeSpan={{ startLine: 14, startColumn: 3, endLine: 16, endColumn: 20 }}
          evidenceList={mockEvidence}
          selectedEvidenceId="EV-001"
          onSelectEvidence={vi.fn()}
        />
      );

      expect(screen.getByText("BASE (a1b2c3d)")).toBeInTheDocument();
      expect(screen.getByText("HEAD (e4f5g6h)")).toBeInTheDocument();
      expect(screen.getByText("L14:C3-L16:C20")).toBeInTheDocument();
      expect(screen.getByText("EV-001 (1/2)")).toBeInTheDocument();
    });

    it("allows switching between side-by-side and unified diff modes", () => {
      const handleDiffModeChange = vi.fn();
      render(
        <CodeComparisonToolbar
          diffMode="side-by-side"
          onDiffModeChange={handleDiffModeChange}
          baseRevisionLabel="BASE"
          headRevisionLabel="HEAD"
          targetFunctionName="processPayment"
          targetFilePath="src/payment.ts"
          evidenceList={[]}
          selectedEvidenceId={null}
          onSelectEvidence={vi.fn()}
        />
      );

      const unifiedBtn = screen.getByRole("button", { name: /Unified diff/i });
      fireEvent.click(unifiedBtn);
      expect(handleDiffModeChange).toHaveBeenCalledWith("unified");

      const sideBySideBtn = screen.getByRole("button", { name: /Side by side/i });
      fireEvent.click(sideBySideBtn);
      expect(handleDiffModeChange).toHaveBeenCalledWith("side-by-side");
    });

    it("navigates forward and backward through evidence items", () => {
      const handleSelectEvidence = vi.fn();
      const { rerender } = render(
        <CodeComparisonToolbar
          diffMode="side-by-side"
          onDiffModeChange={vi.fn()}
          baseRevisionLabel="BASE"
          headRevisionLabel="HEAD"
          targetFunctionName="processPayment"
          targetFilePath="src/payment.ts"
          evidenceList={mockEvidence}
          selectedEvidenceId="EV-001"
          onSelectEvidence={handleSelectEvidence}
        />
      );

      // In EV-001 (index 0), prev is disabled, next points to EV-002
      const prevBtn = screen.getByRole("button", { name: /Navigate to previous evidence item/i });
      const nextBtn = screen.getByRole("button", { name: /Navigate to next evidence item/i });

      expect(prevBtn).toBeDisabled();
      expect(nextBtn).toBeEnabled();

      fireEvent.click(nextBtn);
      expect(handleSelectEvidence).toHaveBeenCalledWith("EV-002");

      // Rerender at EV-002
      rerender(
        <CodeComparisonToolbar
          diffMode="side-by-side"
          onDiffModeChange={vi.fn()}
          baseRevisionLabel="BASE"
          headRevisionLabel="HEAD"
          targetFunctionName="processPayment"
          targetFilePath="src/payment.ts"
          evidenceList={mockEvidence}
          selectedEvidenceId="EV-002"
          onSelectEvidence={handleSelectEvidence}
        />
      );

      expect(screen.getByRole("button", { name: /Navigate to previous evidence item/i })).toBeEnabled();
      expect(screen.getByRole("button", { name: /Navigate to next evidence item/i })).toBeDisabled();

      fireEvent.click(screen.getByRole("button", { name: /Navigate to previous evidence item/i }));
      expect(handleSelectEvidence).toHaveBeenCalledWith("EV-001");
    });
  });

  describe("CodeComparison Component", () => {
    it("renders Monaco DiffEditor with correct language and source for Scenario A", () => {
      render(
        <CodeComparison
          report={DEMO_SCENARIO_A}
          selectedChange={DEMO_SCENARIO_A.structuralChanges[0]}
          selectedEvidence={null}
          evidenceList={[]}
          onSelectEvidence={vi.fn()}
        />
      );

      const diffEditor = screen.getByTestId("monaco-diff-editor");
      expect(diffEditor).toBeInTheDocument();
      expect(diffEditor).toHaveAttribute("data-language", "typescript");
      expect(diffEditor).toHaveAttribute("data-diff-mode", "side-by-side");

      const original = screen.getByTestId("monaco-diff-original");
      const modified = screen.getByTestId("monaco-diff-modified");

      expect(original.textContent).toContain("function processPayment");
      expect(original.textContent).toContain("if (!payment.valid)");
      expect(modified.textContent).toContain("function processPayment");
    });

    it("renders EditorUnavailableState when function is deleted in HEAD (Scenario F)", () => {
      render(
        <CodeComparison
          report={DEMO_SCENARIO_F}
          selectedChange={null}
          selectedEvidence={null}
          evidenceList={[]}
          onSelectEvidence={vi.fn()}
        />
      );

      // DiffEditor should not render when function is deleted
      expect(screen.queryByTestId("monaco-diff-editor")).not.toBeInTheDocument();
      expect(screen.getByText("Target Function Removed in HEAD")).toBeInTheDocument();
      expect(screen.getByText("deprecatedHelper")).toBeInTheDocument();
    });

    it("toggles between side-by-side and unified diff layout within CodeComparison", () => {
      render(
        <CodeComparison
          report={DEMO_SCENARIO_A}
          selectedChange={DEMO_SCENARIO_A.structuralChanges[0]}
          selectedEvidence={null}
          evidenceList={[]}
          onSelectEvidence={vi.fn()}
        />
      );

      const diffEditor = screen.getByTestId("monaco-diff-editor");
      expect(diffEditor).toHaveAttribute("data-diff-mode", "side-by-side");

      const unifiedBtn = screen.getByRole("button", { name: /Unified diff/i });
      fireEvent.click(unifiedBtn);

      expect(screen.getByTestId("monaco-diff-editor")).toHaveAttribute("data-diff-mode", "unified");
    });
  });

  describe("DetailInspector Integration with CodeComparison", () => {
    it("supports switching between Monaco Diff and Compact Text view in DetailInspector", () => {
      render(
        <DetailInspector
          report={DEMO_SCENARIO_A}
          selectedChange={DEMO_SCENARIO_A.structuralChanges[0]}
          selectedEvidenceId={null}
          onSelectEvidence={vi.fn()}
        />
      );

      // Defaults to Diff Editor mode
      expect(screen.getByTestId("monaco-diff-editor")).toBeInTheDocument();

      // Click Compact Text view button
      const textModeBtn = screen.getByRole("button", { name: /Switch to Text View/i });
      fireEvent.click(textModeBtn);

      // Now compact view is active, DiffEditor is not rendered
      expect(screen.queryByTestId("monaco-diff-editor")).not.toBeInTheDocument();
      expect(screen.getByText(/\[-\] BASE Revision/)).toBeInTheDocument();
      expect(screen.getByText(/\[\+\] HEAD Revision/)).toBeInTheDocument();

      // Click Diff View button to return to Monaco
      const diffViewBtn = screen.getByRole("button", { name: /Switch to Monaco Diff/i });
      fireEvent.click(diffViewBtn);
      expect(screen.getByTestId("monaco-diff-editor")).toBeInTheDocument();
    });

    it("highlights evidence anchor and invokes onSelectEvidence when clicked in DetailInspector", () => {
      const handleSelectEvidence = vi.fn();
      const mockEvidence: EvidenceItem[] = [
        {
          id: "EV-001",
          kind: "SOURCE_BEFORE",
          description: "Discount threshold altered",
          commitSha: "a1b2c3d",
          commitRole: "BASE",
          posixFilePath: "src/discount.ts",
          span: { startLine: 10, startColumn: 1, endLine: 12, endColumn: 30 },
          codeSnippet: "if (amount > 100) return 0.1;",
        },
      ];

      render(
        <DetailInspector
          report={DEMO_SCENARIO_E}
          selectedChange={DEMO_SCENARIO_E.structuralChanges[0]}
          associatedEvidence={mockEvidence}
          selectedEvidenceId={null}
          onSelectEvidence={handleSelectEvidence}
        />
      );

      // Evidence anchor EV-001 should be present in traceable anchors
      const evAnchor = screen.getByRole("button", { name: /EV-001/i });
      expect(evAnchor).toBeInTheDocument();

      fireEvent.click(evAnchor);
      expect(handleSelectEvidence).toHaveBeenCalledWith("EV-001");
    });
  });
});
