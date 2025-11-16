import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { mkdir, unlink, rm } from 'node:fs/promises';
import {
  displayHistoryList,
  displayHistoryEntry,
  displayHistoryDiff,
  displayHistoryStats,
  displayHistoryExport,
} from './history.js';
import { recordHistoryEntry, clearHistory, tagHistoryEntry, annotateHistoryEntry, loadHistory } from '../core/history.js';
import type { ResolvedOptions, FileInfo } from '../core/types.js';

// Mock the config paths - use a separate directory from core tests
vi.mock('node:os', async () => {
  const actual = await vi.importActual('node:os');
  return {
    ...actual,
    homedir: () => join(process.cwd(), '.test-home-cli'),
  };
});

describe('CLI history display functions', () => {
  let consoleLogs: string[];
  let consoleErrors: string[];
  const originalLog = console.log;
  const originalError = console.error;

  beforeEach(async () => {
    // Create test directory
    const testHome = join(process.cwd(), '.test-home-cli', '.config', 'repo-roller');
    await mkdir(testHome, { recursive: true });

    // Clear any existing history - write empty store for isolation
    const historyFile = join(testHome, 'history.json');
    const { writeFile } = await import('node:fs/promises');
    await writeFile(historyFile, JSON.stringify({ version: 1, entries: [] }), 'utf-8');

    // Capture console output
    consoleLogs = [];
    consoleErrors = [];
    console.log = (...args: unknown[]) => {
      consoleLogs.push(args.map((a) => String(a)).join(' '));
    };
    console.error = (...args: unknown[]) => {
      consoleErrors.push(args.map((a) => String(a)).join(' '));
    };
  });

  afterEach(async () => {
    // Restore console
    console.log = originalLog;
    console.error = originalError;

    // Cleanup
    const testHome = join(process.cwd(), '.test-home-cli');
    try {
      await rm(testHome, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('displayHistoryList', () => {
    it('should display empty history message', async () => {
      await displayHistoryList();

      const output = consoleLogs.join('\n');
      expect(output).toContain('No history entries found');
      expect(output).toContain('Generate some bundles first');
    });

    it('should display history entries', async () => {
      const mockOptions: ResolvedOptions = {
        root: '/test/project-alpha',
        outFile: 'out.md',
        include: [],
        exclude: [],
        extensions: [],
        maxFileSizeBytes: 100000,
        stripComments: false,
        withTree: true,
        withStats: true,
        sort: 'path',
        interactive: false,
        verbose: false,
        profile: 'default',
        format: 'md',
        dryRun: false,
        statsOnly: false,
        compact: false,
        indent: 2,
        toc: false,
        frontMatter: false,
        tokenCount: true,
        yes: false,
        showLLMReport: false,
        addOutlines: false,
        showPromptHelper: false,
        presetName: 'llm',
      };

      await recordHistoryEntry({
        resolvedOptions: mockOptions,
        cliArgs: ['--preset', 'llm'],
        selectedFiles: [],
        estimatedTokens: 5000,
        estimatedCost: 0.015,
        duration: 150,
      });

      await displayHistoryList();

      const output = consoleLogs.join('\n');
      expect(output).toContain('Bundle History');
      expect(output).toContain('project-alpha');
      expect(output).toContain('5,000'); // formatted with comma
      expect(output).toContain('$0.0150');
      expect(output).toContain('[md]');
      expect(output).toContain('llm');
    });

    it('should respect limit option', async () => {
      const mockOptions: ResolvedOptions = {
        root: '/test',
        outFile: 'out.md',
        include: [],
        exclude: [],
        extensions: [],
        maxFileSizeBytes: 100000,
        stripComments: false,
        withTree: true,
        withStats: true,
        sort: 'path',
        interactive: false,
        verbose: false,
        profile: 'default',
        format: 'md',
        dryRun: false,
        statsOnly: false,
        compact: false,
        indent: 2,
        toc: false,
        frontMatter: false,
        tokenCount: true,
        yes: false,
        showLLMReport: false,
        addOutlines: false,
        showPromptHelper: false,
      };

      for (let i = 0; i < 5; i++) {
        await recordHistoryEntry({
          resolvedOptions: mockOptions,
          cliArgs: [],
          selectedFiles: [],
          estimatedTokens: 1000 * i,
          duration: 100,
        });
      }

      await displayHistoryList({ limit: 2 });

      const output = consoleLogs.join('\n');
      // Should show exactly 2 entries
      expect(output).toContain('Showing 2 most recent entries');
    });

    it('should filter by project', async () => {
      const mockOptions1: ResolvedOptions = {
        root: '/project-alpha',
        outFile: 'out.md',
        include: [],
        exclude: [],
        extensions: [],
        maxFileSizeBytes: 100000,
        stripComments: false,
        withTree: true,
        withStats: true,
        sort: 'path',
        interactive: false,
        verbose: false,
        profile: 'default',
        format: 'md',
        dryRun: false,
        statsOnly: false,
        compact: false,
        indent: 2,
        toc: false,
        frontMatter: false,
        tokenCount: true,
        yes: false,
        showLLMReport: false,
        addOutlines: false,
        showPromptHelper: false,
      };

      const mockOptions2: ResolvedOptions = {
        ...mockOptions1,
        root: '/project-beta',
      };

      await recordHistoryEntry({
        resolvedOptions: mockOptions1,
        cliArgs: [],
        selectedFiles: [],
        estimatedTokens: 1000,
        duration: 100,
      });

      await recordHistoryEntry({
        resolvedOptions: mockOptions2,
        cliArgs: [],
        selectedFiles: [],
        estimatedTokens: 2000,
        duration: 200,
      });

      await displayHistoryList({ project: 'alpha' });

      const output = consoleLogs.join('\n');
      expect(output).toContain('project-alpha');
      expect(output).not.toContain('project-beta');
      expect(output).toContain('Showing 1 most recent');
    });

    it('should display tags when present', async () => {
      const mockOptions: ResolvedOptions = {
        root: '/test',
        outFile: 'out.md',
        include: [],
        exclude: [],
        extensions: [],
        maxFileSizeBytes: 100000,
        stripComments: false,
        withTree: true,
        withStats: true,
        sort: 'path',
        interactive: false,
        verbose: false,
        profile: 'default',
        format: 'md',
        dryRun: false,
        statsOnly: false,
        compact: false,
        indent: 2,
        toc: false,
        frontMatter: false,
        tokenCount: true,
        yes: false,
        showLLMReport: false,
        addOutlines: false,
        showPromptHelper: false,
      };

      await recordHistoryEntry({
        resolvedOptions: mockOptions,
        cliArgs: [],
        selectedFiles: [],
        estimatedTokens: 1000,
        duration: 100,
      });

      await tagHistoryEntry(-1, ['production', 'important']);

      await displayHistoryList();

      const output = consoleLogs.join('\n');
      expect(output).toContain('#production');
      expect(output).toContain('#important');
    });
  });

  describe('displayHistoryEntry', () => {
    it('should display error for non-existent entry', async () => {
      await displayHistoryEntry('nonexistent');

      const errorOutput = consoleErrors.join('\n');
      expect(errorOutput).toContain('History entry not found');
    });

    it('should display detailed entry information', async () => {
      const mockOptions: ResolvedOptions = {
        root: '/home/user/my-project',
        outFile: 'bundle.md',
        include: [],
        exclude: ['node_modules'],
        extensions: ['.ts'],
        maxFileSizeBytes: 100000,
        stripComments: false,
        withTree: true,
        withStats: true,
        sort: 'path',
        interactive: false,
        verbose: false,
        profile: 'custom',
        format: 'md',
        dryRun: false,
        statsOnly: false,
        compact: false,
        indent: 2,
        toc: false,
        frontMatter: false,
        tokenCount: true,
        yes: false,
        showLLMReport: false,
        addOutlines: false,
        showPromptHelper: false,
        presetName: 'llm',
        modelPreset: 'gpt-4o',
      };

      const files: FileInfo[] = [
        { absolutePath: '/src/index.ts', relativePath: 'src/index.ts', sizeBytes: 1000, extension: '.ts', isBinary: false, isDefaultIncluded: true },
        { absolutePath: '/src/utils.ts', relativePath: 'src/utils.ts', sizeBytes: 500, extension: '.ts', isBinary: false, isDefaultIncluded: true },
      ];

      await recordHistoryEntry({
        resolvedOptions: mockOptions,
        cliArgs: ['--preset', 'llm', '--model', 'gpt-4o'],
        selectedFiles: files,
        estimatedTokens: 7500,
        estimatedCost: 0.0225,
        duration: 250,
      });

      await displayHistoryEntry(-1);

      const output = consoleLogs.join('\n');
      expect(output).toContain('Bundle Details');
      expect(output).toContain('ID');
      expect(output).toContain('Timestamp');
      expect(output).toContain('Project');
      expect(output).toContain('my-project');
      expect(output).toContain('/home/user/my-project');
      expect(output).toContain('Command');
      expect(output).toContain('llm');
      expect(output).toContain('custom');
      expect(output).toContain('gpt-4o');
      expect(output).toContain('Results');
      expect(output).toContain('2'); // files
      expect(output).toContain('7,500'); // tokens
      expect(output).toContain('$0.0225');
      expect(output).toContain('bundle.md');
      expect(output).toContain('250ms');
      expect(output).toContain('Files Included');
      expect(output).toContain('src/index.ts');
      expect(output).toContain('src/utils.ts');
      expect(output).toContain('Replay');
      expect(output).toContain('repo-roller');
    });

    it('should display tags and notes when present', async () => {
      // Clear all entries first to ensure isolation
      await clearHistory({ all: true });

      const mockOptions: ResolvedOptions = {
        root: '/test',
        outFile: 'out.md',
        include: [],
        exclude: [],
        extensions: [],
        maxFileSizeBytes: 100000,
        stripComments: false,
        withTree: true,
        withStats: true,
        sort: 'path',
        interactive: false,
        verbose: false,
        profile: 'default',
        format: 'md',
        dryRun: false,
        statsOnly: false,
        compact: false,
        indent: 2,
        toc: false,
        frontMatter: false,
        tokenCount: true,
        yes: false,
        showLLMReport: false,
        addOutlines: false,
        showPromptHelper: false,
      };

      await recordHistoryEntry({
        resolvedOptions: mockOptions,
        cliArgs: [],
        selectedFiles: [],
        estimatedTokens: 1000,
        duration: 100,
      });

      await tagHistoryEntry(-1, ['important', 'deploy']);
      await annotateHistoryEntry(-1, 'Production deployment bundle');

      await displayHistoryEntry(-1);

      const output = consoleLogs.join('\n');
      expect(output).toContain('Tags');
      expect(output).toContain('#important');
      expect(output).toContain('#deploy');
      expect(output).toContain('Notes');
      expect(output).toContain('Production deployment bundle');
    });

    it('should truncate long file lists', async () => {
      // Clear all entries first to ensure isolation
      await clearHistory({ all: true });

      const mockOptions: ResolvedOptions = {
        root: '/test',
        outFile: 'out.md',
        include: [],
        exclude: [],
        extensions: [],
        maxFileSizeBytes: 100000,
        stripComments: false,
        withTree: true,
        withStats: true,
        sort: 'path',
        interactive: false,
        verbose: false,
        profile: 'default',
        format: 'md',
        dryRun: false,
        statsOnly: false,
        compact: false,
        indent: 2,
        toc: false,
        frontMatter: false,
        tokenCount: true,
        yes: false,
        showLLMReport: false,
        addOutlines: false,
        showPromptHelper: false,
      };

      const files: FileInfo[] = [];
      for (let i = 0; i < 15; i++) {
        files.push({
          absolutePath: `/file${i}.ts`,
          relativePath: `file${i}.ts`,
          sizeBytes: 100,
          extension: '.ts',
          isBinary: false,
          isDefaultIncluded: true,
        });
      }

      await recordHistoryEntry({
        resolvedOptions: mockOptions,
        cliArgs: [],
        selectedFiles: files,
        estimatedTokens: 1500,
        duration: 100,
      });

      await displayHistoryEntry(-1);

      const output = consoleLogs.join('\n');
      expect(output).toContain('and 5 more');
    });
  });

  describe('displayHistoryDiff', () => {
    it('should display error for invalid range format', async () => {
      await displayHistoryDiff('invalid');

      const errorOutput = consoleErrors.join('\n');
      expect(errorOutput).toContain('Invalid diff range format');
    });

    it('should display comparison between entries', async () => {
      // Clear all entries first to ensure isolation
      await clearHistory({ all: true });

      const mockOptions: ResolvedOptions = {
        root: '/test',
        outFile: 'out.md',
        include: [],
        exclude: [],
        extensions: [],
        maxFileSizeBytes: 100000,
        stripComments: false,
        withTree: true,
        withStats: true,
        sort: 'path',
        interactive: false,
        verbose: false,
        profile: 'default',
        format: 'md',
        dryRun: false,
        statsOnly: false,
        compact: false,
        indent: 2,
        toc: false,
        frontMatter: false,
        tokenCount: true,
        yes: false,
        showLLMReport: false,
        addOutlines: false,
        showPromptHelper: false,
      };

      const files1: FileInfo[] = [
        { absolutePath: '/a', relativePath: 'a.ts', sizeBytes: 100, extension: '.ts', isBinary: false, isDefaultIncluded: true },
        { absolutePath: '/b', relativePath: 'b.ts', sizeBytes: 100, extension: '.ts', isBinary: false, isDefaultIncluded: true },
      ];

      const files2: FileInfo[] = [
        { absolutePath: '/b', relativePath: 'b.ts', sizeBytes: 100, extension: '.ts', isBinary: false, isDefaultIncluded: true },
        { absolutePath: '/c', relativePath: 'c.ts', sizeBytes: 200, extension: '.ts', isBinary: false, isDefaultIncluded: true },
        { absolutePath: '/d', relativePath: 'd.ts', sizeBytes: 150, extension: '.ts', isBinary: false, isDefaultIncluded: true },
      ];

      await recordHistoryEntry({
        resolvedOptions: mockOptions,
        cliArgs: [],
        selectedFiles: files1,
        estimatedTokens: 1000,
        estimatedCost: 0.003,
        duration: 100,
      });

      await recordHistoryEntry({
        resolvedOptions: mockOptions,
        cliArgs: [],
        selectedFiles: files2,
        estimatedTokens: 2000,
        estimatedCost: 0.006,
        duration: 150,
      });

      await displayHistoryDiff('-2..-1');

      const output = consoleLogs.join('\n');
      expect(output).toContain('Bundle Comparison');
      expect(output).toContain('Entries');
      expect(output).toContain('From:');
      expect(output).toContain('To:');
      expect(output).toContain('Changes');
      expect(output).toContain('Files');
      expect(output).toContain('Tokens');
      expect(output).toContain('Added:');
      expect(output).toContain('Removed:');
      expect(output).toContain('Unchanged:');
    });

    it('should display added and removed files', async () => {
      // Clear all entries first to ensure isolation
      await clearHistory({ all: true });

      const mockOptions: ResolvedOptions = {
        root: '/test',
        outFile: 'out.md',
        include: [],
        exclude: [],
        extensions: [],
        maxFileSizeBytes: 100000,
        stripComments: false,
        withTree: true,
        withStats: true,
        sort: 'path',
        interactive: false,
        verbose: false,
        profile: 'default',
        format: 'md',
        dryRun: false,
        statsOnly: false,
        compact: false,
        indent: 2,
        toc: false,
        frontMatter: false,
        tokenCount: true,
        yes: false,
        showLLMReport: false,
        addOutlines: false,
        showPromptHelper: false,
      };

      const files1: FileInfo[] = [
        { absolutePath: '/old', relativePath: 'old.ts', sizeBytes: 100, extension: '.ts', isBinary: false, isDefaultIncluded: true },
      ];

      const files2: FileInfo[] = [
        { absolutePath: '/new', relativePath: 'new.ts', sizeBytes: 100, extension: '.ts', isBinary: false, isDefaultIncluded: true },
      ];

      await recordHistoryEntry({
        resolvedOptions: mockOptions,
        cliArgs: [],
        selectedFiles: files1,
        estimatedTokens: 1000,
        duration: 100,
      });

      await recordHistoryEntry({
        resolvedOptions: mockOptions,
        cliArgs: [],
        selectedFiles: files2,
        estimatedTokens: 1000,
        duration: 100,
      });

      await displayHistoryDiff('-2..-1');

      const output = consoleLogs.join('\n');
      expect(output).toContain('Added Files');
      expect(output).toContain('new.ts');
      expect(output).toContain('Removed Files');
      expect(output).toContain('old.ts');
    });
  });

  describe('displayHistoryStats', () => {
    it('should display empty stats message', async () => {
      // Clear all entries first to ensure isolation
      await clearHistory({ all: true });

      await displayHistoryStats();

      const output = consoleLogs.join('\n');
      expect(output).toContain('No history data yet');
    });

    it('should display comprehensive statistics', async () => {
      // Clear all entries first to ensure isolation
      await clearHistory({ all: true });

      const mockOptions1: ResolvedOptions = {
        root: '/project-alpha',
        outFile: 'out.md',
        include: [],
        exclude: [],
        extensions: [],
        maxFileSizeBytes: 100000,
        stripComments: false,
        withTree: true,
        withStats: true,
        sort: 'path',
        interactive: false,
        verbose: false,
        profile: 'default',
        format: 'md',
        dryRun: false,
        statsOnly: false,
        compact: false,
        indent: 2,
        toc: false,
        frontMatter: false,
        tokenCount: true,
        yes: false,
        showLLMReport: false,
        addOutlines: false,
        showPromptHelper: false,
        presetName: 'llm',
      };

      const mockOptions2: ResolvedOptions = {
        ...mockOptions1,
        root: '/project-beta',
        presetName: 'code-review',
      };

      const files: FileInfo[] = [
        { absolutePath: '/a', relativePath: 'a.ts', sizeBytes: 100, extension: '.ts', isBinary: false, isDefaultIncluded: true },
        { absolutePath: '/b', relativePath: 'b.ts', sizeBytes: 100, extension: '.ts', isBinary: false, isDefaultIncluded: true },
      ];

      await recordHistoryEntry({
        resolvedOptions: mockOptions1,
        cliArgs: [],
        selectedFiles: files,
        estimatedTokens: 5000,
        estimatedCost: 0.015,
        duration: 150,
      });

      await recordHistoryEntry({
        resolvedOptions: mockOptions2,
        cliArgs: [],
        selectedFiles: files,
        estimatedTokens: 3000,
        estimatedCost: 0.009,
        duration: 100,
      });

      await displayHistoryStats();

      const output = consoleLogs.join('\n');
      expect(output).toContain('History Statistics');
      expect(output).toContain('Summary');
      expect(output).toContain('Total Runs');
      expect(output).toContain('2');
      expect(output).toContain('Unique Projects');
      expect(output).toContain('Avg Files/Run');
      expect(output).toContain('Totals');
      expect(output).toContain('Tokens Generated');
      expect(output).toContain('8,000');
      expect(output).toContain('Total Cost');
      expect(output).toContain('$0.0240');
      expect(output).toContain('Recent Activity');
      expect(output).toContain('Last 24h');
      expect(output).toContain('Last 7 days');
      expect(output).toContain('Last 30 days');
    });
  });

  describe('displayHistoryExport', () => {
    it('should output JSON format', async () => {
      const mockOptions: ResolvedOptions = {
        root: '/test',
        outFile: 'out.md',
        include: [],
        exclude: [],
        extensions: [],
        maxFileSizeBytes: 100000,
        stripComments: false,
        withTree: true,
        withStats: true,
        sort: 'path',
        interactive: false,
        verbose: false,
        profile: 'default',
        format: 'md',
        dryRun: false,
        statsOnly: false,
        compact: false,
        indent: 2,
        toc: false,
        frontMatter: false,
        tokenCount: true,
        yes: false,
        showLLMReport: false,
        addOutlines: false,
        showPromptHelper: false,
      };

      await recordHistoryEntry({
        resolvedOptions: mockOptions,
        cliArgs: [],
        selectedFiles: [],
        estimatedTokens: 1000,
        duration: 100,
      });

      await displayHistoryExport('json');

      const output = consoleLogs.join('\n');
      const parsed = JSON.parse(output);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(1);
    });

    it('should output CSV format', async () => {
      const mockOptions: ResolvedOptions = {
        root: '/test',
        outFile: 'out.md',
        include: [],
        exclude: [],
        extensions: [],
        maxFileSizeBytes: 100000,
        stripComments: false,
        withTree: true,
        withStats: true,
        sort: 'path',
        interactive: false,
        verbose: false,
        profile: 'default',
        format: 'md',
        dryRun: false,
        statsOnly: false,
        compact: false,
        indent: 2,
        toc: false,
        frontMatter: false,
        tokenCount: true,
        yes: false,
        showLLMReport: false,
        addOutlines: false,
        showPromptHelper: false,
      };

      await recordHistoryEntry({
        resolvedOptions: mockOptions,
        cliArgs: [],
        selectedFiles: [],
        estimatedTokens: 1000,
        duration: 100,
      });

      await displayHistoryExport('csv');

      const output = consoleLogs.join('\n');
      expect(output).toContain('id,timestamp,project');
    });

    it('should output YAML format', async () => {
      const mockOptions: ResolvedOptions = {
        root: '/test',
        outFile: 'out.md',
        include: [],
        exclude: [],
        extensions: [],
        maxFileSizeBytes: 100000,
        stripComments: false,
        withTree: true,
        withStats: true,
        sort: 'path',
        interactive: false,
        verbose: false,
        profile: 'default',
        format: 'md',
        dryRun: false,
        statsOnly: false,
        compact: false,
        indent: 2,
        toc: false,
        frontMatter: false,
        tokenCount: true,
        yes: false,
        showLLMReport: false,
        addOutlines: false,
        showPromptHelper: false,
      };

      await recordHistoryEntry({
        resolvedOptions: mockOptions,
        cliArgs: [],
        selectedFiles: [],
        estimatedTokens: 1000,
        duration: 100,
      });

      await displayHistoryExport('yaml');

      const output = consoleLogs.join('\n');
      expect(output).toContain('- id:');
      expect(output).toContain('timestamp:');
      expect(output).toContain('project:');
    });
  });
});
