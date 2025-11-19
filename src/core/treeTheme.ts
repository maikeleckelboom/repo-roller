/**
 * Tree theme module
 * Centralizes icon glyphs, ASCII fallbacks, colors, and styling for tree rendering
 */

import type { FileIconId, FileCategory } from './fileIcons.js';
import { env } from './env.js';

/** Color palette for the tree */
export interface TreeColors {
  folder: string;
  typescript: string;
  javascript: string;
  test: string;
  doc: string;
  config: string;
  lockfile: string;
  default: string;
  selected: string;
  partial: string;
  unselected: string;
  cursor: string;
  dim: string;
}

/** Marker styles */
export interface TreeMarkers {
  selected: string;
  unselected: string;
  partial: string;
  expanded: string;
  collapsed: string;
  leaf: string;
}

/** Tree branch characters */
export interface TreeBranches {
  vertical: string;
  tee: string;
  corner: string;
  horizontal: string;
  space: string;
}

/** Icon glyph mapping (Nerd Font or Unicode) */
export interface TreeGlyphs {
  icons: Record<FileIconId, string>;
}

/** ASCII fallback mapping */
export interface TreeAscii {
  icons: Record<FileIconId, string>;
}

/** Complete theme definition */
export interface TreeTheme {
  name: string;
  colors: TreeColors;
  markers: TreeMarkers;
  branches: TreeBranches;
  glyphs: TreeGlyphs;
  ascii: TreeAscii;
  useNerdFonts: boolean;
}

/**
 * Modern color palette (ANSI color names for Ink/Chalk)
 * Loaded from environment configuration with fallback defaults
 */
const defaultColors: TreeColors = env.treeTheme.colors;

/**
 * Modern selection and expansion markers
 * Loaded from environment configuration with fallback defaults
 */
const defaultMarkers: TreeMarkers = env.treeTheme.markers;

/**
 * Modern tree branch characters (Unicode box drawing)
 * Loaded from environment configuration with fallback defaults
 */
const defaultBranches: TreeBranches = env.treeTheme.branches;

/**
 * Nerd Font glyphs for file-icons
 * These map to the Nerd Font patched versions of the file-icons
 */
const nerdFontGlyphs: Record<FileIconId, string> = {
  'file-icons:typescript': '', // nf-seti-typescript
  'file-icons:typescript-alt': '', // nf-seti-typescript
  'file-icons:jsx': '', // nf-md-react
  'file-icons:jsx-alt': '', // nf-md-react
  'file-icons:javascript': '', // nf-seti-javascript
  'file-icons:json': '', // nf-seti-json
  'file-icons:markdown': '', // nf-seti-markdown
  'file-icons:yaml': '', // nf-seti-yml
  'file-icons:config': '', // nf-fa-cog
  'file-icons:npm': '', // nf-seti-npm
  'file-icons:git': '', // nf-dev-git
  'file-icons:eslint': '', // nf-seti-eslint
  'file-icons:prettier': '', // nf-seti-prettier
  'file-icons:editorconfig': '', // nf-seti-editorconfig
  'file-icons:test-js': '', // nf-fa-flask
  'file-icons:test-typescript': '', // nf-fa-flask
  'file-icons:python': '', // nf-seti-python
  'file-icons:go': '', // nf-seti-go
  'file-icons:rust': '', // nf-dev-rust
  'file-icons:java': '', // nf-dev-java
  'file-icons:css': '', // nf-seti-css
  'file-icons:scss': '', // nf-seti-sass
  'file-icons:html': '', // nf-seti-html
  'file-icons:shell': '', // nf-cod-terminal
  'file-icons:sql': '', // nf-dev-database
  'file-icons:env': '', // nf-fa-lock
  'file-icons:docker': '', // nf-seti-docker
  'file-icons:license': '', // nf-seti-license
  'file-icons:readme': '', // nf-md-book_open
  'file-icons:changelog': '', // nf-oct-history
  'file-icons:lock': '', // nf-fa-lock
  'file-icons:folder': '', // nf-fa-folder
  'file-icons:folder-open': '', // nf-fa-folder_open
  'file-icons:file': '', // nf-fa-file_text_o
};

/**
 * ASCII fallback icons (short text labels)
 *
 * Curated 2-letter badges for file types:
 * - No chevron characters (> or <) in badges
 * - Folders use blank badges (chevron column handles expand/collapse)
 * - Intentionally chosen short codes for quick visual recognition
 */
const asciiIcons: Record<FileIconId, string> = {
  // All badges removed - rely on color and suffixes for file type indication
  // Source files
  'file-icons:typescript': '',
  'file-icons:typescript-alt': '',
  'file-icons:jsx': '',
  'file-icons:jsx-alt': '',
  'file-icons:javascript': '',
  'file-icons:python': '',
  'file-icons:go': '',
  'file-icons:rust': '',
  'file-icons:java': '',
  'file-icons:html': '',
  'file-icons:shell': '',
  'file-icons:sql': '',

  // Test files
  'file-icons:test-js': '',
  'file-icons:test-typescript': '',

  // Config & data
  'file-icons:json': '',
  'file-icons:yaml': '',
  'file-icons:config': '',
  'file-icons:npm': '',
  'file-icons:env': '',
  'file-icons:docker': '',

  // Tooling
  'file-icons:git': '',
  'file-icons:eslint': '',
  'file-icons:prettier': '',
  'file-icons:editorconfig': '',

  // Styles
  'file-icons:css': '',
  'file-icons:scss': '',

  // Documentation
  'file-icons:markdown': '',
  'file-icons:readme': '',
  'file-icons:changelog': '',
  'file-icons:license': '',

  // Package & locks
  'file-icons:lock': '',

  // Folders
  'file-icons:folder': '',
  'file-icons:folder-open': '',

  // Generic files
  'file-icons:file': '',
};

/**
 * Default theme with Nerd Font support
 */
export const defaultTheme: TreeTheme = {
  name: 'default',
  colors: defaultColors,
  markers: defaultMarkers,
  branches: defaultBranches,
  glyphs: { icons: nerdFontGlyphs },
  ascii: { icons: asciiIcons },
  useNerdFonts: true,
};

/**
 * ASCII-only theme for terminals without special font support
 * Simplified for maximum compatibility
 */
export const asciiTheme: TreeTheme = {
  name: 'ascii',
  colors: defaultColors,
  markers: {
    selected: '[x]',
    unselected: '[ ]',
    partial: '[-]',
    expanded: 'v',
    collapsed: '>',
    leaf: ' ',
  },
  branches: {
    vertical: '|',
    tee: '+',
    corner: '`',
    horizontal: '-',
    space: ' ',
  },
  glyphs: { icons: nerdFontGlyphs },
  ascii: { icons: asciiIcons },
  useNerdFonts: false,
};

/**
 * Get the icon string for a given icon ID
 */
export function getIconString(iconId: FileIconId, theme: TreeTheme): string {
  if (theme.useNerdFonts) {
    return theme.glyphs.icons[iconId] || theme.ascii.icons[iconId] || '?';
  }
  return theme.ascii.icons[iconId] || '?';
}

/**
 * Get the color for a file category
 */
export function getCategoryColor(category: FileCategory, theme: TreeTheme): string {
  switch (category) {
    case 'folder':
      return theme.colors.folder;
    case 'test':
      return theme.colors.test;
    case 'doc':
      return theme.colors.doc;
    case 'config':
      return theme.colors.config;
    case 'lockfile':
      return theme.colors.lockfile;
    case 'source':
    case 'asset':
    default:
      return theme.colors.default;
  }
}

/**
 * Get specific language color if applicable
 */
export function getLanguageColor(iconId: FileIconId, theme: TreeTheme): string | null {
  if (iconId.includes('typescript')) {
    return theme.colors.typescript;
  }
  if (iconId.includes('javascript') || iconId === 'file-icons:jsx') {
    return theme.colors.javascript;
  }
  return null;
}
