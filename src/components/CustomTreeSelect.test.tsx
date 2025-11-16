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
      expect(output).toContain('File Selection');
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
      expect(output).toContain('File Selection');
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

      // Press Enter to confirm
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

    it('should show emoji icons in header', () => {
      const files: FileInfo[] = [createMockFile('src/index.ts')];

      const { lastFrame } = render(
        React.createElement(CustomTreeSelect, {
          files,
          onComplete: mockOnComplete,
        })
      );

      const output = lastFrame() ?? '';
      expect(output).toContain('📁');
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
  });
});
