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
  analyzeSelectedFolders,
} from '../../src/core/helpers.js';

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

  describe('analyzeSelectedFolders', () => {
    it('should return empty string for empty selection', () => {
      const result = analyzeSelectedFolders([]);
      expect(result).toBe('');
    });

    it('should return empty string for files in root directory only', () => {
      const result = analyzeSelectedFolders(['file1.ts', 'file2.ts', 'readme.md']);
      expect(result).toBe('');
    });

    it('should include single folder in filename', () => {
      const result = analyzeSelectedFolders(['src/helpers.ts', 'src/utils.ts']);
      expect(result).toBe('src');
    });

    it('should include nested folder paths', () => {
      const result = analyzeSelectedFolders([
        'src/core/helpers.ts',
        'src/core/utils.ts',
      ]);
      expect(result).toBe('src-core');
    });

    it('should include multiple different nested paths', () => {
      const result = analyzeSelectedFolders([
        'src/core/helpers.ts',
        'src/utils/format.ts',
        'lib/external/api.ts',
      ]);
      // Maintains selection order
      expect(result).toBe('src-core-src-utils-lib-external');
    });

    it('should deduplicate same nested paths', () => {
      const result = analyzeSelectedFolders([
        'src/core/helpers.ts',
        'src/core/utils.ts',
        'src/core/format.ts',
      ]);
      expect(result).toBe('src-core');
    });

    it('should include multiple top-level folders up to max (3 by default)', () => {
      const result = analyzeSelectedFolders([
        'src/app.ts',
        'lib/helpers.ts',
        'test/app.test.ts',
      ]);
      // Maintains selection order
      expect(result).toBe('src-lib-test');
    });

    it('should maintain natural order of paths (not alphabetically sorted)', () => {
      const result = analyzeSelectedFolders([
        'test/unit/app.test.ts',
        'src/core/app.ts',
        'lib/helpers.ts',
      ]);
      // Maintains selection order for more predictable output
      expect(result).toBe('test-unit-src-core-lib');
    });

    it('should use common parent when exceeding max unique paths with shared root', () => {
      const result = analyzeSelectedFolders([
        'src/cli/app.ts',
        'src/core/helpers.ts',
        'src/components/button.ts',
        'src/utils/format.ts',
      ]);
      expect(result).toBe('src');
    });

    it('should take first N folders when exceeding max without common parent', () => {
      const result = analyzeSelectedFolders([
        'src/app.ts',
        'lib/helpers.ts',
        'test/app.test.ts',
        'docs/readme.md',
      ]);
      // Takes first 3 in selection order (not alphabetically)
      expect(result).toBe('src-lib-test');
    });

    it('should respect custom maxFolders parameter', () => {
      const result = analyzeSelectedFolders(
        ['src/app.ts', 'lib/helpers.ts', 'test/app.test.ts'],
        2
      );
      // Takes first 2 in selection order
      expect(result).toBe('src-lib');
    });

    it('should truncate deeply nested paths (> maxNestedDepth)', () => {
      // Default maxNestedDepth is 4, so 5+ levels should be truncated to show deepest folders
      const result = analyzeSelectedFolders(
        ['src/components/features/auth/login/form.ts'],
        3,
        4
      );
      // Keeps deepest 3 folders (maxNestedDepth - 1) from 5-folder path
      expect(result).toBe('...-features-auth-login');
    });

    it('should handle multiple deep paths with truncation', () => {
      const result = analyzeSelectedFolders(
        [
          'src/a/b/c/d/e/f.ts',
          'lib/x/y/z/w/q.ts',
        ],
        3,
        4
      );
      // Both paths are truncated to show deepest 3 folders
      // Maintains selection order (not alphabetically sorted)
      expect(result).toBe('...-c-d-e-...-y-z-w');
    });

    it('should respect custom maxNestedDepth parameter', () => {
      const result = analyzeSelectedFolders(
        ['src/core/utils/helpers.ts'],
        3,
        2
      );
      // 3 folders with maxNestedDepth=2, keeps deepest 1 folder (2-1)
      expect(result).toBe('...-utils');
    });

    it('should not truncate when exactly at maxNestedDepth', () => {
      const result = analyzeSelectedFolders(
        ['src/core/utils/format.ts'],
        3,
        3
      );
      expect(result).toBe('src-core-utils');
    });

    it('should sanitize folder names with special characters', () => {
      const result = analyzeSelectedFolders([
        'my@folder/sub/file.ts',
        'another_folder/test.ts',
      ]);
      // Maintains selection order
      expect(result).toBe('my-folder-sub-another-folder');
    });

    it('should handle Windows-style paths', () => {
      const result = analyzeSelectedFolders([
        'src\\core\\app.ts',
        'lib\\helpers.ts',
      ]);
      // Maintains selection order
      expect(result).toBe('src-core-lib');
    });

    it('should handle mixed path separators', () => {
      const result = analyzeSelectedFolders([
        'src/core/app.ts',
        'lib\\helpers.ts',
      ]);
      // Maintains selection order
      expect(result).toBe('src-core-lib');
    });

    it('should deduplicate nested folders from multiple files', () => {
      const result = analyzeSelectedFolders([
        'src/core/app.ts',
        'src/core/helpers.ts',
        'src/core/utils.ts',
        'lib/external.ts',
      ]);
      // Maintains selection order
      expect(result).toBe('src-core-lib');
    });

    it('should handle edge case with exactly max unique paths', () => {
      const result = analyzeSelectedFolders([
        'src/core/app.ts',
        'lib/helpers.ts',
        'test/app.test.ts',
      ], 3);
      // Maintains selection order
      expect(result).toBe('src-core-lib-test');
    });

    it('should strip common parent when multiple nested paths share the same root', () => {
      const result = analyzeSelectedFolders([
        'src/cli/app.ts',
        'src/components/button.ts',
        'src/core/helpers.ts',
      ], 3);
      // Should strip 'src' prefix and use unique suffixes: cli, components, core
      expect(result).toBe('cli-components-core');
    });

    it('should include all breadcrumb folders when selecting from deeply nested common path', () => {
      // Simulating: packages/core/src/backing, packages/core/src/binding, etc.
      const result = analyzeSelectedFolders([
        'packages/core/src/backing/file1.ts',
        'packages/core/src/binding/file2.ts',
        'packages/core/src/diagnostics/file3.ts',
        'packages/core/src/errors/file4.ts',
        'packages/core/src/handoff/file5.ts',
        'packages/core/src/plan/file6.ts',
        'packages/core/src/primitives/file7.ts',
        'packages/core/src/spec/file8.ts',
        'packages/core/src/array-helpers.ts',
        'packages/core/src/index.ts',
      ], 3, 4);
      // Should include full breadcrumb path: packages-core-src
      expect(result).toBe('packages-core-src');
    });

    it('should return full breadcrumb when files are in both parent and subdirectories', () => {
      // When selecting files directly in a folder AND in subdirectories,
      // return the full common parent path, not the mix of suffixes and parent
      const result = analyzeSelectedFolders([
        'packages/core/src/backing/file1.ts',
        'packages/core/src/binding/file2.ts',
        'packages/core/src/array-helpers.ts', // File directly in src/
      ], 3, 4);
      // Should return the full common parent: packages-core-src
      // NOT: backing-binding-packages-core-src (alphabetically sorted mix)
      expect(result).toBe('packages-core-src');
    });

    it('should handle folders with numbers', () => {
      const result = analyzeSelectedFolders([
        'v1/api/app.ts',
        'v2/api/app.ts',
      ]);
      expect(result).toBe('v1-api-v2-api');
    });

    it('should handle folders with hyphens (preserve kebab-case)', () => {
      const result = analyzeSelectedFolders([
        'my-folder/sub-dir/app.ts',
        'another-one/test.ts',
      ]);
      // Maintains selection order
      expect(result).toBe('my-folder-sub-dir-another-one');
    });

    it('should remove consecutive hyphens from sanitized names', () => {
      const result = analyzeSelectedFolders([
        'my___folder/sub/app.ts',
      ]);
      expect(result).toBe('my-folder-sub');
    });

    it('should handle mix of root and nested files', () => {
      const result = analyzeSelectedFolders([
        'readme.md',
        'src/core/app.ts',
        'lib/helpers.ts',
      ]);
      // Maintains selection order (root files are skipped)
      expect(result).toBe('src-core-lib');
    });

    it('should preserve ellipsis separator in deep paths', () => {
      const result = analyzeSelectedFolders(
        ['very/deep/nested/folder/structure/file.ts'],
        3,
        4
      );
      // Keeps deepest 3 folders from 5-folder path
      expect(result).toBe('...-nested-folder-structure');
    });
  });
});
