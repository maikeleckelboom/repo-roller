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

/**
 * Get all file paths under a directory path
 */
function getFilesUnderPath(files: readonly FileInfo[], dirPath: string): string[] {
  // Normalize directory path
  const normalizedDir = dirPath.endsWith('/') ? dirPath : dirPath + '/';

  return files
    .filter((f) => f.relativePath.startsWith(normalizedDir) || f.relativePath === dirPath)
    .map((f) => f.relativePath);
}

/**
 * Build a map of all paths (including directories) to their descendant file paths
 */
function buildPathToFilesMap(files: readonly FileInfo[]): Map<string, string[]> {
  const map = new Map<string, string[]>();

  // Add each file to itself
  for (const file of files) {
    map.set(file.relativePath, [file.relativePath]);
  }

  // Add all parent directories and their descendant files
  const dirPaths = new Set<string>();
  for (const file of files) {
    const parts = file.relativePath.split('/');
    for (let i = 0; i < parts.length; i++) {
      const dirPath = parts.slice(0, i + 1).join('/');
      dirPaths.add(dirPath);
    }
  }

  for (const dirPath of dirPaths) {
    const filesInDir = getFilesUnderPath(files, dirPath);
    if (filesInDir.length > 0) {
      map.set(dirPath, filesInDir);
    }
  }

  return map;
}

export const FileTreeSelect: React.FC<FileTreeSelectProps> = ({ files, onComplete }) => {
  // Start with all files selected in our state
  const [selectedPaths, setSelectedPaths] = useState<string[]>(
    files.map((f) => f.relativePath)
  );
  // Track the tree component's internal state - starts empty because library doesn't support initial selection
  const [previousTreePaths, setPreviousTreePaths] = useState<Set<string>>(
    new Set()
  );
  const { exit } = useApp();

  const tree = buildTree(files);
  const pathToFilesMap = buildPathToFilesMap(files);

  useInput((input) => {
    if (input === 'q' || input === 'Q') {
      // Quit without selecting any files (cancel)
      onComplete([]);
      exit();
    }
  });

  const handleSelect = (paths: string[]) => {
    // Filter to only actual file paths
    const filePaths = paths.filter((p) => files.some((f) => f.relativePath === p));
    setSelectedPaths(filePaths);
    onComplete(filePaths);
    exit();
  };

  const handleChange = (_activePath: string, paths: string[]) => {
    // paths: current checked items from the tree component
    // previousTreePaths: what was checked in the tree before
    const currentTreeSet = new Set(paths);
    const prevTreeSet = previousTreePaths;

    // Find what was added or removed in the tree UI
    const added = paths.filter((p) => !prevTreeSet.has(p));
    const removed = Array.from(prevTreeSet).filter((p) => !currentTreeSet.has(p));

    let finalPaths = new Set(selectedPaths);

    // Handle additions: when a path is checked, add it and all descendant files
    for (const path of added) {
      const descendantFiles = pathToFilesMap.get(path) || [path];
      for (const filePath of descendantFiles) {
        finalPaths.add(filePath);
      }
    }

    // Handle removals: when a path is unchecked, remove it and all descendant files
    for (const path of removed) {
      const descendantFiles = pathToFilesMap.get(path) || [path];
      for (const filePath of descendantFiles) {
        finalPaths.delete(filePath);
      }
    }

    // Filter to only actual file paths (exclude directory paths)
    const filePathsOnly = Array.from(finalPaths).filter((p) =>
      files.some((f) => f.relativePath === p)
    );

    setSelectedPaths(filePathsOnly);
    setPreviousTreePaths(currentTreeSet);
  };

  return (
    <Box flexDirection="column">
      <Box marginBottom={1} flexDirection="column">
        <Text bold color="cyan">
          📁 File Selection
        </Text>
        <Text dimColor>
          All files are pre-selected. Uncheck items to exclude them.
        </Text>
        <Text dimColor>
          Space: toggle | Enter: confirm | Q: cancel
        </Text>
      </Box>

      <MultiVirtualTreeSelect
        tree={tree}
        onSelect={handleSelect}
        onChange={handleChange}
      />

      <Box marginTop={1}>
        <Text bold color="green">
          ✓ {selectedPaths.length} / {files.length} files selected
        </Text>
      </Box>
    </Box>
  );
};
