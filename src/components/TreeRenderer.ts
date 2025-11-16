/**
 * Pure tree row renderer for file tree UI
 * Provides consistent, aligned rendering with Nerd Font icons
 */

import { type Theme, getFileIcon, getFileHint } from '../theme/index.js';

/**
 * Tree node data structure
 */
export interface TreeNode {
  name: string;
  fullPath: string;
  isFile: boolean;
  children: TreeNode[];
  depth: number;
}

/**
 * State for rendering a single row
 */
export interface RowState {
  isSelected: boolean;
  isPartiallySelected: boolean;
  isExpanded: boolean;
  isCursor: boolean;
  isLast: boolean; // is this the last sibling at its level
  parentLasts: boolean[]; // track which parent levels are "last" for tree lines
}

/**
 * Rendered row with ANSI-free parts for testing
 */
export interface RenderedRow {
  indent: string;
  selection: string;
  expand: string;
  icon: string;
  name: string;
  hint: string;
  fullLine: string;
}

/**
 * Summary bar data
 */
export interface SummaryData {
  selectedCount: number;
  totalCount: number;
  hiddenCount: number;
}

/**
 * Pad string to fixed width
 */
function padEnd(str: string, width: number): string {
  const visibleLength = str.length;
  if (visibleLength >= width) {
    return str;
  }
  return str + ' '.repeat(width - visibleLength);
}

/**
 * Truncate string with ellipsis if too long
 */
export function truncateWithEllipsis(str: string, maxLength: number): string {
  if (str.length <= maxLength) {
    return str;
  }
  if (maxLength <= 3) {
    return str.slice(0, maxLength);
  }
  return str.slice(0, maxLength - 1) + '…';
}

/**
 * Build tree structure lines (box-drawing characters)
 */
function buildTreeLines(parentLasts: boolean[], theme: Theme): string {
  let result = '';
  for (const isLast of parentLasts) {
    if (isLast) {
      result += theme.icons.space;
    } else {
      result += theme.icons.vertical;
    }
  }
  return result;
}

/**
 * Render a single tree row as plain text parts
 * This is a pure function that doesn't include ANSI codes,
 * making it easy to test and compose
 */
export function renderTreeRowParts(
  node: TreeNode,
  state: RowState,
  theme: Theme
): RenderedRow {
  // 1. Build indent with tree structure
  const treeLines = buildTreeLines(state.parentLasts, theme);
  const branchChar = state.isLast ? theme.icons.lastBranch : theme.icons.branch;
  const indent = treeLines + branchChar;

  // 2. Selection marker (fixed width)
  let selectionIcon: string;
  if (state.isSelected) {
    selectionIcon = theme.icons.selected;
  } else if (state.isPartiallySelected) {
    selectionIcon = theme.icons.partiallySelected;
  } else {
    selectionIcon = theme.icons.unselected;
  }
  const selection = padEnd(selectionIcon, theme.columns.selection);

  // 3. Expand/collapse marker (fixed width)
  let expandIcon: string;
  if (node.isFile) {
    expandIcon = theme.icons.leaf;
  } else if (state.isExpanded) {
    expandIcon = theme.icons.expanded;
  } else {
    expandIcon = theme.icons.collapsed;
  }
  const expand = padEnd(expandIcon, theme.columns.expand);

  // 4. File/folder icon (fixed width)
  let iconChar: string;
  if (node.isFile) {
    iconChar = getFileIcon(node.name, theme);
  } else {
    iconChar = state.isExpanded ? theme.icons.folderOpen : theme.icons.folderClosed;
  }
  const icon = padEnd(iconChar, theme.columns.icon);

  // 5. File/directory name
  const name = node.name;

  // 6. Optional dimmed hint
  let hint = '';
  if (node.isFile) {
    const fileHint = getFileHint(node.name);
    if (fileHint) {
      hint = ` · ${fileHint}`;
    }
  }

  // Compose full line (without colors)
  const fullLine = indent + selection + expand + icon + name + hint;

  return {
    indent,
    selection,
    expand,
    icon,
    name,
    hint,
    fullLine,
  };
}

/**
 * Calculate the visual width of a rendered row
 * (for width-limited displays)
 */
export function calculateRowWidth(parts: RenderedRow): number {
  return (
    parts.indent.length +
    parts.selection.length +
    parts.expand.length +
    parts.icon.length +
    parts.name.length +
    parts.hint.length
  );
}

/**
 * Render row with width constraint, truncating name if necessary
 */
export function renderRowWithMaxWidth(
  node: TreeNode,
  state: RowState,
  theme: Theme,
  maxWidth: number
): RenderedRow {
  const parts = renderTreeRowParts(node, state, theme);

  // Calculate how much space we have for the name
  const fixedWidth =
    parts.indent.length +
    parts.selection.length +
    parts.expand.length +
    parts.icon.length +
    parts.hint.length;

  const availableForName = maxWidth - fixedWidth;

  if (availableForName <= 0) {
    // Extreme case: not enough space for anything
    return parts;
  }

  if (parts.name.length > availableForName) {
    // Truncate name
    const truncatedName = truncateWithEllipsis(parts.name, availableForName);
    return {
      ...parts,
      name: truncatedName,
      fullLine:
        parts.indent +
        parts.selection +
        parts.expand +
        parts.icon +
        truncatedName +
        parts.hint,
    };
  }

  return parts;
}

/**
 * Render summary bar for file selection
 */
export function renderSummaryBar(data: SummaryData): string {
  const { selectedCount, totalCount, hiddenCount } = data;
  let bar = `✔ ${selectedCount} / ${totalCount} files selected`;

  if (hiddenCount > 0) {
    bar += ` · ${hiddenCount} hidden`;
  }

  bar += ' · press [R] to review selection';

  return bar;
}

/**
 * Render compact summary (for step transition)
 */
export function renderCompactSummary(data: SummaryData): string {
  const { selectedCount, totalCount, hiddenCount } = data;
  let summary = `✔ ${selectedCount} / ${totalCount} files selected`;

  if (hiddenCount > 0) {
    summary += ` · ${hiddenCount} hidden`;
  }

  return summary;
}

/**
 * Build parent "last" tracking for tree lines
 * This helper creates the parentLasts array for proper tree drawing
 */
export function buildParentLasts(
  node: TreeNode,
  siblingIndex: number,
  totalSiblings: number,
  parentLasts: boolean[]
): boolean[] {
  const isLast = siblingIndex === totalSiblings - 1;
  return [...parentLasts, isLast];
}

/**
 * Flatten tree with parent tracking for proper tree line rendering
 */
export interface FlatNode {
  node: TreeNode;
  isLast: boolean;
  parentLasts: boolean[];
}

export function flattenTreeWithLines(
  root: TreeNode,
  expanded: Set<string>
): FlatNode[] {
  const result: FlatNode[] = [];

  const traverse = (
    node: TreeNode,
    isLast: boolean,
    parentLasts: boolean[]
  ) => {
    result.push({ node, isLast, parentLasts });

    if (!node.isFile && expanded.has(node.fullPath)) {
      const children = node.children;
      const newParentLasts = [...parentLasts, isLast];

      children.forEach((child, index) => {
        const childIsLast = index === children.length - 1;
        traverse(child, childIsLast, newParentLasts);
      });
    }
  };

  // Process root's children
  const children = root.children;
  children.forEach((child, index) => {
    const isLast = index === children.length - 1;
    traverse(child, isLast, []);
  });

  return result;
}

/**
 * Navigation keybinding hints
 */
export const NAVIGATION_HELP = {
  up: '↑',
  down: '↓',
  left: '←',
  right: '→',
  space: 'Space',
  enter: 'Enter',
  quit: 'Q',
  hide: 'H',
  review: 'R',
} as const;

/**
 * Format keybinding help line
 */
export function formatHelpLine(): string {
  return `${NAVIGATION_HELP.up}${NAVIGATION_HELP.down} Navigate  ${NAVIGATION_HELP.left}${NAVIGATION_HELP.right} Collapse/Expand  ${NAVIGATION_HELP.space} Toggle  ${NAVIGATION_HELP.enter} Confirm  ${NAVIGATION_HELP.quit} Quit  ${NAVIGATION_HELP.hide} Show/Hide  ${NAVIGATION_HELP.review} Review`;
}
