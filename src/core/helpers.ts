/**
 * @module core/helpers
 *
 * Pure utility functions with no side effects.
 *
 * OWNS:
 * - Byte formatting (formatBytes)
 * - Extension normalization
 * - Language detection from file extensions
 * - File role classification (code, test, config, docs)
 * - Directory size analysis
 *
 * DOES NOT OWN:
 * - File I/O operations
 * - Token counting (that's tokens.ts)
 * - Configuration logic
 *
 * DESIGN PRINCIPLES:
 * - Pure functions only (no side effects)
 * - No async operations
 * - No file system access
 * - Easily testable
 *
 * TYPICAL USAGE:
 * ```typescript
 * import { formatBytes, getLanguageFromExtension, getFileRole } from './helpers.js';
 *
 * formatBytes(1024);           // '1.00 KB'
 * getLanguageFromExtension('ts');  // 'TypeScript'
 * getFileRole('src/app.test.ts');  // 'test'
 * ```
 */

import { relative } from 'node:path';

export function formatBytes(bytes: number): string {
  if (bytes === 0) {return '0 B';}
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

export function normalizeExtension(ext: string): string {
  return ext.startsWith('.') ? ext.slice(1) : ext;
}

const EXTENSION_LANGUAGE_MAP: Record<string, string> = {
  ts: 'TypeScript',
  tsx: 'TypeScript',
  js: 'JavaScript',
  jsx: 'JavaScript',
  mjs: 'JavaScript',
  cjs: 'JavaScript',
  py: 'Python',
  rb: 'Ruby',
  go: 'Go',
  rs: 'Rust',
  java: 'Java',
  kt: 'Kotlin',
  swift: 'Swift',
  c: 'C',
  cpp: 'C++',
  cc: 'C++',
  cxx: 'C++',
  h: 'C/C++',
  hpp: 'C++',
  cs: 'C#',
  php: 'PHP',
  scala: 'Scala',
  md: 'Markdown',
  mdx: 'Markdown',
  json: 'JSON',
  yaml: 'YAML',
  yml: 'YAML',
  toml: 'TOML',
  xml: 'XML',
  html: 'HTML',
  css: 'CSS',
  scss: 'SCSS',
  sass: 'Sass',
  less: 'Less',
  sql: 'SQL',
  sh: 'Shell',
  bash: 'Shell',
  zsh: 'Shell',
  fish: 'Shell',
  ps1: 'PowerShell',
  dockerfile: 'Docker',
  vue: 'Vue',
  svelte: 'Svelte',
};

export function extensionToLanguage(ext: string): string {
  return EXTENSION_LANGUAGE_MAP[ext.toLowerCase()] ?? ext.toUpperCase();
}

export type FileRole = 'source' | 'test' | 'docs' | 'config';

export function categorizeFileRole(relativePath: string, ext: string): FileRole {
  const pathLower = relativePath.toLowerCase();
  const extLower = ext.toLowerCase();

  if (
    pathLower.includes('test') ||
    pathLower.includes('spec') ||
    pathLower.includes('__tests__') ||
    pathLower.endsWith('.test.ts') ||
    pathLower.endsWith('.test.js') ||
    pathLower.endsWith('.spec.ts') ||
    pathLower.endsWith('.spec.js') ||
    pathLower.endsWith('_test.go') ||
    pathLower.endsWith('_test.py')
  ) {
    return 'test';
  }

  if (
    extLower === 'md' ||
    extLower === 'mdx' ||
    extLower === 'txt' ||
    extLower === 'rst' ||
    pathLower.includes('doc') ||
    pathLower.includes('readme') ||
    pathLower.includes('changelog') ||
    pathLower.includes('license')
  ) {
    return 'docs';
  }

  if (
    extLower === 'json' ||
    extLower === 'yaml' ||
    extLower === 'yml' ||
    extLower === 'toml' ||
    extLower === 'ini' ||
    extLower === 'cfg' ||
    pathLower.includes('config') ||
    pathLower.startsWith('.') ||
    pathLower.includes('package.json') ||
    pathLower.includes('tsconfig') ||
    pathLower.includes('eslint') ||
    pathLower.includes('prettier')
  ) {
    return 'config';
  }

  return 'source';
}

export interface LanguageBreakdown {
  name: string;
  percent: number;
  bytes: number;
}

export function calculateLanguageBreakdown(
  files: readonly { extension: string; sizeBytes: number }[]
): LanguageBreakdown[] {
  const langBytes: Record<string, number> = {};
  let totalBytes = 0;

  for (const file of files) {
    const lang = extensionToLanguage(file.extension);
    langBytes[lang] = (langBytes[lang] ?? 0) + file.sizeBytes;
    totalBytes += file.sizeBytes;
  }

  if (totalBytes === 0) {return [];}

  const breakdown = Object.entries(langBytes)
    .map(([name, bytes]) => ({
      name,
      bytes,
      percent: (bytes / totalBytes) * 100,
    }))
    .sort((a, b) => b.percent - a.percent);

  const threshold = 3;
  const mainLanguages: LanguageBreakdown[] = [];
  let otherBytes = 0;

  for (const lang of breakdown) {
    if (lang.percent >= threshold) {
      mainLanguages.push(lang);
    } else {
      otherBytes += lang.bytes;
    }
  }

  if (otherBytes > 0) {
    mainLanguages.push({
      name: 'Other',
      bytes: otherBytes,
      percent: (otherBytes / totalBytes) * 100,
    });
  }

  return mainLanguages;
}

export interface RoleBreakdown {
  source: number;
  test: number;
  docs: number;
  config: number;
}

export function calculateRoleBreakdown(
  files: readonly { relativePath: string; extension: string; sizeBytes: number }[]
): RoleBreakdown {
  const roleBytes: RoleBreakdown = { source: 0, test: 0, docs: 0, config: 0 };
  let totalBytes = 0;

  for (const file of files) {
    const role = categorizeFileRole(file.relativePath, file.extension);
    roleBytes[role] += file.sizeBytes;
    totalBytes += file.sizeBytes;
  }

  if (totalBytes === 0) {
    return { source: 0, test: 0, docs: 0, config: 0 };
  }

  return {
    source: (roleBytes.source / totalBytes) * 100,
    test: (roleBytes.test / totalBytes) * 100,
    docs: (roleBytes.docs / totalBytes) * 100,
    config: (roleBytes.config / totalBytes) * 100,
  };
}

export interface DirectorySize {
  path: string;
  percent: number;
}

export function calculateTopDirectories(
  files: readonly { relativePath: string; sizeBytes: number }[],
  maxDirs = 4
): DirectorySize[] {
  const dirBytes: Record<string, number> = {};
  let totalBytes = 0;

  for (const file of files) {
    const parts = file.relativePath.split('/');
    let dirPath = '.';

    if (parts.length > 1) {
      if (parts[0] === 'src' && parts.length > 2) {
        dirPath = `${parts[0]}/${parts[1]}/`;
      } else {
        dirPath = `${parts[0]}/`;
      }
    }

    dirBytes[dirPath] = (dirBytes[dirPath] ?? 0) + file.sizeBytes;
    totalBytes += file.sizeBytes;
  }

  if (totalBytes === 0) {return [];}

  return Object.entries(dirBytes)
    .map(([path, bytes]) => ({
      path,
      percent: (bytes / totalBytes) * 100,
    }))
    .sort((a, b) => b.percent - a.percent)
    .slice(0, maxDirs);
}

export function estimateLinesOfCode(totalBytes: number): number {
  const avgBytesPerLine = 45;
  return Math.round(totalBytes / avgBytesPerLine);
}

/**
 * Resolve output file path with consistent extension handling.
 *
 * Rules:
 * - If `out` is given and has a valid format extension (md, json, yaml, txt), use it as-is
 * - If `out` is given without an extension or with a non-format extension, append `.${format}`
 * - If `out` is not given, use `<defaultBaseName>.${format}`
 * - Never generate paths with `._md`, stray dots, or duplicate extensions
 *
 * @param opts - Options for resolving the output path
 * @returns The resolved output path
 */
export function resolveOutputPath(opts: {
  out?: string;
  format: 'md' | 'json' | 'yaml' | 'txt';
  defaultBaseName: string;
}): string {
  const { out, format, defaultBaseName } = opts;

  // If no output path specified, use default
  if (!out) {
    return `${defaultBaseName}.${format}`;
  }

  // Check if the output path has an extension
  const lastDotIndex = out.lastIndexOf('.');
  const lastSlashIndex = out.lastIndexOf('/');

  // Extension exists if dot is after last slash (or no slash) and not at the start
  const hasExtension = lastDotIndex > lastSlashIndex && lastDotIndex > 0;

  if (hasExtension) {
    // Extract the extension (without the dot)
    const existingExtension = out.slice(lastDotIndex + 1);

    // Valid format extensions
    const validExtensions = ['md', 'json', 'yaml', 'txt'];

    // If it has a valid format extension, use path as-is
    if (validExtensions.includes(existingExtension)) {
      return out;
    }

    // Otherwise, append the format extension
    return `${out}.${format}`;
  } else {
    // Append format extension if no extension present
    return `${out}.${format}`;
  }
}

/**
 * Analyze selected file paths to extract folder information for smart filename generation.
 * Now supports nested folder paths with configurable depth.
 *
 * @param selectedPaths - Array of selected file paths (relative)
 * @param maxFolders - Maximum number of unique folder paths to include (default: 3)
 * @param maxNestedDepth - Maximum depth of nested folders to include (default: 4)
 * @returns Folder suffix to add to filename, or empty string if none
 *
 * @example
 * ```typescript
 * // With nested folders (maxNestedDepth=4)
 * analyzeSelectedFolders(['src/utils/helpers.ts', 'src/utils/format.ts'], 3, 4) // 'src-utils'
 * analyzeSelectedFolders(['src/core/auth/login.ts', 'src/core/db/models.ts'], 3, 4) // 'src-core-auth-src-core-db'
 *
 * // When exceeding depth, take first and last
 * analyzeSelectedFolders(['a/b/c/d/e/f.ts'], 3, 4) // 'a-...-f'
 *
 * // When exceeding max folders, find common parent or take first N
 * analyzeSelectedFolders(['src/a/f.ts', 'src/b/f.ts', 'src/c/f.ts', 'src/d/f.ts'], 3, 4) // 'src'
 * analyzeSelectedFolders(['a/b.ts', 'c/d.ts', 'e/f.ts', 'g/h.ts'], 3, 4) // 'a-c-e'
 * ```
 */
export function analyzeSelectedFolders(
  selectedPaths: readonly string[],
  maxFolders = 3,
  maxNestedDepth = 4,
  folderSeparator = '-',
  truncationPattern = '...',
  root?: string
): string {
  if (selectedPaths.length === 0) {
    return '';
  }

  // Extract all folder segments from selected paths
  const allFolderSegments: string[][] = [];

  for (const path of selectedPaths) {
    let pathToAnalyze = path;

    // Make path relative to root if root is provided
    if (root) {
      const relativePath = relative(root, path);
      // Skip if path is outside root
      if (relativePath.startsWith('..')) {
        continue;
      }
      pathToAnalyze = relativePath;
    }

    const normalizedPath = pathToAnalyze.replace(/\\/g, '/');
    const parts = normalizedPath.split('/');

    // Skip files in root directory
    if (parts.length <= 1) {
      continue;
    }

    const folders = parts.slice(0, -1);
    if (folders.length > 0) {
      allFolderSegments.push(folders);
    }
  }

  if (allFolderSegments.length === 0) {
    return '';
  }

  // Find common prefix among all paths
  const commonPrefixLength = findCommonPrefixLength(allFolderSegments);
  const maxDepth = Math.max(...allFolderSegments.map(s => s.length));
  const minDepth = Math.min(...allFolderSegments.map(s => s.length));

  // Strategy 1: If there's a deep common prefix (2+ levels), extract unique parts after it
  if (commonPrefixLength >= 2) {
    // Get unique folder paths after the common prefix
    const uniqueSuffixes = new Set<string>();
    const uniqueFolderPaths = new Set<string>();

    for (const segments of allFolderSegments) {
      if (segments.length === commonPrefixLength) {
        // File is directly in the common parent - no suffix
        uniqueSuffixes.add('');
      } else if (segments.length > commonPrefixLength) {
        // Take the next folder after common prefix
        const nextFolder = segments[commonPrefixLength];
        if (nextFolder) {
          uniqueSuffixes.add(nextFolder);
          // Also track full path after prefix for cases where we need more detail
          const suffix = segments.slice(commonPrefixLength).join(folderSeparator);
          uniqueFolderPaths.add(suffix);
        }
      }
    }

    // If all files are in subdirectories of the common parent (not directly in it)
    if (!uniqueSuffixes.has('') && uniqueSuffixes.size > 0) {
      // If we have few enough unique next-level folders, use those
      if (uniqueSuffixes.size <= maxFolders) {
        const sorted = Array.from(uniqueSuffixes).filter(s => s.length > 0).sort();
        return sanitizeFolders(sorted, folderSeparator);
      }

      // If too many, fall back to common parent name
      const commonPrefix = allFolderSegments[0]?.slice(0, commonPrefixLength) ?? [];
      if (commonPrefix.length > 0) {
        // Use last segment of common prefix (most specific)
        const lastCommon = commonPrefix[commonPrefix.length - 1];
        if (lastCommon) {
          return sanitizeFolders([lastCommon], folderSeparator);
        }
      }
    }

    // If some files are directly in common parent, return the full common path
    if (uniqueSuffixes.has('')) {
      const commonPrefix = allFolderSegments[0]?.slice(0, commonPrefixLength) ?? [];
      return sanitizeFolders(commonPrefix, folderSeparator);
    }
  }

  // Strategy 2: Extract unique leaf folders when paths are varied
  const uniqueLeaves = new Set<string>();
  for (const segments of allFolderSegments) {
    const leaf = segments[segments.length - 1];
    if (leaf) {
      uniqueLeaves.add(leaf);
    }
  }

  // If we have multiple unique leaf folders (but not too many), use those
  // Skip if only 1 unique leaf - that's too generic
  if (uniqueLeaves.size > 1 && uniqueLeaves.size <= maxFolders) {
    const sorted = Array.from(uniqueLeaves).sort();
    return sanitizeFolders(sorted, folderSeparator);
  }

  // Strategy 3: Use top-level folders (or first N levels)
  const topLevelFolders = new Set<string>();
  const maxLevelsToShow = Math.min(2, maxNestedDepth);

  for (const segments of allFolderSegments) {
    const topPart = segments.slice(0, maxLevelsToShow).join(folderSeparator);
    topLevelFolders.add(topPart);
  }

  if (topLevelFolders.size <= maxFolders) {
    const sorted = Array.from(topLevelFolders).sort();
    return sanitizeFolders(sorted, folderSeparator);
  }

  // Strategy 4: Fall back to first N top-level folders
  const firstN = Array.from(topLevelFolders).slice(0, maxFolders);
  return sanitizeFolders(firstN, folderSeparator);
}

/**
 * Sanitize and join folder names
 */
function sanitizeFolders(folders: string[], separator: string): string {
  const sanitized = folders.map(folder =>
    folder
      .replace(/[^a-zA-Z0-9-.]/g, separator)
      .replace(new RegExp(`${separator}+`, 'g'), separator)
      .replace(new RegExp(`^${separator}|${separator}$`, 'g'), '')
  ).filter(f => f.length > 0);

  return sanitized.join(separator);
}

/**
 * Find the length of the common prefix among folder segment arrays.
 *
 * @param segmentArrays - Array of folder segment arrays (e.g., [['src', 'cli'], ['src', 'core']])
 * @returns Number of common prefix segments
 */
function findCommonPrefixLength(segmentArrays: string[][]): number {
  if (segmentArrays.length === 0) {return 0;}
  if (segmentArrays.length === 1) {return segmentArrays[0]?.length ?? 0;}

  const minLength = Math.min(...segmentArrays.map(s => s.length));
  let commonLength = 0;

  for (let i = 0; i < minLength; i++) {
    const firstSegment = segmentArrays[0]?.[i];
    if (firstSegment !== undefined && segmentArrays.every(s => s[i] === firstSegment)) {
      commonLength++;
    } else {
      break;
    }
  }

  return commonLength;
}

/**
 * Find the common parent directory from a list of folder paths.
 * Returns the longest common prefix that represents a complete directory.
 *
 * @param paths - Array of folder paths (e.g., ['src-cli', 'src-core', 'src-components'])
 * @param separator - Separator used in paths (default: '-')
 * @returns Common parent path or empty string if none
 *
 * @example
 * ```typescript
 * findCommonParent(['src-cli', 'src-core', 'src-components'], '-') // 'src'
 * findCommonParent(['a-b', 'a-c', 'a-d'], '-') // 'a'
 * findCommonParent(['foo', 'bar'], '-') // ''
 * ```
 */
function findCommonParent(paths: string[], separator = '-'): string {
  if (paths.length === 0) {return '';}
  if (paths.length === 1) {return paths[0] ?? '';}

  // Split each path by the separator to get segments
  const segments = paths.map(p => p.split(separator));

  // Find the minimum segment length
  const minLength = Math.min(...segments.map(s => s.length));

  // Find common prefix segments
  const commonSegments: string[] = [];
  for (let i = 0; i < minLength; i++) {
    const firstSegment = segments[0]?.[i];
    if (firstSegment !== undefined && segments.every(s => s[i] === firstSegment)) {
      commonSegments.push(firstSegment);
    } else {
      break;
    }
  }

  return commonSegments.join(separator);
}
