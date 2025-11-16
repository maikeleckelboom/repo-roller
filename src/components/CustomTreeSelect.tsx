import React, { useReducer, useMemo, useEffect, useCallback, useState } from 'react';
import { Box, Text, useInput, useApp, useStdout } from 'ink';
import type { FileInfo } from '../core/types.js';
import { getUserSetting, setUserSetting } from '../core/userSettings.js';
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
}

// State type for the reducer
interface TreeSelectState {
  expanded: Set<string>;
  selected: Set<string>;
  cursor: number;
  showExcluded: boolean;
  settingsLoaded: boolean;
  mode: 'tree' | 'summary';
}

// Action types for the reducer
type TreeSelectAction =
  | { type: 'SET_EXPANDED'; payload: Set<string> }
  | { type: 'EXPAND_NODE'; payload: string }
  | { type: 'COLLAPSE_NODE'; payload: string }
  | { type: 'SET_SELECTED'; payload: Set<string> }
  | { type: 'TOGGLE_FILE'; payload: string }
  | { type: 'SELECT_FILES'; payload: string[] }
  | { type: 'DESELECT_FILES'; payload: string[] }
  | { type: 'SET_CURSOR'; payload: number }
  | { type: 'MOVE_CURSOR_UP' }
  | { type: 'MOVE_CURSOR_DOWN'; payload: { maxIndex: number } }
  | { type: 'SET_SHOW_EXCLUDED'; payload: boolean }
  | { type: 'TOGGLE_SHOW_EXCLUDED' }
  | { type: 'SET_SETTINGS_LOADED'; payload: boolean }
  | { type: 'BOUND_CURSOR'; payload: { maxIndex: number } }
  | { type: 'SET_MODE'; payload: 'tree' | 'summary' };

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

    case 'SET_MODE':
      return { ...state, mode: action.payload };

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
    const isLast = false; // Will be updated below
    const children = n.children;

    for (let i = 0; i < children.length; i++) {
      const child = children[i];
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

export const CustomTreeSelect: React.FC<CustomTreeSelectProps> = ({ files, onComplete }) => {
  const tree = useMemo(() => buildTreeStructure(files), [files]);
  const theme: TreeTheme = defaultTheme;

  // Get terminal width for responsive truncation
  const { stdout } = useStdout();
  const [terminalWidth, setTerminalWidth] = useState(stdout?.columns || 80);

  useEffect(() => {
    const handleResize = () => {
      if (stdout?.columns) {
        setTerminalWidth(stdout.columns);
      }
    };

    stdout?.on('resize', handleResize);
    return () => {
      stdout?.off('resize', handleResize);
    };
  }, [stdout]);

  // Initialize state with useReducer
  const [state, dispatch] = useReducer(treeSelectReducer, {
    expanded: new Set(['.']),
    selected: new Set(files.filter(f => f.isDefaultIncluded).map(f => f.relativePath)),
    cursor: 0,
    showExcluded: true,
    settingsLoaded: false,
    mode: 'tree',
  });

  const { expanded, selected, cursor, showExcluded, settingsLoaded, mode } = state;

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
  const boundedCursor = useMemo(() => {
    if (flatNodes.length === 0) {
      return 0;
    }
    return Math.min(cursor, flatNodes.length - 1);
  }, [cursor, flatNodes.length]);

  // Sync cursor state if it needs adjustment (only when actually out of bounds)
  useEffect(() => {
    if (boundedCursor !== cursor) {
      dispatch({ type: 'SET_CURSOR', payload: boundedCursor });
    }
  }, [boundedCursor]); // eslint-disable-line react-hooks/exhaustive-deps

  const { exit } = useApp();

  // Handle directory toggle (select all or deselect all children)
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

    // Review selection with R (only in summary mode)
    if ((input === 'r' || input === 'R') && mode === 'summary') {
      dispatch({ type: 'SET_MODE', payload: 'tree' });
      return;
    }

    // Toggle showing/hiding excluded and gitignored files with H (Shift+h)
    if (input === 'H' && mode === 'tree') {
      dispatch({ type: 'TOGGLE_SHOW_EXCLUDED' });
      return;
    }

    if (mode === 'tree') {
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
    }

    if (key.return) {
      if (mode === 'tree') {
        // Move to summary mode first
        dispatch({ type: 'SET_MODE', payload: 'summary' });
      } else {
        // Confirm selection from summary mode
        onComplete(Array.from(selected));
        exit();
      }
      return;
    }
  });

  // Render a single tree row using the theme system
  const renderTreeRow = (flatNode: FlatNode, index: number) => {
    const { node, isLast, parentIsLast } = flatNode;
    const isCursor = index === cursor;
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

    return (
      <Box key={node.fullPath} flexDirection="row">
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

  // Render tree view
  const renderTreeView = () => {
    return flatNodes.map((flatNode, index) => renderTreeRow(flatNode, index));
  };

  // Calculate hidden count
  const hiddenCount = showExcluded ? 0 : files.length - filteredFiles.length;

  // Render summary view
  const renderSummaryView = () => {
    const summaryText = formatSummaryBar(selected.size, files.length, hiddenCount);
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text color="green" bold>
          {summaryText}
        </Text>
        <Box marginTop={1}>
          <Text dimColor>Press Enter to confirm or R to review selection</Text>
        </Box>
      </Box>
    );
  };

  if (mode === 'summary') {
    return (
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text bold color="cyan">Confirm Selection</Text>
        </Box>
        {renderSummaryView()}
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="cyan">Select Files</Text>
      </Box>

      <Box marginBottom={1}>
        <Text dimColor>
          ↑↓ navigate · ←→ expand · Space toggle · Enter confirm · Q quit · H filter
        </Text>
      </Box>

      <Box flexDirection="column" paddingBottom={1}>
        {renderTreeView()}
      </Box>

      <Box marginTop={1}>
        <Text bold color="green">{selected.size}</Text>
        <Text dimColor>/</Text>
        <Text color="blue">{files.length}</Text>
        <Text dimColor> selected</Text>
        {hiddenCount > 0 && (
          <Text dimColor> · {hiddenCount} hidden</Text>
        )}
        <Text dimColor> · </Text>
        <Text dimColor>{showExcluded ? 'all files' : 'filtered'}</Text>
      </Box>
    </Box>
  );
};
