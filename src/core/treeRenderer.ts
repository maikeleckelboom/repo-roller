/**
 * @module core/treeRenderer
 *
 * Pure tree row renderer with consistent alignment and theming.
 *
 * OWNS:
 * - Rendering tree node rows (indentation, selection markers, icons)
 * - Column width calculations for alignment
 * - Tree node data structures
 * - Summary bar formatting
 *
 * DOES NOT OWN:
 * - React/Ink rendering (that's CustomTreeSelect.tsx)
 * - Tree building from files (that's CustomTreeSelect.tsx)
 * - User interaction/input handling
 * - Theme definitions (that's treeTheme.ts)
 *
 * DESIGN PRINCIPLES:
 * - Pure functions (no side effects)
 * - Returns string parts, not React elements
 * - Consistent column alignment
 * - Theming via dependency injection
 *
 * TYPICAL USAGE:
 * ```typescript
 * import { renderTreeRowParts, getRowStyling } from './treeRenderer.js';
 *
 * const parts = renderTreeRowParts(node, rowState, theme, columnWidths, maxNameWidth);
 * // parts.indent, parts.selection, parts.expandMarker, parts.name, parts.hint
 * ```
 */

import type { TreeTheme } from './treeTheme.js';
import { getIconString, getCategoryColor, getLanguageColor } from './treeTheme.js';
import { getFileIconInfo, getFolderIconInfo, type FileIconInfo } from './fileIcons.js';
import { env } from './env.js';

/** Tree node representation */
export interface TreeNode {
  name: string;
  fullPath: string;
  isFile: boolean;
  children: TreeNode[];
  depth: number;
}

/** State of a single row for rendering */
export interface RowState {
  isSelected: boolean;
  isPartiallySelected: boolean;
  isExpanded: boolean;
  isCursor: boolean;
  isLast: boolean;
  parentIsLast: boolean[];
}

/** Column widths for alignment */
export interface TreeColumnWidths {
  selection: number;
  expandMarker: number;
  icon: number;
  indent: number;
}

/** Default column widths for modern theme (loaded from environment configuration) */
export const DEFAULT_COLUMN_WIDTHS: TreeColumnWidths = {
  selection: env.treeTheme.columnWidths.selection,
  expandMarker: env.treeTheme.columnWidths.expand,
  icon: env.treeTheme.columnWidths.icon,
  indent: 2, // Two spaces per depth level (fixed for consistent indentation)
};

/** Rendered row parts for composition */
export interface RenderedRowParts {
  indent: string;
  selection: string;
  expandMarker: string;
  icon: string;
  name: string;
  hint: string;
}

/** Styling information for a row */
export interface RowStyling {
  nameColor: string | undefined;
  nameBold: boolean;
  selectionColor: string;
  iconColor: string;
}

/**
 * Calculate the total fixed width (everything except the name)
 */
export function getFixedWidth(depth: number, widths: TreeColumnWidths = DEFAULT_COLUMN_WIDTHS): number {
  return (
    widths.selection +
    widths.expandMarker +
    widths.icon +
    (depth - 1) * widths.indent
  );
}

/**
 * Truncate a string to fit within maxWidth, adding ellipsis if needed
 */
export function truncateName(name: string, maxWidth: number): string {
  if (name.length <= maxWidth) {
    return name;
  }
  if (maxWidth <= 3) {
    return name.substring(0, maxWidth);
  }
  return name.substring(0, maxWidth - 1) + '…';
}

/**
 * Pad a string to a fixed width
 */
export function padToWidth(str: string, width: number): string {
  if (str.length >= width) {
    return str.substring(0, width);
  }
  return str + ' '.repeat(width - str.length);
}

/**
 * Generate indentation string for a given depth
 * Uses tree branch characters for visual hierarchy
 */
export function renderIndent(
  depth: number,
  parentIsLast: boolean[],
  theme: TreeTheme,
  widths: TreeColumnWidths = DEFAULT_COLUMN_WIDTHS
): string {
  if (depth <= 1) {
    return '';
  }

  const parts: string[] = [];
  for (let i = 0; i < depth - 1; i++) {
    if (i < parentIsLast.length && parentIsLast[i]) {
      parts.push(' '.repeat(widths.indent));
    } else {
      parts.push(theme.branches.vertical + ' '.repeat(widths.indent - 1));
    }
  }
  return parts.join('');
}

/**
 * Render selection marker with fixed width
 */
export function renderSelectionMarker(
  isSelected: boolean,
  isPartiallySelected: boolean,
  theme: TreeTheme,
  widths: TreeColumnWidths = DEFAULT_COLUMN_WIDTHS
): string {
  let marker: string;
  if (isSelected) {
    marker = theme.markers.selected;
  } else if (isPartiallySelected) {
    marker = theme.markers.partial;
  } else {
    marker = theme.markers.unselected;
  }
  return padToWidth(marker, widths.selection);
}

/**
 * Render expand/collapse marker with fixed width
 */
export function renderExpandMarker(
  isFile: boolean,
  isExpanded: boolean,
  theme: TreeTheme,
  widths: TreeColumnWidths = DEFAULT_COLUMN_WIDTHS
): string {
  let marker: string;
  if (isFile) {
    marker = theme.markers.leaf;
  } else if (isExpanded) {
    marker = theme.markers.expanded;
  } else {
    marker = theme.markers.collapsed;
  }
  return padToWidth(marker, widths.expandMarker);
}

/**
 * Render file/folder icon with fixed width
 */
export function renderIcon(
  iconInfo: FileIconInfo,
  theme: TreeTheme,
  widths: TreeColumnWidths = DEFAULT_COLUMN_WIDTHS
): string {
  const iconStr = getIconString(iconInfo.iconId, theme);
  return padToWidth(iconStr, widths.icon);
}

/**
 * Get styling information for a row
 */
export function getRowStyling(
  node: TreeNode,
  state: RowState,
  iconInfo: FileIconInfo,
  theme: TreeTheme
): RowStyling {
  // Determine file type color (used for filename when not selected/cursor)
  let fileTypeColor: string;
  if (node.isFile) {
    const langColor = getLanguageColor(iconInfo.iconId, theme);
    if (langColor) {
      fileTypeColor = langColor;
    } else {
      fileTypeColor = getCategoryColor(iconInfo.category, theme);
    }
  } else {
    fileTypeColor = theme.colors.folder;
  }

  // Name color based on state, falling back to file type color
  let nameColor: string | undefined;
  let nameBold = false;

  if (state.isCursor) {
    nameColor = theme.colors.cursor;
    nameBold = true;
  } else if (!node.isFile) {
    // Folders always bold with folder color
    nameColor = theme.colors.folder;
    nameBold = true;
  } else {
    // Files use their type color (TypeScript blue, test magenta, etc.)
    nameColor = fileTypeColor;
    nameBold = false;
  }

  // Icon color (expand/collapse marker color)
  const iconColor = node.isFile ? theme.colors.dim : theme.colors.folder;

  // Selection marker color
  let selectionColor: string;
  if (state.isSelected) {
    selectionColor = theme.colors.selected;
  } else if (state.isPartiallySelected) {
    selectionColor = theme.colors.partial;
  } else {
    selectionColor = theme.colors.unselected;
  }

  return {
    nameColor,
    nameBold,
    selectionColor,
    iconColor,
  };
}

/**
 * Render a single tree row as parts for composition
 * This is a pure function that produces all the string parts needed for rendering
 */
export function renderTreeRowParts(
  node: TreeNode,
  state: RowState,
  theme: TreeTheme,
  widths: TreeColumnWidths = DEFAULT_COLUMN_WIDTHS,
  maxNameWidth?: number
): RenderedRowParts {
  // Get icon information
  const iconInfo = node.isFile
    ? getFileIconInfo(node.name)
    : getFolderIconInfo(state.isExpanded);

  // Render each part
  const indent = renderIndent(node.depth, state.parentIsLast, theme, widths);
  const selection = renderSelectionMarker(
    state.isSelected,
    state.isPartiallySelected,
    theme,
    widths
  );
  const expandMarker = renderExpandMarker(node.isFile, state.isExpanded, theme, widths);
  const icon = renderIcon(iconInfo, theme, widths);

  // Name with optional truncation
  let name = node.name;
  if (maxNameWidth && maxNameWidth > 0) {
    name = truncateName(name, maxNameWidth);
  }

  // Hint suffix
  const hint = iconInfo.hint ? ` · ${iconInfo.hint}` : '';

  return {
    indent,
    selection,
    expandMarker,
    icon,
    name,
    hint,
  };
}

/**
 * Render a complete tree row as a single string (for testing/plain text output)
 */
export function renderTreeRow(
  node: TreeNode,
  state: RowState,
  theme: TreeTheme,
  widths: TreeColumnWidths = DEFAULT_COLUMN_WIDTHS,
  maxNameWidth?: number
): string {
  const parts = renderTreeRowParts(node, state, theme, widths, maxNameWidth);
  return parts.indent + parts.selection + parts.expandMarker + parts.icon + parts.name + parts.hint;
}

/**
 * Format summary bar for selected files
 */
export function formatSummaryBar(
  selectedCount: number,
  totalCount: number,
  hiddenCount = 0
): string {
  const parts: string[] = [];
  parts.push(`✔ ${selectedCount} / ${totalCount} files selected`);
  if (hiddenCount > 0) {
    parts.push(`${hiddenCount} hidden`);
  }
  parts.push('press [R] to review selection');
  return parts.join(' · ');
}

/**
 * Calculate the maximum name width available given terminal width and depth
 */
export function calculateMaxNameWidth(
  terminalWidth: number,
  depth: number,
  widths: TreeColumnWidths = DEFAULT_COLUMN_WIDTHS,
  hintLength = 10 // Reserve space for hints like " · test"
): number {
  const fixedWidth = getFixedWidth(depth, widths);
  const available = terminalWidth - fixedWidth - hintLength;
  return Math.max(10, available); // Minimum 10 chars for name
}
