import { simpleGit, type SimpleGit } from 'simple-git';

/**
 * Git-aware file filtering utilities
 */

/**
 * Get files changed since a git reference (branch, commit, or ref like HEAD~3)
 */
export async function getChangedFiles(root: string, ref: string): Promise<string[]> {
  const git: SimpleGit = simpleGit(root);

  try {
    // Check if we're in a git repository
    const isRepo = await git.checkIsRepo();
    if (!isRepo) {
      throw new Error('Not a git repository');
    }

    // Get the diff between the ref and current HEAD
    // This shows all files that have been modified/added/deleted
    const diffResult = await git.diff(['--name-only', ref]);

    // Parse the result into an array of file paths
    const files = diffResult
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    return files;
  } catch (error) {
    if (error instanceof Error) {
      // Provide more helpful error messages
      if (error.message.includes('unknown revision')) {
        throw new Error(`Invalid git reference: ${ref}. Make sure the branch or commit exists.`);
      }
      if (error.message.includes('not a git repository')) {
        throw new Error('Not a git repository. The --diff flag requires a git repository.');
      }
    }
    throw error;
  }
}

/**
 * Get the N most recently committed files
 */
export async function getMostRecentFiles(root: string, count: number): Promise<string[]> {
  const git: SimpleGit = simpleGit(root);

  try {
    // Check if we're in a git repository
    const isRepo = await git.checkIsRepo();
    if (!isRepo) {
      throw new Error('Not a git repository');
    }

    // Get the log with file names
    // --diff-filter=AM filters to Added or Modified files (excludes deleted)
    const logResult = await git.raw([
      'log',
      '--name-only',
      '--pretty=format:',
      '--diff-filter=AM',
      '-n',
      String(count * 3), // Get more commits to ensure we have enough unique files
    ]);

    // Parse the result and get unique files, preserving order by recency
    const files: string[] = [];
    const seen = new Set<string>();

    for (const line of logResult.split('\n')) {
      const file = line.trim();
      if (file.length > 0 && !seen.has(file)) {
        seen.add(file);
        files.push(file);
        if (files.length >= count) {
          break;
        }
      }
    }

    return files;
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('not a git repository')) {
        throw new Error('Not a git repository. The --most-recent flag requires a git repository.');
      }
      // Handle empty repository with no commits
      if (error.message.includes('does not have any commits yet')) {
        return [];
      }
    }
    throw error;
  }
}

/**
 * Check if the current directory is a git repository
 */
export async function isGitRepository(root: string): Promise<boolean> {
  try {
    const git: SimpleGit = simpleGit(root);
    return await git.checkIsRepo();
  } catch {
    return false;
  }
}

/**
 * Get the current branch name
 */
export async function getCurrentBranch(root: string): Promise<string | undefined> {
  const git: SimpleGit = simpleGit(root);
  try {
    const branch = await git.revparse(['--abbrev-ref', 'HEAD']);
    return branch.trim();
  } catch {
    return undefined;
  }
}

/**
 * Get the short commit hash of HEAD
 */
export async function getHeadCommit(root: string): Promise<string | undefined> {
  const git: SimpleGit = simpleGit(root);
  try {
    const commit = await git.revparse(['--short', 'HEAD']);
    return commit.trim();
  } catch {
    return undefined;
  }
}
