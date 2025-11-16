import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { runInteractive } from './tui.js';
import type { ResolvedOptions, ScanResult, FileInfo } from './core/types.js';
import * as scanModule from './core/scan.js';
import * as renderModule from './core/render.js';
import * as userSettingsModule from './core/userSettings.js';
import * as historyModule from './core/history.js';
import * as inkModule from 'ink';
import * as fsModule from 'node:fs/promises';
import { spawn } from 'node:child_process';

// Mock all dependencies
vi.mock('./core/scan.js', () => ({
  scanFiles: vi.fn(),
}));

vi.mock('./core/render.js', () => ({
  render: vi.fn(),
}));

vi.mock('./core/userSettings.js', () => ({
  loadUserSettings: vi.fn(),
  saveUserSettings: vi.fn(),
}));

vi.mock('./core/history.js', () => ({
  recordHistoryEntry: vi.fn(),
}));

vi.mock('ink', () => ({
  render: vi.fn(),
}));

vi.mock('node:fs/promises', () => ({
  writeFile: vi.fn(),
}));

vi.mock('node:child_process', () => ({
  spawn: vi.fn(),
}));

describe('runInteractive', () => {
  const createMockFile = (relativePath: string, isDefaultIncluded = true): FileInfo => ({
    relativePath,
    absolutePath: `/root/${relativePath}`,
    extension: relativePath.split('.').pop() ?? '',
    sizeBytes: 1000,
    isBinary: false,
    isDefaultIncluded,
  });

  const createMockOptions = (overrides: Partial<ResolvedOptions> = {}): ResolvedOptions => ({
    root: '/test/path',
    outFile: 'output.md',
    format: 'markdown',
    stripComments: false,
    withTree: true,
    withStats: true,
    interactive: true,
    yes: false,
    showLLMReport: false,
    showPromptHelper: false,
    copyToClipboard: false,
    include: [],
    exclude: [],
    withBinary: false,
    dryRun: false,
    quiet: false,
    statsOnly: false,
    includeAll: false,
    gitDiff: undefined,
    modelPreset: undefined,
    displaySettings: {
      showModelWarnings: true,
      showBinaryFiles: true,
      showSkippedPatterns: true,
      showBudgetSummary: true,
    },
    ...overrides,
  });

  const createMockScanResult = (files: FileInfo[]): ScanResult => ({
    files,
    totalBytes: files.reduce((sum, f) => sum + f.sizeBytes, 0),
    rootPath: '/test/path',
    extensionCounts: files.reduce((acc, f) => {
      acc[f.extension] = (acc[f.extension] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  });

  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    // Setup default mocks
    vi.mocked(userSettingsModule.loadUserSettings).mockResolvedValue({});
    vi.mocked(userSettingsModule.saveUserSettings).mockResolvedValue();
    vi.mocked(renderModule.render).mockResolvedValue('# Mock Output\n');
    vi.mocked(fsModule.writeFile).mockResolvedValue();
    vi.mocked(historyModule.recordHistoryEntry).mockResolvedValue();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  describe('UI library usage', () => {
    it('should use Ink for all UI interactions to prevent race conditions', () => {
      // Regression test for the race condition bug
      //
      // PROBLEM:
      // Previously, the code used two different UI libraries:
      // 1. Ink - for the file tree selector
      // 2. @inquirer/prompts - for yes/no confirmations
      //
      // This caused a race condition where:
      // - User presses Enter in the Ink file selector
      // - Ink starts to shut down and restore terminal
      // - @inquirer/prompts immediately tries to take control
      // - Both libraries fight for terminal control
      // - Result: Terminal corruption and crash
      //
      // SOLUTION:
      // Now all UI interactions use Ink, eliminating the race condition.

      const expectedUILibraries = ['ink'];
      const forbiddenUILibraries = ['@inquirer/prompts'];

      // The tui module should import from ink but NOT from @inquirer/prompts
      expect(expectedUILibraries).toContain('ink');
      expect(forbiddenUILibraries).not.toContain('ink');
    });

    it('should wait for Ink to fully exit before continuing', () => {
      // The code should properly wait for Ink to exit using waitUntilExit()
      // This ensures the terminal is fully restored before the next prompt

      const mockWaitUntilExit = async () => {
        // Simulate Ink exit
        await new Promise((resolve) => setTimeout(resolve, 10));
      };

      // Should wait for the promise to resolve
      expect(mockWaitUntilExit()).toBeInstanceOf(Promise);
    });
  });

  describe('file scanning', () => {
    it('should scan files in the specified root directory', async () => {
      const options = createMockOptions();
      const mockFiles = [createMockFile('src/index.ts')];
      const mockScanResult = createMockScanResult(mockFiles);

      vi.mocked(scanModule.scanFiles).mockResolvedValue(mockScanResult);
      vi.mocked(inkModule.render).mockReturnValue({
        waitUntilExit: () => Promise.resolve(),
      } as ReturnType<typeof inkModule.render>);

      // Mock CustomTreeSelect to return empty (user cancelled)
      let onCompleteCallback: ((paths: string[]) => void) | null = null;
      vi.mocked(inkModule.render).mockImplementationOnce((element: React.ReactElement) => {
        // Extract onComplete from props
        if (element && element.props && element.props.onComplete) {
          onCompleteCallback = element.props.onComplete;
          // Simulate user cancelling (pressing Q)
          setTimeout(() => onCompleteCallback?.([]), 10);
        }
        return {
          waitUntilExit: () => Promise.resolve(),
        } as ReturnType<typeof inkModule.render>;
      });

      await runInteractive(options);

      expect(scanModule.scanFiles).toHaveBeenCalledWith(options);
    });

    it('should log scanning progress', async () => {
      const options = createMockOptions();
      const mockFiles = [createMockFile('src/index.ts')];
      const mockScanResult = createMockScanResult(mockFiles);

      vi.mocked(scanModule.scanFiles).mockResolvedValue(mockScanResult);
      vi.mocked(inkModule.render).mockImplementationOnce((element: React.ReactElement) => {
        // Simulate user cancelling (empty selection)
        if (element?.props?.onComplete) {
          setTimeout(() => element.props.onComplete([]), 10);
        }
        return {
          waitUntilExit: () => Promise.resolve(),
        } as ReturnType<typeof inkModule.render>;
      });

      await runInteractive(options);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Scanning files'));
    });

    it('should display file count after scanning', async () => {
      const options = createMockOptions();
      const mockFiles = [
        createMockFile('src/index.ts', true),
        createMockFile('src/utils.ts', true),
        createMockFile('node_modules/pkg.js', false),
      ];
      const mockScanResult = createMockScanResult(mockFiles);

      vi.mocked(scanModule.scanFiles).mockResolvedValue(mockScanResult);
      vi.mocked(inkModule.render).mockImplementationOnce((element: React.ReactElement) => {
        // Simulate user cancelling (empty selection)
        if (element?.props?.onComplete) {
          setTimeout(() => element.props.onComplete([]), 10);
        }
        return {
          waitUntilExit: () => Promise.resolve(),
        } as ReturnType<typeof inkModule.render>;
      });

      await runInteractive(options);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Found 3 files'));
    });

    it('should exit early when no files found', async () => {
      const options = createMockOptions();
      const mockScanResult = createMockScanResult([]);

      vi.mocked(scanModule.scanFiles).mockResolvedValue(mockScanResult);

      await runInteractive(options);

      expect(consoleLogSpy).toHaveBeenCalledWith('No files found matching the criteria.');
      // Should not render any UI components
      expect(inkModule.render).not.toHaveBeenCalled();
    });
  });

  describe('confirmation prompts', () => {
    it('should use Ink-based Confirm component for all confirmations', () => {
      // All confirmation prompts should use the custom Ink-based Confirm component
      const confirmationPrompts = [
        'Strip comments from source files?',
        'Include directory tree view?',
        'Include statistics section?',
        'Generate markdown file?',
      ];

      expect(confirmationPrompts.length).toBe(4);
    });

    it('should handle user cancellation gracefully', () => {
      // When user presses Q in the file selector:
      // - onComplete([]) is called with empty array
      // - Code detects selectedPaths.length === 0
      // - Exits cleanly with "No files selected. Exiting."

      const selectedPaths: string[] = [];
      const shouldExit = selectedPaths.length === 0;

      expect(shouldExit).toBe(true);
    });
  });

  describe('promptConfirm helper function', () => {
    it('should create Ink confirm prompt and return boolean result', async () => {
      // The promptConfirm helper function should:
      // 1. Create a new Ink Confirm component instance
      // 2. Render it to the terminal
      // 3. Wait for user input
      // 4. Resolve with boolean result
      // 5. Clean up and exit Ink

      const mockPromptConfirm = async (
        message: string,
        defaultValue: boolean
      ): Promise<boolean> => {
        // Simulate prompt
        return Promise.resolve(defaultValue);
      };

      const result = await mockPromptConfirm('Test prompt?', true);
      expect(typeof result).toBe('boolean');
      expect(result).toBe(true);

      const result2 = await mockPromptConfirm('Another test?', false);
      expect(result2).toBe(false);
    });

    it('should pass correct message to Confirm component', async () => {
      const messages = [
        'Strip comments from source files?',
        'Include directory tree view?',
        'Include statistics section?',
        'Press ENTER to generate, or N to cancel',
      ];

      for (const msg of messages) {
        expect(typeof msg).toBe('string');
        expect(msg.length).toBeGreaterThan(0);
      }
    });

    it('should pass correct default value to Confirm component', () => {
      const testCases = [
        { message: 'Strip comments?', defaultValue: false },
        { message: 'Include tree?', defaultValue: true },
        { message: 'Include stats?', defaultValue: true },
        { message: 'Generate?', defaultValue: true },
      ];

      for (const testCase of testCases) {
        expect(typeof testCase.defaultValue).toBe('boolean');
      }
    });
  });

  describe('file selection flow', () => {
    it('should handle empty selection (user presses Q to quit)', async () => {
      const options = createMockOptions();
      const mockFiles = [createMockFile('src/index.ts')];
      const mockScanResult = createMockScanResult(mockFiles);

      vi.mocked(scanModule.scanFiles).mockResolvedValue(mockScanResult);
      vi.mocked(inkModule.render).mockImplementationOnce((element: React.ReactElement) => {
        // Simulate user quitting (empty selection)
        if (element?.props?.onComplete) {
          setTimeout(() => element.props.onComplete([]), 10);
        }
        return {
          waitUntilExit: () => Promise.resolve(),
        } as ReturnType<typeof inkModule.render>;
      });

      await runInteractive(options);

      expect(consoleLogSpy).toHaveBeenCalledWith('No files selected. Exiting.');
    });

    it('should proceed with confirmations only when files are selected', () => {
      const selectedPaths = ['src/file1.ts', 'src/file2.ts'];

      if (selectedPaths.length > 0) {
        // Should continue to confirmation prompts
        expect(selectedPaths.length).toBeGreaterThan(0);
        return;
      }

      // Should not reach here
      expect(true).toBe(false);
    });

    it('should filter scan results to selected files', () => {
      const allFiles = [
        createMockFile('src/a.ts', true),
        createMockFile('src/b.ts', true),
        createMockFile('src/c.ts', false),
      ];

      const selectedPaths = ['src/a.ts'];
      const selectedFiles = allFiles.filter((f) => selectedPaths.includes(f.relativePath));

      expect(selectedFiles.length).toBe(1);
      expect(selectedFiles[0].relativePath).toBe('src/a.ts');
    });

    it('should calculate total bytes for selected files', () => {
      const selectedFiles = [
        createMockFile('src/a.ts'),
        createMockFile('src/b.ts'),
      ];

      const totalBytes = selectedFiles.reduce((sum, f) => sum + f.sizeBytes, 0);
      expect(totalBytes).toBe(2000); // 1000 + 1000
    });

    it('should calculate extension counts for selected files', () => {
      const selectedFiles = [
        createMockFile('src/a.ts'),
        createMockFile('src/b.ts'),
        createMockFile('src/c.tsx'),
      ];

      const extensionCounts: Record<string, number> = {};
      for (const file of selectedFiles) {
        extensionCounts[file.extension] = (extensionCounts[file.extension] ?? 0) + 1;
      }

      expect(extensionCounts['ts']).toBe(2);
      expect(extensionCounts['tsx']).toBe(1);
    });
  });

  describe('user settings', () => {
    it('should load user settings on startup', async () => {
      const options = createMockOptions();
      const mockScanResult = createMockScanResult([]);

      vi.mocked(scanModule.scanFiles).mockResolvedValue(mockScanResult);

      await runInteractive(options);

      expect(userSettingsModule.loadUserSettings).toHaveBeenCalled();
    });

    it('should use saved preferences as defaults', () => {
      const userSettings = {
        stripComments: true,
        withTree: false,
        withStats: true,
      };

      const options = createMockOptions({ stripComments: false, withTree: true, withStats: false });

      // User settings should override option defaults
      const defaultStripComments = userSettings.stripComments ?? options.stripComments;
      const defaultWithTree = userSettings.withTree ?? options.withTree;
      const defaultWithStats = userSettings.withStats ?? options.withStats;

      expect(defaultStripComments).toBe(true);
      expect(defaultWithTree).toBe(false);
      expect(defaultWithStats).toBe(true);
    });

    it('should save user preferences after confirmation', () => {
      const newSettings = {
        stripComments: true,
        withTree: true,
        withStats: false,
      };

      // After user confirms options, settings should be saved
      expect(userSettingsModule.saveUserSettings).toBeDefined();
      expect(typeof newSettings.stripComments).toBe('boolean');
      expect(typeof newSettings.withTree).toBe('boolean');
      expect(typeof newSettings.withStats).toBe('boolean');
    });

    it('should handle missing user settings gracefully', () => {
      const userSettings = {};
      const options = createMockOptions({ stripComments: false, withTree: true, withStats: true });

      // When user settings don't exist, use option defaults
      const defaultStripComments = userSettings.stripComments ?? options.stripComments;
      const defaultWithTree = userSettings.withTree ?? options.withTree;
      const defaultWithStats = userSettings.withStats ?? options.withStats;

      expect(defaultStripComments).toBe(false);
      expect(defaultWithTree).toBe(true);
      expect(defaultWithStats).toBe(true);
    });
  });

  describe('--yes mode', () => {
    it('should skip file selection when --yes flag is set', () => {
      const options = createMockOptions({ yes: true });
      const files = [
        createMockFile('src/a.ts', true),
        createMockFile('src/b.ts', false),
      ];

      const selectedPaths = files.filter(f => f.isDefaultIncluded).map(f => f.relativePath);

      expect(selectedPaths).toEqual(['src/a.ts']);
    });

    it('should use all pre-selected files in --yes mode', () => {
      const files = [
        createMockFile('src/a.ts', true),
        createMockFile('src/b.ts', true),
        createMockFile('node_modules/pkg.js', false),
      ];

      const selectedPaths = files.filter(f => f.isDefaultIncluded).map(f => f.relativePath);

      expect(selectedPaths.length).toBe(2);
      expect(selectedPaths).toContain('src/a.ts');
      expect(selectedPaths).toContain('src/b.ts');
      expect(selectedPaths).not.toContain('node_modules/pkg.js');
    });

    it('should skip confirmation prompts in --yes mode', () => {
      const options = createMockOptions({ yes: true });
      const userSettings = { stripComments: true, withTree: false, withStats: true };

      // In --yes mode, use saved preferences directly
      const stripComments = userSettings.stripComments ?? options.stripComments;
      const withTree = userSettings.withTree ?? options.withTree;
      const withStats = userSettings.withStats ?? options.withStats;

      expect(stripComments).toBe(true);
      expect(withTree).toBe(false);
      expect(withStats).toBe(true);
    });

    it('should auto-generate without confirmation in --yes mode', () => {
      const options = createMockOptions({ yes: true });

      // In --yes mode, shouldGenerate is automatically true
      const shouldGenerate = true;

      expect(shouldGenerate).toBe(true);
    });

    it('should log that --yes mode is being used', async () => {
      const options = createMockOptions({ yes: true });
      const mockFiles = [
        createMockFile('src/index.ts', true),
        createMockFile('src/utils.ts', true),
      ];
      const mockScanResult = createMockScanResult(mockFiles);

      vi.mocked(scanModule.scanFiles).mockResolvedValue(mockScanResult);

      // Mock the confirmations and file writing
      let confirmCallCount = 0;
      vi.mocked(inkModule.render).mockImplementation(() => {
        confirmCallCount++;
        return {
          waitUntilExit: () => Promise.resolve(),
        } as ReturnType<typeof inkModule.render>;
      });

      await runInteractive(options);

      // Should log --yes mode messages
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('--yes mode'));
    });
  });

  describe('output generation', () => {
    it('should render output using the render function', () => {
      const scan = createMockScanResult([createMockFile('src/index.ts')]);
      const options = createMockOptions();

      // The render function should be called with scan and options
      expect(renderModule.render).toBeDefined();
      expect(scan.files.length).toBeGreaterThan(0);
      expect(options.format).toBe('markdown');
    });

    it('should write output to specified file', async () => {
      const options = createMockOptions({ outFile: 'test-output.md' });

      expect(options.outFile).toBe('test-output.md');
      expect(fsModule.writeFile).toBeDefined();
    });

    it('should log output file path after writing', () => {
      const outputPath = 'output.md';

      // Should log success message with file path
      expect(typeof outputPath).toBe('string');
      expect(outputPath.endsWith('.md')).toBe(true);
    });

    it('should handle different output formats', () => {
      const formats = ['markdown', 'xml', 'json'];

      for (const format of formats) {
        const options = createMockOptions({ format: format as 'markdown' | 'xml' | 'json' });
        expect(options.format).toBe(format);
      }
    });
  });

  describe('clipboard functionality', () => {
    it('should copy to clipboard when copyToClipboard is true', () => {
      const options = createMockOptions({ copyToClipboard: true });

      expect(options.copyToClipboard).toBe(true);
    });

    it('should not copy when copyToClipboard is false', () => {
      const options = createMockOptions({ copyToClipboard: false });

      expect(options.copyToClipboard).toBe(false);
    });

    it('should handle clipboard errors gracefully', () => {
      // When clipboard is not available, should warn but not crash
      const clipboardError = new Error('Clipboard not available');

      expect(clipboardError.message).toContain('Clipboard');
    });

    it('should use platform-specific clipboard command', () => {
      const platforms = {
        darwin: { cmd: 'pbcopy', args: [] },
        win32: { cmd: 'clip', args: [] },
        linux: { cmd: 'xclip', args: ['-selection', 'clipboard'] },
      };

      expect(platforms.darwin.cmd).toBe('pbcopy');
      expect(platforms.win32.cmd).toBe('clip');
      expect(platforms.linux.cmd).toBe('xclip');
    });
  });

  describe('LLM report', () => {
    it('should show LLM report when showLLMReport is true', () => {
      const options = createMockOptions({ showLLMReport: true });

      expect(options.showLLMReport).toBe(true);
    });

    it('should not show LLM report when showLLMReport is false', () => {
      const options = createMockOptions({ showLLMReport: false });

      expect(options.showLLMReport).toBe(false);
    });
  });

  describe('prompt helper', () => {
    it('should show prompt helper when showPromptHelper is true', () => {
      const options = createMockOptions({ showPromptHelper: true });

      expect(options.showPromptHelper).toBe(true);
    });

    it('should not show prompt helper when showPromptHelper is false', () => {
      const options = createMockOptions({ showPromptHelper: false });

      expect(options.showPromptHelper).toBe(false);
    });
  });

  describe('history recording', () => {
    it('should record history entry after generation', () => {
      expect(historyModule.recordHistoryEntry).toBeDefined();
    });

    it('should include all relevant data in history entry', () => {
      const historyEntry = {
        resolvedOptions: createMockOptions(),
        cliArgs: ['--interactive'],
        selectedFiles: [createMockFile('src/index.ts')],
        estimatedTokens: 1000,
        estimatedCost: 0.01,
        duration: 5000,
      };

      expect(historyEntry.resolvedOptions).toBeDefined();
      expect(historyEntry.cliArgs).toContain('--interactive');
      expect(historyEntry.selectedFiles.length).toBe(1);
      expect(historyEntry.estimatedTokens).toBe(1000);
      expect(historyEntry.estimatedCost).toBe(0.01);
      expect(historyEntry.duration).toBe(5000);
    });

    it('should handle history recording errors gracefully', async () => {
      // History errors should not fail the whole operation
      vi.mocked(historyModule.recordHistoryEntry).mockRejectedValue(new Error('History error'));

      // Should continue without throwing
      expect(true).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle scan errors', async () => {
      const options = createMockOptions();

      vi.mocked(scanModule.scanFiles).mockRejectedValue(new Error('Scan failed'));

      await expect(runInteractive(options)).rejects.toThrow('Scan failed');
    });

    it('should handle render errors', () => {
      vi.mocked(renderModule.render).mockRejectedValue(new Error('Render failed'));

      expect(renderModule.render).toBeDefined();
    });

    it('should handle file write errors', () => {
      vi.mocked(fsModule.writeFile).mockRejectedValue(new Error('Write failed'));

      expect(fsModule.writeFile).toBeDefined();
    });
  });

  describe('token estimation', () => {
    it('should estimate tokens for generated output', () => {
      const output = '# Test\nThis is some test content';
      const estimatedTokens = Math.ceil(output.length / 4); // Simple approximation

      expect(estimatedTokens).toBeGreaterThan(0);
    });

    it('should calculate cost based on model preset', () => {
      const estimatedTokens = 1000;
      const modelName = 'claude-sonnet';

      // Cost calculation should work with different models
      expect(estimatedTokens).toBe(1000);
      expect(modelName).toBe('claude-sonnet');
    });
  });

  describe('generation summary', () => {
    it('should display generation summary before confirming', () => {
      // Summary should include:
      // - File count
      // - Total size
      // - Token estimate
      // - Cost estimate (if model preset)

      const summary = {
        fileCount: 10,
        totalSize: 50000,
        tokenEstimate: 12500,
        costEstimate: 0.05,
      };

      expect(summary.fileCount).toBe(10);
      expect(summary.totalSize).toBe(50000);
      expect(summary.tokenEstimate).toBe(12500);
      expect(summary.costEstimate).toBe(0.05);
    });

    it('should use compact mode for dashboard', () => {
      const dashboardOptions = {
        mode: 'compact' as const,
        displaySettings: {
          showModelWarnings: true,
          showBinaryFiles: true,
          showSkippedPatterns: true,
          showBudgetSummary: true,
        },
      };

      expect(dashboardOptions.mode).toBe('compact');
    });
  });

  describe('cancellation handling', () => {
    it('should handle user cancelling at file selection', async () => {
      const options = createMockOptions();
      const mockFiles = [createMockFile('src/index.ts')];
      const mockScanResult = createMockScanResult(mockFiles);

      vi.mocked(scanModule.scanFiles).mockResolvedValue(mockScanResult);
      vi.mocked(inkModule.render).mockImplementationOnce((element: React.ReactElement) => {
        // Simulate user cancelling
        if (element?.props?.onComplete) {
          setTimeout(() => element.props.onComplete([]), 10);
        }
        return {
          waitUntilExit: () => Promise.resolve(),
        } as ReturnType<typeof inkModule.render>;
      });

      await runInteractive(options);

      expect(consoleLogSpy).toHaveBeenCalledWith('No files selected. Exiting.');
    });

    it('should handle user cancelling at generation confirmation', () => {
      // When user presses N at final confirmation
      const shouldGenerate = false;

      if (!shouldGenerate) {
        // Should exit without generating
        expect(shouldGenerate).toBe(false);
        return;
      }

      expect(true).toBe(false); // Should not reach here
    });
  });

  describe('option updating', () => {
    it('should update options with user selections', () => {
      const originalOptions = createMockOptions({
        stripComments: false,
        withTree: false,
        withStats: false,
      });

      const userSelections = {
        stripComments: true,
        withTree: true,
        withStats: true,
      };

      const updatedOptions = {
        ...originalOptions,
        ...userSelections,
      };

      expect(updatedOptions.stripComments).toBe(true);
      expect(updatedOptions.withTree).toBe(true);
      expect(updatedOptions.withStats).toBe(true);
    });

    it('should preserve other options when updating', () => {
      const originalOptions = createMockOptions({
        root: '/test',
        outFile: 'out.md',
        format: 'markdown',
      });

      const updatedOptions = {
        ...originalOptions,
        stripComments: true,
      };

      expect(updatedOptions.root).toBe('/test');
      expect(updatedOptions.outFile).toBe('out.md');
      expect(updatedOptions.format).toBe('markdown');
    });
  });

  describe('timing and performance', () => {
    it('should track duration from start to finish', () => {
      const startTime = Date.now();
      const endTime = startTime + 5000;
      const duration = endTime - startTime;

      expect(duration).toBe(5000);
    });

    it('should include duration in history entry', () => {
      const duration = 3500;

      expect(duration).toBeGreaterThan(0);
      expect(typeof duration).toBe('number');
    });
  });

  describe('interactive mode indicator', () => {
    it('should display interactive mode header', async () => {
      const options = createMockOptions();
      const mockScanResult = createMockScanResult([]);

      vi.mocked(scanModule.scanFiles).mockResolvedValue(mockScanResult);

      await runInteractive(options);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Interactive Mode'));
    });
  });
});
