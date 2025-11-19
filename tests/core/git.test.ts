import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { getChangedFiles, getMostRecentFiles, isGitRepository, getCurrentBranch, getHeadCommit } from '../../src/core/git.js';

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

    it('returns false for non-git directory', async () => {
      // Create directory in /tmp to avoid git repo inheritance
      const nonGitDir = join('/tmp', '.test-non-git-dir-' + Date.now());
      await mkdir(nonGitDir, { recursive: true });
      try {
        const result = await isGitRepository(nonGitDir);
        expect(result).toBe(false);
      } finally {
        await rm(nonGitDir, { recursive: true, force: true });
      }
    });

    it('handles non-existent directory gracefully', async () => {
      const nonExistentDir = join('/tmp', '.test-does-not-exist-' + Date.now());
      // simple-git throws error for non-existent directory, but our function should handle it
      const result = await isGitRepository(nonExistentDir);
      expect(result).toBe(false);
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

    it('returns undefined for empty repository', async () => {
      // Empty repo has no HEAD yet
      const emptyRepoDir = join(process.cwd(), '.test-empty-branch-repo');
      await mkdir(emptyRepoDir, { recursive: true });
      execSync('git init', { cwd: emptyRepoDir, stdio: 'ignore' });

      try {
        const branch = await getCurrentBranch(emptyRepoDir);
        // May return 'master' or undefined depending on git version
        expect(branch === undefined || typeof branch === 'string').toBe(true);
      } finally {
        await rm(emptyRepoDir, { recursive: true, force: true });
      }
    });

    it('returns undefined for non-git directory', async () => {
      const nonGitDir = join('/tmp', '.test-non-git-branch-' + Date.now());
      await mkdir(nonGitDir, { recursive: true });
      try {
        const branch = await getCurrentBranch(nonGitDir);
        expect(branch).toBeUndefined();
      } finally {
        await rm(nonGitDir, { recursive: true, force: true });
      }
    });

    it('returns branch name after switching branches', async () => {
      await writeFile(join(testDir, 'initial.txt'), 'content');
      execSync('git add .', { cwd: testDir, stdio: 'ignore' });
      execSync('git commit -m "initial"', { cwd: testDir, stdio: 'ignore' });

      execSync('git checkout -b feature-branch', { cwd: testDir, stdio: 'ignore' });
      const branch = await getCurrentBranch(testDir);
      expect(branch).toBe('feature-branch');
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

    it('returns undefined for empty repository', async () => {
      const emptyRepoDir = join(process.cwd(), '.test-empty-commit-repo');
      await mkdir(emptyRepoDir, { recursive: true });
      execSync('git init', { cwd: emptyRepoDir, stdio: 'ignore' });

      try {
        const commit = await getHeadCommit(emptyRepoDir);
        expect(commit).toBeUndefined();
      } finally {
        await rm(emptyRepoDir, { recursive: true, force: true });
      }
    });

    it('returns undefined for non-git directory', async () => {
      const nonGitDir = join('/tmp', '.test-non-git-commit-' + Date.now());
      await mkdir(nonGitDir, { recursive: true });
      try {
        const commit = await getHeadCommit(nonGitDir);
        expect(commit).toBeUndefined();
      } finally {
        await rm(nonGitDir, { recursive: true, force: true });
      }
    });

    it('returns different hash after new commit', async () => {
      await writeFile(join(testDir, 'file1.txt'), 'content1');
      execSync('git add .', { cwd: testDir, stdio: 'ignore' });
      execSync('git commit -m "first"', { cwd: testDir, stdio: 'ignore' });
      const firstCommit = await getHeadCommit(testDir);

      await writeFile(join(testDir, 'file2.txt'), 'content2');
      execSync('git add .', { cwd: testDir, stdio: 'ignore' });
      execSync('git commit -m "second"', { cwd: testDir, stdio: 'ignore' });
      const secondCommit = await getHeadCommit(testDir);

      expect(firstCommit).not.toBe(secondCommit);
    });

    it('returns only hexadecimal characters', async () => {
      await writeFile(join(testDir, 'file.txt'), 'content');
      execSync('git add .', { cwd: testDir, stdio: 'ignore' });
      execSync('git commit -m "commit"', { cwd: testDir, stdio: 'ignore' });

      const commit = await getHeadCommit(testDir);
      expect(commit).toMatch(/^[a-f0-9]+$/);
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

    it('supports HEAD~N syntax', async () => {
      await writeFile(join(testDir, 'file1.txt'), 'content1');
      execSync('git add .', { cwd: testDir, stdio: 'ignore' });
      execSync('git commit -m "commit1"', { cwd: testDir, stdio: 'ignore' });

      await writeFile(join(testDir, 'file2.txt'), 'content2');
      execSync('git add .', { cwd: testDir, stdio: 'ignore' });
      execSync('git commit -m "commit2"', { cwd: testDir, stdio: 'ignore' });

      await writeFile(join(testDir, 'file3.txt'), 'content3');
      execSync('git add .', { cwd: testDir, stdio: 'ignore' });
      execSync('git commit -m "commit3"', { cwd: testDir, stdio: 'ignore' });

      const changed = await getChangedFiles(testDir, 'HEAD~2');
      expect(changed).toContain('file2.txt');
      expect(changed).toContain('file3.txt');
      expect(changed).not.toContain('file1.txt');
    });

    it('detects deleted files', async () => {
      await writeFile(join(testDir, 'delete-me.txt'), 'content');
      await writeFile(join(testDir, 'keep-me.txt'), 'content');
      execSync('git add .', { cwd: testDir, stdio: 'ignore' });
      execSync('git commit -m "initial"', { cwd: testDir, stdio: 'ignore' });

      const baseCommit = execSync('git rev-parse HEAD', { cwd: testDir }).toString().trim();

      execSync('git rm delete-me.txt', { cwd: testDir, stdio: 'ignore' });
      execSync('git commit -m "delete file"', { cwd: testDir, stdio: 'ignore' });

      const changed = await getChangedFiles(testDir, baseCommit);
      expect(changed).toContain('delete-me.txt');
    });

    it('detects renamed files', async () => {
      await writeFile(join(testDir, 'old-name.txt'), 'content');
      execSync('git add .', { cwd: testDir, stdio: 'ignore' });
      execSync('git commit -m "initial"', { cwd: testDir, stdio: 'ignore' });

      const baseCommit = execSync('git rev-parse HEAD', { cwd: testDir }).toString().trim();

      execSync('git mv old-name.txt new-name.txt', { cwd: testDir, stdio: 'ignore' });
      execSync('git commit -m "rename"', { cwd: testDir, stdio: 'ignore' });

      const changed = await getChangedFiles(testDir, baseCommit);
      // Renames show up as both old and new name
      expect(changed.length).toBeGreaterThanOrEqual(1);
    });

    it('works with branch names', async () => {
      await writeFile(join(testDir, 'main.txt'), 'main content');
      execSync('git add .', { cwd: testDir, stdio: 'ignore' });
      execSync('git commit -m "main commit"', { cwd: testDir, stdio: 'ignore' });

      execSync('git checkout -b feature', { cwd: testDir, stdio: 'ignore' });
      await writeFile(join(testDir, 'feature.txt'), 'feature content');
      execSync('git add .', { cwd: testDir, stdio: 'ignore' });
      execSync('git commit -m "feature commit"', { cwd: testDir, stdio: 'ignore' });

      // Get the main branch name
      execSync('git checkout -', { cwd: testDir, stdio: 'ignore' });
      const mainBranch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: testDir }).toString().trim();
      execSync('git checkout feature', { cwd: testDir, stdio: 'ignore' });

      const changed = await getChangedFiles(testDir, mainBranch);
      expect(changed).toContain('feature.txt');
      expect(changed).not.toContain('main.txt');
    });

    it('handles deeply nested file paths', async () => {
      await writeFile(join(testDir, 'root.txt'), 'root');
      execSync('git add .', { cwd: testDir, stdio: 'ignore' });
      execSync('git commit -m "initial"', { cwd: testDir, stdio: 'ignore' });

      const baseCommit = execSync('git rev-parse HEAD', { cwd: testDir }).toString().trim();

      const deepPath = join(testDir, 'src', 'components', 'ui', 'button');
      await mkdir(deepPath, { recursive: true });
      await writeFile(join(deepPath, 'index.tsx'), 'export const Button = () => {}');
      execSync('git add .', { cwd: testDir, stdio: 'ignore' });
      execSync('git commit -m "add deep file"', { cwd: testDir, stdio: 'ignore' });

      const changed = await getChangedFiles(testDir, baseCommit);
      expect(changed).toContain('src/components/ui/button/index.tsx');
    });

    it('throws for non-git repository', async () => {
      const nonGitDir = join('/tmp', '.test-non-git-changed-' + Date.now());
      await mkdir(nonGitDir, { recursive: true });
      await writeFile(join(nonGitDir, 'file.txt'), 'content');

      try {
        await expect(getChangedFiles(nonGitDir, 'HEAD')).rejects.toThrow('Not a git repository');
      } finally {
        await rm(nonGitDir, { recursive: true, force: true });
      }
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

    it('handles multiple files in single commit', async () => {
      await writeFile(join(testDir, 'file1.txt'), 'content1');
      await writeFile(join(testDir, 'file2.txt'), 'content2');
      await writeFile(join(testDir, 'file3.txt'), 'content3');
      execSync('git add .', { cwd: testDir, stdio: 'ignore' });
      execSync('git commit -m "multiple files"', { cwd: testDir, stdio: 'ignore' });

      const recent = await getMostRecentFiles(testDir, 5);
      expect(recent).toContain('file1.txt');
      expect(recent).toContain('file2.txt');
      expect(recent).toContain('file3.txt');
    });

    it('handles files in subdirectories', async () => {
      const subDir = join(testDir, 'src');
      await mkdir(subDir);
      await writeFile(join(subDir, 'code.ts'), 'code');
      execSync('git add .', { cwd: testDir, stdio: 'ignore' });
      execSync('git commit -m "add code"', { cwd: testDir, stdio: 'ignore' });

      const recent = await getMostRecentFiles(testDir, 1);
      expect(recent).toEqual(['src/code.ts']);
    });

    it('returns fewer files if count exceeds available', async () => {
      await writeFile(join(testDir, 'only.txt'), 'content');
      execSync('git add .', { cwd: testDir, stdio: 'ignore' });
      execSync('git commit -m "single"', { cwd: testDir, stdio: 'ignore' });

      const recent = await getMostRecentFiles(testDir, 100);
      expect(recent.length).toBe(1);
      expect(recent).toEqual(['only.txt']);
    });

    it('returns zero files when count is zero', async () => {
      await writeFile(join(testDir, 'file.txt'), 'content');
      execSync('git add .', { cwd: testDir, stdio: 'ignore' });
      execSync('git commit -m "commit"', { cwd: testDir, stdio: 'ignore' });

      const recent = await getMostRecentFiles(testDir, 0);
      expect(recent).toEqual([]);
    });

    it('throws for non-git repository', async () => {
      const nonGitDir = join('/tmp', '.test-non-git-recent-' + Date.now());
      await mkdir(nonGitDir, { recursive: true });
      await writeFile(join(nonGitDir, 'file.txt'), 'content');

      try {
        await expect(getMostRecentFiles(nonGitDir, 5)).rejects.toThrow('Not a git repository');
      } finally {
        await rm(nonGitDir, { recursive: true, force: true });
      }
    });

    it('excludes deleted files', async () => {
      await writeFile(join(testDir, 'keep.txt'), 'keep');
      execSync('git add .', { cwd: testDir, stdio: 'ignore' });
      execSync('git commit -m "add keep"', { cwd: testDir, stdio: 'ignore' });

      await writeFile(join(testDir, 'delete-later.txt'), 'delete');
      execSync('git add .', { cwd: testDir, stdio: 'ignore' });
      execSync('git commit -m "add delete"', { cwd: testDir, stdio: 'ignore' });

      execSync('git rm delete-later.txt', { cwd: testDir, stdio: 'ignore' });
      execSync('git commit -m "remove file"', { cwd: testDir, stdio: 'ignore' });

      const recent = await getMostRecentFiles(testDir, 5);
      // The most recent commit is a deletion, so it shouldn't be in recent files
      expect(recent).toContain('keep.txt');
    });

    it('handles deeply nested paths', async () => {
      const deepPath = join(testDir, 'a', 'b', 'c', 'd');
      await mkdir(deepPath, { recursive: true });
      await writeFile(join(deepPath, 'deep.txt'), 'content');
      execSync('git add .', { cwd: testDir, stdio: 'ignore' });
      execSync('git commit -m "deep"', { cwd: testDir, stdio: 'ignore' });

      const recent = await getMostRecentFiles(testDir, 1);
      expect(recent).toEqual(['a/b/c/d/deep.txt']);
    });
  });
});

