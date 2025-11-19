/**
 * File-icons mapping module
 * Maps file extensions and names to icon IDs from the file-icons collection
 * Reference: https://icones.js.org/collection/file-icons
 */

/** Icon IDs from the file-icons collection */
export type FileIconId =
  | 'file-icons:typescript'
  | 'file-icons:typescript-alt'
  | 'file-icons:jsx'
  | 'file-icons:jsx-alt'
  | 'file-icons:javascript'
  | 'file-icons:json'
  | 'file-icons:markdown'
  | 'file-icons:yaml'
  | 'file-icons:config'
  | 'file-icons:npm'
  | 'file-icons:git'
  | 'file-icons:eslint'
  | 'file-icons:prettier'
  | 'file-icons:editorconfig'
  | 'file-icons:test-js'
  | 'file-icons:test-typescript'
  | 'file-icons:python'
  | 'file-icons:go'
  | 'file-icons:rust'
  | 'file-icons:java'
  | 'file-icons:css'
  | 'file-icons:scss'
  | 'file-icons:html'
  | 'file-icons:shell'
  | 'file-icons:sql'
  | 'file-icons:env'
  | 'file-icons:docker'
  | 'file-icons:license'
  | 'file-icons:readme'
  | 'file-icons:changelog'
  | 'file-icons:lock'
  | 'file-icons:folder'
  | 'file-icons:folder-open'
  | 'file-icons:file';

/** File type category for styling hints */
export type FileCategory =
  | 'source'
  | 'test'
  | 'config'
  | 'doc'
  | 'asset'
  | 'lockfile'
  | 'folder';

export interface FileIconInfo {
  iconId: FileIconId;
  category: FileCategory;
  hint?: string; // Optional suffix hint like "test", "config", "doc"
}

/**
 * Pattern matchers for specific filenames
 */
const EXACT_FILENAME_ICONS: Record<string, FileIconInfo> = {
  // Config files
  'package.json': { iconId: 'file-icons:npm', category: 'config', hint: 'pkg' },
  'tsconfig.json': { iconId: 'file-icons:typescript', category: 'config', hint: 'config' },
  'jsconfig.json': { iconId: 'file-icons:javascript', category: 'config', hint: 'config' },
  '.eslintrc': { iconId: 'file-icons:eslint', category: 'config', hint: 'config' },
  '.eslintrc.js': { iconId: 'file-icons:eslint', category: 'config', hint: 'config' },
  '.eslintrc.cjs': { iconId: 'file-icons:eslint', category: 'config', hint: 'config' },
  '.eslintrc.json': { iconId: 'file-icons:eslint', category: 'config', hint: 'config' },
  '.eslintrc.yaml': { iconId: 'file-icons:eslint', category: 'config', hint: 'config' },
  '.eslintrc.yml': { iconId: 'file-icons:eslint', category: 'config', hint: 'config' },
  'eslint.config.js': { iconId: 'file-icons:eslint', category: 'config', hint: 'config' },
  'eslint.config.mjs': { iconId: 'file-icons:eslint', category: 'config', hint: 'config' },
  '.prettierrc': { iconId: 'file-icons:prettier', category: 'config', hint: 'config' },
  '.prettierrc.js': { iconId: 'file-icons:prettier', category: 'config', hint: 'config' },
  '.prettierrc.json': { iconId: 'file-icons:prettier', category: 'config', hint: 'config' },
  '.prettierrc.yaml': { iconId: 'file-icons:prettier', category: 'config', hint: 'config' },
  'prettier.config.js': { iconId: 'file-icons:prettier', category: 'config', hint: 'config' },
  '.editorconfig': { iconId: 'file-icons:editorconfig', category: 'config', hint: 'config' },
  '.gitignore': { iconId: 'file-icons:git', category: 'config', hint: 'git' },
  '.gitattributes': { iconId: 'file-icons:git', category: 'config', hint: 'git' },
  '.gitmodules': { iconId: 'file-icons:git', category: 'config', hint: 'git' },
  '.npmrc': { iconId: 'file-icons:npm', category: 'config', hint: 'config' },
  '.nvmrc': { iconId: 'file-icons:config', category: 'config', hint: 'config' },
  '.env': { iconId: 'file-icons:env', category: 'config', hint: 'env' },
  '.env.local': { iconId: 'file-icons:env', category: 'config', hint: 'env' },
  '.env.development': { iconId: 'file-icons:env', category: 'config', hint: 'env' },
  '.env.production': { iconId: 'file-icons:env', category: 'config', hint: 'env' },
  '.env.test': { iconId: 'file-icons:env', category: 'config', hint: 'env' },
  'Dockerfile': { iconId: 'file-icons:docker', category: 'config', hint: 'docker' },
  '.dockerignore': { iconId: 'file-icons:docker', category: 'config', hint: 'docker' },
  'docker-compose.yml': { iconId: 'file-icons:docker', category: 'config', hint: 'docker' },
  'docker-compose.yaml': { iconId: 'file-icons:docker', category: 'config', hint: 'docker' },
  'vitest.config.ts': { iconId: 'file-icons:test-typescript', category: 'config', hint: 'config' },
  'vitest.config.js': { iconId: 'file-icons:test-js', category: 'config', hint: 'config' },
  'jest.config.js': { iconId: 'file-icons:test-js', category: 'config', hint: 'config' },
  'jest.config.ts': { iconId: 'file-icons:test-typescript', category: 'config', hint: 'config' },

  // Lock files
  'package-lock.json': { iconId: 'file-icons:lock', category: 'lockfile', hint: 'lock' },
  'pnpm-lock.yaml': { iconId: 'file-icons:lock', category: 'lockfile', hint: 'lock' },
  'yarn.lock': { iconId: 'file-icons:lock', category: 'lockfile', hint: 'lock' },
  'bun.lockb': { iconId: 'file-icons:lock', category: 'lockfile', hint: 'lock' },
  'Cargo.lock': { iconId: 'file-icons:lock', category: 'lockfile', hint: 'lock' },
  'Gemfile.lock': { iconId: 'file-icons:lock', category: 'lockfile', hint: 'lock' },
  'poetry.lock': { iconId: 'file-icons:lock', category: 'lockfile', hint: 'lock' },
  'composer.lock': { iconId: 'file-icons:lock', category: 'lockfile', hint: 'lock' },

  // Documentation
  'README.md': { iconId: 'file-icons:readme', category: 'doc', hint: 'doc' },
  'README': { iconId: 'file-icons:readme', category: 'doc', hint: 'doc' },
  'CHANGELOG.md': { iconId: 'file-icons:changelog', category: 'doc', hint: 'doc' },
  'CHANGELOG': { iconId: 'file-icons:changelog', category: 'doc', hint: 'doc' },
  'LICENSE': { iconId: 'file-icons:license', category: 'doc', hint: 'license' },
  'LICENSE.md': { iconId: 'file-icons:license', category: 'doc', hint: 'license' },
  'LICENSE.txt': { iconId: 'file-icons:license', category: 'doc', hint: 'license' },
};

/**
 * Extension-based icon mapping
 */
const EXTENSION_ICONS: Record<string, FileIconInfo> = {
  // TypeScript
  ts: { iconId: 'file-icons:typescript', category: 'source' },
  tsx: { iconId: 'file-icons:jsx-alt', category: 'source' },
  mts: { iconId: 'file-icons:typescript', category: 'source' },
  cts: { iconId: 'file-icons:typescript', category: 'source' },

  // JavaScript
  js: { iconId: 'file-icons:javascript', category: 'source' },
  jsx: { iconId: 'file-icons:jsx', category: 'source' },
  mjs: { iconId: 'file-icons:javascript', category: 'source' },
  cjs: { iconId: 'file-icons:javascript', category: 'source' },

  // Data formats
  json: { iconId: 'file-icons:json', category: 'config' },
  yaml: { iconId: 'file-icons:yaml', category: 'config' },
  yml: { iconId: 'file-icons:yaml', category: 'config' },
  toml: { iconId: 'file-icons:config', category: 'config' },

  // Documentation
  md: { iconId: 'file-icons:markdown', category: 'doc' },
  mdx: { iconId: 'file-icons:markdown', category: 'doc' },
  txt: { iconId: 'file-icons:file', category: 'doc' },

  // Other languages
  py: { iconId: 'file-icons:python', category: 'source' },
  go: { iconId: 'file-icons:go', category: 'source' },
  rs: { iconId: 'file-icons:rust', category: 'source' },
  java: { iconId: 'file-icons:java', category: 'source' },

  // Styles
  css: { iconId: 'file-icons:css', category: 'asset' },
  scss: { iconId: 'file-icons:scss', category: 'asset' },
  sass: { iconId: 'file-icons:scss', category: 'asset' },
  less: { iconId: 'file-icons:css', category: 'asset' },

  // Web
  html: { iconId: 'file-icons:html', category: 'source' },
  htm: { iconId: 'file-icons:html', category: 'source' },

  // Shell
  sh: { iconId: 'file-icons:shell', category: 'source' },
  bash: { iconId: 'file-icons:shell', category: 'source' },
  zsh: { iconId: 'file-icons:shell', category: 'source' },
  fish: { iconId: 'file-icons:shell', category: 'source' },

  // Database
  sql: { iconId: 'file-icons:sql', category: 'source' },

  // Environment
  env: { iconId: 'file-icons:env', category: 'config' },
};

/**
 * Check if a filename indicates a test file
 */
function isTestFile(filename: string): boolean {
  const lowerName = filename.toLowerCase();
  return (
    lowerName.includes('.test.') ||
    lowerName.includes('.spec.') ||
    lowerName.includes('_test.') ||
    lowerName.includes('_spec.') ||
    lowerName.startsWith('test_') ||
    lowerName.endsWith('_test.ts') ||
    lowerName.endsWith('_test.js') ||
    lowerName.endsWith('.test.ts') ||
    lowerName.endsWith('.test.tsx') ||
    lowerName.endsWith('.test.js') ||
    lowerName.endsWith('.test.jsx') ||
    lowerName.endsWith('.spec.ts') ||
    lowerName.endsWith('.spec.tsx') ||
    lowerName.endsWith('.spec.js') ||
    lowerName.endsWith('.spec.jsx')
  );
}

/**
 * Get the file icon information for a given filename
 */
export function getFileIconInfo(filename: string): FileIconInfo {
  // Check exact filename matches first
  if (EXACT_FILENAME_ICONS[filename]) {
    return EXACT_FILENAME_ICONS[filename];
  }

  // Check for partial matches (e.g., files that start with .env)
  if (filename.startsWith('.env')) {
    return { iconId: 'file-icons:env', category: 'config', hint: 'env' };
  }

  // Get extension
  const parts = filename.split('.');
  const lastPart = parts[parts.length - 1];
  const ext = parts.length > 1 && lastPart ? lastPart.toLowerCase() : '';

  // Check if it's a test file
  if (isTestFile(filename)) {
    // Use test-specific icons based on extension
    if (ext === 'ts' || ext === 'tsx') {
      return { iconId: 'file-icons:test-typescript', category: 'test', hint: 'test' };
    }
    if (ext === 'js' || ext === 'jsx') {
      return { iconId: 'file-icons:test-js', category: 'test', hint: 'test' };
    }
    // Fallback to source icon with test hint
    const baseIcon = EXTENSION_ICONS[ext];
    if (baseIcon) {
      return { ...baseIcon, category: 'test', hint: 'test' };
    }
  }

  // Check extension-based icons
  if (EXTENSION_ICONS[ext]) {
    return EXTENSION_ICONS[ext];
  }

  // Default file icon
  return { iconId: 'file-icons:file', category: 'source' };
}

/**
 * Get folder icon info
 */
export function getFolderIconInfo(isExpanded: boolean): FileIconInfo {
  return {
    iconId: isExpanded ? 'file-icons:folder-open' : 'file-icons:folder',
    category: 'folder',
  };
}
