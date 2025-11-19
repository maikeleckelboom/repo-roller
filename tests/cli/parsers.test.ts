import { describe, expect, it } from 'vitest';
import { parseTokenBudget } from '../../src/cli/parsers.js';

describe('parseTokenBudget', () => {
  describe('plain numbers', () => {
    it('should parse plain number string', () => {
      expect(parseTokenBudget('50000')).toBe(50000);
    });

    it('should parse zero', () => {
      expect(parseTokenBudget('0')).toBe(0);
    });

    it('should parse large number', () => {
      expect(parseTokenBudget('10000000')).toBe(10000000);
    });

    it('should parse decimal number', () => {
      expect(parseTokenBudget('1234.56')).toBe(1234.56);
    });
  });

  describe('K suffix (thousands)', () => {
    it('should parse lowercase k suffix', () => {
      expect(parseTokenBudget('50k')).toBe(50000);
    });

    it('should parse uppercase K suffix', () => {
      expect(parseTokenBudget('50K')).toBe(50000);
    });

    it('should parse decimal with k suffix', () => {
      expect(parseTokenBudget('1.5k')).toBe(1500);
    });

    it('should parse 0.5k', () => {
      expect(parseTokenBudget('0.5k')).toBe(500);
    });

    it('should parse 100k', () => {
      expect(parseTokenBudget('100k')).toBe(100000);
    });

    it('should parse 200K', () => {
      expect(parseTokenBudget('200K')).toBe(200000);
    });
  });

  describe('M suffix (millions)', () => {
    it('should parse lowercase m suffix', () => {
      expect(parseTokenBudget('1m')).toBe(1000000);
    });

    it('should parse uppercase M suffix', () => {
      expect(parseTokenBudget('1M')).toBe(1000000);
    });

    it('should parse decimal with m suffix', () => {
      expect(parseTokenBudget('1.5m')).toBe(1500000);
    });

    it('should parse 0.5m', () => {
      expect(parseTokenBudget('0.5m')).toBe(500000);
    });

    it('should parse 2m', () => {
      expect(parseTokenBudget('2m')).toBe(2000000);
    });

    it('should parse 10M', () => {
      expect(parseTokenBudget('10M')).toBe(10000000);
    });
  });

  describe('whitespace handling', () => {
    it('should trim leading whitespace', () => {
      expect(parseTokenBudget('  50k')).toBe(50000);
    });

    it('should trim trailing whitespace', () => {
      expect(parseTokenBudget('50k  ')).toBe(50000);
    });

    it('should trim both leading and trailing whitespace', () => {
      expect(parseTokenBudget('  50k  ')).toBe(50000);
    });

    it('should handle tab characters', () => {
      expect(parseTokenBudget('\t50k\t')).toBe(50000);
    });

    it('should handle newline characters', () => {
      expect(parseTokenBudget('\n50k\n')).toBe(50000);
    });
  });

  describe('case insensitivity', () => {
    it('should handle uppercase K', () => {
      expect(parseTokenBudget('50K')).toBe(50000);
    });

    it('should handle uppercase M', () => {
      expect(parseTokenBudget('1M')).toBe(1000000);
    });

    it('should handle mixed case input', () => {
      expect(parseTokenBudget('50K')).toBe(50000);
      expect(parseTokenBudget('1M')).toBe(1000000);
    });
  });

  describe('error handling', () => {
    it('should throw error for invalid input', () => {
      expect(() => parseTokenBudget('abc')).toThrow('Invalid token budget: abc');
    });

    it('should throw error for empty string', () => {
      expect(() => parseTokenBudget('')).toThrow('Invalid token budget: ');
    });

    it('should parse number and ignore invalid suffix (parseFloat behavior)', () => {
      // parseFloat('50x') returns 50, stopping at invalid character
      // This is a limitation of the current implementation
      expect(parseTokenBudget('50x')).toBe(50);
    });

    it('should parse number and ignore extra characters (parseFloat behavior)', () => {
      // '50km' ends with 'm', so it matches the 'm' suffix handler
      // parseFloat('50k') = 50 (parseFloat stops at 'k')
      // 50 * 1,000,000 = 50,000,000
      expect(parseTokenBudget('50km')).toBe(50000000);
    });

    it('should throw error for non-numeric characters', () => {
      expect(() => parseTokenBudget('abc123')).toThrow('Invalid token budget: abc123');
    });

    it('should include helpful error message', () => {
      expect(() => parseTokenBudget('invalid')).toThrow('Use numbers like 50000, 50k, or 1m');
    });
  });

  describe('edge cases', () => {
    it('should handle very small decimal', () => {
      expect(parseTokenBudget('0.1k')).toBe(100);
    });

    it('should handle very small decimal with m', () => {
      expect(parseTokenBudget('0.001m')).toBe(1000);
    });

    it('should handle negative numbers', () => {
      // Note: parseFloat handles negatives, but this may not be a valid use case
      // Negative token budgets don't make sense, but parseFloat allows it
      const result = parseTokenBudget('-100');
      expect(result).toBe(-100);
    });

    it('should handle negative with suffix', () => {
      // Note: parseFloat handles negatives with suffixes
      const result = parseTokenBudget('-1k');
      expect(result).toBe(-1000);
    });

    it('should handle scientific notation without suffix', () => {
      expect(parseTokenBudget('1e5')).toBe(100000);
    });

    it('should handle decimal without leading zero', () => {
      expect(parseTokenBudget('.5k')).toBe(500);
    });
  });

  describe('realistic use cases', () => {
    it('should parse typical Claude context (200K)', () => {
      expect(parseTokenBudget('200k')).toBe(200000);
    });

    it('should parse GPT-4 context (128K)', () => {
      expect(parseTokenBudget('128k')).toBe(128000);
    });

    it('should parse Gemini context (1M)', () => {
      expect(parseTokenBudget('1m')).toBe(1000000);
    });

    it('should parse small budget (10K)', () => {
      expect(parseTokenBudget('10k')).toBe(10000);
    });

    it('should parse precise token count', () => {
      expect(parseTokenBudget('123456')).toBe(123456);
    });
  });
});
