/**
 * CLI Execution Modes
 *
 * Functions for different execution modes: preview (dry-run/stats) and non-interactive.
 */

import { writeFile } from 'node:fs/promises';
import type { ResolvedOptions } from '../core/types.js';
import { scanFiles } from '../core/scan.js';
import { render } from '../core/render.js';
import { estimateTokens, calculateCost } from '../core/tokens.js';
import { formatBytes } from '../core/helpers.js';
import * as ui from '../core/ui.js';
import { applyBudgetConstraints } from './budget.js';
import { displayBudgetSummary, displayTokenAnalysis, displayNoFilesError, displayGenerationSummary, displayDetailedLLMAnalysis } from './display.js';

/**
 * Run preview mode (dry-run or stats-only)
 *
 * @param options - Resolved CLI options
 */
export async function runPreview(options: ResolvedOptions): Promise<void> {
  console.log(ui.header());
  console.log(ui.status('scan', `Scanning ${ui.colors.primary(options.root)}`));

  // Show git filtering status if active
  if (options.gitSince) {
    console.log(ui.status('git', `Filtering to files changed since ${ui.colors.accent(options.gitSince)}`));
  } else if (options.gitStaged) {
    console.log(ui.status('git', `Filtering to ${ui.colors.accent('staged')} files only`));
  } else if (options.gitUnstaged) {
    console.log(ui.status('git', `Filtering to ${ui.colors.accent('unstaged')} changes only`));
  } else if (options.gitChanged) {
    console.log(ui.status('git', `Filtering to ${ui.colors.accent('changed')} files (staged + unstaged)`));
  }

  console.log('');

  // Scan files
  const scan = await scanFiles(options);

  if (scan.files.length === 0) {
    displayNoFilesError(options);
    process.exit(1);
  }

  if (options.statsOnly) {
    // Stats only mode
    console.log(ui.section('Statistics'));
    console.log(ui.keyValue('Total files', ui.colors.primary(scan.files.length.toString())));
    console.log(ui.keyValue('Total size', formatBytes(scan.totalBytes)));
    console.log('');

    if (Object.keys(scan.extensionCounts).length > 0) {
      console.log(ui.colors.dim('  Extensions'));
      console.log(ui.colors.muted('  ' + ui.symbols.line.repeat(30)));
      const sorted = Object.entries(scan.extensionCounts)
        .sort(([, a], [, b]) => b - a);
      for (const [ext, count] of sorted) {
        const extLabel = ext || '(no extension)';
        console.log(ui.keyValue(`  ${extLabel}`, `${count} file${count !== 1 ? 's' : ''}`));
      }
    }
  } else {
    // Dry run mode - show what would be included
    console.log(ui.section('Preview'));
    console.log(ui.colors.dim(`  Would include ${ui.colors.primary(scan.files.length.toString())} files`));
    console.log('');

    const maxDisplay = 20;
    const filesToShow = scan.files.slice(0, maxDisplay);

    for (const file of filesToShow) {
      console.log(`  ${ui.colors.success(ui.symbols.check)} ${ui.colors.muted(file.relativePath)} ${ui.colors.dim(`(${formatBytes(file.sizeBytes)})`)}`);
    }

    if (scan.files.length > maxDisplay) {
      console.log('');
      console.log(ui.colors.dim(`  ${ui.symbols.ellipsis} and ${scan.files.length - maxDisplay} more files`));
    }

    console.log('');
    console.log(ui.keyValue('Total', `${scan.files.length} files, ${formatBytes(scan.totalBytes)}`));

    // Show estimated token count
    if (options.tokenCount) {
      const output = await render(scan, options);
      const tokens = estimateTokens(output);
      console.log(ui.keyValue('Estimated tokens', ui.tokenCount(tokens)));

      // Quick provider check
      const claudeEstimate = calculateCost(tokens, 'claude-sonnet');
      if (claudeEstimate) {
        console.log(ui.providerRow(
          'Claude Sonnet',
          `$${claudeEstimate.inputCost.toFixed(4)} (${claudeEstimate.utilizationPercent.toFixed(1)}% of context)`,
          claudeEstimate.withinContextWindow,
          true
        ));
      }
    }

    console.log('');
    console.log(ui.colors.dim('  Run without --dry-run to generate output'));
  }
  console.log('');
}

/**
 * Run non-interactive mode
 *
 * @param options - Resolved CLI options
 */
export async function runNonInteractive(options: ResolvedOptions): Promise<void> {
  // Show modern header
  console.log(ui.header());

  console.log(ui.status('scan', `Scanning ${ui.colors.primary(options.root)}`));

  // Show git filtering status if active
  if (options.gitSince) {
    console.log(ui.status('git', `Filtering to files changed since ${ui.colors.accent(options.gitSince)}`));
  } else if (options.gitStaged) {
    console.log(ui.status('git', `Filtering to ${ui.colors.accent('staged')} files only`));
  } else if (options.gitUnstaged) {
    console.log(ui.status('git', `Filtering to ${ui.colors.accent('unstaged')} changes only`));
  } else if (options.gitChanged) {
    console.log(ui.status('git', `Filtering to ${ui.colors.accent('changed')} files (staged + unstaged)`));
  }

  // Scan files
  let scan = await scanFiles(options);

  if (scan.files.length === 0) {
    displayNoFilesError(options);
    process.exit(1);
  }

  console.log(ui.success(`Found ${ui.colors.primary(scan.files.length.toString())} files ${ui.colors.dim(`(${formatBytes(scan.totalBytes)})`)}`));

  // Apply token/cost budget constraints if specified
  const budgetResult = await applyBudgetConstraints(scan, options);
  if (budgetResult) {
    scan = {
      ...scan,
      files: budgetResult.selectedFiles,
      totalBytes: budgetResult.selectedFiles.reduce((sum, f) => sum + f.sizeBytes, 0),
    };
    displayBudgetSummary(budgetResult);
  }

  // Render output
  const formatLabel = options.format.toUpperCase();
  console.log(ui.status('render', `Rendering ${ui.colors.accent(formatLabel)} output`));
  const output = await render(scan, options);

  // Write output
  await writeFile(options.outFile, output, 'utf-8');

  console.log(ui.status('write', `Output written to ${ui.colors.success(options.outFile)}`));

  // Display repo-first generation summary with minimal LLM info
  const estimatedTokens = estimateTokens(output);
  displayGenerationSummary(scan, options, estimatedTokens);

  // Display detailed LLM analysis only if --llm flag is set
  if (options.showLLMReport) {
    displayDetailedLLMAnalysis(output, options);
  }

  console.log(ui.separator());
}
