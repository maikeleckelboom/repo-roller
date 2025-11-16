/**
 * CLI Display Functions
 *
 * Functions for displaying information, analysis, and errors to the terminal.
 */

import type { ResolvedOptions } from '../core/types.js';
import type { BudgetSelectionResult } from '../core/budget.js';
import type { TokenAnalysisContext } from '../core/tokens.js';
import { analyzeTokenUsage, formatNumber, calculateCost, LLM_PROVIDERS } from '../core/tokens.js';
import { formatBudgetUsage } from '../core/budget.js';
import * as ui from '../core/ui.js';

/**
 * Display token analysis and cost estimates
 */
export function displayTokenAnalysis(output: string, options: ResolvedOptions): void {
  const context: TokenAnalysisContext = {
    profileUsed: options.profileExplicitlySet,
    maxSizeUsed: options.maxSizeExplicitlySet,
  };
  const analysis = analyzeTokenUsage(output, context);

  // Token Analysis Section
  console.log(ui.section('Token Analysis'));
  console.log(ui.keyValue('Estimated tokens', ui.tokenCount(analysis.estimatedTokens)));
  console.log('');

  // Show specific provider if targeted
  if (options.targetProvider) {
    const estimate = calculateCost(analysis.estimatedTokens, options.targetProvider);
    if (estimate) {
      console.log(ui.providerRow(
        estimate.displayName,
        `$${estimate.inputCost.toFixed(4)} (${estimate.utilizationPercent.toFixed(1)}% context)`,
        estimate.withinContextWindow,
        true
      ));
    } else {
      console.log(ui.warning(`Unknown provider: ${options.targetProvider}`));
    }
  } else {
    // Show top providers in a clean table with utilization bars
    console.log(ui.colors.dim('  Provider             Cost         Context Utilization'));
    console.log(ui.colors.muted('  ' + ui.symbols.line.repeat(58)));

    const topProviders = ['claude-sonnet', 'gpt-4o', 'claude-haiku', 'gemini'];
    const estimates = topProviders
      .map(name => calculateCost(analysis.estimatedTokens, name))
      .filter((e): e is NonNullable<typeof e> => e !== null && e !== undefined)
      .sort((a, b) => a.inputCost - b.inputCost);

    // Find cheapest fitting provider
    const cheapestFitting = estimates.find(e => e.withinContextWindow);

    for (const estimate of estimates) {
      const isCheapest = cheapestFitting && estimate.provider === cheapestFitting.provider;
      console.log(ui.providerRowWithBar(
        estimate.displayName,
        `$${estimate.inputCost.toFixed(4)}`,
        estimate.utilizationPercent,
        estimate.withinContextWindow,
        isCheapest
      ));
    }
  }

  // Display warnings in a distinct section
  if (analysis.warnings.length > 0) {
    console.log('');
    console.log(ui.colors.warning.bold('  Warnings'));
    for (const warning of analysis.warnings) {
      console.log(ui.bullet(ui.colors.warning(warning)));
    }
  }

  // Check custom token warning threshold
  if (options.warnTokens && analysis.estimatedTokens > options.warnTokens) {
    console.log('');
    console.log(ui.warning(`Output exceeds ${formatNumber(options.warnTokens)} token threshold`));
  }

  // Display recommendations
  if (analysis.recommendations.length > 0) {
    console.log('');
    console.log(ui.colors.info.bold('  Recommendations'));
    for (const rec of analysis.recommendations) {
      console.log(ui.bullet(ui.colors.dim(rec)));
    }
  }

  console.log('');
  console.log(ui.separator());
}

/**
 * Display all supported LLM providers
 */
export function displayProviders(): void {
  console.log(ui.header());
  console.log(ui.section('Supported LLM Providers'));

  const providers = Object.values(LLM_PROVIDERS);
  for (const provider of providers) {
    console.log(ui.colors.primary.bold(`  ${provider.displayName}`));
    console.log(ui.keyValue('    ID', ui.colors.dim(provider.name)));
    console.log(ui.keyValue('    Context', `${formatNumber(provider.contextWindow)} tokens`));
    console.log(ui.keyValue('    Input', `$${provider.inputCostPerMillion.toFixed(2)}/1M tokens`));
    console.log(ui.keyValue('    Output', `$${provider.outputCostPerMillion.toFixed(2)}/1M tokens`));
    console.log('');
  }

  console.log(ui.colors.dim('  Usage:'));
  console.log(ui.bullet(ui.colors.muted('repo-roller . --target claude-sonnet')));
  console.log(ui.bullet(ui.colors.muted('repo-roller . --target gpt-4o --warn-tokens 100000')));
  console.log('');
}

/**
 * Display budget selection summary
 */
export function displayBudgetSummary(result: BudgetSelectionResult): void {
  const selected = result.selectedFiles.length;
  const excluded = result.excludedFiles.length;
  const utilization = result.utilizationPercent.toFixed(1);

  if (excluded > 0) {
    console.log(ui.warning(`Budget constraint: excluded ${ui.colors.warning(excluded.toString())} files`));
  }

  console.log(ui.success(`Selected ${ui.colors.primary(selected.toString())} files within budget ${ui.colors.dim(`(${utilization}% utilized)`)}`));
  console.log(ui.keyValue('  Budget usage', formatBudgetUsage(result)));
  console.log('');
}

/**
 * Display helpful error message when no files are found
 */
export function displayNoFilesError(options: ResolvedOptions): void {
  console.error('');
  console.error(ui.error('No files found'));
  console.error('');

  console.error(ui.colors.warning.bold('  Possible reasons'));
  console.error(ui.bullet('All files are excluded by .gitignore or exclude patterns'));
  console.error(ui.bullet('Extension filter too restrictive (--ext or --lang)'));
  console.error(ui.bullet('Files exceed size limit (--max-size)'));
  console.error(ui.bullet('No files match include patterns'));
  console.error('');

  console.error(ui.colors.info.bold('  Try'));
  console.error(ui.bullet(ui.colors.muted('repo-roller . --dry-run') + ui.colors.dim('    Preview what would be included')));
  console.error(ui.bullet(ui.colors.muted('repo-roller . --verbose') + ui.colors.dim('    See detailed filtering')));
  console.error(ui.bullet(ui.colors.muted('repo-roller . --preset full') + ui.colors.dim(' Include all files')));
  if (options.extensions.length > 0) {
    console.error(ui.bullet(ui.colors.muted('repo-roller . --ext ""') + ui.colors.dim(`     Remove extension filter (current: ${options.extensions.join(',')})`)));
  }
  console.error('');
}
