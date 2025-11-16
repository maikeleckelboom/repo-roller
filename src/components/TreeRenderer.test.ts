import { describe, it, expect } from 'vitest';
import {
  renderTreeRowParts,
  renderRowWithMaxWidth,
  truncateWithEllipsis,
  flattenTreeWithLines,
  renderCompactSummary,
  renderSummaryBar,
  type TreeNode,
  type RowState,
  type FlatNode,
} from './TreeRenderer.js';
import { defaultTheme } from '../theme/index.js';

describe('TreeRenderer', () => {
  describe('renderTreeRowParts', () => {
    const createNode = (
      name: string,
      isFile: boolean,
      depth: number,
      fullPath?: string
    ): TreeNode => ({
      name,
      fullPath: fullPath ?? name,
      isFile,
      children: [],
      depth,
    });

    const createRowState = (overrides: Partial<RowState> = {}): RowState => ({
      isSelected: false,
      isPartiallySelected: false,
      isExpanded: false,
      isCursor: false,
      isLast: false,
      parentLasts: [],
      ...overrides,
    });

    it('should render file row with correct parts', () => {
      const node = createNode('index.ts', true, 1);
      const state = createRowState({ isLast: true, parentLasts: [] });

      const parts = renderTreeRowParts(node, state, defaultTheme);

      expect(parts.indent).toBe('└─');
      expect(parts.selection).toContain('󰄱'); // unselected
      expect(parts.selection.length).toBe(defaultTheme.columns.selection);
      expect(parts.expand).toContain('•'); // leaf
      expect(parts.expand.length).toBe(defaultTheme.columns.expand);
      expect(parts.icon).toContain(''); // typescript icon
      expect(parts.icon.length).toBe(defaultTheme.columns.icon);
      expect(parts.name).toBe('index.ts');
      expect(parts.hint).toBe('');
    });

    it('should render directory row with expand icon', () => {
      const node = createNode('src', false, 1);
      node.children = [createNode('file.ts', true, 2)];
      const state = createRowState({ isExpanded: true, isLast: false, parentLasts: [] });

      const parts = renderTreeRowParts(node, state, defaultTheme);

      expect(parts.indent).toBe('├─');
      expect(parts.expand).toContain(''); // expanded
      expect(parts.expand.length).toBe(defaultTheme.columns.expand);
      expect(parts.icon).toContain(''); // open folder
      expect(parts.icon.length).toBe(defaultTheme.columns.icon);
      expect(parts.name).toBe('src');
    });

    it('should render collapsed directory with collapsed icon', () => {
      const node = createNode('lib', false, 1);
      const state = createRowState({ isExpanded: false, isLast: true, parentLasts: [] });

      const parts = renderTreeRowParts(node, state, defaultTheme);

      expect(parts.expand).toContain(''); // collapsed
      expect(parts.expand.length).toBe(defaultTheme.columns.expand);
      expect(parts.icon).toContain(''); // closed folder
      expect(parts.icon.length).toBe(defaultTheme.columns.icon);
    });

    it('should render selected file with selected icon', () => {
      const node = createNode('app.tsx', true, 1);
      const state = createRowState({ isSelected: true, isLast: true });

      const parts = renderTreeRowParts(node, state, defaultTheme);

      expect(parts.selection).toContain('󰄵'); // selected
      expect(parts.selection.length).toBe(defaultTheme.columns.selection);
      expect(parts.icon).toContain(''); // React icon
      expect(parts.icon.length).toBe(defaultTheme.columns.icon);
    });

    it('should render partially selected directory', () => {
      const node = createNode('components', false, 1);
      const state = createRowState({ isPartiallySelected: true });

      const parts = renderTreeRowParts(node, state, defaultTheme);

      expect(parts.selection).toContain('󰡖'); // partially selected
      expect(parts.selection.length).toBe(defaultTheme.columns.selection);
    });

    it('should add test hint for test files', () => {
      const node = createNode('utils.test.ts', true, 1);
      const state = createRowState({ isLast: true });

      const parts = renderTreeRowParts(node, state, defaultTheme);

      expect(parts.hint).toBe(' · test');
    });

    it('should add config hint for config files', () => {
      const node = createNode('tsconfig.json', true, 1);
      const state = createRowState({ isLast: true });

      const parts = renderTreeRowParts(node, state, defaultTheme);

      expect(parts.hint).toBe(' · config');
      expect(parts.icon).toContain(''); // config icon
      expect(parts.icon.length).toBe(defaultTheme.columns.icon);
    });

    it('should add doc hint for markdown files', () => {
      const node = createNode('README.md', true, 1);
      const state = createRowState({ isLast: true });

      const parts = renderTreeRowParts(node, state, defaultTheme);

      expect(parts.hint).toBe(' · doc');
      expect(parts.icon).toContain(''); // markdown icon
      expect(parts.icon.length).toBe(defaultTheme.columns.icon);
    });

    it('should add lock hint for lock files', () => {
      const node = createNode('package-lock.json', true, 1);
      const state = createRowState({ isLast: true });

      const parts = renderTreeRowParts(node, state, defaultTheme);

      expect(parts.hint).toBe(' · lock');
      expect(parts.icon).toContain(''); // lock icon
      expect(parts.icon.length).toBe(defaultTheme.columns.icon);
    });

    it('should maintain fixed column widths across different states', () => {
      const node = createNode('file.ts', true, 1);

      const unselectedState = createRowState({ isSelected: false, isLast: true });
      const selectedState = createRowState({ isSelected: true, isLast: true });

      const unselectedParts = renderTreeRowParts(node, unselectedState, defaultTheme);
      const selectedParts = renderTreeRowParts(node, selectedState, defaultTheme);

      // Selection column should be same width
      expect(unselectedParts.selection.length).toBe(selectedParts.selection.length);
      expect(unselectedParts.selection.length).toBe(defaultTheme.columns.selection);

      // Expand column should be same width
      expect(unselectedParts.expand.length).toBe(selectedParts.expand.length);
      expect(unselectedParts.expand.length).toBe(defaultTheme.columns.expand);

      // Icon column should be same width
      expect(unselectedParts.icon.length).toBe(selectedParts.icon.length);
      expect(unselectedParts.icon.length).toBe(defaultTheme.columns.icon);
    });

    it('should render proper tree lines for nested structure', () => {
      const node = createNode('deep.ts', true, 3);
      const state = createRowState({
        isLast: true,
        parentLasts: [false, true], // parent 1 not last, parent 2 is last
      });

      const parts = renderTreeRowParts(node, state, defaultTheme);

      // Should have vertical pipe for first parent, space for second parent
      expect(parts.indent).toBe('│   └─');
    });

    it('should handle JavaScript files correctly', () => {
      const node = createNode('app.js', true, 1);
      const state = createRowState({ isLast: true });

      const parts = renderTreeRowParts(node, state, defaultTheme);

      expect(parts.icon).toContain(''); // JavaScript icon
      expect(parts.icon.length).toBe(defaultTheme.columns.icon);
    });

    it('should handle JSON files correctly', () => {
      const node = createNode('data.json', true, 1);
      const state = createRowState({ isLast: true });

      const parts = renderTreeRowParts(node, state, defaultTheme);

      expect(parts.icon).toContain(''); // JSON icon
      expect(parts.icon.length).toBe(defaultTheme.columns.icon);
    });

    it('should handle YAML files correctly', () => {
      const node = createNode('config.yml', true, 1);
      const state = createRowState({ isLast: true });

      const parts = renderTreeRowParts(node, state, defaultTheme);

      expect(parts.icon).toContain(''); // YAML icon
      expect(parts.icon.length).toBe(defaultTheme.columns.icon);
    });
  });

  describe('renderRowWithMaxWidth', () => {
    const createNode = (name: string): TreeNode => ({
      name,
      fullPath: name,
      isFile: true,
      children: [],
      depth: 1,
    });

    const createRowState = (): RowState => ({
      isSelected: false,
      isPartiallySelected: false,
      isExpanded: false,
      isCursor: false,
      isLast: true,
      parentLasts: [],
    });

    it('should truncate long filenames with ellipsis', () => {
      const node = createNode('very-long-filename-that-exceeds-terminal-width.ts');
      const state = createRowState();

      // Total width = indent(2) + selection(2) + expand(2) + icon(2) + name + hint(0)
      // For maxWidth of 30, available for name = 30 - 8 = 22
      const parts = renderRowWithMaxWidth(node, state, defaultTheme, 30);

      expect(parts.name.length).toBeLessThanOrEqual(22);
      expect(parts.name).toContain('…');
    });

    it('should not truncate short filenames', () => {
      const node = createNode('short.ts');
      const state = createRowState();

      const parts = renderRowWithMaxWidth(node, state, defaultTheme, 80);

      expect(parts.name).toBe('short.ts');
      expect(parts.name).not.toContain('…');
    });

    it('should preserve columns even with narrow width', () => {
      const node = createNode('file.ts');
      const state = createRowState();

      const parts = renderRowWithMaxWidth(node, state, defaultTheme, 20);

      // Columns should still be present
      expect(parts.selection.length).toBe(defaultTheme.columns.selection);
      expect(parts.expand.length).toBe(defaultTheme.columns.expand);
      expect(parts.icon.length).toBe(defaultTheme.columns.icon);
    });
  });

  describe('truncateWithEllipsis', () => {
    it('should not truncate short strings', () => {
      expect(truncateWithEllipsis('hello', 10)).toBe('hello');
    });

    it('should truncate long strings with ellipsis', () => {
      expect(truncateWithEllipsis('hello world', 8)).toBe('hello w…');
    });

    it('should handle exact length', () => {
      expect(truncateWithEllipsis('hello', 5)).toBe('hello');
    });

    it('should handle very short max length', () => {
      // With maxLength 3, we return first 2 chars + ellipsis
      expect(truncateWithEllipsis('hello', 4)).toBe('hel…');
    });

    it('should handle max length of 1', () => {
      expect(truncateWithEllipsis('hello', 1)).toBe('h');
    });
  });

  describe('flattenTreeWithLines', () => {
    const createTree = (): TreeNode => ({
      name: '.',
      fullPath: '.',
      isFile: false,
      children: [
        {
          name: 'src',
          fullPath: 'src',
          isFile: false,
          children: [
            {
              name: 'index.ts',
              fullPath: 'src/index.ts',
              isFile: true,
              children: [],
              depth: 2,
            },
            {
              name: 'utils.ts',
              fullPath: 'src/utils.ts',
              isFile: true,
              children: [],
              depth: 2,
            },
          ],
          depth: 1,
        },
        {
          name: 'README.md',
          fullPath: 'README.md',
          isFile: true,
          children: [],
          depth: 1,
        },
      ],
      depth: 0,
    });

    it('should flatten collapsed tree to just top-level items', () => {
      const root = createTree();
      const expanded = new Set(['.']); // only root expanded

      const flat = flattenTreeWithLines(root, expanded);

      expect(flat.length).toBe(2); // src directory and README.md
      expect(flat[0].node.name).toBe('src');
      expect(flat[1].node.name).toBe('README.md');
    });

    it('should flatten expanded tree with children', () => {
      const root = createTree();
      const expanded = new Set(['.', 'src']); // root and src expanded

      const flat = flattenTreeWithLines(root, expanded);

      expect(flat.length).toBe(4); // src, index.ts, utils.ts, README.md
      expect(flat[0].node.name).toBe('src');
      expect(flat[1].node.name).toBe('index.ts');
      expect(flat[2].node.name).toBe('utils.ts');
      expect(flat[3].node.name).toBe('README.md');
    });

    it('should correctly mark last items', () => {
      const root = createTree();
      const expanded = new Set(['.', 'src']);

      const flat = flattenTreeWithLines(root, expanded);

      // src is not last (README.md comes after)
      expect(flat[0].isLast).toBe(false);
      // index.ts is not last in src
      expect(flat[1].isLast).toBe(false);
      // utils.ts is last in src
      expect(flat[2].isLast).toBe(true);
      // README.md is last at top level
      expect(flat[3].isLast).toBe(true);
    });

    it('should correctly track parent lasts', () => {
      const root = createTree();
      const expanded = new Set(['.', 'src']);

      const flat = flattenTreeWithLines(root, expanded);

      // src has no parents
      expect(flat[0].parentLasts).toEqual([]);
      // index.ts parent (src) is not last
      expect(flat[1].parentLasts).toEqual([false]);
      // utils.ts parent (src) is not last
      expect(flat[2].parentLasts).toEqual([false]);
      // README.md has no parents
      expect(flat[3].parentLasts).toEqual([]);
    });
  });

  describe('renderCompactSummary', () => {
    it('should render basic selection count', () => {
      const summary = renderCompactSummary({
        selectedCount: 10,
        totalCount: 20,
        hiddenCount: 0,
      });

      expect(summary).toBe('✔ 10 / 20 files selected');
    });

    it('should include hidden count when non-zero', () => {
      const summary = renderCompactSummary({
        selectedCount: 10,
        totalCount: 20,
        hiddenCount: 5,
      });

      expect(summary).toBe('✔ 10 / 20 files selected · 5 hidden');
    });

    it('should handle zero selected', () => {
      const summary = renderCompactSummary({
        selectedCount: 0,
        totalCount: 100,
        hiddenCount: 0,
      });

      expect(summary).toBe('✔ 0 / 100 files selected');
    });

    it('should handle all selected', () => {
      const summary = renderCompactSummary({
        selectedCount: 50,
        totalCount: 50,
        hiddenCount: 0,
      });

      expect(summary).toBe('✔ 50 / 50 files selected');
    });

    it('should handle large numbers', () => {
      const summary = renderCompactSummary({
        selectedCount: 1234,
        totalCount: 5678,
        hiddenCount: 999,
      });

      expect(summary).toBe('✔ 1234 / 5678 files selected · 999 hidden');
    });
  });

  describe('renderSummaryBar', () => {
    it('should include review instruction', () => {
      const bar = renderSummaryBar({
        selectedCount: 10,
        totalCount: 20,
        hiddenCount: 0,
      });

      expect(bar).toContain('press [R] to review selection');
    });

    it('should include all information', () => {
      const bar = renderSummaryBar({
        selectedCount: 79,
        totalCount: 103,
        hiddenCount: 24,
      });

      expect(bar).toBe('✔ 79 / 103 files selected · 24 hidden · press [R] to review selection');
    });
  });

  describe('alignment consistency', () => {
    it('should maintain consistent column positions across tree depths', () => {
      const createNode = (name: string, depth: number): TreeNode => ({
        name,
        fullPath: name,
        isFile: true,
        children: [],
        depth,
      });

      const theme = defaultTheme;

      // Different depths with different parent tracking
      const shallow = createNode('file1.ts', 1);
      const medium = createNode('file2.ts', 2);
      const deep = createNode('file3.ts', 3);

      const shallowState: RowState = {
        isSelected: true,
        isPartiallySelected: false,
        isExpanded: false,
        isCursor: false,
        isLast: true,
        parentLasts: [],
      };

      const mediumState: RowState = {
        isSelected: false,
        isPartiallySelected: false,
        isExpanded: false,
        isCursor: true,
        isLast: false,
        parentLasts: [false],
      };

      const deepState: RowState = {
        isSelected: true,
        isPartiallySelected: false,
        isExpanded: false,
        isCursor: false,
        isLast: true,
        parentLasts: [false, true],
      };

      const shallowParts = renderTreeRowParts(shallow, shallowState, theme);
      const mediumParts = renderTreeRowParts(medium, mediumState, theme);
      const deepParts = renderTreeRowParts(deep, deepState, theme);

      // All fixed columns should have the same width regardless of depth
      expect(shallowParts.selection.length).toBe(mediumParts.selection.length);
      expect(mediumParts.selection.length).toBe(deepParts.selection.length);

      expect(shallowParts.expand.length).toBe(mediumParts.expand.length);
      expect(mediumParts.expand.length).toBe(deepParts.expand.length);

      expect(shallowParts.icon.length).toBe(mediumParts.icon.length);
      expect(mediumParts.icon.length).toBe(deepParts.icon.length);
    });

    it('should not shift columns when toggling selection', () => {
      const node: TreeNode = {
        name: 'test.ts',
        fullPath: 'test.ts',
        isFile: true,
        children: [],
        depth: 1,
      };

      const baseState: RowState = {
        isSelected: false,
        isPartiallySelected: false,
        isExpanded: false,
        isCursor: false,
        isLast: true,
        parentLasts: [],
      };

      const unselected = renderTreeRowParts(node, baseState, defaultTheme);
      const selected = renderTreeRowParts(
        node,
        { ...baseState, isSelected: true },
        defaultTheme
      );

      // The position where the name starts should be the same
      const unselectedNamePosition =
        unselected.indent.length +
        unselected.selection.length +
        unselected.expand.length +
        unselected.icon.length;

      const selectedNamePosition =
        selected.indent.length +
        selected.selection.length +
        selected.expand.length +
        selected.icon.length;

      expect(unselectedNamePosition).toBe(selectedNamePosition);
    });

    it('should not shift columns when toggling expansion', () => {
      const node: TreeNode = {
        name: 'src',
        fullPath: 'src',
        isFile: false,
        children: [
          {
            name: 'file.ts',
            fullPath: 'src/file.ts',
            isFile: true,
            children: [],
            depth: 2,
          },
        ],
        depth: 1,
      };

      const baseState: RowState = {
        isSelected: false,
        isPartiallySelected: false,
        isExpanded: false,
        isCursor: false,
        isLast: true,
        parentLasts: [],
      };

      const collapsed = renderTreeRowParts(node, baseState, defaultTheme);
      const expanded = renderTreeRowParts(
        node,
        { ...baseState, isExpanded: true },
        defaultTheme
      );

      // The position where the name starts should be the same
      const collapsedNamePosition =
        collapsed.indent.length +
        collapsed.selection.length +
        collapsed.expand.length +
        collapsed.icon.length;

      const expandedNamePosition =
        expanded.indent.length +
        expanded.selection.length +
        expanded.expand.length +
        expanded.icon.length;

      expect(collapsedNamePosition).toBe(expandedNamePosition);
    });
  });

  describe('snapshot tests', () => {
    it('should render consistent structure for a typical tree', () => {
      const root: TreeNode = {
        name: '.',
        fullPath: '.',
        isFile: false,
        children: [
          {
            name: 'src',
            fullPath: 'src',
            isFile: false,
            children: [
              {
                name: 'index.ts',
                fullPath: 'src/index.ts',
                isFile: true,
                children: [],
                depth: 2,
              },
              {
                name: 'utils.test.ts',
                fullPath: 'src/utils.test.ts',
                isFile: true,
                children: [],
                depth: 2,
              },
            ],
            depth: 1,
          },
          {
            name: 'package.json',
            fullPath: 'package.json',
            isFile: true,
            children: [],
            depth: 1,
          },
        ],
        depth: 0,
      };

      const expanded = new Set(['.', 'src']);
      const selected = new Set(['src/index.ts']);
      const flatNodes = flattenTreeWithLines(root, expanded);

      const lines = flatNodes.map((flatNode, index) => {
        const state: RowState = {
          isSelected: flatNode.node.isFile
            ? selected.has(flatNode.node.fullPath)
            : false,
          isPartiallySelected: flatNode.node.fullPath === 'src', // src has partial selection
          isExpanded: expanded.has(flatNode.node.fullPath),
          isCursor: index === 0, // cursor on src
          isLast: flatNode.isLast,
          parentLasts: flatNode.parentLasts,
        };

        const parts = renderTreeRowParts(flatNode.node, state, defaultTheme);
        return parts.fullLine;
      });

      // Snapshot the structure
      expect(lines).toMatchInlineSnapshot(`
        [
          "├─󰡖    src",
          "│ ├─󰄵•   index.ts",
          "│ └─󰄱•   utils.test.ts · test",
          "└─󰄱•   package.json · config",
        ]
      `);
    });

    it('should render consistent structure for deeply nested tree', () => {
      const root: TreeNode = {
        name: '.',
        fullPath: '.',
        isFile: false,
        children: [
          {
            name: 'a',
            fullPath: 'a',
            isFile: false,
            children: [
              {
                name: 'b',
                fullPath: 'a/b',
                isFile: false,
                children: [
                  {
                    name: 'c',
                    fullPath: 'a/b/c',
                    isFile: false,
                    children: [
                      {
                        name: 'deep.ts',
                        fullPath: 'a/b/c/deep.ts',
                        isFile: true,
                        children: [],
                        depth: 4,
                      },
                    ],
                    depth: 3,
                  },
                ],
                depth: 2,
              },
            ],
            depth: 1,
          },
        ],
        depth: 0,
      };

      const expanded = new Set(['.', 'a', 'a/b', 'a/b/c']);
      const flatNodes = flattenTreeWithLines(root, expanded);

      const lines = flatNodes.map(flatNode => {
        const state: RowState = {
          isSelected: false,
          isPartiallySelected: false,
          isExpanded: expanded.has(flatNode.node.fullPath),
          isCursor: false,
          isLast: flatNode.isLast,
          parentLasts: flatNode.parentLasts,
        };

        const parts = renderTreeRowParts(flatNode.node, state, defaultTheme);
        return parts.fullLine;
      });

      expect(lines).toMatchInlineSnapshot(`
        [
          "└─󰄱    a",
          "  └─󰄱    b",
          "    └─󰄱    c",
          "      └─󰄱•   deep.ts",
        ]
      `);
    });
  });
});
