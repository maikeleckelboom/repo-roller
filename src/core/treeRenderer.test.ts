import { describe, it, expect } from 'vitest';
import {
  renderTreeRow,
  renderTreeRowParts,
  formatSummaryBar,
  truncateName,
  padToWidth,
  renderIndent,
  renderSelectionMarker,
  renderExpandMarker,
  getFixedWidth,
  calculateMaxNameWidth,
  DEFAULT_COLUMN_WIDTHS,
  type TreeNode,
  type RowState,
} from './treeRenderer.js';
import { defaultTheme } from './treeTheme.js';

describe('treeRenderer', () => {
  describe('padToWidth', () => {
    it('should pad string to specified width', () => {
      expect(padToWidth('hi', 5)).toBe('hi   ');
    });

    it('should truncate string if too long', () => {
      expect(padToWidth('hello world', 5)).toBe('hello');
    });

    it('should return string as-is if exact width', () => {
      expect(padToWidth('exact', 5)).toBe('exact');
    });
  });

  describe('truncateName', () => {
    it('should return name as-is if fits', () => {
      expect(truncateName('short.ts', 20)).toBe('short.ts');
    });

    it('should truncate with ellipsis if too long', () => {
      expect(truncateName('very-long-filename.ts', 10)).toBe('very-long…');
    });

    it('should handle very short max width', () => {
      expect(truncateName('test', 3)).toBe('tes');
    });
  });

  describe('renderIndent', () => {
    it('should return empty string for depth 1', () => {
      const indent = renderIndent(1, [], defaultTheme);
      expect(indent).toBe('');
    });

    it('should return vertical lines for nested items', () => {
      const indent = renderIndent(3, [false, false], defaultTheme);
      expect(indent).toBe('│ │ ');
    });

    it('should use spaces when parent is last', () => {
      const indent = renderIndent(3, [true, true], defaultTheme);
      expect(indent).toBe('    ');
    });

    it('should mix vertical lines and spaces', () => {
      const indent = renderIndent(4, [false, true, false], defaultTheme);
      expect(indent).toBe('│   │ ');
    });
  });

  describe('renderSelectionMarker', () => {
    it('should render selected marker', () => {
      const marker = renderSelectionMarker(true, false, defaultTheme);
      expect(marker).toBe('◉ ');
    });

    it('should render unselected marker', () => {
      const marker = renderSelectionMarker(false, false, defaultTheme);
      expect(marker).toBe('○ ');
    });

    it('should render partially selected marker', () => {
      const marker = renderSelectionMarker(false, true, defaultTheme);
      expect(marker).toBe('◐ ');
    });
  });

  describe('renderExpandMarker', () => {
    it('should render expanded marker for directory', () => {
      const marker = renderExpandMarker(false, true, defaultTheme);
      expect(marker).toBe('⌄ ');
    });

    it('should render collapsed marker for directory', () => {
      const marker = renderExpandMarker(false, false, defaultTheme);
      expect(marker).toBe('› ');
    });

    it('should render leaf marker for file', () => {
      const marker = renderExpandMarker(true, false, defaultTheme);
      expect(marker).toBe('  ');
    });
  });

  describe('renderTreeRow', () => {
    const createNode = (name: string, isFile: boolean, depth: number): TreeNode => ({
      name,
      fullPath: name,
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
      parentIsLast: [],
      ...overrides,
    });

    it('should render a simple file row', () => {
      const node = createNode('index.ts', true, 1);
      const state = createRowState();
      const row = renderTreeRow(node, state, defaultTheme);

      // Check structure: selection (2) + expandMarker (2) + name (no icon column)
      expect(row).toMatch(/^○   index\.ts$/);
      expect(row).toContain('index.ts');
      expect(row.substring(0, 2)).toBe('○ ');
    });

    it('should render a selected file row', () => {
      const node = createNode('app.js', true, 1);
      const state = createRowState({ isSelected: true });
      const row = renderTreeRow(node, state, defaultTheme);

      expect(row).toMatch(/^◉   app\.js$/);
      expect(row.substring(0, 2)).toBe('◉ ');
    });

    it('should render an expanded directory row', () => {
      const node = createNode('src', false, 1);
      const state = createRowState({ isExpanded: true });
      const row = renderTreeRow(node, state, defaultTheme);

      expect(row).toMatch(/^○ ⌄ src$/);
      expect(row).toContain('src');
    });

    it('should render a collapsed directory row', () => {
      const node = createNode('tests', false, 1);
      const state = createRowState({ isExpanded: false });
      const row = renderTreeRow(node, state, defaultTheme);

      expect(row).toMatch(/^○ › tests$/);
      expect(row).toContain('tests');
    });

    it('should include hint for test files', () => {
      const node = createNode('utils.test.ts', true, 1);
      const state = createRowState();
      const row = renderTreeRow(node, state, defaultTheme);

      expect(row).toContain(' · test');
    });

    it('should include hint for config files', () => {
      const node = createNode('tsconfig.json', true, 1);
      const state = createRowState();
      const row = renderTreeRow(node, state, defaultTheme);

      expect(row).toContain(' · config');
    });

    it('should render nested file with proper indentation', () => {
      const node = createNode('nested.ts', true, 3);
      const state = createRowState({ parentIsLast: [false, false] });
      const row = renderTreeRow(node, state, defaultTheme);

      // Should have vertical lines for indentation
      expect(row).toMatch(/^│ │ ○   nested\.ts$/);
      expect(row).toContain('nested.ts');
      expect(row.substring(0, 4)).toBe('│ │ ');
    });

    it('should maintain fixed column positions', () => {
      const node1 = createNode('short.ts', true, 1);
      const node2 = createNode('very-long-name.ts', true, 1);
      const state = createRowState();

      const row1 = renderTreeRow(node1, state, defaultTheme);
      const row2 = renderTreeRow(node2, state, defaultTheme);

      // Selection marker should start at same position (0)
      // Name should start at same position (2 + 2 = 4) - no icon column
      const namePos1 = row1.indexOf('short.ts');
      const namePos2 = row2.indexOf('very-long-name.ts');
      expect(namePos1).toBe(namePos2);
      expect(namePos1).toBe(4); // After selection marker + expand marker
    });

    it('should not jitter when selection state changes', () => {
      const node = createNode('stable.ts', true, 1);
      const unselected = createRowState({ isSelected: false });
      const selected = createRowState({ isSelected: true });

      const row1 = renderTreeRow(node, unselected, defaultTheme);
      const row2 = renderTreeRow(node, selected, defaultTheme);

      // Name position should be the same
      const namePos1 = row1.indexOf('stable.ts');
      const namePos2 = row2.indexOf('stable.ts');
      expect(namePos1).toBe(namePos2);
    });

    it('should truncate long names to fit terminal width', () => {
      const node = createNode('this-is-a-very-long-filename-that-should-be-truncated.ts', true, 1);
      const state = createRowState();
      const row = renderTreeRow(node, state, defaultTheme, DEFAULT_COLUMN_WIDTHS, 20);

      expect(row).toContain('this-is-a-very-long…');
      expect(row).not.toContain('truncated.ts');
    });
  });

  describe('renderTreeRowParts', () => {
    const createNode = (name: string, isFile: boolean, depth: number): TreeNode => ({
      name,
      fullPath: name,
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
      parentIsLast: [],
      ...overrides,
    });

    it('should return all parts with correct widths', () => {
      const node = createNode('file.ts', true, 1);
      const state = createRowState();
      const parts = renderTreeRowParts(node, state, defaultTheme);

      expect(parts.selection).toHaveLength(2);
      expect(parts.expandMarker).toHaveLength(2);
      expect(parts.icon).toHaveLength(0); // No icon column - badges removed
      expect(parts.name).toBe('file.ts');
      expect(parts.indent).toBe('');
    });

    it('should provide hint for known file types', () => {
      const node = createNode('.gitignore', true, 1);
      const state = createRowState();
      const parts = renderTreeRowParts(node, state, defaultTheme);

      expect(parts.hint).toBe(' · git');
    });

    it('should have empty hint for generic files', () => {
      const node = createNode('unknown.xyz', true, 1);
      const state = createRowState();
      const parts = renderTreeRowParts(node, state, defaultTheme);

      expect(parts.hint).toBe('');
    });
  });

  describe('getFixedWidth', () => {
    it('should calculate fixed width for depth 1', () => {
      const width = getFixedWidth(1);
      // selection (2) + expand (2) + icon (0) + indent (0)
      expect(width).toBe(4);
    });

    it('should calculate fixed width for depth 3', () => {
      const width = getFixedWidth(3);
      // selection (2) + expand (2) + icon (0) + indent (2 * 2)
      expect(width).toBe(8);
    });
  });

  describe('calculateMaxNameWidth', () => {
    it('should calculate available width for name', () => {
      const width = calculateMaxNameWidth(80, 1, DEFAULT_COLUMN_WIDTHS, 10);
      // 80 - 4 (fixed) - 10 (hint) = 66
      expect(width).toBe(66);
    });

    it('should ensure minimum width of 10', () => {
      const width = calculateMaxNameWidth(20, 5, DEFAULT_COLUMN_WIDTHS, 10);
      expect(width).toBe(10);
    });
  });

  describe('formatSummaryBar', () => {
    it('should format summary with no hidden files', () => {
      const summary = formatSummaryBar(79, 103, 0);
      expect(summary).toBe('✔ 79 / 103 files selected · press [R] to review selection');
    });

    it('should format summary with hidden files', () => {
      const summary = formatSummaryBar(79, 103, 24);
      expect(summary).toBe('✔ 79 / 103 files selected · 24 hidden · press [R] to review selection');
    });

    it('should format summary with zero selected', () => {
      const summary = formatSummaryBar(0, 50, 0);
      expect(summary).toBe('✔ 0 / 50 files selected · press [R] to review selection');
    });

    it('should format summary with all selected', () => {
      const summary = formatSummaryBar(100, 100, 0);
      expect(summary).toBe('✔ 100 / 100 files selected · press [R] to review selection');
    });
  });
});
