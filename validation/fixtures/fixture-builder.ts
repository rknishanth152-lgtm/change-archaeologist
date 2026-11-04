/**
 * Change Archaeologist - Validation Fixture Builder
 *
 * Constructs disposable synthetic Git repositories for each of the 12 validation scenarios.
 * Uses TempGitRepo in os.tmpdir() to guarantee complete isolation from the workspace.
 */

import { TempGitRepo } from "../../tests/helpers/temp-git-repo.js";
import type { ValidationScenarioId } from "../types.js";

export interface FixtureSetup {
  readonly repo: TempGitRepo;
  readonly baseSha: string;
  readonly headSha: string;
}

export function buildScenarioFixture(scenarioId: ValidationScenarioId): FixtureSetup {
  const repo = TempGitRepo.create();

  switch (scenarioId) {
    case "A": {
      // Scenario A: Guard Clause Removal
      const baseSource = `export function processPayment(payment: { id: string; amount: number; valid: boolean }): string {
  if (!payment.valid) {
    throw new Error("Invalid payment");
  }
  return \`Processed: \${payment.id}\`;
}
`;
      const headSource = `export function processPayment(payment: { id: string; amount: number; valid: boolean }): string {
  return \`Processed: \${payment.id}\`;
}
`;
      repo.writeFile("src/payment.ts", baseSource);
      const baseSha = repo.commitAll("Commit A: initial with validation guard");

      repo.writeFile("src/payment.ts", headSource);
      const headSha = repo.commitAll("Commit B: removed validation guard");

      return { repo, baseSha, headSha };
    }

    case "B": {
      // Scenario B: Conditional Operator Change (&& to ||)
      const baseSource = `export function authorizeUser(user: { isAdmin: boolean; isOwner: boolean }): boolean {
  if (user.isAdmin && user.isOwner) {
    return true;
  }
  return false;
}
`;
      const headSource = `export function authorizeUser(user: { isAdmin: boolean; isOwner: boolean }): boolean {
  if (user.isAdmin || user.isOwner) {
    return true;
  }
  return false;
}
`;
      repo.writeFile("src/auth.ts", baseSource);
      const baseSha = repo.commitAll("Commit A: require both admin and owner");

      repo.writeFile("src/auth.ts", headSource);
      const headSha = repo.commitAll("Commit B: allow admin or owner");

      return { repo, baseSha, headSha };
    }

    case "C": {
      // Scenario C: Throw-to-Return Change
      const baseSource = `export function parseConfig(raw: string | null): object {
  if (!raw) {
    throw new Error("Missing config");
  }
  return JSON.parse(raw);
}
`;
      const headSource = `export function parseConfig(raw: string | null): object {
  if (!raw) {
    return {};
  }
  return JSON.parse(raw);
}
`;
      repo.writeFile("src/config.ts", baseSource);
      const baseSha = repo.commitAll("Commit A: throw on null config");

      repo.writeFile("src/config.ts", headSource);
      const headSha = repo.commitAll("Commit B: return empty object fallback");

      return { repo, baseSha, headSha };
    }

    case "D": {
      // Scenario D: Formatting-Only Change
      const baseSource = `export function calculateDiscount(price: number, rate: number): number {
  const discount = price * rate;
  return price - discount;
}
`;
      const headSource = `// Formatted with extra comments, whitespace, and semicolons
export function calculateDiscount( price: number, rate: number ): number {
  /* calculate the discount amount */
  const discount = price * rate ;

  // return final price
  return price - discount ;
}
`;
      repo.writeFile("src/pricing.ts", baseSource);
      const baseSha = repo.commitAll("Commit A: initial pricing function");

      repo.writeFile("src/pricing.ts", headSource);
      const headSha = repo.commitAll("Commit B: formatting and comments only");

      return { repo, baseSha, headSha };
    }

    case "E": {
      // Scenario E: Production Change With Unchanged Test File
      const baseSource = `export function applyDiscount(price: number): number {
  if (price <= 0) {
    throw new Error("Invalid price");
  }
  return price * 0.9;
}
`;
      const headSource = `export function applyDiscount(price: number): number {
  return price * 0.9;
}
`;
      const testSource = `import { applyDiscount } from "../src/discount.js";
describe("applyDiscount", () => {
  it("calculates 10% discount", () => {
    expect(applyDiscount(100)).toBe(90);
  });
});
`;
      repo.writeFile("src/discount.ts", baseSource);
      repo.writeFile("tests/discount.test.ts", testSource);
      const baseSha = repo.commitAll("Commit A: initial function with companion test");

      repo.writeFile("src/discount.ts", headSource);
      // test file remains untouched
      const headSha = repo.commitAll("Commit B: removed guard in production, test untouched");

      return { repo, baseSha, headSha };
    }

    case "F": {
      // Scenario F: Related-Looking Test Change
      const baseSource = `export function validateAge(age: number): boolean {
  if (age < 0) {
    return false;
  }
  return age >= 18;
}
`;
      const headSource = `export function validateAge(age: number): boolean {
  if (age < 0) {
    return true;
  }
  return age >= 18;
}
`;
      const baseTest = `import { validateAge } from "../src/validate.js";
describe("validateAge", () => {
  it("validates boundary age", () => {
    expect(validateAge(-1)).toBe(false);
  });
  it("validates adulthood", () => {
    expect(validateAge(20)).toBe(true);
  });
});
`;
      const headTest = `import { validateAge } from "../src/validate.js";
describe("validateAge", () => {
  it("validates boundary age", () => {
    expect(validateAge(-1)).toBe(true);
  });
  it("validates adulthood", () => {
    expect(validateAge(20)).toBe(true);
  });
});
`;
      repo.writeFile("src/validate.ts", baseSource);
      repo.writeFile("tests/validate.test.ts", baseTest);
      const baseSha = repo.commitAll("Commit A: boundary check negative age returns false");

      repo.writeFile("src/validate.ts", headSource);
      repo.writeFile("tests/validate.test.ts", headTest);
      const headSha = repo.commitAll("Commit B: modified negative age return true, aligned test assertion");

      return { repo, baseSha, headSha };
    }

    case "G": {
      // Scenario G: Unrelated Test Change
      const baseSource = `export function computeRatio(a: number, b: number): number {
  if (b === 0 && a === 0) {
    return 0;
  }
  return a / b;
}
`;
      const headSource = `export function computeRatio(a: number, b: number): number {
  if (b === 0 || a === 0) {
    return 0;
  }
  return a / b;
}
`;
      const baseTest = `import { computeRatio } from "../src/math.js";
describe("computeRatio", () => {
  it("divides numbers", () => {
    expect(computeRatio(10, 2)).toBe(5);
  });
});
describe("formatRatio", () => {
  it("formats percentage", () => {
    expect("50%").toBe("50%");
  });
});
`;
      const headTest = `import { computeRatio } from "../src/math.js";
describe("computeRatio", () => {
  it("divides numbers", () => {
    expect(computeRatio(10, 2)).toBe(5);
  });
});
describe("formatRatio", () => {
  it("formats percentage with decimals", () => {
    expect("50.0%").toBe("50.0%");
  });
});
`;
      repo.writeFile("src/math.ts", baseSource);
      repo.writeFile("tests/math.test.ts", baseTest);
      const baseSha = repo.commitAll("Commit A: initial math and ratio tests");

      repo.writeFile("src/math.ts", headSource);
      repo.writeFile("tests/math.test.ts", headTest);
      const headSha = repo.commitAll("Commit B: modify computeRatio operator and unrelated formatRatio test");

      return { repo, baseSha, headSha };
    }

    case "H": {
      // Scenario H: Missing Function
      const baseSource = `export function getUser(id: string): { id: string } {
  return { id };
}
`;
      const headSource = `export function findUserById(id: string): { id: string } {
  return { id };
}
`;
      repo.writeFile("src/user.ts", baseSource);
      const baseSha = repo.commitAll("Commit A: initial getUser");

      repo.writeFile("src/user.ts", headSource);
      const headSha = repo.commitAll("Commit B: renamed getUser to findUserById");

      return { repo, baseSha, headSha };
    }

    case "I": {
      // Scenario I: Syntax Error in Production Code
      const baseSource = `export function parseItem(input: string): string {
  return input.trim();
}
`;
      const headSource = `export function parseItem(input: string: string {
  return input.trim()
`;
      repo.writeFile("src/parser.ts", baseSource);
      const baseSha = repo.commitAll("Commit A: valid parseItem");

      repo.writeFile("src/parser.ts", headSource);
      const headSha = repo.commitAll("Commit B: malformed syntax in parseItem");

      return { repo, baseSha, headSha };
    }

    case "J": {
      // Scenario J: Ambiguous Function Name
      const baseSource = `export function processItem(x: string): string {
  return x.toUpperCase();
}

export class ItemHandler {
  processItem(x: string): string {
    return x.toLowerCase();
  }
}
`;
      const headSource = `export function processItem(x: string): string {
  return x.trim().toUpperCase();
}

export class ItemHandler {
  processItem(x: string): string {
    return x.trim().toLowerCase();
  }
}
`;
      repo.writeFile("src/items.ts", baseSource);
      const baseSha = repo.commitAll("Commit A: duplicate processItem declarations");

      repo.writeFile("src/items.ts", headSource);
      const headSha = repo.commitAll("Commit B: modified both processItem declarations");

      return { repo, baseSha, headSha };
    }

    case "K": {
      // Scenario K: Nested Function Boundary Isolation
      const baseSource = `export function transformList(items: number[]): number {
  if (items.length === 0) {
    return 0;
  }
  let count = 0;
  items.forEach((x) => {
    if (x < 0) {
      count++;
    }
  });
  return count;
}
`;
      const headSource = `export function transformList(items: number[]): number {
  if (items.length === 0) {
    return 0;
  }
  let count = 0;
  items.forEach((x) => {
    count++;
  });
  return count;
}
`;
      repo.writeFile("src/collection.ts", baseSource);
      const baseSha = repo.commitAll("Commit A: transformList with nested callback guard");

      repo.writeFile("src/collection.ts", headSource);
      const headSha = repo.commitAll("Commit B: removed inner guard inside callback only");

      return { repo, baseSha, headSha };
    }

    case "L": {
      // Scenario L: Missing or Malformed Test Input
      const baseSource = `export function verifyToken(token: string | null): boolean {
  if (!token) {
    throw new Error("Missing token");
  }
  return token.length > 5;
}
`;
      const headSource = `export function verifyToken(token: string | null): boolean {
  if (!token) {
    return false;
  }
  return token.length > 5;
}
`;
      const baseTest = `describe("token", () => {
  it("checks token", () => {
    expect(true).toBe(true);
  });
});
`;
      const headTest = `describe("token", () => {
  it( {
`;
      repo.writeFile("src/token.ts", baseSource);
      repo.writeFile("tests/malformed.test.ts", baseTest);
      const baseSha = repo.commitAll("Commit A: valid source and valid initial test");

      repo.writeFile("src/token.ts", headSource);
      repo.writeFile("tests/malformed.test.ts", headTest);
      const headSha = repo.commitAll("Commit B: valid production change, malformed test syntax");

      return { repo, baseSha, headSha };
    }
  }
}
