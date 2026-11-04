/**
 * Change Archaeologist - AST Normalizer
 *
 * Normalizes AST expressions and tokens for semantic comparison:
 * - Unwraps redundant outer parentheses without collapsing operator precedence.
 * - Strips trivia (comments, whitespace, newlines).
 * - Produces canonical strings for comparison while preserving raw text for evidence.
 */

import { Node } from "ts-morph";

export class AstNormalizer {
  /**
   * Recursively unwraps redundant outer ParenthesizedExpressions.
   * e.g., ((!x)) -> !x
   * Note: Does not unwrap inner parentheses that establish operator precedence, like (a && b) || c.
   */
  static unwrapParentheses(node: Node): Node {
    let current = node;
    while (Node.isParenthesizedExpression(current)) {
      current = current.getExpression();
    }
    return current;
  }

  /**
   * Normalizes source text by removing single-line and multi-line comments
   * and collapsing multiple spaces/newlines into a single space.
   */
  static normalizeText(raw: string): string {
    return raw
      .replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, "") // Strip comments
      .replace(/\s+/g, " ")                   // Collapse whitespace
      .trim();
  }

  /**
   * Produces a normalized, comment-free string representation of an AST expression node.
   */
  static normalizeExpression(node: Node): string {
    const unwrapped = AstNormalizer.unwrapParentheses(node);
    return AstNormalizer.normalizeText(unwrapped.getText());
  }
}

