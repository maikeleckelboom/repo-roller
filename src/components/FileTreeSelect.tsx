import React, { useState } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { MultiVirtualTreeSelect, type Tree } from 'ink-tree-select';
import type { FileInfo } from '../core/types.js';

interface FileTreeSelectProps {
  files: readonly FileInfo[];
  onComplete: (selectedPaths: string[]) => void;
}

/**
 * Build a tree structure from flat file list
 */
function buildTree(files: readonly FileInfo[]): Tree {
  interface TreeMap {
    [key: string]: {
      fullPath: string;
      branches: TreeMap;
      isFile: boolean;
    };
  }

  const root: TreeMap = {};

  // Build tree structure
  for (const file of files) {
    const parts = file.relativePath.split('/');
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!part) continue;

      const isLastPart = i === parts.length - 1;
      const fullPath = parts.slice(0, i + 1).join('/');

      if (!current[part]) {
        current[part] = {
          fullPath,
          branches: {},
          isFile: isLastPart,
        };
      }

      if (!isLastPart) {
        const node = current[part];
        if (node) {
          current = node.branches;
        }
      }
    }
  }

  // Convert to Tree format
  const convertToTree = (map: TreeMap, name: string, fullPath: string): Tree => {
    const branches: Tree[] = Object.entries(map).map(([childName, childData]) =>
      convertToTree(childData.branches, childName, childData.fullPath)
    );

    // Sort: directories first, then by name
    branches.sort((a, b) => {
      if (a.dir && !b.dir) return -1;
      if (!a.dir && b.dir) return 1;
      return a.name.localeCompare(b.name);
    });

    return {
      name,
      fullPath,
      branches,
      dir: !map[Object.keys(map)[0] ?? '']?.isFile || branches.length > 0,
    };
  };

  // Create root tree
  const rootBranches: Tree[] = Object.entries(root).map(([name, data]) =>
    convertToTree(data.branches, name, data.fullPath)
  );

  rootBranches.sort((a, b) => {
    if (a.dir && !b.dir) return -1;
    if (!a.dir && b.dir) return 1;
    return a.name.localeCompare(b.name);
  });

  return {
    name: '.',
    fullPath: '.',
    branches: rootBranches,
    dir: true,
  };
}

export const FileTreeSelect: React.FC<FileTreeSelectProps> = ({ files, onComplete }) => {
  const [selectedPaths, setSelectedPaths] = useState<string[]>(
    files.map((f) => f.relativePath)
  );
  const { exit } = useApp();

  const tree = buildTree(files);

  useInput((input) => {
    if (input === 'q') {
      onComplete(selectedPaths);
      exit();
    }
  });

  const handleSelect = (paths: string[]) => {
    setSelectedPaths(paths);
    onComplete(paths);
    exit();
  };

  const handleChange = (_activePath: string, paths: string[]) => {
    setSelectedPaths(paths);
  };

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="cyan">
          Select files to include (Space to toggle, Enter to confirm, Q to quit)
        </Text>
      </Box>

      <MultiVirtualTreeSelect
        tree={tree}
        onSelect={handleSelect}
        onChange={handleChange}
      />

      <Box marginTop={1}>
        <Text dimColor>
          {selectedPaths.length} / {files.length} files selected
        </Text>
      </Box>
    </Box>
  );
};
