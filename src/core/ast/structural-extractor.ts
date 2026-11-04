/**
 * Change Archaeologist - AST Structural Extractor
 *
 * Walks a located function node to extract normalized descriptors:
 * - Guards (early-exit conditionals).
 * - Conditionals (if conditions, ternary conditions, switch discriminants).
 * - Throws (explicit throw statements).
 * - Returns (return paths and return value categories).
 *
 * Scoped traversal strictly stops at nested function/callback boundaries.
 */

import {
  Node,
  SyntaxKind,
  type BinaryExpression,
  type IfStatement,
} from "ts-morph";
import type {
  ConditionalDescriptor,
  FunctionSnapshot,
  FunctionSyntaxKind,
  GuardDescriptor,
  ReturnDescriptor,
  RevisionRole,
  SourceSpan,
  ThrowDescriptor,
} from "../domain/types.js";
import { AstNormalizer } from "./ast-normalizer.js";
import { FunctionLocator } from "./function-locator.js";

export class StructuralExtractor {
  /**
   * Traverses descendants within a scope, explicitly STOPPING at nested function boundaries.
   * This guarantees that callback statements (e.g. inside .map(), .forEach())
   * are never misattributed to the outer function.
   */
  static getScopedDescendants(root: Node): Node[] {
    const result: Node[] = [];
    function visit(current: Node) {
      for (const child of current.getChildren()) {
        if (
          Node.isFunctionDeclaration(child) ||
          Node.isFunctionExpression(child) ||
          Node.isArrowFunction(child) ||
          Node.isMethodDeclaration(child)
        ) {
          // Stop: nested function boundary
          continue;
        }
        result.push(child);
        visit(child);
      }
    }
    visit(root);
    return result;
  }

  /**
   * Determines if an IfStatement represents a Guard Clause:
   * 1. Has no else branch.
   * 2. Its then branch is an unconditional ReturnStatement or ThrowStatement
   *    (either directly or as the final statement in a single-exit Block).
   */
  static getGuardExit(ifStmt: IfStatement): {
    exitKind: "RETURN" | "THROW";
    exitNode: Node;
    exitText: string;
    normalizedExit: string;
  } | null {
    if (ifStmt.getElseStatement() !== undefined) {
      return null;
    }

    const thenStmt = ifStmt.getThenStatement();
    let candidate: Node | undefined = thenStmt;
    if (Node.isBlock(thenStmt)) {
      const stmts = thenStmt.getStatements();
      if (stmts.length === 0) return null;
      candidate = stmts[stmts.length - 1];
    }
    if (!candidate) return null;

    if (Node.isReturnStatement(candidate)) {
      const expr = candidate.getExpression();
      const normalizedExpr = expr ? AstNormalizer.normalizeExpression(expr) : "";
      return {
        exitKind: "RETURN",
        exitNode: candidate,
        exitText: candidate.getText().trim(),
        normalizedExit: `return ${normalizedExpr}`.trim(),
      };
    }

    if (Node.isThrowStatement(candidate)) {
      const expr = candidate.getExpression();
      const normalizedExpr = expr ? AstNormalizer.normalizeExpression(expr) : "";
      return {
        exitKind: "THROW",
        exitNode: candidate,
        exitText: candidate.getText().trim(),
        normalizedExit: `throw ${normalizedExpr}`.trim(),
      };
    }

    return null;
  }

  /**
   * Calculates nesting depth of a node relative to the function root.
   */
  static calculateNestingDepth(node: Node, root: Node): number {
    let depth = 0;
    let current = node.getParent();
    while (current && current !== root) {
      if (
        Node.isBlock(current) ||
        Node.isIfStatement(current) ||
        Node.isIterationStatement(current)
      ) {
        depth++;
      }
      current = current.getParent();
    }
    return depth;
  }

  /**
   * Extracts a complete FunctionSnapshot from a resolved function node.
   */
  static extractSnapshot(
    fnNode: Node,
    qualifiedName: string,
    role: RevisionRole,
    commitSha: string,
    posixFilePath: string,
    kind: FunctionSyntaxKind
  ): FunctionSnapshot {
    const span = FunctionLocator.getSourceSpan(fnNode);

    // Resolve body node and signature
    let bodyNode: Node | undefined;
    let signatureText = "";

    if (Node.isFunctionDeclaration(fnNode) || Node.isMethodDeclaration(fnNode) || Node.isFunctionExpression(fnNode)) {
      bodyNode = fnNode.getBody();
      const fullText = fnNode.getText();
      const braceIdx = fullText.indexOf("{");
      signatureText = braceIdx !== -1 ? fullText.slice(0, braceIdx).trim() : qualifiedName;
    } else if (Node.isArrowFunction(fnNode)) {
      bodyNode = fnNode.getBody();
      const fullText = fnNode.getText();
      const arrowIdx = fullText.indexOf("=>");
      signatureText = arrowIdx !== -1 ? fullText.slice(0, arrowIdx + 2).trim() : qualifiedName;
    }

    if (!bodyNode) {
      return {
        role,
        commitSha,
        posixFilePath,
        qualifiedName,
        functionName: qualifiedName.split(".").pop() ?? qualifiedName,
        kind,
        span,
        signatureText: signatureText || qualifiedName,
        rawBodyText: "",
        guards: [],
        conditionals: [],
        throws: [],
        returns: [],
      };
    }

    const scopedDescendants = StructuralExtractor.getScopedDescendants(bodyNode);
    const rawBodyText = bodyNode.getText();

    // 1. Extract Guards
    const guards: GuardDescriptor[] = [];
    const ifStatements = scopedDescendants.filter(Node.isIfStatement);

    const leadingGuardSet = new Set<IfStatement>();
    if (Node.isBlock(bodyNode)) {
      const topStmts = bodyNode.getStatements();
      let isLeading = true;
      for (const s of topStmts) {
        if (Node.isVariableStatement(s)) continue;
        if (Node.isIfStatement(s) && StructuralExtractor.getGuardExit(s)) {
          if (isLeading) leadingGuardSet.add(s);
          continue;
        }
        isLeading = false;
      }
    }

    for (const ifStmt of ifStatements) {
      const exit = StructuralExtractor.getGuardExit(ifStmt);
      if (exit) {
        const condExpr = ifStmt.getExpression();
        const conditionText = condExpr.getText().trim();
        const normalizedCondition = AstNormalizer.normalizeExpression(condExpr);
        const nestingDepth = StructuralExtractor.calculateNestingDepth(ifStmt, bodyNode);
        const guardSpan = FunctionLocator.getSourceSpan(ifStmt);

        guards.push({
          fingerprint: `GUARD:${normalizedCondition}:${exit.exitKind}:${exit.normalizedExit}`,
          conditionText,
          normalizedCondition,
          exitKind: exit.exitKind,
          exitText: exit.exitText,
          normalizedExit: exit.normalizedExit,
          isLeadingGuard: leadingGuardSet.has(ifStmt),
          nestingDepth,
          span: guardSpan,
          rawText: ifStmt.getText(),
        });
      }
    }

    // 2. Extract Conditionals
    const conditionals: ConditionalDescriptor[] = [];
    for (const node of scopedDescendants) {
      if (Node.isIfStatement(node)) {
        const cond = node.getExpression();
        conditionals.push(StructuralExtractor.buildConditionalDescriptor(cond, "IF_STATEMENT", bodyNode));
      } else if (Node.isConditionalExpression(node)) {
        const cond = node.getCondition();
        conditionals.push(StructuralExtractor.buildConditionalDescriptor(cond, "TERNARY_EXPRESSION", bodyNode));
      } else if (Node.isSwitchStatement(node)) {
        const cond = node.getExpression();
        conditionals.push(StructuralExtractor.buildConditionalDescriptor(cond, "SWITCH_STATEMENT", bodyNode));
      }
    }

    // 3. Extract Throws
    const throws: ThrowDescriptor[] = [];
    const throwStatements = scopedDescendants.filter(Node.isThrowStatement);
    for (const t of throwStatements) {
      const expr = t.getExpression();
      const thrownExpressionText = expr ? expr.getText().trim() : "";
      const normalizedExpression = expr ? AstNormalizer.normalizeExpression(expr) : "";
      const enclosingIf = t.getFirstAncestorByKind(SyntaxKind.IfStatement);
      const enclosingGuardCondition = enclosingIf
        ? AstNormalizer.normalizeExpression(enclosingIf.getExpression())
        : null;
      const nestingDepth = StructuralExtractor.calculateNestingDepth(t, bodyNode);

      throws.push({
        fingerprint: `THROW:${normalizedExpression}:${enclosingGuardCondition ?? "top"}`,
        thrownExpressionText,
        normalizedExpression,
        enclosingGuardCondition,
        nestingDepth,
        span: FunctionLocator.getSourceSpan(t),
        rawText: t.getText(),
      });
    }

    // 4. Extract Returns
    const returns: ReturnDescriptor[] = [];
    const returnStatements = scopedDescendants.filter(Node.isReturnStatement);

    for (const r of returnStatements) {
      const expr = r.getExpression();
      const expressionText = expr ? expr.getText().trim() : null;
      const normalizedExpression = expr ? AstNormalizer.normalizeExpression(expr) : null;

      let returnCategory: "VOID_OR_EMPTY" | "NULL_OR_UNDEFINED" | "BOOLEAN_LITERAL" | "EXPRESSION" = "EXPRESSION";
      if (!expr) {
        returnCategory = "VOID_OR_EMPTY";
      } else if (expressionText === "null" || expressionText === "undefined") {
        returnCategory = "NULL_OR_UNDEFINED";
      } else if (expressionText === "true" || expressionText === "false") {
        returnCategory = "BOOLEAN_LITERAL";
      }

      const enclosingIf = r.getFirstAncestorByKind(SyntaxKind.IfStatement);
      const isEarlyReturn = enclosingIf !== undefined;
      const nestingDepth = StructuralExtractor.calculateNestingDepth(r, bodyNode);

      returns.push({
        fingerprint: `RETURN:${returnCategory}:${normalizedExpression ?? "void"}`,
        returnCategory,
        expressionText,
        normalizedExpression,
        isEarlyReturn,
        nestingDepth,
        span: FunctionLocator.getSourceSpan(r),
        rawText: r.getText(),
      });
    }

    // Handle concise arrow body expression return (e.g. const f = () => x + 1)
    if (Node.isArrowFunction(fnNode) && !Node.isBlock(bodyNode)) {
      const exprText = bodyNode.getText().trim();
      returns.push({
        fingerprint: `RETURN:EXPRESSION:${AstNormalizer.normalizeExpression(bodyNode)}`,
        returnCategory: "EXPRESSION",
        expressionText: exprText,
        normalizedExpression: AstNormalizer.normalizeExpression(bodyNode),
        isEarlyReturn: false,
        nestingDepth: 0,
        span: FunctionLocator.getSourceSpan(bodyNode),
        rawText: exprText,
      });
    }

    return {
      role,
      commitSha,
      posixFilePath,
      qualifiedName,
      functionName: qualifiedName.split(".").pop() ?? qualifiedName,
      kind,
      span,
      signatureText: signatureText || qualifiedName,
      rawBodyText,
      guards,
      conditionals,
      throws,
      returns,
    };
  }

  private static buildConditionalDescriptor(
    condExpr: Node,
    constructKind: "IF_STATEMENT" | "TERNARY_EXPRESSION" | "SWITCH_STATEMENT",
    bodyNode: Node
  ): ConditionalDescriptor {
    const conditionText = condExpr.getText().trim();
    const normalizedCondition = AstNormalizer.normalizeExpression(condExpr);
    const nestingDepth = StructuralExtractor.calculateNestingDepth(condExpr, bodyNode);
    const span = FunctionLocator.getSourceSpan(condExpr);

    const operatorTokens: string[] = [];
    const binaryExpressions: BinaryExpression[] = [];
    if (Node.isBinaryExpression(condExpr)) {
      binaryExpressions.push(condExpr);
    }
    for (const d of condExpr.getDescendantsOfKind(SyntaxKind.BinaryExpression)) {
      binaryExpressions.push(d);
    }
    for (const bin of binaryExpressions) {
      operatorTokens.push(bin.getOperatorToken().getText());
    }

    return {
      fingerprint: `${constructKind}:${normalizedCondition}`,
      constructKind,
      conditionText,
      normalizedCondition,
      operatorTokens,
      nestingDepth,
      span,
      rawText: condExpr.getText(),
    };
  }
}

