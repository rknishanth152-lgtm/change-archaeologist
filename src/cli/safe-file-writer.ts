/**
 * Change Archaeologist - Safe Report File Writer
 *
 * Implements safe, atomic file writing with destination validation, .git protection,
 * overwrite prevention, and temporary-file-and-rename semantics.
 */

import fs from "node:fs";
import path from "node:path";

export interface SafeWriteOptions {
  readonly outputPath: string;
  readonly content: string;
  readonly force: boolean;
  readonly cwd?: string;
  readonly forbiddenPaths?: readonly string[];
}

export type SafeWriteResult =
  | { readonly success: true; readonly resolvedPath: string }
  | { readonly success: false; readonly error: string };

/**
 * Safely writes a report to disk:
 * 1. Resolves path against cwd.
 * 2. Blocks writing into any .git internal directory.
 * 3. Blocks writing over source or test files.
 * 4. Rejects overwriting existing files unless force is true.
 * 5. Creates parent directories if needed.
 * 6. Performs atomic write via temporary file and rename.
 */
export function safeWriteReportFile(options: SafeWriteOptions): SafeWriteResult {
  const { outputPath, content, force, cwd = process.cwd(), forbiddenPaths = [] } = options;

  try {
    const resolvedPath = path.isAbsolute(outputPath)
      ? path.normalize(outputPath)
      : path.resolve(cwd, outputPath);

    // 1. Guard against writing into internal .git directory (case-insensitive, cross-platform)
    const normalizedSegments = path.normalize(resolvedPath).split(/[\\/]/);
    if (normalizedSegments.some((s) => s.toLowerCase() === ".git")) {
      return {
        success: false,
        error: `Output destination '${resolvedPath}' resolves inside a '.git' directory, which is prohibited for repository integrity.`,
      };
    }

    // 2. Guard against overwriting specified forbidden source/test paths
    for (const forbidden of forbiddenPaths) {
      const normalizedForbidden = path.normalize(forbidden);
      if (resolvedPath.toLowerCase() === normalizedForbidden.toLowerCase()) {
        return {
          success: false,
          error: `Output destination '${resolvedPath}' matches a protected source or test file. Overwriting code files is forbidden.`,
        };
      }
    }

    // 3. Check existing file overwrite permissions
    if (fs.existsSync(resolvedPath)) {
      if (!force) {
        return {
          success: false,
          error: `Output file '${resolvedPath}' already exists. Specify '--force' to overwrite existing reports.`,
        };
      }
      // If force is true, verify the target is a regular file, not a directory
      const stat = fs.statSync(resolvedPath);
      if (stat.isDirectory()) {
        return {
          success: false,
          error: `Output destination '${resolvedPath}' is a directory, not a file.`,
        };
      }
    }

    // 4. Create parent directory if necessary
    const parentDir = path.dirname(resolvedPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    // 5. Atomic write via temporary file
    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const tempFilePath = path.join(parentDir, `.${path.basename(resolvedPath)}.tmp.${uniqueSuffix}`);

    try {
      fs.writeFileSync(tempFilePath, content, "utf8");
      // On Windows, renameSync over an existing file may fail with EPERM/EEXIST if not unlinked first
      if (force && fs.existsSync(resolvedPath)) {
        try {
          fs.unlinkSync(resolvedPath);
        } catch {
          // Ignore and let rename handle or fail
        }
      }
      fs.renameSync(tempFilePath, resolvedPath);
    } catch (writeErr: unknown) {
      if (fs.existsSync(tempFilePath)) {
        try {
          fs.unlinkSync(tempFilePath);
        } catch {
          // Best effort cleanup
        }
      }
      const msg = writeErr instanceof Error ? writeErr.message : String(writeErr);
      return {
        success: false,
        error: `Failed to write output file to '${resolvedPath}': ${msg}`,
      };
    }

    return { success: true, resolvedPath };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: `Filesystem error resolving destination '${outputPath}': ${msg}`,
    };
  }
}

