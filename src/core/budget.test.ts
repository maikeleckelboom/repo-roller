import { describe, it, expect } from 'vitest';
import {
  eurToUsd,
  usdToEur,
  parseBudgetString,
  formatBudget,
  formatBudgetUsage,
  estimateFileTokens,
  selectFilesWithinBudget,
} from './budget.js';
import type { FileInfo } from './types.js';

describe('Budget Module', () => {
  describe('EUR/USD conversion', () => {
    it('should convert EUR to USD', () => {
      const eur = 0.03;
      const usd = eurToUsd(eur);
      // EUR_TO_USD_RATE = 1.08
      expect(usd).toBeCloseTo(0.0324, 6);
    });

    it('should convert USD to EUR', () => {
      const usd = 0.0324;
      const eur = usdToEur(usd);
      expect(eur).toBeCloseTo(0.03, 6);
    });

    it('should be reversible', () => {
      const originalEur = 0.50;
      const usd = eurToUsd(originalEur);
      const backToEur = usdToEur(usd);
      expect(backToEur).toBeCloseTo(originalEur, 10);
    });
  });

  describe('parseBudgetString', () => {
    it('should parse EUR with symbol', () => {
      const result = parseBudgetString('€0.03');
      expect(result).toEqual({ type: 'eur', limit: 0.03 });
    });

    it('should parse EUR with suffix', () => {
      const result = parseBudgetString('0.03eur');
      expect(result).toEqual({ type: 'eur', limit: 0.03 });
    });

    it('should parse USD with symbol', () => {
      const result = parseBudgetString('$0.50');
      expect(result).toEqual({ type: 'usd', limit: 0.50 });
    });

    it('should parse USD with suffix', () => {
      const result = parseBudgetString('0.50usd');
      expect(result).toEqual({ type: 'usd', limit: 0.50 });
    });

    it('should parse tokens with k suffix', () => {
      const result = parseBudgetString('50k');
      expect(result).toEqual({ type: 'tokens', limit: 50000 });
    });

    it('should parse tokens with m suffix', () => {
      const result = parseBudgetString('1m');
      expect(result).toEqual({ type: 'tokens', limit: 1_000_000 });
    });

    it('should parse plain number as tokens', () => {
      const result = parseBudgetString('100000');
      expect(result).toEqual({ type: 'tokens', limit: 100000 });
    });

    it('should handle whitespace', () => {
      const result = parseBudgetString('  €0.03  ');
      expect(result).toEqual({ type: 'eur', limit: 0.03 });
    });

    it('should return null for invalid input', () => {
      const result = parseBudgetString('invalid');
      expect(result).toBeNull();
    });
  });

  describe('formatBudget', () => {
    it('should format EUR budget', () => {
      const result = formatBudget({ type: 'eur', limit: 0.03 });
      expect(result).toBe('€0.0300');
    });

    it('should format USD budget', () => {
      const result = formatBudget({ type: 'usd', limit: 0.50 });
      expect(result).toBe('$0.5000');
    });

    it('should format token budget in K', () => {
      const result = formatBudget({ type: 'tokens', limit: 50000 });
      expect(result).toBe('50.0K tokens');
    });

    it('should format token budget in M', () => {
      const result = formatBudget({ type: 'tokens', limit: 1_000_000 });
      expect(result).toBe('1.0M tokens');
    });

    it('should format small token budget', () => {
      const result = formatBudget({ type: 'tokens', limit: 500 });
      expect(result).toBe('500 tokens');
    });
  });

  describe('estimateFileTokens', () => {
    it('should estimate tokens from file size', () => {
      const file: FileInfo = {
        absolutePath: '/test/file.ts',
        relativePath: 'file.ts',
        extension: 'ts',
        sizeBytes: 4000, // 4000 bytes
        lastModified: new Date(),
      };
      const tokens = estimateFileTokens(file);
      // Base: 4000 / 4 = 1000 tokens
      expect(tokens).toBe(1000);
    });

    it('should adjust for JSON files', () => {
      const file: FileInfo = {
        absolutePath: '/test/file.json',
        relativePath: 'file.json',
        extension: 'json',
        sizeBytes: 4000,
        lastModified: new Date(),
      };
      const tokens = estimateFileTokens(file);
      // 4000 / 4 * 1.2 = 1200
      expect(tokens).toBe(1200);
    });

    it('should adjust for markdown files', () => {
      const file: FileInfo = {
        absolutePath: '/test/file.md',
        relativePath: 'file.md',
        extension: 'md',
        sizeBytes: 4000,
        lastModified: new Date(),
      };
      const tokens = estimateFileTokens(file);
      // 4000 / 4 * 0.9 = 900
      expect(tokens).toBe(900);
    });
  });

  describe('selectFilesWithinBudget', () => {
    const createFile = (name: string, sizeBytes: number): FileInfo => ({
      absolutePath: `/test/${name}`,
      relativePath: name,
      extension: name.split('.').pop() || '',
      sizeBytes,
      lastModified: new Date(),
    });

    it('should select files within token budget', async () => {
      const files = [
        createFile('small.ts', 1000), // ~250 tokens * 1.08 overhead = 270
        createFile('medium.ts', 2000), // ~500 tokens * 1.08 = 540
        createFile('large.ts', 4000), // ~1000 tokens * 1.08 = 1080
      ];

      const result = await selectFilesWithinBudget(
        files,
        { type: 'tokens', limit: 1000 },
      );

      // With overhead: large=1080 (>1000), medium=540, small=270
      // Should select large (1080 > 1000, excluded), then medium+small (810)
      expect(result.selectedFiles.length).toBeLessThanOrEqual(3);
      expect(result.totalTokens).toBeLessThanOrEqual(1000);
    });

    it('should apply markdown overhead factor to token estimates', async () => {
      const files = [
        createFile('file.ts', 4000), // Base: 1000 tokens, with 1.08 overhead: 1080
      ];

      const result = await selectFilesWithinBudget(
        files,
        { type: 'tokens', limit: 2000 },
      );

      // With MARKDOWN_OVERHEAD_FACTOR = 1.08
      // Expected: 1000 * 1.08 = 1080 tokens
      expect(result.totalTokens).toBe(1080);
      expect(result.selectedFiles.length).toBe(1);
    });

    it('should select files within EUR budget', async () => {
      const files = [
        createFile('small.ts', 4000), // 1000 tokens * 1.08 = 1080 tokens
      ];

      const result = await selectFilesWithinBudget(
        files,
        { type: 'eur', limit: 0.03, provider: 'claude-haiku' },
      );

      // €0.03 * 1.08 = $0.0324
      // Claude Haiku: $0.80/1M tokens
      // Token budget: (0.0324 / 0.80) * 1M = 40,500 tokens
      // File needs 1080 tokens (with overhead), so should be selected
      expect(result.selectedFiles.length).toBe(1);
      expect(result.budgetType).toBe('eur');
    });

    it('should exclude files that exceed EUR budget', async () => {
      const files = [
        createFile('huge.ts', 200000), // ~50,000 tokens * 1.08 = 54,000 tokens
      ];

      const result = await selectFilesWithinBudget(
        files,
        { type: 'eur', limit: 0.03, provider: 'claude-haiku' },
      );

      // €0.03 budget allows ~40,500 tokens
      // File needs 54,000 tokens (with overhead), exceeds budget
      expect(result.selectedFiles.length).toBe(0);
      expect(result.excludedFiles.length).toBe(1);
    });

    it('should calculate correct budget utilization for EUR', async () => {
      const files = [
        createFile('file.ts', 120000), // 30,000 tokens * 1.08 = 32,400 tokens
      ];

      const result = await selectFilesWithinBudget(
        files,
        { type: 'eur', limit: 0.03, provider: 'claude-haiku' },
      );

      // €0.03 * 1.08 = $0.0324
      // 32,400 tokens * $0.80/1M = $0.02592
      // Convert back: $0.02592 / 1.08 = €0.024
      // Utilization: 0.024 / 0.03 = 80%
      expect(result.budgetUsed).toBeCloseTo(0.024, 3);
      expect(result.utilizationPercent).toBeCloseTo(80, 1);
    });

    it('should throw error for cost budget without provider', async () => {
      const files = [createFile('file.ts', 1000)];

      await expect(
        selectFilesWithinBudget(files, { type: 'eur', limit: 0.03 })
      ).rejects.toThrow('Provider must be specified for cost-based budgets');
    });
  });

  describe('formatBudgetUsage', () => {
    it('should format EUR budget usage', () => {
      const result = formatBudgetUsage({
        selectedFiles: [],
        excludedFiles: [],
        totalTokens: 0,
        totalCost: 0,
        budgetType: 'eur',
        budgetLimit: 0.03,
        budgetUsed: 0.024,
        budgetRemaining: 0.006,
        utilizationPercent: 80,
      });
      expect(result).toContain('€0.0240');
      expect(result).toContain('€0.0300');
      expect(result).toContain('80.0%');
    });

    it('should format USD budget usage', () => {
      const result = formatBudgetUsage({
        selectedFiles: [],
        excludedFiles: [],
        totalTokens: 0,
        totalCost: 0,
        budgetType: 'usd',
        budgetLimit: 0.50,
        budgetUsed: 0.35,
        budgetRemaining: 0.15,
        utilizationPercent: 70,
      });
      expect(result).toContain('$0.3500');
      expect(result).toContain('$0.5000');
      expect(result).toContain('70.0%');
    });

    it('should format token budget usage', () => {
      const result = formatBudgetUsage({
        selectedFiles: [],
        excludedFiles: [],
        totalTokens: 0,
        totalCost: 0,
        budgetType: 'tokens',
        budgetLimit: 50000,
        budgetUsed: 40000,
        budgetRemaining: 10000,
        utilizationPercent: 80,
      });
      expect(result).toContain('40.0K');
      expect(result).toContain('50.0K');
      expect(result).toContain('80.0%');
    });
  });
});
