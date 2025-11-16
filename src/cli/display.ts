/**
 * CLI Display Functions
 *
 * Functions for displaying information, analysis, and errors to the terminal.
 */

import type { ResolvedOptions, ScanResult } from '../core/types.js';
import type { BudgetSelectionResult } from '../core/budget.js';
import type { TokenAnalysisContext } from '../core/tokens.js';
import { analyzeTokenUsage, formatNumber, calculateCost, LLM_PROVIDERS } from '../core/tokens.js';
import { formatBudgetUsage } from '../core/budget.js';
import * as ui from '../core/ui.js';
import {
  formatBytes,
  calculateLanguageBreakdown,
  calculateRoleBreakdown,
  calculateTopDirectories,
  estimateLinesOfCode,
} from '../core/helpers.js';

/**
 * Summary model for generation summary rendering
 */
export interface GenerationSummaryModel {
  readonly filesSelected: number;
  readonly totalBytes: number;
  readonly estimatedLines: number;
  readonly outputFile: string;
  readonly composition: ui.CompositionData;
  readonly options: readonly ui.OptionItem[];
  readonly tokenInfo?: {
    readonly tokens: number;
    readonly targetProvider?: string;
  };
}

/**
 * Pure function to render generation summary as array of lines
 * Used by both interactive and non-interactive modes
 */
export function renderGenerationSummary(model: GenerationSummaryModel): string[] {
  const lines: string[] = [];

  // Section header
  lines.push('');
  lines.push(ui.section('Generation Summary'));

  // Bundle Profile - Key-value grid
  const profileRows: ui.GridRow[] = [
    {
      label: ui.colors.dim('Files selected'),
      value: ui.colors.primary(model.filesSelected.toString()),
    },
    {
      label: ui.colors.dim('Total size'),
      value: formatBytes(model.totalBytes),
    },
    {
      label: ui.colors.dim('Lines of code'),
      value: `~${formatNumber(model.estimatedLines)}`,
    },
    {
      label: ui.colors.dim('Output file'),
      value: ui.colors.success(model.outputFile),
    },
  ];

  lines.push(...ui.renderGrid(profileRows));
  lines.push('');

  // Code Composition with colored bars
  lines.push(...ui.renderCompositionSection(model.composition));
  lines.push('');

  // Options summary
  lines.push(`  ${ui.colors.dim('Options')}`);
  lines.push(`  ${ui.colors.muted(ui.symbols.line.repeat(30))}`);
  lines.push(...ui.renderOptionsList(model.options));
  lines.push('');

  // Context Fit (if token info provided)
  if (model.tokenInfo) {
    lines.push(...renderContextFitLines(model.tokenInfo.tokens, model.tokenInfo.targetProvider));
  }

  return lines;
}

/**
 * Render context fit information as array of lines
 */
function renderContextFitLines(estimatedTokens: number, targetProvider?: string): string[] {
  const lines: string[] = [];

  lines.push(`  ${ui.colors.dim('Context Fit')}`);
  lines.push(`  ${ui.colors.muted(ui.symbols.line.repeat(45))}`);

  // Token count with context fit indicators
  const tokenStr = ui.tokenCount(estimatedTokens);

  // Check common context window sizes
  const fits128k = estimatedTokens <= 128_000;
  const fits32k = estimatedTokens <= 32_000;

  let contextInfo = '';
  if (fits32k) {
    contextInfo = ui.colors.success('fits 32K ctx');
  } else if (fits128k) {
    contextInfo = ui.colors.accent('fits 128K ctx; too large for 32K');
  } else {
    contextInfo = ui.colors.warning('exceeds 128K ctx');
  }

  // Use grid for aligned token row
  const tokenRow: ui.GridRow = {
    label: ui.colors.dim('Estimated tokens'),
    value: tokenStr,
    note: ui.colors.dim(`(${contextInfo})`),
  };
  lines.push(...ui.renderGrid([tokenRow]));

  // If targeting a specific provider, show that
  if (targetProvider) {
    const estimate = calculateCost(estimatedTokens, targetProvider);
    if (estimate) {
      const costStr = `$${estimate.inputCost.toFixed(4)}`;
      const utilStr = `${estimate.utilizationPercent.toFixed(0)}% of context`;
      const icon = estimate.withinContextWindow
        ? ui.colors.success(ui.symbols.check)
        : ui.colors.error(ui.symbols.cross);
      lines.push(`  ${icon} ${ui.padVisible(estimate.displayName, 18)} ${costStr}  ${ui.colors.dim(utilStr)}`);
    }
  }

  lines.push('');
  return lines;
}

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

/**
 * Build a GenerationSummaryModel from scan results and options
 */
export function buildSummaryModel(
  scan: ScanResult,
  options: ResolvedOptions,
  estimatedTokens: number
): GenerationSummaryModel {
  // Calculate language breakdown
  const languages = calculateLanguageBreakdown(scan.files);
  const langItems = languages.slice(0, 4).map(l => ({ name: l.name, percent: l.percent }));

  // Calculate role breakdown
  const roles = calculateRoleBreakdown(scan.files);
  const roleItems: Array<{ name: string; percent: number }> = [];
  if (roles.source > 0) roleItems.push({ name: 'Src', percent: roles.source });
  if (roles.test > 0) roleItems.push({ name: 'Tests', percent: roles.test });
  if (roles.docs > 0) roleItems.push({ name: 'Docs', percent: roles.docs });
  if (roles.config > 0) roleItems.push({ name: 'Config', percent: roles.config });

  // Build options list
  const optionItems: ui.OptionItem[] = [
    { label: 'Strip comments', enabled: options.stripComments },
    { label: 'Directory tree view', enabled: options.withTree },
    { label: 'Statistics section', enabled: options.withStats },
  ];

  // Build token info if enabled
  const tokenInfo = options.tokenCount
    ? {
        tokens: estimatedTokens,
        targetProvider: options.targetProvider,
      }
    : undefined;

  return {
    filesSelected: scan.files.length,
    totalBytes: scan.totalBytes,
    estimatedLines: estimateLinesOfCode(scan.totalBytes),
    outputFile: options.outFile,
    composition: {
      languages: langItems,
      roles: roleItems,
    },
    options: optionItems,
    tokenInfo,
  };
}

/**
 * Display generation summary with repo-first layout
 * This puts bundle profile at the top and LLM info as secondary
 */
export function displayGenerationSummary(
  scan: ScanResult,
  options: ResolvedOptions,
  estimatedTokens: number
): void {
  const model = buildSummaryModel(scan, options, estimatedTokens);
  const lines = renderGenerationSummary(model);

  for (const line of lines) {
    console.log(line);
  }
}

/**
 * Display minimal context fit information
 * Shows just the essential LLM info without detailed provider breakdown
 */
export function displayContextFit(
  estimatedTokens: number,
  options: ResolvedOptions
): void {
  console.log(ui.colors.dim('  Context Fit'));
  console.log(ui.colors.muted('  ' + ui.symbols.line.repeat(45)));

  // Token count with context fit indicators
  const tokenStr = ui.tokenCount(estimatedTokens);

  // Check common context window sizes
  const fits128k = estimatedTokens <= 128_000;
  const fits32k = estimatedTokens <= 32_000;

  let contextInfo = '';
  if (fits32k) {
    contextInfo = ui.colors.success('fits 32K ctx');
  } else if (fits128k) {
    contextInfo = ui.colors.accent('fits 128K ctx; too large for 32K');
  } else {
    contextInfo = ui.colors.warning('exceeds 128K ctx');
  }

  console.log(`  Estimated tokens     ${tokenStr}       ${ui.colors.dim(`(${contextInfo})`)}`);

  // If targeting a specific provider, show that
  if (options.targetProvider) {
    const estimate = calculateCost(estimatedTokens, options.targetProvider);
    if (estimate) {
      const costStr = `$${estimate.inputCost.toFixed(4)}`;
      const utilStr = `${estimate.utilizationPercent.toFixed(0)}% of context`;
      const icon = estimate.withinContextWindow
        ? ui.colors.success(ui.symbols.check)
        : ui.colors.error(ui.symbols.cross);
      console.log(`  ${icon} ${estimate.displayName.padEnd(18)} ${costStr}  ${ui.colors.dim(utilStr)}`);
    }
  }

  console.log('');
}

/**
 * Display detailed LLM analysis (on-demand)
 * Shows full provider table with costs and utilization
 */
export function displayDetailedLLMAnalysis(output: string, options: ResolvedOptions): void {
  const context: TokenAnalysisContext = {
    profileUsed: options.profileExplicitlySet,
    maxSizeUsed: options.maxSizeExplicitlySet,
  };
  const analysis = analyzeTokenUsage(output, context);

  console.log(ui.section('LLM Analysis'));
  console.log(ui.keyValue('Estimated tokens', ui.tokenCount(analysis.estimatedTokens)));
  console.log('');

  // Provider comparison table
  console.log(ui.colors.dim('  Provider             Cost         Context Utilization'));
  console.log(ui.colors.muted('  ' + ui.symbols.line.repeat(58)));

  const topProviders = ['claude-haiku', 'claude-sonnet', 'gpt-4o', 'gemini'];
  const estimates = topProviders
    .map(name => calculateCost(analysis.estimatedTokens, name))
    .filter((e): e is NonNullable<typeof e> => e !== null && e !== undefined)
    .sort((a, b) => a.inputCost - b.inputCost);

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

  // Warnings
  if (analysis.warnings.length > 0) {
    console.log('');
    console.log(ui.colors.warning.bold('  Warnings'));
    for (const warning of analysis.warnings) {
      console.log(ui.bullet(ui.colors.warning(warning)));
    }
  }

  // Recommendations
  if (analysis.recommendations.length > 0) {
    console.log('');
    console.log(ui.colors.info.bold('  Recommendations'));
    for (const rec of analysis.recommendations) {
      console.log(ui.bullet(ui.colors.dim(rec)));
    }
  }

  console.log('');
}

/**
 * Display top directories breakdown
 */
export function displayTopDirectories(scan: ScanResult): void {
  const topDirs = calculateTopDirectories(scan.files);
  if (topDirs.length === 0) {return;}

  console.log(ui.colors.dim('  Top directories by size'));
  for (const dir of topDirs) {
    console.log(ui.directoryBreakdown(dir.path, dir.percent));
  }
  console.log('');
}

/**
 * Display language breakdown with visual bars
 */
export function displayLanguageBreakdown(scan: ScanResult): void {
  const languages = calculateLanguageBreakdown(scan.files);
  if (languages.length === 0) {return;}

  console.log(ui.colors.dim('  Languages'));
  for (const lang of languages.slice(0, 5)) {
    console.log(ui.languageBar(lang.name, lang.percent));
  }
  console.log('');
}
