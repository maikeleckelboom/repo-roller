/**
 * Nerd Font icons for file tree rendering
 * All glyphs are from Nerd Fonts / devicon set
 */

export interface FileTypeIcon {
  readonly glyph: string;
  readonly color: string;
}

export interface TreeIcons {
  // Selection markers
  readonly selected: string;
  readonly unselected: string;
  readonly partiallySelected: string;

  // Expand/collapse markers
  readonly collapsed: string;
  readonly expanded: string;
  readonly leaf: string;

  // Tree structure
  readonly branch: string;
  readonly lastBranch: string;
  readonly vertical: string;
  readonly space: string;

  // Folder icons
  readonly folderClosed: string;
  readonly folderOpen: string;

  // File type icons (curated set)
  readonly typescript: string;
  readonly react: string;
  readonly javascript: string;
  readonly json: string;
  readonly markdown: string;
  readonly yaml: string;
  readonly config: string;
  readonly lock: string;
  readonly git: string;
  readonly python: string;
  readonly rust: string;
  readonly go: string;
  readonly html: string;
  readonly css: string;
  readonly shell: string;
  readonly test: string;
  readonly file: string;
}

/**
 * Default Nerd Font icon set
 * Uses standard Nerd Font glyphs that work across terminals
 */
export const defaultIcons: TreeIcons = {
  // Selection markers (fixed width)
  selected: '󰄵', // nf-md-checkbox_marked
  unselected: '󰄱', // nf-md-checkbox_blank_outline
  partiallySelected: '󰡖', // nf-md-minus_box

  // Expand/collapse markers
  collapsed: '', // nf-oct-chevron_right
  expanded: '', // nf-oct-chevron_down
  leaf: '•', // simple bullet for files

  // Tree structure characters
  branch: '├─',
  lastBranch: '└─',
  vertical: '│ ',
  space: '  ',

  // Folder icons
  folderClosed: '', // nf-custom-folder
  folderOpen: '', // nf-custom-folder_open

  // File type icons (curated, opinionated set)
  typescript: '', // nf-seti-typescript
  react: '', // nf-md-react
  javascript: '', // nf-seti-javascript
  json: '', // nf-seti-json
  markdown: '', // nf-dev-markdown
  yaml: '', // nf-seti-yml
  config: '', // nf-oct-gear
  lock: '', // nf-fa-lock
  git: '', // nf-dev-git
  python: '', // nf-dev-python
  rust: '', // nf-dev-rust
  go: '', // nf-seti-go
  html: '', // nf-seti-html
  css: '', // nf-seti-css
  shell: '', // nf-oct-terminal
  test: '', // nf-md-test_tube
  file: '', // nf-oct-file
};

/**
 * Fallback ASCII icons for terminals without Nerd Fonts
 */
export const asciiIcons: TreeIcons = {
  selected: '[x]',
  unselected: '[ ]',
  partiallySelected: '[-]',

  collapsed: '>',
  expanded: 'v',
  leaf: '-',

  branch: '|-',
  lastBranch: '\\-',
  vertical: '| ',
  space: '  ',

  folderClosed: '+',
  folderOpen: '-',

  typescript: 'TS',
  react: 'RX',
  javascript: 'JS',
  json: '{}',
  markdown: 'MD',
  yaml: 'YM',
  config: '**',
  lock: 'LK',
  git: 'GT',
  python: 'PY',
  rust: 'RS',
  go: 'GO',
  html: '<>',
  css: '#',
  shell: '$',
  test: '!',
  file: '--',
};
