import React, { useState, useMemo } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import type { FileInfo } from '../core/types.js';

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
      if (!part) continue;

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

  // Track which directories are expanded
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    // Start with root expanded
    const initial = new Set<string>(['.']);
    return initial;
  });

  // Track which files are selected - initialize with only default included files
  const [selected, setSelected] = useState<Set<string>>(() => {
    return new Set(files.filter(f => f.isDefaultIncluded).map(f => f.relativePath));
  });

  // Current cursor position
  const [cursor, setCursor] = useState(0);

  // Flatten tree based on expansion state
  const flatNodes = useMemo(() => flattenTree(tree, expanded), [tree, expanded]);

  const { exit } = useApp();

  useInput((input, key) => {
    if (input === 'q' || input === 'Q') {
      onComplete([]);
      exit();
      return;
    }

    if (key.upArrow) {
      setCursor(prev => Math.max(0, prev - 1));
      return;
    }

    if (key.downArrow) {
      setCursor(prev => Math.min(flatNodes.length - 1, prev + 1));
      return;
    }

    if (key.rightArrow) {
      // Expand directory
      const node = flatNodes[cursor];
      if (node && !node.isFile) {
        setExpanded(prev => new Set([...prev, node.fullPath]));
      }
      return;
    }

    if (key.leftArrow) {
      // Collapse directory
      const node = flatNodes[cursor];
      if (node && !node.isFile) {
        setExpanded(prev => {
          const next = new Set(prev);
          next.delete(node.fullPath);
          return next;
        });
      }
      return;
    }

    if (input === ' ') {
      // Toggle selection
      const node = flatNodes[cursor];
      if (!node) return;

      if (node.isFile) {
        // Toggle single file
        setSelected(prev => {
          const next = new Set(prev);
          if (next.has(node.fullPath)) {
            next.delete(node.fullPath);
          } else {
            next.add(node.fullPath);
          }
          return next;
        });
      } else {
        // Toggle directory and all children
        const allFiles = getAllFilesUnder(node);
        const allSelected = allFiles.every(f => selected.has(f));

        setSelected(prev => {
          const next = new Set(prev);
          if (allSelected) {
            // Deselect all
            allFiles.forEach(f => next.delete(f));
          } else {
            // Select all
            allFiles.forEach(f => next.add(f));
          }
          return next;
        });
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

  // Render tree
  const renderTree = () => {
    return flatNodes.map((node, index) => {
      const isCursor = index === cursor;
      const isExpanded = expanded.has(node.fullPath);
      const isFullySelected = node.isFile
        ? selected.has(node.fullPath)
        : areAllChildrenSelected(node, selected);
      const isPartiallySelected = !node.isFile && areSomeChildrenSelected(node, selected);

      // Build indentation
      const indent = '  '.repeat(node.depth - 1);

      // Icon
      let icon = '';
      if (node.isFile) {
        icon = isFullySelected ? '■ ' : '□ ';
      } else {
        if (isFullySelected) {
          icon = '■ ';
        } else if (isPartiallySelected) {
          icon = '◧ ';
        } else {
          icon = '□ ';
        }
        icon += isExpanded ? '▼ ' : '▶ ';
      }

      // Name
      const name = node.isFile ? node.name : `${node.name}/`;

      // Color
      const color = isCursor ? 'cyan' : isFullySelected ? 'green' : isPartiallySelected ? 'yellow' : undefined;
      const bold = isCursor;

      return (
        <Text key={node.fullPath} color={color} bold={bold}>
          {indent}{icon}{name}
        </Text>
      );
    });
  };

  return (
    <Box flexDirection="column">
      <Box marginBottom={1} flexDirection="column">
        <Text bold color="cyan">
          📁 File Selection
        </Text>
        <Text dimColor>
          ↑/↓: Navigate | ←/→: Collapse/Expand | Space: Toggle | Enter: Confirm | Q: Cancel
        </Text>
      </Box>

      <Box flexDirection="column" paddingBottom={1}>
        {renderTree()}
      </Box>

      <Box marginTop={1}>
        <Text bold color="green">
          ✓ {selected.size} / {files.length} files selected
        </Text>
      </Box>
    </Box>
  );
};
