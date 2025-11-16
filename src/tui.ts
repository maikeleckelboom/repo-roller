import { writeFile } from 'node:fs/promises';
import { render } from 'ink';
import React from 'react';
import type { ResolvedOptions, ScanResult } from './core/types.js';
import { scanFiles } from './core/scan.js';
import { render as renderOutput } from './core/render.js';
import { CustomTreeSelect } from './components/CustomTreeSelect.js';
import { Confirm } from './components/Confirm.js';
import { loadUserSettings, saveUserSettings } from './core/userSettings.js';
import * as ui from './core/ui.js';
import { estimateTokens, calculateCost, analyzeTokenUsage } from './core/tokens.js';
import type { TokenAnalysisContext } from './core/tokens.js';
import { formatBytes } from './core/helpers.js';

/**
 * Run interactive TUI mode
 */
export async function runInteractive(options: ResolvedOptions): Promise<void> {
  console.log('🎨 Interactive Mode\n');

  // Load user preferences for defaults
  const userSettings = await loadUserSettings();

  // Initial scan
  console.log(`🔍 Scanning files in ${options.root}...`);
  let scan = await scanFiles(options);
  const defaultIncludedCount = scan.files.filter(f => f.isDefaultIncluded).length;
  console.log(`✅ Found ${scan.files.length} files (${defaultIncludedCount} pre-selected, ${formatBytes(scan.totalBytes)})\n`);

  if (scan.files.length === 0) {
    console.log('No files found matching the criteria.');
    return;
  }

  let selectedPaths: string[];

  // If --yes flag is set, skip file selection and use all pre-selected files
  if (options.yes) {
    selectedPaths = scan.files.filter(f => f.isDefaultIncluded).map(f => f.relativePath);
    console.log(`⚡ Using ${selectedPaths.length} pre-selected files (--yes mode)\n`);
  } else {
    // File selection using Ink TUI
    let inkExitPromise: Promise<void> | undefined;
    selectedPaths = await new Promise<string[]>((resolve) => {
      const { waitUntilExit } = render(
        React.createElement(CustomTreeSelect, {
          files: scan.files,
          onComplete: (paths: string[]) => {
            resolve(paths);
          },
        })
      );

      inkExitPromise = waitUntilExit().catch(() => {
        // Ignore exit errors
      });
    });

    // Wait for Ink to fully exit before continuing
    if (inkExitPromise) {
      await inkExitPromise;
    }
  }

  if (selectedPaths.length === 0) {
    console.log('No files selected. Exiting.');
    return;
  }

  // Filter scan results to only selected files
  const selectedFiles = scan.files.filter((f) => selectedPaths.includes(f.relativePath));
  const selectedTotalBytes = selectedFiles.reduce((sum, f) => sum + f.sizeBytes, 0);

  // Extension counts for selected files
  const selectedExtCounts: Record<string, number> = {};
  for (const file of selectedFiles) {
    selectedExtCounts[file.extension] = (selectedExtCounts[file.extension] ?? 0) + 1;
  }

  scan = {
    files: selectedFiles,
    totalBytes: selectedTotalBytes,
    rootPath: scan.rootPath,
    extensionCounts: selectedExtCounts,
  };

  // Helper function to prompt for confirmation using Ink
  const promptConfirm = async (message: string, defaultValue: boolean): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      const { waitUntilExit } = render(
        React.createElement(Confirm, {
          message,
          defaultValue,
          onSubmit: (value: boolean) => {
            resolve(value);
          },
        })
      );

      waitUntilExit().catch(() => {
        // Ignore exit errors
      });
    });
  };

  // Determine final options for strip/tree/stats
  // Priority: user settings > preset/config defaults
  let stripComments: boolean;
  let withTree: boolean;
  let withStats: boolean;

  if (options.yes) {
    // Use saved preferences or defaults (skip all prompts)
    stripComments = userSettings.stripComments ?? options.stripComments;
    withTree = userSettings.withTree ?? options.withTree;
    withStats = userSettings.withStats ?? options.withStats;
    console.log('⚡ Using saved preferences (--yes mode)');
    console.log(`  Strip comments: ${stripComments ? 'Yes' : 'No'}`);
    console.log(`  Include tree: ${withTree ? 'Yes' : 'No'}`);
    console.log(`  Include stats: ${withStats ? 'Yes' : 'No'}\n`);
  } else {
    // Interactive prompts with user preferences as defaults
    console.log('');
    const defaultStripComments = userSettings.stripComments ?? options.stripComments;
    stripComments = await promptConfirm('Strip comments from source files?', defaultStripComments);

    const defaultWithTree = userSettings.withTree ?? options.withTree;
    withTree = await promptConfirm('Include directory tree view?', defaultWithTree);

    const defaultWithStats = userSettings.withStats ?? options.withStats;
    withStats = await promptConfirm('Include statistics section?', defaultWithStats);

    // Save user preferences for next time
    await saveUserSettings({
      stripComments,
      withTree,
      withStats,
    });
  }

  // Update options with user selections
  const updatedOptions: ResolvedOptions = {
    ...options,
    stripComments,
    withTree,
    withStats,
  };

  // Pre-render to get accurate token count for summary
  const previewOutput = await renderOutput(scan, updatedOptions);
  const estimatedTokens = estimateTokens(previewOutput);

  // Display beautiful summary matching non-interactive style
  displayInteractiveSummary(scan, updatedOptions, estimatedTokens);

  let shouldGenerate: boolean;
  if (options.yes) {
    // Skip confirmation in --yes mode
    shouldGenerate = true;
    console.log(ui.colors.accent('  Auto-generating (--yes mode)...'));
  } else {
    shouldGenerate = await promptConfirm('Press ENTER to generate, or N to cancel', true);
  }

  if (!shouldGenerate) {
    console.log(ui.colors.dim('\n  Cancelled.'));
    return;
  }

  // Generate output using the format-aware render function
  const formatLabel = updatedOptions.format.toUpperCase();
  console.log('');
  console.log(ui.status('render', `Rendering ${ui.colors.accent(formatLabel)} output`));
  const output = previewOutput; // Use pre-rendered output

  // Write output
  await writeFile(options.outFile, output, 'utf-8');

  console.log(ui.status('write', `Output written to ${ui.colors.success(options.outFile)}`));
  console.log('');

  // Display token analysis if enabled
  if (options.tokenCount) {
    displayInteractiveTokenAnalysis(output, options);
  }

  console.log(ui.separator());
}

/**
 * Display beautiful summary for interactive mode
 */
function displayInteractiveSummary(
  scan: ScanResult,
  options: ResolvedOptions,
  estimatedTokens: number
): void {
  console.log('');
  console.log(ui.section('Generation Summary'));

  // Key metrics
  console.log(ui.keyValue('Files selected', ui.colors.primary(scan.files.length.toString())));
  console.log(ui.keyValue('Total size', ui.fileSize(scan.totalBytes)));
  console.log(ui.keyValue('Estimated tokens', ui.tokenCount(estimatedTokens)));
  console.log(ui.keyValue('Output format', ui.colors.accent(options.format.toUpperCase())));
  console.log(ui.keyValue('Output file', ui.colors.success(options.outFile)));
  console.log('');

  // Options status
  console.log(ui.colors.dim('  Options'));
  console.log(ui.colors.muted('  ' + ui.symbols.line.repeat(30)));
  console.log(`  ${options.withTree ? ui.colors.success(ui.symbols.check) : ui.colors.error(ui.symbols.cross)} Directory tree view`);
  console.log(`  ${options.withStats ? ui.colors.success(ui.symbols.check) : ui.colors.error(ui.symbols.cross)} Statistics section`);
  console.log(`  ${options.stripComments ? ui.colors.success(ui.symbols.check) : ui.colors.error(ui.symbols.cross)} Strip comments`);
  console.log('');

  // Quick cost estimate
  if (options.tokenCount) {
    console.log(ui.colors.dim('  Cost Estimates'));
    console.log(ui.colors.muted('  ' + ui.symbols.line.repeat(30)));

    const quickProviders = ['claude-haiku', 'gpt-4o'];
    for (const providerName of quickProviders) {
      const estimate = calculateCost(estimatedTokens, providerName);
      if (estimate) {
        console.log(ui.providerRow(
          estimate.displayName,
          `$${estimate.inputCost.toFixed(4)}`,
          estimate.withinContextWindow,
          false
        ));
      }
    }
    console.log('');
  }
}

/**
 * Display token analysis for interactive mode
 */
function displayInteractiveTokenAnalysis(output: string, options: ResolvedOptions): void {
  const context: TokenAnalysisContext = {
    profileUsed: options.profileExplicitlySet,
    maxSizeUsed: options.maxSizeExplicitlySet,
  };
  const analysis = analyzeTokenUsage(output, context);

  console.log(ui.section('Token Analysis'));
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
