import React, { useReducer, useMemo, useEffect, useCallback } from 'react';
import { Box, Text, useInput, useApp, useStdout } from 'ink';
import type { FileInfo } from '../core/types.js';
import { getUserSetting, setUserSetting } from '../core/userSettings.js';
import {
  type TreeNode,
  type RowState,
  type FlatNode,
  renderTreeRowParts,
  renderRowWithMaxWidth,
  flattenTreeWithLines,
  renderCompactSummary,
} from './TreeRenderer.js';
import {
  defaultTheme,
  getFileColor,
  type Theme,
} from '../theme/index.js';

interface CustomTreeSelectProps {
  files: readonly FileInfo[];
  onComplete: (selectedPaths: string[]) => void;
}

// Step in the interactive flow
type Step = 'select' | 'confirm';

// State type for the reducer
interface TreeSelectState {
  expanded: Set<string>;
  selected: Set<string>;
  cursor: number;
  showExcluded: boolean;
  settingsLoaded: boolean;
  step: Step;
  reviewMode: boolean;
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
  | { type: 'SET_STEP'; payload: Step }
  | { type: 'TOGGLE_REVIEW_MODE' };

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

    case 'SET_STEP':
      return { ...state, step: action.payload };

    case 'TOGGLE_REVIEW_MODE':
      return { ...state, reviewMode: !state.reviewMode };

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
  const theme: Theme = defaultTheme;
  const { stdout } = useStdout();
  const terminalWidth = stdout?.columns ?? 80;

  // Initialize state with useReducer
  const [state, dispatch] = useReducer(treeSelectReducer, {
    expanded: new Set(['.']),
    selected: new Set(files.filter(f => f.isDefaultIncluded).map(f => f.relativePath)),
    cursor: 0,
    showExcluded: true,
    settingsLoaded: false,
    step: 'select',
    reviewMode: false,
  });

  const { expanded, selected, cursor, showExcluded, settingsLoaded, step, reviewMode } = state;

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

  // Flatten tree with proper line tracking
  const flatNodes: FlatNode[] = useMemo(
    () => flattenTreeWithLines(showExcluded ? tree : filteredTree, expanded),
    [tree, filteredTree, expanded, showExcluded]
  );

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
    // Handle confirm step inputs
    if (step === 'confirm' && !reviewMode) {
      if (input === 'r' || input === 'R') {
        dispatch({ type: 'TOGGLE_REVIEW_MODE' });
        return;
      }
      if (key.return) {
        // Final confirm - complete selection
        onComplete(Array.from(selected));
        exit();
        return;
      }
      if (input === 'q' || input === 'Q') {
        onComplete([]);
        exit();
        return;
      }
      return;
    }

    // Handle tree selection inputs (select step or review mode)
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
      if (reviewMode) {
        // Exit review mode back to confirm step
        dispatch({ type: 'TOGGLE_REVIEW_MODE' });
      } else {
        // Move to confirm step
        dispatch({ type: 'SET_STEP', payload: 'confirm' });
      }
      return;
    }
  });

  // Render a single tree row with colors
  const renderRow = (flatNode: FlatNode, index: number) => {
    const { node, isLast, parentLasts } = flatNode;
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
      parentLasts,
    };

    // Render with width constraint
    const parts = renderRowWithMaxWidth(node, rowState, theme, terminalWidth - 2);

    // Determine colors
    const selectionColor = isFullySelected
      ? theme.colors.selected
      : isPartiallySelected
        ? theme.colors.partiallySelected
        : theme.colors.unselected;

    const nameColor = isCursor
      ? theme.colors.cursor
      : node.isFile
        ? getFileColor(node.name, theme)
        : theme.colors.folder;

    const nameBold = isCursor || !node.isFile;
    const nameItalic = node.isFile && parts.hint.includes('test');

    return (
      <Box key={node.fullPath} flexDirection="row">
        <Text dimColor>{parts.indent}</Text>
        <Text color={selectionColor}>{parts.selection}</Text>
        <Text dimColor>{parts.expand}</Text>
        <Text>{parts.icon}</Text>
        <Text color={nameColor} bold={nameBold} italic={nameItalic}>
          {parts.name}
        </Text>
        <Text dimColor>{parts.hint}</Text>
      </Box>
    );
  };

  // Render the file tree
  const renderTree = () => {
    return flatNodes.map((flatNode, index) => renderRow(flatNode, index));
  };

  // Render summary bar
  const renderSummary = () => {
    const hiddenCount = showExcluded ? 0 : files.length - filteredFiles.length;
    const summary = renderCompactSummary({
      selectedCount: selected.size,
      totalCount: files.length,
      hiddenCount,
    });

    return (
      <Box marginTop={1} flexDirection="column">
        <Text dimColor>{'─'.repeat(Math.min(60, terminalWidth - 4))}</Text>
        <Box>
          <Text bold color="green">
            {summary}
          </Text>
        </Box>
        <Text dimColor>
          {showExcluded ? 'Showing all files' : 'Excluded files hidden'}
        </Text>
      </Box>
    );
  };

  // Render confirm step (summary bar only)
  if (step === 'confirm' && !reviewMode) {
    const hiddenCount = showExcluded ? 0 : files.length - filteredFiles.length;
    const summary = renderCompactSummary({
      selectedCount: selected.size,
      totalCount: files.length,
      hiddenCount,
    });

    return (
      <Box flexDirection="column">
        <Box marginBottom={1} flexDirection="column">
          <Text bold color="cyan">
            Step 2: Confirm Selection
          </Text>
        </Box>

        <Box marginBottom={1} flexDirection="column" paddingLeft={1}>
          <Text bold color="green">
            {summary}
          </Text>
          <Text dimColor>Press [R] to review selection</Text>
        </Box>

        <Box marginTop={1} flexDirection="column">
          <Text dimColor>
            ─────────────────────────────────────────────────────
          </Text>
          <Text dimColor>
            Enter Confirm    R Review    Q Quit
          </Text>
        </Box>
      </Box>
    );
  }

  // Render full tree view (select step or review mode)
  return (
    <Box flexDirection="column">
      <Box marginBottom={1} flexDirection="column">
        <Text bold color="cyan">
          {reviewMode ? 'Review Selection' : 'Step 1: Select Files'}
        </Text>
      </Box>

      <Box marginBottom={1} flexDirection="column">
        <Text dimColor>
          ↑↓ Navigate    ←→ Collapse/Expand    Space Toggle
        </Text>
        <Text dimColor>
          Enter {reviewMode ? 'Done' : 'Confirm'}    Q Quit    H Show/Hide
        </Text>
      </Box>

      <Box flexDirection="column" paddingBottom={1}>
        {renderTree()}
      </Box>

      {renderSummary()}
    </Box>
  );
};
