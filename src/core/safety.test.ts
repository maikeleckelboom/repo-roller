import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  performSafetyChecks,
  formatSafetyWarning,
  getSafetySummary,
} from './safety.js';
import type { FileInfo, RepoRollerYmlConfig } from './types.js';

describe('safety', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `safety-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  const createFileInfo = (relativePath: string, absolutePath: string): FileInfo => ({
    relativePath,
    absolutePath,
    sizeBytes: 100,
    extension: relativePath.split('.').pop() ?? '',
    isBinary: false,
    isDefaultIncluded: true,
    lastModified: new Date(),
  });

  describe('performSafetyChecks', () => {
    it('should block files matching neverSend patterns', async () => {
      const files = [
        createFileInfo('.env', join(testDir, '.env')),
        createFileInfo('app.ts', join(testDir, 'app.ts')),
        createFileInfo('credentials.json', join(testDir, 'credentials.json')),
      ];

      // Create the files
      await writeFile(join(testDir, '.env'), 'DB=test');
      await writeFile(join(testDir, 'app.ts'), 'export const x = 1;');
      await writeFile(join(testDir, 'credentials.json'), '{}');

      const result = await performSafetyChecks(files);

      expect(result.blockedFiles.length).toBe(2); // .env and credentials.json
      expect(result.safeFiles.length).toBe(1);
      expect(result.safeFiles[0]?.relativePath).toBe('app.ts');
    });

    it('should use custom neverSend patterns from config', async () => {
      const files = [
        createFileInfo('secret.txt', join(testDir, 'secret.txt')),
        createFileInfo('app.ts', join(testDir, 'app.ts')),
      ];

      await writeFile(join(testDir, 'secret.txt'), 'secret');
      await writeFile(join(testDir, 'app.ts'), 'export const x = 1;');

      const config: RepoRollerYmlConfig = {
        safety: {
          neverSend: ['secret.txt'],
        },
      };

      const result = await performSafetyChecks(files, config);

      expect(result.blockedFiles.length).toBe(1);
      expect(result.blockedFiles[0]?.relativePath).toBe('secret.txt');
      expect(result.safeFiles.length).toBe(1);
    });

    it('should support glob patterns in neverSend', async () => {
      const files = [
        createFileInfo('config/secrets.yml', join(testDir, 'config/secrets.yml')),
        createFileInfo('config/app.yml', join(testDir, 'config/app.yml')),
      ];

      await mkdir(join(testDir, 'config'), { recursive: true });
      await writeFile(join(testDir, 'config/secrets.yml'), 'key: value');
      await writeFile(join(testDir, 'config/app.yml'), 'name: app');

      const config: RepoRollerYmlConfig = {
        safety: {
          neverSend: ['**/secrets.yml'],
        },
      };

      const result = await performSafetyChecks(files, config);

      expect(result.blockedFiles.length).toBe(1);
      expect(result.blockedFiles[0]?.relativePath).toBe('config/secrets.yml');
    });

    it('should scan for secrets in safe files', async () => {
      const filePath = join(testDir, 'config.ts');
      await writeFile(filePath, `const key = 'AKIAIOSFODNN7EXAMPLE';`);

      const files = [createFileInfo('config.ts', filePath)];

      const result = await performSafetyChecks(files);

      expect(result.secretScan.secrets.length).toBeGreaterThan(0);
      expect(result.secretScan.hasHighConfidenceSecrets).toBe(true);
      expect(result.hasConcerns).toBe(true);
    });

    it('should skip secret scanning when disabled', async () => {
      const filePath = join(testDir, 'config.ts');
      await writeFile(filePath, `const key = 'ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';`);

      const files = [createFileInfo('config.ts', filePath)];

      const config: RepoRollerYmlConfig = {
        safety: {
          disableSecretScanning: true,
        },
      };

      const result = await performSafetyChecks(files, config);

      expect(result.secretScan.secrets.length).toBe(0);
      expect(result.secretScan.filesScanned).toBe(0);
    });

    it('should require warning for high-confidence secrets', async () => {
      const filePath = join(testDir, 'config.ts');
      await writeFile(filePath, `const key = 'AKIAIOSFODNN7EXAMPLE';`);

      const files = [createFileInfo('config.ts', filePath)];

      const result = await performSafetyChecks(files);

      expect(result.requiresWarning).toBe(true);
    });

    it('should skip warning when configured', async () => {
      const filePath = join(testDir, 'config.ts');
      await writeFile(filePath, `const key = 'AKIAIOSFODNN7EXAMPLE';`);

      const files = [createFileInfo('config.ts', filePath)];

      const config: RepoRollerYmlConfig = {
        safety: {
          skipSensitiveWarnings: true,
        },
      };

      const result = await performSafetyChecks(files, config);

      expect(result.requiresWarning).toBe(false);
      expect(result.hasConcerns).toBe(true); // Still has concerns
    });

    it('should return no concerns for clean files', async () => {
      const filePath = join(testDir, 'app.ts');
      await writeFile(filePath, `export const VERSION = '1.0.0';`);

      const files = [createFileInfo('app.ts', filePath)];

      const result = await performSafetyChecks(files);

      expect(result.hasConcerns).toBe(false);
      expect(result.requiresWarning).toBe(false);
      expect(result.blockedFiles.length).toBe(0);
      expect(result.secretScan.secrets.length).toBe(0);
    });

    it('should handle empty file list', async () => {
      const result = await performSafetyChecks([]);

      expect(result.safeFiles.length).toBe(0);
      expect(result.blockedFiles.length).toBe(0);
      expect(result.hasConcerns).toBe(false);
    });
  });

  describe('formatSafetyWarning', () => {
    it('should format blocked files section', () => {
      const result = {
        safeFiles: [],
        blockedFiles: [
          createFileInfo('.env', '/path/.env'),
          createFileInfo('credentials.json', '/path/credentials.json'),
        ],
        secretScan: {
          secrets: [],
          filesScanned: 0,
          hasHighConfidenceSecrets: false,
        },
        hasConcerns: true,
        requiresWarning: true,
      };

      const warning = formatSafetyWarning(result);

      expect(warning).toContain('BLOCKED FILES');
      expect(warning).toContain('.env');
      expect(warning).toContain('credentials.json');
    });

    it('should format high-confidence secrets', () => {
      const result = {
        safeFiles: [],
        blockedFiles: [],
        secretScan: {
          secrets: [
            {
              file: 'config.ts',
              line: 10,
              type: 'api_key' as const,
              description: 'GitHub Personal Access Token',
              snippet: "key = 'ghp***xxx'",
              confidence: 'high' as const,
            },
          ],
          filesScanned: 1,
          hasHighConfidenceSecrets: true,
        },
        hasConcerns: true,
        requiresWarning: true,
      };

      const warning = formatSafetyWarning(result);

      expect(warning).toContain('POTENTIAL SECRETS DETECTED');
      expect(warning).toContain('HIGH CONFIDENCE');
      expect(warning).toContain('config.ts:10');
      expect(warning).toContain('GitHub Personal Access Token');
    });

    it('should format medium-confidence secrets', () => {
      const result = {
        safeFiles: [],
        blockedFiles: [],
        secretScan: {
          secrets: [
            {
              file: 'config.ts',
              line: 5,
              type: 'password' as const,
              description: 'Hardcoded Password',
              snippet: "pwd = '***'",
              confidence: 'medium' as const,
            },
          ],
          filesScanned: 1,
          hasHighConfidenceSecrets: false,
        },
        hasConcerns: true,
        requiresWarning: false,
      };

      const warning = formatSafetyWarning(result);

      expect(warning).toContain('MEDIUM CONFIDENCE');
      expect(warning).toContain('config.ts:5');
    });

    it('should truncate long lists', () => {
      const blockedFiles = Array.from({ length: 15 }, (_, i) =>
        createFileInfo(`file${i}.env`, `/path/file${i}.env`)
      );

      const result = {
        safeFiles: [],
        blockedFiles,
        secretScan: {
          secrets: [],
          filesScanned: 0,
          hasHighConfidenceSecrets: false,
        },
        hasConcerns: true,
        requiresWarning: true,
      };

      const warning = formatSafetyWarning(result);

      expect(warning).toContain('and 5 more');
    });
  });

  describe('getSafetySummary', () => {
    it('should summarize blocked files', () => {
      const result = {
        safeFiles: [],
        blockedFiles: [createFileInfo('.env', '/path/.env')],
        secretScan: {
          secrets: [],
          filesScanned: 0,
          hasHighConfidenceSecrets: false,
        },
        hasConcerns: true,
        requiresWarning: true,
      };

      const summary = getSafetySummary(result);
      expect(summary).toBe('1 blocked file');
    });

    it('should summarize multiple blocked files', () => {
      const result = {
        safeFiles: [],
        blockedFiles: [
          createFileInfo('.env', '/path/.env'),
          createFileInfo('key.pem', '/path/key.pem'),
        ],
        secretScan: {
          secrets: [],
          filesScanned: 0,
          hasHighConfidenceSecrets: false,
        },
        hasConcerns: true,
        requiresWarning: true,
      };

      const summary = getSafetySummary(result);
      expect(summary).toBe('2 blocked files');
    });

    it('should summarize high-risk secrets', () => {
      const result = {
        safeFiles: [],
        blockedFiles: [],
        secretScan: {
          secrets: [
            {
              file: 'a.ts',
              line: 1,
              type: 'api_key' as const,
              description: '',
              snippet: '',
              confidence: 'high' as const,
            },
            {
              file: 'b.ts',
              line: 2,
              type: 'api_key' as const,
              description: '',
              snippet: '',
              confidence: 'high' as const,
            },
          ],
          filesScanned: 2,
          hasHighConfidenceSecrets: true,
        },
        hasConcerns: true,
        requiresWarning: true,
      };

      const summary = getSafetySummary(result);
      expect(summary).toBe('2 high-risk secrets');
    });

    it('should summarize combined concerns', () => {
      const result = {
        safeFiles: [],
        blockedFiles: [createFileInfo('.env', '/path/.env')],
        secretScan: {
          secrets: [
            {
              file: 'a.ts',
              line: 1,
              type: 'api_key' as const,
              description: '',
              snippet: '',
              confidence: 'high' as const,
            },
            {
              file: 'b.ts',
              line: 2,
              type: 'password' as const,
              description: '',
              snippet: '',
              confidence: 'medium' as const,
            },
          ],
          filesScanned: 2,
          hasHighConfidenceSecrets: true,
        },
        hasConcerns: true,
        requiresWarning: true,
      };

      const summary = getSafetySummary(result);
      expect(summary).toBe('1 blocked file, 1 high-risk secret, 1 medium-risk secret');
    });

    it('should return no concerns message', () => {
      const result = {
        safeFiles: [],
        blockedFiles: [],
        secretScan: {
          secrets: [],
          filesScanned: 0,
          hasHighConfidenceSecrets: false,
        },
        hasConcerns: false,
        requiresWarning: false,
      };

      const summary = getSafetySummary(result);
      expect(summary).toBe('No concerns');
    });
  });
});
