import React, { useReducer, useMemo, useEffect, useCallback } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import type { FileInfo } from '../core/types.js';
import { getUserSetting, setUserSetting } from '../core/userSettings.js';

interface TreeNode {
  name: string;
  fullPath: string;
  isFile: boolean;
  children: TreeNode[];
  depth: number;
}

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
  | { type: 'BOUND_CURSOR'; payload: { maxIndex: number } };

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
 * Flatten tree to a list of nodes for navigation
 */
function flattenTree(node: TreeNode, expanded: Set<string>): TreeNode[] {
  const result: TreeNode[] = [];

  const traverse = (n: TreeNode) => {
    result.push(n);
    if (!n.isFile && expanded.has(n.fullPath)) {
      n.children.forEach(traverse);
    }
  };

  // Skip root, start with its children
  node.children.forEach(traverse);
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

  // Initialize state with useReducer
  const [state, dispatch] = useReducer(treeSelectReducer, {
    expanded: new Set(['.']),
    selected: new Set(files.filter(f => f.isDefaultIncluded).map(f => f.relativePath)),
    cursor: 0,
    showExcluded: true,
    settingsLoaded: false,
  });

  const { expanded, selected, cursor, showExcluded, settingsLoaded } = state;

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
      const node = flatNodes[cursor];
      if (node && !node.isFile) {
        dispatch({ type: 'EXPAND_NODE', payload: node.fullPath });
      }
      return;
    }

    if (key.leftArrow) {
      // Collapse directory
      const node = flatNodes[cursor];
      if (node && !node.isFile) {
        dispatch({ type: 'COLLAPSE_NODE', payload: node.fullPath });
      }
      return;
    }

    if (input === ' ') {
      // Toggle selection
      const node = flatNodes[cursor];
      if (!node) {
        return;
      }

      if (node.isFile) {
        // Toggle single file
        dispatch({ type: 'TOGGLE_FILE', payload: node.fullPath });
      } else {
        // Toggle directory and all children
        handleDirectoryToggle(node);
      }
      return;
    }

    if (key.return) {
      // Confirm selection
      onComplete(Array.from(selected));
      exit();
      return;
    }
  });

  // Get file type icon based on extension
  const getFileTypeIcon = (name: string): string => {
    const ext = name.split('.').pop()?.toLowerCase() || '';
    const iconMap: Record<string, string> = {
      ts: '🔷',
      tsx: '⚛️',
      js: '🟨',
      jsx: '⚛️',
      json: '📋',
      md: '📝',
      yaml: '⚙️',
      yml: '⚙️',
      toml: '⚙️',
      py: '🐍',
      go: '🔵',
      rs: '🦀',
      java: '☕',
      css: '🎨',
      scss: '🎨',
      html: '🌐',
      sh: '💻',
      bash: '💻',
      sql: '🗄️',
      env: '🔒',
    };
    return iconMap[ext] || '📄';
  };

  // Render tree
  const renderTree = () => {
    return flatNodes.map((node, index) => {
      const isCursor = index === cursor;
      const isExpanded = expanded.has(node.fullPath);
      const isFullySelected = node.isFile
        ? selected.has(node.fullPath)
        : areAllChildrenSelected(node, selected);
      const isPartiallySelected = !node.isFile && areSomeChildrenSelected(node, selected);

      // Build tree connector lines for better visual hierarchy
      const indentParts: string[] = [];
      for (let i = 0; i < node.depth - 1; i++) {
        indentParts.push('│  ');
      }
      const indent = indentParts.join('');

      // Selection indicator with modern checkbox style
      let selectionIcon = '';
      if (node.isFile) {
        selectionIcon = isFullySelected ? '✓ ' : '○ ';
      } else {
        if (isFullySelected) {
          selectionIcon = '✓ ';
        } else if (isPartiallySelected) {
          selectionIcon = '◐ ';
        } else {
          selectionIcon = '○ ';
        }
      }

      // Directory/file indicator
      let typeIcon = '';
      if (node.isFile) {
        typeIcon = getFileTypeIcon(node.name);
      } else {
        typeIcon = isExpanded ? '📂' : '📁';
      }

      // Expand/collapse indicator for directories
      const expandIcon = !node.isFile ? (isExpanded ? ' ▾' : ' ▸') : '';

      // Name with visual distinction
      const name = node.isFile ? node.name : `${node.name}`;

      // Color scheme
      let color: string | undefined;
      if (isCursor) {
        color = 'cyan';
      } else if (isFullySelected) {
        color = 'green';
      } else if (isPartiallySelected) {
        color = 'yellow';
      } else {
        color = undefined;
      }
      const bold = isCursor;

      return (
        <Box key={node.fullPath} flexDirection="row">
          <Text dimColor>{indent}</Text>
          <Text color={isFullySelected ? 'green' : isPartiallySelected ? 'yellow' : 'gray'}>
            {selectionIcon}
          </Text>
          <Text>{typeIcon} </Text>
          <Text color={color} bold={bold}>
            {name}
          </Text>
          <Text dimColor>{expandIcon}</Text>
        </Box>
      );
    });
  };

  return (
    <Box flexDirection="column">
      <Box marginBottom={1} flexDirection="column">
        <Text bold color="cyan">
          ╭─────────────────────────────────────────────────────╮
        </Text>
        <Text bold color="cyan">
          │  🌳 Interactive File Selection                      │
        </Text>
        <Text bold color="cyan">
          ╰─────────────────────────────────────────────────────╯
        </Text>
      </Box>

      <Box marginBottom={1} flexDirection="column">
        <Text dimColor>
          ┌─ Navigation ──────────────────────────────────────┐
        </Text>
        <Text dimColor>
          │ ↑↓ Navigate    ←→ Collapse/Expand    Space Toggle │
        </Text>
        <Text dimColor>
          │ Enter Confirm  Q Quit                H Show/Hide  │
        </Text>
        <Text dimColor>
          └───────────────────────────────────────────────────┘
        </Text>
      </Box>

      <Box flexDirection="column" paddingBottom={1}>
        {renderTree()}
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text dimColor>
          ────────────────────────────────────────────────────
        </Text>
        <Box>
          <Text bold color="green">
            ✓ {selected.size}
          </Text>
          <Text> / </Text>
          <Text bold color="blue">
            {files.length}
          </Text>
          <Text> files selected</Text>
          {!showExcluded && files.length !== filteredFiles.length && (
            <Text dimColor>
              {' '}• {files.length - filteredFiles.length} hidden
            </Text>
          )}
        </Box>
        <Text dimColor>
          {showExcluded ? '👁️  Showing all files' : '🙈 Excluded files hidden'}
        </Text>
      </Box>
    </Box>
  );
};
