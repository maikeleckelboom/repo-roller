import { readFile, stat } from 'node:fs/promises';
import { join, relative, extname, resolve } from 'node:path';
import fg from 'fast-glob';
import ignorePackage from 'ignore';
import type { FileInfo, ResolvedOptions, ScanResult } from './types.js';

// Type workaround for CommonJS default export
const createIgnore = ignorePackage as unknown as () => {
  add(patterns: string | string[]): void;
  ignores(pathname: string): boolean;
};

type Ignore = ReturnType<typeof createIgnore>;

/**
 * Check if a file is likely binary based on content sampling
 */
async function isBinaryFile(path: string): Promise<boolean> {
  try {
    const buffer = await readFile(path);
    const sampleSize = Math.min(8000, buffer.length);

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
    return nullBytes > 0 || nonTextBytes / sampleSize > 0.3;
  } catch {
    return true; // If we can't read it, assume binary
  }
}

/**
 * Load .gitignore patterns from a directory
 */
async function loadGitignore(dir: string): Promise<Ignore> {
  const ig = createIgnore();

  try {
    const gitignorePath = join(dir, '.gitignore');
    const content = await readFile(gitignorePath, 'utf-8');
    ig.add(content);
  } catch {
    // No .gitignore file, that's okay
  }

  // Always ignore .git directory
  ig.add('.git');
  ig.add('node_modules');

  return ig;
}

/**
 * Normalize extension by removing leading dot
 */
function normalizeExtension(ext: string): string {
  return ext.startsWith('.') ? ext.slice(1) : ext;
}

/**
 * Check if file matches extension filter
 */
function matchesExtension(filePath: string, extensions: readonly string[]): boolean {
  if (extensions.length === 0) return true;

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
        if (extCompare !== 0) return extCompare;
        return a.relativePath.localeCompare(b.relativePath);
      });
      break;
  }

  return sorted;
}

/**
 * Scan files in the directory respecting .gitignore and filters
 */
export async function scanFiles(options: ResolvedOptions): Promise<ScanResult> {
  const { root, include, exclude, extensions, maxFileSizeBytes, sort: sortMode } = options;

  // Load gitignore patterns
  const ig = await loadGitignore(root);

  // Build glob patterns
  const patterns = include.length > 0 ? [...include] : ['**/*'];

  // Find all files
  const allPaths = await fg(patterns, {
    cwd: root,
    ignore: [...exclude, '**/.git/**', '**/node_modules/**'],
    absolute: false,
    dot: true,
    onlyFiles: true,
  });

  // Filter through gitignore
  const allowedPaths = allPaths.filter((path: string) => !ig.ignores(path));

  // Process each file
  const fileInfos: FileInfo[] = [];
  const extensionCounts: Record<string, number> = {};

  for (const relativePath of allowedPaths) {
    const absolutePath = resolve(root, relativePath);

    // Get file stats
    let stats;
    try {
      stats = await stat(absolutePath);
    } catch {
      continue; // Skip files we can't stat
    }

    // Check size limit
    if (stats.size > maxFileSizeBytes) {
      continue;
    }

    // Check extension filter
    if (!matchesExtension(relativePath, extensions)) {
      continue;
    }

    // Check if binary
    const isBinary = await isBinaryFile(absolutePath);
    if (isBinary) {
      continue;
    }

    const ext = normalizeExtension(extname(relativePath));

    fileInfos.push({
      absolutePath,
      relativePath,
      sizeBytes: stats.size,
      extension: ext,
      isBinary,
    });

    // Count extensions
    extensionCounts[ext] = (extensionCounts[ext] ?? 0) + 1;
  }

  // Sort files
  const sortedFiles = sortFiles(fileInfos, sortMode);

  // Calculate total size
  const totalBytes = sortedFiles.reduce((sum, file) => sum + file.sizeBytes, 0);

  return {
    files: sortedFiles,
    totalBytes,
    rootPath: root,
    extensionCounts,
  };
}
