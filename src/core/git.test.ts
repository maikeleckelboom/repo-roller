import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { getChangedFiles, getMostRecentFiles, isGitRepository, getCurrentBranch, getHeadCommit } from './git.js';

describe('git utilities', () => {
  const testDir = join(process.cwd(), '.test-git-repo');

  beforeEach(async () => {
    // Create a fresh test git repo
    await mkdir(testDir, { recursive: true });
    execSync('git init', { cwd: testDir, stdio: 'ignore' });
    execSync('git config user.email "test@test.com"', { cwd: testDir, stdio: 'ignore' });
    execSync('git config user.name "Test User"', { cwd: testDir, stdio: 'ignore' });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('isGitRepository', () => {
    it('returns true for git repository', async () => {
      const result = await isGitRepository(testDir);
      expect(result).toBe(true);
    });

    it('returns true for subdirectory of git repository', async () => {
      // Git searches parent directories, so subdirs are considered in repo
      const subDir = join(testDir, 'subdir');
      await mkdir(subDir);
      const result = await isGitRepository(subDir);
      expect(result).toBe(true);
    });
  });

  describe('getCurrentBranch', () => {
    it('returns current branch name', async () => {
      // Need at least one commit for branch to exist
      await writeFile(join(testDir, 'initial.txt'), 'content');
      execSync('git add .', { cwd: testDir, stdio: 'ignore' });
      execSync('git commit -m "initial"', { cwd: testDir, stdio: 'ignore' });

      const branch = await getCurrentBranch(testDir);
      expect(branch).toBeTruthy();
      // Could be 'main' or 'master' depending on git config
      expect(['main', 'master']).toContain(branch);
    });
  });

  describe('getHeadCommit', () => {
    it('returns short commit hash', async () => {
      await writeFile(join(testDir, 'file.txt'), 'content');
      execSync('git add .', { cwd: testDir, stdio: 'ignore' });
      execSync('git commit -m "commit"', { cwd: testDir, stdio: 'ignore' });

      const commit = await getHeadCommit(testDir);
      expect(commit).toBeTruthy();
      expect(commit?.length).toBeGreaterThanOrEqual(7);
      expect(commit?.length).toBeLessThanOrEqual(12);
    });
  });

  describe('getChangedFiles', () => {
    it('returns files changed since ref', async () => {
      // Create initial commit
      await writeFile(join(testDir, 'base.txt'), 'base');
      execSync('git add .', { cwd: testDir, stdio: 'ignore' });
      execSync('git commit -m "base"', { cwd: testDir, stdio: 'ignore' });

      // Create branch point
      const baseCommit = execSync('git rev-parse HEAD', { cwd: testDir }).toString().trim();

      // Make changes
      await writeFile(join(testDir, 'new.txt'), 'new file');
      await writeFile(join(testDir, 'base.txt'), 'modified');
      execSync('git add .', { cwd: testDir, stdio: 'ignore' });
      execSync('git commit -m "changes"', { cwd: testDir, stdio: 'ignore' });

      const changed = await getChangedFiles(testDir, baseCommit);
      expect(changed).toContain('base.txt');
      expect(changed).toContain('new.txt');
      expect(changed.length).toBe(2);
    });

    it('returns empty array when no changes', async () => {
      await writeFile(join(testDir, 'file.txt'), 'content');
      execSync('git add .', { cwd: testDir, stdio: 'ignore' });
      execSync('git commit -m "commit"', { cwd: testDir, stdio: 'ignore' });

      const changed = await getChangedFiles(testDir, 'HEAD');
      expect(changed).toEqual([]);
    });

    it('throws helpful error for invalid ref', async () => {
      await writeFile(join(testDir, 'file.txt'), 'content');
      execSync('git add .', { cwd: testDir, stdio: 'ignore' });
      execSync('git commit -m "commit"', { cwd: testDir, stdio: 'ignore' });

      await expect(getChangedFiles(testDir, 'nonexistent-branch')).rejects.toThrow(
        'Invalid git reference: nonexistent-branch'
      );
    });

    it('works from subdirectory of git repository', async () => {
      // Create initial commit
      await writeFile(join(testDir, 'root.txt'), 'root');
      execSync('git add .', { cwd: testDir, stdio: 'ignore' });
      execSync('git commit -m "root"', { cwd: testDir, stdio: 'ignore' });

      const baseCommit = execSync('git rev-parse HEAD', { cwd: testDir }).toString().trim();

      // Add file in subdirectory
      const subDir = join(testDir, 'src');
      await mkdir(subDir);
      await writeFile(join(subDir, 'code.ts'), 'code');
      execSync('git add .', { cwd: testDir, stdio: 'ignore' });
      execSync('git commit -m "add src"', { cwd: testDir, stdio: 'ignore' });

      // Should work when called from subdirectory
      const changed = await getChangedFiles(subDir, baseCommit);
      expect(changed).toContain('src/code.ts');
    });
  });

  describe('getMostRecentFiles', () => {
    it('returns most recently committed files', async () => {
      // Create first commit
      await writeFile(join(testDir, 'old.txt'), 'old');
      execSync('git add .', { cwd: testDir, stdio: 'ignore' });
      execSync('git commit -m "old"', { cwd: testDir, stdio: 'ignore' });

      // Create second commit
      await writeFile(join(testDir, 'new.txt'), 'new');
      execSync('git add .', { cwd: testDir, stdio: 'ignore' });
      execSync('git commit -m "new"', { cwd: testDir, stdio: 'ignore' });

      const recent = await getMostRecentFiles(testDir, 1);
      expect(recent).toEqual(['new.txt']);
    });

    it('returns multiple recent files in order', async () => {
      // Create commits
      await writeFile(join(testDir, 'first.txt'), 'first');
      execSync('git add .', { cwd: testDir, stdio: 'ignore' });
      execSync('git commit -m "first"', { cwd: testDir, stdio: 'ignore' });

      await writeFile(join(testDir, 'second.txt'), 'second');
      execSync('git add .', { cwd: testDir, stdio: 'ignore' });
      execSync('git commit -m "second"', { cwd: testDir, stdio: 'ignore' });

      await writeFile(join(testDir, 'third.txt'), 'third');
      execSync('git add .', { cwd: testDir, stdio: 'ignore' });
      execSync('git commit -m "third"', { cwd: testDir, stdio: 'ignore' });

      const recent = await getMostRecentFiles(testDir, 2);
      expect(recent).toEqual(['third.txt', 'second.txt']);
    });

    it('handles files modified multiple times', async () => {
      await writeFile(join(testDir, 'file.txt'), 'v1');
      execSync('git add .', { cwd: testDir, stdio: 'ignore' });
      execSync('git commit -m "v1"', { cwd: testDir, stdio: 'ignore' });

      await writeFile(join(testDir, 'file.txt'), 'v2');
      execSync('git add .', { cwd: testDir, stdio: 'ignore' });
      execSync('git commit -m "v2"', { cwd: testDir, stdio: 'ignore' });

      const recent = await getMostRecentFiles(testDir, 2);
      // Should only appear once, not twice
      expect(recent.filter(f => f === 'file.txt').length).toBe(1);
    });

    it('respects count limit', async () => {
      for (let i = 1; i <= 5; i++) {
        await writeFile(join(testDir, `file${i}.txt`), `content${i}`);
        execSync('git add .', { cwd: testDir, stdio: 'ignore' });
        execSync(`git commit -m "commit ${i}"`, { cwd: testDir, stdio: 'ignore' });
      }

      const recent = await getMostRecentFiles(testDir, 3);
      expect(recent.length).toBe(3);
      expect(recent).toEqual(['file5.txt', 'file4.txt', 'file3.txt']);
    });

    it('returns empty array for repository with no commits', async () => {
      // Empty repo has no recent files
      const emptyRepoDir = join(process.cwd(), '.test-empty-repo');
      await mkdir(emptyRepoDir, { recursive: true });
      execSync('git init', { cwd: emptyRepoDir, stdio: 'ignore' });

      try {
        const recent = await getMostRecentFiles(emptyRepoDir, 5);
        expect(recent).toEqual([]);
      } finally {
        await rm(emptyRepoDir, { recursive: true, force: true });
      }
    });
  });
});

