/**
 * @module core/scan
 *
 * File system scanner for discovering and filtering repository files.
 *
 * OWNS:
 * - Walking the file tree using fast-glob
 * - Applying .gitignore rules (respects project boundaries)
 * - Filtering by size, extension, and glob patterns
 * - Binary file detection (samples first 8KB)
 * - Building FileInfo metadata for each discovered file
 *
 * DOES NOT OWN:
 * - Reading file contents (files are loaded lazily by render.ts)
 * - Token counting (that's tokens.ts)
 * - Output rendering (that's render.ts)
 * - Configuration resolution (that's config.ts)
 *
 * TYPICAL USAGE:
 * ```typescript
 * import { scanFiles } from './scan.js';
 * import { resolveOptions } from './config.js';
 *
 * const options = await resolveOptions(cliOptions);
 * const result = await scanFiles(options);
 * // result.files is FileInfo[] ready for rendering
 * ```
 *
 * PERFORMANCE NOTES:
 * - Uses fast-glob for efficient pattern matching
 * - Filters early (gitignore first, then patterns, then size)
 * - Does not load file contents during scan (metadata only)
 * - Handles repos with 10,000+ files efficiently
 */

import { readFile, stat } from 'node:fs/promises';
import { join, extname, resolve } from 'node:path';
import fg from 'fast-glob';
import ignorePackage from 'ignore';
import { minimatch } from 'minimatch';
import type { FileInfo, ResolvedOptions, ScanResult } from './types.js';
import { normalizeExtension } from './helpers.js';
import { getChangedFiles, getMostRecentFiles } from './git.js';

// Type workaround for CommonJS default export
const createIgnore = ignorePackage as unknown as () => {
  add(patterns: string | string[]): void;
  ignores(pathname: string): boolean;
};

type Ignore = ReturnType<typeof createIgnore>;

/**
 * Constants for binary file detection
 */
const BINARY_DETECTION = {
  /** Maximum bytes to sample for binary detection */
  SAMPLE_SIZE: 8000,
  /** Threshold ratio of non-text bytes to consider file binary */
  NON_TEXT_THRESHOLD: 0.3,
} as const;

/**
 * Check if a file is likely binary based on content sampling
 */
async function isBinaryFile(path: string): Promise<boolean> {
  try {
    const buffer = await readFile(path);
    const sampleSize = Math.min(BINARY_DETECTION.SAMPLE_SIZE, buffer.length);

    // Count null bytes and non-text characters
    let nullBytes = 0;
    let nonTextBytes = 0;

    for (let i = 0; i < sampleSize; i++) {
      const byte = buffer[i];
      if (byte === 0) {
        nullBytes++;
      }
      if (byte !== undefined && byte < 32 && byte !== 9 && byte !== 10 && byte !== 13) {
        nonTextBytes++;
      }
    }

    // If we find null bytes or too many non-text bytes, it's likely binary
    return nullBytes > 0 || nonTextBytes / sampleSize > BINARY_DETECTION.NON_TEXT_THRESHOLD;
  } catch {
    return true; // If we can't read it, assume binary
  }
}

/**
 * Default blacklist of common dev artifacts that should always be ignored
 */
const DEFAULT_IGNORE_PATTERNS = [
  // Version control
  '.git',

  // Dependencies
  'node_modules',

  // Lock files
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'bun.lockb',
  'composer.lock',
  'Gemfile.lock',
  'poetry.lock',
  'Cargo.lock',
  'go.sum',
  'Pipfile.lock',

  // Build outputs
  'dist',
  'build',
  'out',
  '.next',
  '.nuxt',
  '.output',
  '.vercel',
  '.netlify',

  // Cache directories
  '.cache',
  '.parcel-cache',
  '.turbo',
  '.swc',
  '.webpack',
  '.vite',

  // Coverage and test outputs
  'coverage',
  '.nyc_output',
  '.jest',

  // Environment files
  '.env',
  '.env.local',
  '.env.*.local',

  // IDE/Editor files
  '.vscode',
  '.idea',
  '*.swp',
  '*.swo',
  '*~',
  '.DS_Store',

  // Logs
  '*.log',
  'logs',
  'npm-debug.log*',
  'yarn-debug.log*',
  'yarn-error.log*',

  // Temporary files
  '*.tmp',
  'tmp',
  'temp',

  // System files
  'Thumbs.db',
  'desktop.ini',
];

/**
 * Load .gitignore patterns from a directory
 */
async function loadGitignore(dir: string): Promise<Ignore> {
  const ig = createIgnore();

  // Add default blacklist patterns first
  ig.add(DEFAULT_IGNORE_PATTERNS);

  try {
    const gitignorePath = join(dir, '.gitignore');
    const content = await readFile(gitignorePath, 'utf-8');
    ig.add(content);
  } catch {
    // No .gitignore file, that's okay
  }

  return ig;
}

/**
 * Check if file matches extension filter
 */
function matchesExtension(filePath: string, extensions: readonly string[]): boolean {
  if (extensions.length === 0) {return true;}

  const ext = normalizeExtension(extname(filePath));
  return extensions.includes(ext);
}

/**
 * Sort files according to the specified mode
 */
function sortFiles(files: FileInfo[], mode: 'path' | 'size' | 'extension'): FileInfo[] {
  const sorted = [...files];

  switch (mode) {
    case 'path':
      sorted.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
      break;
    case 'size':
      sorted.sort((a, b) => b.sizeBytes - a.sizeBytes);
      break;
    case 'extension':
      sorted.sort((a, b) => {
        const extCompare = a.extension.localeCompare(b.extension);
        if (extCompare !== 0) {return extCompare;}
        return a.relativePath.localeCompare(b.relativePath);
      });
      break;
  }

  return sorted;
}

/**
 * Sort files according to profile layout patterns
 */
function sortByLayout(files: FileInfo[], layout: readonly string[]): FileInfo[] {
  // Create a map of file paths to their priority based on layout order
  const priorityMap = new Map<string, number>();

  for (const file of files) {
    let minPriority = layout.length; // Default to end if no match

    for (let i = 0; i < layout.length; i++) {
      const pattern = layout[i];
      if (pattern && minimatch(file.relativePath, pattern)) {
        minPriority = Math.min(minPriority, i);
      }
    }

    priorityMap.set(file.relativePath, minPriority);
  }

  // Sort by priority, then by path for files with same priority
  return [...files].sort((a, b) => {
    const priorityA = priorityMap.get(a.relativePath) ?? layout.length;
    const priorityB = priorityMap.get(b.relativePath) ?? layout.length;

    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }

    return a.relativePath.localeCompare(b.relativePath);
  });
}

/**
 * Scan files in the directory respecting .gitignore and filters
 */
export async function scanFiles(options: ResolvedOptions): Promise<ScanResult> {
  const { root, include, exclude, extensions, maxFileSizeBytes, sort: sortMode, interactive, gitDiff, gitMostRecent } = options;

  // Load gitignore patterns
  const ig = await loadGitignore(root);

  // Get git-filtered files if applicable
  let gitFilteredFiles: Set<string> | undefined;

  if (gitDiff) {
    const changedFiles = await getChangedFiles(root, gitDiff);
    gitFilteredFiles = new Set(changedFiles);
  } else if (gitMostRecent !== undefined && gitMostRecent > 0) {
    const recentFiles = await getMostRecentFiles(root, gitMostRecent);
    gitFilteredFiles = new Set(recentFiles);
  }

  // Build glob patterns
  const patterns = include.length > 0 ? [...include] : ['**/*'];

  // Find all files - fast-glob doesn't natively support .gitignore, so we:
  // 1. Use explicit ignore patterns to avoid traversing common ignored directories
  // 2. Then filter results through the ignore package for .gitignore patterns
  // In interactive mode, we don't pass exclude patterns to fast-glob so all files are found
  const allPaths = await fg(patterns, {
    cwd: root,
    ignore: [
      // In interactive mode, only ignore .git and node_modules (always blacklisted)
      // In non-interactive mode, also apply user exclude patterns
      ...(interactive ? [] : exclude),
      '**/.git/**',
      '**/.git',
      '**/node_modules/**',
      '**/node_modules',
    ],
    absolute: false,
    dot: true,
    onlyFiles: true,
  });

  // Process each file
  const fileInfos: FileInfo[] = [];
  const extensionCounts: Record<string, number> = {};

  for (const relativePath of allPaths) {
    const absolutePath = resolve(root, relativePath);

    // Apply git filter if set (skip files not in git filter)
    if (gitFilteredFiles && !gitFilteredFiles.has(relativePath)) {
      continue;
    }

    // Get file stats
    let stats;
    try {
      stats = await stat(absolutePath);
    } catch {
      continue; // Skip files we can't stat
    }

    // Check if binary
    const isBinary = await isBinaryFile(absolutePath);

    // Determine if file should be included by default
    const isIgnored = ig.ignores(relativePath);
    const isExcluded = exclude.some(pattern => minimatch(relativePath, pattern));
    const isSizeExceeded = stats.size > maxFileSizeBytes;
    const isExtensionFiltered = !matchesExtension(relativePath, extensions);
    const isDefaultIncluded = !isIgnored && !isExcluded && !isSizeExceeded && !isExtensionFiltered && !isBinary;

    // In interactive mode, include all files; in non-interactive mode, only include default files
    if (!interactive && !isDefaultIncluded) {
      continue;
    }

    const ext = normalizeExtension(extname(relativePath));

    fileInfos.push({
      absolutePath,
      relativePath,
      sizeBytes: stats.size,
      extension: ext,
      isBinary,
      isDefaultIncluded,
    });

    // Count extensions only for default included files
    if (isDefaultIncluded) {
      extensionCounts[ext] = (extensionCounts[ext] ?? 0) + 1;
    }
  }

  // Sort files - use profile layout if available, otherwise use sort mode
  let sortedFiles: FileInfo[];
  const activeProfile = options.profile || 'llm-context';
  const profileLayout = options.repoRollerConfig?.profiles?.[activeProfile]?.layout;

  if (profileLayout && profileLayout.length > 0) {
    sortedFiles = sortByLayout(fileInfos, profileLayout);
  } else {
    sortedFiles = sortFiles(fileInfos, sortMode);
  }

  // Calculate total size (only for default included files)
  const totalBytes = sortedFiles
    .filter(file => file.isDefaultIncluded)
    .reduce((sum, file) => sum + file.sizeBytes, 0);

  return {
    files: sortedFiles,
    totalBytes,
    rootPath: root,
    extensionCounts,
  };
}
