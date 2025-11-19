/**
 * Model & Context preset system for LLM providers
 *
 * Provides built-in presets for popular models with:
 * - Context window limits
 * - Default safety margins
 * - Cost information
 */

import { env } from './env.js';

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
 * Built-in model presets (loaded from environment configuration)
 */
export const MODEL_PRESETS: Readonly<Record<string, ModelPreset>> = {
  // GPT-5.1 models (hypothetical)
  'gpt-5.1': {
    name: 'gpt-5.1',
    displayName: env.modelPresets.gpt51.displayName,
    contextLimit: env.modelPresets.gpt51.contextLimit,
    safetyMargin: env.modelPresets.gpt51.safetyMargin,
    inputCostPerMillion: env.modelPresets.gpt51.inputCostPerMillion,
    outputCostPerMillion: env.modelPresets.gpt51.outputCostPerMillion,
    description: 'Latest GPT model with 256K context',
    family: 'openai',
  },
  'gpt-5.1-thinking': {
    name: 'gpt-5.1-thinking',
    displayName: env.modelPresets.gpt51Thinking.displayName,
    contextLimit: env.modelPresets.gpt51Thinking.contextLimit,
    safetyMargin: env.modelPresets.gpt51Thinking.safetyMargin,
    inputCostPerMillion: env.modelPresets.gpt51Thinking.inputCostPerMillion,
    outputCostPerMillion: env.modelPresets.gpt51Thinking.outputCostPerMillion,
    description: 'GPT-5.1 with extended reasoning capabilities',
    family: 'openai',
  },

  // GPT-4.1 / o3 models
  'gpt-4.1': {
    name: 'gpt-4.1',
    displayName: env.modelPresets.gpt41.displayName,
    contextLimit: env.modelPresets.gpt41.contextLimit,
    safetyMargin: env.modelPresets.gpt41.safetyMargin,
    inputCostPerMillion: env.modelPresets.gpt41.inputCostPerMillion,
    outputCostPerMillion: env.modelPresets.gpt41.outputCostPerMillion,
    description: 'GPT-4.1 with 128K context',
    family: 'openai',
  },
  'gpt-o3': {
    name: 'gpt-o3',
    displayName: env.modelPresets.o3.displayName,
    contextLimit: env.modelPresets.o3.contextLimit,
    safetyMargin: env.modelPresets.o3.safetyMargin,
    inputCostPerMillion: env.modelPresets.o3.inputCostPerMillion,
    outputCostPerMillion: env.modelPresets.o3.outputCostPerMillion,
    description: 'OpenAI o3 reasoning model',
    family: 'openai',
  },
  'gpt-o3-mini': {
    name: 'gpt-o3-mini',
    displayName: env.modelPresets.o3Mini.displayName,
    contextLimit: env.modelPresets.o3Mini.contextLimit,
    safetyMargin: env.modelPresets.o3Mini.safetyMargin,
    inputCostPerMillion: env.modelPresets.o3Mini.inputCostPerMillion,
    outputCostPerMillion: env.modelPresets.o3Mini.outputCostPerMillion,
    description: 'Lightweight o3 reasoning model',
    family: 'openai',
  },

  // Claude models
  'claude-3.5-sonnet': {
    name: 'claude-3.5-sonnet',
    displayName: env.modelPresets.claude35Sonnet.displayName,
    contextLimit: env.modelPresets.claude35Sonnet.contextLimit,
    safetyMargin: env.modelPresets.claude35Sonnet.safetyMargin,
    inputCostPerMillion: env.modelPresets.claude35Sonnet.inputCostPerMillion,
    outputCostPerMillion: env.modelPresets.claude35Sonnet.outputCostPerMillion,
    description: 'Balanced performance and cost',
    family: 'anthropic',
  },
  'claude-3.5-opus': {
    name: 'claude-3.5-opus',
    displayName: env.modelPresets.claude35Opus.displayName,
    contextLimit: env.modelPresets.claude35Opus.contextLimit,
    safetyMargin: env.modelPresets.claude35Opus.safetyMargin,
    inputCostPerMillion: env.modelPresets.claude35Opus.inputCostPerMillion,
    outputCostPerMillion: env.modelPresets.claude35Opus.outputCostPerMillion,
    description: 'Highest capability model',
    family: 'anthropic',
  },
  'claude-3.5-haiku': {
    name: 'claude-3.5-haiku',
    displayName: env.modelPresets.claude35Haiku.displayName,
    contextLimit: env.modelPresets.claude35Haiku.contextLimit,
    safetyMargin: env.modelPresets.claude35Haiku.safetyMargin,
    inputCostPerMillion: env.modelPresets.claude35Haiku.inputCostPerMillion,
    outputCostPerMillion: env.modelPresets.claude35Haiku.outputCostPerMillion,
    description: 'Fast and cost-effective',
    family: 'anthropic',
  },

  // Gemini models
  'gemini-1.5-pro': {
    name: 'gemini-1.5-pro',
    displayName: env.modelPresets.gemini15Pro.displayName,
    contextLimit: env.modelPresets.gemini15Pro.contextLimit,
    safetyMargin: env.modelPresets.gemini15Pro.safetyMargin,
    inputCostPerMillion: env.modelPresets.gemini15Pro.inputCostPerMillion,
    outputCostPerMillion: env.modelPresets.gemini15Pro.outputCostPerMillion,
    description: 'Massive 2M context window',
    family: 'google',
  },
  'gemini-2.0-flash': {
    name: 'gemini-2.0-flash',
    displayName: env.modelPresets.gemini20Flash.displayName,
    contextLimit: env.modelPresets.gemini20Flash.contextLimit,
    safetyMargin: env.modelPresets.gemini20Flash.safetyMargin,
    inputCostPerMillion: env.modelPresets.gemini20Flash.inputCostPerMillion,
    outputCostPerMillion: env.modelPresets.gemini20Flash.outputCostPerMillion,
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
    grouped[preset.family].push(preset);
  }

  return grouped;
}
