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
  if (bytes === 0) return '0 B';
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

  if (totalBytes === 0) return [];

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

  if (totalBytes === 0) return [];

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
 *
 * @param selectedPaths - Array of selected file paths (relative)
 * @param maxFolders - Maximum number of folders to include in filename (default: 3)
 * @returns Folder suffix to add to filename, or empty string if none
 *
 * @example
 * ```typescript
 * analyzeSelectedFolders(['src/utils/helpers.ts', 'src/utils/format.ts']) // 'src-utils'
 * analyzeSelectedFolders(['src/a.ts', 'lib/b.ts', 'test/c.ts']) // 'src-lib-test'
 * analyzeSelectedFolders(['a/b/c.ts', 'd/e/f.ts', 'g/h/i.ts', 'j/k/l.ts', 'm/n/o.ts']) // '5folders'
 * ```
 */
export function analyzeSelectedFolders(
  selectedPaths: readonly string[],
  maxFolders: number = 3
): string {
  if (selectedPaths.length === 0) {
    return '';
  }

  // Extract unique top-level folders
  const topLevelFolders = new Set<string>();

  for (const path of selectedPaths) {
    // Normalize path separators
    const normalizedPath = path.replace(/\\/g, '/');
    const parts = normalizedPath.split('/');

    // Skip files in root directory
    if (parts.length > 1 && parts[0]) {
      // Add the top-level folder
      topLevelFolders.add(parts[0]);
    }
  }

  // If no folders found (all files in root), return empty string
  if (topLevelFolders.size === 0) {
    return '';
  }

  // If too many folders, return count
  if (topLevelFolders.size > maxFolders) {
    return `${topLevelFolders.size}folders`;
  }

  // Sort folders alphabetically for consistency
  const sortedFolders = Array.from(topLevelFolders).sort();

  // Sanitize folder names (remove special chars, keep alphanumeric and dashes)
  const sanitized = sortedFolders.map(folder =>
    folder.replace(/[^a-zA-Z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
  );

  // Join with kebab-case
  return sanitized.join('-');
}
