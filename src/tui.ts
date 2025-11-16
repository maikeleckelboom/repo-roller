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
import { estimateTokens, calculateCost } from './core/tokens.js';
import { formatBytes } from './core/helpers.js';
import { displayDetailedLLMAnalysis } from './cli/display.js';
import { renderGenerationSummary } from './core/dashboard.js';
import { getModelPreset } from './core/modelPresets.js';
import { renderPromptHelper } from './core/promptHelper.js';
import { recordHistoryEntry } from './core/history.js';

/**
 * Run interactive TUI mode
 */
export async function runInteractive(options: ResolvedOptions): Promise<void> {
  console.log('🎨 Interactive Mode\n');

  const startTime = Date.now();

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

  // Get model preset if specified
  const modelPreset = updatedOptions.modelPreset ? getModelPreset(updatedOptions.modelPreset) : undefined;

  // Display repo-first generation summary using new dashboard (detailed mode for interactive)
  const dashboardLines = renderGenerationSummary(
    { scan, options: updatedOptions, estimatedTokens, modelPreset },
    { mode: 'detailed' }
  );
  for (const line of dashboardLines) {
    console.log(line);
  }

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

  // Calculate cost for history
  const costEstimate = modelPreset
    ? calculateCost(estimatedTokens, modelPreset.name)
    : calculateCost(estimatedTokens, 'claude-sonnet');
  const estimatedCost = costEstimate?.inputCost;

  // Record to history
  const duration = Date.now() - startTime;
  await recordHistoryEntry({
    resolvedOptions: updatedOptions,
    cliArgs: process.argv.slice(2),
    selectedFiles: scan.files,
    estimatedTokens,
    estimatedCost,
    duration,
  }).catch(() => {
    // Don't fail on history errors in interactive mode
  });

  console.log('');

  // Display detailed LLM analysis only if --llm flag is set
  if (options.showLLMReport) {
    displayDetailedLLMAnalysis(output, updatedOptions);
  }

  // Display prompt helper if requested
  if (updatedOptions.showPromptHelper) {
    const promptLines = renderPromptHelper(scan);
    for (const line of promptLines) {
      console.log(line);
    }
  }

  console.log(ui.separator());
}
