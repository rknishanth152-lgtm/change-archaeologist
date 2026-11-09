import { describe, it, expect } from "vitest";
import {
  Project,
  SyntaxKind,
  Node,
  type SourceFile,
  type IfStatement,
  type BinaryExpression,
} from "ts-morph";

// ============================================================================
// PART 1: DOMAIN TYPES AND CONTRACTS
// ============================================================================

export type RevisionRole = "BASE" | "HEAD";

export interface SourceSpan {
  readonly startLine: number;
  readonly startColumn: number;
  readonly endLine: number;
  readonly endColumn: number;
}

export interface GuardDescriptor {
  readonly fingerprint: string;
  readonly conditionText: string;
  readonly normalizedCondition: string;
  readonly exitKind: "RETURN" | "THROW";
  readonly exitText: string;
  readonly normalizedExit: string;
  readonly isLeadingGuard: boolean;
  readonly nestingDepth: number;
  readonly span: SourceSpan;
  readonly rawText: string;
}

export interface ConditionalDescriptor {
  readonly fingerprint: string;
  readonly constructKind: "IF_STATEMENT" | "TERNARY_EXPRESSION" | "SWITCH_STATEMENT";
  readonly conditionText: string;
  readonly normalizedCondition: string;
  readonly operatorTokens: readonly string[];
  readonly nestingDepth: number;
  readonly span: SourceSpan;
  readonly rawText: string;
}

export interface ThrowDescriptor {
  readonly fingerprint: string;
  readonly thrownExpressionText: string;
  readonly normalizedExpression: string;
  readonly enclosingGuardCondition: string | null;
  readonly nestingDepth: number;
  readonly span: SourceSpan;
  readonly rawText: string;
}

export interface ReturnDescriptor {
  readonly fingerprint: string;
  readonly returnCategory: "VOID_OR_EMPTY" | "NULL_OR_UNDEFINED" | "BOOLEAN_LITERAL" | "EXPRESSION";
  readonly expressionText: string | null;
  readonly normalizedExpression: string | null;
  readonly isEarlyReturn: boolean;
  readonly nestingDepth: number;
  readonly span: SourceSpan;
  readonly rawText: string;
}

export interface FunctionSnapshot {
  readonly role: RevisionRole;
  readonly functionName: string;
  readonly span: SourceSpan;
  readonly signatureText: string;
  readonly rawBodyText: string;
  readonly guards: readonly GuardDescriptor[];
  readonly conditionals: readonly ConditionalDescriptor[];
  readonly throws: readonly ThrowDescriptor[];
  readonly returns: readonly ReturnDescriptor[];
}

export type StructuralChangeCategory =
  | "GUARD_CLAUSE"
  | "CONDITIONAL_EXPRESSION"
  | "THROW_STATEMENT"
  | "RETURN_STATEMENT";

export interface StructuralChange {
  readonly id: string;
  readonly ruleId: string;
  readonly category: StructuralChangeCategory;
  readonly changeType: "ADDED" | "REMOVED" | "MODIFIED";
  readonly summary: string;
  readonly beforeSpan: SourceSpan | null;
  readonly afterSpan: SourceSpan | null;
  readonly beforeSnippet: string | null;
  readonly afterSnippet: string | null;
}

export interface ObservationStatement {
  readonly id: string;
  readonly category: "OBSERVED";
  readonly statement: string;
  readonly span: SourceSpan | null;
  readonly snippet: string | null;
}

export interface InferenceStatement {
  readonly id: string;
  readonly category: "INFERRED";
  readonly statement: string;
  readonly ruleId: string;
  readonly supportingObservationIds: readonly string[];
}

export interface UnknownStatement {
  readonly id: string;
  readonly category: "UNKNOWN";
  readonly statement: string;
  readonly reasonCategory:
    | "EXTERNAL_CALLER_BEHAVIOR"
    | "HELPER_DELEGATION_POSSIBLE"
    | "RUNTIME_TEST_EXECUTION_UNVERIFIED"
    | "TEST_CORRELATION_AMBIGUOUS"
    | "LINEAGE_OR_PARSE_BOUNDARY";
}

export interface Finding {
  readonly id: string;
  readonly title: string;
  readonly category: StructuralChangeCategory | "LINEAGE_LIMITATION";
  readonly structuralChangeIds: readonly string[];
  readonly observed: readonly ObservationStatement[];
  readonly inferred: readonly InferenceStatement[];
  readonly unknown: readonly UnknownStatement[];
}

export type AnalysisStatus =
  | "COMPLETED_WITH_FINDINGS"
  | "COMPLETED_NO_STRUCTURAL_CHANGES"
  | "INCOMPLETE_FUNCTION_MISSING";

export interface AnalysisComparisonResult {
  readonly status: AnalysisStatus;
  readonly baseFunction: FunctionSnapshot | null;
  readonly headFunction: FunctionSnapshot | null;
  readonly structuralChanges: readonly StructuralChange[];
  readonly findings: readonly Finding[];
  readonly limitations: readonly string[];
}

// ============================================================================
// PART 2: EXTRACTION LOGIC
// ============================================================================

export class AstNormalizer {
  /**
   * Unwraps redundant outer parentheses from an expression node.
   * e.g., ((!x)) -> !x
   * Does NOT strip parentheses that establish operator precedence, like (a && b) || c.
   */
  static unwrapParentheses(node: Node): Node {
    let current = node;
    while (Node.isParenthesizedExpression(current)) {
      current = current.getExpression();
    }
    return current;
  }

  /**
   * Normalizes source text by removing comments (trivia) and collapsing whitespace.
   */
  static normalizeText(raw: string): string {
    return raw
      .replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, "") // Strip single-line and multi-line comments
      .replace(/\s+/g, " ")                   // Collapse multiple spaces/newlines
      .trim();
  }

  /**
   * Produces a normalized, comment-free representation of an AST expression.
   */
  static normalizeExpression(node: Node): string {
    const unwrapped = AstNormalizer.unwrapParentheses(node);
    return AstNormalizer.normalizeText(unwrapped.getText());
  }
}

export class FunctionLocator {
  /**
   * Resolves a named function node within an in-memory SourceFile.
   * Handles:
   * 1. FunctionDeclaration
   * 2. VariableDeclaration initialized to ArrowFunction or FunctionExpression
   * 3. Class MethodDeclaration (unqualified or QualifiedName: Class.method)
   */
  static findFunction(sourceFile: SourceFile, name: string): Node | null {
    // 1. FunctionDeclaration with implementation body (skips ambient / overload headers)
    const fnDecl = sourceFile.getFunctions().find(
      (f) => f.getName() === name && f.getBody() !== undefined
    );
    if (fnDecl) return fnDecl;

    // 2. VariableDeclaration with ArrowFunction or FunctionExpression
    const varDecl = sourceFile.getVariableDeclaration(name);
    if (varDecl) {
      const init = varDecl.getInitializer();
      if (init && (Node.isArrowFunction(init) || Node.isFunctionExpression(init))) {
        return init;
      }
    }

    // 3. Class MethodDeclaration
    if (name.includes(".")) {
      const [className, methodName] = name.split(".");
      const cls = sourceFile.getClass(className);
      const method = cls?.getMethod(methodName);
      if (method && method.getBody()) return method;
    } else {
      for (const cls of sourceFile.getClasses()) {
        const method = cls.getMethod(name);
        if (method && method.getBody()) return method;
      }
    }

    return null;
  }

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
}

export class StructuralExtractor {
  /**
   * Traverses descendants within a scope, explicitly STOPPING at nested function boundaries.
   * This guarantees that callback statements (e.g., inside .map(), .forEach(), closures)
   * are never attributed to the outer function.
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
   * Calculates nesting depth of a node relative to a function root.
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
    functionName: string,
    role: RevisionRole
  ): FunctionSnapshot {
    const span = FunctionLocator.getSourceSpan(fnNode);

    // Resolve body node
    let bodyNode: Node | undefined;
    let signatureText = "";

    if (Node.isFunctionDeclaration(fnNode)) {
      bodyNode = fnNode.getBody();
      signatureText = fnNode.getText().slice(0, fnNode.getText().indexOf("{")).trim();
    } else if (Node.isMethodDeclaration(fnNode)) {
      bodyNode = fnNode.getBody();
      signatureText = fnNode.getText().slice(0, fnNode.getText().indexOf("{")).trim();
    } else if (Node.isArrowFunction(fnNode)) {
      bodyNode = fnNode.getBody();
      const raw = fnNode.getText();
      const arrowIndex = raw.indexOf("=>");
      signatureText = arrowIndex !== -1 ? raw.slice(0, arrowIndex + 2).trim() : functionName;
    } else if (Node.isFunctionExpression(fnNode)) {
      bodyNode = fnNode.getBody();
      signatureText = fnNode.getText().slice(0, fnNode.getText().indexOf("{")).trim();
    }

    if (!bodyNode) {
      return {
        role,
        functionName,
        span,
        signatureText: signatureText || functionName,
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

    // Pre-calculate leading guard boundaries in top-level statements
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

    // 2. Extract Conditionals (IfStatement conditions, Ternary conditions, Switch discriminants)
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
      functionName,
      span,
      signatureText: signatureText || functionName,
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

    // Collect operator tokens in binary condition expressions
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

// ============================================================================
// PART 3: COMPARISON AND FINDING GENERATION LOGIC
// ============================================================================

export class StructuralComparator {
  private static isSpanEnclosed(inner: SourceSpan, outer: SourceSpan): boolean {
    if (inner.startLine < outer.startLine || inner.endLine > outer.endLine) return false;
    if (inner.startLine === outer.startLine && inner.startColumn < outer.startColumn) return false;
    if (inner.endLine === outer.endLine && inner.endColumn > outer.endColumn) return false;
    return true;
  }

  /**
   * Compares two snapshots of a function and generates structural changes
   * alongside epistemic findings (OBSERVED, INFERRED, UNKNOWN).
   *
   * Enforces deduplication:
   * When a guard clause removal subsumes an exit statement (return or throw),
   * only ONE finding is emitted for the guard removal rather than duplicate findings.
   */
  static compare(
    baseFn: FunctionSnapshot,
    headFn: FunctionSnapshot
  ): { structuralChanges: StructuralChange[]; findings: Finding[] } {
    const structuralChanges: StructuralChange[] = [];
    const findings: Finding[] = [];

    let changeSeq = 1;
    let obsSeq = 1;
    let infSeq = 1;
    let unkSeq = 1;
    let fndSeq = 1;

    const nextChangeId = () => `SC-${String(changeSeq++).padStart(3, "0")}`;
    const nextObsId = () => `OBS-${String(obsSeq++).padStart(3, "0")}`;
    const nextInfId = () => `INF-${String(infSeq++).padStart(3, "0")}`;
    const nextUnkId = () => `UNK-${String(unkSeq++).padStart(3, "0")}`;
    const nextFndId = () => `FND-${String(fndSeq++).padStart(3, "0")}`;

    // Track spans of guards that were removed or converted to avoid duplicate findings
    const removedGuardSpans: SourceSpan[] = [];
    const convertedGuardBaseSpans: SourceSpan[] = [];

    // ------------------------------------------------------------------------
    // Rule 1: Guard Clauses and Throw-to-Return Conversions
    // ------------------------------------------------------------------------
    const unmatchedBaseGuards: GuardDescriptor[] = [];
    const unmatchedHeadGuards = [...headFn.guards];

    for (const bGuard of baseFn.guards) {
      const matchIdx = unmatchedHeadGuards.findIndex(
        (h) => h.fingerprint === bGuard.fingerprint
      );
      if (matchIdx !== -1) {
        // Exact match -> unchanged
        unmatchedHeadGuards.splice(matchIdx, 1);
      } else {
        unmatchedBaseGuards.push(bGuard);
      }
    }

    // Check for conversions under the same condition (e.g. Throw to Return)
    // or condition mutations of a guard at the same position with the same exit
    const stillUnmatchedBaseGuards: GuardDescriptor[] = [];

    for (const bGuard of unmatchedBaseGuards) {
      // 1. Same condition, exit converted (e.g. Throw to Return)
      const convIdx = unmatchedHeadGuards.findIndex(
        (h) => h.normalizedCondition === bGuard.normalizedCondition
      );

      if (convIdx !== -1) {
        const hGuard = unmatchedHeadGuards[convIdx];
        unmatchedHeadGuards.splice(convIdx, 1);
        convertedGuardBaseSpans.push(bGuard.span);

        if (bGuard.exitKind === "THROW" && hGuard.exitKind === "RETURN") {
          // Detected Throw-to-Return conversion!
          const changeId = nextChangeId();
          const change: StructuralChange = {
            id: changeId,
            ruleId: "RULE_THROW_TO_RETURN_CONVERSION",
            category: "GUARD_CLAUSE",
            changeType: "MODIFIED",
            summary: `Throw-to-return conversion under condition "${bGuard.normalizedCondition}": ${bGuard.exitText} replaced by ${hGuard.exitText}`,
            beforeSpan: bGuard.span,
            afterSpan: hGuard.span,
            beforeSnippet: bGuard.rawText,
            afterSnippet: hGuard.rawText,
          };
          structuralChanges.push(change);

          const obsId = nextObsId();
          findings.push({
            id: nextFndId(),
            title: `Throw-to-return conversion under condition (${bGuard.normalizedCondition})`,
            category: "GUARD_CLAUSE",
            structuralChangeIds: [changeId],
            observed: [
              {
                id: obsId,
                category: "OBSERVED",
                statement: `Under condition "${bGuard.normalizedCondition}", throw statement "${bGuard.exitText}" at BASE lines ${bGuard.span.startLine}-${bGuard.span.endLine} was replaced with return statement "${hGuard.exitText}" at HEAD lines ${hGuard.span.startLine}-${hGuard.span.endLine}.`,
                span: bGuard.span,
                snippet: bGuard.rawText,
              },
            ],
            inferred: [
              {
                id: nextInfId(),
                category: "INFERRED",
                statement: `Control flow changed from raising an exception to returning a value when condition "${bGuard.normalizedCondition}" is satisfied.`,
                ruleId: "RULE_THROW_TO_RETURN_CONVERSION",
                supportingObservationIds: [obsId],
              },
            ],
            unknown: [
              {
                id: nextUnkId(),
                category: "UNKNOWN",
                statement: `Static analysis cannot determine whether external callers handle the return value or still expect an exception.`,
                reasonCategory: "EXTERNAL_CALLER_BEHAVIOR",
              },
            ],
          });
        } else {
          // Guard exit modified
          const changeId = nextChangeId();
          structuralChanges.push({
            id: changeId,
            ruleId: "RULE_GUARD_MODIFIED",
            category: "GUARD_CLAUSE",
            changeType: "MODIFIED",
            summary: `Guard exit modified under condition "${bGuard.normalizedCondition}": ${bGuard.exitText} -> ${hGuard.exitText}`,
            beforeSpan: bGuard.span,
            afterSpan: hGuard.span,
            beforeSnippet: bGuard.rawText,
            afterSnippet: hGuard.rawText,
          });
        }
        continue;
      }

      // 2. Same exit statement and depth, but condition mutated (e.g. if (a && b) return 1 -> if (a || b) return 1)
      // The condition mutation will be reported by RULE_CONDITIONAL_MODIFIED.
      // We pair them here so we don't ALSO emit false duplicate GUARD_REMOVED and GUARD_ADDED findings.
      const sameExitIdx = unmatchedHeadGuards.findIndex(
        (h) =>
          h.exitKind === bGuard.exitKind &&
          h.normalizedExit === bGuard.normalizedExit &&
          h.nestingDepth === bGuard.nestingDepth
      );

      if (sameExitIdx !== -1) {
        // Paired as condition-modified guard clause; consumed without emitting duplicate guard remove/add
        unmatchedHeadGuards.splice(sameExitIdx, 1);
        continue;
      }

      stillUnmatchedBaseGuards.push(bGuard);
    }

    // Remaining unmatched base guards are REMOVALS
    for (const bGuard of stillUnmatchedBaseGuards) {
      removedGuardSpans.push(bGuard.span);
      const changeId = nextChangeId();
      const change: StructuralChange = {
        id: changeId,
        ruleId: "RULE_GUARD_REMOVED",
        category: "GUARD_CLAUSE",
        changeType: "REMOVED",
        summary: `Guard clause removed: if (${bGuard.normalizedCondition}) with ${bGuard.exitKind} exit (${bGuard.exitText})`,
        beforeSpan: bGuard.span,
        afterSpan: null,
        beforeSnippet: bGuard.rawText,
        afterSnippet: null,
      };
      structuralChanges.push(change);

      const obsId = nextObsId();
      findings.push({
        id: nextFndId(),
        title: `Guard clause removed: if (${bGuard.normalizedCondition})`,
        category: "GUARD_CLAUSE",
        structuralChangeIds: [changeId],
        observed: [
          {
            id: obsId,
            category: "OBSERVED",
            statement: `Guard clause "if (${bGuard.conditionText})" with exit "${bGuard.exitText}" at BASE lines ${bGuard.span.startLine}-${bGuard.span.endLine} is absent in HEAD.`,
            span: bGuard.span,
            snippet: bGuard.rawText,
          },
        ],
        inferred: [
          {
            id: nextInfId(),
            category: "INFERRED",
            statement: `Early-exit validation guard for "${bGuard.normalizedCondition}" was removed from "${baseFn.functionName}".`,
            ruleId: "RULE_GUARD_REMOVED",
            supportingObservationIds: [obsId],
          },
        ],
        unknown: [
          {
            id: nextUnkId(),
            category: "UNKNOWN",
            statement: `Static analysis cannot determine whether upstream callers now validate "${bGuard.normalizedCondition}" or if this removal allows invalid arguments to reach subsequent logic.`,
            reasonCategory: "EXTERNAL_CALLER_BEHAVIOR",
          },
        ],
      });
    }

    // Remaining unmatched head guards are ADDITIONS
    for (const hGuard of unmatchedHeadGuards) {
      const changeId = nextChangeId();
      structuralChanges.push({
        id: changeId,
        ruleId: "RULE_GUARD_ADDED",
        category: "GUARD_CLAUSE",
        changeType: "ADDED",
        summary: `Guard clause added: if (${hGuard.normalizedCondition}) with ${hGuard.exitKind} exit (${hGuard.exitText})`,
        beforeSpan: null,
        afterSpan: hGuard.span,
        beforeSnippet: null,
        afterSnippet: hGuard.rawText,
      });

      const obsId = nextObsId();
      findings.push({
        id: nextFndId(),
        title: `Guard clause added: if (${hGuard.normalizedCondition})`,
        category: "GUARD_CLAUSE",
        structuralChangeIds: [changeId],
        observed: [
          {
            id: obsId,
            category: "OBSERVED",
            statement: `Guard clause "if (${hGuard.conditionText})" with exit "${hGuard.exitText}" was introduced at HEAD lines ${hGuard.span.startLine}-${hGuard.span.endLine}.`,
            span: hGuard.span,
            snippet: hGuard.rawText,
          },
        ],
        inferred: [
          {
            id: nextInfId(),
            category: "INFERRED",
            statement: `New early-exit guard was introduced for "${hGuard.normalizedCondition}".`,
            ruleId: "RULE_GUARD_ADDED",
            supportingObservationIds: [obsId],
          },
        ],
        unknown: [
          {
            id: nextUnkId(),
            category: "UNKNOWN",
            statement: `Static analysis cannot confirm whether existing callers were updated for this new guard.`,
            reasonCategory: "EXTERNAL_CALLER_BEHAVIOR",
          },
        ],
      });
    }

    // ------------------------------------------------------------------------
    // Rule 2: Conditional Expressions (e.g., && to ||)
    // ------------------------------------------------------------------------
    const minCondLen = Math.min(baseFn.conditionals.length, headFn.conditionals.length);
    for (let i = 0; i < minCondLen; i++) {
      const bCond = baseFn.conditionals[i];
      const hCond = headFn.conditionals[i];

      if (
        bCond.constructKind === hCond.constructKind &&
        bCond.normalizedCondition !== hCond.normalizedCondition
      ) {
        const bOps = bCond.operatorTokens.join(" ");
        const hOps = hCond.operatorTokens.join(" ");
        const opNote = bOps !== hOps ? ` (operator changed from "${bOps}" to "${hOps}")` : "";

        const changeId = nextChangeId();
        structuralChanges.push({
          id: changeId,
          ruleId: "RULE_CONDITIONAL_MODIFIED",
          category: "CONDITIONAL_EXPRESSION",
          changeType: "MODIFIED",
          summary: `Condition changed from "${bCond.conditionText}" to "${hCond.conditionText}"${opNote}`,
          beforeSpan: bCond.span,
          afterSpan: hCond.span,
          beforeSnippet: bCond.rawText,
          afterSnippet: hCond.rawText,
        });

        const obsId = nextObsId();
        findings.push({
          id: nextFndId(),
          title: `Conditional expression modified: ${bCond.conditionText} -> ${hCond.conditionText}`,
          category: "CONDITIONAL_EXPRESSION",
          structuralChangeIds: [changeId],
          observed: [
            {
              id: obsId,
              category: "OBSERVED",
              statement: `Condition expression at BASE lines ${bCond.span.startLine}-${bCond.span.endLine} (${bCond.conditionText}) was replaced with (${hCond.conditionText}) at HEAD lines ${hCond.span.startLine}-${hCond.span.endLine}${opNote}.`,
              span: bCond.span,
              snippet: bCond.rawText,
            },
          ],
          inferred: [
            {
              id: nextInfId(),
              category: "INFERRED",
              statement: `Conditional branching logic altered; evaluation rule changed between base and head.`,
              ruleId: "RULE_CONDITIONAL_MODIFIED",
              supportingObservationIds: [obsId],
            },
          ],
          unknown: [
            {
              id: nextUnkId(),
              category: "UNKNOWN",
              statement: `Static analysis does not prove whether operands are constrained elsewhere or whether the new branch condition is reachable.`,
              reasonCategory: "EXTERNAL_CALLER_BEHAVIOR",
            },
          ],
        });
      }
    }

    // ------------------------------------------------------------------------
    // Rule 3: Throw Statements (excluding those already subsumed by guard changes)
    // ------------------------------------------------------------------------
    for (const bThrow of baseFn.throws) {
      // Deduplicate: If this throw was part of a removed guard or throw-to-return conversion, skip!
      const isSubsumedByGuardRemoval = removedGuardSpans.some((gSpan) =>
        StructuralComparator.isSpanEnclosed(bThrow.span, gSpan)
      );
      const isSubsumedByConversion = convertedGuardBaseSpans.some((gSpan) =>
        StructuralComparator.isSpanEnclosed(bThrow.span, gSpan)
      );
      if (isSubsumedByGuardRemoval || isSubsumedByConversion) {
        continue;
      }

      const match = headFn.throws.find((h) => h.fingerprint === bThrow.fingerprint);
      if (!match) {
        const changeId = nextChangeId();
        structuralChanges.push({
          id: changeId,
          ruleId: "RULE_THROW_REMOVED",
          category: "THROW_STATEMENT",
          changeType: "REMOVED",
          summary: `Standalone throw statement removed: ${bThrow.rawText}`,
          beforeSpan: bThrow.span,
          afterSpan: null,
          beforeSnippet: bThrow.rawText,
          afterSnippet: null,
        });

        const obsId = nextObsId();
        findings.push({
          id: nextFndId(),
          title: `Throw statement removed`,
          category: "THROW_STATEMENT",
          structuralChangeIds: [changeId],
          observed: [
            {
              id: obsId,
              category: "OBSERVED",
              statement: `Throw statement "${bThrow.rawText}" at BASE lines ${bThrow.span.startLine}-${bThrow.span.endLine} is absent in HEAD.`,
              span: bThrow.span,
              snippet: bThrow.rawText,
            },
          ],
          inferred: [
            {
              id: nextInfId(),
              category: "INFERRED",
              statement: `An exception path was eliminated from "${baseFn.functionName}".`,
              ruleId: "RULE_THROW_REMOVED",
              supportingObservationIds: [obsId],
            },
          ],
          unknown: [
            {
              id: nextUnkId(),
              category: "UNKNOWN",
              statement: `Callers handling this exception may no longer receive it.`,
              reasonCategory: "EXTERNAL_CALLER_BEHAVIOR",
            },
          ],
        });
      }
    }

    // ------------------------------------------------------------------------
    // Rule 4: Return Statements (excluding those already subsumed by guard changes)
    // ------------------------------------------------------------------------
    for (const bRet of baseFn.returns) {
      const isSubsumedByGuardRemoval = removedGuardSpans.some((gSpan) =>
        StructuralComparator.isSpanEnclosed(bRet.span, gSpan)
      );
      const isSubsumedByConversion = convertedGuardBaseSpans.some((gSpan) =>
        StructuralComparator.isSpanEnclosed(bRet.span, gSpan)
      );
      if (isSubsumedByGuardRemoval || isSubsumedByConversion) {
        continue;
      }

      // Check for standalone return removals or modifications
      const match = headFn.returns.find((h) => h.fingerprint === bRet.fingerprint);
      if (!match) {
        // Check if there is a return at the same position with modified expression
        const pairedHeadReturn = headFn.returns.find(
          (h) => h.isEarlyReturn === bRet.isEarlyReturn && h.nestingDepth === bRet.nestingDepth
        );
        if (pairedHeadReturn && pairedHeadReturn.fingerprint !== bRet.fingerprint) {
          const changeId = nextChangeId();
          structuralChanges.push({
            id: changeId,
            ruleId: "RULE_RETURN_MODIFIED",
            category: "RETURN_STATEMENT",
            changeType: "MODIFIED",
            summary: `Return statement modified: from "${bRet.rawText}" to "${pairedHeadReturn.rawText}"`,
            beforeSpan: bRet.span,
            afterSpan: pairedHeadReturn.span,
            beforeSnippet: bRet.rawText,
            afterSnippet: pairedHeadReturn.rawText,
          });
        }
      }
    }

    return { structuralChanges, findings };
  }
}

// ============================================================================
// PART 4: COORDINATOR ENTRYPOINT
// ============================================================================

export function compareFunctionRevisions(
  baseSource: string,
  headSource: string,
  targetFunctionName: string
): AnalysisComparisonResult {
  const project = new Project({
    useInMemoryFileSystem: true,
    compilerOptions: {
      target: 99, // ESNext
      allowJs: true,
    },
  });

  const baseFile = project.createSourceFile("base.ts", baseSource, { overwrite: true });
  const headFile = project.createSourceFile("head.ts", headSource, { overwrite: true });

  const baseNode = FunctionLocator.findFunction(baseFile, targetFunctionName);
  const headNode = FunctionLocator.findFunction(headFile, targetFunctionName);

  // Experiment 7: Report explicit limitation when target function cannot be found in one revision
  if (!baseNode || !headNode) {
    const limitations: string[] = [];
    const findings: Finding[] = [];

    if (!baseNode && !headNode) {
      limitations.push(
        `Target function "${targetFunctionName}" was not found in either BASE or HEAD revision.`
      );
    } else if (!baseNode) {
      limitations.push(
        `Target function "${targetFunctionName}" was not found in BASE revision (may have been newly added in HEAD).`
      );
      findings.push({
        id: "FND-001",
        title: `Function "${targetFunctionName}" missing in BASE revision`,
        category: "LINEAGE_LIMITATION",
        structuralChangeIds: [],
        observed: [
          {
            id: "OBS-001",
            category: "OBSERVED",
            statement: `Target function "${targetFunctionName}" was absent in BASE revision, but exists in HEAD at lines ${FunctionLocator.getSourceSpan(headNode!).startLine}-${FunctionLocator.getSourceSpan(headNode!).endLine}.`,
            span: FunctionLocator.getSourceSpan(headNode!),
            snippet: headNode!.getText().slice(0, 100),
          },
        ],
        inferred: [
          {
            id: "INF-001",
            category: "INFERRED",
            statement: `Target function was either newly introduced in HEAD or moved from another file.`,
            ruleId: "RULE_LINEAGE_LIMITATION",
            supportingObservationIds: ["OBS-001"],
          },
        ],
        unknown: [
          {
            id: "UNK-001",
            category: "UNKNOWN",
            statement: `Single-file AST comparison cannot track historical function movement or renames across the repository.`,
            reasonCategory: "LINEAGE_OR_PARSE_BOUNDARY",
          },
        ],
      });
    } else {
      limitations.push(
        `Target function "${targetFunctionName}" was not found in HEAD revision (may have been renamed, deleted, or moved).`
      );
      findings.push({
        id: "FND-001",
        title: `Function "${targetFunctionName}" missing in HEAD revision`,
        category: "LINEAGE_LIMITATION",
        structuralChangeIds: [],
        observed: [
          {
            id: "OBS-001",
            category: "OBSERVED",
            statement: `Target function "${targetFunctionName}" was present in BASE at lines ${FunctionLocator.getSourceSpan(baseNode).startLine}-${FunctionLocator.getSourceSpan(baseNode).endLine}, but could not be found in HEAD.`,
            span: FunctionLocator.getSourceSpan(baseNode),
            snippet: baseNode.getText().slice(0, 100),
          },
        ],
        inferred: [
          {
            id: "INF-001",
            category: "INFERRED",
            statement: `Target function may have been removed, renamed, or extracted to another module.`,
            ruleId: "RULE_LINEAGE_LIMITATION",
            supportingObservationIds: ["OBS-001"],
          },
        ],
        unknown: [
          {
            id: "UNK-001",
            category: "UNKNOWN",
            statement: `Pairwise single-file AST comparison cannot track symbol lineage across renames or file moves without repository-wide symbol resolution.`,
            reasonCategory: "LINEAGE_OR_PARSE_BOUNDARY",
          },
        ],
      });
    }

    return {
      status: "INCOMPLETE_FUNCTION_MISSING",
      baseFunction: baseNode ? StructuralExtractor.extractSnapshot(baseNode, targetFunctionName, "BASE") : null,
      headFunction: headNode ? StructuralExtractor.extractSnapshot(headNode, targetFunctionName, "HEAD") : null,
      structuralChanges: [],
      findings,
      limitations,
    };
  }

  const baseSnapshot = StructuralExtractor.extractSnapshot(baseNode, targetFunctionName, "BASE");
  const headSnapshot = StructuralExtractor.extractSnapshot(headNode, targetFunctionName, "HEAD");

  const { structuralChanges, findings } = StructuralComparator.compare(baseSnapshot, headSnapshot);

  return {
    status: structuralChanges.length > 0 ? "COMPLETED_WITH_FINDINGS" : "COMPLETED_NO_STRUCTURAL_CHANGES",
    baseFunction: baseSnapshot,
    headFunction: headSnapshot,
    structuralChanges,
    findings,
    limitations: [],
  };
}

// ============================================================================
// PART 5: VITEST EXPERIMENT TEST SUITE
// ============================================================================

describe("Change Archaeologist AST Core Validation Spike", () => {
  // Experiment 1: Parse a named function and extract its guard clauses, conditions, throw statements, and return statements.
  it("1. parses a named function and extracts guard clauses, conditions, throw statements, and return statements", () => {
    const sourceCode = `
      export function processOrder(order: any) {
        if (!order) {
          throw new Error("Missing order");
        }
        if (order.status === "cancelled") {
          return false;
        }
        const isPriority = order.priority > 5 ? true : false;
        return isPriority;
      }
    `;

    const project = new Project({ useInMemoryFileSystem: true });
    const file = project.createSourceFile("test.ts", sourceCode);
    const fnNode = FunctionLocator.findFunction(file, "processOrder");
    expect(fnNode).not.toBeNull();

    const snapshot = StructuralExtractor.extractSnapshot(fnNode!, "processOrder", "BASE");

    // Verify Guards extraction
    expect(snapshot.guards).toHaveLength(2);
    expect(snapshot.guards[0].exitKind).toBe("THROW");
    expect(snapshot.guards[0].normalizedCondition).toBe("!order");
    expect(snapshot.guards[0].isLeadingGuard).toBe(true);
    expect(snapshot.guards[0].span.startLine).toBeGreaterThan(0);

    expect(snapshot.guards[1].exitKind).toBe("RETURN");
    expect(snapshot.guards[1].normalizedCondition).toBe('order.status === "cancelled"');
    expect(snapshot.guards[1].isLeadingGuard).toBe(true);

    // Verify Conditions extraction (2 from IfStatements + 1 from TernaryExpression)
    expect(snapshot.conditionals).toHaveLength(3);
    const ifConds = snapshot.conditionals.filter((c) => c.constructKind === "IF_STATEMENT");
    const ternaryConds = snapshot.conditionals.filter((c) => c.constructKind === "TERNARY_EXPRESSION");
    expect(ifConds).toHaveLength(2);
    expect(ternaryConds).toHaveLength(1);
    expect(ternaryConds[0].normalizedCondition).toBe("order.priority > 5");

    // Verify Throw statements extraction
    expect(snapshot.throws).toHaveLength(1);
    expect(snapshot.throws[0].normalizedExpression).toBe('new Error("Missing order")');
    expect(snapshot.throws[0].span.startLine).toBeGreaterThan(0);

    // Verify Return statements extraction
    expect(snapshot.returns).toHaveLength(2);
    expect(snapshot.returns[0].returnCategory).toBe("BOOLEAN_LITERAL");
    expect(snapshot.returns[0].isEarlyReturn).toBe(true);
    expect(snapshot.returns[1].returnCategory).toBe("EXPRESSION");
    expect(snapshot.returns[1].isEarlyReturn).toBe(false);
  });

  // Experiment 2: Detect a guard-clause removal.
  it("2. detects a guard-clause removal and avoids duplicate return findings", () => {
    const baseCode = `
      function pay(amt: number) {
        if (amt <= 0) return false;
        return process(amt);
      }
    `;
    const headCode = `
      function pay(amt: number) {
        return process(amt);
      }
    `;

    const result = compareFunctionRevisions(baseCode, headCode, "pay");

    expect(result.status).toBe("COMPLETED_WITH_FINDINGS");

    // Verify structural change record
    const guardRemoval = result.structuralChanges.find((c) => c.ruleId === "RULE_GUARD_REMOVED");
    expect(guardRemoval).toBeDefined();
    expect(guardRemoval!.beforeSpan).not.toBeNull();
    expect(guardRemoval!.beforeSpan!.startLine).toBe(3);
    expect(guardRemoval!.afterSpan).toBeNull();
    expect(guardRemoval!.beforeSnippet).toContain("if (amt <= 0) return false;");

    // Verify deduplication: Guard removal subsumes return false; no duplicate finding!
    expect(result.findings).toHaveLength(1);
    const finding = result.findings[0];
    expect(finding.category).toBe("GUARD_CLAUSE");
    expect(finding.observed[0].statement).toContain("if (amt <= 0)");
    expect(finding.inferred[0].statement).toContain("Early-exit validation guard");
    expect(finding.unknown[0].statement).toContain("Static analysis cannot determine");
  });

  // Experiment 3: Detect a change from && to ||.
  it("3. detects a change from && to || in conditional expression", () => {
    const baseCode = `
      function check(a: boolean, b: boolean) {
        if (a && b) {
          return 1;
        }
        return 0;
      }
    `;
    const headCode = `
      function check(a: boolean, b: boolean) {
        if (a || b) {
          return 1;
        }
        return 0;
      }
    `;

    const result = compareFunctionRevisions(baseCode, headCode, "check");

    expect(result.status).toBe("COMPLETED_WITH_FINDINGS");

    const condChange = result.structuralChanges.find((c) => c.ruleId === "RULE_CONDITIONAL_MODIFIED");
    expect(condChange).toBeDefined();
    expect(condChange!.summary).toContain('operator changed from "&&" to "||"');
    expect(condChange!.beforeSpan!.startLine).toBe(3);
    expect(condChange!.afterSpan!.startLine).toBe(3);
    expect(condChange!.beforeSnippet).toContain("a && b");
    expect(condChange!.afterSnippet).toContain("a || b");

    // Verify epistemic separation
    expect(result.findings).toHaveLength(1);
    const finding = result.findings[0];
    expect(finding.observed[0].statement).toContain("a && b");
    expect(finding.observed[0].statement).toContain("a || b");
    expect(finding.inferred[0].statement).toContain("Conditional branching logic altered");
    expect(finding.unknown[0].statement).toContain("Static analysis does not prove");
  });

  // Experiment 4: Detect a throw-to-return conversion.
  it("4. detects a throw-to-return conversion", () => {
    const baseCode = `
      function parse(s: string) {
        if (!s) throw new Error("Empty");
        return s.trim();
      }
    `;
    const headCode = `
      function parse(s: string) {
        if (!s) return "";
        return s.trim();
      }
    `;

    const result = compareFunctionRevisions(baseCode, headCode, "parse");

    expect(result.status).toBe("COMPLETED_WITH_FINDINGS");

    const convChange = result.structuralChanges.find(
      (c) => c.ruleId === "RULE_THROW_TO_RETURN_CONVERSION"
    );
    expect(convChange).toBeDefined();
    expect(convChange!.summary).toContain('Throw-to-return conversion under condition "!s"');
    expect(convChange!.beforeSpan!.startLine).toBe(3);
    expect(convChange!.afterSpan!.startLine).toBe(3);
    expect(convChange!.beforeSnippet).toContain('throw new Error("Empty")');
    expect(convChange!.afterSnippet).toContain('return ""');

    // Deduplication check: only 1 finding emitted for the throw-to-return change
    expect(result.findings).toHaveLength(1);
    const finding = result.findings[0];
    expect(finding.title).toContain("Throw-to-return conversion");
    expect(finding.observed[0].statement).toContain("throw statement");
    expect(finding.observed[0].statement).toContain('throw new Error("Empty")');
    expect(finding.observed[0].statement).toContain("return statement");
    expect(finding.observed[0].statement).toContain('return ""');
    expect(finding.inferred[0].statement).toContain("Control flow changed from raising an exception to returning a value");
  });

  // Experiment 5: Ignore whitespace, comments, and redundant parentheses that do not change the relevant syntax.
  it("5. ignores whitespace, comments, and redundant parentheses that do not change the relevant syntax", () => {
    const baseCode = `
      function calc(x: number) {
        if (!x) return 0;
        return x * 2;
      }
    `;
    const headCode = `
      function calc(
        x: number // input parameter
      ) {
        if (((!x))) {
          /* return zero for falsy */
          return 0;
        }
        return x * 2;
      }
    `;

    const result = compareFunctionRevisions(baseCode, headCode, "calc");

    expect(result.status).toBe("COMPLETED_NO_STRUCTURAL_CHANGES");
    expect(result.structuralChanges).toHaveLength(0);
    expect(result.findings).toHaveLength(0);

    // Verify descriptors matched despite formatting and parentheses differences
    expect(result.baseFunction!.guards[0].normalizedCondition).toBe("!x");
    expect(result.headFunction!.guards[0].normalizedCondition).toBe("!x");
    expect(result.baseFunction!.guards[0].normalizedExit).toBe("return 0");
    expect(result.headFunction!.guards[0].normalizedExit).toBe("return 0");
  });

  // Experiment 6: Avoid attributing statements inside nested callback functions to the outer function.
  it("6. avoids attributing statements inside nested callback functions to the outer function", () => {
    const baseCode = `
      function list(items: number[]) {
        return items.map(x => {
          if (x < 0) return 0;
          return x;
        });
      }
    `;
    const headCode = `
      function list(items: number[]) {
        return items.map(x => {
          return x;
        });
      }
    `;

    const result = compareFunctionRevisions(baseCode, headCode, "list");

    // The outer function has ZERO guard clauses in both revisions
    expect(result.baseFunction!.guards).toHaveLength(0);
    expect(result.headFunction!.guards).toHaveLength(0);

    // No outer guard removal finding is emitted for list
    const guardRemoved = result.structuralChanges.find((c) => c.ruleId === "RULE_GUARD_REMOVED");
    expect(guardRemoved).toBeUndefined();
    expect(result.findings.filter((f) => f.category === "GUARD_CLAUSE")).toHaveLength(0);

    // Both revisions preserve the single outer return statement (items.map(...))
    expect(result.baseFunction!.returns).toHaveLength(1);
    expect(result.headFunction!.returns).toHaveLength(1);
    expect(result.baseFunction!.returns[0].expressionText).toContain("items.map");
  });

  // Experiment 7: Report an explicit limitation when the target function cannot be found in one revision.
  it("7. reports an explicit limitation when the target function cannot be found in one revision", () => {
    const baseCode = `
      function oldName(x: number) {
        return x;
      }
    `;
    const headCode = `
      function newName(x: number) {
        return x;
      }
    `;

    const result = compareFunctionRevisions(baseCode, headCode, "oldName");

    expect(result.status).toBe("INCOMPLETE_FUNCTION_MISSING");
    expect(result.baseFunction).not.toBeNull();
    expect(result.baseFunction!.functionName).toBe("oldName");
    expect(result.baseFunction!.span.startLine).toBe(2);
    expect(result.headFunction).toBeNull();

    expect(result.structuralChanges).toHaveLength(0);
    expect(result.limitations).toHaveLength(1);
    expect(result.limitations[0]).toContain('Target function "oldName" was not found in HEAD revision');

    expect(result.findings).toHaveLength(1);
    const finding = result.findings[0];
    expect(finding.category).toBe("LINEAGE_LIMITATION");
    expect(finding.observed[0].statement).toContain("could not be found in HEAD");
    expect(finding.inferred[0].statement).toContain("may have been removed, renamed, or extracted");
    expect(finding.unknown[0].reasonCategory).toBe("LINEAGE_OR_PARSE_BOUNDARY");
  });

  // Extra Test: Meaningful operator precedence is not normalized away
  it("preserves meaningful operator precedence differences and does not normalize them away", () => {
    const baseCode = `
      function evalExpr(a: boolean, b: boolean, c: boolean) {
        if ((a && b) || c) {
          return 1;
        }
        return 0;
      }
    `;
    const headCode = `
      function evalExpr(a: boolean, b: boolean, c: boolean) {
        if (a && (b || c)) {
          return 1;
        }
        return 0;
      }
    `;

    const result = compareFunctionRevisions(baseCode, headCode, "evalExpr");

    // Precedence changed: (a && b) || c is NOT normalized to a && (b || c)
    expect(result.status).toBe("COMPLETED_WITH_FINDINGS");
    const condChange = result.structuralChanges.find((c) => c.ruleId === "RULE_CONDITIONAL_MODIFIED");
    expect(condChange).toBeDefined();
    expect(condChange!.beforeSnippet).toBe("(a && b) || c");
    expect(condChange!.afterSnippet).toBe("a && (b || c)");
  });
});
