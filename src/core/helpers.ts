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
  truncationPattern = '...'
): string {
  // Use provided values (defaults already set in parameters for backward compatibility)
  const effectiveMaxFolders = maxFolders;
  const effectiveMaxNestedDepth = maxNestedDepth;
  const effectiveSeparator = folderSeparator;
  const effectiveTruncation = truncationPattern;
  const showTruncation = true; // Always show truncation when it's needed

  if (selectedPaths.length === 0) {
    return '';
  }

  // Extract unique nested folder paths (up to maxNestedDepth)
  const folderPaths = new Set<string>();

  for (const path of selectedPaths) {
    // Normalize path separators
    const normalizedPath = path.replace(/\\/g, '/');
    const parts = normalizedPath.split('/');

    // Skip files in root directory (no folder path)
    if (parts.length <= 1) {
      continue;
    }

    // Remove the filename (last part)
    const folders = parts.slice(0, -1);

    if (folders.length === 0) {
      continue;
    }

    // If the folder path exceeds maxNestedDepth, take the deepest (most specific) folders
    if (folders.length > effectiveMaxNestedDepth && showTruncation) {
      // Take the last N folders (most specific) with truncation indicator at the start
      const depthToKeep = Math.min(effectiveMaxNestedDepth - 1, folders.length - 1);
      const deepFolders = folders.slice(-depthToKeep);
      folderPaths.add(`${effectiveTruncation}${effectiveSeparator}${deepFolders.join(effectiveSeparator)}`);
    } else {
      // Use the full nested path (limited to maxNestedDepth)
      const limitedFolders = folders.slice(0, effectiveMaxNestedDepth);
      folderPaths.add(limitedFolders.join(effectiveSeparator));
    }
  }

  // If no folders found (all files in root), return empty string
  if (folderPaths.size === 0) {
    return '';
  }

  const pathsArray = Array.from(folderPaths);

  // If too many unique folder paths, find common parent or take first N
  if (pathsArray.length > effectiveMaxFolders) {
    // Try to find common parent directory
    const commonParent = findCommonParent(pathsArray, effectiveSeparator);

    if (commonParent) {
      // If all paths share a common parent, use that
      return commonParent.replace(/[^a-zA-Z0-9-.]/g, effectiveSeparator).replace(new RegExp(`${effectiveSeparator}+`, 'g'), effectiveSeparator).replace(new RegExp(`^${effectiveSeparator}|${effectiveSeparator}$`, 'g'), '');
    }

    // Otherwise, take the first maxFolders paths
    const sortedPaths = pathsArray.sort().slice(0, effectiveMaxFolders);
    const sanitized = sortedPaths.map(folderPath =>
      folderPath
        .replace(/[^a-zA-Z0-9-.]/g, effectiveSeparator)
        .replace(new RegExp(`${effectiveSeparator}+`, 'g'), effectiveSeparator)
        .replace(new RegExp(`^${effectiveSeparator}|${effectiveSeparator}$`, 'g'), '')
    );
    return sanitized.join(effectiveSeparator);
  }

  // Even when not exceeding maxFolders, check for common parent to avoid repetition
  const commonParent = findCommonParent(pathsArray, effectiveSeparator);

  // If all paths share a common parent and there are unique suffixes, use only the unique parts
  if (commonParent && pathsArray.length > 1) {
    // Extract unique suffixes by removing the common parent prefix
    const uniqueSuffixes = pathsArray
      .map(path => {
        // If path equals the common parent exactly, return empty string
        if (path === commonParent) {
          return '';
        }
        // Remove common parent prefix (e.g., 'src-cli' -> 'cli' when commonParent is 'src')
        const prefix = commonParent + effectiveSeparator;
        return path.startsWith(prefix) ? path.slice(prefix.length) : path;
      })
      .filter(suffix => suffix.length > 0); // Filter out empty strings

    // If we have unique suffixes (not just the common parent), use them
    // ONLY if all paths produced non-empty suffixes
    if (uniqueSuffixes.length > 0 && uniqueSuffixes.length === pathsArray.length) {
      const sortedSuffixes = uniqueSuffixes.sort();
      const sanitized = sortedSuffixes.map(suffix =>
        suffix
          .replace(/[^a-zA-Z0-9-.]/g, effectiveSeparator)
          .replace(new RegExp(`${effectiveSeparator}+`, 'g'), effectiveSeparator)
          .replace(new RegExp(`^${effectiveSeparator}|${effectiveSeparator}$`, 'g'), '')
      );
      return sanitized.join(effectiveSeparator);
    }

    // If some paths were the common parent itself (produced empty suffixes),
    // just return the common parent to show the full breadcrumb context
    if (uniqueSuffixes.length < pathsArray.length) {
      return commonParent
        .replace(/[^a-zA-Z0-9-.]/g, effectiveSeparator)
        .replace(new RegExp(`${effectiveSeparator}+`, 'g'), effectiveSeparator)
        .replace(new RegExp(`^${effectiveSeparator}|${effectiveSeparator}$`, 'g'), '');
    }
  }

  // Sort folder paths: put non-truncated paths first, then truncated ones
  // This ensures common parent detection works better and output is more intuitive
  const sortedPaths = pathsArray.sort((a, b) => {
    const aHasTruncation = a.includes(effectiveTruncation);
    const bHasTruncation = b.includes(effectiveTruncation);

    // Non-truncated paths come first
    if (!aHasTruncation && bHasTruncation) {return -1;}
    if (aHasTruncation && !bHasTruncation) {return 1;}

    // For paths of the same type, maintain natural order (don't alphabetically sort)
    // This makes the output more predictable based on file selection order
    return 0;
  });

  // Sanitize folder paths (remove special chars, keep alphanumeric, dashes, and dots for separator)
  const sanitized = sortedPaths.map(folderPath =>
    folderPath
      .replace(/[^a-zA-Z0-9-.]/g, effectiveSeparator)
      .replace(new RegExp(`${effectiveSeparator}+`, 'g'), effectiveSeparator)
      .replace(new RegExp(`^${effectiveSeparator}|${effectiveSeparator}$`, 'g'), '')
  );

  // Join multiple paths with the configured separator
  return sanitized.join(effectiveSeparator);
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
