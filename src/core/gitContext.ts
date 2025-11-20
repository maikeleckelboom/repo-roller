/**
 * @module core/gitContext
 *
 * Git context extraction utilities for filename generation
 *
 * OWNS:
 * - Detecting git repository
 * - Extracting git branch name
 * - Extracting git commit hash
 * - Extracting git tags
 *
 * DESIGN PRINCIPLES:
 * - Graceful fallback when not in a git repository
 * - No dependencies on git CLI (uses .git directory directly)
 * - Fast and synchronous operations
 */

import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { execSync } from 'node:child_process';

export interface GitContext {
  branch: string;
  shortHash: string;
  tag: string;
  isRepo: boolean;
}

/**
 * Find the git repository root starting from a given directory
 * @param startPath - Directory to start searching from
 * @returns Git root path or null if not found
 */
function findGitRoot(startPath: string): string | null {
  let currentPath = startPath;
  const root = '/';

  while (currentPath !== root) {
    const gitPath = join(currentPath, '.git');
    if (existsSync(gitPath)) {
      return currentPath;
    }
    currentPath = dirname(currentPath);
  }

  return null;
}

/**
 * Read git branch name from .git/HEAD
 * @param gitRoot - Git repository root path
 * @returns Branch name or empty string
 */
function readBranchName(gitRoot: string): string {
  try {
    const headPath = join(gitRoot, '.git', 'HEAD');
    if (!existsSync(headPath)) {
      return '';
    }

    const headContent = readFileSync(headPath, 'utf-8').trim();

    // Format: "ref: refs/heads/main"
    if (headContent.startsWith('ref: refs/heads/')) {
      return headContent.replace('ref: refs/heads/', '');
    }

    // Detached HEAD state - return first 8 chars of commit hash
    if (/^[0-9a-f]{40}$/i.test(headContent)) {
      return headContent.substring(0, 8);
    }

    return '';
  } catch {
    return '';
  }
}

/**
 * Get short commit hash (first 7 characters)
 * @param gitRoot - Git repository root path
 * @returns Short commit hash or empty string
 */
function readShortHash(gitRoot: string): string {
  try {
    // Try to read from .git/HEAD first
    const headPath = join(gitRoot, '.git', 'HEAD');
    if (!existsSync(headPath)) {
      return '';
    }

    const headContent = readFileSync(headPath, 'utf-8').trim();

    // If HEAD points to a ref, read that ref
    if (headContent.startsWith('ref: ')) {
      const refPath = join(gitRoot, '.git', headContent.substring(5));
      if (existsSync(refPath)) {
        const hash = readFileSync(refPath, 'utf-8').trim();
        return hash.substring(0, 7);
      }
    }

    // If detached HEAD, use the hash directly
    if (/^[0-9a-f]{40}$/i.test(headContent)) {
      return headContent.substring(0, 7);
    }

    // Fallback to git command if available
    const hash = execSync('git rev-parse --short HEAD', {
      cwd: gitRoot,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return hash.substring(0, 7);
  } catch {
    return '';
  }
}

/**
 * Get current git tag if HEAD points to a tag
 * @param gitRoot - Git repository root path
 * @returns Tag name or empty string
 */
function readCurrentTag(gitRoot: string): string {
  try {
    // Try to get tag pointing to current commit
    const tag = execSync('git describe --exact-match --tags HEAD 2>/dev/null || echo ""', {
      cwd: gitRoot,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return tag;
  } catch {
    return '';
  }
}

/**
 * Extract git context from a directory
 * @param path - Directory path to extract git context from
 * @returns Git context object with branch, hash, tag information
 */
export function getGitContext(path: string): GitContext {
  const gitRoot = findGitRoot(path);

  if (!gitRoot) {
    return {
      branch: '',
      shortHash: '',
      tag: '',
      isRepo: false,
    };
  }

  return {
    branch: readBranchName(gitRoot),
    shortHash: readShortHash(gitRoot),
    tag: readCurrentTag(gitRoot),
    isRepo: true,
  };
}

/**
 * Format git context for use in filename
 * @param context - Git context object
 * @param includeHash - Whether to include the commit hash
 * @returns Formatted string for filename (e.g., "main-a1b2c3d" or "main")
 */
export function formatGitContextForFilename(
  context: GitContext,
  includeHash = false
): string {
  if (!context.isRepo) {
    return '';
  }

  const parts: string[] = [];

  // Use tag if available, otherwise use branch
  if (context.tag) {
    parts.push(context.tag);
  } else if (context.branch) {
    parts.push(context.branch);
  }

  // Add hash if requested and available
  if (includeHash && context.shortHash) {
    parts.push(context.shortHash);
  }

  return parts.join('-');
}
