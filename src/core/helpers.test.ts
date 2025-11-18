import { describe, it, expect } from 'vitest';
import {
  formatBytes,
  normalizeExtension,
  extensionToLanguage,
  categorizeFileRole,
  calculateLanguageBreakdown,
  calculateRoleBreakdown,
  calculateTopDirectories,
  estimateLinesOfCode,
  resolveOutputPath,
} from './helpers.js';

describe('helpers', () => {
  describe('formatBytes', () => {
    it('should format 0 bytes', () => {
      expect(formatBytes(0)).toBe('0 B');
    });

    it('should format bytes (< 1KB)', () => {
      expect(formatBytes(512)).toBe('512.00 B');
      expect(formatBytes(100)).toBe('100.00 B');
    });

    it('should format kilobytes', () => {
      expect(formatBytes(1024)).toBe('1.00 KB');
      expect(formatBytes(2048)).toBe('2.00 KB');
      expect(formatBytes(1536)).toBe('1.50 KB');
    });

    it('should format megabytes', () => {
      expect(formatBytes(1024 * 1024)).toBe('1.00 MB');
      expect(formatBytes(2.5 * 1024 * 1024)).toBe('2.50 MB');
    });

    it('should format gigabytes', () => {
      expect(formatBytes(1024 * 1024 * 1024)).toBe('1.00 GB');
    });
  });

  describe('normalizeExtension', () => {
    it('should remove leading dot', () => {
      expect(normalizeExtension('.ts')).toBe('ts');
      expect(normalizeExtension('.tsx')).toBe('tsx');
    });

    it('should return extension as-is if no leading dot', () => {
      expect(normalizeExtension('ts')).toBe('ts');
      expect(normalizeExtension('js')).toBe('js');
    });
  });

  describe('extensionToLanguage', () => {
    it('should map TypeScript extensions', () => {
      expect(extensionToLanguage('ts')).toBe('TypeScript');
      expect(extensionToLanguage('tsx')).toBe('TypeScript');
    });

    it('should map JavaScript extensions', () => {
      expect(extensionToLanguage('js')).toBe('JavaScript');
      expect(extensionToLanguage('jsx')).toBe('JavaScript');
      expect(extensionToLanguage('mjs')).toBe('JavaScript');
    });

    it('should map other languages', () => {
      expect(extensionToLanguage('py')).toBe('Python');
      expect(extensionToLanguage('go')).toBe('Go');
      expect(extensionToLanguage('rs')).toBe('Rust');
      expect(extensionToLanguage('md')).toBe('Markdown');
    });

    it('should handle unknown extensions', () => {
      expect(extensionToLanguage('xyz')).toBe('XYZ');
    });
  });

  describe('categorizeFileRole', () => {
    it('should identify test files', () => {
      expect(categorizeFileRole('src/index.test.ts', 'ts')).toBe('test');
      expect(categorizeFileRole('tests/unit.spec.js', 'js')).toBe('test');
      expect(categorizeFileRole('__tests__/app.ts', 'ts')).toBe('test');
    });

    it('should identify documentation files', () => {
      expect(categorizeFileRole('README.md', 'md')).toBe('docs');
      expect(categorizeFileRole('docs/api.txt', 'txt')).toBe('docs');
      expect(categorizeFileRole('CHANGELOG.md', 'md')).toBe('docs');
    });

    it('should identify config files', () => {
      expect(categorizeFileRole('package.json', 'json')).toBe('config');
      expect(categorizeFileRole('tsconfig.json', 'json')).toBe('config');
      expect(categorizeFileRole('.eslintrc.yml', 'yml')).toBe('config');
    });

    it('should default to source for regular code files', () => {
      expect(categorizeFileRole('src/index.ts', 'ts')).toBe('source');
      expect(categorizeFileRole('lib/utils.js', 'js')).toBe('source');
    });
  });

  describe('calculateLanguageBreakdown', () => {
    it('should calculate percentage breakdown', () => {
      const files = [
        { extension: 'ts', sizeBytes: 1000 },
        { extension: 'ts', sizeBytes: 1000 },
        { extension: 'js', sizeBytes: 500 },
      ];
      const breakdown = calculateLanguageBreakdown(files);

      expect(breakdown).toHaveLength(2);
      expect(breakdown[0]?.name).toBe('TypeScript');
      expect(breakdown[0]?.percent).toBeCloseTo(80);
      expect(breakdown[1]?.name).toBe('JavaScript');
      expect(breakdown[1]?.percent).toBeCloseTo(20);
    });

    it('should group small languages into Other', () => {
      const files = [
        { extension: 'ts', sizeBytes: 10000 },
        { extension: 'py', sizeBytes: 100 },
        { extension: 'go', sizeBytes: 50 },
      ];
      const breakdown = calculateLanguageBreakdown(files);

      const other = breakdown.find(b => b.name === 'Other');
      expect(other).toBeDefined();
      expect(other!.bytes).toBe(150);
    });

    it('should handle empty files array', () => {
      const breakdown = calculateLanguageBreakdown([]);
      expect(breakdown).toHaveLength(0);
    });
  });

  describe('calculateRoleBreakdown', () => {
    it('should calculate role percentages', () => {
      const files = [
        { relativePath: 'src/index.ts', extension: 'ts', sizeBytes: 1000 },
        { relativePath: 'src/index.test.ts', extension: 'ts', sizeBytes: 500 },
        { relativePath: 'README.md', extension: 'md', sizeBytes: 500 },
      ];
      const breakdown = calculateRoleBreakdown(files);

      expect(breakdown.source).toBe(50);
      expect(breakdown.test).toBe(25);
      expect(breakdown.docs).toBe(25);
      expect(breakdown.config).toBe(0);
    });

    it('should handle empty files array', () => {
      const breakdown = calculateRoleBreakdown([]);
      expect(breakdown).toEqual({ source: 0, test: 0, docs: 0, config: 0 });
    });
  });

  describe('calculateTopDirectories', () => {
    it('should calculate top directories by size', () => {
      const files = [
        { relativePath: 'src/core/index.ts', sizeBytes: 1000 },
        { relativePath: 'src/core/utils.ts', sizeBytes: 500 },
        { relativePath: 'tests/unit.ts', sizeBytes: 300 },
      ];
      const topDirs = calculateTopDirectories(files);

      expect(topDirs.length).toBeGreaterThan(0);
      expect(topDirs[0]?.path).toBe('src/core/');
      expect(topDirs[0]?.percent).toBeCloseTo(83.33, 1);
    });

    it('should limit to maxDirs', () => {
      const files = [
        { relativePath: 'a/file.ts', sizeBytes: 100 },
        { relativePath: 'b/file.ts', sizeBytes: 100 },
        { relativePath: 'c/file.ts', sizeBytes: 100 },
        { relativePath: 'd/file.ts', sizeBytes: 100 },
        { relativePath: 'e/file.ts', sizeBytes: 100 },
      ];
      const topDirs = calculateTopDirectories(files, 3);

      expect(topDirs).toHaveLength(3);
    });
  });

  describe('estimateLinesOfCode', () => {
    it('should estimate lines based on bytes', () => {
      const lines = estimateLinesOfCode(4500);
      expect(lines).toBe(100);
    });

    it('should return 0 for 0 bytes', () => {
      const lines = estimateLinesOfCode(0);
      expect(lines).toBe(0);
    });
  });

  describe('resolveOutputPath', () => {
    it('should use default basename when out is not provided', () => {
      const result = resolveOutputPath({
        format: 'md',
        defaultBaseName: 'repo-roller-2025-11-18',
      });
      expect(result).toBe('repo-roller-2025-11-18.md');
    });

    it('should use default basename with different formats', () => {
      expect(resolveOutputPath({ format: 'json', defaultBaseName: 'output' })).toBe('output.json');
      expect(resolveOutputPath({ format: 'yaml', defaultBaseName: 'output' })).toBe('output.yaml');
      expect(resolveOutputPath({ format: 'txt', defaultBaseName: 'output' })).toBe('output.txt');
    });

    it('should use out path as-is when it has a valid format extension', () => {
      const result = resolveOutputPath({
        out: 'custom-output.md',
        format: 'json',
        defaultBaseName: 'default',
      });
      expect(result).toBe('custom-output.md');
    });

    it('should append format extension when out has a non-format extension', () => {
      const result = resolveOutputPath({
        out: 'seqlok-2025-11-18.bench',
        format: 'md',
        defaultBaseName: 'default',
      });
      expect(result).toBe('seqlok-2025-11-18.bench.md');
    });

    it('should append format extension when out has various non-format extensions', () => {
      expect(resolveOutputPath({
        out: 'output.tmp',
        format: 'json',
        defaultBaseName: 'default',
      })).toBe('output.tmp.json');

      expect(resolveOutputPath({
        out: 'report.backup',
        format: 'yaml',
        defaultBaseName: 'default',
      })).toBe('report.backup.yaml');
    });

    it('should append format extension when out has no extension', () => {
      const result = resolveOutputPath({
        out: 'custom-output',
        format: 'json',
        defaultBaseName: 'default',
      });
      expect(result).toBe('custom-output.json');
    });

    it('should handle paths with directories', () => {
      const result = resolveOutputPath({
        out: './dist/output',
        format: 'yaml',
        defaultBaseName: 'default',
      });
      expect(result).toBe('./dist/output.yaml');
    });

    it('should not create weird extensions like ._md', () => {
      const result = resolveOutputPath({
        out: '.',
        format: 'md',
        defaultBaseName: 'default',
      });
      expect(result).toBe('..md');
    });

    it('should handle output paths ending with slash', () => {
      const result = resolveOutputPath({
        out: 'dist/',
        format: 'md',
        defaultBaseName: 'default',
      });
      expect(result).toBe('dist/.md');
    });
  });
});
