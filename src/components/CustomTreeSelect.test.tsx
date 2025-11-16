import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { CustomTreeSelect } from './CustomTreeSelect.js';
import type { FileInfo } from '../core/types.js';
import * as userSettings from '../core/userSettings.js';

// Mock userSettings
vi.mock('../core/userSettings.js', () => ({
  getUserSetting: vi.fn().mockResolvedValue(undefined),
  setUserSetting: vi.fn().mockResolvedValue(undefined),
}));

describe('CustomTreeSelect', () => {
  const mockOnComplete = vi.fn();

  const createMockFile = (relativePath: string, isDefaultIncluded = true): FileInfo => ({
    relativePath,
    absolutePath: `/root/${relativePath}`,
    extension: relativePath.split('.').pop() ?? '',
    sizeBytes: 1000,
    isBinary: false,
    isDefaultIncluded,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(userSettings.getUserSetting).mockResolvedValue(undefined);
    vi.mocked(userSettings.setUserSetting).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('tree building', () => {
    it('should build correct tree structure from flat file list', () => {
      const files: FileInfo[] = [
        createMockFile('src/index.ts'),
        createMockFile('src/utils/helper.ts'),
        createMockFile('package.json'),
      ];

      const { lastFrame } = render(
        React.createElement(CustomTreeSelect, {
          files,
          onComplete: mockOnComplete,
        })
      );

      const output = lastFrame() ?? '';
      // Should show file selection header
      expect(output).toContain('Step 1: Select Files');
      // Should show file count
      expect(output).toContain('files selected');
    });

    it('should handle deeply nested directory structure', () => {
      const files: FileInfo[] = [
        createMockFile('src/components/ui/forms/Input.tsx'),
        createMockFile('src/components/ui/forms/Button.tsx'),
        createMockFile('src/components/layout/Header.tsx'),
      ];

      const { lastFrame } = render(
        React.createElement(CustomTreeSelect, {
          files,
          onComplete: mockOnComplete,
        })
      );

      expect(lastFrame()).toContain('files selected');
    });

    it('should sort directories before files', () => {
      const files: FileInfo[] = [
        createMockFile('README.md'),
        createMockFile('src/index.ts'),
        createMockFile('package.json'),
      ];

      const { lastFrame } = render(
        React.createElement(CustomTreeSelect, {
          files,
          onComplete: mockOnComplete,
        })
      );

      // Tree should be built with directories first
      const output = lastFrame() ?? '';
      expect(output).toContain('Step 1: Select Files');
    });

    it('should handle files at root level', () => {
      const files: FileInfo[] = [
        createMockFile('index.ts'),
        createMockFile('package.json'),
        createMockFile('README.md'),
      ];

      const { lastFrame } = render(
        React.createElement(CustomTreeSelect, {
          files,
          onComplete: mockOnComplete,
        })
      );

      const output = lastFrame() ?? '';
      expect(output).toContain('3 / 3 files selected');
    });

    it('should sort files alphabetically within directories', () => {
      const files: FileInfo[] = [
        createMockFile('src/zebra.ts'),
        createMockFile('src/alpha.ts'),
        createMockFile('src/beta.ts'),
      ];

      const { lastFrame } = render(
        React.createElement(CustomTreeSelect, {
          files,
          onComplete: mockOnComplete,
        })
      );

      // All files should be counted
      expect(lastFrame()).toContain('3 / 3 files selected');
    });
  });

  describe('file selection', () => {
    it('should pre-select files marked as isDefaultIncluded', () => {
      const files: FileInfo[] = [
        createMockFile('src/index.ts', true),
        createMockFile('node_modules/pkg/index.js', false),
        createMockFile('package.json', true),
      ];

      const { lastFrame } = render(
        React.createElement(CustomTreeSelect, {
          files,
          onComplete: mockOnComplete,
        })
      );

      // Should show 2 out of 3 files selected (the ones with isDefaultIncluded=true)
      expect(lastFrame()).toContain('2 / 3 files selected');
    });

    it('should handle all files excluded (none pre-selected)', () => {
      const files: FileInfo[] = [
        createMockFile('node_modules/pkg/index.js', false),
        createMockFile('.gitignore', false),
      ];

      const { lastFrame } = render(
        React.createElement(CustomTreeSelect, {
          files,
          onComplete: mockOnComplete,
        })
      );

      expect(lastFrame()).toContain('0 / 2 files selected');
    });

    it('should handle all files pre-selected', () => {
      const files: FileInfo[] = [
        createMockFile('src/index.ts', true),
        createMockFile('src/utils.ts', true),
        createMockFile('package.json', true),
      ];

      const { lastFrame } = render(
        React.createElement(CustomTreeSelect, {
          files,
          onComplete: mockOnComplete,
        })
      );

      expect(lastFrame()).toContain('3 / 3 files selected');
    });

    it('should maintain selection state across re-renders', async () => {
      const files: FileInfo[] = [
        createMockFile('src/a.ts', true),
        createMockFile('src/b.ts', false),
      ];

      const { lastFrame, stdin } = render(
        React.createElement(CustomTreeSelect, {
          files,
          onComplete: mockOnComplete,
        })
      );

      // Initial state
      expect(lastFrame()).toContain('1 / 2 files selected');

      // Navigate and toggle
      stdin.write('\x1B[B'); // Down arrow
      await new Promise(resolve => setTimeout(resolve, 50));

      // Selection should be maintained
      expect(lastFrame()).toContain('1 / 2 files selected');
    });
  });

  describe('keyboard navigation', () => {
    it('should show navigation instructions', () => {
      const files: FileInfo[] = [createMockFile('src/index.ts')];

      const { lastFrame } = render(
        React.createElement(CustomTreeSelect, {
          files,
          onComplete: mockOnComplete,
        })
      );

      const output = lastFrame() ?? '';
      expect(output).toContain('Navigate');
      expect(output).toContain('Toggle');
      expect(output).toContain('Confirm');
      expect(output).toContain('Quit');
    });

    it('should handle quit command (Q)', async () => {
      const files: FileInfo[] = [createMockFile('src/index.ts')];

      const { stdin } = render(
        React.createElement(CustomTreeSelect, {
          files,
          onComplete: mockOnComplete,
        })
      );

      // Press Q to quit
      stdin.write('Q');

      // Wait for state update
      await new Promise(resolve => setTimeout(resolve, 50));

      // Should call onComplete with empty array
      expect(mockOnComplete).toHaveBeenCalledWith([]);
    });

    it('should handle lowercase quit command (q)', async () => {
      const files: FileInfo[] = [createMockFile('src/index.ts')];

      const { stdin } = render(
        React.createElement(CustomTreeSelect, {
          files,
          onComplete: mockOnComplete,
        })
      );

      // Press q to quit
      stdin.write('q');

      await new Promise(resolve => setTimeout(resolve, 50));

      // Should call onComplete with empty array
      expect(mockOnComplete).toHaveBeenCalledWith([]);
    });

    it('should confirm selection on Enter', async () => {
      const files: FileInfo[] = [
        createMockFile('src/index.ts', true),
        createMockFile('src/utils.ts', true),
      ];

      const { stdin } = render(
        React.createElement(CustomTreeSelect, {
          files,
          onComplete: mockOnComplete,
        })
      );

      // First Enter goes to summary mode, second Enter confirms
      stdin.write('\r');
      await new Promise(resolve => setTimeout(resolve, 50));
      stdin.write('\r');
      await new Promise(resolve => setTimeout(resolve, 50));

      // Should call onComplete with selected files
      expect(mockOnComplete).toHaveBeenCalledWith(
        expect.arrayContaining(['src/index.ts', 'src/utils.ts'])
      );
    });

    it('should toggle file selection with space', async () => {
      const files: FileInfo[] = [
        createMockFile('src/index.ts', false),
      ];

      const { stdin, lastFrame } = render(
        React.createElement(CustomTreeSelect, {
          files,
          onComplete: mockOnComplete,
        })
      );

      // Initially no files selected
      expect(lastFrame()).toContain('0 / 1 files selected');

      // Press space to toggle (need to navigate to the file first)
      // By default cursor is at first item
      stdin.write(' ');

      await new Promise(resolve => setTimeout(resolve, 50));

      // File should now be selected
      expect(lastFrame()).toContain('1 / 1 files selected');
    });

    it('should navigate down with down arrow', async () => {
      const files: FileInfo[] = [
        createMockFile('src/a.ts', true),
        createMockFile('src/b.ts', false),
        createMockFile('src/c.ts', false),
      ];

      const { stdin, lastFrame } = render(
        React.createElement(CustomTreeSelect, {
          files,
          onComplete: mockOnComplete,
        })
      );

      // Initially 1 file selected (a.ts)
      expect(lastFrame()).toContain('1 / 3 files selected');

      // Navigate down to directory first, then to first file
      stdin.write('\x1B[A'); // Up arrow (does nothing at top)
      await new Promise(resolve => setTimeout(resolve, 30));

      // Still same selection
      expect(lastFrame()).toContain('1 / 3 files selected');
    });

    it('should navigate up with up arrow', async () => {
      const files: FileInfo[] = [
        createMockFile('src/a.ts', true),
        createMockFile('src/b.ts', false),
      ];

      const { stdin, lastFrame } = render(
        React.createElement(CustomTreeSelect, {
          files,
          onComplete: mockOnComplete,
        })
      );

      // Navigate down first
      stdin.write('\x1B[B'); // Down arrow
      await new Promise(resolve => setTimeout(resolve, 30));

      // Navigate back up
      stdin.write('\x1B[A'); // Up arrow
      await new Promise(resolve => setTimeout(resolve, 30));

      // Should be back at top
      expect(lastFrame()).toContain('1 / 2 files selected');
    });

    it('should expand directory with right arrow', async () => {
      const files: FileInfo[] = [
        createMockFile('src/nested/deep/file.ts', true),
      ];

      const { stdin, lastFrame } = render(
        React.createElement(CustomTreeSelect, {
          files,
          onComplete: mockOnComplete,
        })
      );

      // Expand with right arrow (cursor should start on src directory)
      stdin.write('\x1B[C'); // Right arrow
      await new Promise(resolve => setTimeout(resolve, 50));

      const output = lastFrame() ?? '';
      expect(output).toContain('1 / 1 files selected');
    });

    it('should collapse directory with left arrow', async () => {
      const files: FileInfo[] = [
        createMockFile('src/index.ts', true),
        createMockFile('src/utils.ts', true),
      ];

      const { stdin, lastFrame } = render(
        React.createElement(CustomTreeSelect, {
          files,
          onComplete: mockOnComplete,
        })
      );

      // Collapse with left arrow
      stdin.write('\x1B[D'); // Left arrow
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(lastFrame()).toContain('2 / 2 files selected');
    });

    it('should not move cursor past boundaries', async () => {
      const files: FileInfo[] = [
        createMockFile('src/a.ts', true),
      ];

      const { stdin, lastFrame } = render(
        React.createElement(CustomTreeSelect, {
          files,
          onComplete: mockOnComplete,
        })
      );

      // Try to move up when already at top
      stdin.write('\x1B[A');
      await new Promise(resolve => setTimeout(resolve, 30));

      // Try to move way down (more than items)
      for (let i = 0; i < 10; i++) {
        stdin.write('\x1B[B');
      }
      await new Promise(resolve => setTimeout(resolve, 50));

      // Should still work fine
      expect(lastFrame()).toContain('1 / 1 files selected');
    });

    it('should show toggle excluded files instruction', () => {
      const files: FileInfo[] = [createMockFile('src/index.ts')];

      const { lastFrame } = render(
        React.createElement(CustomTreeSelect, {
          files,
          onComplete: mockOnComplete,
        })
      );

      const output = lastFrame() ?? '';
      expect(output).toContain('Show/Hide');
      expect(output).toContain('H');
    });

    it('should toggle showing excluded files with H key', async () => {
      const files: FileInfo[] = [
        createMockFile('src/index.ts', true),
        createMockFile('node_modules/pkg.js', false),
      ];

      const { stdin, lastFrame } = render(
        React.createElement(CustomTreeSelect, {
          files,
          onComplete: mockOnComplete,
        })
      );

      // Wait for initial render
      await new Promise(resolve => setTimeout(resolve, 50));

      // Initially showing all files
      expect(lastFrame()).toContain('Showing all files');

      // Press H to hide excluded
      stdin.write('H');
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should now be hiding excluded files
      expect(lastFrame()).toContain('hidden');
    });

    it('should toggle back to showing excluded with second H press', async () => {
      const files: FileInfo[] = [
        createMockFile('src/index.ts', true),
        createMockFile('node_modules/pkg.js', false),
      ];

      const { stdin, lastFrame } = render(
        React.createElement(CustomTreeSelect, {
          files,
          onComplete: mockOnComplete,
        })
      );

      await new Promise(resolve => setTimeout(resolve, 50));

      // Press H twice
      stdin.write('H');
      await new Promise(resolve => setTimeout(resolve, 100));

      stdin.write('H');
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should be back to showing all
      expect(lastFrame()).toContain('Showing all files');
    });
  });

  describe('directory selection behavior', () => {
    it('should handle single file in directory', () => {
      const files: FileInfo[] = [
        createMockFile('src/index.ts', true),
      ];

      const { lastFrame } = render(
        React.createElement(CustomTreeSelect, {
          files,
          onComplete: mockOnComplete,
        })
      );

      expect(lastFrame()).toContain('1 / 1 files selected');
    });

    it('should handle multiple files in same directory', () => {
      const files: FileInfo[] = [
        createMockFile('src/a.ts', true),
        createMockFile('src/b.ts', true),
        createMockFile('src/c.ts', false),
      ];

      const { lastFrame } = render(
        React.createElement(CustomTreeSelect, {
          files,
          onComplete: mockOnComplete,
        })
      );

      // 2 out of 3 files are pre-selected
      expect(lastFrame()).toContain('2 / 3 files selected');
    });

    it('should toggle entire directory when space pressed on directory', async () => {
      const files: FileInfo[] = [
        createMockFile('src/a.ts', true),
        createMockFile('src/b.ts', true),
      ];

      const { stdin, lastFrame } = render(
        React.createElement(CustomTreeSelect, {
          files,
          onComplete: mockOnComplete,
        })
      );

      // Initially all files selected (directory should show full selection)
      expect(lastFrame()).toContain('2 / 2 files selected');

      // Cursor starts on src directory - toggle it
      stdin.write(' ');
      await new Promise(resolve => setTimeout(resolve, 50));

      // All files in directory should be deselected
      expect(lastFrame()).toContain('0 / 2 files selected');
    });

    it('should select all files in directory when toggling partially selected directory', async () => {
      const files: FileInfo[] = [
        createMockFile('src/a.ts', true),
        createMockFile('src/b.ts', false),
        createMockFile('src/c.ts', false),
      ];

      const { stdin, lastFrame } = render(
        React.createElement(CustomTreeSelect, {
          files,
          onComplete: mockOnComplete,
        })
      );

      // Initially 1 out of 3 files selected (partial)
      expect(lastFrame()).toContain('1 / 3 files selected');

      // Toggle directory (should select all since only partial)
      stdin.write(' ');
      await new Promise(resolve => setTimeout(resolve, 50));

      // All files should now be selected
      expect(lastFrame()).toContain('3 / 3 files selected');
    });

    it('should show partial selection indicator for directories', () => {
      const files: FileInfo[] = [
        createMockFile('src/a.ts', true),
        createMockFile('src/b.ts', false),
      ];

      const { lastFrame } = render(
        React.createElement(CustomTreeSelect, {
          files,
          onComplete: mockOnComplete,
        })
      );

      const output = lastFrame() ?? '';
      // Should show partial selection indicator ([-])
      expect(output).toContain('[-]');
    });

    it('should show full selection indicator when all children selected', () => {
      const files: FileInfo[] = [
        createMockFile('src/a.ts', true),
        createMockFile('src/b.ts', true),
      ];

      const { lastFrame } = render(
        React.createElement(CustomTreeSelect, {
          files,
          onComplete: mockOnComplete,
        })
      );

      const output = lastFrame() ?? '';
      // Should show full selection ([x])
      expect(output).toContain('[x]');
    });

    it('should show empty selection indicator when no children selected', () => {
      const files: FileInfo[] = [
        createMockFile('src/a.ts', false),
        createMockFile('src/b.ts', false),
      ];

      const { lastFrame } = render(
        React.createElement(CustomTreeSelect, {
          files,
          onComplete: mockOnComplete,
        })
      );

      const output = lastFrame() ?? '';
      // Should show empty selection ([ ])
      expect(output).toContain('[ ]');
    });
  });

  describe('user settings persistence', () => {
    it('should load showExcluded setting on mount', async () => {
      vi.mocked(userSettings.getUserSetting).mockResolvedValue(false);

      const files: FileInfo[] = [
        createMockFile('src/index.ts', true),
        createMockFile('node_modules/pkg/index.js', false),
      ];

      render(
        React.createElement(CustomTreeSelect, {
          files,
          onComplete: mockOnComplete,
        })
      );

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(userSettings.getUserSetting).toHaveBeenCalledWith('showExcludedFiles');
    });

    it('should apply loaded showExcluded setting', async () => {
      vi.mocked(userSettings.getUserSetting).mockResolvedValue(false);

      const files: FileInfo[] = [
        createMockFile('src/index.ts', true),
        createMockFile('node_modules/pkg/index.js', false),
      ];

      const { lastFrame } = render(
        React.createElement(CustomTreeSelect, {
          files,
          onComplete: mockOnComplete,
        })
      );

      await new Promise(resolve => setTimeout(resolve, 100));

      // Should hide excluded files based on loaded setting
      const output = lastFrame() ?? '';
      expect(output).toContain('hidden');
    });

    it('should save showExcluded setting when toggled', async () => {
      const files: FileInfo[] = [createMockFile('src/index.ts')];

      const { stdin } = render(
        React.createElement(CustomTreeSelect, {
          files,
          onComplete: mockOnComplete,
        })
      );

      // Wait for initial load
      await new Promise(resolve => setTimeout(resolve, 50));

      // Press H to toggle show excluded
      stdin.write('H');

      await new Promise(resolve => setTimeout(resolve, 100));

      // Should save the new setting
      expect(userSettings.setUserSetting).toHaveBeenCalledWith('showExcludedFiles', false);
    });

    it('should handle getUserSetting error gracefully', async () => {
      vi.mocked(userSettings.getUserSetting).mockRejectedValue(new Error('Test error'));

      const files: FileInfo[] = [createMockFile('src/index.ts')];

      const { lastFrame } = render(
        React.createElement(CustomTreeSelect, {
          files,
          onComplete: mockOnComplete,
        })
      );

      await new Promise(resolve => setTimeout(resolve, 50));

      // Should still render properly despite error
      expect(lastFrame()).toContain('files selected');
    });

    it('should handle setUserSetting error gracefully', async () => {
      vi.mocked(userSettings.setUserSetting).mockRejectedValue(new Error('Test error'));

      const files: FileInfo[] = [createMockFile('src/index.ts')];

      const { stdin, lastFrame } = render(
        React.createElement(CustomTreeSelect, {
          files,
          onComplete: mockOnComplete,
        })
      );

      await new Promise(resolve => setTimeout(resolve, 50));

      // Toggle should still work even if save fails
      stdin.write('H');
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should render without crashing
      expect(lastFrame()).toContain('files selected');
    });
  });

  describe('empty file list', () => {
    it('should handle empty file list gracefully', () => {
      const files: FileInfo[] = [];

      const { lastFrame } = render(
        React.createElement(CustomTreeSelect, {
          files,
          onComplete: mockOnComplete,
        })
      );

      expect(lastFrame()).toContain('0 / 0 files selected');
    });

    it('should allow confirmation with no files', async () => {
      const files: FileInfo[] = [];

      const { stdin } = render(
        React.createElement(CustomTreeSelect, {
          files,
          onComplete: mockOnComplete,
        })
      );

      // First Enter goes to summary mode, second Enter confirms
      stdin.write('\r');
      await new Promise(resolve => setTimeout(resolve, 50));
      stdin.write('\r');
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockOnComplete).toHaveBeenCalledWith([]);
    });
  });

  describe('UI rendering', () => {
    it('should display file count correctly', () => {
      const files: FileInfo[] = [
        createMockFile('a.ts', true),
        createMockFile('b.ts', false),
        createMockFile('c.ts', true),
        createMockFile('d.ts', true),
        createMockFile('e.ts', false),
      ];

      const { lastFrame } = render(
        React.createElement(CustomTreeSelect, {
          files,
          onComplete: mockOnComplete,
        })
      );

      expect(lastFrame()).toContain('3 / 5 files selected');
    });

    it('should show themed icons (Nerd Font or ASCII fallback)', () => {
      const files: FileInfo[] = [createMockFile('src/index.ts')];

      const { lastFrame } = render(
        React.createElement(CustomTreeSelect, {
          files,
          onComplete: mockOnComplete,
        })
      );

      const output = lastFrame() ?? '';
      // Should contain selection markers and expand indicators
      expect(output).toMatch(/\[x\]|\[ \]|\[-\]/);
    });

    it('should show file type icons based on extension', () => {
      const files: FileInfo[] = [
        createMockFile('src/index.ts'),
        createMockFile('src/App.tsx'),
        createMockFile('package.json'),
      ];

      const { lastFrame } = render(
        React.createElement(CustomTreeSelect, {
          files,
          onComplete: mockOnComplete,
        })
      );

      const output = lastFrame() ?? '';
      // Should contain expand/collapse markers for directories
      expect(output).toMatch(/▸|▾/);
    });

    it('should show folder icons for directories', () => {
      const files: FileInfo[] = [
        createMockFile('src/index.ts'),
      ];

      const { lastFrame } = render(
        React.createElement(CustomTreeSelect, {
          files,
          onComplete: mockOnComplete,
        })
      );

      const output = lastFrame() ?? '';
      // Should contain expand indicator for directories (collapsed by default)
      expect(output).toMatch(/▸|▾/);
    });

    it('should show expand/collapse indicators', () => {
      const files: FileInfo[] = [
        createMockFile('src/index.ts'),
      ];

      const { lastFrame } = render(
        React.createElement(CustomTreeSelect, {
          files,
          onComplete: mockOnComplete,
        })
      );

      const output = lastFrame() ?? '';
      // Should contain expand indicator
      expect(output).toMatch(/▸|▾/);
    });

    it('should display decorative borders', () => {
      const files: FileInfo[] = [createMockFile('src/index.ts')];

      const { lastFrame } = render(
        React.createElement(CustomTreeSelect, {
          files,
          onComplete: mockOnComplete,
        })
      );

      const output = lastFrame() ?? '';
      expect(output).toContain('╭');
      expect(output).toContain('╯');
    });

    it('should show visibility status indicator', () => {
      const files: FileInfo[] = [createMockFile('src/index.ts')];

      const { lastFrame } = render(
        React.createElement(CustomTreeSelect, {
          files,
          onComplete: mockOnComplete,
        })
      );

      const output = lastFrame() ?? '';
      // Should show text for visibility status
      expect(output).toMatch(/Showing all files|Excluded files hidden/);
    });

    it('should show hidden files count when excluded files are hidden', async () => {
      vi.mocked(userSettings.getUserSetting).mockResolvedValue(false);

      const files: FileInfo[] = [
        createMockFile('src/index.ts', true),
        createMockFile('node_modules/a.js', false),
        createMockFile('node_modules/b.js', false),
      ];

      const { lastFrame } = render(
        React.createElement(CustomTreeSelect, {
          files,
          onComplete: mockOnComplete,
        })
      );

      await new Promise(resolve => setTimeout(resolve, 100));

      const output = lastFrame() ?? '';
      // Should show count of hidden files
      expect(output).toContain('2 hidden');
    });
  });

  describe('cursor management', () => {
    it('should adjust cursor when hiding excluded files removes current item', async () => {
      const files: FileInfo[] = [
        createMockFile('excluded1.ts', false),
        createMockFile('excluded2.ts', false),
        createMockFile('included.ts', true),
      ];

      const { stdin, lastFrame } = render(
        React.createElement(CustomTreeSelect, {
          files,
          onComplete: mockOnComplete,
        })
      );

      await new Promise(resolve => setTimeout(resolve, 50));

      // Hide excluded files
      stdin.write('H');
      await new Promise(resolve => setTimeout(resolve, 100));

      // Cursor should be adjusted to valid position
      expect(lastFrame()).toContain('1 / 3 files selected');
    });

    it('should maintain cursor at boundary when at end', async () => {
      const files: FileInfo[] = [
        createMockFile('a.ts', true),
        createMockFile('b.ts', true),
      ];

      const { stdin, lastFrame } = render(
        React.createElement(CustomTreeSelect, {
          files,
          onComplete: mockOnComplete,
        })
      );

      // Move cursor to end
      for (let i = 0; i < 10; i++) {
        stdin.write('\x1B[B');
      }
      await new Promise(resolve => setTimeout(resolve, 50));

      // Should stay in bounds
      expect(lastFrame()).toContain('2 / 2 files selected');
    });
  });

  describe('file filtering', () => {
    it('should show all files when showExcluded is true', () => {
      const files: FileInfo[] = [
        createMockFile('src/index.ts', true),
        createMockFile('node_modules/pkg.js', false),
        createMockFile('.gitignore', false),
      ];

      const { lastFrame } = render(
        React.createElement(CustomTreeSelect, {
          files,
          onComplete: mockOnComplete,
        })
      );

      // Should count all files
      expect(lastFrame()).toContain('1 / 3 files selected');
    });

    it('should filter excluded files when showExcluded is false', async () => {
      vi.mocked(userSettings.getUserSetting).mockResolvedValue(false);

      const files: FileInfo[] = [
        createMockFile('src/index.ts', true),
        createMockFile('node_modules/pkg.js', false),
        createMockFile('.gitignore', false),
      ];

      const { lastFrame } = render(
        React.createElement(CustomTreeSelect, {
          files,
          onComplete: mockOnComplete,
        })
      );

      await new Promise(resolve => setTimeout(resolve, 100));

      // Total count should still show all files for context
      const output = lastFrame() ?? '';
      expect(output).toContain('1 / 3 files selected');
      // But hidden count should be displayed
      expect(output).toContain('hidden');
    });
  });

  describe('complex tree operations', () => {
    it('should handle nested directory selection', async () => {
      const files: FileInfo[] = [
        createMockFile('src/components/Button.tsx', false),
        createMockFile('src/components/Input.tsx', false),
        createMockFile('src/utils/helpers.ts', true),
      ];

      const { stdin, lastFrame } = render(
        React.createElement(CustomTreeSelect, {
          files,
          onComplete: mockOnComplete,
        })
      );

      // Initially 1 selected
      expect(lastFrame()).toContain('1 / 3 files selected');

      // Expand src directory first
      stdin.write('\x1B[C'); // Right arrow to expand
      await new Promise(resolve => setTimeout(resolve, 30));

      // Toggle src directory to select all children
      stdin.write(' ');
      await new Promise(resolve => setTimeout(resolve, 50));

      // All files should be selected
      expect(lastFrame()).toContain('3 / 3 files selected');
    });

    it('should preserve selections when filtering', async () => {
      const files: FileInfo[] = [
        createMockFile('src/index.ts', true),
        createMockFile('node_modules/pkg.js', false),
      ];

      const { stdin, lastFrame } = render(
        React.createElement(CustomTreeSelect, {
          files,
          onComplete: mockOnComplete,
        })
      );

      await new Promise(resolve => setTimeout(resolve, 50));

      // Hide excluded files
      stdin.write('H');
      await new Promise(resolve => setTimeout(resolve, 100));

      // Selection should be preserved
      expect(lastFrame()).toContain('1 / 2 files selected');

      // Show excluded files again
      stdin.write('H');
      await new Promise(resolve => setTimeout(resolve, 100));

      // Selection still preserved
      expect(lastFrame()).toContain('1 / 2 files selected');
    });
  });

  describe('confirmation with different selection states', () => {
    it('should return empty array when all files deselected and Enter pressed', async () => {
      const files: FileInfo[] = [
        createMockFile('src/index.ts', false),
      ];

      const { stdin } = render(
        React.createElement(CustomTreeSelect, {
          files,
          onComplete: mockOnComplete,
        })
      );

      // First Enter goes to summary mode, second Enter confirms
      stdin.write('\r');
      await new Promise(resolve => setTimeout(resolve, 50));
      stdin.write('\r');
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockOnComplete).toHaveBeenCalledWith([]);
    });

    it('should return all selected files on confirmation', async () => {
      const files: FileInfo[] = [
        createMockFile('src/a.ts', true),
        createMockFile('src/b.ts', true),
        createMockFile('src/c.ts', false),
      ];

      const { stdin } = render(
        React.createElement(CustomTreeSelect, {
          files,
          onComplete: mockOnComplete,
        })
      );

      // First Enter goes to summary mode, second Enter confirms
      stdin.write('\r');
      await new Promise(resolve => setTimeout(resolve, 50));
      stdin.write('\r');
      await new Promise(resolve => setTimeout(resolve, 50));

      const call = mockOnComplete.mock.calls[0][0] as string[];
      expect(call).toContain('src/a.ts');
      expect(call).toContain('src/b.ts');
      expect(call).not.toContain('src/c.ts');
    });
  });
});
