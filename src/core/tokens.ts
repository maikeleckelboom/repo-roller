/**
 * Token counting and LLM cost estimation utilities
 */

export interface LLMProvider {
  readonly name: string;
  readonly displayName: string;
  readonly contextWindow: number;
  readonly inputCostPerMillion: number;
  readonly outputCostPerMillion: number;
}

export const LLM_PROVIDERS: Record<string, LLMProvider> = {
  'claude-sonnet': {
    name: 'claude-sonnet',
    displayName: 'Claude 3.5 Sonnet',
    contextWindow: 200000,
    inputCostPerMillion: 3.0,
    outputCostPerMillion: 15.0,
  },
  'claude-opus': {
    name: 'claude-opus',
    displayName: 'Claude 3 Opus',
    contextWindow: 200000,
    inputCostPerMillion: 15.0,
    outputCostPerMillion: 75.0,
  },
  'claude-haiku': {
    name: 'claude-haiku',
    displayName: 'Claude 3.5 Haiku',
    contextWindow: 200000,
    inputCostPerMillion: 0.80,
    outputCostPerMillion: 4.0,
  },
  'gpt-4o': {
    name: 'gpt-4o',
    displayName: 'GPT-4o',
    contextWindow: 128000,
    inputCostPerMillion: 2.50,
    outputCostPerMillion: 10.0,
  },
  'gpt-4-turbo': {
    name: 'gpt-4-turbo',
    displayName: 'GPT-4 Turbo',
    contextWindow: 128000,
    inputCostPerMillion: 10.0,
    outputCostPerMillion: 30.0,
  },
  'gpt-4': {
    name: 'gpt-4',
    displayName: 'GPT-4',
    contextWindow: 8192,
    inputCostPerMillion: 30.0,
    outputCostPerMillion: 60.0,
  },
  'o1': {
    name: 'o1',
    displayName: 'OpenAI o1',
    contextWindow: 200000,
    inputCostPerMillion: 15.0,
    outputCostPerMillion: 60.0,
  },
  gemini: {
    name: 'gemini',
    displayName: 'Gemini 1.5 Pro',
    contextWindow: 2000000,
    inputCostPerMillion: 1.25,
    outputCostPerMillion: 5.0,
  },
} as const;

/**
 * Estimate token count from text
 *
 * Uses a heuristic approach:
 * - Average: 1 token ≈ 4 characters (for English text)
 * - Code tends to be slightly more token-dense due to symbols
 * - This is a rough approximation; actual counts vary by tokenizer
 */
export function estimateTokens(text: string): number {
  // Count characters
  const charCount = text.length;

  // Count whitespace (tokens often break on whitespace)
  const whitespaceCount = (text.match(/\s+/g) || []).length;

  // Count special characters (often separate tokens in code)
  const specialChars = (
    text.match(/[{}()\[\]<>:;,.!?@#$%^&*+=|\\/'"`~-]/g) || []
  ).length;

  // Heuristic: base estimate + adjustment for code structure
  // Average word in English is ~5 chars = ~1.25 tokens
  // Code has more symbols which tend to be separate tokens
  const baseEstimate = charCount / 4;
  const codeAdjustment = specialChars * 0.3; // symbols often become separate tokens

  return Math.ceil(baseEstimate + codeAdjustment);
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
    const punctuation = word.match(/[{}()\[\]<>:;,.!?@#$%^&*+=|\\/'"`~-]/g);
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

/**
 * Analyze text for token usage and provide recommendations
 */
export function analyzeTokenUsage(text: string): TokenAnalysis {
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
    recommendations.push(
      'Consider using --profile minimal or reducing file selection'
    );
    recommendations.push(
      'Use --max-size flag to limit individual file sizes'
    );
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
