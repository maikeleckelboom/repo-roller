/**
 * Model & Context preset system for LLM providers
 *
 * Provides built-in presets for popular models with:
 * - Context window limits
 * - Default safety margins
 * - Cost information
 */

export interface ModelPreset {
  readonly name: string;
  readonly displayName: string;
  readonly contextLimit: number;
  readonly safetyMargin: number; // e.g., 0.75 means use 75% of context
  readonly inputCostPerMillion: number;
  readonly outputCostPerMillion: number;
  readonly description: string;
  readonly family: 'openai' | 'anthropic' | 'google' | 'other';
}

/**
 * Built-in model presets
 */
export const MODEL_PRESETS: Readonly<Record<string, ModelPreset>> = {
  // GPT-5.1 models (hypothetical)
  'gpt-5.1': {
    name: 'gpt-5.1',
    displayName: 'GPT-5.1',
    contextLimit: 256_000,
    safetyMargin: 0.75,
    inputCostPerMillion: 5.0,
    outputCostPerMillion: 15.0,
    description: 'Latest GPT model with 256K context',
    family: 'openai',
  },
  'gpt-5.1-thinking': {
    name: 'gpt-5.1-thinking',
    displayName: 'GPT-5.1 Thinking',
    contextLimit: 256_000,
    safetyMargin: 0.65, // Lower margin for reasoning overhead
    inputCostPerMillion: 8.0,
    outputCostPerMillion: 24.0,
    description: 'GPT-5.1 with extended reasoning capabilities',
    family: 'openai',
  },

  // GPT-4.1 / o3 models
  'gpt-4.1': {
    name: 'gpt-4.1',
    displayName: 'GPT-4.1',
    contextLimit: 128_000,
    safetyMargin: 0.75,
    inputCostPerMillion: 2.50,
    outputCostPerMillion: 10.0,
    description: 'GPT-4.1 with 128K context',
    family: 'openai',
  },
  'gpt-o3': {
    name: 'gpt-o3',
    displayName: 'GPT-o3',
    contextLimit: 200_000,
    safetyMargin: 0.70,
    inputCostPerMillion: 15.0,
    outputCostPerMillion: 60.0,
    description: 'OpenAI o3 reasoning model',
    family: 'openai',
  },
  'gpt-o3-mini': {
    name: 'gpt-o3-mini',
    displayName: 'GPT-o3 Mini',
    contextLimit: 128_000,
    safetyMargin: 0.75,
    inputCostPerMillion: 3.0,
    outputCostPerMillion: 12.0,
    description: 'Lightweight o3 reasoning model',
    family: 'openai',
  },

  // Claude models
  'claude-3.5-sonnet': {
    name: 'claude-3.5-sonnet',
    displayName: 'Claude 3.5 Sonnet',
    contextLimit: 200_000,
    safetyMargin: 0.75,
    inputCostPerMillion: 3.0,
    outputCostPerMillion: 15.0,
    description: 'Balanced performance and cost',
    family: 'anthropic',
  },
  'claude-3.5-opus': {
    name: 'claude-3.5-opus',
    displayName: 'Claude 3.5 Opus',
    contextLimit: 200_000,
    safetyMargin: 0.75,
    inputCostPerMillion: 15.0,
    outputCostPerMillion: 75.0,
    description: 'Highest capability model',
    family: 'anthropic',
  },
  'claude-3.5-haiku': {
    name: 'claude-3.5-haiku',
    displayName: 'Claude 3.5 Haiku',
    contextLimit: 200_000,
    safetyMargin: 0.80,
    inputCostPerMillion: 0.80,
    outputCostPerMillion: 4.0,
    description: 'Fast and cost-effective',
    family: 'anthropic',
  },

  // Gemini models
  'gemini-1.5-pro': {
    name: 'gemini-1.5-pro',
    displayName: 'Gemini 1.5 Pro',
    contextLimit: 2_000_000,
    safetyMargin: 0.80,
    inputCostPerMillion: 1.25,
    outputCostPerMillion: 5.0,
    description: 'Massive 2M context window',
    family: 'google',
  },
  'gemini-2.0-flash': {
    name: 'gemini-2.0-flash',
    displayName: 'Gemini 2.0 Flash',
    contextLimit: 1_000_000,
    safetyMargin: 0.85,
    inputCostPerMillion: 0.075,
    outputCostPerMillion: 0.30,
    description: 'Fast and affordable with 1M context',
    family: 'google',
  },
} as const;

/**
 * Get a model preset by name (case-insensitive, supports aliases)
 */
export function getModelPreset(name: string): ModelPreset | undefined {
  const normalized = name.toLowerCase().trim();

  // Direct match
  if (MODEL_PRESETS[normalized]) {
    return MODEL_PRESETS[normalized];
  }

  // Common aliases
  const aliases: Record<string, string> = {
    sonnet: 'claude-3.5-sonnet',
    opus: 'claude-3.5-opus',
    haiku: 'claude-3.5-haiku',
    claude: 'claude-3.5-sonnet',
    'claude-sonnet': 'claude-3.5-sonnet',
    'claude-opus': 'claude-3.5-opus',
    'claude-haiku': 'claude-3.5-haiku',
    gpt5: 'gpt-5.1',
    gpt4: 'gpt-4.1',
    o3: 'gpt-o3',
    gemini: 'gemini-1.5-pro',
    flash: 'gemini-2.0-flash',
  };

  const aliasKey = aliases[normalized];
  if (aliasKey) {
    return MODEL_PRESETS[aliasKey];
  }

  return undefined;
}

/**
 * Calculate effective token budget based on model preset
 */
export function calculateEffectiveBudget(preset: ModelPreset): number {
  return Math.floor(preset.contextLimit * preset.safetyMargin);
}

/**
 * Calculate cost for a token count using a model preset
 */
export function calculatePresetCost(
  tokens: number,
  preset: ModelPreset
): {
  inputCost: number;
  withinBudget: boolean;
  utilizationPercent: number;
  warningLevel: 'safe' | 'caution' | 'danger';
} {
  const effectiveBudget = calculateEffectiveBudget(preset);
  const inputCost = (tokens / 1_000_000) * preset.inputCostPerMillion;
  const utilizationPercent = (tokens / effectiveBudget) * 100;

  let warningLevel: 'safe' | 'caution' | 'danger';
  if (tokens <= effectiveBudget * 0.8) {
    warningLevel = 'safe';
  } else if (tokens <= effectiveBudget) {
    warningLevel = 'caution';
  } else {
    warningLevel = 'danger';
  }

  return {
    inputCost,
    withinBudget: tokens <= effectiveBudget,
    utilizationPercent,
    warningLevel,
  };
}

/**
 * Get warnings for a given token count and model preset
 */
export function getModelWarnings(
  tokens: number,
  preset: ModelPreset
): string[] {
  const warnings: string[] = [];
  const effectiveBudget = calculateEffectiveBudget(preset);
  const utilizationPercent = (tokens / effectiveBudget) * 100;

  if (tokens > preset.contextLimit) {
    warnings.push(
      `Exceeds ${preset.displayName} hard limit (${formatTokenCount(preset.contextLimit)})`
    );
  } else if (tokens > effectiveBudget) {
    warnings.push(
      `Exceeds ${preset.displayName} safe budget (${formatTokenCount(effectiveBudget)})`
    );
    warnings.push(
      'Consider reducing file selection or using --strip-comments'
    );
  } else if (utilizationPercent > 90) {
    warnings.push(
      `High utilization (${utilizationPercent.toFixed(0)}%) - limited room for LLM response`
    );
  }

  return warnings;
}

/**
 * Format token count for display
 */
function formatTokenCount(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}M`;
  } else if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(0)}K`;
  }
  return tokens.toString();
}

/**
 * List all available model presets
 */
export function listModelPresets(): ModelPreset[] {
  return Object.values(MODEL_PRESETS);
}

/**
 * Get presets grouped by family
 */
export function getPresetsByFamily(): Record<string, ModelPreset[]> {
  const grouped: Record<string, ModelPreset[]> = {};

  for (const preset of Object.values(MODEL_PRESETS)) {
    if (!grouped[preset.family]) {
      grouped[preset.family] = [];
    }
    const group = grouped[preset.family];
    if (group) {
      group.push(preset);
    }
  }

  return grouped;
}
