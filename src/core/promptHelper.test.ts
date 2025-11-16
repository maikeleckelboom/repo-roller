import { describe, it, expect } from 'vitest';
import { generatePromptSuggestion, getPromptSummary } from './promptHelper.js';
import type { ScanResult } from './types.js';

describe('Prompt Helper', () => {
  const createScanResult = (
    fileSpecs: Array<{ path: string; size: number; ext: string }>
  ): ScanResult => {
    const files = fileSpecs.map(spec => ({
      absolutePath: `/project/${spec.path}`,
      relativePath: spec.path,
      sizeBytes: spec.size,
      extension: spec.ext,
      isBinary: false,
      isDefaultIncluded: true,
    }));

    const totalBytes = files.reduce((sum, f) => sum + f.sizeBytes, 0);
    const extensionCounts: Record<string, number> = {};
    for (const file of files) {
      extensionCounts[file.extension] = (extensionCounts[file.extension] ?? 0) + 1;
    }

    return {
      files,
      totalBytes,
      rootPath: '/project',
      extensionCounts,
    };
  };

  describe('generatePromptSuggestion', () => {
    it('should identify code-heavy bundles', () => {
      const scan = createScanResult([
        { path: 'src/index.ts', size: 1000, ext: 'ts' },
        { path: 'src/utils.ts', size: 2000, ext: 'ts' },
        { path: 'src/core.ts', size: 3000, ext: 'ts' },
        { path: 'README.md', size: 500, ext: 'md' },
      ]);

      const suggestion = generatePromptSuggestion(scan);
      expect(suggestion.bundleType).toBe('code-heavy');
      expect(suggestion.systemMessage).toContain('senior software engineer');
      expect(suggestion.userMessageTemplate).toContain('architectural patterns');
    });

    it('should identify docs-heavy bundles', () => {
      const scan = createScanResult([
        { path: 'docs/guide.md', size: 5000, ext: 'md' },
        { path: 'docs/api.md', size: 4000, ext: 'md' },
        { path: 'README.md', size: 3000, ext: 'md' },
        { path: 'src/index.ts', size: 1000, ext: 'ts' },
      ]);

      const suggestion = generatePromptSuggestion(scan);
      expect(suggestion.bundleType).toBe('docs-heavy');
      expect(suggestion.systemMessage).toContain('technical writer');
      expect(suggestion.userMessageTemplate).toContain('documentation');
    });

    it('should identify test-heavy bundles', () => {
      const scan = createScanResult([
        { path: 'src/utils.test.ts', size: 3000, ext: 'ts' },
        { path: 'src/core.spec.ts', size: 4000, ext: 'ts' },
        { path: 'src/__tests__/integration.ts', size: 5000, ext: 'ts' },
        { path: 'src/index.ts', size: 2000, ext: 'ts' },
      ]);

      const suggestion = generatePromptSuggestion(scan);
      expect(suggestion.bundleType).toBe('test-heavy');
      expect(suggestion.systemMessage).toContain('QA engineer');
      expect(suggestion.userMessageTemplate).toContain('test coverage');
    });

    it('should identify config-heavy bundles', () => {
      const scan = createScanResult([
        { path: 'package.json', size: 2000, ext: 'json' },
        { path: 'tsconfig.json', size: 1500, ext: 'json' },
        { path: '.eslintrc.json', size: 1000, ext: 'json' },
        { path: 'src/index.ts', size: 500, ext: 'ts' },
      ]);

      const suggestion = generatePromptSuggestion(scan);
      expect(suggestion.bundleType).toBe('config-heavy');
      expect(suggestion.systemMessage).toContain('DevOps engineer');
      expect(suggestion.userMessageTemplate).toContain('configuration');
    });

    it('should identify mixed bundles', () => {
      const scan = createScanResult([
        { path: 'src/index.ts', size: 1000, ext: 'ts' },
        { path: 'src/utils.test.ts', size: 1000, ext: 'ts' },
        { path: 'docs/guide.md', size: 1000, ext: 'md' },
        { path: 'package.json', size: 1000, ext: 'json' },
      ]);

      const suggestion = generatePromptSuggestion(scan);
      expect(suggestion.bundleType).toBe('mixed');
      expect(suggestion.systemMessage).toContain('full-stack');
      expect(suggestion.userMessageTemplate).toContain('project structure');
    });

    it('should include primary language in system message', () => {
      const scan = createScanResult([
        { path: 'src/index.ts', size: 5000, ext: 'ts' },
        { path: 'src/utils.ts', size: 3000, ext: 'ts' },
      ]);

      const suggestion = generatePromptSuggestion(scan);
      expect(suggestion.systemMessage).toContain('TypeScript');
    });

    it('should always include placeholder for specific question', () => {
      const scan = createScanResult([
        { path: 'src/index.ts', size: 1000, ext: 'ts' },
      ]);

      const suggestion = generatePromptSuggestion(scan);
      expect(suggestion.userMessageTemplate).toContain('[Your specific question here]');
    });
  });

  describe('getPromptSummary', () => {
    it('should return a concise summary', () => {
      const scan = createScanResult([
        { path: 'src/index.ts', size: 5000, ext: 'ts' },
        { path: 'src/utils.ts', size: 3000, ext: 'ts' },
      ]);

      const summary = getPromptSummary(scan);
      expect(summary).toContain('code heavy');
      expect(summary).toContain('--prompt-helper');
    });

    it('should reflect the bundle type', () => {
      const docsScan = createScanResult([
        { path: 'docs/guide.md', size: 5000, ext: 'md' },
        { path: 'docs/api.md', size: 5000, ext: 'md' },
      ]);

      const summary = getPromptSummary(docsScan);
      expect(summary).toContain('docs heavy');
    });
  });
});
