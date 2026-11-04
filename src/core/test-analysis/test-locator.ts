/**
 * Change Archaeologist - Test Declaration Locator
 *
 * Statically discovers and extracts test declarations from AST without executing code:
 * - describe(...), describe.skip(...), describe.only(...)
 * - it(...), it.skip(...), it.only(...), it.todo(...), it.concurrent(...)
 * - test(...), test.skip(...), test.only(...), test.todo(...), test.concurrent(...)
 *
 * Tracks hierarchical ancestry (describe > it), captures source spans, and
 * detects duplicate/ambiguous test descriptions conservatively.
 */

import { CallExpression, Node, type SourceFile } from "ts-morph";
import type { SourceSpan } from "../domain/types.js";
import { AstNormalizer } from "../ast/ast-normalizer.js";

export type TestDeclarationKind = "DESCRIBE" | "IT" | "TEST";

export interface TestDeclaration {
  readonly id: string; // e.g. "TD-001"
  readonly kind: TestDeclarationKind;
  readonly calleeName: string; // e.g. "describe", "it", "test.skip"
  readonly description: string | null;
  readonly ancestorTitles: readonly string[];
  readonly fullTitle: string;
  readonly span: SourceSpan;
  readonly bodyText: string;
  readonly normalizedBody: string;
  readonly callbackNode: Node | null;
  readonly callNode: CallExpression;
  readonly isAmbiguous: boolean;
  readonly callsTargetFunction: boolean;
}

export class TestLocator {
  static getSourceSpan(node: Node): SourceSpan {
    const sourceFile = node.getSourceFile();
    const startPos = sourceFile.getLineAndColumnAtPos(node.getStart());
    const endPos = sourceFile.getLineAndColumnAtPos(node.getEnd());
    return {
      startLine: startPos.line,
      startColumn: startPos.column,
      endLine: endPos.line,
      endColumn: endPos.column,
    };
  }

  private static getCalleeInfo(
    callExpr: CallExpression
  ): { kind: TestDeclarationKind; calleeName: string } | null {
    const expr = callExpr.getExpression();

    if (Node.isIdentifier(expr)) {
      const name = expr.getText();
      if (name === "describe") return { kind: "DESCRIBE", calleeName: "describe" };
      if (name === "it") return { kind: "IT", calleeName: "it" };
      if (name === "test") return { kind: "TEST", calleeName: "test" };
    } else if (Node.isPropertyAccessExpression(expr)) {
      const obj = expr.getExpression();
      const prop = expr.getName();
      if (Node.isIdentifier(obj)) {
        const objName = obj.getText();
        if (objName === "describe" && (prop === "skip" || prop === "only")) {
          return { kind: "DESCRIBE", calleeName: `describe.${prop}` };
        }
        if (
          (objName === "it" || objName === "test") &&
          (prop === "skip" || prop === "only" || prop === "todo" || prop === "concurrent")
        ) {
          return {
            kind: objName === "it" ? "IT" : "TEST",
            calleeName: `${objName}.${prop}`,
          };
        }
      }
    }

    return null;
  }

  private static getDescription(callExpr: CallExpression): string | null {
    const args = callExpr.getArguments();
    if (args.length === 0) return null;
    const firstArg = args[0];

    if (Node.isStringLiteral(firstArg) || Node.isNoSubstitutionTemplateLiteral(firstArg)) {
      return firstArg.getLiteralValue();
    }
    if (Node.isTemplateExpression(firstArg)) {
      return firstArg.getText();
    }
    return null;
  }

  private static getCallbackNode(callExpr: CallExpression): Node | null {
    const args = callExpr.getArguments();
    for (let i = 1; i < args.length; i++) {
      const arg = args[i];
      if (Node.isArrowFunction(arg) || Node.isFunctionExpression(arg)) {
        return arg;
      }
    }
    return null;
  }

  private static checkCallsTargetFunction(
    bodyNode: Node | null,
    targetFunctionName?: string
  ): boolean {
    if (!bodyNode || !targetFunctionName) return false;
    let found = false;

    bodyNode.forEachDescendant((node) => {
      if (found) return;
      if (Node.isCallExpression(node)) {
        const calleeText = node.getExpression().getText();
        if (
          calleeText === targetFunctionName ||
          calleeText.endsWith(`.${targetFunctionName}`)
        ) {
          found = true;
        }
      }
    });

    return found;
  }

  /**
   * Discovers and extracts all test declarations in a SourceFile.
   */
  static extractDeclarations(
    sourceFile: SourceFile,
    targetFunctionName?: string
  ): TestDeclaration[] {
    const rawDeclarations: Array<Omit<TestDeclaration, "id" | "isAmbiguous">> = [];
    const ancestorStack: string[] = [];

    function traverse(node: Node): void {
      if (Node.isCallExpression(node)) {
        const info = TestLocator.getCalleeInfo(node);
        if (info) {
          const desc = TestLocator.getDescription(node);
          const currentTitle = desc ?? `(unnamed ${info.calleeName})`;
          const fullTitle =
            ancestorStack.length > 0
              ? `${ancestorStack.join(" > ")} > ${currentTitle}`
              : currentTitle;

          const callback = TestLocator.getCallbackNode(node);
          const bodyText = callback ? callback.getText() : "";
          const normalizedBody = callback
            ? AstNormalizer.normalizeText(bodyText)
            : "";
          const callsTarget = TestLocator.checkCallsTargetFunction(
            callback,
            targetFunctionName
          );

          rawDeclarations.push({
            kind: info.kind,
            calleeName: info.calleeName,
            description: desc,
            ancestorTitles: [...ancestorStack],
            fullTitle,
            span: TestLocator.getSourceSpan(node),
            bodyText,
            normalizedBody,
            callbackNode: callback,
            callNode: node,
            callsTargetFunction: callsTarget,
          });

          // If it has children (e.g. describe or nested tests), traverse with updated stack
          if (callback) {
            ancestorStack.push(currentTitle);
            callback.forEachChild(traverse);
            ancestorStack.pop();
            return;
          }
        }
      }

      node.forEachChild(traverse);
    }

    sourceFile.forEachChild(traverse);

    // Count title occurrences to detect ambiguities
    const titleCounts = new Map<string, number>();
    for (const d of rawDeclarations) {
      titleCounts.set(d.fullTitle, (titleCounts.get(d.fullTitle) ?? 0) + 1);
    }

    return rawDeclarations.map((d, index) => {
      const count = titleCounts.get(d.fullTitle) ?? 0;
      return {
        ...d,
        id: `TD-${String(index + 1).padStart(3, "0")}`,
        isAmbiguous: count > 1,
      };
    });
  }
}

