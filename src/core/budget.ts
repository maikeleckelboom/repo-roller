/**
 * Token budget management and file selection middleware
 *
 * This module provides an extensible architecture for selecting files based on
 * token/cost budgets. It's designed to be middleware-friendly, allowing future
 * extensions like:
 * - LLM-based intelligent file selection
 * - Git history snapshots (e.g., "files from two days ago at 2AM")
 * - Priority-based selection
 * - Dependency graph analysis
 */

import type { FileInfo } from './types.js';
import { calculateCost, LLM_PROVIDERS } from './tokens.js';

/**
 * Budget limit types
 */
export type BudgetType = 'tokens' | 'usd' | 'eur';

/**
 * Budget configuration
 */
export interface BudgetConfig {
  readonly type: BudgetType;
  readonly limit: number;
  readonly provider?: string; // Required for cost-based budgets
}

/**
 * Result of file selection within budget
 */
export interface BudgetSelectionResult {
  readonly selectedFiles: readonly FileInfo[];
  readonly excludedFiles: readonly FileInfo[];
  readonly totalTokens: number;
  readonly totalCost: number;
  readonly budgetType: BudgetType;
  readonly budgetLimit: number;
  readonly budgetUsed: number;
  readonly budgetRemaining: number;
  readonly utilizationPercent: number;
}

/**
 * Middleware function type for file selection
 * Allows custom logic for deciding which files to include
 */
export type FileSelectionMiddleware = (
  files: readonly FileInfo[],
  config: BudgetConfig,
  context: MiddlewareContext
) => Promise<readonly FileInfo[]> | readonly FileInfo[];

/**
 * Context passed to middleware functions
 */
export interface MiddlewareContext {
  readonly rootPath: string;
  readonly currentTokens: number;
  readonly currentCost: number;
  readonly provider?: string;
  // Future extensions:
  // readonly gitHistory?: GitHistoryContext;
  // readonly llmClient?: LLMClient;
  // readonly userQuery?: string;
}

/**
 * File with estimated token count
 */
interface FileWithTokens extends FileInfo {
  readonly estimatedTokens: number;
  readonly estimatedCost: number;
}

/**
 * EUR to USD conversion rate (approximate, for cost estimation)
 */
const EUR_TO_USD_RATE = 1.08;

/**
 * Estimate tokens for a single file based on its size
 * Uses a heuristic: ~4 characters per token, with adjustments for code
 */
export function estimateFileTokens(file: FileInfo): number {
  // Heuristic: code files have ~4 chars per token on average
  // Binary files are skipped, so this should be text
  const baseEstimate = file.sizeBytes / 4;

  // Adjust for different file types
  const extension = file.extension.toLowerCase();
  let multiplier = 1.0;

  // Minified/compressed files have higher token density
  if (extension === 'min.js' || extension === 'min.css') {
    multiplier = 1.3;
  } else if (extension === 'json' || extension === 'yaml' || extension === 'yml') {
    // JSON/YAML have more structure tokens
    multiplier = 1.2;
  } else if (extension === 'md' || extension === 'txt') {
    // Markdown has less token density
    multiplier = 0.9;
  }

  return Math.ceil(baseEstimate * multiplier);
}

/**
 * Calculate cost for estimated tokens
 */
export function estimateFileCost(tokens: number, provider: string): number {
  const estimate = calculateCost(tokens, provider);
  return estimate?.inputCost ?? 0;
}

/**
 * Convert EUR to USD
 */
export function eurToUsd(eur: number): number {
  return eur * EUR_TO_USD_RATE;
}

/**
 * Convert USD to EUR
 */
export function usdToEur(usd: number): number {
  return usd / EUR_TO_USD_RATE;
}

/**
 * Default file selection middleware - selects files by size (largest first)
 * This is a simple greedy algorithm that prioritizes larger files
 */
export const defaultSizeBasedMiddleware: FileSelectionMiddleware = (
  files,
  _config,
  _context
) => {
  // Sort by size descending (prioritize larger files)
  return [...files].sort((a, b) => b.sizeBytes - a.sizeBytes);
};

/**
 * Path-based middleware - keeps files in their original order
 */
export const pathBasedMiddleware: FileSelectionMiddleware = (files) => {
  return files;
};

/**
 * Extension priority middleware - prioritizes certain file types
 */
export function createExtensionPriorityMiddleware(
  priorities: readonly string[]
): FileSelectionMiddleware {
  return (files) => {
    return [...files].sort((a, b) => {
      const aIndex = priorities.indexOf(a.extension);
      const bIndex = priorities.indexOf(b.extension);

      // Files with prioritized extensions come first
      if (aIndex !== -1 && bIndex === -1) {
        return -1;
      }
      if (aIndex === -1 && bIndex !== -1) {
        return 1;
      }
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }

      // Otherwise, sort by size
      return b.sizeBytes - a.sizeBytes;
    });
  };
}

/**
 * Select files within a token/cost budget
 *
 * This is the main entry point for budget-based file selection.
 * It supports extensible middleware for custom selection logic.
 */
export async function selectFilesWithinBudget(
  files: readonly FileInfo[],
  config: BudgetConfig,
  middleware: FileSelectionMiddleware = defaultSizeBasedMiddleware,
  rootPath = '.'
): Promise<BudgetSelectionResult> {
  // Validate config
  if (config.type !== 'tokens' && !config.provider) {
    throw new Error('Provider must be specified for cost-based budgets');
  }

  // Get provider for cost calculations
  const provider = config.provider ?? 'claude-haiku';

  // Apply middleware to order/filter files
  const context: MiddlewareContext = {
    rootPath,
    currentTokens: 0,
    currentCost: 0,
    provider,
  };

  const orderedFiles = await middleware(files, config, context);

  // Estimate tokens for each file
  const filesWithTokens: FileWithTokens[] = orderedFiles.map(file => ({
    ...file,
    estimatedTokens: estimateFileTokens(file),
    estimatedCost: estimateFileCost(estimateFileTokens(file), provider),
  }));

  // Convert budget limit to tokens if needed
  let tokenBudget: number;
  let costBudget: number;

  if (config.type === 'tokens') {
    tokenBudget = config.limit;
    // Calculate equivalent cost budget
    const costEstimate = calculateCost(config.limit, provider);
    costBudget = costEstimate?.inputCost ?? Infinity;
  } else if (config.type === 'usd') {
    costBudget = config.limit;
    // Calculate equivalent token budget
    const providerInfo = LLM_PROVIDERS[provider];
    if (providerInfo) {
      tokenBudget = (config.limit / providerInfo.inputCostPerMillion) * 1_000_000;
    } else {
      tokenBudget = Infinity;
    }
  } else {
    // EUR
    costBudget = eurToUsd(config.limit);
    const providerInfo = LLM_PROVIDERS[provider];
    if (providerInfo) {
      tokenBudget = (costBudget / providerInfo.inputCostPerMillion) * 1_000_000;
    } else {
      tokenBudget = Infinity;
    }
  }

  // Select files greedily within budget
  const selectedFiles: FileInfo[] = [];
  const excludedFiles: FileInfo[] = [];
  let currentTokens = 0;
  let currentCost = 0;

  for (const file of filesWithTokens) {
    const wouldExceedTokens = currentTokens + file.estimatedTokens > tokenBudget;
    const wouldExceedCost = currentCost + file.estimatedCost > costBudget;

    if (!wouldExceedTokens && !wouldExceedCost) {
      selectedFiles.push(file);
      currentTokens += file.estimatedTokens;
      currentCost += file.estimatedCost;
    } else {
      excludedFiles.push(file);
    }
  }

  // Calculate budget usage
  let budgetUsed: number;
  let budgetRemaining: number;

  if (config.type === 'tokens') {
    budgetUsed = currentTokens;
    budgetRemaining = config.limit - currentTokens;
  } else if (config.type === 'usd') {
    budgetUsed = currentCost;
    budgetRemaining = config.limit - currentCost;
  } else {
    // EUR
    budgetUsed = usdToEur(currentCost);
    budgetRemaining = config.limit - budgetUsed;
  }

  const utilizationPercent = (budgetUsed / config.limit) * 100;

  return {
    selectedFiles,
    excludedFiles,
    totalTokens: currentTokens,
    totalCost: currentCost,
    budgetType: config.type,
    budgetLimit: config.limit,
    budgetUsed,
    budgetRemaining,
    utilizationPercent,
  };
}

/**
 * Parse budget string from CLI (e.g., "50000", "$0.50", "€0.30")
 */
export function parseBudgetString(input: string): BudgetConfig | null {
  const trimmed = input.trim();

  // Check for EUR symbol
  if (trimmed.startsWith('€') || trimmed.toLowerCase().endsWith('eur')) {
    const numStr = trimmed.replace(/[€eEuUrR]/g, '').trim();
    const value = parseFloat(numStr);
    if (!isNaN(value)) {
      return { type: 'eur', limit: value };
    }
  }

  // Check for USD symbol
  if (trimmed.startsWith('$') || trimmed.toLowerCase().endsWith('usd')) {
    const numStr = trimmed.replace(/[$uUssdD]/g, '').trim();
    const value = parseFloat(numStr);
    if (!isNaN(value)) {
      return { type: 'usd', limit: value };
    }
  }

  // Check for token suffix
  if (trimmed.toLowerCase().endsWith('k')) {
    const numStr = trimmed.slice(0, -1);
    const value = parseFloat(numStr);
    if (!isNaN(value)) {
      return { type: 'tokens', limit: value * 1000 };
    }
  }

  if (trimmed.toLowerCase().endsWith('m')) {
    const numStr = trimmed.slice(0, -1);
    const value = parseFloat(numStr);
    if (!isNaN(value)) {
      return { type: 'tokens', limit: value * 1_000_000 };
    }
  }

  // Plain number = tokens
  const value = parseFloat(trimmed);
  if (!isNaN(value)) {
    return { type: 'tokens', limit: value };
  }

  return null;
}

/**
 * Format budget value for display
 */
export function formatBudget(config: BudgetConfig): string {
  switch (config.type) {
    case 'tokens':
      if (config.limit >= 1_000_000) {
        return `${(config.limit / 1_000_000).toFixed(1)}M tokens`;
      } else if (config.limit >= 1000) {
        return `${(config.limit / 1000).toFixed(1)}K tokens`;
      }
      return `${config.limit} tokens`;
    case 'usd':
      return `$${config.limit.toFixed(4)}`;
    case 'eur':
      return `€${config.limit.toFixed(4)}`;
  }
}

/**
 * Format budget usage for display
 */
export function formatBudgetUsage(result: BudgetSelectionResult): string {
  const used = formatBudgetValue(result.budgetUsed, result.budgetType);
  const limit = formatBudgetValue(result.budgetLimit, result.budgetType);
  const percent = result.utilizationPercent.toFixed(1);
  return `${used} / ${limit} (${percent}%)`;
}

function formatBudgetValue(value: number, type: BudgetType) {
  switch (type) {
    case 'tokens':
      if (value >= 1_000_000) {
        return `${(value / 1_000_000).toFixed(2)}M`;
      } else if (value >= 1000) {
        return `${(value / 1000).toFixed(1)}K`;
      }
      return value.toFixed(0);
    case 'usd':
      return `$${value.toFixed(4)}`;
    case 'eur':
      return `€${value.toFixed(4)}`;
  }
}
