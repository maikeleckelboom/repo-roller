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
      profile: 'llm-context',
      format: 'md',
      repoRollerConfig: undefined,
      // New DX options
      dryRun: false,
      statsOnly: false,
      // Format-specific options
      compact: false,
      indent: 2,
      toc: false,
      frontMatter: false,
      tokenCount: false,
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
    expect(result.files[0]?.relativePath).toBe('index.ts');
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

  describe('default blacklist', () => {
    it('should exclude common lock files by default', async () => {
      // Create various lock files
      await writeFile(join(testDir, 'package-lock.json'), '{}');
      await writeFile(join(testDir, 'yarn.lock'), '# yarn lockfile');
      await writeFile(join(testDir, 'pnpm-lock.yaml'), 'lockfileVersion: 5.3');
      await writeFile(join(testDir, 'bun.lockb'), 'binary lock');
      await writeFile(join(testDir, 'composer.lock'), '{}');
      await writeFile(join(testDir, 'Gemfile.lock'), 'GEM');
      await writeFile(join(testDir, 'poetry.lock'), '[[package]]');
      await writeFile(join(testDir, 'Cargo.lock'), '# This file is auto-generated');
      await writeFile(join(testDir, 'go.sum'), 'checksums');
      await writeFile(join(testDir, 'Pipfile.lock'), '{}');

      // Create a source file that should be included
      await writeFile(join(testDir, 'index.ts'), 'console.log("test");');

      const result = await scanFiles(defaultOptions);

      // Should only include index.ts, all lock files should be excluded
      expect(result.files.length).toBe(1);
      expect(result.files[0]?.relativePath).toBe('index.ts');
      expect(result.files.some(f => f.relativePath.includes('lock'))).toBe(false);
    });

    it('should exclude common build output directories by default', async () => {
      // Create build output directories
      await mkdir(join(testDir, 'dist'));
      await writeFile(join(testDir, 'dist', 'bundle.js'), 'bundled');

      await mkdir(join(testDir, 'build'));
      await writeFile(join(testDir, 'build', 'output.js'), 'built');

      await mkdir(join(testDir, 'out'));
      await writeFile(join(testDir, 'out', 'compiled.js'), 'compiled');

      await mkdir(join(testDir, '.next'));
      await writeFile(join(testDir, '.next', 'BUILD_ID'), '123');

      await mkdir(join(testDir, '.nuxt'));
      await writeFile(join(testDir, '.nuxt', 'client.js'), 'nuxt client');

      await mkdir(join(testDir, '.output'));
      await writeFile(join(testDir, '.output', 'server.js'), 'server');

      await mkdir(join(testDir, '.vercel'));
      await writeFile(join(testDir, '.vercel', 'project.json'), '{}');

      await mkdir(join(testDir, '.netlify'));
      await writeFile(join(testDir, '.netlify', 'state.json'), '{}');

      // Create a source file that should be included
      await writeFile(join(testDir, 'index.ts'), 'console.log("test");');

      const result = await scanFiles(defaultOptions);

      // Should only include index.ts, all build outputs should be excluded
      expect(result.files.length).toBe(1);
      expect(result.files[0]?.relativePath).toBe('index.ts');
      expect(result.files.some(f => f.relativePath.includes('dist'))).toBe(false);
      expect(result.files.some(f => f.relativePath.includes('build'))).toBe(false);
      expect(result.files.some(f => f.relativePath.includes('out'))).toBe(false);
      expect(result.files.some(f => f.relativePath.includes('.next'))).toBe(false);
      expect(result.files.some(f => f.relativePath.includes('.nuxt'))).toBe(false);
      expect(result.files.some(f => f.relativePath.includes('.output'))).toBe(false);
      expect(result.files.some(f => f.relativePath.includes('.vercel'))).toBe(false);
      expect(result.files.some(f => f.relativePath.includes('.netlify'))).toBe(false);
    });

    it('should exclude common cache directories by default', async () => {
      // Create cache directories
      await mkdir(join(testDir, '.cache'));
      await writeFile(join(testDir, '.cache', 'data.json'), '{}');

      await mkdir(join(testDir, '.parcel-cache'));
      await writeFile(join(testDir, '.parcel-cache', 'lock'), 'locked');

      await mkdir(join(testDir, '.turbo'));
      await writeFile(join(testDir, '.turbo', 'turbo-build.log'), 'logs');

      await mkdir(join(testDir, '.swc'));
      await writeFile(join(testDir, '.swc', 'cache.json'), '{}');

      await mkdir(join(testDir, '.webpack'));
      await writeFile(join(testDir, '.webpack', 'cache.json'), '{}');

      await mkdir(join(testDir, '.vite'));
      await writeFile(join(testDir, '.vite', 'deps.json'), '{}');

      // Create a source file that should be included
      await writeFile(join(testDir, 'index.ts'), 'console.log("test");');

      const result = await scanFiles(defaultOptions);

      // Should only include index.ts, all cache directories should be excluded
      expect(result.files.length).toBe(1);
      expect(result.files[0]?.relativePath).toBe('index.ts');
      expect(result.files.some(f => f.relativePath.includes('.cache'))).toBe(false);
      expect(result.files.some(f => f.relativePath.includes('.parcel-cache'))).toBe(false);
      expect(result.files.some(f => f.relativePath.includes('.turbo'))).toBe(false);
      expect(result.files.some(f => f.relativePath.includes('.swc'))).toBe(false);
      expect(result.files.some(f => f.relativePath.includes('.webpack'))).toBe(false);
      expect(result.files.some(f => f.relativePath.includes('.vite'))).toBe(false);
    });

    it('should exclude coverage and test output directories by default', async () => {
      // Create coverage directories
      await mkdir(join(testDir, 'coverage'));
      await writeFile(join(testDir, 'coverage', 'lcov.info'), 'coverage data');

      await mkdir(join(testDir, '.nyc_output'));
      await writeFile(join(testDir, '.nyc_output', 'data.json'), '{}');

      await mkdir(join(testDir, '.jest'));
      await writeFile(join(testDir, '.jest', 'cache.json'), '{}');

      // Create a source file that should be included
      await writeFile(join(testDir, 'index.ts'), 'console.log("test");');

      const result = await scanFiles(defaultOptions);

      // Should only include index.ts, all coverage directories should be excluded
      expect(result.files.length).toBe(1);
      expect(result.files[0]?.relativePath).toBe('index.ts');
      expect(result.files.some(f => f.relativePath.includes('coverage'))).toBe(false);
      expect(result.files.some(f => f.relativePath.includes('.nyc_output'))).toBe(false);
      expect(result.files.some(f => f.relativePath.includes('.jest'))).toBe(false);
    });

    it('should exclude environment files by default', async () => {
      // Create environment files
      await writeFile(join(testDir, '.env'), 'SECRET=123');
      await writeFile(join(testDir, '.env.local'), 'SECRET=456');
      await writeFile(join(testDir, '.env.development.local'), 'SECRET=789');
      await writeFile(join(testDir, '.env.production.local'), 'SECRET=000');

      // Create a source file that should be included
      await writeFile(join(testDir, 'index.ts'), 'console.log("test");');

      const result = await scanFiles(defaultOptions);

      // Should only include index.ts, all env files should be excluded
      expect(result.files.length).toBe(1);
      expect(result.files[0]?.relativePath).toBe('index.ts');
      expect(result.files.some(f => f.relativePath.includes('.env'))).toBe(false);
    });

    it('should exclude IDE and editor files by default', async () => {
      // Create IDE directories
      await mkdir(join(testDir, '.vscode'));
      await writeFile(join(testDir, '.vscode', 'settings.json'), '{}');

      await mkdir(join(testDir, '.idea'));
      await writeFile(join(testDir, '.idea', 'workspace.xml'), '<xml></xml>');

      // Create editor temporary files
      await writeFile(join(testDir, 'file.swp'), 'vim swap');
      await writeFile(join(testDir, 'file.swo'), 'vim swap');
      await writeFile(join(testDir, 'file~'), 'backup');
      await writeFile(join(testDir, '.DS_Store'), 'mac metadata');

      // Create a source file that should be included
      await writeFile(join(testDir, 'index.ts'), 'console.log("test");');

      const result = await scanFiles(defaultOptions);

      // Should only include index.ts, all IDE/editor files should be excluded
      expect(result.files.length).toBe(1);
      expect(result.files[0]?.relativePath).toBe('index.ts');
      expect(result.files.some(f => f.relativePath.includes('.vscode'))).toBe(false);
      expect(result.files.some(f => f.relativePath.includes('.idea'))).toBe(false);
      expect(result.files.some(f => f.relativePath.includes('.swp'))).toBe(false);
      expect(result.files.some(f => f.relativePath.includes('.swo'))).toBe(false);
      expect(result.files.some(f => f.relativePath.includes('~'))).toBe(false);
      expect(result.files.some(f => f.relativePath.includes('.DS_Store'))).toBe(false);
    });

    it('should exclude log files and directories by default', async () => {
      // Create log files
      await writeFile(join(testDir, 'app.log'), 'application logs');
      await writeFile(join(testDir, 'error.log'), 'error logs');
      await writeFile(join(testDir, 'npm-debug.log'), 'npm debug');
      await writeFile(join(testDir, 'yarn-debug.log'), 'yarn debug');
      await writeFile(join(testDir, 'yarn-error.log'), 'yarn error');

      // Create logs directory
      await mkdir(join(testDir, 'logs'));
      await writeFile(join(testDir, 'logs', 'server.log'), 'server logs');

      // Create a source file that should be included
      await writeFile(join(testDir, 'index.ts'), 'console.log("test");');

      const result = await scanFiles(defaultOptions);

      // Should only include index.ts, all log files should be excluded
      expect(result.files.length).toBe(1);
      expect(result.files[0]?.relativePath).toBe('index.ts');
      expect(result.files.some(f => f.relativePath.includes('.log'))).toBe(false);
      expect(result.files.some(f => f.relativePath.includes('logs'))).toBe(false);
    });

    it('should exclude temporary files and directories by default', async () => {
      // Create temporary files and directories
      await writeFile(join(testDir, 'cache.tmp'), 'temp cache');
      await writeFile(join(testDir, 'data.tmp'), 'temp data');

      await mkdir(join(testDir, 'tmp'));
      await writeFile(join(testDir, 'tmp', 'file.txt'), 'temp file');

      await mkdir(join(testDir, 'temp'));
      await writeFile(join(testDir, 'temp', 'file.txt'), 'temp file');

      // Create a source file that should be included
      await writeFile(join(testDir, 'index.ts'), 'console.log("test");');

      const result = await scanFiles(defaultOptions);

      // Should only include index.ts, all temp files should be excluded
      expect(result.files.length).toBe(1);
      expect(result.files[0]?.relativePath).toBe('index.ts');
      expect(result.files.some(f => f.relativePath.includes('.tmp'))).toBe(false);
      expect(result.files.some(f => f.relativePath.includes('tmp'))).toBe(false);
      expect(result.files.some(f => f.relativePath.includes('temp'))).toBe(false);
    });

    it('should exclude system files by default', async () => {
      // Create system files
      await writeFile(join(testDir, 'Thumbs.db'), 'windows thumbnail cache');
      await writeFile(join(testDir, 'desktop.ini'), 'windows desktop config');

      // Create a source file that should be included
      await writeFile(join(testDir, 'index.ts'), 'console.log("test");');

      const result = await scanFiles(defaultOptions);

      // Should only include index.ts, all system files should be excluded
      expect(result.files.length).toBe(1);
      expect(result.files[0]?.relativePath).toBe('index.ts');
      expect(result.files.some(f => f.relativePath.includes('Thumbs.db'))).toBe(false);
      expect(result.files.some(f => f.relativePath.includes('desktop.ini'))).toBe(false);
    });

    it('should apply user .gitignore patterns on top of default blacklist', async () => {
      // Create a .gitignore with additional patterns
      await writeFile(join(testDir, '.gitignore'), 'custom-ignore/\n*.secret\n');

      // Create files that should be excluded by default blacklist
      await writeFile(join(testDir, 'package-lock.json'), '{}');
      await writeFile(join(testDir, 'yarn.lock'), 'lock');

      // Create files that should be excluded by user .gitignore
      await mkdir(join(testDir, 'custom-ignore'));
      await writeFile(join(testDir, 'custom-ignore', 'file.txt'), 'ignored');
      await writeFile(join(testDir, 'data.secret'), 'secret data');

      // Create files that should be included
      await writeFile(join(testDir, 'index.ts'), 'console.log("test");');
      await writeFile(join(testDir, 'config.json'), '{}');

      const result = await scanFiles(defaultOptions);

      // Should include .gitignore, index.ts, and config.json
      expect(result.files.length).toBe(3);
      const paths = result.files.map(f => f.relativePath).sort();
      expect(paths).toEqual(['.gitignore', 'config.json', 'index.ts']);

      // Verify default blacklist items are excluded
      expect(result.files.some(f => f.relativePath.includes('lock'))).toBe(false);

      // Verify user patterns are excluded
      expect(result.files.some(f => f.relativePath.includes('custom-ignore'))).toBe(false);
      expect(result.files.some(f => f.relativePath.includes('.secret'))).toBe(false);
    });

    it('should allow user .gitignore to override default blacklist with negation', async () => {
      // Create a .gitignore that negates a default pattern
      await writeFile(
        join(testDir, '.gitignore'),
        '!package-lock.json\n'
      );

      // Create lock files
      await writeFile(join(testDir, 'package-lock.json'), '{}');
      await writeFile(join(testDir, 'yarn.lock'), 'lock');

      // Create a source file
      await writeFile(join(testDir, 'index.ts'), 'console.log("test");');

      const result = await scanFiles(defaultOptions);

      // Should include .gitignore, index.ts, and package-lock.json (negated)
      // but not yarn.lock (still in default blacklist)
      expect(result.files.length).toBe(3);
      const paths = result.files.map(f => f.relativePath).sort();
      expect(paths).toEqual(['.gitignore', 'index.ts', 'package-lock.json']);
      expect(result.files.some(f => f.relativePath.includes('yarn.lock'))).toBe(false);
    });

    it('should exclude all common dev artifacts in a comprehensive scenario', async () => {
      // Create a realistic project structure with many dev artifacts

      // Lock files
      await writeFile(join(testDir, 'package-lock.json'), '{}');
      await writeFile(join(testDir, 'yarn.lock'), 'lock');
      await writeFile(join(testDir, 'bun.lockb'), 'lock');

      // Build outputs
      await mkdir(join(testDir, 'dist'));
      await writeFile(join(testDir, 'dist', 'bundle.js'), 'bundled');
      await mkdir(join(testDir, 'build'));
      await writeFile(join(testDir, 'build', 'output.js'), 'built');

      // Cache
      await mkdir(join(testDir, '.cache'));
      await writeFile(join(testDir, '.cache', 'data.json'), '{}');
      await mkdir(join(testDir, '.turbo'));
      await writeFile(join(testDir, '.turbo', 'cache.json'), '{}');

      // Coverage
      await mkdir(join(testDir, 'coverage'));
      await writeFile(join(testDir, 'coverage', 'lcov.info'), 'coverage');

      // Environment
      await writeFile(join(testDir, '.env'), 'SECRET=123');
      await writeFile(join(testDir, '.env.local'), 'SECRET=456');

      // IDE
      await mkdir(join(testDir, '.vscode'));
      await writeFile(join(testDir, '.vscode', 'settings.json'), '{}');
      await mkdir(join(testDir, '.idea'));
      await writeFile(join(testDir, '.idea', 'workspace.xml'), '<xml></xml>');

      // Logs
      await writeFile(join(testDir, 'error.log'), 'errors');
      await writeFile(join(testDir, 'npm-debug.log'), 'debug');
      await mkdir(join(testDir, 'logs'));
      await writeFile(join(testDir, 'logs', 'app.log'), 'logs');

      // Temp
      await writeFile(join(testDir, 'cache.tmp'), 'temp');
      await mkdir(join(testDir, 'tmp'));
      await writeFile(join(testDir, 'tmp', 'file.txt'), 'temp file');

      // System files
      await writeFile(join(testDir, '.DS_Store'), 'mac metadata');
      await writeFile(join(testDir, 'Thumbs.db'), 'windows cache');

      // Dependencies
      await mkdir(join(testDir, 'node_modules'));
      await writeFile(join(testDir, 'node_modules', 'pkg.js'), 'package');

      // Source files (should be included)
      await writeFile(join(testDir, 'index.ts'), 'source code');
      await writeFile(join(testDir, 'package.json'), '{}');
      await writeFile(join(testDir, 'README.md'), '# Project');
      await mkdir(join(testDir, 'src'));
      await writeFile(join(testDir, 'src', 'app.ts'), 'app code');

      const result = await scanFiles(defaultOptions);

      // Should only include source files
      expect(result.files.length).toBe(4);
      const paths = result.files.map(f => f.relativePath).sort();
      expect(paths).toEqual(['README.md', 'index.ts', 'package.json', 'src/app.ts']);

      // Verify all dev artifacts are excluded
      expect(result.files.some(f => f.relativePath.includes('lock'))).toBe(false);
      expect(result.files.some(f => f.relativePath.includes('dist'))).toBe(false);
      expect(result.files.some(f => f.relativePath.includes('build'))).toBe(false);
      expect(result.files.some(f => f.relativePath.includes('.cache'))).toBe(false);
      expect(result.files.some(f => f.relativePath.includes('.turbo'))).toBe(false);
      expect(result.files.some(f => f.relativePath.includes('coverage'))).toBe(false);
      expect(result.files.some(f => f.relativePath.includes('.env'))).toBe(false);
      expect(result.files.some(f => f.relativePath.includes('.vscode'))).toBe(false);
      expect(result.files.some(f => f.relativePath.includes('.idea'))).toBe(false);
      expect(result.files.some(f => f.relativePath.includes('.log'))).toBe(false);
      expect(result.files.some(f => f.relativePath.includes('logs'))).toBe(false);
      expect(result.files.some(f => f.relativePath.includes('.tmp'))).toBe(false);
      expect(result.files.some(f => f.relativePath.includes('tmp'))).toBe(false);
      expect(result.files.some(f => f.relativePath.includes('.DS_Store'))).toBe(false);
      expect(result.files.some(f => f.relativePath.includes('Thumbs.db'))).toBe(false);
      expect(result.files.some(f => f.relativePath.includes('node_modules'))).toBe(false);
    });
  });

  describe('interactive mode', () => {
    it('should include all files in interactive mode with isDefaultIncluded flag', async () => {
      // Create files that would normally be ignored
      await writeFile(join(testDir, '.env'), 'SECRET=123');
      await mkdir(join(testDir, 'dist'));
      await writeFile(join(testDir, 'dist', 'bundle.js'), 'bundled');
      await writeFile(join(testDir, 'package-lock.json'), '{}');

      // Create files that should be included by default
      await writeFile(join(testDir, 'index.ts'), 'source code');
      await writeFile(join(testDir, 'package.json'), '{}');

      const result = await scanFiles({
        ...defaultOptions,
        interactive: true,
      });

      // In interactive mode, all files should be found (except node_modules and .git)
      expect(result.files.length).toBeGreaterThan(4);

      // Check that ignored files are present but marked as not default included
      const envFile = result.files.find(f => f.relativePath === '.env');
      expect(envFile).toBeDefined();
      expect(envFile?.isDefaultIncluded).toBe(false);

      const distFile = result.files.find(f => f.relativePath === 'dist/bundle.js');
      expect(distFile).toBeDefined();
      expect(distFile?.isDefaultIncluded).toBe(false);

      const lockFile = result.files.find(f => f.relativePath === 'package-lock.json');
      expect(lockFile).toBeDefined();
      expect(lockFile?.isDefaultIncluded).toBe(false);

      // Check that normal files are marked as default included
      const indexFile = result.files.find(f => f.relativePath === 'index.ts');
      expect(indexFile).toBeDefined();
      expect(indexFile?.isDefaultIncluded).toBe(true);

      const pkgFile = result.files.find(f => f.relativePath === 'package.json');
      expect(pkgFile).toBeDefined();
      expect(pkgFile?.isDefaultIncluded).toBe(true);
    });

    it('should respect exclude patterns but mark files with isDefaultIncluded', async () => {
      // Create files
      await writeFile(join(testDir, 'index.ts'), 'source');
      await writeFile(join(testDir, 'test.ts'), 'test');
      await writeFile(join(testDir, 'config.json'), '{}');

      const result = await scanFiles({
        ...defaultOptions,
        exclude: ['*.json'],
        interactive: true,
      });

      // All files should be found in interactive mode
      const configFile = result.files.find(f => f.relativePath === 'config.json');
      expect(configFile).toBeDefined();
      expect(configFile?.isDefaultIncluded).toBe(false); // Excluded by pattern

      const indexFile = result.files.find(f => f.relativePath === 'index.ts');
      expect(indexFile).toBeDefined();
      expect(indexFile?.isDefaultIncluded).toBe(true);
    });
  });
});
