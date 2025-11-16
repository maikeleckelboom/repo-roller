/**
 * Theme module for file tree rendering
 * Combines icons and colors into a unified theme
 */

import { type TreeIcons, defaultIcons, asciiIcons } from './icons.js';
import { type TreeColors, defaultColors, highContrastColors } from './colors.js';

export { type TreeIcons, defaultIcons, asciiIcons } from './icons.js';
export { type TreeColors, defaultColors, highContrastColors } from './colors.js';

export interface Theme {
  readonly icons: TreeIcons;
  readonly colors: TreeColors;
  readonly indent: {
    readonly size: number; // characters per indent level
    readonly char: string; // character used for base indent
  };
  readonly columns: {
    readonly selection: number; // width of selection column
    readonly expand: number; // width of expand/collapse column
    readonly icon: number; // width of file type icon column
  };
}

/**
 * Default theme with Nerd Font icons and dark colors
 */
export const defaultTheme: Theme = {
  icons: defaultIcons,
  colors: defaultColors,
  indent: {
    size: 2,
    char: ' ',
  },
  columns: {
    selection: 2, // icon + space
    expand: 2, // icon + space
    icon: 2, // icon + space
  },
};

/**
 * ASCII fallback theme for terminals without Nerd Fonts
 */
export const asciiTheme: Theme = {
  icons: asciiIcons,
  colors: defaultColors,
  indent: {
    size: 2,
    char: ' ',
  },
  columns: {
    selection: 4, // [x] + space
    expand: 2, // > + space
    icon: 3, // XX + space
  },
};

/**
 * High contrast theme for accessibility
 */
export const highContrastTheme: Theme = {
  icons: defaultIcons,
  colors: highContrastColors,
  indent: {
    size: 2,
    char: ' ',
  },
  columns: {
    selection: 2,
    expand: 2,
    icon: 2,
  },
};

/**
 * File type hints for dimmed suffix display
 */
export type FileHint = 'test' | 'config' | 'doc' | 'lock' | 'generated' | null;

/**
 * Detect file hint based on filename patterns
 */
export function getFileHint(filename: string): FileHint {
  const lower = filename.toLowerCase();

  // Test files
  if (
    lower.includes('.test.') ||
    lower.includes('.spec.') ||
    lower.includes('_test.') ||
    lower.includes('_spec.') ||
    lower.endsWith('.test.ts') ||
    lower.endsWith('.test.tsx') ||
    lower.endsWith('.test.js') ||
    lower.endsWith('.test.jsx') ||
    lower.endsWith('.spec.ts') ||
    lower.endsWith('.spec.tsx')
  ) {
    return 'test';
  }

  // Lock files
  if (
    lower === 'package-lock.json' ||
    lower === 'pnpm-lock.yaml' ||
    lower === 'yarn.lock' ||
    lower === 'composer.lock' ||
    lower === 'cargo.lock' ||
    lower === 'gemfile.lock'
  ) {
    return 'lock';
  }

  // Config files
  if (
    lower.startsWith('.') ||
    lower.includes('config') ||
    lower.includes('rc.') ||
    lower.endsWith('rc') ||
    lower === 'tsconfig.json' ||
    lower === 'jsconfig.json' ||
    lower === 'package.json' ||
    lower === '.gitignore' ||
    lower === '.npmrc' ||
    lower === '.nvmrc' ||
    lower === '.prettierrc' ||
    lower === '.eslintrc.js' ||
    lower === '.eslintrc.json' ||
    lower === 'vitest.config.ts' ||
    lower === 'jest.config.js' ||
    lower === 'webpack.config.js' ||
    lower === 'rollup.config.js' ||
    lower === 'vite.config.ts'
  ) {
    return 'config';
  }

  // Documentation files
  if (
    lower.endsWith('.md') ||
    lower.endsWith('.mdx') ||
    lower.endsWith('.txt') ||
    lower === 'readme' ||
    lower === 'changelog' ||
    lower === 'license' ||
    lower === 'contributing'
  ) {
    return 'doc';
  }

  // Generated files
  if (
    lower.endsWith('.d.ts') ||
    lower.endsWith('.map') ||
    lower.endsWith('.min.js') ||
    lower.endsWith('.min.css')
  ) {
    return 'generated';
  }

  return null;
}

/**
 * Get icon for file based on extension and name
 */
export function getFileIcon(filename: string, theme: Theme): string {
  const lower = filename.toLowerCase();
  const ext = filename.split('.').pop()?.toLowerCase() || '';

  // Special case: lock files
  if (
    lower === 'package-lock.json' ||
    lower === 'pnpm-lock.yaml' ||
    lower === 'yarn.lock' ||
    lower === 'cargo.lock' ||
    lower === 'composer.lock'
  ) {
    return theme.icons.lock;
  }

  // Special case: config/dotfiles
  if (
    lower.startsWith('.') ||
    lower === 'tsconfig.json' ||
    lower === 'jsconfig.json' ||
    lower.includes('config') ||
    lower.endsWith('rc') ||
    lower.includes('rc.')
  ) {
    // But not if it's a code file
    if (!['ts', 'tsx', 'js', 'jsx', 'py', 'rs', 'go'].includes(ext)) {
      return theme.icons.config;
    }
  }

  // Special case: git files
  if (lower === '.gitignore' || lower === '.gitattributes' || lower === '.gitmodules') {
    return theme.icons.git;
  }

  // Extension-based icons
  switch (ext) {
    case 'ts':
      return theme.icons.typescript;
    case 'tsx':
    case 'jsx':
      return theme.icons.react;
    case 'js':
    case 'mjs':
    case 'cjs':
      return theme.icons.javascript;
    case 'json':
      return theme.icons.json;
    case 'md':
    case 'mdx':
      return theme.icons.markdown;
    case 'yml':
    case 'yaml':
      return theme.icons.yaml;
    case 'py':
      return theme.icons.python;
    case 'rs':
      return theme.icons.rust;
    case 'go':
      return theme.icons.go;
    case 'html':
    case 'htm':
      return theme.icons.html;
    case 'css':
    case 'scss':
    case 'less':
    case 'sass':
      return theme.icons.css;
    case 'sh':
    case 'bash':
    case 'zsh':
    case 'fish':
      return theme.icons.shell;
    default:
      return theme.icons.file;
  }
}

/**
 * Get color for file based on type and hint
 */
export function getFileColor(filename: string, theme: Theme): string {
  const hint = getFileHint(filename);
  const ext = filename.split('.').pop()?.toLowerCase() || '';

  // Test files get test color
  if (hint === 'test') {
    return theme.colors.test;
  }

  // Config files get config color
  if (hint === 'config' || hint === 'lock') {
    return theme.colors.config;
  }

  // Doc files get markdown color
  if (hint === 'doc') {
    return theme.colors.markdown;
  }

  // Extension-based colors
  switch (ext) {
    case 'ts':
      return theme.colors.typescript;
    case 'tsx':
    case 'jsx':
      return theme.colors.react;
    case 'js':
    case 'mjs':
    case 'cjs':
      return theme.colors.javascript;
    case 'md':
    case 'mdx':
      return theme.colors.markdown;
    default:
      return theme.colors.file;
  }
}
