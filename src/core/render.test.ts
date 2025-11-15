import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { render, renderMarkdown, renderJson, renderYaml, renderTxt, getLanguage } from './render.js';
import type { ScanResult, ResolvedOptions, RenderOptions } from './types.js';

describe('render module', () => {
  let testDir: string;
  let testFiles: { relativePath: string; absolutePath: string; extension: string; sizeBytes: number }[];

  // Helper to safely get a test file by index
  const getTestFile = (index: number) => {
    const file = testFiles[index];
    if (!file) throw new Error(`Test file at index ${index} not found`);
    return file;
  };

  beforeEach(async () => {
    testDir = join(tmpdir(), `render-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });

    // Create test files
    const file1Path = join(testDir, 'src', 'index.ts');
    const file2Path = join(testDir, 'src', 'utils.ts');
    const file3Path = join(testDir, 'README.md');

    await mkdir(join(testDir, 'src'), { recursive: true });

    await writeFile(file1Path, `// This is a comment
const foo = 'bar';
/* Block comment */
export default foo;`);

    await writeFile(file2Path, `# Python comment style
def helper():
    pass`);

    await writeFile(file3Path, '# Project Readme\n\nThis is a test project.');

    testFiles = [
      {
        relativePath: 'src/index.ts',
        absolutePath: file1Path,
        extension: 'ts',
        sizeBytes: 100,
      },
      {
        relativePath: 'src/utils.ts',
        absolutePath: file2Path,
        extension: 'ts',
        sizeBytes: 50,
      },
      {
        relativePath: 'README.md',
        absolutePath: file3Path,
        extension: 'md',
        sizeBytes: 50,
      },
    ];
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('getLanguage', () => {
    it('should map TypeScript extensions', () => {
      expect(getLanguage('ts')).toBe('typescript');
      expect(getLanguage('tsx')).toBe('tsx');
    });

    it('should map JavaScript extensions', () => {
      expect(getLanguage('js')).toBe('javascript');
      expect(getLanguage('jsx')).toBe('jsx');
      expect(getLanguage('mjs')).toBe('javascript');
      expect(getLanguage('cjs')).toBe('javascript');
    });

    it('should map Python extensions', () => {
      expect(getLanguage('py')).toBe('python');
    });

    it('should map Go extension', () => {
      expect(getLanguage('go')).toBe('go');
    });

    it('should map Rust extension', () => {
      expect(getLanguage('rs')).toBe('rust');
    });

    it('should map shell extensions', () => {
      expect(getLanguage('sh')).toBe('bash');
      expect(getLanguage('bash')).toBe('bash');
    });

    it('should return extension as-is for unknown types', () => {
      expect(getLanguage('unknown')).toBe('unknown');
      expect(getLanguage('xyz')).toBe('xyz');
    });

    it('should handle case insensitivity', () => {
      expect(getLanguage('TS')).toBe('typescript');
      expect(getLanguage('Py')).toBe('python');
    });
  });

  describe('renderMarkdown', () => {
    const createScanResult = (files = testFiles): ScanResult => ({
      files: files as any,
      totalBytes: files.reduce((sum, f) => sum + f.sizeBytes, 0),
      rootPath: testDir,
      extensionCounts: { ts: 2, md: 1 },
    });

    const createOptions = (overrides: Partial<ResolvedOptions> = {}): ResolvedOptions => ({
      root: testDir,
      outFile: 'output.md',
      include: [],
      exclude: [],
      extensions: [],
      maxFileSizeBytes: 1024 * 1024,
      stripComments: false,
      withTree: true,
      withStats: true,
      sort: 'path',
      interactive: false,
      verbose: false,
      profile: 'llm-context',
      format: 'md',
      dryRun: false,
      statsOnly: false,
      compact: false,
      indent: 2,
      toc: false,
      frontMatter: false,
      tokenCount: true,
      targetProvider: undefined,
      warnTokens: undefined,
      yes: false,
      presetName: undefined,
      repoRollerConfig: undefined,
      ...overrides,
    });

    it('should render basic markdown structure', async () => {
      const scan = createScanResult();
      const opts: RenderOptions = {
        withTree: false,
        withStats: false,
        stripComments: false,
      };
      const options = createOptions();

      const result = await renderMarkdown(scan, opts, options);

      expect(result).toContain('# 📦 Source Code Archive');
      expect(result).toContain('**Root**');
      expect(result).toContain('**Files**: 3');
      expect(result).toContain('## 📄 Files');
    });

    it('should include directory tree when withTree is true', async () => {
      const scan = createScanResult();
      const opts: RenderOptions = {
        withTree: true,
        withStats: false,
        stripComments: false,
      };
      const options = createOptions();

      const result = await renderMarkdown(scan, opts, options);

      expect(result).toContain('## 📂 Directory Structure');
      expect(result).toContain('📁');
    });

    it('should include statistics when withStats is true', async () => {
      const scan = createScanResult();
      const opts: RenderOptions = {
        withTree: false,
        withStats: true,
        stripComments: false,
      };
      const options = createOptions();

      const result = await renderMarkdown(scan, opts, options);

      expect(result).toContain('## 📊 Statistics');
      expect(result).toContain('**Total files**: 3');
      expect(result).toContain('**Total size**');
      expect(result).toContain('ts: 2 files');
      expect(result).toContain('md: 1 file');
    });

    it('should strip comments when stripComments is true', async () => {
      const scan = createScanResult([getTestFile(0)]); // Only TypeScript file
      const opts: RenderOptions = {
        withTree: false,
        withStats: false,
        stripComments: true,
      };
      const options = createOptions();

      const result = await renderMarkdown(scan, opts, options);

      // Should contain the code but not the comments
      expect(result).toContain("const foo = 'bar'");
      expect(result).toContain('export default foo');
      // Comments should be stripped
      expect(result).not.toContain('// This is a comment');
      expect(result).not.toContain('/* Block comment */');
    });

    it('should include code fence with correct language', async () => {
      const scan = createScanResult([getTestFile(0)]);
      const opts: RenderOptions = {
        withTree: false,
        withStats: false,
        stripComments: false,
      };
      const options = createOptions();

      const result = await renderMarkdown(scan, opts, options);

      expect(result).toContain('```typescript');
      expect(result).toContain('```');
    });

    it('should generate TOC when toc option is true', async () => {
      const scan = createScanResult();
      const opts: RenderOptions = {
        withTree: false,
        withStats: false,
        stripComments: false,
      };
      const options = createOptions({ toc: true });

      const result = await renderMarkdown(scan, opts, options);

      expect(result).toContain('## 📑 Table of Contents');
      expect(result).toContain('src/index.ts');
      expect(result).toContain('src/utils.ts');
    });

    it('should include front matter when frontMatter is true', async () => {
      const scan = createScanResult();
      const opts: RenderOptions = {
        withTree: false,
        withStats: false,
        stripComments: false,
      };
      const options = createOptions({ frontMatter: true });

      const result = await renderMarkdown(scan, opts, options);

      expect(result).toContain('---');
      expect(result).toContain('title: Source Code Archive');
      expect(result).toContain('files: 3');
      expect(result).toContain('profile: llm-context');
    });

    it('should include architectural overview when provided', async () => {
      const scan = createScanResult();
      const opts: RenderOptions = {
        withTree: false,
        withStats: false,
        stripComments: false,
      };
      const options = createOptions();
      const overview = 'This is an architectural overview of the project.';

      const result = await renderMarkdown(scan, opts, options, overview);

      expect(result).toContain('## 🏗️ Architectural Overview');
      expect(result).toContain(overview);
    });

    it('should handle file read errors gracefully', async () => {
      const badFile = {
        relativePath: 'nonexistent.ts',
        absolutePath: join(testDir, 'nonexistent.ts'),
        extension: 'ts',
        sizeBytes: 0,
      };

      const scan = createScanResult([badFile as any]);
      const opts: RenderOptions = {
        withTree: false,
        withStats: false,
        stripComments: false,
      };
      const options = createOptions();

      const result = await renderMarkdown(scan, opts, options);

      expect(result).toContain('[Error reading file:');
    });
  });

  describe('renderJson', () => {
    const createScanResult = (files = testFiles): ScanResult => ({
      files: files as any,
      totalBytes: files.reduce((sum, f) => sum + f.sizeBytes, 0),
      rootPath: testDir,
      extensionCounts: { ts: 2, md: 1 },
    });

    const createOptions = (overrides: Partial<ResolvedOptions> = {}): ResolvedOptions => ({
      root: testDir,
      outFile: 'output.json',
      include: [],
      exclude: [],
      extensions: [],
      maxFileSizeBytes: 1024 * 1024,
      stripComments: false,
      withTree: true,
      withStats: true,
      sort: 'path',
      interactive: false,
      verbose: false,
      profile: 'llm-context',
      format: 'json',
      dryRun: false,
      statsOnly: false,
      compact: false,
      indent: 2,
      toc: false,
      frontMatter: false,
      tokenCount: true,
      targetProvider: undefined,
      warnTokens: undefined,
      yes: false,
      presetName: undefined,
      repoRollerConfig: undefined,
      ...overrides,
    });

    it('should render valid JSON structure', async () => {
      const scan = createScanResult([getTestFile(0)]);
      const options = createOptions();

      const result = await renderJson(scan, options);
      const parsed = JSON.parse(result);

      expect(parsed).toHaveProperty('metadata');
      expect(parsed).toHaveProperty('files');
      expect(parsed.metadata).toHaveProperty('profile', 'llm-context');
      expect(parsed.metadata).toHaveProperty('fileCount', 1);
      expect(parsed.metadata).toHaveProperty('timestamp');
    });

    it('should include file content and language', async () => {
      const scan = createScanResult([getTestFile(0)]);
      const options = createOptions();

      const result = await renderJson(scan, options);
      const parsed = JSON.parse(result);

      expect(parsed.files).toHaveLength(1);
      expect(parsed.files[0]).toHaveProperty('path', 'src/index.ts');
      expect(parsed.files[0]).toHaveProperty('language', 'typescript');
      expect(parsed.files[0]).toHaveProperty('content');
      expect(parsed.files[0].content).toContain("const foo = 'bar'");
    });

    it('should strip comments when stripComments is true', async () => {
      const scan = createScanResult([getTestFile(0)]);
      const options = createOptions({ stripComments: true });

      const result = await renderJson(scan, options);
      const parsed = JSON.parse(result);

      expect(parsed.files[0].content).not.toContain('// This is a comment');
      expect(parsed.files[0].content).not.toContain('/* Block comment */');
    });

    it('should render compact JSON when compact is true', async () => {
      const scan = createScanResult([getTestFile(0)]);
      const options = createOptions({ compact: true });

      const result = await renderJson(scan, options);

      // Compact JSON should not have newlines (except within content)
      const lines = result.split('\n').filter(l => l.trim());
      // The entire JSON should be on fewer lines than pretty-printed
      expect(lines.length).toBeLessThan(20);
    });

    it('should respect custom indentation', async () => {
      const scan = createScanResult([getTestFile(0)]);
      const options = createOptions({ indent: 4 });

      const result = await renderJson(scan, options);

      // Should have 4-space indentation
      expect(result).toMatch(/^    "/m);
    });

    it('should handle multiple files', async () => {
      const scan = createScanResult();
      const options = createOptions();

      const result = await renderJson(scan, options);
      const parsed = JSON.parse(result);

      expect(parsed.files).toHaveLength(3);
    });
  });

  describe('renderYaml', () => {
    const createScanResult = (files = testFiles): ScanResult => ({
      files: files as any,
      totalBytes: files.reduce((sum, f) => sum + f.sizeBytes, 0),
      rootPath: testDir,
      extensionCounts: { ts: 2, md: 1 },
    });

    const createOptions = (overrides: Partial<ResolvedOptions> = {}): ResolvedOptions => ({
      root: testDir,
      outFile: 'output.yaml',
      include: [],
      exclude: [],
      extensions: [],
      maxFileSizeBytes: 1024 * 1024,
      stripComments: false,
      withTree: true,
      withStats: true,
      sort: 'path',
      interactive: false,
      verbose: false,
      profile: 'llm-context',
      format: 'yaml',
      dryRun: false,
      statsOnly: false,
      compact: false,
      indent: 2,
      toc: false,
      frontMatter: false,
      tokenCount: true,
      targetProvider: undefined,
      warnTokens: undefined,
      yes: false,
      presetName: undefined,
      repoRollerConfig: undefined,
      ...overrides,
    });

    it('should render valid YAML structure', async () => {
      const scan = createScanResult([getTestFile(0)]);
      const options = createOptions();

      const result = await renderYaml(scan, options);

      expect(result).toContain('metadata:');
      expect(result).toContain('profile: llm-context');
      expect(result).toContain('fileCount: 1');
      expect(result).toContain('files:');
    });

    it('should include file paths and languages', async () => {
      const scan = createScanResult([getTestFile(0)]);
      const options = createOptions();

      const result = await renderYaml(scan, options);

      expect(result).toContain('path: src/index.ts');
      expect(result).toContain('language: typescript');
      expect(result).toContain('content:');
    });

    it('should strip comments when stripComments is true', async () => {
      const scan = createScanResult([getTestFile(0)]);
      const options = createOptions({ stripComments: true });

      const result = await renderYaml(scan, options);

      expect(result).not.toContain('This is a comment');
    });
  });

  describe('renderTxt', () => {
    const createScanResult = (files = testFiles): ScanResult => ({
      files: files as any,
      totalBytes: files.reduce((sum, f) => sum + f.sizeBytes, 0),
      rootPath: testDir,
      extensionCounts: { ts: 2, md: 1 },
    });

    const createOptions = (overrides: Partial<ResolvedOptions> = {}): ResolvedOptions => ({
      root: testDir,
      outFile: 'output.txt',
      include: [],
      exclude: [],
      extensions: [],
      maxFileSizeBytes: 1024 * 1024,
      stripComments: false,
      withTree: true,
      withStats: true,
      sort: 'path',
      interactive: false,
      verbose: false,
      profile: 'llm-context',
      format: 'txt',
      dryRun: false,
      statsOnly: false,
      compact: false,
      indent: 2,
      toc: false,
      frontMatter: false,
      tokenCount: true,
      targetProvider: undefined,
      warnTokens: undefined,
      yes: false,
      presetName: undefined,
      repoRollerConfig: undefined,
      ...overrides,
    });

    it('should render plain text format', async () => {
      const scan = createScanResult([getTestFile(0)]);
      const options = createOptions();

      const result = await renderTxt(scan, options);

      expect(result).toContain('='.repeat(50));
      expect(result).toContain('File: src/index.ts');
      expect(result).toContain("const foo = 'bar'");
    });

    it('should strip comments when stripComments is true', async () => {
      const scan = createScanResult([getTestFile(0)]);
      const options = createOptions({ stripComments: true });

      const result = await renderTxt(scan, options);

      expect(result).not.toContain('// This is a comment');
      expect(result).not.toContain('/* Block comment */');
    });

    it('should handle multiple files with separators', async () => {
      const scan = createScanResult();
      const options = createOptions();

      const result = await renderTxt(scan, options);

      // Should have separators for each file
      const separatorCount = (result.match(/={50}/g) || []).length;
      expect(separatorCount).toBe(6); // 2 separators per file (header)
    });
  });

  describe('render (dispatcher)', () => {
    const createScanResult = (files = testFiles): ScanResult => ({
      files: files as any,
      totalBytes: files.reduce((sum, f) => sum + f.sizeBytes, 0),
      rootPath: testDir,
      extensionCounts: { ts: 2, md: 1 },
    });

    const createOptions = (format: 'md' | 'json' | 'yaml' | 'txt'): ResolvedOptions => ({
      root: testDir,
      outFile: `output.${format}`,
      include: [],
      exclude: [],
      extensions: [],
      maxFileSizeBytes: 1024 * 1024,
      stripComments: false,
      withTree: true,
      withStats: true,
      sort: 'path',
      interactive: false,
      verbose: false,
      profile: 'llm-context',
      format,
      dryRun: false,
      statsOnly: false,
      compact: false,
      indent: 2,
      toc: false,
      frontMatter: false,
      tokenCount: true,
      targetProvider: undefined,
      warnTokens: undefined,
      yes: false,
      presetName: undefined,
      repoRollerConfig: undefined,
    });

    it('should dispatch to renderMarkdown for md format', async () => {
      const scan = createScanResult([getTestFile(0)]);
      const options = createOptions('md');

      const result = await render(scan, options);

      expect(result).toContain('# 📦 Source Code Archive');
    });

    it('should dispatch to renderJson for json format', async () => {
      const scan = createScanResult([getTestFile(0)]);
      const options = createOptions('json');

      const result = await render(scan, options);
      const parsed = JSON.parse(result);

      expect(parsed).toHaveProperty('metadata');
    });

    it('should dispatch to renderYaml for yaml format', async () => {
      const scan = createScanResult([getTestFile(0)]);
      const options = createOptions('yaml');

      const result = await render(scan, options);

      expect(result).toContain('metadata:');
    });

    it('should dispatch to renderTxt for txt format', async () => {
      const scan = createScanResult([getTestFile(0)]);
      const options = createOptions('txt');

      const result = await render(scan, options);

      expect(result).toContain('='.repeat(50));
    });

    it('should default to markdown for unknown format', async () => {
      const scan = createScanResult([getTestFile(0)]);
      const options = createOptions('md');
      // Force unknown format
      (options as any).format = 'unknown';

      const result = await render(scan, options);

      // Should fall through to markdown
      expect(result).toContain('# 📦 Source Code Archive');
    });
  });
});
