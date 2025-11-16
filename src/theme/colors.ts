/**
 * Color scheme for file tree rendering
 * Uses a minimal, consistent palette
 */

export interface TreeColors {
  // Core colors
  readonly folder: string;
  readonly typescript: string;
  readonly javascript: string;
  readonly react: string;
  readonly markdown: string;
  readonly config: string;
  readonly test: string;
  readonly file: string;

  // State colors
  readonly selected: string;
  readonly partiallySelected: string;
  readonly unselected: string;

  // UI colors
  readonly cursor: string;
  readonly cursorBg: string;
  readonly dimmed: string;
  readonly hint: string;
}

/**
 * Default dark theme color palette
 * Inspired by popular code editor themes
 */
export const defaultColors: TreeColors = {
  // Core file type colors
  folder: '#e5c07b', // warm yellow for folders
  typescript: '#519aba', // TypeScript blue
  javascript: '#f7df1e', // JavaScript yellow
  react: '#61dafb', // React cyan/blue
  markdown: '#519aba', // document blue
  config: '#6d8086', // muted gray for configs
  test: '#98c379', // green for tests (like passing)
  file: '#abb2bf', // neutral gray

  // State colors
  selected: '#98c379', // green
  partiallySelected: '#e5c07b', // yellow
  unselected: '#5c6370', // dark gray

  // UI colors
  cursor: '#61afef', // bright blue
  cursorBg: '#3e4451', // subtle dark background
  dimmed: '#5c6370', // dark gray
  hint: '#5c6370', // same as dimmed for consistency
};

/**
 * High contrast theme for accessibility
 */
export const highContrastColors: TreeColors = {
  folder: 'yellow',
  typescript: 'blue',
  javascript: 'yellow',
  react: 'cyan',
  markdown: 'cyan',
  config: 'gray',
  test: 'green',
  file: 'white',

  selected: 'green',
  partiallySelected: 'yellow',
  unselected: 'gray',

  cursor: 'white',
  cursorBg: 'blue',
  dimmed: 'gray',
  hint: 'gray',
};
