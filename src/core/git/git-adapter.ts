/**
 * Change Archaeologist - Git History Adapter (Unified Facade)
 *
 * Coordinates path safety, repository verification, revision resolution,
 * and historical source retrieval across base and head commits.
 */

import type { CommitInfo, RepositoryInfo, SourceSnapshot } from "../domain/types.js";
import { GitRunner } from "./git-runner.js";
import { normalizeRepoRelativePath } from "./path-normalizer.js";
import { resolveCommit, verifyRepository } from "./revision-resolver.js";
import { loadHistoricalSourceSnapshot } from "./source-loader.js";

export interface RetrieveHistoricalSourceOptions {
  readonly repoPath: string;
  readonly targetFilePath: string;
  readonly baseRevisionInput: string;
  readonly headRevisionInput: string;
  readonly runner?: GitRunner;
}

export interface TargetSourceRevisions {
  readonly repository: RepositoryInfo;
  readonly baseCommit: CommitInfo;
  readonly headCommit: CommitInfo;
  readonly baseSnapshot: SourceSnapshot | null;
  readonly headSnapshot: SourceSnapshot | null;
  readonly posixFilePath: string;
}

export class GitAdapter {
  readonly runner: GitRunner;

  constructor(runner?: GitRunner) {
    this.runner = runner ?? new GitRunner();
  }

  /**
   * Retrieves historical source snapshots for a file at two verified Git revisions.
   */
  async retrieveHistoricalSource(
    options: RetrieveHistoricalSourceOptions
  ): Promise<TargetSourceRevisions> {
    const runner = options.runner ?? this.runner;

    // 1. Validate and normalize the repository-relative file path
    const posixFilePath = normalizeRepoRelativePath(options.targetFilePath);

    // 2. Verify repository root and read-only status
    const repository = await verifyRepository(runner, options.repoPath);

    // 3. Resolve base and head revisions to immutable 40-character commit hashes
    const baseCommit = await resolveCommit(
      runner,
      repository.rootPath,
      options.baseRevisionInput,
      "BASE"
    );

    const headCommit = await resolveCommit(
      runner,
      repository.rootPath,
      options.headRevisionInput,
      "HEAD"
    );

    // 4. Retrieve historical source snapshots (null if file is absent in that commit)
    const baseSnapshot = await loadHistoricalSourceSnapshot(
      runner,
      repository.rootPath,
      posixFilePath,
      baseCommit
    );

    const headSnapshot = await loadHistoricalSourceSnapshot(
      runner,
      repository.rootPath,
      posixFilePath,
      headCommit
    );

    return {
      repository,
      baseCommit,
      headCommit,
      baseSnapshot,
      headSnapshot,
      posixFilePath,
    };
  }
}

/**
 * Functional entrypoint for retrieving historical source revisions.
 */
export async function retrieveHistoricalSource(
  options: RetrieveHistoricalSourceOptions
): Promise<TargetSourceRevisions> {
  const adapter = new GitAdapter(options.runner);
  return adapter.retrieveHistoricalSource(options);
}

