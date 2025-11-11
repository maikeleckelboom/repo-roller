import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { scanFiles } from './scan.js';
import type { ResolvedOptions } from './types.js';

describe('scanFiles - gitignore handling', () => {
  let testDir: string;
  let defaultOptions: ResolvedOptions;

  beforeEach(async () => {
    // Create a temporary test directory
    testDir = await mkdtemp(join(tmpdir(), 'repo-roller-test-'));

    defaultOptions = {
      root: testDir,
      outFile: 'test.md',
      include: [],
      exclude: [],
      extensions: [],
      maxFileSizeBytes: 1024 * 1024, // 1MB
      stripComments: false,
      withTree: true,
      withStats: true,
      sort: 'path',
      interactive: false,
      verbose: false,
      presetName: undefined,
    };
  });

  afterEach(async () => {
    // Clean up test directory
    await rm(testDir, { recursive: true, force: true });
  });

  it('should exclude node_modules directory by default', async () => {
    // Create a .gitignore with node_modules
    await writeFile(join(testDir, '.gitignore'), 'node_modules\n');

    // Create some files
    await writeFile(join(testDir, 'index.ts'), 'console.log("test");');

    // Create node_modules directory with files
    await mkdir(join(testDir, 'node_modules'));
    await writeFile(join(testDir, 'node_modules', 'package.json'), '{}');

    const result = await scanFiles(defaultOptions);

    // Should include index.ts and .gitignore, but not node_modules files
    expect(result.files.length).toBe(2);
    const paths = result.files.map(f => f.relativePath).sort();
    expect(paths).toEqual(['.gitignore', 'index.ts']);
    expect(result.files.some(f => f.relativePath.includes('node_modules'))).toBe(false);
  });

  it('should exclude .idea directory when in .gitignore', async () => {
    // Create a .gitignore with .idea
    await writeFile(join(testDir, '.gitignore'), '.idea\n');

    // Create some files
    await writeFile(join(testDir, 'index.ts'), 'console.log("test");');

    // Create .idea directory with files
    await mkdir(join(testDir, '.idea'));
    await writeFile(join(testDir, '.idea', 'workspace.xml'), '<xml></xml>');

    const result = await scanFiles(defaultOptions);

    // Should include index.ts and .gitignore, but not .idea files
    expect(result.files.length).toBe(2);
    const paths = result.files.map(f => f.relativePath).sort();
    expect(paths).toEqual(['.gitignore', 'index.ts']);
    expect(result.files.some(f => f.relativePath.includes('.idea'))).toBe(false);
  });

  it('should always exclude .git directory', async () => {
    // Create some files
    await writeFile(join(testDir, 'index.ts'), 'console.log("test");');

    // Create .git directory with files
    await mkdir(join(testDir, '.git'));
    await writeFile(join(testDir, '.git', 'config'), '[core]');

    const result = await scanFiles(defaultOptions);

    // Should only include index.ts, not .git files
    expect(result.files.length).toBe(1);
    expect(result.files[0].relativePath).toBe('index.ts');
    expect(result.files.some(f => f.relativePath.includes('.git'))).toBe(false);
  });

  it('should exclude files matching gitignore patterns', async () => {
    // Create a .gitignore with various patterns
    await writeFile(
      join(testDir, '.gitignore'),
      '*.log\n*.tmp\ndist/\ncoverage/\n.env\n'
    );

    // Create files that should be excluded
    await writeFile(join(testDir, 'app.log'), 'log content');
    await writeFile(join(testDir, 'temp.tmp'), 'temp content');
    await writeFile(join(testDir, '.env'), 'SECRET=123');

    await mkdir(join(testDir, 'dist'));
    await writeFile(join(testDir, 'dist', 'bundle.js'), 'bundled');

    await mkdir(join(testDir, 'coverage'));
    await writeFile(join(testDir, 'coverage', 'report.html'), '<html></html>');

    // Create files that should be included
    await writeFile(join(testDir, 'index.ts'), 'console.log("test");');
    await writeFile(join(testDir, 'config.json'), '{}');

    const result = await scanFiles(defaultOptions);

    // Should include .gitignore, index.ts and config.json
    expect(result.files.length).toBe(3);
    expect(result.files.map(f => f.relativePath).sort()).toEqual([
      '.gitignore',
      'config.json',
      'index.ts',
    ]);

    // Verify excluded files
    expect(result.files.some(f => f.relativePath.includes('.log'))).toBe(false);
    expect(result.files.some(f => f.relativePath.includes('.tmp'))).toBe(false);
    expect(result.files.some(f => f.relativePath.includes('dist'))).toBe(false);
    expect(result.files.some(f => f.relativePath.includes('coverage'))).toBe(false);
    expect(result.files.some(f => f.relativePath.includes('.env'))).toBe(false);
  });

  it('should exclude nested paths matching gitignore patterns', async () => {
    // Create a .gitignore with node_modules
    await writeFile(join(testDir, '.gitignore'), 'node_modules\n');

    // Create nested structure
    await mkdir(join(testDir, 'src'));
    await writeFile(join(testDir, 'src', 'index.ts'), 'export const foo = 1;');

    await mkdir(join(testDir, 'src', 'node_modules'));
    await writeFile(
      join(testDir, 'src', 'node_modules', 'bad.js'),
      'should not appear'
    );

    await mkdir(join(testDir, 'packages'));
    await mkdir(join(testDir, 'packages', 'pkg1'));
    await writeFile(join(testDir, 'packages', 'pkg1', 'index.ts'), 'export const bar = 2;');

    await mkdir(join(testDir, 'packages', 'pkg1', 'node_modules'));
    await writeFile(
      join(testDir, 'packages', 'pkg1', 'node_modules', 'also-bad.js'),
      'should not appear'
    );

    const result = await scanFiles(defaultOptions);

    // Should include .gitignore and source files, not any node_modules
    expect(result.files.length).toBe(3);
    expect(result.files.map(f => f.relativePath).sort()).toEqual([
      '.gitignore',
      'packages/pkg1/index.ts',
      'src/index.ts',
    ]);
    expect(result.files.some(f => f.relativePath.includes('node_modules'))).toBe(false);
  });

  it('should respect multiple gitignore patterns', async () => {
    // Create a comprehensive .gitignore
    await writeFile(
      join(testDir, '.gitignore'),
      [
        '# Dependencies',
        'node_modules',
        '',
        '# Build output',
        'dist',
        'out',
        '*.tgz',
        '',
        '# IDE',
        '.idea',
        '.vscode',
        '',
        '# Logs',
        '*.log',
        'logs',
        '',
        '# Environment',
        '.env',
        '.env.local',
      ].join('\n')
    );

    // Create files that should be excluded
    await mkdir(join(testDir, 'node_modules'));
    await writeFile(join(testDir, 'node_modules', 'pkg.js'), 'pkg');

    await mkdir(join(testDir, 'dist'));
    await writeFile(join(testDir, 'dist', 'bundle.js'), 'bundle');

    await mkdir(join(testDir, '.idea'));
    await writeFile(join(testDir, '.idea', 'workspace.xml'), 'xml');

    await mkdir(join(testDir, '.vscode'));
    await writeFile(join(testDir, '.vscode', 'settings.json'), '{}');

    await mkdir(join(testDir, 'logs'));
    await writeFile(join(testDir, 'logs', 'app.log'), 'log');

    await writeFile(join(testDir, 'debug.log'), 'debug');
    await writeFile(join(testDir, '.env'), 'SECRET=123');
    await writeFile(join(testDir, '.env.local'), 'SECRET=456');
    await writeFile(join(testDir, 'package.tgz'), 'binary');

    // Create files that should be included
    await writeFile(join(testDir, 'index.ts'), 'code');
    await writeFile(join(testDir, 'README.md'), 'docs');
    await writeFile(join(testDir, 'package.json'), '{}');

    await mkdir(join(testDir, 'src'));
    await writeFile(join(testDir, 'src', 'app.ts'), 'app code');

    const result = await scanFiles(defaultOptions);

    // Should include .gitignore and the source files
    const includedPaths = result.files.map(f => f.relativePath).sort();
    expect(includedPaths).toEqual(['.gitignore', 'README.md', 'index.ts', 'package.json', 'src/app.ts']);

    // Verify all patterns are excluded
    expect(result.files.some(f => f.relativePath.includes('node_modules'))).toBe(false);
    expect(result.files.some(f => f.relativePath.includes('dist'))).toBe(false);
    expect(result.files.some(f => f.relativePath.includes('.idea'))).toBe(false);
    expect(result.files.some(f => f.relativePath.includes('.vscode'))).toBe(false);
    expect(result.files.some(f => f.relativePath.includes('logs'))).toBe(false);
    expect(result.files.some(f => f.relativePath.includes('.log'))).toBe(false);
    expect(result.files.some(f => f.relativePath.includes('.env'))).toBe(false);
    expect(result.files.some(f => f.relativePath.includes('.tgz'))).toBe(false);
  });

  it('should work correctly when .gitignore does not exist', async () => {
    // Don't create a .gitignore file

    // Create some files
    await writeFile(join(testDir, 'index.ts'), 'console.log("test");');
    await writeFile(join(testDir, 'config.json'), '{}');

    // Create node_modules (should still be excluded by fast-glob)
    await mkdir(join(testDir, 'node_modules'));
    await writeFile(join(testDir, 'node_modules', 'pkg.js'), 'pkg');

    const result = await scanFiles(defaultOptions);

    // Should include source files but still exclude node_modules
    expect(result.files.length).toBe(2);
    expect(result.files.map(f => f.relativePath).sort()).toEqual(['config.json', 'index.ts']);
    expect(result.files.some(f => f.relativePath.includes('node_modules'))).toBe(false);
  });

  it('should handle negation patterns in .gitignore', async () => {
    // Create a .gitignore with negation pattern
    await writeFile(
      join(testDir, '.gitignore'),
      '*.log\n!important.log\n'
    );

    // Create log files
    await writeFile(join(testDir, 'app.log'), 'app logs');
    await writeFile(join(testDir, 'debug.log'), 'debug logs');
    await writeFile(join(testDir, 'important.log'), 'important logs');
    await writeFile(join(testDir, 'index.ts'), 'code');

    const result = await scanFiles(defaultOptions);

    // Should include .gitignore, index.ts and important.log (due to negation)
    const includedPaths = result.files.map(f => f.relativePath).sort();
    expect(includedPaths).toEqual(['.gitignore', 'important.log', 'index.ts']);
  });

  it('should exclude directories specified in .gitignore', async () => {
    // Test directory patterns with and without trailing slashes
    await writeFile(
      join(testDir, '.gitignore'),
      'build/\ntemp\n'
    );

    await mkdir(join(testDir, 'build'));
    await writeFile(join(testDir, 'build', 'output.js'), 'built');

    await mkdir(join(testDir, 'temp'));
    await writeFile(join(testDir, 'temp', 'cache.txt'), 'cached');

    await mkdir(join(testDir, 'src'));
    await writeFile(join(testDir, 'src', 'index.ts'), 'source');

    const result = await scanFiles(defaultOptions);

    expect(result.files.length).toBe(2);
    const paths = result.files.map(f => f.relativePath).sort();
    expect(paths).toEqual(['.gitignore', 'src/index.ts']);
    expect(result.files.some(f => f.relativePath.includes('build'))).toBe(false);
    expect(result.files.some(f => f.relativePath.includes('temp'))).toBe(false);
  });
});
