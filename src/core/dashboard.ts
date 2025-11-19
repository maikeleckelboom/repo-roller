/**
 * @module core/dashboard
 *
 * Generation Summary Dashboard
 *
 * OWNS:
 * - Dashboard rendering logic (generation summary, code composition, context fit)
 * - Layout and formatting of summary sections with aligned labels and bars
 * - Health hints generation based on bundle composition
 * - Delta comparison vs previous runs
 *
 * DOES NOT OWN:
 * - Filesystem I/O (no file reading or writing)
 * - Color/symbol definitions (uses ui.ts primitives)
 * - Token calculation (uses tokens.ts)
 * - Model preset logic (uses modelPresets.ts)
 *
 * DESIGN PRINCIPLES:
 * - Pure presentation layer - takes data, returns formatted strings
 * - Consistent spacing and alignment across all sections
 * - Respects display settings for conditional rendering
 * - No side effects, easily testable
 *
 * Shared dashboard rendering for both interactive and non-interactive modes.
 * Features:
 * - Detailed vs compact modes with clean, aligned sections
 * - Colored language and role bars with consistent spacing
 * - Health hints and context-fit indicators
 * - Delta tracking vs previous runs
 */

import * as ui from './ui.js';
import { formatBytes, calculateLanguageBreakdown, calculateRoleBreakdown, estimateLinesOfCode } from './helpers.js';
import type { ScanResult, ResolvedOptions } from './types.js';
import { estimateTokens } from './tokens.js';
import { getModelPreset, calculatePresetCost, calculateEffectiveBudget, getModelWarnings } from './modelPresets.js';
import type { ModelPreset } from './modelPresets.js';

export interface DashboardDisplaySettings {
  showGenerationSummary: boolean;
  showCodeComposition: boolean;
  showContextFit: boolean;
  showHealthHints: boolean;
  showTokenWarnings: boolean;
  showCostEstimates: boolean;
  showRecommendations: boolean;
}

export interface DashboardOptions {
  mode: 'detailed' | 'compact';
  previousRun?: PreviousRunData;
  showPromptHelper?: boolean;
  displaySettings?: DashboardDisplaySettings;
}

export interface PreviousRunData {
  fileCount: number;
  totalBytes: number;
  estimatedTokens: number;
  timestamp: string;
}

export interface DashboardData {
  scan: ScanResult;
  options: ResolvedOptions;
  estimatedTokens: number;
  modelPreset?: ModelPreset;
}

/**
 * Render the generation summary dashboard
 */
export function renderGenerationSummary(
  data: DashboardData,
  dashboardOptions: DashboardOptions = { mode: 'compact' }
): string[] {
  const lines: string[] = [];
  const { scan, options, estimatedTokens, modelPreset } = data;
  const { mode, previousRun } = dashboardOptions;

  // Get display settings with defaults
  const displaySettings: DashboardDisplaySettings = {
    showGenerationSummary: true,
    showCodeComposition: true,
    showContextFit: true,
    showHealthHints: true,
    showTokenWarnings: true,
    showCostEstimates: true,
    showRecommendations: true,
    ...dashboardOptions.displaySettings,
  };

  // If generation summary is completely hidden, return minimal output
  if (!displaySettings.showGenerationSummary) {
    return lines;
  }

  // Section header
  lines.push('');
  lines.push(ui.colors.primary.bold('Generation Summary'));
  lines.push(ui.colors.muted(ui.symbols.line.repeat(30)));

  // Core metrics (always show basic metrics)
  lines.push(...renderCoreMetrics(scan, options, estimatedTokens, previousRun));
  lines.push('');

  // Code composition with colored bars
  if (displaySettings.showCodeComposition) {
    lines.push(...renderCodeComposition(scan.files, mode));
    lines.push('');
  }

  // Context fit section
  if (displaySettings.showContextFit) {
    lines.push(...renderContextFit(estimatedTokens, options, modelPreset, displaySettings));
    lines.push('');
  }

  // Health hints
  if (displaySettings.showHealthHints) {
    const healthHints = generateHealthHints(scan, estimatedTokens, modelPreset);
    if (healthHints.length > 0) {
      lines.push(...renderHealthHints(healthHints));
      lines.push('');
    }
  }

  // Options summary (detailed mode only)
  if (mode === 'detailed') {
    lines.push(...renderOptionsSection(options));
    lines.push('');
  }

  return lines;
}

/**
 * Render core metrics with optional delta comparison
 */
function renderCoreMetrics(
  scan: ScanResult,
  options: ResolvedOptions,
  estimatedTokens: number,
  previousRun?: PreviousRunData
): string[] {
  const lines: string[] = [];
  const labelWidth = 18;

  // Files selected with delta
  let filesLine = ui.keyValue('Files selected', ui.colors.primary(scan.files.length.toString()), labelWidth);
  if (previousRun) {
    const delta = scan.files.length - previousRun.fileCount;
    if (delta !== 0) {
      const deltaStr = delta > 0 ? `+${delta}` : `${delta}`;
      const deltaColor = delta > 0 ? ui.colors.warning : ui.colors.success;
      filesLine += ` ${deltaColor(`(${deltaStr})`)}`;
    }
  }
  lines.push(filesLine);

  // Total size with delta
  let sizeLine = ui.keyValue('Total size', formatBytes(scan.totalBytes), labelWidth);
  if (previousRun) {
    const delta = scan.totalBytes - previousRun.totalBytes;
    if (delta !== 0) {
      const deltaStr = delta > 0 ? `+${formatBytes(delta)}` : `-${formatBytes(Math.abs(delta))}`;
      const deltaColor = delta > 0 ? ui.colors.warning : ui.colors.success;
      sizeLine += ` ${deltaColor(`(${deltaStr})`)}`;
    }
  }
  lines.push(sizeLine);

  // Lines of code
  lines.push(ui.keyValue('Lines of code', `~${formatNumber(estimateLinesOfCode(scan.totalBytes))}`, labelWidth));

  // Estimated tokens with delta
  let tokensLine = ui.keyValue('Estimated tokens', ui.tokenCount(estimatedTokens), labelWidth);
  if (previousRun) {
    const delta = estimatedTokens - previousRun.estimatedTokens;
    if (Math.abs(delta) > 100) {
      const deltaStr = delta > 0 ? `+${formatNumber(delta)}` : `${formatNumber(delta)}`;
      const deltaColor = delta > 0 ? ui.colors.warning : ui.colors.success;
      tokensLine += ` ${deltaColor(`(${deltaStr})`)}`;
    }
  }
  lines.push(tokensLine);

  // Output file
  lines.push(ui.keyValue('Output file', ui.colors.success(options.outFile), labelWidth));

  return lines;
}

/**
 * Render code composition with language and role bars
 */
function renderCodeComposition(
  files: readonly { readonly relativePath: string; readonly sizeBytes: number; readonly extension: string }[],
  mode: 'detailed' | 'compact'
): string[] {
  const lines: string[] = [];
  lines.push('');
  lines.push(ui.colors.primary.bold('Code Composition'));
  lines.push(ui.colors.muted(ui.symbols.line.repeat(30)));

  const languages = calculateLanguageBreakdown(files);
  const roles = calculateRoleBreakdown(files);

  if (mode === 'detailed') {
    // Show languages and roles separately with more detail
    if (languages.length > 0) {
      lines.push('  ' + ui.colors.dim('Languages'));
      for (const lang of languages.slice(0, 5)) {
        lines.push(renderColoredBar(lang.name, lang.percent, 'language', 10));
      }
      lines.push('');
    }

    if (roles.source + roles.test + roles.docs + roles.config > 0) {
      lines.push('  ' + ui.colors.dim('Roles'));
      if (roles.source > 0) {
        lines.push(renderColoredBar('Source', roles.source, 'role-source', 10));
      }
      if (roles.test > 0) {
        lines.push(renderColoredBar('Tests', roles.test, 'role-test', 10));
      }
      if (roles.docs > 0) {
        lines.push(renderColoredBar('Docs', roles.docs, 'role-docs', 10));
      }
      if (roles.config > 0) {
        lines.push(renderColoredBar('Config', roles.config, 'role-config', 10));
      }
    }
  } else {
    // Compact mode: show languages first, then roles
    if (languages.length > 0) {
      lines.push('  ' + ui.colors.dim('Languages'));
      for (const lang of languages.slice(0, 3)) {
        lines.push(renderColoredBar(lang.name, lang.percent, 'language', 10));
      }
      lines.push('');
    }

    if (roles.source + roles.test + roles.docs + roles.config > 0) {
      lines.push('  ' + ui.colors.dim('Roles'));
      if (roles.source > 0) {
        lines.push(renderColoredBar('Source', roles.source, 'role-source', 10));
      }
      if (roles.test > 0) {
        lines.push(renderColoredBar('Tests', roles.test, 'role-test', 10));
      }
      if (roles.docs > 0) {
        lines.push(renderColoredBar('Docs', roles.docs, 'role-docs', 10));
      }
      if (roles.config > 0) {
        lines.push(renderColoredBar('Config', roles.config, 'role-config', 10));
      }
    }
  }

  return lines;
}

/**
 * Render a single colored bar based on type
 */
function renderColoredBar(name: string, percent: number, type: string, barWidth = 10): string {
  const nameWidth = 13;
  const filled = Math.round((percent / 100) * barWidth);
  const empty = barWidth - filled;

  let barColor = ui.colors.primary;

  // Color based on type
  if (type === 'language') {
    barColor = ui.colors.secondary;
  } else if (type === 'role-source') {
    barColor = ui.colors.success;
  } else if (type === 'role-test') {
    barColor = ui.colors.accent;
  } else if (type === 'role-docs') {
    barColor = ui.colors.info;
  } else if (type === 'role-config') {
    barColor = ui.colors.warning;
  }

  // Sanitize name by removing any newlines, tabs, or other whitespace characters
  const sanitizedName = name.replace(/[\r\n\t]/g, ' ').trim();

  const bar = barColor('█'.repeat(filled)) + ui.colors.dim('░'.repeat(empty));
  const nameFormatted = sanitizedName.padEnd(nameWidth);
  const pct = `${percent.toFixed(0)}%`.padStart(4);

  return `    ${nameFormatted} ${bar} ${pct}`;
}

/**
 * Render compact colored bars in grid layout
 */
function compactColoredBarsGrid(
  items: { name: string; percent: number; type: string }[],
  barWidth = 8
): string[] {
  const lines: string[] = [];
  const nameWidth = 10;
  const pctWidth = 4;

  for (let i = 0; i < items.length; i += 2) {
    const item1 = items[i];
    if (!item1) {continue;}

    // Sanitize names to prevent alignment issues
    const name1 = item1.name.replace(/[\r\n\t]/g, ' ').trim();

    const filled1 = Math.round((item1.percent / 100) * barWidth);
    const empty1 = barWidth - filled1;
    const bar1 = getBarColor(item1.type)('█'.repeat(filled1)) + ui.colors.dim('░'.repeat(empty1));
    const pct1 = ui.colors.dim(`${item1.percent.toFixed(0)}%`.padStart(pctWidth));
    const col1 = `${name1.padEnd(nameWidth)} ${bar1} ${pct1}`;

    if (i + 1 < items.length) {
      const item2 = items[i + 1];
      if (!item2) {continue;}

      // Sanitize names to prevent alignment issues
      const name2 = item2.name.replace(/[\r\n\t]/g, ' ').trim();

      const filled2 = Math.round((item2.percent / 100) * barWidth);
      const empty2 = barWidth - filled2;
      const bar2 = getBarColor(item2.type)('█'.repeat(filled2)) + ui.colors.dim('░'.repeat(empty2));
      const pct2 = ui.colors.dim(`${item2.percent.toFixed(0)}%`.padStart(pctWidth));
      const col2 = `${name2.padEnd(nameWidth)} ${bar2} ${pct2}`;
      lines.push(`    ${col1}  ${col2}`);
    } else {
      lines.push(`    ${col1}`);
    }
  }

  return lines;
}

/**
 * Get bar color based on type
 */
function getBarColor(type: string): (str: string) => string {
  switch (type) {
    case 'language':
      return ui.colors.secondary;
    case 'role-source':
      return ui.colors.success;
    case 'role-test':
      return ui.colors.accent;
    case 'role-docs':
      return ui.colors.info;
    case 'role-config':
      return ui.colors.warning;
    default:
      return ui.colors.primary;
  }
}

/**
 * Render context fit section
 */
function renderContextFit(
  estimatedTokens: number,
  options: ResolvedOptions,
  modelPreset?: ModelPreset,
  displaySettings?: DashboardDisplaySettings
): string[] {
  const lines: string[] = [];
  const showCost = displaySettings?.showCostEstimates ?? true;
  const showWarnings = displaySettings?.showTokenWarnings ?? true;

  lines.push('');
  lines.push(ui.colors.primary.bold('Context Fit'));
  lines.push(ui.colors.muted(ui.symbols.line.repeat(30)));

  if (modelPreset) {
    // Show specific model preset info
    const costInfo = calculatePresetCost(estimatedTokens, modelPreset);
    const effectiveBudget = calculateEffectiveBudget(modelPreset);

    const budgetStr = formatNumber(effectiveBudget);
    const tokenStr = ui.tokenCount(estimatedTokens);

    let statusIcon: string;
    let statusText: string;

    if (costInfo.warningLevel === 'safe') {
      statusIcon = ui.colors.success(ui.symbols.check);
      statusText = ui.colors.success(`fits ${modelPreset.displayName}`);
    } else if (costInfo.warningLevel === 'caution') {
      statusIcon = ui.colors.warning(ui.symbols.warning);
      statusText = ui.colors.warning(`tight fit`);
    } else {
      statusIcon = ui.colors.error(ui.symbols.cross);
      statusText = ui.colors.error(`exceeds budget`);
    }

    lines.push(`  ${statusIcon} ${tokenStr} / ${budgetStr} ${ui.colors.dim(`(${costInfo.utilizationPercent.toFixed(0)}%)`)} · ${statusText}`);

    if (showCost) {
      lines.push(`  ${ui.colors.dim(`Cost: $${costInfo.inputCost.toFixed(4)}`)}`);
    }

    // Show warnings if any (only first warning to save space)
    if (showWarnings) {
      const warnings = getModelWarnings(estimatedTokens, modelPreset);
      if (warnings.length > 0) {
        lines.push(`  ${ui.colors.warning(ui.symbols.warning)} ${ui.colors.dim(warnings[0])}`);
      }
    }
  } else {
    // Generic context fit check
    const fits32k = estimatedTokens <= 32_000;
    const fits128k = estimatedTokens <= 128_000;
    const fits200k = estimatedTokens <= 200_000;

    let contextInfo: string;
    if (fits32k) {
      contextInfo = ui.colors.success(`${ui.symbols.check} fits all models`);
    } else if (fits128k) {
      contextInfo = ui.colors.accent(`${ui.symbols.check} fits 128K+`);
    } else if (fits200k) {
      contextInfo = ui.colors.warning(`${ui.symbols.warning} needs 200K`);
    } else {
      contextInfo = ui.colors.error(`${ui.symbols.cross} exceeds most`);
    }

    lines.push(`  ${ui.tokenCount(estimatedTokens)} · ${contextInfo}`);
    lines.push(`  ${ui.colors.dim('Tip: Use --model to see cost estimates')}`);
  }

  return lines;
}

/**
 * Generate health hints based on bundle composition
 */
function generateHealthHints(
  scan: ScanResult,
  estimatedTokens: number,
  modelPreset?: ModelPreset
): string[] {
  const hints: string[] = [];

  // Check for large file count
  if (scan.files.length > 100) {
    hints.push('Large file count may dilute focus - consider using profiles');
  }

  // Check for token density
  const avgTokensPerFile = estimatedTokens / scan.files.length;
  if (avgTokensPerFile > 5000) {
    hints.push('High avg tokens/file - consider --strip-comments or smaller files');
  }

  // Check role balance
  const roles = calculateRoleBreakdown(scan.files);
  if (roles.test > 50) {
    hints.push('Test-heavy bundle - consider --no-tests for code-focused analysis');
  }
  if (roles.config > 30) {
    hints.push('Config-heavy bundle - may want to focus on source code');
  }

  // Model-specific hints
  if (modelPreset) {
    const costInfo = calculatePresetCost(estimatedTokens, modelPreset);
    if (costInfo.utilizationPercent > 80 && costInfo.utilizationPercent <= 100) {
      hints.push('Near context limit - LLM response space is limited');
    }
  }

  return hints;
}

/**
 * Render health hints section
 */
function renderHealthHints(hints: string[]): string[] {
  const lines: string[] = [];
  lines.push(ui.colors.info.bold('  Health Hints'));

  for (const hint of hints) {
    lines.push(`  ${ui.colors.info(ui.symbols.info)} ${ui.colors.dim(hint)}`);
  }

  return lines;
}

/**
 * Render options section
 */
function renderOptionsSection(options: ResolvedOptions): string[] {
  const lines: string[] = [];
  lines.push(ui.colors.dim('  Options'));
  lines.push(ui.colors.muted('  ' + ui.symbols.line.repeat(30)));
  lines.push(`  ${options.stripComments ? ui.colors.success(ui.symbols.check) : ui.colors.error(ui.symbols.cross)} Strip comments`);
  lines.push(`  ${options.withTree ? ui.colors.success(ui.symbols.check) : ui.colors.error(ui.symbols.cross)} Directory tree view`);
  lines.push(`  ${options.withStats ? ui.colors.success(ui.symbols.check) : ui.colors.error(ui.symbols.cross)} Statistics section`);
  lines.push(`  ${options.toc ? ui.colors.success(ui.symbols.check) : ui.colors.error(ui.symbols.cross)} Table of contents`);

  return lines;
}

/**
 * Format number with commas
 */
function formatNumber(num: number): string {
  return num.toLocaleString();
}

/**
 * Save run data for delta comparison
 */
export interface RunDataRecord {
  fileCount: number;
  totalBytes: number;
  estimatedTokens: number;
  timestamp: string;
  outFile: string;
}

/**
 * Create run data record from current state
 */
export function createRunDataRecord(
  scan: ScanResult,
  estimatedTokens: number,
  outFile: string
): RunDataRecord {
  return {
    fileCount: scan.files.length,
    totalBytes: scan.totalBytes,
    estimatedTokens,
    timestamp: new Date().toISOString(),
    outFile,
  };
}
