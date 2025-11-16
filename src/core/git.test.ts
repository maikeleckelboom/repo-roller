import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { execSync } from 'node:child_process';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  isGitRepository,
  getFilesSince,
  getStagedFiles,
  getUnstagedFiles,
  getChangedFiles,
  getCurrentBranch,
  isValidCommitRef,
  getCommitInfo,
} from './git.js';

describe('git', () => {
  let testDir: string;
  let isGitRepo: boolean = false;

  beforeEach(async () => {
    testDir = join(tmpdir(), `git-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  const initGitRepo = () => {
    execSync('git init', { cwd: testDir, stdio: 'pipe' });
    execSync('git config user.email "test@test.com"', { cwd: testDir, stdio: 'pipe' });
    execSync('git config user.name "Test User"', { cwd: testDir, stdio: 'pipe' });
    // Disable GPG signing for tests
    execSync('git config commit.gpgsign false', { cwd: testDir, stdio: 'pipe' });
    isGitRepo = true;
  };

  describe('isGitRepository', () => {
    it('should return false for non-git directory', async () => {
      const result = await isGitRepository(testDir);
      expect(result).toBe(false);
    });

    it('should return true for git repository', async () => {
      initGitRepo();
      const result = await isGitRepository(testDir);
      expect(result).toBe(true);
    });
  });

  describe('getFilesSince', () => {
    it('should return empty array for non-git directory', () => {
      const result = getFilesSince(testDir, 'HEAD');
      expect(result).toEqual([]);
    });

    it('should return changed files since commit', async () => {
      initGitRepo();

      // Create initial commit
      await writeFile(join(testDir, 'file1.txt'), 'initial');
      execSync('git add file1.txt', { cwd: testDir, stdio: 'pipe' });
      execSync('git commit -m "initial"', { cwd: testDir, stdio: 'pipe' });

      // Create second commit
      await writeFile(join(testDir, 'file2.txt'), 'second');
      execSync('git add file2.txt', { cwd: testDir, stdio: 'pipe' });
      execSync('git commit -m "second"', { cwd: testDir, stdio: 'pipe' });

      // Get files since first commit
      const result = getFilesSince(testDir, 'HEAD~1');
      expect(result).toContain('file2.txt');
      expect(result).not.toContain('file1.txt');
    });

    it('should handle invalid commit ref gracefully', () => {
      initGitRepo();
      const result = getFilesSince(testDir, 'invalid-ref-that-does-not-exist');
      expect(result).toEqual([]);
    });
  });

  describe('getStagedFiles', () => {
    it('should return empty array for non-git directory', () => {
      const result = getStagedFiles(testDir);
      expect(result).toEqual([]);
    });

    it('should return staged files', async () => {
      initGitRepo();

      // Create initial commit
      await writeFile(join(testDir, 'initial.txt'), 'initial');
      execSync('git add initial.txt', { cwd: testDir, stdio: 'pipe' });
      execSync('git commit -m "initial"', { cwd: testDir, stdio: 'pipe' });

      // Stage a new file
      await writeFile(join(testDir, 'staged.txt'), 'staged');
      execSync('git add staged.txt', { cwd: testDir, stdio: 'pipe' });

      const result = getStagedFiles(testDir);
      expect(result).toContain('staged.txt');
    });

    it('should not return unstaged files', async () => {
      initGitRepo();

      // Create initial commit
      await writeFile(join(testDir, 'initial.txt'), 'initial');
      execSync('git add initial.txt', { cwd: testDir, stdio: 'pipe' });
      execSync('git commit -m "initial"', { cwd: testDir, stdio: 'pipe' });

      // Create unstaged file
      await writeFile(join(testDir, 'unstaged.txt'), 'unstaged');

      const result = getStagedFiles(testDir);
      expect(result).not.toContain('unstaged.txt');
    });
  });

  describe('getUnstagedFiles', () => {
    it('should return empty array for non-git directory', () => {
      const result = getUnstagedFiles(testDir);
      expect(result).toEqual([]);
    });

    it('should return modified but unstaged files', async () => {
      initGitRepo();

      // Create initial commit
      await writeFile(join(testDir, 'tracked.txt'), 'initial');
      execSync('git add tracked.txt', { cwd: testDir, stdio: 'pipe' });
      execSync('git commit -m "initial"', { cwd: testDir, stdio: 'pipe' });

      // Modify the file without staging
      await writeFile(join(testDir, 'tracked.txt'), 'modified');

      const result = getUnstagedFiles(testDir);
      expect(result).toContain('tracked.txt');
    });

    it('should not return untracked files', async () => {
      initGitRepo();

      // Create initial commit
      await writeFile(join(testDir, 'initial.txt'), 'initial');
      execSync('git add initial.txt', { cwd: testDir, stdio: 'pipe' });
      execSync('git commit -m "initial"', { cwd: testDir, stdio: 'pipe' });

      // Create untracked file (not added to git)
      await writeFile(join(testDir, 'untracked.txt'), 'untracked');

      const result = getUnstagedFiles(testDir);
      expect(result).not.toContain('untracked.txt');
    });
  });

  describe('getChangedFiles', () => {
    it('should return empty array for non-git directory', () => {
      const result = getChangedFiles(testDir);
      expect(result).toEqual([]);
    });

    it('should return both staged and unstaged files', async () => {
      initGitRepo();

      // Create initial commit
      await writeFile(join(testDir, 'file1.txt'), 'initial');
      await writeFile(join(testDir, 'file2.txt'), 'initial');
      execSync('git add .', { cwd: testDir, stdio: 'pipe' });
      execSync('git commit -m "initial"', { cwd: testDir, stdio: 'pipe' });

      // Stage one file
      await writeFile(join(testDir, 'file1.txt'), 'staged');
      execSync('git add file1.txt', { cwd: testDir, stdio: 'pipe' });

      // Modify another without staging
      await writeFile(join(testDir, 'file2.txt'), 'unstaged');

      const result = getChangedFiles(testDir);
      expect(result).toContain('file1.txt');
      expect(result).toContain('file2.txt');
    });

    it('should deduplicate files that are both staged and unstaged', async () => {
      initGitRepo();

      // Create initial commit
      await writeFile(join(testDir, 'file.txt'), 'initial');
      execSync('git add file.txt', { cwd: testDir, stdio: 'pipe' });
      execSync('git commit -m "initial"', { cwd: testDir, stdio: 'pipe' });

      // Stage change
      await writeFile(join(testDir, 'file.txt'), 'staged');
      execSync('git add file.txt', { cwd: testDir, stdio: 'pipe' });

      // Make additional unstaged change
      await writeFile(join(testDir, 'file.txt'), 'staged and unstaged');

      const result = getChangedFiles(testDir);
      // Should appear only once
      expect(result.filter(f => f === 'file.txt').length).toBe(1);
    });
  });

  describe('getCurrentBranch', () => {
    it('should return undefined for non-git directory', () => {
      const result = getCurrentBranch(testDir);
      expect(result).toBeUndefined();
    });

    it('should return current branch name', async () => {
      initGitRepo();

      // Create initial commit (needed for branch to exist)
      await writeFile(join(testDir, 'file.txt'), 'content');
      execSync('git add file.txt', { cwd: testDir, stdio: 'pipe' });
      execSync('git commit -m "initial"', { cwd: testDir, stdio: 'pipe' });

      const result = getCurrentBranch(testDir);
      // Could be 'main' or 'master' depending on git version
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });
  });

  describe('isValidCommitRef', () => {
    it('should return false for non-git directory', () => {
      const result = isValidCommitRef(testDir, 'HEAD');
      expect(result).toBe(false);
    });

    it('should return true for valid ref', async () => {
      initGitRepo();

      await writeFile(join(testDir, 'file.txt'), 'content');
      execSync('git add file.txt', { cwd: testDir, stdio: 'pipe' });
      execSync('git commit -m "initial"', { cwd: testDir, stdio: 'pipe' });

      const result = isValidCommitRef(testDir, 'HEAD');
      expect(result).toBe(true);
    });

    it('should return false for invalid ref', () => {
      initGitRepo();
      const result = isValidCommitRef(testDir, 'invalid-ref-123');
      expect(result).toBe(false);
    });
  });

  describe('getCommitInfo', () => {
    it('should return undefined for non-git directory', () => {
      const result = getCommitInfo(testDir, 'HEAD');
      expect(result).toBeUndefined();
    });

    it('should return commit info for valid ref', async () => {
      initGitRepo();

      await writeFile(join(testDir, 'file.txt'), 'content');
      execSync('git add file.txt', { cwd: testDir, stdio: 'pipe' });
      execSync('git commit -m "test commit message"', { cwd: testDir, stdio: 'pipe' });

      const result = getCommitInfo(testDir, 'HEAD');
      expect(result).toBeTruthy();
      expect(result).toContain('test commit message');
    });

    it('should return undefined for invalid ref', () => {
      initGitRepo();
      const result = getCommitInfo(testDir, 'invalid-ref');
      expect(result).toBeUndefined();
    });
  });
});
