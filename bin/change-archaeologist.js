#!/usr/bin/env node

/**
 * Change Archaeologist - Executable Launcher
 */

import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const distEntry = resolve(__dirname, "../dist/src/cli/index.js");

if (existsSync(distEntry)) {
  const { runCli } = await import(pathToFileURL(distEntry).href);
  const code = await runCli(process.argv.slice(2));
  process.exitCode = code;
} else {
  const { spawn } = await import("node:child_process");
  const viteNodeMjs = resolve(__dirname, "../node_modules/vite-node/vite-node.mjs");
  const cliTs = resolve(__dirname, "../src/cli/index.ts");
  const child = spawn(process.execPath, [viteNodeMjs, "--script", cliTs, ...process.argv.slice(2)], {
    stdio: "inherit",
  });
  child.on("exit", (code) => {
    process.exitCode = code ?? 1;
  });
}
