import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  scanForSecrets,
  isSensitiveFile,
  formatSecretType,
  summarizeSecrets,
  type DetectedSecret,
} from './secrets.js';
import type { FileInfo } from './types.js';

describe('secrets', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `secrets-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('isSensitiveFile', () => {
    it('should detect .env files', () => {
      expect(isSensitiveFile('.env')).toBe(true);
      expect(isSensitiveFile('.env.local')).toBe(true);
      expect(isSensitiveFile('.env.production')).toBe(true);
    });

    it('should detect private key files', () => {
      expect(isSensitiveFile('server.pem')).toBe(true);
      expect(isSensitiveFile('private.key')).toBe(true);
      expect(isSensitiveFile('cert.p12')).toBe(true);
      expect(isSensitiveFile('keystore.pfx')).toBe(true);
    });

    it('should detect SSH key files', () => {
      expect(isSensitiveFile('id_rsa')).toBe(true);
      expect(isSensitiveFile('id_dsa')).toBe(true);
      expect(isSensitiveFile('id_ecdsa')).toBe(true);
      expect(isSensitiveFile('id_ed25519')).toBe(true);
    });

    it('should detect credentials files', () => {
      expect(isSensitiveFile('credentials.json')).toBe(true);
      expect(isSensitiveFile('service-account.json')).toBe(true);
      expect(isSensitiveFile('service_account_key.json')).toBe(true);
    });

    it('should not flag regular files', () => {
      expect(isSensitiveFile('app.ts')).toBe(false);
      expect(isSensitiveFile('package.json')).toBe(false);
      expect(isSensitiveFile('README.md')).toBe(false);
      expect(isSensitiveFile('config.yml')).toBe(false);
    });
  });

  describe('scanForSecrets', () => {
    const createFileInfo = (relativePath: string, absolutePath: string): FileInfo => ({
      relativePath,
      absolutePath,
      sizeBytes: 100,
      extension: relativePath.split('.').pop() ?? '',
      isBinary: false,
      isDefaultIncluded: true,
      lastModified: new Date(),
    });

    it('should detect GitHub Personal Access Tokens', async () => {
      const filePath = join(testDir, 'config.ts');
      await writeFile(filePath, `const token = 'ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';`);

      const file = createFileInfo('config.ts', filePath);
      const result = await scanForSecrets([file]);

      expect(result.secrets.length).toBeGreaterThan(0);
      const ghpSecret = result.secrets.find(s => s.description === 'GitHub Personal Access Token');
      expect(ghpSecret).toBeDefined();
      expect(ghpSecret?.confidence).toBe('high');
    });

    it('should detect Stripe API keys', async () => {
      const filePath = join(testDir, 'payment.ts');
      // Use clearly fake key pattern that matches Stripe format (pk_test is less sensitive)
      await writeFile(filePath, `const key = 'pk_test_51XXXXXXXXXXXXXXXXXXXXXX';`);

      const file = createFileInfo('payment.ts', filePath);
      const result = await scanForSecrets([file]);

      expect(result.secrets.length).toBeGreaterThan(0);
      const stripeSecret = result.secrets.find(s => s.description === 'Stripe API Key');
      expect(stripeSecret).toBeDefined();
      expect(stripeSecret?.confidence).toBe('high');
    });

    it('should detect AWS Access Key IDs', async () => {
      const filePath = join(testDir, 'aws.ts');
      await writeFile(filePath, `const accessKeyId = 'AKIAIOSFODNN7EXAMPLE';`);

      const file = createFileInfo('aws.ts', filePath);
      const result = await scanForSecrets([file]);

      expect(result.secrets.length).toBeGreaterThan(0);
      const awsSecret = result.secrets.find(s => s.description === 'AWS Access Key ID');
      expect(awsSecret).toBeDefined();
      expect(awsSecret?.confidence).toBe('high');
    });

    it('should detect RSA private keys', async () => {
      const filePath = join(testDir, 'key.ts');
      await writeFile(filePath, `const key = \`-----BEGIN RSA PRIVATE KEY-----
MIIEpQIBAAKCAQEA...
-----END RSA PRIVATE KEY-----\`;`);

      const file = createFileInfo('key.ts', filePath);
      const result = await scanForSecrets([file]);

      expect(result.secrets.length).toBeGreaterThan(0);
      const keySecret = result.secrets.find(s => s.description === 'RSA Private Key');
      expect(keySecret).toBeDefined();
      expect(keySecret?.confidence).toBe('high');
    });

    it('should detect database connection strings', async () => {
      const filePath = join(testDir, 'db.ts');
      await writeFile(filePath, `const url = 'postgres://user:password@localhost/db';`);

      const file = createFileInfo('db.ts', filePath);
      const result = await scanForSecrets([file]);

      expect(result.secrets.length).toBeGreaterThan(0);
      const dbSecret = result.secrets.find(s => s.description === 'Database Connection String');
      expect(dbSecret).toBeDefined();
      expect(dbSecret?.confidence).toBe('high');
    });

    it('should detect JWTs', async () => {
      const filePath = join(testDir, 'auth.ts');
      await writeFile(filePath, `const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';`);

      const file = createFileInfo('auth.ts', filePath);
      const result = await scanForSecrets([file]);

      expect(result.secrets.length).toBeGreaterThan(0);
      const jwtSecret = result.secrets.find(s => s.description === 'JSON Web Token');
      expect(jwtSecret).toBeDefined();
      expect(jwtSecret?.confidence).toBe('high');
    });

    it('should detect hardcoded passwords', async () => {
      const filePath = join(testDir, 'config.ts');
      await writeFile(filePath, `const password = 'MySecretPassword123!';`);

      const file = createFileInfo('config.ts', filePath);
      const result = await scanForSecrets([file]);

      expect(result.secrets.length).toBeGreaterThan(0);
      const pwdSecret = result.secrets.find(s => s.description === 'Hardcoded Password');
      expect(pwdSecret).toBeDefined();
      expect(pwdSecret?.confidence).toBe('medium');
    });

    it('should flag sensitive file types', async () => {
      const filePath = join(testDir, '.env');
      await writeFile(filePath, 'DB_URL=test');

      const file = createFileInfo('.env', filePath);
      const result = await scanForSecrets([file]);

      expect(result.secrets.length).toBeGreaterThan(0);
      const fileSecret = result.secrets.find(s => s.description === 'Sensitive file type');
      expect(fileSecret).toBeDefined();
      expect(fileSecret?.confidence).toBe('high');
    });

    it('should skip lines with placeholder values', async () => {
      const filePath = join(testDir, 'example.ts');
      await writeFile(filePath, `// example placeholder value only
const fake_key = 'xxxxxxxxxxxxxxxx';
const test_token = 'placeholder_value';`);

      const file = createFileInfo('example.ts', filePath);
      const result = await scanForSecrets([file]);

      // Placeholder values should be filtered out by isLikelyFalsePositive
      expect(result.secrets.length).toBe(0);
    });

    it('should redact secrets in snippets', async () => {
      const filePath = join(testDir, 'config.ts');
      await writeFile(filePath, `const token = 'ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';`);

      const file = createFileInfo('config.ts', filePath);
      const result = await scanForSecrets([file]);

      const secret = result.secrets[0];
      expect(secret?.snippet).toContain('ghp');
      expect(secret?.snippet).toContain('***');
      expect(secret?.snippet).not.toContain('ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');
    });

    it('should return empty results for clean files', async () => {
      const filePath = join(testDir, 'clean.ts');
      await writeFile(filePath, `export const APP_NAME = 'MyApp';
export const VERSION = '1.0.0';
export function hello() { return 'world'; }`);

      const file = createFileInfo('clean.ts', filePath);
      const result = await scanForSecrets([file]);

      expect(result.secrets.length).toBe(0);
      expect(result.hasHighConfidenceSecrets).toBe(false);
    });

    it('should skip binary files', async () => {
      const filePath = join(testDir, 'image.png');
      await writeFile(filePath, Buffer.from([0x89, 0x50, 0x4e, 0x47]));

      const file: FileInfo = {
        relativePath: 'image.png',
        absolutePath: filePath,
        sizeBytes: 4,
        extension: 'png',
        isBinary: true,
        isDefaultIncluded: true,
        lastModified: new Date(),
      };

      const result = await scanForSecrets([file]);
      expect(result.secrets.length).toBe(0);
    });

    it('should report hasHighConfidenceSecrets correctly', async () => {
      const filePath = join(testDir, 'secrets.ts');
      await writeFile(filePath, `const key = 'AKIAIOSFODNN7EXAMPLE';`);

      const file = createFileInfo('secrets.ts', filePath);
      const result = await scanForSecrets([file]);

      expect(result.hasHighConfidenceSecrets).toBe(true);
    });

    it('should scan multiple files', async () => {
      const file1Path = join(testDir, 'file1.ts');
      const file2Path = join(testDir, 'file2.ts');
      await writeFile(file1Path, `const key = 'ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';`);
      await writeFile(file2Path, `const stripe = 'pk_test_51XXXXXXXXXXXXXXXXXXXXXX';`);

      const files = [
        createFileInfo('file1.ts', file1Path),
        createFileInfo('file2.ts', file2Path),
      ];

      const result = await scanForSecrets(files);

      expect(result.filesScanned).toBe(2);
      expect(result.secrets.length).toBeGreaterThanOrEqual(2);
      expect(result.secrets.some(s => s.file === 'file1.ts')).toBe(true);
      expect(result.secrets.some(s => s.file === 'file2.ts')).toBe(true);
    });
  });

  describe('summarizeSecrets', () => {
    it('should group secrets by type', () => {
      const result = {
        secrets: [
          { type: 'api_key', file: 'a.ts', line: 1, description: '', snippet: '', confidence: 'high' },
          { type: 'api_key', file: 'b.ts', line: 2, description: '', snippet: '', confidence: 'high' },
          { type: 'password', file: 'c.ts', line: 3, description: '', snippet: '', confidence: 'medium' },
        ] as DetectedSecret[],
        filesScanned: 3,
        hasHighConfidenceSecrets: true,
      };

      const summary = summarizeSecrets(result);

      expect(summary.get('api_key')).toBe(2);
      expect(summary.get('password')).toBe(1);
      expect(summary.size).toBe(2);
    });

    it('should return empty map for no secrets', () => {
      const result = {
        secrets: [],
        filesScanned: 1,
        hasHighConfidenceSecrets: false,
      };

      const summary = summarizeSecrets(result);
      expect(summary.size).toBe(0);
    });
  });

  describe('formatSecretType', () => {
    it('should format secret types correctly', () => {
      expect(formatSecretType('api_key')).toBe('API Key');
      expect(formatSecretType('private_key')).toBe('Private Key');
      expect(formatSecretType('password')).toBe('Password');
      expect(formatSecretType('token')).toBe('Token');
      expect(formatSecretType('aws_credentials')).toBe('AWS Credentials');
      expect(formatSecretType('database_url')).toBe('Database URL');
      expect(formatSecretType('jwt')).toBe('JWT Token');
      expect(formatSecretType('oauth')).toBe('OAuth Token');
      expect(formatSecretType('ssh_key')).toBe('SSH Key');
      expect(formatSecretType('certificate')).toBe('Certificate');
      expect(formatSecretType('generic_secret')).toBe('Secret');
    });
  });
});
