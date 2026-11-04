/**
 * Change Archaeologist - Test Assertion Extractor
 *
 * Statically extracts recognized test assertions from AST:
 * 1. expect(...) call chains:
 *    - expect(x).toBe(y), expect(x).toEqual(y), expect(x).toThrow(), expect(x).toContain(y)
 *    - Modifier prefixes: expect(x).not.toBe(y), expect(x).resolves.toEqual(y)
 * 2. assert member calls and functions:
 *    - assert.equal(a, b), assert.strictEqual(a, b), assert.deepEqual(a, b)
 *    - assert.ok(a), assert.throws(fn), assert(condition)
 *
 * Attributes assertions to their innermost enclosing test block (handling nested callbacks).
 * Strictly prevents double-counting by identifying full assertion call chains without
 * re-extracting internal expect() sub-calls.
 */

import { CallExpression, Node, type SourceFile } from "ts-morph";
import type { SourceSpan } from "../domain/types.js";
import { AstNormalizer } from "../ast/ast-normalizer.js";
import type { TestDeclaration } from "./test-locator.js";

export interface AssertionDescriptor {
  readonly id: string; // e.g. "AST-001"
  readonly style: "EXPECT" | "ASSERT";
  readonly matcherName: string; // e.g. "toBe", "toEqual", "strictEqual"
  readonly isNegated: boolean;
  readonly targetExpression: string | null;
  readonly expectedExpression: string | null;
  readonly rawText: string;
  readonly normalizedText: string;
  readonly span: SourceSpan;
  readonly enclosingTestTitle: string | null;
}

export interface ExtractionResult {
  readonly assertions: readonly AssertionDescriptor[];
  readonly unsupportedAssertions: readonly string[];
}

export class AssertionExtractor {
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
   * Inspects a CallExpression to check if it represents an `expect(...)` assertion chain.
   */
  private static parseExpectAssertion(callExpr: CallExpression): {
    matcherName: string;
    isNegated: boolean;
    targetExpr: string | null;
    expectedExpr: string | null;
  } | null {
    // expect(...) matcher call has form: <expectCall>.<matcher>(<expected>)
    // or <expectCall>.<modifier>.<matcher>(<expected>)
    const expr = callExpr.getExpression();
    if (!Node.isPropertyAccessExpression(expr)) {
      return null;
    }

    const matcherName = expr.getName();
    let currentPropExpr = expr.getExpression();
    let isNegated = false;

    // Traverse any intermediate property access modifiers like .not or .resolves / .rejects
    while (Node.isPropertyAccessExpression(currentPropExpr)) {
      const modifier = currentPropExpr.getName();
      if (modifier === "not") {
        isNegated = true;
      }
      currentPropExpr = currentPropExpr.getExpression();
    }

    // currentPropExpr must now be a CallExpression of `expect(...)`
    if (!Node.isCallExpression(currentPropExpr)) {
      return null;
    }

    const baseCallee = currentPropExpr.getExpression();
    if (!Node.isIdentifier(baseCallee) || baseCallee.getText() !== "expect") {
      return null;
    }

    // Found valid expect chain!
    const expectArgs = currentPropExpr.getArguments();
    const targetExpr = expectArgs.length > 0
      ? AstNormalizer.normalizeExpression(expectArgs[0])
      : null;

    const matcherArgs = callExpr.getArguments();
    const expectedExpr = matcherArgs.length > 0
      ? AstNormalizer.normalizeExpression(matcherArgs[0])
      : null;

    return {
      matcherName,
      isNegated,
      targetExpr,
      expectedExpr,
    };
  }

  /**
   * Inspects a CallExpression to check if it represents an `assert` call.
   */
  private static parseAssertAssertion(callExpr: CallExpression): {
    matcherName: string;
    isNegated: boolean;
    targetExpr: string | null;
    expectedExpr: string | null;
  } | null {
    const expr = callExpr.getExpression();

    // Pattern 1: assert(condition, message)
    if (Node.isIdentifier(expr) && expr.getText() === "assert") {
      const args = callExpr.getArguments();
      const targetExpr = args.length > 0 ? AstNormalizer.normalizeExpression(args[0]) : null;
      return {
        matcherName: "ok",
        isNegated: false,
        targetExpr,
        expectedExpr: null,
      };
    }

    // Pattern 2: assert.equal(actual, expected)
    if (Node.isPropertyAccessExpression(expr)) {
      const obj = expr.getExpression();
      if (Node.isIdentifier(obj) && obj.getText() === "assert") {
        const matcherName = expr.getName();
        const args = callExpr.getArguments();
        const targetExpr = args.length > 0 ? AstNormalizer.normalizeExpression(args[0]) : null;
        const expectedExpr = args.length > 1 ? AstNormalizer.normalizeExpression(args[1]) : null;
        const isNegated = matcherName.toLowerCase().includes("not");

        return {
          matcherName,
          isNegated,
          targetExpr,
          expectedExpr,
        };
      }
    }

    return null;
  }

  /**
   * Checks if a call expression resembles an unsupported assertion pattern (e.g. .should.equal).
   */
  private static isUnsupportedAssertionPattern(callExpr: CallExpression): boolean {
    const text = callExpr.getText();
    // BDD 'should' syntax or custom assert functions
    if (text.includes(".should.") || text.includes(".should(")) {
      return true;
    }
    const calleeText = callExpr.getExpression().getText();
    if (
      (calleeText.startsWith("customAssert") || calleeText.startsWith("verify")) &&
      !calleeText.includes("expect") &&
      !calleeText.includes("assert")
    ) {
      return true;
    }
    return false;
  }

  /**
   * Extracts assertions from a SourceFile, mapping each assertion to its closest
   * enclosing TestDeclaration.
   */
  static extractAssertions(
    sourceFile: SourceFile,
    declarations: readonly TestDeclaration[]
  ): ExtractionResult {
    const assertions: AssertionDescriptor[] = [];
    const unsupportedAssertions: string[] = [];

    // Map each declaration's callback node to the declaration for quick lookup
    const callbackToDeclaration = new Map<Node, TestDeclaration>();
    for (const d of declarations) {
      if (d.callbackNode) {
        callbackToDeclaration.set(d.callbackNode, d);
      }
    }

    // Stack of enclosing test declarations
    const testStack: TestDeclaration[] = [];
    let counter = 1;

    function traverse(node: Node): void {
      // Check if entering a test declaration's callback
      const matchingDecl = callbackToDeclaration.get(node);
      if (matchingDecl) {
        testStack.push(matchingDecl);
      }

      if (Node.isCallExpression(node)) {
        // 1. Try parsing expect assertion
        const expectInfo = AssertionExtractor.parseExpectAssertion(node);
        if (expectInfo) {
          const rawText = node.getText();
          const enclosingTitle = testStack.length > 0
            ? testStack[testStack.length - 1].fullTitle
            : null;

          assertions.push({
            id: `AST-${String(counter++).padStart(3, "0")}`,
            style: "EXPECT",
            matcherName: expectInfo.matcherName,
            isNegated: expectInfo.isNegated,
            targetExpression: expectInfo.targetExpr,
            expectedExpression: expectInfo.expectedExpr,
            rawText,
            normalizedText: AstNormalizer.normalizeText(rawText),
            span: AssertionExtractor.getSourceSpan(node),
            enclosingTestTitle: enclosingTitle,
          });

          // DO NOT recurse into the expect call's callee or arguments looking for another assertion
          // to avoid double counting!
          if (matchingDecl) {
            testStack.pop();
          }
          return;
        }

        // 2. Try parsing assert assertion
        const assertInfo = AssertionExtractor.parseAssertAssertion(node);
        if (assertInfo) {
          const rawText = node.getText();
          const enclosingTitle = testStack.length > 0
            ? testStack[testStack.length - 1].fullTitle
            : null;

          assertions.push({
            id: `AST-${String(counter++).padStart(3, "0")}`,
            style: "ASSERT",
            matcherName: assertInfo.matcherName,
            isNegated: assertInfo.isNegated,
            targetExpression: assertInfo.targetExpr,
            expectedExpression: assertInfo.expectedExpr,
            rawText,
            normalizedText: AstNormalizer.normalizeText(rawText),
            span: AssertionExtractor.getSourceSpan(node),
            enclosingTestTitle: enclosingTitle,
          });

          if (matchingDecl) {
            testStack.pop();
          }
          return;
        }

        // 3. Check for unsupported assertion patterns
        if (AssertionExtractor.isUnsupportedAssertionPattern(node)) {
          unsupportedAssertions.push(node.getText().slice(0, 100));
        }
      }

      node.forEachChild(traverse);

      if (matchingDecl) {
        testStack.pop();
      }
    }

    sourceFile.forEachChild(traverse);

    return {
      assertions,
      unsupportedAssertions,
    };
  }
}

