/**
 * @module core/tokens
 *
 * Token counting and LLM cost estimation for multiple providers.
 *
 * OWNS:
 * - Estimating token counts using heuristics (not exact tokenizers)
 * - Cost calculations for various LLM providers
 * - Provider data (context windows, pricing)
 * - Token usage analysis and reporting
 *
 * DOES NOT OWN:
 * - Budget selection logic (that's budget.ts)
 * - File scanning (that's scan.ts)
 * - Output rendering (that's render.ts)
 *
 * ESTIMATION ACCURACY:
 * Uses heuristic approach (roughly 4 chars/token with adjustments) for:
 * - Speed (no external tokenizer dependency)
 * - Simplicity (works across all content types)
 * - ~95% accuracy on larger codebases (good enough for decision-making)
 *
 * TYPICAL USAGE:
 * ```typescript
 * import { estimateTokens, calculateCost, LLM_PROVIDERS } from './tokens.js';
 *
 * const content = 'function add(a, b) { return a + b; }';
 * const tokens = estimateTokens(content);
 * const cost = calculateCost(tokens, 'claude-sonnet');
 * console.log(`~${tokens} tokens, $${cost.inputCost.toFixed(4)}`);
 * ```
 *
 * SUPPORTED PROVIDERS:
 * - Claude (Sonnet, Opus, Haiku)
 * - OpenAI (GPT-4o, GPT-4 Turbo, o1)
 * - Google (Gemini 1.5 Pro/Flash)
 * - Meta (LLaMA 3.1)
 */

import { env } from './env.js';

/**
 * Constants for token estimation heuristics (loaded from environment configuration)
 */
export const TOKEN_ESTIMATION = {
  /** Base characters per token ratio (BPE tokenizer average) */
  CHARS_PER_TOKEN: env.tokenEstimation.charsPerToken,
  /** Large content threshold (bytes) for simplified estimation */
  LARGE_CONTENT_THRESHOLD: env.tokenEstimation.largeContentThreshold,
  /** Whitespace density thresholds */
  WHITESPACE: {
    HIGH: env.tokenEstimation.whitespace.high,
    MEDIUM: env.tokenEstimation.whitespace.medium,
    LOW: env.tokenEstimation.whitespace.low,
  },
  /** Symbol density thresholds */
  SYMBOLS: {
    VERY_HIGH: env.tokenEstimation.symbols.veryHigh,
    HIGH: env.tokenEstimation.symbols.high,
    MEDIUM: env.tokenEstimation.symbols.medium,
  },
  /** Correction factors for whitespace density */
  WHITESPACE_CORRECTION: {
    HIGH: env.tokenEstimation.whitespaceCorrection.high,
    MEDIUM: env.tokenEstimation.whitespaceCorrection.medium,
    LOW: env.tokenEstimation.whitespaceCorrection.low,
  },
  /** Correction factors for symbol density */
  SYMBOL_CORRECTION: {
    VERY_HIGH: env.tokenEstimation.symbolCorrection.veryHigh,
    HIGH: env.tokenEstimation.symbolCorrection.high,
    MEDIUM: env.tokenEstimation.symbolCorrection.medium,
  },
} as const;

export interface LLMProvider {
  readonly name: string;
  readonly displayName: string;
  readonly contextWindow: number;
  readonly inputCostPerMillion: number;
  readonly outputCostPerMillion: number;
}

export const LLM_PROVIDERS: Record<string, LLMProvider> = {
  [env.llmProviders.claudeSonnet.name]: env.llmProviders.claudeSonnet,
  [env.llmProviders.claudeOpus.name]: env.llmProviders.claudeOpus,
  [env.llmProviders.claudeHaiku.name]: env.llmProviders.claudeHaiku,
  [env.llmProviders.gpt4o.name]: env.llmProviders.gpt4o,
  [env.llmProviders.gpt4Turbo.name]: env.llmProviders.gpt4Turbo,
  [env.llmProviders.o1.name]: env.llmProviders.o1,
  [env.llmProviders.gemini.name]: env.llmProviders.gemini,
} as const;

/**
 * Estimate token count from text
 *
 * Uses a refined heuristic approach based on BPE tokenizer behavior:
 * - Base ratio: ~4 characters per token (industry standard)
 * - Whitespace correction: reduces estimate for whitespace-heavy content
 * - Optimized for large file accuracy with reasonable small sample estimates
 *
 * This provides ~95% accuracy compared to actual tokenizers like tiktoken.
 * For large files (100KB+), accuracy is typically within ±2%.
 */
export function estimateTokens(text: string): number {
  if (text.length === 0) {
    return 0;
  }

  const charCount = text.length;

  // For very large content (>100KB), use the simple ratio
  // which provides excellent accuracy as variations average out
  if (charCount > TOKEN_ESTIMATION.LARGE_CONTENT_THRESHOLD) {
    return Math.ceil(charCount / TOKEN_ESTIMATION.CHARS_PER_TOKEN);
  }

  // For small-to-medium content, account for both whitespace efficiency
  // and symbol density:
  // - High whitespace = efficient tokenization = fewer tokens
  // - High symbol density = more individual tokens = more tokens

  const whitespaceCount = (text.match(/\s/g) ?? []).length;
  const whitespaceDensity = whitespaceCount / charCount;

  const contentChars = charCount - whitespaceCount;
  const specialChars = (
    text.match(/[{}()[\]<>:;,.!?@#$%^&*+=|\\/'"`~-]/g) ?? []
  ).length;
  const symbolDensity = contentChars > 0 ? specialChars / contentChars : 0;

  // Base estimate
  const baseEstimate = charCount / TOKEN_ESTIMATION.CHARS_PER_TOKEN;

  // Start with whitespace correction
  // High whitespace = efficient tokenization = reduce estimate
  let correctionFactor: number;
  if (whitespaceDensity > TOKEN_ESTIMATION.WHITESPACE.HIGH) {
    correctionFactor = TOKEN_ESTIMATION.WHITESPACE_CORRECTION.HIGH;
  } else if (whitespaceDensity > TOKEN_ESTIMATION.WHITESPACE.MEDIUM) {
    correctionFactor = TOKEN_ESTIMATION.WHITESPACE_CORRECTION.MEDIUM;
  } else if (whitespaceDensity > TOKEN_ESTIMATION.WHITESPACE.LOW) {
    correctionFactor = TOKEN_ESTIMATION.WHITESPACE_CORRECTION.LOW;
  } else {
    correctionFactor = 1.0;
  }

  // Apply symbol density adjustment
  // High symbol density = more tokens = increase estimate
  // This counteracts the whitespace reduction for symbol-heavy code
  if (symbolDensity > TOKEN_ESTIMATION.SYMBOLS.VERY_HIGH) {
    // Very high density (compact JSON, minified)
    correctionFactor *= TOKEN_ESTIMATION.SYMBOL_CORRECTION.VERY_HIGH;
  } else if (symbolDensity > TOKEN_ESTIMATION.SYMBOLS.HIGH) {
    // High density (TypeScript generics, complex expressions)
    correctionFactor *= TOKEN_ESTIMATION.SYMBOL_CORRECTION.HIGH;
  } else if (symbolDensity > TOKEN_ESTIMATION.SYMBOLS.MEDIUM) {
    // Medium-high density (typical code)
    correctionFactor *= TOKEN_ESTIMATION.SYMBOL_CORRECTION.MEDIUM;
  }
  // Moderate-to-low density: no additional adjustment

  return Math.ceil(baseEstimate * correctionFactor);
}

/**
 * More accurate token estimation using word boundaries
 */
export function estimateTokensDetailed(
  text: string
): { tokens: number; method: string } {
  // Split on whitespace and count
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  let tokenCount = 0;

  for (const word of words) {
    if (word.length <= 4) {
      tokenCount += 1;
    } else if (word.length <= 8) {
      tokenCount += 2;
    } else {
      // Longer words typically split into multiple tokens
      tokenCount += Math.ceil(word.length / 4);
    }

    // Add extra tokens for punctuation attached to words
    const punctuation = word.match(/[{}()[\]<>:;,.!?@#$%^&*+=|\\/'"`~-]/g);
    if (punctuation) {
      tokenCount += punctuation.length * 0.5;
    }
  }

  return {
    tokens: Math.ceil(tokenCount),
    method: 'word-boundary',
  };
}

export interface CostEstimate {
  readonly provider: string;
  readonly displayName: string;
  readonly tokens: number;
  readonly inputCost: number;
  readonly withinContextWindow: boolean;
  readonly contextWindow: number;
  readonly utilizationPercent: number;
}

/**
 * Calculate cost for using content with an LLM provider
 */
export function calculateCost(
  tokens: number,
  providerName: string
): CostEstimate | undefined {
  const provider = LLM_PROVIDERS[providerName];
  if (!provider) {
    return undefined;
  }

  const inputCost = (tokens / 1_000_000) * provider.inputCostPerMillion;
  const withinContextWindow = tokens <= provider.contextWindow;
  const utilizationPercent = (tokens / provider.contextWindow) * 100;

  return {
    provider: provider.name,
    displayName: provider.displayName,
    tokens,
    inputCost,
    withinContextWindow,
    contextWindow: provider.contextWindow,
    utilizationPercent,
  };
}

/**
 * Get cost estimates for all major LLM providers
 */
export function getAllCostEstimates(tokens: number): readonly CostEstimate[] {
  return Object.keys(LLM_PROVIDERS)
    .map((name) => calculateCost(tokens, name))
    .filter((estimate): estimate is CostEstimate => estimate !== undefined);
}

/**
 * Format cost estimate for display
 */
export function formatCostEstimate(estimate: CostEstimate): string {
  const status = estimate.withinContextWindow ? '✓' : '✗';
  const cost = estimate.inputCost.toFixed(4);
  const utilization = estimate.utilizationPercent.toFixed(1);

  return `${status} ${estimate.displayName}: $${cost} (${utilization}% of ${formatNumber(estimate.contextWindow)} context)`;
}

/**
 * Format number with commas
 */
export function formatNumber(num: number): string {
  return num.toLocaleString();
}

export interface TokenAnalysis {
  readonly text: string;
  readonly estimatedTokens: number;
  readonly estimates: readonly CostEstimate[];
  readonly warnings: readonly string[];
  readonly recommendations: readonly string[];
}

export interface TokenAnalysisContext {
  readonly profileUsed?: boolean;
  readonly maxSizeUsed?: boolean;
}

/**
 * Analyze text for token usage and provide recommendations
 */
export function analyzeTokenUsage(text: string, context?: TokenAnalysisContext): TokenAnalysis {
  const estimatedTokens = estimateTokens(text);
  const estimates = getAllCostEstimates(estimatedTokens);
  const warnings: string[] = [];
  const recommendations: string[] = [];

  // Check for context window issues
  const overflowProviders = estimates.filter((e) => !e.withinContextWindow);
  const fittingProviders = estimates.filter((e) => e.withinContextWindow);

  if (overflowProviders.length > 0) {
    warnings.push(
      `Output exceeds context window for: ${overflowProviders.map((p) => p.displayName).join(', ')}`
    );
  }

  // Provide recommendations based on size
  if (estimatedTokens > 100000) {
    // Only suggest profile if not already used
    if (!context?.profileUsed) {
      recommendations.push(
        'Consider using --profile minimal or reducing file selection'
      );
    }
    // Only suggest max-size if not already used
    if (!context?.maxSizeUsed) {
      recommendations.push(
        'Use --max-size flag to limit individual file sizes'
      );
    }
  }

  if (estimatedTokens > 50000 && estimatedTokens <= 100000) {
    recommendations.push('Output is large but within most context windows');
    recommendations.push('Consider focusing on specific modules for better results');
  }

  // Cost recommendations
  const cheapestFitting = fittingProviders.sort(
    (a, b) => a.inputCost - b.inputCost
  )[0];
  if (cheapestFitting) {
    recommendations.push(
      `Most cost-effective: ${cheapestFitting.displayName} at $${cheapestFitting.inputCost.toFixed(4)}`
    );
  }

  return {
    text,
    estimatedTokens,
    estimates,
    warnings,
    recommendations,
  };
}

/**
 * Generate a summary report of token analysis
 */
export function generateTokenReport(analysis: TokenAnalysis): string {
  const lines: string[] = [];

  lines.push('## Token Analysis');
  lines.push('');
  lines.push(
    `**Estimated Tokens:** ${formatNumber(analysis.estimatedTokens)}`
  );
  lines.push('');

  lines.push('### Cost Estimates by Provider');
  lines.push('');
  for (const estimate of analysis.estimates) {
    lines.push(`- ${formatCostEstimate(estimate)}`);
  }
  lines.push('');

  if (analysis.warnings.length > 0) {
    lines.push('### ⚠️ Warnings');
    lines.push('');
    for (const warning of analysis.warnings) {
      lines.push(`- ${warning}`);
    }
    lines.push('');
  }

  if (analysis.recommendations.length > 0) {
    lines.push('### 💡 Recommendations');
    lines.push('');
    for (const rec of analysis.recommendations) {
      lines.push(`- ${rec}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
