/**
 * Change Archaeologist - Preloaded Demonstration Scenarios (Milestone 12 Outputs)
 *
 * Provides static access to the exact 6 deterministic demonstration scenarios
 * without requiring runtime Git execution or dynamic filesystem access.
 */

import type { AnalysisReport } from "../types/index.js";

export interface DemoFixture {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly targetFilePath: string;
  readonly targetFunctionName: string;
  readonly report: AnalysisReport;
}

export const DEMO_SCENARIO_A: AnalysisReport = {
  "schemaVersion": "1.0.0",
  "generatedAtIso": "2026-11-04T16:56:26.886Z",
  "status": "COMPLETED_WITH_FINDINGS",
  "request": {
    "repoPath": "E:\\change-archaeologist\\examples\\demo-repository",
    "targetFilePath": "src/auth.ts",
    "targetFunctionName": "processPayment",
    "baseRevisionInput": "base",
    "headRevisionInput": "head"
  },
  "repository": {
    "rootPath": "E:/change-archaeologist/examples/demo-repository",
    "gitVersion": "git version 2.53.0.windows.1",
    "isCleanWorkingTreeAtStart": true
  },
  "baseCommit": {
    "role": "BASE",
    "sha": "9a8bf4ea3ab1a6bbfda67a7516a99e2f6c363b7d",
    "shortSha": "9a8bf4e",
    "authorName": "Archaeologist Demo",
    "committedAtIso": "2026-01-01T12:00:00Z",
    "subject": "Release v1.0.0: Initial implementation"
  },
  "headCommit": {
    "role": "HEAD",
    "sha": "a8265d8ddd27dc3907aa537c4177e15f3e7c0af1",
    "shortSha": "a8265d8",
    "authorName": "Archaeologist Demo",
    "committedAtIso": "2026-01-02T12:00:00Z",
    "subject": "Release v1.1.0: Feature updates and refactoring"
  },
  "baseFunction": {
    "role": "BASE",
    "commitSha": "9a8bf4ea3ab1a6bbfda67a7516a99e2f6c363b7d",
    "posixFilePath": "src/auth.ts",
    "qualifiedName": "processPayment",
    "functionName": "processPayment",
    "kind": "FUNCTION_DECLARATION",
    "span": {
      "startLine": 1,
      "startColumn": 1,
      "endLine": 6,
      "endColumn": 2
    },
    "signatureText": "export function processPayment(payment:",
    "rawBodyText": "{\n  if (!payment.valid) {\n    throw new Error(\"Invalid payment: validation failed\");\n  }\n  return payment.amount > 0;\n}",
    "guards": [
      {
        "fingerprint": "GUARD:!payment.valid:THROW:throw new Error(\"Invalid payment: validation failed\")",
        "conditionText": "!payment.valid",
        "normalizedCondition": "!payment.valid",
        "exitKind": "THROW",
        "exitText": "throw new Error(\"Invalid payment: validation failed\");",
        "normalizedExit": "throw new Error(\"Invalid payment: validation failed\")",
        "isLeadingGuard": true,
        "nestingDepth": 0,
        "span": {
          "startLine": 2,
          "startColumn": 3,
          "endLine": 4,
          "endColumn": 4
        },
        "rawText": "if (!payment.valid) {\n    throw new Error(\"Invalid payment: validation failed\");\n  }"
      }
    ],
    "conditionals": [
      {
        "fingerprint": "IF_STATEMENT:!payment.valid",
        "constructKind": "IF_STATEMENT",
        "conditionText": "!payment.valid",
        "normalizedCondition": "!payment.valid",
        "operatorTokens": [],
        "nestingDepth": 1,
        "span": {
          "startLine": 2,
          "startColumn": 7,
          "endLine": 2,
          "endColumn": 21
        },
        "rawText": "!payment.valid"
      }
    ],
    "throws": [
      {
        "fingerprint": "THROW:new Error(\"Invalid payment: validation failed\"):!payment.valid",
        "thrownExpressionText": "new Error(\"Invalid payment: validation failed\")",
        "normalizedExpression": "new Error(\"Invalid payment: validation failed\")",
        "enclosingGuardCondition": "!payment.valid",
        "nestingDepth": 2,
        "span": {
          "startLine": 3,
          "startColumn": 5,
          "endLine": 3,
          "endColumn": 59
        },
        "rawText": "throw new Error(\"Invalid payment: validation failed\");"
      }
    ],
    "returns": [
      {
        "fingerprint": "RETURN:EXPRESSION:payment.amount > 0",
        "returnCategory": "EXPRESSION",
        "expressionText": "payment.amount > 0",
        "normalizedExpression": "payment.amount > 0",
        "isEarlyReturn": false,
        "nestingDepth": 0,
        "span": {
          "startLine": 5,
          "startColumn": 3,
          "endLine": 5,
          "endColumn": 29
        },
        "rawText": "return payment.amount > 0;"
      }
    ]
  },
  "headFunction": {
    "role": "HEAD",
    "commitSha": "a8265d8ddd27dc3907aa537c4177e15f3e7c0af1",
    "posixFilePath": "src/auth.ts",
    "qualifiedName": "processPayment",
    "functionName": "processPayment",
    "kind": "FUNCTION_DECLARATION",
    "span": {
      "startLine": 1,
      "startColumn": 1,
      "endLine": 3,
      "endColumn": 2
    },
    "signatureText": "export function processPayment(payment:",
    "rawBodyText": "{\n  return payment.amount > 0;\n}",
    "guards": [],
    "conditionals": [],
    "throws": [],
    "returns": [
      {
        "fingerprint": "RETURN:EXPRESSION:payment.amount > 0",
        "returnCategory": "EXPRESSION",
        "expressionText": "payment.amount > 0",
        "normalizedExpression": "payment.amount > 0",
        "isEarlyReturn": false,
        "nestingDepth": 0,
        "span": {
          "startLine": 2,
          "startColumn": 3,
          "endLine": 2,
          "endColumn": 29
        },
        "rawText": "return payment.amount > 0;"
      }
    ]
  },
  "evidence": [
    {
      "id": "EV-001",
      "kind": "SOURCE_BEFORE",
      "commitRole": "BASE",
      "commitSha": "9a8bf4ea3ab1a6bbfda67a7516a99e2f6c363b7d",
      "posixFilePath": "src/auth.ts",
      "span": {
        "startLine": 2,
        "startColumn": 3,
        "endLine": 4,
        "endColumn": 4
      },
      "codeSnippet": "if (!payment.valid) {\n    throw new Error(\"Invalid payment: validation failed\");\n  }",
      "description": "Guard clause at BASE lines 2-4"
    }
  ],
  "structuralChanges": [
    {
      "id": "SC-001",
      "ruleId": "RULE_GUARD_REMOVED",
      "category": "GUARD_CLAUSE",
      "changeType": "REMOVED",
      "summary": "Guard clause removed: if (!payment.valid) with THROW exit (throw new Error(\"Invalid payment: validation failed\");)",
      "beforeSpan": {
        "startLine": 2,
        "startColumn": 3,
        "endLine": 4,
        "endColumn": 4
      },
      "afterSpan": null,
      "beforeSnippet": "if (!payment.valid) {\n    throw new Error(\"Invalid payment: validation failed\");\n  }",
      "afterSnippet": null
    }
  ],
  "testChanges": [],
  "declarationChanges": [],
  "correlations": [],
  "correlationItems": [],
  "findings": [
    {
      "id": "FND-001",
      "title": "Guard clause removed: if (!payment.valid)",
      "category": "GUARD_CLAUSE",
      "attentionLevel": "MODERATE_ATTENTION",
      "structuralChangeIds": [
        "SC-001"
      ],
      "correlationId": null,
      "observed": [
        {
          "id": "OBS-001",
          "category": "OBSERVED",
          "statement": "Guard clause \"if (!payment.valid)\" with exit \"throw new Error(\"Invalid payment: validation failed\");\" at BASE lines 2-4 is absent in HEAD.",
          "evidenceIds": [
            "EV-001"
          ],
          "span": {
            "startLine": 2,
            "startColumn": 3,
            "endLine": 4,
            "endColumn": 4
          },
          "snippet": "if (!payment.valid) {\n    throw new Error(\"Invalid payment: validation failed\");\n  }"
        }
      ],
      "inferred": [
        {
          "id": "INF-001",
          "category": "INFERRED",
          "statement": "Early-exit validation guard for \"!payment.valid\" was removed from \"processPayment\".",
          "ruleId": "RULE_GUARD_REMOVED",
          "supportingObservationIds": [
            "OBS-001"
          ]
        }
      ],
      "unknown": [
        {
          "id": "UNK-001",
          "category": "UNKNOWN",
          "statement": "Static analysis cannot determine whether upstream callers now validate \"!payment.valid\" or if this removal allows invalid arguments to reach subsequent logic.",
          "reasonCategory": "EXTERNAL_CALLER_BEHAVIOR"
        }
      ]
    }
  ],
  "limitations": [],
  "errors": []
}
;

export const DEMO_SCENARIO_B: AnalysisReport = {
  "schemaVersion": "1.0.0",
  "generatedAtIso": "2026-11-04T16:56:28.686Z",
  "status": "COMPLETED_WITH_FINDINGS",
  "request": {
    "repoPath": "E:\\change-archaeologist\\examples\\demo-repository",
    "targetFilePath": "src/access.ts",
    "targetFunctionName": "authorizeUser",
    "baseRevisionInput": "base",
    "headRevisionInput": "head"
  },
  "repository": {
    "rootPath": "E:/change-archaeologist/examples/demo-repository",
    "gitVersion": "git version 2.53.0.windows.1",
    "isCleanWorkingTreeAtStart": true
  },
  "baseCommit": {
    "role": "BASE",
    "sha": "9a8bf4ea3ab1a6bbfda67a7516a99e2f6c363b7d",
    "shortSha": "9a8bf4e",
    "authorName": "Archaeologist Demo",
    "committedAtIso": "2026-01-01T12:00:00Z",
    "subject": "Release v1.0.0: Initial implementation"
  },
  "headCommit": {
    "role": "HEAD",
    "sha": "a8265d8ddd27dc3907aa537c4177e15f3e7c0af1",
    "shortSha": "a8265d8",
    "authorName": "Archaeologist Demo",
    "committedAtIso": "2026-01-02T12:00:00Z",
    "subject": "Release v1.1.0: Feature updates and refactoring"
  },
  "baseFunction": {
    "role": "BASE",
    "commitSha": "9a8bf4ea3ab1a6bbfda67a7516a99e2f6c363b7d",
    "posixFilePath": "src/access.ts",
    "qualifiedName": "authorizeUser",
    "functionName": "authorizeUser",
    "kind": "FUNCTION_DECLARATION",
    "span": {
      "startLine": 1,
      "startColumn": 1,
      "endLine": 6,
      "endColumn": 2
    },
    "signatureText": "export function authorizeUser(user:",
    "rawBodyText": "{\n  if (user.isAdmin && user.isOwner) {\n    return true;\n  }\n  return false;\n}",
    "guards": [
      {
        "fingerprint": "GUARD:user.isAdmin && user.isOwner:RETURN:return true",
        "conditionText": "user.isAdmin && user.isOwner",
        "normalizedCondition": "user.isAdmin && user.isOwner",
        "exitKind": "RETURN",
        "exitText": "return true;",
        "normalizedExit": "return true",
        "isLeadingGuard": true,
        "nestingDepth": 0,
        "span": {
          "startLine": 2,
          "startColumn": 3,
          "endLine": 4,
          "endColumn": 4
        },
        "rawText": "if (user.isAdmin && user.isOwner) {\n    return true;\n  }"
      }
    ],
    "conditionals": [
      {
        "fingerprint": "IF_STATEMENT:user.isAdmin && user.isOwner",
        "constructKind": "IF_STATEMENT",
        "conditionText": "user.isAdmin && user.isOwner",
        "normalizedCondition": "user.isAdmin && user.isOwner",
        "operatorTokens": [
          "&&"
        ],
        "nestingDepth": 1,
        "span": {
          "startLine": 2,
          "startColumn": 7,
          "endLine": 2,
          "endColumn": 35
        },
        "rawText": "user.isAdmin && user.isOwner"
      }
    ],
    "throws": [],
    "returns": [
      {
        "fingerprint": "RETURN:BOOLEAN_LITERAL:true",
        "returnCategory": "BOOLEAN_LITERAL",
        "expressionText": "true",
        "normalizedExpression": "true",
        "isEarlyReturn": true,
        "nestingDepth": 2,
        "span": {
          "startLine": 3,
          "startColumn": 5,
          "endLine": 3,
          "endColumn": 17
        },
        "rawText": "return true;"
      },
      {
        "fingerprint": "RETURN:BOOLEAN_LITERAL:false",
        "returnCategory": "BOOLEAN_LITERAL",
        "expressionText": "false",
        "normalizedExpression": "false",
        "isEarlyReturn": false,
        "nestingDepth": 0,
        "span": {
          "startLine": 5,
          "startColumn": 3,
          "endLine": 5,
          "endColumn": 16
        },
        "rawText": "return false;"
      }
    ]
  },
  "headFunction": {
    "role": "HEAD",
    "commitSha": "a8265d8ddd27dc3907aa537c4177e15f3e7c0af1",
    "posixFilePath": "src/access.ts",
    "qualifiedName": "authorizeUser",
    "functionName": "authorizeUser",
    "kind": "FUNCTION_DECLARATION",
    "span": {
      "startLine": 1,
      "startColumn": 1,
      "endLine": 6,
      "endColumn": 2
    },
    "signatureText": "export function authorizeUser(user:",
    "rawBodyText": "{\n  if (user.isAdmin || user.isOwner) {\n    return true;\n  }\n  return false;\n}",
    "guards": [
      {
        "fingerprint": "GUARD:user.isAdmin || user.isOwner:RETURN:return true",
        "conditionText": "user.isAdmin || user.isOwner",
        "normalizedCondition": "user.isAdmin || user.isOwner",
        "exitKind": "RETURN",
        "exitText": "return true;",
        "normalizedExit": "return true",
        "isLeadingGuard": true,
        "nestingDepth": 0,
        "span": {
          "startLine": 2,
          "startColumn": 3,
          "endLine": 4,
          "endColumn": 4
        },
        "rawText": "if (user.isAdmin || user.isOwner) {\n    return true;\n  }"
      }
    ],
    "conditionals": [
      {
        "fingerprint": "IF_STATEMENT:user.isAdmin || user.isOwner",
        "constructKind": "IF_STATEMENT",
        "conditionText": "user.isAdmin || user.isOwner",
        "normalizedCondition": "user.isAdmin || user.isOwner",
        "operatorTokens": [
          "||"
        ],
        "nestingDepth": 1,
        "span": {
          "startLine": 2,
          "startColumn": 7,
          "endLine": 2,
          "endColumn": 35
        },
        "rawText": "user.isAdmin || user.isOwner"
      }
    ],
    "throws": [],
    "returns": [
      {
        "fingerprint": "RETURN:BOOLEAN_LITERAL:true",
        "returnCategory": "BOOLEAN_LITERAL",
        "expressionText": "true",
        "normalizedExpression": "true",
        "isEarlyReturn": true,
        "nestingDepth": 2,
        "span": {
          "startLine": 3,
          "startColumn": 5,
          "endLine": 3,
          "endColumn": 17
        },
        "rawText": "return true;"
      },
      {
        "fingerprint": "RETURN:BOOLEAN_LITERAL:false",
        "returnCategory": "BOOLEAN_LITERAL",
        "expressionText": "false",
        "normalizedExpression": "false",
        "isEarlyReturn": false,
        "nestingDepth": 0,
        "span": {
          "startLine": 5,
          "startColumn": 3,
          "endLine": 5,
          "endColumn": 16
        },
        "rawText": "return false;"
      }
    ]
  },
  "evidence": [
    {
      "id": "EV-001",
      "kind": "SOURCE_BEFORE",
      "commitRole": "BASE",
      "commitSha": "9a8bf4ea3ab1a6bbfda67a7516a99e2f6c363b7d",
      "posixFilePath": "src/access.ts",
      "span": {
        "startLine": 2,
        "startColumn": 7,
        "endLine": 2,
        "endColumn": 35
      },
      "codeSnippet": "user.isAdmin && user.isOwner",
      "description": "Condition at BASE lines 2-2"
    },
    {
      "id": "EV-002",
      "kind": "SOURCE_AFTER",
      "commitRole": "HEAD",
      "commitSha": "a8265d8ddd27dc3907aa537c4177e15f3e7c0af1",
      "posixFilePath": "src/access.ts",
      "span": {
        "startLine": 2,
        "startColumn": 7,
        "endLine": 2,
        "endColumn": 35
      },
      "codeSnippet": "user.isAdmin || user.isOwner",
      "description": "Condition at HEAD lines 2-2"
    }
  ],
  "structuralChanges": [
    {
      "id": "SC-001",
      "ruleId": "RULE_CONDITIONAL_MODIFIED",
      "category": "CONDITIONAL_EXPRESSION",
      "changeType": "MODIFIED",
      "summary": "Condition changed from \"user.isAdmin && user.isOwner\" to \"user.isAdmin || user.isOwner\" (operator changed from \"&&\" to \"||\")",
      "beforeSpan": {
        "startLine": 2,
        "startColumn": 7,
        "endLine": 2,
        "endColumn": 35
      },
      "afterSpan": {
        "startLine": 2,
        "startColumn": 7,
        "endLine": 2,
        "endColumn": 35
      },
      "beforeSnippet": "user.isAdmin && user.isOwner",
      "afterSnippet": "user.isAdmin || user.isOwner"
    }
  ],
  "testChanges": [],
  "declarationChanges": [],
  "correlations": [],
  "correlationItems": [],
  "findings": [
    {
      "id": "FND-001",
      "title": "Conditional expression modified: user.isAdmin && user.isOwner -> user.isAdmin || user.isOwner",
      "category": "CONDITIONAL_EXPRESSION",
      "attentionLevel": "MODERATE_ATTENTION",
      "structuralChangeIds": [
        "SC-001"
      ],
      "correlationId": null,
      "observed": [
        {
          "id": "OBS-001",
          "category": "OBSERVED",
          "statement": "Condition expression at BASE lines 2-2 (user.isAdmin && user.isOwner) was replaced with (user.isAdmin || user.isOwner) at HEAD lines 2-2 (operator changed from \"&&\" to \"||\").",
          "evidenceIds": [
            "EV-001",
            "EV-002"
          ],
          "span": {
            "startLine": 2,
            "startColumn": 7,
            "endLine": 2,
            "endColumn": 35
          },
          "snippet": "user.isAdmin && user.isOwner"
        }
      ],
      "inferred": [
        {
          "id": "INF-001",
          "category": "INFERRED",
          "statement": "Conditional branching logic altered; evaluation rule changed between base and head.",
          "ruleId": "RULE_CONDITIONAL_MODIFIED",
          "supportingObservationIds": [
            "OBS-001"
          ]
        }
      ],
      "unknown": [
        {
          "id": "UNK-001",
          "category": "UNKNOWN",
          "statement": "Static analysis does not prove whether operands are constrained elsewhere or whether the new branch condition is reachable.",
          "reasonCategory": "EXTERNAL_CALLER_BEHAVIOR"
        }
      ]
    }
  ],
  "limitations": [],
  "errors": []
}
;

export const DEMO_SCENARIO_C: AnalysisReport = {
  "schemaVersion": "1.0.0",
  "generatedAtIso": "2026-11-04T16:56:30.369Z",
  "status": "COMPLETED_WITH_FINDINGS",
  "request": {
    "repoPath": "E:\\change-archaeologist\\examples\\demo-repository",
    "targetFilePath": "src/config.ts",
    "targetFunctionName": "loadConfig",
    "baseRevisionInput": "base",
    "headRevisionInput": "head"
  },
  "repository": {
    "rootPath": "E:/change-archaeologist/examples/demo-repository",
    "gitVersion": "git version 2.53.0.windows.1",
    "isCleanWorkingTreeAtStart": true
  },
  "baseCommit": {
    "role": "BASE",
    "sha": "9a8bf4ea3ab1a6bbfda67a7516a99e2f6c363b7d",
    "shortSha": "9a8bf4e",
    "authorName": "Archaeologist Demo",
    "committedAtIso": "2026-01-01T12:00:00Z",
    "subject": "Release v1.0.0: Initial implementation"
  },
  "headCommit": {
    "role": "HEAD",
    "sha": "a8265d8ddd27dc3907aa537c4177e15f3e7c0af1",
    "shortSha": "a8265d8",
    "authorName": "Archaeologist Demo",
    "committedAtIso": "2026-01-02T12:00:00Z",
    "subject": "Release v1.1.0: Feature updates and refactoring"
  },
  "baseFunction": {
    "role": "BASE",
    "commitSha": "9a8bf4ea3ab1a6bbfda67a7516a99e2f6c363b7d",
    "posixFilePath": "src/config.ts",
    "qualifiedName": "loadConfig",
    "functionName": "loadConfig",
    "kind": "FUNCTION_DECLARATION",
    "span": {
      "startLine": 1,
      "startColumn": 1,
      "endLine": 6,
      "endColumn": 2
    },
    "signatureText": "export function loadConfig(raw: string | null): Record<string, unknown>",
    "rawBodyText": "{\n  if (!raw) {\n    throw new Error(\"Missing configuration payload\");\n  }\n  return JSON.parse(raw);\n}",
    "guards": [
      {
        "fingerprint": "GUARD:!raw:THROW:throw new Error(\"Missing configuration payload\")",
        "conditionText": "!raw",
        "normalizedCondition": "!raw",
        "exitKind": "THROW",
        "exitText": "throw new Error(\"Missing configuration payload\");",
        "normalizedExit": "throw new Error(\"Missing configuration payload\")",
        "isLeadingGuard": true,
        "nestingDepth": 0,
        "span": {
          "startLine": 2,
          "startColumn": 3,
          "endLine": 4,
          "endColumn": 4
        },
        "rawText": "if (!raw) {\n    throw new Error(\"Missing configuration payload\");\n  }"
      }
    ],
    "conditionals": [
      {
        "fingerprint": "IF_STATEMENT:!raw",
        "constructKind": "IF_STATEMENT",
        "conditionText": "!raw",
        "normalizedCondition": "!raw",
        "operatorTokens": [],
        "nestingDepth": 1,
        "span": {
          "startLine": 2,
          "startColumn": 7,
          "endLine": 2,
          "endColumn": 11
        },
        "rawText": "!raw"
      }
    ],
    "throws": [
      {
        "fingerprint": "THROW:new Error(\"Missing configuration payload\"):!raw",
        "thrownExpressionText": "new Error(\"Missing configuration payload\")",
        "normalizedExpression": "new Error(\"Missing configuration payload\")",
        "enclosingGuardCondition": "!raw",
        "nestingDepth": 2,
        "span": {
          "startLine": 3,
          "startColumn": 5,
          "endLine": 3,
          "endColumn": 54
        },
        "rawText": "throw new Error(\"Missing configuration payload\");"
      }
    ],
    "returns": [
      {
        "fingerprint": "RETURN:EXPRESSION:JSON.parse(raw)",
        "returnCategory": "EXPRESSION",
        "expressionText": "JSON.parse(raw)",
        "normalizedExpression": "JSON.parse(raw)",
        "isEarlyReturn": false,
        "nestingDepth": 0,
        "span": {
          "startLine": 5,
          "startColumn": 3,
          "endLine": 5,
          "endColumn": 26
        },
        "rawText": "return JSON.parse(raw);"
      }
    ]
  },
  "headFunction": {
    "role": "HEAD",
    "commitSha": "a8265d8ddd27dc3907aa537c4177e15f3e7c0af1",
    "posixFilePath": "src/config.ts",
    "qualifiedName": "loadConfig",
    "functionName": "loadConfig",
    "kind": "FUNCTION_DECLARATION",
    "span": {
      "startLine": 1,
      "startColumn": 1,
      "endLine": 6,
      "endColumn": 2
    },
    "signatureText": "export function loadConfig(raw: string | null): Record<string, unknown>",
    "rawBodyText": "{\n  if (!raw) {\n    return {};\n  }\n  return JSON.parse(raw);\n}",
    "guards": [
      {
        "fingerprint": "GUARD:!raw:RETURN:return {}",
        "conditionText": "!raw",
        "normalizedCondition": "!raw",
        "exitKind": "RETURN",
        "exitText": "return {};",
        "normalizedExit": "return {}",
        "isLeadingGuard": true,
        "nestingDepth": 0,
        "span": {
          "startLine": 2,
          "startColumn": 3,
          "endLine": 4,
          "endColumn": 4
        },
        "rawText": "if (!raw) {\n    return {};\n  }"
      }
    ],
    "conditionals": [
      {
        "fingerprint": "IF_STATEMENT:!raw",
        "constructKind": "IF_STATEMENT",
        "conditionText": "!raw",
        "normalizedCondition": "!raw",
        "operatorTokens": [],
        "nestingDepth": 1,
        "span": {
          "startLine": 2,
          "startColumn": 7,
          "endLine": 2,
          "endColumn": 11
        },
        "rawText": "!raw"
      }
    ],
    "throws": [],
    "returns": [
      {
        "fingerprint": "RETURN:EXPRESSION:{}",
        "returnCategory": "EXPRESSION",
        "expressionText": "{}",
        "normalizedExpression": "{}",
        "isEarlyReturn": true,
        "nestingDepth": 2,
        "span": {
          "startLine": 3,
          "startColumn": 5,
          "endLine": 3,
          "endColumn": 15
        },
        "rawText": "return {};"
      },
      {
        "fingerprint": "RETURN:EXPRESSION:JSON.parse(raw)",
        "returnCategory": "EXPRESSION",
        "expressionText": "JSON.parse(raw)",
        "normalizedExpression": "JSON.parse(raw)",
        "isEarlyReturn": false,
        "nestingDepth": 0,
        "span": {
          "startLine": 5,
          "startColumn": 3,
          "endLine": 5,
          "endColumn": 26
        },
        "rawText": "return JSON.parse(raw);"
      }
    ]
  },
  "evidence": [
    {
      "id": "EV-001",
      "kind": "SOURCE_BEFORE",
      "commitRole": "BASE",
      "commitSha": "9a8bf4ea3ab1a6bbfda67a7516a99e2f6c363b7d",
      "posixFilePath": "src/config.ts",
      "span": {
        "startLine": 2,
        "startColumn": 3,
        "endLine": 4,
        "endColumn": 4
      },
      "codeSnippet": "if (!raw) {\n    throw new Error(\"Missing configuration payload\");\n  }",
      "description": "Throw guard at BASE lines 2-4"
    },
    {
      "id": "EV-002",
      "kind": "SOURCE_AFTER",
      "commitRole": "HEAD",
      "commitSha": "a8265d8ddd27dc3907aa537c4177e15f3e7c0af1",
      "posixFilePath": "src/config.ts",
      "span": {
        "startLine": 2,
        "startColumn": 3,
        "endLine": 4,
        "endColumn": 4
      },
      "codeSnippet": "if (!raw) {\n    return {};\n  }",
      "description": "Return guard at HEAD lines 2-4"
    }
  ],
  "structuralChanges": [
    {
      "id": "SC-001",
      "ruleId": "RULE_THROW_TO_RETURN_CONVERSION",
      "category": "GUARD_CLAUSE",
      "changeType": "MODIFIED",
      "summary": "Throw-to-return conversion under condition \"!raw\": throw new Error(\"Missing configuration payload\"); replaced by return {};",
      "beforeSpan": {
        "startLine": 2,
        "startColumn": 3,
        "endLine": 4,
        "endColumn": 4
      },
      "afterSpan": {
        "startLine": 2,
        "startColumn": 3,
        "endLine": 4,
        "endColumn": 4
      },
      "beforeSnippet": "if (!raw) {\n    throw new Error(\"Missing configuration payload\");\n  }",
      "afterSnippet": "if (!raw) {\n    return {};\n  }"
    }
  ],
  "testChanges": [],
  "declarationChanges": [],
  "correlations": [],
  "correlationItems": [],
  "findings": [
    {
      "id": "FND-001",
      "title": "Throw-to-return conversion under condition (!raw)",
      "category": "GUARD_CLAUSE",
      "attentionLevel": "MODERATE_ATTENTION",
      "structuralChangeIds": [
        "SC-001"
      ],
      "correlationId": null,
      "observed": [
        {
          "id": "OBS-001",
          "category": "OBSERVED",
          "statement": "Under condition \"!raw\", throw statement \"throw new Error(\"Missing configuration payload\");\" at BASE lines 2-4 was replaced with return statement \"return {};\" at HEAD lines 2-4.",
          "evidenceIds": [
            "EV-001",
            "EV-002"
          ],
          "span": {
            "startLine": 2,
            "startColumn": 3,
            "endLine": 4,
            "endColumn": 4
          },
          "snippet": "if (!raw) {\n    throw new Error(\"Missing configuration payload\");\n  }"
        }
      ],
      "inferred": [
        {
          "id": "INF-001",
          "category": "INFERRED",
          "statement": "Control flow changed from raising an exception to returning a value when condition \"!raw\" is satisfied.",
          "ruleId": "RULE_THROW_TO_RETURN_CONVERSION",
          "supportingObservationIds": [
            "OBS-001"
          ]
        }
      ],
      "unknown": [
        {
          "id": "UNK-001",
          "category": "UNKNOWN",
          "statement": "Static analysis cannot determine whether external callers handle the return value or still expect an exception.",
          "reasonCategory": "EXTERNAL_CALLER_BEHAVIOR"
        }
      ]
    }
  ],
  "limitations": [],
  "errors": []
}
;

export const DEMO_SCENARIO_D: AnalysisReport = {
  "schemaVersion": "1.0.0",
  "generatedAtIso": "2026-11-04T16:56:32.947Z",
  "status": "COMPLETED_WITH_FINDINGS",
  "request": {
    "repoPath": "E:\\change-archaeologist\\examples\\demo-repository",
    "targetFilePath": "src/order.ts",
    "targetFunctionName": "calculateDiscount",
    "baseRevisionInput": "base",
    "headRevisionInput": "head"
  },
  "repository": {
    "rootPath": "E:/change-archaeologist/examples/demo-repository",
    "gitVersion": "git version 2.53.0.windows.1",
    "isCleanWorkingTreeAtStart": true
  },
  "baseCommit": {
    "role": "BASE",
    "sha": "9a8bf4ea3ab1a6bbfda67a7516a99e2f6c363b7d",
    "shortSha": "9a8bf4e",
    "authorName": "Archaeologist Demo",
    "committedAtIso": "2026-01-01T12:00:00Z",
    "subject": "Release v1.0.0: Initial implementation"
  },
  "headCommit": {
    "role": "HEAD",
    "sha": "a8265d8ddd27dc3907aa537c4177e15f3e7c0af1",
    "shortSha": "a8265d8",
    "authorName": "Archaeologist Demo",
    "committedAtIso": "2026-01-02T12:00:00Z",
    "subject": "Release v1.1.0: Feature updates and refactoring"
  },
  "baseFunction": {
    "role": "BASE",
    "commitSha": "9a8bf4ea3ab1a6bbfda67a7516a99e2f6c363b7d",
    "posixFilePath": "src/order.ts",
    "qualifiedName": "calculateDiscount",
    "functionName": "calculateDiscount",
    "kind": "FUNCTION_DECLARATION",
    "span": {
      "startLine": 1,
      "startColumn": 1,
      "endLine": 6,
      "endColumn": 2
    },
    "signatureText": "export function calculateDiscount(price: number): number",
    "rawBodyText": "{\n  if (price <= 0) {\n    return 0;\n  }\n  return price * 0.10;\n}",
    "guards": [
      {
        "fingerprint": "GUARD:price <= 0:RETURN:return 0",
        "conditionText": "price <= 0",
        "normalizedCondition": "price <= 0",
        "exitKind": "RETURN",
        "exitText": "return 0;",
        "normalizedExit": "return 0",
        "isLeadingGuard": true,
        "nestingDepth": 0,
        "span": {
          "startLine": 2,
          "startColumn": 3,
          "endLine": 4,
          "endColumn": 4
        },
        "rawText": "if (price <= 0) {\n    return 0;\n  }"
      }
    ],
    "conditionals": [
      {
        "fingerprint": "IF_STATEMENT:price <= 0",
        "constructKind": "IF_STATEMENT",
        "conditionText": "price <= 0",
        "normalizedCondition": "price <= 0",
        "operatorTokens": [
          "<="
        ],
        "nestingDepth": 1,
        "span": {
          "startLine": 2,
          "startColumn": 7,
          "endLine": 2,
          "endColumn": 17
        },
        "rawText": "price <= 0"
      }
    ],
    "throws": [],
    "returns": [
      {
        "fingerprint": "RETURN:EXPRESSION:0",
        "returnCategory": "EXPRESSION",
        "expressionText": "0",
        "normalizedExpression": "0",
        "isEarlyReturn": true,
        "nestingDepth": 2,
        "span": {
          "startLine": 3,
          "startColumn": 5,
          "endLine": 3,
          "endColumn": 14
        },
        "rawText": "return 0;"
      },
      {
        "fingerprint": "RETURN:EXPRESSION:price * 0.10",
        "returnCategory": "EXPRESSION",
        "expressionText": "price * 0.10",
        "normalizedExpression": "price * 0.10",
        "isEarlyReturn": false,
        "nestingDepth": 0,
        "span": {
          "startLine": 5,
          "startColumn": 3,
          "endLine": 5,
          "endColumn": 23
        },
        "rawText": "return price * 0.10;"
      }
    ]
  },
  "headFunction": {
    "role": "HEAD",
    "commitSha": "a8265d8ddd27dc3907aa537c4177e15f3e7c0af1",
    "posixFilePath": "src/order.ts",
    "qualifiedName": "calculateDiscount",
    "functionName": "calculateDiscount",
    "kind": "FUNCTION_DECLARATION",
    "span": {
      "startLine": 1,
      "startColumn": 1,
      "endLine": 6,
      "endColumn": 2
    },
    "signatureText": "export function calculateDiscount(price: number): number",
    "rawBodyText": "{\n  if (price <= 0) {\n    return 0;\n  }\n  return price * 0.15;\n}",
    "guards": [
      {
        "fingerprint": "GUARD:price <= 0:RETURN:return 0",
        "conditionText": "price <= 0",
        "normalizedCondition": "price <= 0",
        "exitKind": "RETURN",
        "exitText": "return 0;",
        "normalizedExit": "return 0",
        "isLeadingGuard": true,
        "nestingDepth": 0,
        "span": {
          "startLine": 2,
          "startColumn": 3,
          "endLine": 4,
          "endColumn": 4
        },
        "rawText": "if (price <= 0) {\n    return 0;\n  }"
      }
    ],
    "conditionals": [
      {
        "fingerprint": "IF_STATEMENT:price <= 0",
        "constructKind": "IF_STATEMENT",
        "conditionText": "price <= 0",
        "normalizedCondition": "price <= 0",
        "operatorTokens": [
          "<="
        ],
        "nestingDepth": 1,
        "span": {
          "startLine": 2,
          "startColumn": 7,
          "endLine": 2,
          "endColumn": 17
        },
        "rawText": "price <= 0"
      }
    ],
    "throws": [],
    "returns": [
      {
        "fingerprint": "RETURN:EXPRESSION:0",
        "returnCategory": "EXPRESSION",
        "expressionText": "0",
        "normalizedExpression": "0",
        "isEarlyReturn": true,
        "nestingDepth": 2,
        "span": {
          "startLine": 3,
          "startColumn": 5,
          "endLine": 3,
          "endColumn": 14
        },
        "rawText": "return 0;"
      },
      {
        "fingerprint": "RETURN:EXPRESSION:price * 0.15",
        "returnCategory": "EXPRESSION",
        "expressionText": "price * 0.15",
        "normalizedExpression": "price * 0.15",
        "isEarlyReturn": false,
        "nestingDepth": 0,
        "span": {
          "startLine": 5,
          "startColumn": 3,
          "endLine": 5,
          "endColumn": 23
        },
        "rawText": "return price * 0.15;"
      }
    ]
  },
  "evidence": [
    {
      "id": "EV-001",
      "kind": "SOURCE_BEFORE",
      "commitRole": "BASE",
      "commitSha": "9a8bf4ea3ab1a6bbfda67a7516a99e2f6c363b7d",
      "posixFilePath": "src/order.ts",
      "span": {
        "startLine": 5,
        "startColumn": 3,
        "endLine": 5,
        "endColumn": 23
      },
      "codeSnippet": "return price * 0.10;",
      "description": "Return statement at BASE lines 5-5"
    },
    {
      "id": "EV-002",
      "kind": "SOURCE_AFTER",
      "commitRole": "HEAD",
      "commitSha": "a8265d8ddd27dc3907aa537c4177e15f3e7c0af1",
      "posixFilePath": "src/order.ts",
      "span": {
        "startLine": 5,
        "startColumn": 3,
        "endLine": 5,
        "endColumn": 23
      },
      "codeSnippet": "return price * 0.15;",
      "description": "Return statement at HEAD lines 5-5"
    }
  ],
  "structuralChanges": [
    {
      "id": "SC-001",
      "ruleId": "RULE_RETURN_MODIFIED",
      "category": "RETURN_STATEMENT",
      "changeType": "MODIFIED",
      "summary": "Return statement modified: from \"return price * 0.10;\" to \"return price * 0.15;\"",
      "beforeSpan": {
        "startLine": 5,
        "startColumn": 3,
        "endLine": 5,
        "endColumn": 23
      },
      "afterSpan": {
        "startLine": 5,
        "startColumn": 3,
        "endLine": 5,
        "endColumn": 23
      },
      "beforeSnippet": "return price * 0.10;",
      "afterSnippet": "return price * 0.15;"
    }
  ],
  "testChanges": [
    {
      "id": "TC-001",
      "posixTestFilePath": "tests/order.test.ts",
      "fileChangeStatus": "MODIFIED",
      "importsTargetFile": false,
      "mentionsTargetFunction": true,
      "assertionChanges": [
        {
          "changeType": "ASSERTION_MODIFIED_OR_REWRITTEN",
          "enclosingTestBlock": "order calculation > calculates regular discount",
          "callsTargetFunctionInBlock": true,
          "beforeAssertionText": "expect(calculateDiscount(100)).toBe(10)",
          "afterAssertionText": "expect(calculateDiscount(100)).toBe(15)",
          "beforeSpan": {
            "startLine": 5,
            "startColumn": 5,
            "endLine": 5,
            "endColumn": 44
          },
          "afterSpan": {
            "startLine": 5,
            "startColumn": 5,
            "endLine": 5,
            "endColumn": 44
          }
        }
      ]
    }
  ],
  "declarationChanges": [
    {
      "id": "TDC-001",
      "posixTestFilePath": "tests/order.test.ts",
      "changeType": "MODIFIED",
      "fullTitle": "order calculation > calculates regular discount",
      "beforeDescription": "calculates regular discount",
      "afterDescription": "calculates regular discount",
      "beforeSpan": {
        "startLine": 4,
        "startColumn": 3,
        "endLine": 6,
        "endColumn": 5
      },
      "afterSpan": {
        "startLine": 4,
        "startColumn": 3,
        "endLine": 6,
        "endColumn": 5
      },
      "details": "Test body modified in \"order calculation > calculates regular discount\""
    }
  ],
  "correlations": [
    {
      "id": "CORR-001",
      "structuralChangeId": "SC-001",
      "status": "WEAK",
      "relatedTestChangeIds": [
        "TC-001"
      ],
      "untouchedCompanionTestFiles": [],
      "rationale": "Production change 'Return statement modified: from \"return price * 0.10;\" to \"return price * 0.15;\"' co-occurred with 1 test changes."
    }
  ],
  "correlationItems": [
    {
      "id": "CORR-ITEM-001",
      "correlationId": "CORR-001",
      "structuralChangeId": "SC-001",
      "testChangeId": "TC-001",
      "posixTestFilePath": "tests/order.test.ts",
      "classification": "POTENTIALLY_RELATED_ASSERTION_MODIFIED",
      "status": "STRONG",
      "rationale": "Assertion modified alongside production structural change 'Return statement modified: from \"return price * 0.10;\" to \"return price * 0.15;\"'. Relationship is unverified.",
      "observedFact": "Assertion was modified from 'expect(calculateDiscount(100)).toBe(10)' to 'expect(calculateDiscount(100)).toBe(15)' in 'tests/order.test.ts'. Production structural change 'Return statement modified: from \"return price * 0.10;\" to \"return price * 0.15;\"' occurred in the same revision range.",
      "inferredRelationship": "Potential relationship: Assertion was modified alongside production structural change; relationship remains unverified.",
      "unknowns": [
        "Static analysis cannot prove that the modified assertion verifies the changed production code.",
        "Static analysis cannot determine runtime test passing status or whether runtime behavior changed."
      ],
      "evidenceIds": [
        "EV-001",
        "EV-002"
      ]
    },
    {
      "id": "CORR-ITEM-002",
      "correlationId": "CORR-001",
      "structuralChangeId": "SC-001",
      "testChangeId": null,
      "posixTestFilePath": "tests/order.test.ts",
      "classification": "POTENTIALLY_RELATED_TEST_DECLARATION_CHANGED",
      "status": "WEAK",
      "rationale": "Test declaration was modified in 'tests/order.test.ts' alongside production structural change 'Return statement modified: from \"return price * 0.10;\" to \"return price * 0.15;\"'.",
      "observedFact": "Test declaration \"order calculation > calculates regular discount\" was modified in 'tests/order.test.ts' in the same revision range as production change 'Return statement modified: from \"return price * 0.10;\" to \"return price * 0.15;\"'.",
      "inferredRelationship": "Test declaration was modified in the same revision range as production structural change.",
      "unknowns": [
        "Static analysis cannot conclude that an added test validates the changed function or that a removed test was the only protection for a behavior.",
        "Static analysis cannot determine test execution or coverage."
      ],
      "evidenceIds": [
        "EV-001"
      ]
    }
  ],
  "testAnalysisStatus": "COMPLETED_WITH_CHANGES",
  "correlationAnalysisStatus": "COMPLETE_CORRELATED",
  "findings": [
    {
      "id": "FND-001",
      "title": "Return statement modified",
      "category": "RETURN_STATEMENT",
      "attentionLevel": "INFORMATIONAL",
      "structuralChangeIds": [
        "SC-001"
      ],
      "correlationId": null,
      "observed": [
        {
          "id": "OBS-001",
          "category": "OBSERVED",
          "statement": "Return statement at BASE lines 5-5 (\"return price * 0.10;\") changed to (\"return price * 0.15;\") at HEAD lines 5-5.",
          "evidenceIds": [
            "EV-001",
            "EV-002"
          ],
          "span": {
            "startLine": 5,
            "startColumn": 3,
            "endLine": 5,
            "endColumn": 23
          },
          "snippet": "return price * 0.10;"
        }
      ],
      "inferred": [
        {
          "id": "INF-001",
          "category": "INFERRED",
          "statement": "Return value or return category was modified in \"calculateDiscount\".",
          "ruleId": "RULE_RETURN_MODIFIED",
          "supportingObservationIds": [
            "OBS-001"
          ]
        }
      ],
      "unknown": [
        {
          "id": "UNK-001",
          "category": "UNKNOWN",
          "statement": "Static analysis cannot determine whether callers expect the previous return value format.",
          "reasonCategory": "EXTERNAL_CALLER_BEHAVIOR"
        }
      ]
    },
    {
      "id": "FND-CORR-001",
      "title": "POTENTIALLY RELATED ASSERTION MODIFIED: Return statement modified: from \"return price * 0.10;\" to \"return price * 0.15;\"",
      "category": "TEST_CORRELATION",
      "attentionLevel": "MODERATE_ATTENTION",
      "structuralChangeIds": [
        "SC-001"
      ],
      "correlationId": "CORR-001",
      "observed": [
        {
          "id": "OBS-CORR-001",
          "category": "OBSERVED",
          "statement": "Assertion was modified from 'expect(calculateDiscount(100)).toBe(10)' to 'expect(calculateDiscount(100)).toBe(15)' in 'tests/order.test.ts'. Production structural change 'Return statement modified: from \"return price * 0.10;\" to \"return price * 0.15;\"' occurred in the same revision range.",
          "evidenceIds": [
            "EV-001"
          ]
        }
      ],
      "inferred": [
        {
          "id": "INF-CORR-001",
          "category": "INFERRED",
          "statement": "Potential relationship: Assertion was modified alongside production structural change; relationship remains unverified.",
          "ruleId": "RULE_CORRELATION_ASSERTION_MODIFIED",
          "supportingObservationIds": [
            "OBS-CORR-001"
          ]
        }
      ],
      "unknown": [
        {
          "id": "UNK-CORR-001",
          "category": "UNKNOWN",
          "statement": "Static analysis cannot prove that the modified assertion verifies the changed production code.",
          "reasonCategory": "RUNTIME_TEST_EXECUTION_UNVERIFIED"
        },
        {
          "id": "UNK-CORR-002",
          "category": "UNKNOWN",
          "statement": "Static analysis cannot determine runtime test passing status or whether runtime behavior changed.",
          "reasonCategory": "RUNTIME_TEST_EXECUTION_UNVERIFIED"
        }
      ]
    }
  ],
  "limitations": [],
  "errors": []
}
;

export const DEMO_SCENARIO_E: AnalysisReport = {
  "schemaVersion": "1.0.0",
  "generatedAtIso": "2026-11-04T16:56:36.338Z",
  "status": "COMPLETED_WITH_FINDINGS",
  "request": {
    "repoPath": "E:\\change-archaeologist\\examples\\demo-repository",
    "targetFilePath": "src/order.ts",
    "targetFunctionName": "calculateDiscount",
    "baseRevisionInput": "base",
    "headRevisionInput": "head"
  },
  "repository": {
    "rootPath": "E:/change-archaeologist/examples/demo-repository",
    "gitVersion": "git version 2.53.0.windows.1",
    "isCleanWorkingTreeAtStart": true
  },
  "baseCommit": {
    "role": "BASE",
    "sha": "9a8bf4ea3ab1a6bbfda67a7516a99e2f6c363b7d",
    "shortSha": "9a8bf4e",
    "authorName": "Archaeologist Demo",
    "committedAtIso": "2026-01-01T12:00:00Z",
    "subject": "Release v1.0.0: Initial implementation"
  },
  "headCommit": {
    "role": "HEAD",
    "sha": "a8265d8ddd27dc3907aa537c4177e15f3e7c0af1",
    "shortSha": "a8265d8",
    "authorName": "Archaeologist Demo",
    "committedAtIso": "2026-01-02T12:00:00Z",
    "subject": "Release v1.1.0: Feature updates and refactoring"
  },
  "baseFunction": {
    "role": "BASE",
    "commitSha": "9a8bf4ea3ab1a6bbfda67a7516a99e2f6c363b7d",
    "posixFilePath": "src/order.ts",
    "qualifiedName": "calculateDiscount",
    "functionName": "calculateDiscount",
    "kind": "FUNCTION_DECLARATION",
    "span": {
      "startLine": 1,
      "startColumn": 1,
      "endLine": 6,
      "endColumn": 2
    },
    "signatureText": "export function calculateDiscount(price: number): number",
    "rawBodyText": "{\n  if (price <= 0) {\n    return 0;\n  }\n  return price * 0.10;\n}",
    "guards": [
      {
        "fingerprint": "GUARD:price <= 0:RETURN:return 0",
        "conditionText": "price <= 0",
        "normalizedCondition": "price <= 0",
        "exitKind": "RETURN",
        "exitText": "return 0;",
        "normalizedExit": "return 0",
        "isLeadingGuard": true,
        "nestingDepth": 0,
        "span": {
          "startLine": 2,
          "startColumn": 3,
          "endLine": 4,
          "endColumn": 4
        },
        "rawText": "if (price <= 0) {\n    return 0;\n  }"
      }
    ],
    "conditionals": [
      {
        "fingerprint": "IF_STATEMENT:price <= 0",
        "constructKind": "IF_STATEMENT",
        "conditionText": "price <= 0",
        "normalizedCondition": "price <= 0",
        "operatorTokens": [
          "<="
        ],
        "nestingDepth": 1,
        "span": {
          "startLine": 2,
          "startColumn": 7,
          "endLine": 2,
          "endColumn": 17
        },
        "rawText": "price <= 0"
      }
    ],
    "throws": [],
    "returns": [
      {
        "fingerprint": "RETURN:EXPRESSION:0",
        "returnCategory": "EXPRESSION",
        "expressionText": "0",
        "normalizedExpression": "0",
        "isEarlyReturn": true,
        "nestingDepth": 2,
        "span": {
          "startLine": 3,
          "startColumn": 5,
          "endLine": 3,
          "endColumn": 14
        },
        "rawText": "return 0;"
      },
      {
        "fingerprint": "RETURN:EXPRESSION:price * 0.10",
        "returnCategory": "EXPRESSION",
        "expressionText": "price * 0.10",
        "normalizedExpression": "price * 0.10",
        "isEarlyReturn": false,
        "nestingDepth": 0,
        "span": {
          "startLine": 5,
          "startColumn": 3,
          "endLine": 5,
          "endColumn": 23
        },
        "rawText": "return price * 0.10;"
      }
    ]
  },
  "headFunction": {
    "role": "HEAD",
    "commitSha": "a8265d8ddd27dc3907aa537c4177e15f3e7c0af1",
    "posixFilePath": "src/order.ts",
    "qualifiedName": "calculateDiscount",
    "functionName": "calculateDiscount",
    "kind": "FUNCTION_DECLARATION",
    "span": {
      "startLine": 1,
      "startColumn": 1,
      "endLine": 6,
      "endColumn": 2
    },
    "signatureText": "export function calculateDiscount(price: number): number",
    "rawBodyText": "{\n  if (price <= 0) {\n    return 0;\n  }\n  return price * 0.15;\n}",
    "guards": [
      {
        "fingerprint": "GUARD:price <= 0:RETURN:return 0",
        "conditionText": "price <= 0",
        "normalizedCondition": "price <= 0",
        "exitKind": "RETURN",
        "exitText": "return 0;",
        "normalizedExit": "return 0",
        "isLeadingGuard": true,
        "nestingDepth": 0,
        "span": {
          "startLine": 2,
          "startColumn": 3,
          "endLine": 4,
          "endColumn": 4
        },
        "rawText": "if (price <= 0) {\n    return 0;\n  }"
      }
    ],
    "conditionals": [
      {
        "fingerprint": "IF_STATEMENT:price <= 0",
        "constructKind": "IF_STATEMENT",
        "conditionText": "price <= 0",
        "normalizedCondition": "price <= 0",
        "operatorTokens": [
          "<="
        ],
        "nestingDepth": 1,
        "span": {
          "startLine": 2,
          "startColumn": 7,
          "endLine": 2,
          "endColumn": 17
        },
        "rawText": "price <= 0"
      }
    ],
    "throws": [],
    "returns": [
      {
        "fingerprint": "RETURN:EXPRESSION:0",
        "returnCategory": "EXPRESSION",
        "expressionText": "0",
        "normalizedExpression": "0",
        "isEarlyReturn": true,
        "nestingDepth": 2,
        "span": {
          "startLine": 3,
          "startColumn": 5,
          "endLine": 3,
          "endColumn": 14
        },
        "rawText": "return 0;"
      },
      {
        "fingerprint": "RETURN:EXPRESSION:price * 0.15",
        "returnCategory": "EXPRESSION",
        "expressionText": "price * 0.15",
        "normalizedExpression": "price * 0.15",
        "isEarlyReturn": false,
        "nestingDepth": 0,
        "span": {
          "startLine": 5,
          "startColumn": 3,
          "endLine": 5,
          "endColumn": 23
        },
        "rawText": "return price * 0.15;"
      }
    ]
  },
  "evidence": [
    {
      "id": "EV-001",
      "kind": "SOURCE_BEFORE",
      "commitRole": "BASE",
      "commitSha": "9a8bf4ea3ab1a6bbfda67a7516a99e2f6c363b7d",
      "posixFilePath": "src/order.ts",
      "span": {
        "startLine": 5,
        "startColumn": 3,
        "endLine": 5,
        "endColumn": 23
      },
      "codeSnippet": "return price * 0.10;",
      "description": "Return statement at BASE lines 5-5"
    },
    {
      "id": "EV-002",
      "kind": "SOURCE_AFTER",
      "commitRole": "HEAD",
      "commitSha": "a8265d8ddd27dc3907aa537c4177e15f3e7c0af1",
      "posixFilePath": "src/order.ts",
      "span": {
        "startLine": 5,
        "startColumn": 3,
        "endLine": 5,
        "endColumn": 23
      },
      "codeSnippet": "return price * 0.15;",
      "description": "Return statement at HEAD lines 5-5"
    }
  ],
  "structuralChanges": [
    {
      "id": "SC-001",
      "ruleId": "RULE_RETURN_MODIFIED",
      "category": "RETURN_STATEMENT",
      "changeType": "MODIFIED",
      "summary": "Return statement modified: from \"return price * 0.10;\" to \"return price * 0.15;\"",
      "beforeSpan": {
        "startLine": 5,
        "startColumn": 3,
        "endLine": 5,
        "endColumn": 23
      },
      "afterSpan": {
        "startLine": 5,
        "startColumn": 3,
        "endLine": 5,
        "endColumn": 23
      },
      "beforeSnippet": "return price * 0.10;",
      "afterSnippet": "return price * 0.15;"
    }
  ],
  "testChanges": [
    {
      "id": "TC-001",
      "posixTestFilePath": "tests/order.test.ts",
      "fileChangeStatus": "MODIFIED",
      "importsTargetFile": false,
      "mentionsTargetFunction": true,
      "assertionChanges": [
        {
          "changeType": "ASSERTION_MODIFIED_OR_REWRITTEN",
          "enclosingTestBlock": "order calculation > calculates regular discount",
          "callsTargetFunctionInBlock": true,
          "beforeAssertionText": "expect(calculateDiscount(100)).toBe(10)",
          "afterAssertionText": "expect(calculateDiscount(100)).toBe(15)",
          "beforeSpan": {
            "startLine": 5,
            "startColumn": 5,
            "endLine": 5,
            "endColumn": 44
          },
          "afterSpan": {
            "startLine": 5,
            "startColumn": 5,
            "endLine": 5,
            "endColumn": 44
          }
        }
      ]
    }
  ],
  "declarationChanges": [
    {
      "id": "TDC-001",
      "posixTestFilePath": "tests/order.test.ts",
      "changeType": "MODIFIED",
      "fullTitle": "order calculation > calculates regular discount",
      "beforeDescription": "calculates regular discount",
      "afterDescription": "calculates regular discount",
      "beforeSpan": {
        "startLine": 4,
        "startColumn": 3,
        "endLine": 6,
        "endColumn": 5
      },
      "afterSpan": {
        "startLine": 4,
        "startColumn": 3,
        "endLine": 6,
        "endColumn": 5
      },
      "details": "Test body modified in \"order calculation > calculates regular discount\""
    }
  ],
  "correlations": [
    {
      "id": "CORR-001",
      "structuralChangeId": "SC-001",
      "status": "WEAK",
      "relatedTestChangeIds": [
        "TC-001"
      ],
      "untouchedCompanionTestFiles": [],
      "rationale": "Production change 'Return statement modified: from \"return price * 0.10;\" to \"return price * 0.15;\"' co-occurred with 1 test changes."
    }
  ],
  "correlationItems": [
    {
      "id": "CORR-ITEM-001",
      "correlationId": "CORR-001",
      "structuralChangeId": "SC-001",
      "testChangeId": "TC-001",
      "posixTestFilePath": "tests/order.test.ts",
      "classification": "POTENTIALLY_RELATED_ASSERTION_MODIFIED",
      "status": "STRONG",
      "rationale": "Assertion modified alongside production structural change 'Return statement modified: from \"return price * 0.10;\" to \"return price * 0.15;\"'. Relationship is unverified.",
      "observedFact": "Assertion was modified from 'expect(calculateDiscount(100)).toBe(10)' to 'expect(calculateDiscount(100)).toBe(15)' in 'tests/order.test.ts'. Production structural change 'Return statement modified: from \"return price * 0.10;\" to \"return price * 0.15;\"' occurred in the same revision range.",
      "inferredRelationship": "Potential relationship: Assertion was modified alongside production structural change; relationship remains unverified.",
      "unknowns": [
        "Static analysis cannot prove that the modified assertion verifies the changed production code.",
        "Static analysis cannot determine runtime test passing status or whether runtime behavior changed."
      ],
      "evidenceIds": [
        "EV-001",
        "EV-002"
      ]
    },
    {
      "id": "CORR-ITEM-002",
      "correlationId": "CORR-001",
      "structuralChangeId": "SC-001",
      "testChangeId": null,
      "posixTestFilePath": "tests/order.test.ts",
      "classification": "POTENTIALLY_RELATED_TEST_DECLARATION_CHANGED",
      "status": "WEAK",
      "rationale": "Test declaration was modified in 'tests/order.test.ts' alongside production structural change 'Return statement modified: from \"return price * 0.10;\" to \"return price * 0.15;\"'.",
      "observedFact": "Test declaration \"order calculation > calculates regular discount\" was modified in 'tests/order.test.ts' in the same revision range as production change 'Return statement modified: from \"return price * 0.10;\" to \"return price * 0.15;\"'.",
      "inferredRelationship": "Test declaration was modified in the same revision range as production structural change.",
      "unknowns": [
        "Static analysis cannot conclude that an added test validates the changed function or that a removed test was the only protection for a behavior.",
        "Static analysis cannot determine test execution or coverage."
      ],
      "evidenceIds": [
        "EV-001"
      ]
    }
  ],
  "testAnalysisStatus": "COMPLETED_WITH_CHANGES",
  "correlationAnalysisStatus": "COMPLETE_CORRELATED",
  "findings": [
    {
      "id": "FND-001",
      "title": "Return statement modified",
      "category": "RETURN_STATEMENT",
      "attentionLevel": "INFORMATIONAL",
      "structuralChangeIds": [
        "SC-001"
      ],
      "correlationId": null,
      "observed": [
        {
          "id": "OBS-001",
          "category": "OBSERVED",
          "statement": "Return statement at BASE lines 5-5 (\"return price * 0.10;\") changed to (\"return price * 0.15;\") at HEAD lines 5-5.",
          "evidenceIds": [
            "EV-001",
            "EV-002"
          ],
          "span": {
            "startLine": 5,
            "startColumn": 3,
            "endLine": 5,
            "endColumn": 23
          },
          "snippet": "return price * 0.10;"
        }
      ],
      "inferred": [
        {
          "id": "INF-001",
          "category": "INFERRED",
          "statement": "Return value or return category was modified in \"calculateDiscount\".",
          "ruleId": "RULE_RETURN_MODIFIED",
          "supportingObservationIds": [
            "OBS-001"
          ]
        }
      ],
      "unknown": [
        {
          "id": "UNK-001",
          "category": "UNKNOWN",
          "statement": "Static analysis cannot determine whether callers expect the previous return value format.",
          "reasonCategory": "EXTERNAL_CALLER_BEHAVIOR"
        }
      ]
    },
    {
      "id": "FND-CORR-001",
      "title": "POTENTIALLY RELATED ASSERTION MODIFIED: Return statement modified: from \"return price * 0.10;\" to \"return price * 0.15;\"",
      "category": "TEST_CORRELATION",
      "attentionLevel": "MODERATE_ATTENTION",
      "structuralChangeIds": [
        "SC-001"
      ],
      "correlationId": "CORR-001",
      "observed": [
        {
          "id": "OBS-CORR-001",
          "category": "OBSERVED",
          "statement": "Assertion was modified from 'expect(calculateDiscount(100)).toBe(10)' to 'expect(calculateDiscount(100)).toBe(15)' in 'tests/order.test.ts'. Production structural change 'Return statement modified: from \"return price * 0.10;\" to \"return price * 0.15;\"' occurred in the same revision range.",
          "evidenceIds": [
            "EV-001"
          ]
        }
      ],
      "inferred": [
        {
          "id": "INF-CORR-001",
          "category": "INFERRED",
          "statement": "Potential relationship: Assertion was modified alongside production structural change; relationship remains unverified.",
          "ruleId": "RULE_CORRELATION_ASSERTION_MODIFIED",
          "supportingObservationIds": [
            "OBS-CORR-001"
          ]
        }
      ],
      "unknown": [
        {
          "id": "UNK-CORR-001",
          "category": "UNKNOWN",
          "statement": "Static analysis cannot prove that the modified assertion verifies the changed production code.",
          "reasonCategory": "RUNTIME_TEST_EXECUTION_UNVERIFIED"
        },
        {
          "id": "UNK-CORR-002",
          "category": "UNKNOWN",
          "statement": "Static analysis cannot determine runtime test passing status or whether runtime behavior changed.",
          "reasonCategory": "RUNTIME_TEST_EXECUTION_UNVERIFIED"
        }
      ]
    }
  ],
  "limitations": [],
  "errors": []
}
;

export const DEMO_SCENARIO_F: AnalysisReport = {
  "schemaVersion": "1.0.0",
  "generatedAtIso": "2026-11-04T16:56:38.931Z",
  "status": "INCOMPLETE_FUNCTION_MISSING",
  "request": {
    "repoPath": "E:\\change-archaeologist\\examples\\demo-repository",
    "targetFilePath": "src/legacy.ts",
    "targetFunctionName": "deprecatedHelper",
    "baseRevisionInput": "base",
    "headRevisionInput": "head"
  },
  "repository": {
    "rootPath": "E:/change-archaeologist/examples/demo-repository",
    "gitVersion": "git version 2.53.0.windows.1",
    "isCleanWorkingTreeAtStart": true
  },
  "baseCommit": {
    "role": "BASE",
    "sha": "9a8bf4ea3ab1a6bbfda67a7516a99e2f6c363b7d",
    "shortSha": "9a8bf4e",
    "authorName": "Archaeologist Demo",
    "committedAtIso": "2026-01-01T12:00:00Z",
    "subject": "Release v1.0.0: Initial implementation"
  },
  "headCommit": {
    "role": "HEAD",
    "sha": "a8265d8ddd27dc3907aa537c4177e15f3e7c0af1",
    "shortSha": "a8265d8",
    "authorName": "Archaeologist Demo",
    "committedAtIso": "2026-01-02T12:00:00Z",
    "subject": "Release v1.1.0: Feature updates and refactoring"
  },
  "baseFunction": {
    "role": "BASE",
    "commitSha": "9a8bf4ea3ab1a6bbfda67a7516a99e2f6c363b7d",
    "posixFilePath": "src/legacy.ts",
    "qualifiedName": "deprecatedHelper",
    "functionName": "deprecatedHelper",
    "kind": "FUNCTION_DECLARATION",
    "span": {
      "startLine": 1,
      "startColumn": 1,
      "endLine": 3,
      "endColumn": 2
    },
    "signatureText": "export function deprecatedHelper(val: string): string",
    "rawBodyText": "{\n  return val.trim().toLowerCase();\n}",
    "guards": [],
    "conditionals": [],
    "throws": [],
    "returns": [
      {
        "fingerprint": "RETURN:EXPRESSION:val.trim().toLowerCase()",
        "returnCategory": "EXPRESSION",
        "expressionText": "val.trim().toLowerCase()",
        "normalizedExpression": "val.trim().toLowerCase()",
        "isEarlyReturn": false,
        "nestingDepth": 0,
        "span": {
          "startLine": 2,
          "startColumn": 3,
          "endLine": 2,
          "endColumn": 35
        },
        "rawText": "return val.trim().toLowerCase();"
      }
    ]
  },
  "headFunction": null,
  "evidence": [
    {
      "id": "EV-001",
      "kind": "SOURCE_BEFORE",
      "commitRole": "BASE",
      "commitSha": "9a8bf4ea3ab1a6bbfda67a7516a99e2f6c363b7d",
      "posixFilePath": "src/legacy.ts",
      "span": {
        "startLine": 1,
        "startColumn": 1,
        "endLine": 3,
        "endColumn": 2
      },
      "codeSnippet": "export function deprecatedHelper(val: string): string {\n  return val.trim().toLowerCase();\n}",
      "description": "Function 'deprecatedHelper' was present at BASE lines 1-3"
    }
  ],
  "structuralChanges": [],
  "testChanges": [],
  "declarationChanges": [],
  "correlations": [],
  "correlationItems": [],
  "findings": [
    {
      "id": "FND-001",
      "title": "Function 'deprecatedHelper' missing in HEAD revision",
      "category": "LINEAGE_LIMITATION",
      "attentionLevel": "HIGH_ATTENTION",
      "structuralChangeIds": [],
      "correlationId": null,
      "observed": [
        {
          "id": "OBS-001",
          "category": "OBSERVED",
          "statement": "Target function 'deprecatedHelper' was missing in HEAD revision of 'src/legacy.ts'.",
          "evidenceIds": [
            "EV-001"
          ]
        }
      ],
      "inferred": [
        {
          "id": "INF-001",
          "category": "INFERRED",
          "statement": "Function may have been deleted, renamed, or extracted to another file across revisions.",
          "ruleId": "RULE_LINEAGE_LIMITATION",
          "supportingObservationIds": [
            "OBS-001"
          ]
        }
      ],
      "unknown": [
        {
          "id": "UNK-001",
          "category": "UNKNOWN",
          "statement": "Single-file static analysis cannot track function renames or moves without cross-file repository lineage tracking.",
          "reasonCategory": "LINEAGE_OR_PARSE_BOUNDARY"
        }
      ]
    }
  ],
  "limitations": [
    "Target function 'deprecatedHelper' was not found in HEAD revision."
  ],
  "errors": []
}
;

export const DEMO_FIXTURES: readonly DemoFixture[] = [
  {
    id: "A",
    title: "Scenario A: Guard Clause Removal",
    description: "An early validation guard clause throwing an Error in BASE is structurally removed in HEAD.",
    targetFilePath: "src/auth.ts",
    targetFunctionName: "processPayment",
    report: DEMO_SCENARIO_A,
  },
  {
    id: "B",
    title: "Scenario B: Conditional Operator Modification",
    description: "A logical operator in a conditional guard mutates from logical AND (&&) to logical OR (||).",
    targetFilePath: "src/access.ts",
    targetFunctionName: "authorizeUser",
    report: DEMO_SCENARIO_B,
  },
  {
    id: "C",
    title: "Scenario C: Throw-to-Return Conversion",
    description: "An exceptional error exit (throw) is replaced by a graceful fallback return value.",
    targetFilePath: "src/config.ts",
    targetFunctionName: "loadConfig",
    report: DEMO_SCENARIO_C,
  },
  {
    id: "D",
    title: "Scenario D: Companion Test Change Detection",
    description: "Companion test changes in an isolated test file are detected with line numbers, titles, and AST assertion diffs.",
    targetFilePath: "src/order.ts",
    targetFunctionName: "calculateDiscount",
    report: DEMO_SCENARIO_D,
  },
  {
    id: "E",
    title: "Scenario E: Conservative Change-to-Test Correlation",
    description: "A production calculation change and a companion assertion change in the same commit are correlated without claiming runtime causality.",
    targetFilePath: "src/order.ts",
    targetFunctionName: "calculateDiscount",
    report: DEMO_SCENARIO_E,
  },
  {
    id: "F",
    title: "Scenario F: Incomplete Evidence (Missing Function)",
    description: "A target function present in BASE but deleted in HEAD produces an explicit incomplete report preserving epistemic boundaries.",
    targetFilePath: "src/legacy.ts",
    targetFunctionName: "deprecatedHelper",
    report: DEMO_SCENARIO_F,
  },
];
