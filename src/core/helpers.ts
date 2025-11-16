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
