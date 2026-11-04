/**
 * Change Archaeologist - AST Function Locator
 *
 * Locates the requested named function within a SourceFile:
 * - FunctionDeclaration (skips ambient/overload declarations without a body).
 * - VariableDeclaration initialized to ArrowFunction or FunctionExpression.
 * - Class MethodDeclaration (unqualified or qualified "Class.method").
 *
 * Detects and explicitly reports ambiguous matches when multiple candidate
 * implementations share the same name within the file.
 */

import { Node, type SourceFile } from "ts-morph";
import type { FunctionSyntaxKind, SourceSpan } from "../domain/types.js";

export interface FunctionCandidate {
  readonly node: Node;
  readonly span: SourceSpan;
  readonly qualifiedName: string;
  readonly kind: FunctionSyntaxKind;
}

export type FunctionLookupResult =
  | { readonly status: "FOUND"; readonly candidate: FunctionCandidate }
  | { readonly status: "NOT_FOUND" }
  | { readonly status: "AMBIGUOUS"; readonly candidates: readonly FunctionCandidate[] };

export class FunctionLocator {
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

  /**
   * Locates a function by name in the given AST SourceFile.
   */
  static locate(sourceFile: SourceFile, targetName: string): FunctionLookupResult {
    // 1. Qualified name path (e.g. "ClassName.methodName")
    if (targetName.includes(".")) {
      const [className, methodName] = targetName.split(".");
      const cls = sourceFile.getClass(className);
      if (!cls) {
        return { status: "NOT_FOUND" };
      }
      const method = cls.getMethod(methodName);
      if (!method || method.getBody() === undefined) {
        return { status: "NOT_FOUND" };
      }
      return {
        status: "FOUND",
        candidate: {
          node: method,
          span: FunctionLocator.getSourceSpan(method),
          qualifiedName: `${className}.${methodName}`,
          kind: "METHOD_DECLARATION",
        },
      };
    }

    // 2. Unqualified name: scan for all matching implementations
    const candidates: FunctionCandidate[] = [];

    // Check top-level FunctionDeclarations (only those with an implementation body)
    for (const fn of sourceFile.getFunctions()) {
      if (fn.getName() === targetName && fn.getBody() !== undefined) {
        candidates.push({
          node: fn,
          span: FunctionLocator.getSourceSpan(fn),
          qualifiedName: targetName,
          kind: "FUNCTION_DECLARATION",
        });
      }
    }

    // Check top-level VariableDeclarations with arrow/function expressions
    for (const varDecl of sourceFile.getVariableDeclarations()) {
      if (varDecl.getName() === targetName) {
        const init = varDecl.getInitializer();
        if (init && Node.isArrowFunction(init)) {
          candidates.push({
            node: init,
            span: FunctionLocator.getSourceSpan(init),
            qualifiedName: targetName,
            kind: "ARROW_FUNCTION_VARIABLE",
          });
        } else if (init && Node.isFunctionExpression(init)) {
          candidates.push({
            node: init,
            span: FunctionLocator.getSourceSpan(init),
            qualifiedName: targetName,
            kind: "FUNCTION_EXPRESSION_VARIABLE",
          });
        }
      }
    }

    // Check MethodDeclarations across all classes in the file
    for (const cls of sourceFile.getClasses()) {
      const clsName = cls.getName() ?? "AnonymousClass";
      for (const method of cls.getMethods()) {
        if (method.getName() === targetName && method.getBody() !== undefined) {
          candidates.push({
            node: method,
            span: FunctionLocator.getSourceSpan(method),
            qualifiedName: `${clsName}.${targetName}`,
            kind: "METHOD_DECLARATION",
          });
        }
      }
    }

    if (candidates.length === 0) {
      return { status: "NOT_FOUND" };
    }

    if (candidates.length === 1) {
      return {
        status: "FOUND",
        candidate: candidates[0],
      };
    }

    return {
      status: "AMBIGUOUS",
      candidates,
    };
  }
}

