/**
 * Test Helper: Disposable Temporary Git Repository Harness
 *
 * Creates synthetic, isolated Git repositories for integration tests in os.tmpdir().
 * Ensures complete cleanup without touching the user's workspace.
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export class TempGitRepo {
  readonly dir: string;

  private constructor(dir: string) {
    this.dir = dir;
  }

  static create(): TempGitRepo {
    const tmpBase = os.tmpdir();
    const rawDir = fs.mkdtempSync(path.join(tmpBase, "ca-test-repo-"));
    const dir = fs.realpathSync.native(rawDir);
    const repo = new TempGitRepo(dir);
    repo.init();
    return repo;
  }

  runGit(args: string[]): string {
    return execFileSync("git", args, {
      cwd: this.dir,
      shell: false,
      encoding: "utf8",
      env: {
        ...process.env,
        GIT_TERMINAL_PROMPT: "0",
        GIT_OPTIONAL_LOCKS: "0",
      },
    }).trim();
  }

  private init(): void {
    this.runGit(["init"]);
    this.runGit(["config", "user.name", "Test Archaeologist"]);
    this.runGit(["config", "user.email", "test@archaeologist.local"]);
    this.runGit(["config", "commit.gpgSign", "false"]);
    this.runGit(["config", "core.autocrlf", "false"]);
  }

  writeFile(relPath: string, content: string): void {
    const fullPath = path.join(this.dir, relPath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content, "utf8");
  }

  commitFile(relPath: string, content: string, message: string): string {
    this.writeFile(relPath, content);
    this.runGit(["add", relPath]);
    this.runGit(["commit", "-m", message]);
    return this.getHeadSha();
  }

  commitAll(message: string): string {
    this.runGit(["add", "-A"]);
    this.runGit(["commit", "-m", message]);
    return this.getHeadSha();
  }

  removeFileAndCommit(relPath: string, message: string): string {
    this.runGit(["rm", relPath]);
    this.runGit(["commit", "-m", message]);
    return this.getHeadSha();
  }

  getHeadSha(): string {
    return this.runGit(["rev-parse", "HEAD"]);
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
