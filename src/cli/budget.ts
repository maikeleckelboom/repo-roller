/**
 * CLI Budget Constraint Handling
 *
 * Functions for applying and formatting budget constraints on file selection.
 */

import type { ResolvedOptions, FileInfo } from '../core/types.js';
import type { BudgetConfig, BudgetSelectionResult } from '../core/budget.js';
import { selectFilesWithinBudget } from '../core/budget.js';
import * as ui from '../core/ui.js';

/**
 * Apply budget constraints to file selection
 *
 * @param scan - Scan result with files
 * @param options - Resolved CLI options
 * @returns Budget selection result or null if no budget constraints
 */
export async function applyBudgetConstraints(
  scan: { files: readonly FileInfo[] },
  options: ResolvedOptions
): Promise<BudgetSelectionResult | null> {
  // Check if any budget constraint is specified
  if (!options.maxTokens && !options.maxCost && !options.maxCostEur) {
    return null;
  }

  // Determine budget config
  let budgetConfig: BudgetConfig;

  if (options.maxTokens) {
    budgetConfig = {
      type: 'tokens',
      limit: options.maxTokens,
      provider: options.targetProvider ?? 'claude-haiku',
    };
  } else if (options.maxCost) {
    budgetConfig = {
      type: 'usd',
      limit: options.maxCost,
      provider: options.targetProvider ?? 'claude-haiku',
    };
  } else if (options.maxCostEur) {
    budgetConfig = {
      type: 'eur',
      limit: options.maxCostEur,
      provider: options.targetProvider ?? 'claude-haiku',
    };
  } else {
    return null;
  }

  console.log(ui.status('analyze', `Applying budget constraints ${ui.colors.dim(`(${formatBudgetLimit(budgetConfig)})`)}`));

  const result = await selectFilesWithinBudget(
    scan.files,
    budgetConfig,
    undefined, // Use default middleware
    options.root
  );

  return result;
}

/**
 * Format budget limit for display
 *
 * @param config - Budget configuration
 * @returns Human-readable budget limit string
 */
export function formatBudgetLimit(config: BudgetConfig): string {
  switch (config.type) {
    case 'tokens':
      if (config.limit >= 1_000_000) {
        return `${(config.limit / 1_000_000).toFixed(1)}M tokens`;
      } else if (config.limit >= 1000) {
        return `${(config.limit / 1000).toFixed(0)}K tokens`;
      }
      return `${config.limit} tokens`;
    case 'usd':
      return `$${config.limit.toFixed(2)}`;
    case 'eur':
      return `€${config.limit.toFixed(2)}`;
  }
}
