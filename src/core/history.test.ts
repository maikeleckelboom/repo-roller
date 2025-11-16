import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { mkdir, writeFile, unlink, rm } from 'node:fs/promises';
import {
  loadHistory,
  recordHistoryEntry,
  queryHistory,
  getHistoryEntry,
  tagHistoryEntry,
  annotateHistoryEntry,
  clearHistory,
  diffHistory,
  entryToCliArgs,
  exportHistory,
  getHistoryStats,
  type HistoryEntry,
} from './history.js';
import type { ResolvedOptions, FileInfo } from './types.js';

const TEST_CONFIG_DIR = join(homedir(), '.config', 'repo-roller-test');
const TEST_HISTORY_FILE = join(TEST_CONFIG_DIR, 'history.json');

// Mock the config paths
vi.mock('node:os', async () => {
  const actual = await vi.importActual('node:os');
  return {
    ...actual,
    homedir: () => join(process.cwd(), '.test-home'),
  };
});

describe('history', () => {
  beforeEach(async () => {
    // Create test directory
    const testHome = join(process.cwd(), '.test-home', '.config', 'repo-roller');
    await mkdir(testHome, { recursive: true });

    // Clear any existing history
    const historyFile = join(testHome, 'history.json');
    try {
      await unlink(historyFile);
    } catch {
      // File doesn't exist
    }
  });

  afterEach(async () => {
    // Cleanup
    const testHome = join(process.cwd(), '.test-home');
    try {
      await rm(testHome, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('loadHistory', () => {
    it('should return empty store when no history exists', async () => {
      const store = await loadHistory();
      expect(store.version).toBe(1);
      expect(store.entries).toEqual([]);
    });
  });

  describe('recordHistoryEntry', () => {
    it('should record a new history entry', async () => {
      const mockOptions: ResolvedOptions = {
        root: '/test/project',
        outFile: 'output.md',
        include: ['**/*.ts'],
        exclude: [],
        extensions: ['.ts'],
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

      const mockFiles: FileInfo[] = [
        {
          absolutePath: '/test/project/src/index.ts',
          relativePath: 'src/index.ts',
          sizeBytes: 1000,
          extension: '.ts',
          isBinary: false,
          isDefaultIncluded: true,
        },
      ];

      const entry = await recordHistoryEntry({
        resolvedOptions: mockOptions,
        cliArgs: ['--preset', 'llm'],
        selectedFiles: mockFiles,
        estimatedTokens: 5000,
        estimatedCost: 0.015,
        duration: 150,
      });

      expect(entry.id).toMatch(/^[a-f0-9-]{36}$/);
      expect(entry.project.path).toBe('/test/project');
      expect(entry.result.fileCount).toBe(1);
      expect(entry.result.estimatedTokens).toBe(5000);
      expect(entry.result.estimatedCost).toBe(0.015);
      expect(entry.result.duration).toBe(150);
      expect(entry.command.args).toEqual(['--preset', 'llm']);
    });

    it('should persist entries across loads', async () => {
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

      const store = await loadHistory();
      expect(store.entries.length).toBe(1);
    });
  });

  describe('queryHistory', () => {
    it('should filter by project name', async () => {
      const mockOptions: ResolvedOptions = {
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

      await recordHistoryEntry({
        resolvedOptions: mockOptions,
        cliArgs: [],
        selectedFiles: [],
        estimatedTokens: 1000,
        duration: 100,
      });

      const filtered = await queryHistory({ project: 'alpha' });
      expect(filtered.length).toBe(1);

      const notFound = await queryHistory({ project: 'beta' });
      expect(notFound.length).toBe(0);
    });

    it('should limit results', async () => {
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

      // Create 5 entries
      for (let i = 0; i < 5; i++) {
        await recordHistoryEntry({
          resolvedOptions: mockOptions,
          cliArgs: [],
          selectedFiles: [],
          estimatedTokens: 1000 * i,
          duration: 100,
        });
      }

      const limited = await queryHistory({ limit: 3 });
      expect(limited.length).toBe(3);
    });
  });

  describe('getHistoryEntry', () => {
    it('should get entry by negative index', async () => {
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

      const entry1 = await recordHistoryEntry({
        resolvedOptions: mockOptions,
        cliArgs: ['first'],
        selectedFiles: [],
        estimatedTokens: 1000,
        duration: 100,
      });

      const entry2 = await recordHistoryEntry({
        resolvedOptions: mockOptions,
        cliArgs: ['second'],
        selectedFiles: [],
        estimatedTokens: 2000,
        duration: 200,
      });

      const last = await getHistoryEntry(-1);
      expect(last?.command.args).toEqual(['second']);

      const secondLast = await getHistoryEntry(-2);
      expect(secondLast?.command.args).toEqual(['first']);
    });

    it('should get entry by partial ID', async () => {
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

      const entry = await recordHistoryEntry({
        resolvedOptions: mockOptions,
        cliArgs: [],
        selectedFiles: [],
        estimatedTokens: 1000,
        duration: 100,
      });

      const shortId = entry.id.slice(0, 8);
      const found = await getHistoryEntry(shortId);
      expect(found?.id).toBe(entry.id);
    });
  });

  describe('diffHistory', () => {
    it('should compute file differences', async () => {
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
        { absolutePath: '/c', relativePath: 'c.ts', sizeBytes: 100, extension: '.ts', isBinary: false, isDefaultIncluded: true },
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
        estimatedTokens: 1500,
        duration: 120,
      });

      const diff = await diffHistory(-2, -1);

      expect(diff.filesDiff.added).toContain('c.ts');
      expect(diff.filesDiff.removed).toContain('a.ts');
      expect(diff.filesDiff.unchanged).toContain('b.ts');
      expect(diff.metricsDiff.estimatedTokens).toBe(500);
    });
  });

  describe('entryToCliArgs', () => {
    it('should convert entry to replay args', () => {
      const entry: HistoryEntry = {
        id: 'test-id',
        timestamp: new Date().toISOString(),
        project: { name: 'test', path: '/test' },
        command: { args: [], preset: 'llm', profile: 'custom', model: 'gpt-4o' },
        result: {
          fileCount: 10,
          totalBytes: 5000,
          estimatedTokens: 2500,
          outputFile: 'out.md',
          format: 'md',
          duration: 150,
        },
        files: { included: [], excluded: [] },
      };

      const args = entryToCliArgs(entry);

      expect(args).toContain('/test');
      expect(args).toContain('--preset');
      expect(args).toContain('llm');
      expect(args).toContain('--profile');
      expect(args).toContain('custom');
      expect(args).toContain('--model');
      expect(args).toContain('gpt-4o');
      expect(args).toContain('--format');
      expect(args).toContain('md');
    });
  });

  describe('exportHistory', () => {
    it('should export as CSV', async () => {
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

      const csv = await exportHistory('csv');
      expect(csv).toContain('id,timestamp,project');
      expect(csv.split('\n').length).toBe(2); // header + 1 row
    });
  });

  describe('getHistoryStats', () => {
    it('should compute aggregate statistics', async () => {
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
        presetName: 'llm',
      };

      await recordHistoryEntry({
        resolvedOptions: mockOptions,
        cliArgs: [],
        selectedFiles: [],
        estimatedTokens: 1000,
        estimatedCost: 0.003,
        duration: 100,
      });

      await recordHistoryEntry({
        resolvedOptions: mockOptions,
        cliArgs: [],
        selectedFiles: [],
        estimatedTokens: 2000,
        estimatedCost: 0.006,
        duration: 200,
      });

      const stats = await getHistoryStats();

      expect(stats.totalRuns).toBe(2);
      expect(stats.uniqueProjects).toBe(1);
      expect(stats.totalTokensGenerated).toBe(3000);
      expect(stats.totalCostIncurred).toBeCloseTo(0.009, 4);
      expect(stats.mostUsedPreset).toBe('llm');
    });
  });

  describe('tagHistoryEntry', () => {
    it('should add tags to an entry', async () => {
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

      await tagHistoryEntry(-1, ['deploy', 'important']);

      const entry = await getHistoryEntry(-1);
      expect(entry?.tags).toContain('deploy');
      expect(entry?.tags).toContain('important');
    });
  });

  describe('annotateHistoryEntry', () => {
    it('should add notes to an entry', async () => {
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

      await annotateHistoryEntry(-1, 'This was a test run');

      const entry = await getHistoryEntry(-1);
      expect(entry?.notes).toBe('This was a test run');
    });
  });

  describe('clearHistory', () => {
    it('should clear all history', async () => {
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

      const count = await clearHistory({ all: true });
      expect(count).toBe(1);

      const store = await loadHistory();
      expect(store.entries.length).toBe(0);
    });
  });
});
