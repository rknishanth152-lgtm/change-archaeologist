#!/usr/bin/env node

/**
 * Change Archaeologist - CLI Entry Point
 */

import { pathToFileURL } from "node:url";
import { runCli } from "./orchestrator.js";

export * from "./types.js";
export * from "./args.js";
export * from "./safe-file-writer.js";
export * from "./orchestrator.js";

/**
 * Entry function when executed from the command line.
 */
export async function main(): Promise<void> {
  const exitCode = await runCli(process.argv.slice(2));
  process.exitCode = exitCode;
}

// Auto-run only if executed directly as the process entrypoint
const entryFileUrl = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";
if (import.meta.url === entryFileUrl) {
  main().catch((err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`Fatal error: ${msg}\n`);
    process.exitCode = 4;
  });
}
