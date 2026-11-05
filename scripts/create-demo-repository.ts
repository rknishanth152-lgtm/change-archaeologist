/**
 * Change Archaeologist - Synthetic Demonstration Repository Generator
 *
 * Deterministically constructs an isolated Git repository populated with
 * realistic code evolution scenarios (Scenarios A through F).
 *
 * Invariants:
 * - Operates strictly in the target directory (never touches user's workspace).
 * - Fixed author, committer, and timestamps for deterministic commit generation.
 * - Creates standard Git tags 'base' and 'head' for reliable, human-readable revision references.
 * - Cross-platform compatible (Windows and Ubuntu).
 * - Zero network dependencies.
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export interface DemoRepoCreationResult {
  readonly repoDir: string;
  readonly baseCommitSha: string;
  readonly headCommitSha: string;
  readonly baseTag: string;
  readonly headTag: string;
}

export interface DemoRepoOptions {
  readonly targetDir?: string;
  readonly cleanExisting?: boolean;
}

const FIXED_AUTHOR_DATE_BASE = "2026-01-01T12:00:00Z";
const FIXED_COMMITTER_DATE_BASE = "2026-01-01T12:00:00Z";

const FIXED_AUTHOR_DATE_HEAD = "2026-01-02T12:00:00Z";
const FIXED_COMMITTER_DATE_HEAD = "2026-01-02T12:00:00Z";

export class DemoRepositoryBuilder {
  readonly dir: string;

  constructor(targetDir?: string, cleanExisting = true) {
    if (targetDir) {
      this.dir = path.resolve(targetDir);
      if (cleanExisting && fs.existsSync(this.dir)) {
        fs.rmSync(this.dir, { recursive: true, force: true });
      }
    } else {
      const tmpBase = os.tmpdir();
      const rawDir = fs.mkdtempSync(path.join(tmpBase, "ca-demo-repo-"));
      this.dir = fs.realpathSync.native(rawDir);
    }
  }

  private runGit(args: readonly string[], envOverrides: Record<string, string> = {}): string {
    return execFileSync("git", args, {
      cwd: this.dir,
      shell: false,
      encoding: "utf8",
      env: {
        ...process.env,
        GIT_TERMINAL_PROMPT: "0",
        GIT_OPTIONAL_LOCKS: "0",
        ...envOverrides,
      },
    }).trim();
  }

  private writeFile(relPath: string, content: string): void {
    const fullPath = path.join(this.dir, relPath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content, "utf8");
  }

  build(): DemoRepoCreationResult {
    fs.mkdirSync(this.dir, { recursive: true });

    // 1. Initialize Git repository with safe defaults
    this.runGit(["init"]);
    this.runGit(["config", "user.name", "Archaeologist Demo"]);
    this.runGit(["config", "user.email", "demo@change-archaeologist.local"]);
    this.runGit(["config", "commit.gpgSign", "false"]);
    this.runGit(["config", "core.autocrlf", "false"]);

    // ------------------------------------------------------------------------
    // BASE COMMIT (v1.0.0)
    // ------------------------------------------------------------------------

    // Scenario A: Guard Clause Removal (src/auth.ts)
    this.writeFile(
      "src/auth.ts",
      `export function processPayment(payment: { valid: boolean; amount: number }): boolean {
  if (!payment.valid) {
    throw new Error("Invalid payment: validation failed");
  }
  return payment.amount > 0;
}
`
    );

    // Scenario B: Conditional Modification (src/access.ts)
    this.writeFile(
      "src/access.ts",
      `export function authorizeUser(user: { isAdmin: boolean; isOwner: boolean }): boolean {
  if (user.isAdmin && user.isOwner) {
    return true;
  }
  return false;
}
`
    );

    // Scenario C: Throw-to-Return Conversion (src/config.ts)
    this.writeFile(
      "src/config.ts",
      `export function loadConfig(raw: string | null): Record<string, unknown> {
  if (!raw) {
    throw new Error("Missing configuration payload");
  }
  return JSON.parse(raw);
}
`
    );

    // Scenario D & E: Order Calculation (src/order.ts)
    this.writeFile(
      "src/order.ts",
      `export function calculateDiscount(price: number): number {
  if (price <= 0) {
    return 0;
  }
  return price * 0.10;
}
`
    );

    // Scenario D & E: Companion Test (tests/order.test.ts)
    this.writeFile(
      "tests/order.test.ts",
      `import { calculateDiscount } from "../src/order.js";

describe("order calculation", () => {
  it("calculates regular discount", () => {
    expect(calculateDiscount(100)).toBe(10);
  });
});
`
    );

    // Scenario F: Legacy Helper present in BASE (src/legacy.ts)
    this.writeFile(
      "src/legacy.ts",
      `export function deprecatedHelper(val: string): string {
  return val.trim().toLowerCase();
}
`
    );

    this.runGit(["add", "-A"]);
    this.runGit(["commit", "-m", "Release v1.0.0: Initial implementation"], {
      GIT_AUTHOR_DATE: FIXED_AUTHOR_DATE_BASE,
      GIT_COMMITTER_DATE: FIXED_COMMITTER_DATE_BASE,
    });

    const baseCommitSha = this.runGit(["rev-parse", "HEAD"]);
    this.runGit(["tag", "base", baseCommitSha]);

    // ------------------------------------------------------------------------
    // HEAD COMMIT (v1.1.0)
    // ------------------------------------------------------------------------

    // Scenario A: Guard removed in HEAD
    this.writeFile(
      "src/auth.ts",
      `export function processPayment(payment: { valid: boolean; amount: number }): boolean {
  return payment.amount > 0;
}
`
    );

    // Scenario B: Logical operator && mutated to ||
    this.writeFile(
      "src/access.ts",
      `export function authorizeUser(user: { isAdmin: boolean; isOwner: boolean }): boolean {
  if (user.isAdmin || user.isOwner) {
    return true;
  }
  return false;
}
`
    );

    // Scenario C: Throw replaced with empty object return
    this.writeFile(
      "src/config.ts",
      `export function loadConfig(raw: string | null): Record<string, unknown> {
  if (!raw) {
    return {};
  }
  return JSON.parse(raw);
}
`
    );

    // Scenario D & E: Discount rate updated from 10% to 15%
    this.writeFile(
      "src/order.ts",
      `export function calculateDiscount(price: number): number {
  if (price <= 0) {
    return 0;
  }
  return price * 0.15;
}
`
    );

    // Scenario D & E: Assertion updated from 10 to 15
    this.writeFile(
      "tests/order.test.ts",
      `import { calculateDiscount } from "../src/order.js";

describe("order calculation", () => {
  it("calculates regular discount", () => {
    expect(calculateDiscount(100)).toBe(15);
  });
});
`
    );

    // Scenario F: deprecatedHelper removed from src/legacy.ts
    this.writeFile(
      "src/legacy.ts",
      `// deprecatedHelper was removed in v1.1.0
export const LEGACY_VERSION = "0.0.1";
`
    );

    this.runGit(["add", "-A"]);
    this.runGit(["commit", "-m", "Release v1.1.0: Feature updates and refactoring"], {
      GIT_AUTHOR_DATE: FIXED_AUTHOR_DATE_HEAD,
      GIT_COMMITTER_DATE: FIXED_COMMITTER_DATE_HEAD,
    });

    const headCommitSha = this.runGit(["rev-parse", "HEAD"]);
    this.runGit(["tag", "head", headCommitSha]);

    return {
      repoDir: this.dir,
      baseCommitSha,
      headCommitSha,
      baseTag: "base",
      headTag: "head",
    };
  }

  cleanup(): void {
    try {
      if (fs.existsSync(this.dir)) {
        fs.rmSync(this.dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
      }
    } catch {
      // Ignore cleanup error if already removed
    }
  }
}

/**
 * Functional entrypoint to generate a demo repository.
 */
export function createDemoRepository(options: DemoRepoOptions = {}): DemoRepoCreationResult {
  const builder = new DemoRepositoryBuilder(options.targetDir, options.cleanExisting);
  return builder.build();
}

// CLI entry point when run directly: `node scripts/create-demo-repository.ts [targetDirectory]`
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/i, "$1"))) {
  const targetDir = process.argv[2] || path.resolve("examples/demo-repository");
  console.log(`Generating synthetic demonstration repository in: ${targetDir}`);
  const result = createDemoRepository({ targetDir, cleanExisting: true });
  console.log(`Demo repository created successfully.`);
  console.log(`  Path: ${result.repoDir}`);
  console.log(`  Base: ${result.baseTag} (${result.baseCommitSha.slice(0, 8)})`);
  console.log(`  Head: ${result.headTag} (${result.headCommitSha.slice(0, 8)})`);
}

