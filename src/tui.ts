import { writeFile } from 'node:fs/promises';
import { render } from 'ink';
import React from 'react';
import { basename } from 'node:path';
import type { ResolvedOptions, ScanResult } from './core/types.js';
import { scanFiles } from './core/scan.js';
import { render as renderOutput } from './core/render.js';
import { CustomTreeSelect } from './components/CustomTreeSelect.js';
import { Confirm } from './components/Confirm.js';
import { TextInput } from './components/TextInput.js';
import { loadUserSettings, saveUserSettings, resetInteractiveSettings, DEFAULT_INTERACTIVE_SETTINGS } from './core/userSettings.js';
import * as ui from './core/ui.js';
import { estimateTokens, calculateCost } from './core/tokens.js';
import { formatBytes } from './core/helpers.js';
import { displayDetailedLLMAnalysis } from './cli/display.js';
import { renderGenerationSummary } from './core/dashboard.js';
import { getModelPreset } from './core/modelPresets.js';
import { renderPromptHelper } from './core/promptHelper.js';
import { recordHistoryEntry } from './core/history.js';
import { copyToClipboard } from './core/clipboard.js';

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
          rootPath: options.root,
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
    let result: boolean = defaultValue;
    let inkExitPromise: Promise<void> | undefined;

    await new Promise<void>((resolvePrompt) => {
      const { waitUntilExit } = render(
        React.createElement(Confirm, {
          message,
          defaultValue,
          onSubmit: (value: boolean) => {
            result = value;
            resolvePrompt();
          },
        })
      );

      inkExitPromise = waitUntilExit().catch(() => {
        // Ignore exit errors
      });
    });

    // Wait for Ink to fully exit before continuing (critical for proper tab clearing)
    if (inkExitPromise) {
      await inkExitPromise;
    }

    return result;
  };

  // Helper function to prompt for interactive mode preferences (reduces duplication)
  const promptForPreferences = async (defaults: {
    stripComments: boolean;
    withTree: boolean;
    withStats: boolean;
  }): Promise<{ stripComments: boolean; withTree: boolean; withStats: boolean }> => {
    const stripComments = await promptConfirm('Strip comments from source files?', defaults.stripComments);
    const withTree = await promptConfirm('Include directory tree view?', defaults.withTree);
    const withStats = await promptConfirm('Include statistics section?', defaults.withStats);
    return { stripComments, withTree, withStats };
  };

  // Helper function to prompt for text input using Ink
  const promptTextInput = async (prompt: string, defaultValue: string, placeholder?: string): Promise<string> => {
    let result: string = defaultValue;
    let inkExitPromise: Promise<void> | undefined;

    await new Promise<void>((resolvePrompt) => {
      const { waitUntilExit } = render(
        React.createElement(TextInput, {
          prompt,
          defaultValue,
          placeholder,
          onSubmit: (value: string) => {
            result = value;
            resolvePrompt();
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

    return result;
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
    // Check if user has saved preferences
    const hasSavedPreferences =
      userSettings.stripComments !== undefined ||
      userSettings.withTree !== undefined ||
      userSettings.withStats !== undefined;

    console.log('');
    console.log(ui.colors.accent('━━━ Output Options ━━━'));
    console.log('');

    if (hasSavedPreferences) {
      // Show saved preferences inline (non-blocking)
      console.log(ui.colors.dim('  💾 Using saved preferences:'));
      console.log(ui.colors.cyanBright(`     • Strip comments: ${userSettings.stripComments ?? DEFAULT_INTERACTIVE_SETTINGS.stripComments ? 'Yes' : 'No'}`));
      console.log(ui.colors.cyanBright(`     • Include tree: ${userSettings.withTree ?? DEFAULT_INTERACTIVE_SETTINGS.withTree ? 'Yes' : 'No'}`));
      console.log(ui.colors.cyanBright(`     • Include stats: ${userSettings.withStats ?? DEFAULT_INTERACTIVE_SETTINGS.withStats ? 'Yes' : 'No'}`));
      console.log('');

      const shouldReset = await promptConfirm('Use different settings?', false);
      if (shouldReset) {
        // Interactive prompts with current preferences as defaults
        console.log('');
        const prefs = await promptForPreferences({
          stripComments: userSettings.stripComments ?? options.stripComments,
          withTree: userSettings.withTree ?? options.withTree,
          withStats: userSettings.withStats ?? options.withStats,
        });
        stripComments = prefs.stripComments;
        withTree = prefs.withTree;
        withStats = prefs.withStats;

        // Save updated preferences
        await saveUserSettings({
          stripComments,
          withTree,
          withStats,
        });
        console.log(ui.colors.success('  ✓ Preferences updated'));
      } else {
        // Use saved preferences
        stripComments = userSettings.stripComments ?? options.stripComments;
        withTree = userSettings.withTree ?? options.withTree;
        withStats = userSettings.withStats ?? options.withStats;
      }
    } else {
      // No saved preferences - prompt for each option
      const prefs = await promptForPreferences({
        stripComments: options.stripComments,
        withTree: options.withTree,
        withStats: options.withStats,
      });
      stripComments = prefs.stripComments;
      withTree = prefs.withTree;
      withStats = prefs.withStats;

      // Save user preferences for next time
      await saveUserSettings({
        stripComments,
        withTree,
        withStats,
      });

      console.log(ui.colors.dim('  ✓ Preferences saved'));
    }
  }

  // Generate default filename: reponame_timestamp.ext
  const generateDefaultFilename = (): string => {
    const repoName = basename(options.root);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const ext = options.format === 'markdown' ? 'md' : options.format;
    return `${repoName}_${timestamp}.${ext}`;
  };

  // Prompt for output filename (unless --yes mode)
  let outFile = options.outFile;
  if (!options.yes) {
    console.log('');
    console.log(ui.colors.accent('━━━ Output File ━━━'));
    console.log('');

    const defaultFilename = generateDefaultFilename();
    const currentFilename = basename(outFile);
    const filenameToShow = currentFilename !== 'output.md' ? currentFilename : defaultFilename;

    const customFilename = await promptTextInput(
      'Enter output filename:',
      filenameToShow,
      defaultFilename
    );

    // Update outFile with the custom filename (keep directory path)
    const dir = outFile.substring(0, outFile.lastIndexOf('/'));
    outFile = dir ? `${dir}/${customFilename}` : customFilename;
  }

  // Update options with user selections
  const updatedOptions: ResolvedOptions = {
    ...options,
    outFile,
    stripComments,
    withTree,
    withStats,
  };

  // Pre-render to get accurate token count for summary
  const previewOutput = await renderOutput(scan, updatedOptions);
  const estimatedTokens = estimateTokens(previewOutput);

  // Get model preset if specified
  const modelPreset = updatedOptions.modelPreset ? getModelPreset(updatedOptions.modelPreset) : undefined;

  // Display generation summary
  console.log('');
  console.log(ui.colors.accent('━━━ Generation Summary ━━━'));
  console.log('');

  const dashboardLines = renderGenerationSummary(
    { scan, options: updatedOptions, estimatedTokens, modelPreset },
    { mode: 'compact', displaySettings: updatedOptions.displaySettings }
  );
  for (const line of dashboardLines) {
    console.log(line);
  }

  // Generate output using the format-aware render function (no confirmation prompt)
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

  // Copy to clipboard if requested
  if (options.copyToClipboard) {
    try {
      await copyToClipboard(output);
      console.log(ui.success(`Copied to clipboard`));
    } catch (err) {
      console.log(ui.warning(`Could not copy to clipboard: ${err instanceof Error ? err.message : 'unknown error'}`));
    }
  }

  console.log(ui.separator());
}
