/**
 * @module components/CustomTreeSelect
 *
 * Interactive file tree selection component for terminal UI.
 *
 * ARCHITECTURE:
 * This component uses a reducer-based state management pattern with clear separation:
 * 1. State Model - TreeSelectState holds all UI state (selection, cursor, expansion)
 * 2. Actions - Typed actions describe all possible state transitions
 * 3. Reducer - Pure function that computes new state from actions
 * 4. Input Handling - useInput hook maps keyboard events to actions
 * 5. Rendering - Converts state to React elements using theme system
 *
 * KEY DESIGN DECISIONS:
 * - Reducer pattern for predictable state management (vs multiple useState)
 * - Flat list rendering from tree (flatNodes) for keyboard navigation
 * - Cursor bounds automatically adjusted when tree structure changes
 * - User preferences persisted (showExcluded setting)
 * - Two modes: tree selection and summary confirmation
 *
 * STATE FLOW:
 * files[] -> buildTreeStructure() -> TreeNode hierarchy
 * TreeNode + expanded Set -> flattenTree() -> FlatNode[] for rendering
 * User input -> dispatch(action) -> reducer -> new state -> re-render
 *
 * EXTENDING THIS COMPONENT:
 * - Add new action type to TreeSelectAction
 * - Handle action in treeSelectReducer
 * - Dispatch action from useInput handler or callback
 * - Keep rendering logic separate from state logic
 */

import React, { useReducer, useMemo, useEffect, useCallback, useState } from 'react';
import { Box, Text, useInput, useApp, useStdout } from 'ink';
import type { FileInfo } from '../core/types.js';
import { getUserSetting, setUserSetting, getTreeViewState, setTreeViewState } from '../core/userSettings.js';
import { defaultTheme, type TreeTheme } from '../core/treeTheme.js';
import {
  renderTreeRowParts,
  getRowStyling,
  formatSummaryBar,
  calculateMaxNameWidth,
  DEFAULT_COLUMN_WIDTHS,
  type TreeNode,
  type RowState,
} from '../core/treeRenderer.js';
import { getFileIconInfo, getFolderIconInfo } from '../core/fileIcons.js';

interface CustomTreeSelectProps {
  files: readonly FileInfo[];
  onComplete: (selectedPaths: string[]) => void;
  rootPath?: string;  // Root path for persisting tree state
}

// State type for the reducer
interface TreeSelectState {
  expanded: Set<string>;
  selected: Set<string>;
  cursor: number;
  showExcluded: boolean;
  settingsLoaded: boolean;
  viewportOffset: number;  // First visible row in the viewport
}

// Action types for the reducer
type TreeSelectAction =
  | { type: 'SET_EXPANDED'; payload: Set<string> }
  | { type: 'EXPAND_NODE'; payload: string }
  | { type: 'COLLAPSE_NODE'; payload: string }
  | { type: 'EXPAND_ALL'; payload: string[] }
  | { type: 'COLLAPSE_ALL' }
  | { type: 'SET_SELECTED'; payload: Set<string> }
  | { type: 'TOGGLE_FILE'; payload: string }
  | { type: 'SELECT_FILES'; payload: string[] }
  | { type: 'DESELECT_FILES'; payload: string[] }
  | { type: 'SELECT_ALL'; payload: string[] }
  | { type: 'DESELECT_ALL' }
  | { type: 'SET_CURSOR'; payload: number }
  | { type: 'MOVE_CURSOR_UP' }
  | { type: 'MOVE_CURSOR_DOWN'; payload: { maxIndex: number } }
  | { type: 'SET_SHOW_EXCLUDED'; payload: boolean }
  | { type: 'TOGGLE_SHOW_EXCLUDED' }
  | { type: 'SET_SETTINGS_LOADED'; payload: boolean }
  | { type: 'BOUND_CURSOR'; payload: { maxIndex: number } }
  | { type: 'SET_VIEWPORT_OFFSET'; payload: number };

// Reducer function to manage complex state
function treeSelectReducer(state: TreeSelectState, action: TreeSelectAction): TreeSelectState {
  switch (action.type) {
    case 'SET_EXPANDED':
      return { ...state, expanded: action.payload };

    case 'EXPAND_NODE': {
      const newExpanded = new Set(state.expanded);
      newExpanded.add(action.payload);
      return { ...state, expanded: newExpanded };
    }

    case 'COLLAPSE_NODE': {
      const newExpanded = new Set(state.expanded);
      newExpanded.delete(action.payload);
      return { ...state, expanded: newExpanded };
    }

    case 'EXPAND_ALL': {
      const newExpanded = new Set(state.expanded);
      action.payload.forEach(path => newExpanded.add(path));
      return { ...state, expanded: newExpanded };
    }

    case 'COLLAPSE_ALL': {
      // Keep root expanded, collapse everything else
      return { ...state, expanded: new Set(['.']) };
    }

    case 'SET_SELECTED':
      return { ...state, selected: action.payload };

    case 'TOGGLE_FILE': {
      const newSelected = new Set(state.selected);
      if (newSelected.has(action.payload)) {
        newSelected.delete(action.payload);
      } else {
        newSelected.add(action.payload);
      }
      return { ...state, selected: newSelected };
    }

    case 'SELECT_FILES': {
      const newSelected = new Set(state.selected);
      action.payload.forEach(f => newSelected.add(f));
      return { ...state, selected: newSelected };
    }

    case 'DESELECT_FILES': {
      const newSelected = new Set(state.selected);
      action.payload.forEach(f => newSelected.delete(f));
      return { ...state, selected: newSelected };
    }

    case 'SELECT_ALL': {
      return { ...state, selected: new Set(action.payload) };
    }

    case 'DESELECT_ALL': {
      return { ...state, selected: new Set() };
    }

    case 'SET_CURSOR':
      return { ...state, cursor: action.payload };

    case 'MOVE_CURSOR_UP':
      return { ...state, cursor: Math.max(0, state.cursor - 1) };

    case 'MOVE_CURSOR_DOWN':
      return { ...state, cursor: Math.min(action.payload.maxIndex, state.cursor + 1) };

    case 'SET_SHOW_EXCLUDED':
      return { ...state, showExcluded: action.payload };

    case 'TOGGLE_SHOW_EXCLUDED':
      return { ...state, showExcluded: !state.showExcluded };

    case 'SET_SETTINGS_LOADED':
      return { ...state, settingsLoaded: action.payload };

    case 'BOUND_CURSOR': {
      if (action.payload.maxIndex < 0) {
        return state.cursor !== 0 ? { ...state, cursor: 0 } : state;
      }
      const boundedCursor = Math.min(state.cursor, action.payload.maxIndex);
      return boundedCursor !== state.cursor ? { ...state, cursor: boundedCursor } : state;
    }

    case 'SET_VIEWPORT_OFFSET':
      return { ...state, viewportOffset: Math.max(0, action.payload) };

    default:
      return state;
  }
}

/**
 * Build a hierarchical tree structure from flat file list
 */
function buildTreeStructure(files: readonly FileInfo[]): TreeNode {
  const root: TreeNode = {
    name: '.',
    fullPath: '.',
    isFile: false,
    children: [],
    depth: 0,
  };

  // Create a map for quick lookup
  const nodeMap = new Map<string, TreeNode>();
  nodeMap.set('.', root);

  // Sort files by path to ensure parent directories are processed first
  const sortedFiles = [...files].sort((a, b) =>
    a.relativePath.localeCompare(b.relativePath)
  );

  for (const file of sortedFiles) {
    const parts = file.relativePath.split('/').filter(Boolean);
    let currentPath = '';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!part) {
        continue;
      }

      const parentPath = currentPath || '.';
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const isFile = i === parts.length - 1;

      if (!nodeMap.has(currentPath)) {
        const node: TreeNode = {
          name: part,
          fullPath: currentPath,
          isFile,
          children: [],
          depth: i + 1,
        };

        const parent = nodeMap.get(parentPath);
        if (parent) {
          parent.children.push(node);
        }
        nodeMap.set(currentPath, node);
      }
    }
  }

  // Sort children: directories first, then alphabetically
  const sortChildren = (node: TreeNode) => {
    node.children.sort((a, b) => {
      if (a.isFile !== b.isFile) {
        return a.isFile ? 1 : -1;
      }
      return a.name.localeCompare(b.name);
    });
    node.children.forEach(sortChildren);
  };
  sortChildren(root);

  return root;
}

/**
 * Flatten tree to a list of nodes for navigation, with parent tracking
 */
interface FlatNode {
  node: TreeNode;
  isLast: boolean;
  parentIsLast: boolean[];
}

function flattenTree(node: TreeNode, expanded: Set<string>): FlatNode[] {
  const result: FlatNode[] = [];

  const traverse = (n: TreeNode, parentIsLast: boolean[]) => {
    const children = n.children;

    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (!child) {
        continue;
      }

      const childIsLast = i === children.length - 1;
      result.push({
        node: child,
        isLast: childIsLast,
        parentIsLast: [...parentIsLast],
      });

      if (!child.isFile && expanded.has(child.fullPath)) {
        traverse(child, [...parentIsLast, childIsLast]);
      }
    }
  };

  // Start with root's children
  traverse(node, []);
  return result;
}

/**
 * Get all file paths under a node (recursively)
 */
function getAllFilesUnder(node: TreeNode): string[] {
  const files: string[] = [];

  const traverse = (n: TreeNode) => {
    if (n.isFile) {
      files.push(n.fullPath);
    } else {
      n.children.forEach(traverse);
    }
  };

  traverse(node);
  return files;
}

/**
 * Check if all children of a node are selected
 */
function areAllChildrenSelected(node: TreeNode, selected: Set<string>): boolean {
  if (node.isFile) {
    return selected.has(node.fullPath);
  }

  const allFiles = getAllFilesUnder(node);
  return allFiles.length > 0 && allFiles.every(f => selected.has(f));
}

/**
 * Check if some (but not all) children are selected
 */
function areSomeChildrenSelected(node: TreeNode, selected: Set<string>): boolean {
  if (node.isFile) {
    return false;
  }

  const allFiles = getAllFilesUnder(node);
  const selectedCount = allFiles.filter(f => selected.has(f)).length;
  return selectedCount > 0 && selectedCount < allFiles.length;
}

export const CustomTreeSelect: React.FC<CustomTreeSelectProps> = ({ files, onComplete, rootPath }) => {
  // Build tree structure once from flat file list
  // This is memoized because tree building is O(n*m) where m is path depth
  const tree = useMemo(() => buildTreeStructure(files), [files]);
  const theme: TreeTheme = defaultTheme;

  // Blinking cursor state for better visibility
  const [cursorVisible, setCursorVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setCursorVisible(prev => !prev);
    }, 500); // Blink every 500ms

    return () => clearInterval(interval);
  }, []);

  // Track terminal dimensions for responsive rendering
  // This ensures long file names don't break the layout when terminal is resized
  // and that we don't render more rows than can fit on screen
  const { stdout } = useStdout();
  const [terminalWidth, setTerminalWidth] = useState(stdout?.columns || 80);
  const [terminalHeight, setTerminalHeight] = useState(stdout?.rows || 24);

  useEffect(() => {
    const handleResize = () => {
      if (stdout?.columns) {
        setTerminalWidth(stdout.columns);
      }
      if (stdout?.rows) {
        setTerminalHeight(stdout.rows);
      }
    };

    stdout?.on('resize', handleResize);
    return () => {
      stdout?.off('resize', handleResize);
    };
  }, [stdout]);

  // State management with useReducer for predictable updates
  // We use a reducer instead of multiple useState calls because:
  // 1. State changes are complex (toggle selection affects multiple values)
  // 2. Actions are typed and self-documenting
  // 3. Easier to debug (all state transitions go through reducer)
  const [state, dispatch] = useReducer(treeSelectReducer, {
    expanded: new Set(['.']),  // Root is always expanded
    selected: new Set(files.filter(f => f.isDefaultIncluded).map(f => f.relativePath)),
    cursor: 0,
    showExcluded: true,  // Show all files by default, user can filter
    settingsLoaded: false,  // Track if we've loaded persisted settings
    viewportOffset: 0,  // Start at the top of the tree
  });

  const { expanded, selected, cursor, showExcluded, settingsLoaded, viewportOffset } = state;

  // Load persisted setting on mount
  useEffect(() => {
    getUserSetting('showExcludedFiles').then(value => {
      if (value !== undefined) {
        dispatch({ type: 'SET_SHOW_EXCLUDED', payload: value });
      }
      dispatch({ type: 'SET_SETTINGS_LOADED', payload: true });
    }).catch(() => {
      dispatch({ type: 'SET_SETTINGS_LOADED', payload: true });
    });
  }, []);

  // Load persisted tree view state on mount
  useEffect(() => {
    if (rootPath) {
      getTreeViewState(rootPath).then(state => {
        if (state.expanded && state.expanded.length > 0) {
          dispatch({ type: 'SET_EXPANDED', payload: new Set(state.expanded) });
        }
        if (state.selected && state.selected.length > 0) {
          dispatch({ type: 'SET_SELECTED', payload: new Set(state.selected) });
        }
      }).catch(() => {
        // Silently ignore errors
      });
    }
  }, [rootPath]);

  // Save setting when it changes (after initial load)
  useEffect(() => {
    if (settingsLoaded) {
      setUserSetting('showExcludedFiles', showExcluded).catch(() => {
        // Silently ignore save errors
      });
    }
  }, [showExcluded, settingsLoaded]);

  // Filter files based on showExcluded state
  const filteredFiles = useMemo(() => {
    if (showExcluded) {
      return files;
    }
    return files.filter(f => f.isDefaultIncluded);
  }, [files, showExcluded]);

  // Build tree from filtered files
  const filteredTree = useMemo(() => buildTreeStructure(filteredFiles), [filteredFiles]);

  // Flatten tree based on expansion state
  const flatNodes = useMemo(() => flattenTree(showExcluded ? tree : filteredTree, expanded), [tree, filteredTree, expanded, showExcluded]);

  // Ensure cursor stays in bounds when flatNodes changes
  // This can happen when:
  // 1. User collapses a directory and cursor was on a child
  // 2. User toggles showExcluded and fewer nodes are visible
  // 3. Tree structure changes due to external update
  const boundedCursor = useMemo(() => {
    if (flatNodes.length === 0) {
      return 0;
    }
    return Math.min(cursor, flatNodes.length - 1);
  }, [cursor, flatNodes.length]);

  // Sync cursor state if it needs adjustment (only when actually out of bounds)
  // We intentionally don't include `cursor` in deps because:
  // 1. We only want to sync when boundedCursor changes
  // 2. Adding cursor would cause infinite loops
  // 3. This is a derived state correction, not a reactive effect
  useEffect(() => {
    if (boundedCursor !== cursor) {
      dispatch({ type: 'SET_CURSOR', payload: boundedCursor });
    }
  }, [boundedCursor]); // eslint-disable-line react-hooks/exhaustive-deps

  // Calculate viewport dimensions
  // Reserve space for: header (2 lines), help text (2 lines), footer (2 lines)
  // Additional buffer for terminal overlays (e.g., Warp sticky header ~200px ≈ 10 lines)
  const RESERVED_LINES = 6;
  const TERMINAL_OVERLAY_BUFFER = 10;
  const maxVisibleRows = Math.max(5, terminalHeight - RESERVED_LINES - TERMINAL_OVERLAY_BUFFER);

  // Calculate viewport boundaries to keep cursor visible
  // We try to keep the cursor in the middle of the viewport for better context
  const viewportStart = useMemo(() => {
    const halfViewport = Math.floor(maxVisibleRows / 2);

    // If cursor is near the top, show from beginning
    if (cursor < halfViewport) {
      return 0;
    }

    // If cursor is near the end, show the last page
    if (cursor >= flatNodes.length - halfViewport) {
      return Math.max(0, flatNodes.length - maxVisibleRows);
    }

    // Otherwise, center the cursor in the viewport
    return cursor - halfViewport;
  }, [cursor, flatNodes.length, maxVisibleRows]);

  // Auto-adjust viewport offset when cursor moves
  useEffect(() => {
    if (viewportStart !== viewportOffset) {
      dispatch({ type: 'SET_VIEWPORT_OFFSET', payload: viewportStart });
    }
  }, [viewportStart, viewportOffset]);

  // Calculate visible nodes slice
  const visibleNodes = useMemo(() => {
    return flatNodes.slice(viewportOffset, viewportOffset + maxVisibleRows);
  }, [flatNodes, viewportOffset, maxVisibleRows]);

  // Calculate scroll indicators
  const hasMoreAbove = viewportOffset > 0;
  const hasMoreBelow = viewportOffset + maxVisibleRows < flatNodes.length;
  const itemsAbove = viewportOffset;
  const itemsBelow = flatNodes.length - (viewportOffset + maxVisibleRows);

  const { exit } = useApp();

  // Handle directory toggle (select all or deselect all children)
  // Behavior: If all children selected -> deselect all, otherwise -> select all
  // This provides a "tri-state" checkbox experience common in file managers
  const handleDirectoryToggle = useCallback((node: TreeNode) => {
    const allFiles = getAllFilesUnder(node);
    const allSelected = allFiles.every(f => selected.has(f));

    if (allSelected) {
      dispatch({ type: 'DESELECT_FILES', payload: allFiles });
    } else {
      dispatch({ type: 'SELECT_FILES', payload: allFiles });
    }
  }, [selected]);

  useInput((input, key) => {
    if (input === 'q' || input === 'Q') {
      onComplete([]);
      exit();
      return;
    }

    // Toggle showing/hiding excluded and gitignored files with H (Shift+h)
    if (input === 'H') {
      dispatch({ type: 'TOGGLE_SHOW_EXCLUDED' });
      return;
    }

    // Toggle All Selection with 'A' or 'a'
    if (input === 'a' || input === 'A') {
      const allFilePaths = filteredFiles.map(f => f.relativePath);
      if (selected.size === allFilePaths.length) {
        // All selected, deselect all
        dispatch({ type: 'DESELECT_ALL' });
      } else {
        // Select all
        dispatch({ type: 'SELECT_ALL', payload: allFilePaths });
      }
      return;
    }

    // Expand All with 'E'
    if (input === 'E') {
      const allDirPaths: string[] = [];
      const traverse = (node: TreeNode) => {
        if (!node.isFile) {
          allDirPaths.push(node.fullPath);
        }
        node.children.forEach(traverse);
      };
      traverse(showExcluded ? tree : filteredTree);
      dispatch({ type: 'EXPAND_ALL', payload: allDirPaths });
      return;
    }

    // Collapse All with 'C'
    if (input === 'C') {
      dispatch({ type: 'COLLAPSE_ALL' });
      return;
    }

    if (key.upArrow) {
      dispatch({ type: 'MOVE_CURSOR_UP' });
      return;
    }

    if (key.downArrow) {
      dispatch({ type: 'MOVE_CURSOR_DOWN', payload: { maxIndex: flatNodes.length - 1 } });
      return;
    }

    if (key.rightArrow) {
      // Expand directory
      const flatNode = flatNodes[cursor];
      if (flatNode && !flatNode.node.isFile) {
        dispatch({ type: 'EXPAND_NODE', payload: flatNode.node.fullPath });
      }
      return;
    }

    if (key.leftArrow) {
      // Collapse directory
      const flatNode = flatNodes[cursor];
      if (flatNode && !flatNode.node.isFile) {
        dispatch({ type: 'COLLAPSE_NODE', payload: flatNode.node.fullPath });
      }
      return;
    }

    if (input === ' ') {
      // Toggle selection
      const flatNode = flatNodes[cursor];
      if (!flatNode) {
        return;
      }

      if (flatNode.node.isFile) {
        // Toggle single file
        dispatch({ type: 'TOGGLE_FILE', payload: flatNode.node.fullPath });
      } else {
        // Toggle directory and all children
        handleDirectoryToggle(flatNode.node);
      }
      return;
    }

    if (key.return) {
      // Save tree view state before exiting
      if (rootPath) {
        setTreeViewState(rootPath, Array.from(expanded), Array.from(selected)).catch(() => {
          // Silently ignore save errors
        });
      }
      // Complete selection immediately
      onComplete(Array.from(selected));
      exit();
      return;
    }
  });

  // Render a single tree row using the theme system
  const renderTreeRow = (flatNode: FlatNode, viewportIndex: number) => {
    const { node, isLast, parentIsLast } = flatNode;
    // Calculate the actual index in the full flatNodes array
    const actualIndex = viewportOffset + viewportIndex;
    const isCursor = actualIndex === cursor;
    const isExpanded = expanded.has(node.fullPath);
    const isFullySelected = node.isFile
      ? selected.has(node.fullPath)
      : areAllChildrenSelected(node, selected);
    const isPartiallySelected = !node.isFile && areSomeChildrenSelected(node, selected);

    const rowState: RowState = {
      isSelected: isFullySelected,
      isPartiallySelected,
      isExpanded,
      isCursor,
      isLast,
      parentIsLast,
    };

    // Get icon info for styling
    const iconInfo = node.isFile
      ? getFileIconInfo(node.name)
      : getFolderIconInfo(isExpanded);

    // Calculate max name width based on terminal width
    const maxNameWidth = calculateMaxNameWidth(
      terminalWidth,
      node.depth,
      DEFAULT_COLUMN_WIDTHS,
      iconInfo.hint ? iconInfo.hint.length + 3 : 0
    );

    const parts = renderTreeRowParts(node, rowState, theme, DEFAULT_COLUMN_WIDTHS, maxNameWidth);
    const styling = getRowStyling(node, rowState, iconInfo, theme);

    // Show blinking cursor indicator for better visibility
    const cursorIndicator = isCursor && cursorVisible ? '❯ ' : '  ';

    return (
      <Box key={node.fullPath} flexDirection="row">
        <Text color="cyanBright" bold>{cursorIndicator}</Text>
        <Text dimColor>{parts.indent}</Text>
        <Text color={styling.selectionColor}>{parts.selection}</Text>
        <Text color={styling.iconColor}>{parts.expandMarker}</Text>
        <Text color={styling.nameColor} bold={styling.nameBold}>
          {parts.name}
        </Text>
        <Text dimColor>{parts.hint}</Text>
      </Box>
    );
  };

  // Render tree view with viewport
  const renderTreeView = () => {
    const rows = [];

    // Show scroll indicator at top if there are items above
    if (hasMoreAbove) {
      rows.push(
        <Box key="scroll-up" flexDirection="row">
          <Text color="gray" dimColor>  ↑ {itemsAbove} more above...</Text>
        </Box>
      );
    }

    // Render visible nodes
    rows.push(...visibleNodes.map((flatNode, index) => renderTreeRow(flatNode, index)));

    // Show scroll indicator at bottom if there are items below
    if (hasMoreBelow) {
      rows.push(
        <Box key="scroll-down" flexDirection="row">
          <Text color="gray" dimColor>  ↓ {itemsBelow} more below...</Text>
        </Box>
      );
    }

    return rows;
  };

  // Calculate hidden count
  const hiddenCount = showExcluded ? 0 : files.length - filteredFiles.length;

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="cyanBright">● Step 1/3 · File Selection</Text>
      </Box>

      <Box marginBottom={1}>
        <Text color="gray">
          <Text color="blueBright">↑↓</Text> navigate  <Text color="blueBright">←→</Text> expand/collapse  <Text color="blueBright">Space</Text> select  <Text color="blueBright">A</Text> toggle all  <Text color="blueBright">E</Text> expand all  <Text color="blueBright">C</Text> collapse all  <Text color="blueBright">H</Text> filter  <Text color="blueBright">Enter</Text> continue  <Text color="blueBright">Q</Text> quit
        </Text>
      </Box>

      <Box flexDirection="column" paddingBottom={1}>
        {renderTreeView()}
      </Box>

      <Box marginTop={1} borderStyle="round" borderColor="gray" paddingX={1}>
        <Text color="greenBright" bold>{selected.size}</Text>
        <Text color="gray"> / </Text>
        <Text color="blueBright">{files.length}</Text>
        <Text color="gray"> files selected</Text>
        {hiddenCount > 0 && (
          <Text color="yellowBright"> · {hiddenCount} hidden</Text>
        )}
        <Text color="gray"> · </Text>
        <Text color="cyanBright">{showExcluded ? 'showing all' : 'filtered'}</Text>
      </Box>
    </Box>
  );
};
