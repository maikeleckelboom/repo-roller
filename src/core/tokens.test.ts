import { describe, it, expect } from 'vitest';
import {
  estimateTokens,
  estimateTokensDetailed,
  calculateCost,
  getAllCostEstimates,
  formatCostEstimate,
  analyzeTokenUsage,
  LLM_PROVIDERS,
  formatNumber,
} from './tokens.js';

describe('Token Estimation', () => {
  describe('estimateTokens', () => {
    it('should estimate tokens for simple text', () => {
      const text = 'Hello world';
      const tokens = estimateTokens(text);
      // 11 chars / 4 ≈ 2.75, rounded up = 3
      expect(tokens).toBeGreaterThan(0);
      expect(tokens).toBeLessThan(10);
    });

    it('should handle code with special characters', () => {
      const code = 'function test() { return true; }';
      const tokens = estimateTokens(code);
      // Code has more symbols, so token count should be higher
      expect(tokens).toBeGreaterThan(5);
    });

    it('should handle empty string', () => {
      const tokens = estimateTokens('');
      expect(tokens).toBe(0);
    });

    it('should scale with content length', () => {
      const shortText = 'Hello';
      const longText = 'Hello'.repeat(1000);
      const shortTokens = estimateTokens(shortText);
      const longTokens = estimateTokens(longText);
      expect(longTokens).toBeGreaterThan(shortTokens * 100);
    });

    it('should account for symbols in code', () => {
      const noSymbols = 'hello world test';
      const withSymbols = 'hello() { world; } test[]';
      const noSymbolTokens = estimateTokens(noSymbols);
      const withSymbolTokens = estimateTokens(withSymbols);
      // Same word count but symbols add tokens
      expect(withSymbolTokens).toBeGreaterThan(noSymbolTokens);
    });
  });

  describe('estimateTokensDetailed', () => {
    it('should provide detailed estimation', () => {
      const text = 'Hello world';
      const result = estimateTokensDetailed(text);
      expect(result.tokens).toBeGreaterThan(0);
      expect(result.method).toBe('word-boundary');
    });

    it('should handle long words', () => {
      const text = 'internationalization';
      const result = estimateTokensDetailed(text);
      // 20 chars / 4 = 5 tokens
      expect(result.tokens).toBeGreaterThan(2);
    });

    it('should handle punctuation', () => {
      const text = 'hello, world! how? are; you:';
      const result = estimateTokensDetailed(text);
      expect(result.tokens).toBeGreaterThan(5);
    });
  });

  describe('calculateCost', () => {
    it('should calculate cost for valid provider', () => {
      const tokens = 1000;
      const estimate = calculateCost(tokens, 'claude-sonnet');
      expect(estimate).toBeDefined();
      expect(estimate!.provider).toBe('claude-sonnet');
      expect(estimate!.tokens).toBe(1000);
      // 1000 tokens * $3.00/1M = $0.003
      expect(estimate!.inputCost).toBeCloseTo(0.003, 6);
    });

    it('should return undefined for invalid provider', () => {
      const estimate = calculateCost(1000, 'invalid-provider');
      expect(estimate).toBeUndefined();
    });

    it('should detect context window overflow', () => {
      // GPT-4 has 8192 context window
      const tooManyTokens = 10000;
      const estimate = calculateCost(tooManyTokens, 'gpt-4');
      expect(estimate).toBeDefined();
      expect(estimate!.withinContextWindow).toBe(false);
    });

    it('should detect within context window', () => {
      const tokens = 5000;
      const estimate = calculateCost(tokens, 'claude-sonnet');
      expect(estimate).toBeDefined();
      expect(estimate!.withinContextWindow).toBe(true);
    });

    it('should calculate utilization percentage', () => {
      const tokens = 100000;
      const estimate = calculateCost(tokens, 'claude-sonnet');
      expect(estimate).toBeDefined();
      // 100000 / 200000 = 50%
      expect(estimate!.utilizationPercent).toBe(50);
    });
  });

  describe('getAllCostEstimates', () => {
    it('should return estimates for all providers', () => {
      const tokens = 10000;
      const estimates = getAllCostEstimates(tokens);
      expect(estimates.length).toBe(Object.keys(LLM_PROVIDERS).length);
    });

    it('should have consistent token count across estimates', () => {
      const tokens = 10000;
      const estimates = getAllCostEstimates(tokens);
      for (const estimate of estimates) {
        expect(estimate.tokens).toBe(tokens);
      }
    });
  });

  describe('formatCostEstimate', () => {
    it('should format estimate within context window', () => {
      const estimate = calculateCost(10000, 'claude-sonnet')!;
      const formatted = formatCostEstimate(estimate);
      expect(formatted).toContain('✓');
      expect(formatted).toContain('Claude 3.5 Sonnet');
      expect(formatted).toContain('$');
    });

    it('should format estimate exceeding context window', () => {
      const estimate = calculateCost(10000, 'gpt-4')!;
      const formatted = formatCostEstimate(estimate);
      expect(formatted).toContain('✗');
      expect(formatted).toContain('GPT-4');
    });

    it('should include utilization percentage', () => {
      const estimate = calculateCost(100000, 'claude-sonnet')!;
      const formatted = formatCostEstimate(estimate);
      expect(formatted).toContain('50.0%');
    });
  });

  describe('analyzeTokenUsage', () => {
    it('should analyze small text without warnings', () => {
      const text = 'Hello world';
      const analysis = analyzeTokenUsage(text);
      expect(analysis.estimatedTokens).toBeGreaterThan(0);
      expect(analysis.estimates.length).toBe(Object.keys(LLM_PROVIDERS).length);
    });

    it('should warn for large content', () => {
      // Create content that would exceed GPT-4's 8K context
      const largeText = 'word '.repeat(50000); // ~50K words ≈ 60K+ tokens
      const analysis = analyzeTokenUsage(largeText);
      expect(analysis.warnings.length).toBeGreaterThan(0);
      expect(analysis.warnings.some((w: string) => w.includes('exceeds'))).toBe(true);
    });

    it('should provide recommendations for large content', () => {
      const largeText = 'word '.repeat(30000);
      const analysis = analyzeTokenUsage(largeText);
      expect(analysis.recommendations.length).toBeGreaterThan(0);
    });

    it('should identify most cost-effective provider', () => {
      const text = 'Some moderate content';
      const analysis = analyzeTokenUsage(text);
      expect(
        analysis.recommendations.some((r: string) => r.includes('cost-effective'))
      ).toBe(true);
    });
  });

  describe('formatNumber', () => {
    it('should format numbers with commas', () => {
      expect(formatNumber(1000)).toBe('1,000');
      expect(formatNumber(1000000)).toBe('1,000,000');
      expect(formatNumber(200000)).toBe('200,000');
    });
  });

  describe('LLM_PROVIDERS', () => {
    it('should have valid context windows', () => {
      for (const provider of Object.values(LLM_PROVIDERS) as Array<{ contextWindow: number; inputCostPerMillion: number; outputCostPerMillion: number }>) {
        expect(provider.contextWindow).toBeGreaterThan(0);
      }
    });

    it('should have valid pricing', () => {
      for (const provider of Object.values(LLM_PROVIDERS) as Array<{ contextWindow: number; inputCostPerMillion: number; outputCostPerMillion: number }>) {
        expect(provider.inputCostPerMillion).toBeGreaterThan(0);
        expect(provider.outputCostPerMillion).toBeGreaterThan(0);
      }
    });

    it('should include major providers', () => {
      expect(LLM_PROVIDERS['claude-sonnet']).toBeDefined();
      expect(LLM_PROVIDERS['gpt-4o']).toBeDefined();
      expect(LLM_PROVIDERS['gemini']).toBeDefined();
    });
  });
});
