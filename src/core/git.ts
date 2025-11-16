import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { stat } from 'node:fs/promises';

/**
 * Check if a directory is a git repository
 */
export async function isGitRepository(root: string): Promise<boolean> {
  try {
    const gitDir = join(root, '.git');
    const stats = await stat(gitDir);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Get files changed since a specific commit
 * Returns relative paths from the repository root
 */
export function getFilesSince(root: string, since: string): string[] {
  try {
    const result = execSync(`git diff --name-only ${since}`, {
      cwd: root,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    return result
      .trim()
      .split('\n')
      .filter(line => line.length > 0);
  } catch {
    return [];
  }
}

/**
 * Get files that are currently staged (in the index)
 * Returns relative paths from the repository root
 */
export function getStagedFiles(root: string): string[] {
  try {
    const result = execSync('git diff --cached --name-only', {
      cwd: root,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    return result
      .trim()
      .split('\n')
      .filter(line => line.length > 0);
  } catch {
    return [];
  }
}

/**
 * Get files that are modified but not staged (working tree changes)
 * Returns relative paths from the repository root
 */
export function getUnstagedFiles(root: string): string[] {
  try {
    const result = execSync('git diff --name-only', {
      cwd: root,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    return result
      .trim()
      .split('\n')
      .filter(line => line.length > 0);
  } catch {
    return [];
  }
}

/**
 * Get all modified files (both staged and unstaged)
 * Returns relative paths from the repository root
 */
export function getChangedFiles(root: string): string[] {
  try {
    // Get both staged and unstaged changes
    const staged = getStagedFiles(root);
    const unstaged = getUnstagedFiles(root);

    // Combine and deduplicate
    const allChanges = new Set([...staged, ...unstaged]);
    return Array.from(allChanges);
  } catch {
    return [];
  }
}

/**
 * Get the current branch name
 */
export function getCurrentBranch(root: string): string | undefined {
  try {
    const result = execSync('git branch --show-current', {
      cwd: root,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return result.trim() || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Validate that a commit reference exists
 */
export function isValidCommitRef(root: string, ref: string): boolean {
  try {
    execSync(`git rev-parse --verify ${ref}`, {
      cwd: root,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get commit info summary (for display purposes)
 */
export function getCommitInfo(root: string, ref: string): string | undefined {
  try {
    const result = execSync(`git log --oneline -1 ${ref}`, {
      cwd: root,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return result.trim();
  } catch {
    return undefined;
  }
}
