import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { mkdir, writeFile as fsWriteFile, unlink, rm } from 'node:fs/promises';
const writeFile = fsWriteFile;
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
} from '../../src/core/history.js';
import type { ResolvedOptions, FileInfo } from '../../src/core/types.js';

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

    // Clear any existing history by writing an empty store
    const historyFile = join(testHome, 'history.json');
    try {
      await writeFile(historyFile, JSON.stringify({ version: 1, entries: [] }), 'utf-8');
    } catch {
      // File doesn't exist, that's ok
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

    it('should filter by preset', async () => {
      await clearHistory({ all: true });
      const baseOptions: ResolvedOptions = {
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
        resolvedOptions: { ...baseOptions, presetName: 'llm' },
        cliArgs: [],
        selectedFiles: [],
        estimatedTokens: 1000,
        duration: 100,
      });

      await recordHistoryEntry({
        resolvedOptions: { ...baseOptions, presetName: 'code-review' },
        cliArgs: [],
        selectedFiles: [],
        estimatedTokens: 2000,
        duration: 150,
      });

      const llmEntries = await queryHistory({ preset: 'llm' });
      expect(llmEntries.length).toBe(1);

      const codeReviewEntries = await queryHistory({ preset: 'code-review' });
      expect(codeReviewEntries.length).toBe(1);
    });

    it('should filter by tag', async () => {
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

      const prodEntries = await queryHistory({ tag: 'production' });
      expect(prodEntries.length).toBe(1);

      const devEntries = await queryHistory({ tag: 'development' });
      expect(devEntries.length).toBe(0);
    });

    it('should filter by since date', async () => {
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

      const futureDate = new Date(Date.now() + 100000);
      const noResults = await queryHistory({ since: futureDate });
      expect(noResults.length).toBe(0);

      const pastDate = new Date(Date.now() - 100000);
      const results = await queryHistory({ since: pastDate });
      expect(results.length).toBe(1);
    });

    it('should apply offset', async () => {
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

      for (let i = 0; i < 5; i++) {
        await recordHistoryEntry({
          resolvedOptions: mockOptions,
          cliArgs: [`arg${i}`],
          selectedFiles: [],
          estimatedTokens: 1000 * i,
          duration: 100,
        });
      }

      const withOffset = await queryHistory({ offset: 2, limit: 2 });
      expect(withOffset.length).toBe(2);
      // Results are sorted by timestamp descending, so offset skips most recent
    });

    it('should sort results by timestamp descending', async () => {
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
        cliArgs: ['first'],
        selectedFiles: [],
        estimatedTokens: 1000,
        duration: 100,
      });

      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));

      await recordHistoryEntry({
        resolvedOptions: mockOptions,
        cliArgs: ['second'],
        selectedFiles: [],
        estimatedTokens: 2000,
        duration: 200,
      });

      const results = await queryHistory({ limit: 10 });
      // Most recent should be first, check we have at least 2
      expect(results.length).toBeGreaterThanOrEqual(2);
      // Find the entries by their tokens
      const secondEntry = results.find(r => r.result.estimatedTokens === 2000);
      const firstEntry = results.find(r => r.result.estimatedTokens === 1000);
      expect(secondEntry).toBeDefined();
      expect(firstEntry).toBeDefined();
      // Second should come before first in the sorted list
      const secondIndex = results.indexOf(secondEntry!);
      const firstIndex = results.indexOf(firstEntry!);
      expect(secondIndex).toBeLessThan(firstIndex);
    });
  });

  describe('getHistoryEntry', () => {
    it('should get entry by negative index', async () => {
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
      expect(last?.id).toBe(entry2.id);

      const secondLast = await getHistoryEntry(-2);
      expect(secondLast?.id).toBe(entry1.id);
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

    it('should return undefined for non-existent index', async () => {
      const notFound = await getHistoryEntry(999);
      expect(notFound).toBeUndefined();
    });

    it('should return undefined for non-existent ID', async () => {
      const notFound = await getHistoryEntry('nonexistent-id');
      expect(notFound).toBeUndefined();
    });

    it('should get entry by positive index', async () => {
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

      await clearHistory({ all: true });
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

      // Entries are stored in order, so index 0 should be the first one added
      const store = await loadHistory();
      expect(store.entries.length).toBe(2);

      // entry1 should be at index 0, entry2 at index 1
      const foundEntry1 = await getHistoryEntry(0);
      const foundEntry2 = await getHistoryEntry(1);
      expect(foundEntry1?.id).toBe(entry1.id);
      expect(foundEntry2?.id).toBe(entry2.id);
    });

    it('should get entry by full ID', async () => {
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
        cliArgs: ['test'],
        selectedFiles: [],
        estimatedTokens: 1000,
        duration: 100,
      });

      const found = await getHistoryEntry(entry.id);
      expect(found?.id).toBe(entry.id);
      expect(found?.command.args).toEqual(['test']);
    });
  });

  describe('diffHistory', () => {
    it('should compute file differences', async () => {
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

    it('should throw error for non-existent first entry', async () => {
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

      await expect(diffHistory('nonexistent', -1)).rejects.toThrow('History entry not found: nonexistent');
    });

    it('should throw error for non-existent second entry', async () => {
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

      await expect(diffHistory(-1, 'nonexistent')).rejects.toThrow('History entry not found: nonexistent');
    });

    it('should compute cost differences when both entries have costs', async () => {
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
        estimatedCost: 0.01,
        duration: 100,
      });

      await recordHistoryEntry({
        resolvedOptions: mockOptions,
        cliArgs: [],
        selectedFiles: [],
        estimatedTokens: 2000,
        estimatedCost: 0.025,
        duration: 150,
      });

      const diff = await diffHistory(-2, -1);
      expect(diff.metricsDiff.estimatedCost).toBeCloseTo(0.015, 4);
    });

    it('should handle identical entries', async () => {
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

      const files: FileInfo[] = [
        { absolutePath: '/a', relativePath: 'a.ts', sizeBytes: 100, extension: '.ts', isBinary: false, isDefaultIncluded: true },
      ];

      await recordHistoryEntry({
        resolvedOptions: mockOptions,
        cliArgs: [],
        selectedFiles: files,
        estimatedTokens: 1000,
        duration: 100,
      });

      await recordHistoryEntry({
        resolvedOptions: mockOptions,
        cliArgs: [],
        selectedFiles: files,
        estimatedTokens: 1000,
        duration: 100,
      });

      const diff = await diffHistory(-2, -1);
      expect(diff.filesDiff.added.length).toBe(0);
      expect(diff.filesDiff.removed.length).toBe(0);
      expect(diff.filesDiff.unchanged).toContain('a.ts');
      expect(diff.metricsDiff.estimatedTokens).toBe(0);
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

    it('should omit preset if not specified', () => {
      const entry: HistoryEntry = {
        id: 'test-id',
        timestamp: new Date().toISOString(),
        project: { name: 'test', path: '/test' },
        command: { args: [], profile: 'default' },
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
      expect(args).not.toContain('--preset');
    });

    it('should omit profile if default', () => {
      const entry: HistoryEntry = {
        id: 'test-id',
        timestamp: new Date().toISOString(),
        project: { name: 'test', path: '/test' },
        command: { args: [], profile: 'default' },
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
      expect(args).not.toContain('--profile');
    });

    it('should omit model if not specified', () => {
      const entry: HistoryEntry = {
        id: 'test-id',
        timestamp: new Date().toISOString(),
        project: { name: 'test', path: '/test' },
        command: { args: [], profile: 'default' },
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
      expect(args).not.toContain('--model');
    });

    it('should handle json format', () => {
      const entry: HistoryEntry = {
        id: 'test-id',
        timestamp: new Date().toISOString(),
        project: { name: 'test', path: '/project' },
        command: { args: [], profile: 'default' },
        result: {
          fileCount: 5,
          totalBytes: 2000,
          estimatedTokens: 1000,
          outputFile: 'out.json',
          format: 'json',
          duration: 100,
        },
        files: { included: [], excluded: [] },
      };

      const args = entryToCliArgs(entry);
      expect(args).toContain('--format');
      expect(args).toContain('json');
    });

    it('should always include project path as first argument', () => {
      const entry: HistoryEntry = {
        id: 'test-id',
        timestamp: new Date().toISOString(),
        project: { name: 'my-project', path: '/home/user/my-project' },
        command: { args: [], profile: 'default' },
        result: {
          fileCount: 5,
          totalBytes: 2000,
          estimatedTokens: 1000,
          outputFile: 'out.md',
          format: 'md',
          duration: 100,
        },
        files: { included: [], excluded: [] },
      };

      const args = entryToCliArgs(entry);
      expect(args[0]).toBe('/home/user/my-project');
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

    it('should export as JSON', async () => {
      const mockOptions: ResolvedOptions = {
        root: '/test-json',
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
        cliArgs: ['--preset', 'llm'],
        selectedFiles: [],
        estimatedTokens: 2000,
        duration: 150,
      });

      const json = await exportHistory('json');
      const parsed = JSON.parse(json);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(1);
      expect(parsed[0].result.estimatedTokens).toBe(2000);
    });

    it('should export as YAML', async () => {
      const mockOptions: ResolvedOptions = {
        root: '/test-yaml',
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
        estimatedTokens: 3000,
        duration: 200,
      });

      const yaml = await exportHistory('yaml');
      expect(yaml).toContain('- id:');
      expect(yaml).toContain('timestamp:');
      expect(yaml).toContain('project:');
      expect(yaml).toContain('name: test-yaml');
      expect(yaml).toContain('tokens: 3000');
    });

    it('should export empty history', async () => {
      const csv = await exportHistory('csv');
      expect(csv).toContain('id,timestamp,project');
      expect(csv.split('\n').length).toBe(1); // header only

      const json = await exportHistory('json');
      expect(json).toBe('[]');

      const yaml = await exportHistory('yaml');
      expect(yaml).toBe('');
    });

    it('should include git branch in CSV when present', async () => {
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
      expect(csv).toContain('branch');
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

    it('should throw error for non-existent entry', async () => {
      await expect(tagHistoryEntry('nonexistent', ['tag'])).rejects.toThrow('History entry not found: nonexistent');
    });

    it('should append to existing tags', async () => {
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

      await tagHistoryEntry(-1, ['first']);
      await tagHistoryEntry(-1, ['second']);

      const entry = await getHistoryEntry(-1);
      expect(entry?.tags).toContain('first');
      expect(entry?.tags).toContain('second');
      expect(entry?.tags?.length).toBe(2);
    });

    it('should work with partial ID', async () => {
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
      await tagHistoryEntry(shortId, ['partial-id-tag']);

      const updatedEntry = await getHistoryEntry(shortId);
      expect(updatedEntry?.tags).toContain('partial-id-tag');
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

    it('should throw error for non-existent entry', async () => {
      await expect(annotateHistoryEntry('nonexistent', 'notes')).rejects.toThrow('History entry not found: nonexistent');
    });

    it('should overwrite existing notes', async () => {
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

      await annotateHistoryEntry(-1, 'First note');
      await annotateHistoryEntry(-1, 'Second note');

      const entry = await getHistoryEntry(-1);
      expect(entry?.notes).toBe('Second note');
    });

    it('should work with positive index', async () => {
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

      await annotateHistoryEntry(0, 'Note for first entry');

      const entry = await getHistoryEntry(0);
      expect(entry?.notes).toBe('Note for first entry');
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

    it('should clear by ID', async () => {
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

      await recordHistoryEntry({
        resolvedOptions: mockOptions,
        cliArgs: ['second'],
        selectedFiles: [],
        estimatedTokens: 2000,
        duration: 200,
      });

      const count = await clearHistory({ id: entry1.id.slice(0, 8) });
      expect(count).toBe(1);

      const store = await loadHistory();
      expect(store.entries.length).toBe(1);
      expect(store.entries[0]?.command.args).toEqual(['second']);
    });

    it('should clear by date', async () => {
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

      // Clear everything before tomorrow (should keep everything)
      const futureDate = new Date(Date.now() + 86400000);
      const count = await clearHistory({ beforeDate: futureDate });
      expect(count).toBe(1);

      const store = await loadHistory();
      expect(store.entries.length).toBe(0);
    });

    it('should return 0 when nothing to clear', async () => {
      const count = await clearHistory({ all: true });
      expect(count).toBe(0);
    });

    it('should clear multiple entries at once', async () => {
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
          cliArgs: [`entry${i}`],
          selectedFiles: [],
          estimatedTokens: 1000 * i,
          duration: 100,
        });
      }

      const count = await clearHistory({ all: true });
      expect(count).toBe(5);

      const store = await loadHistory();
      expect(store.entries.length).toBe(0);
    });
  });
});
