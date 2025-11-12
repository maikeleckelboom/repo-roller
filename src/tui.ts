import { writeFile } from 'node:fs/promises';
import { render } from 'ink';
import React from 'react';
import type { ResolvedOptions, FileInfo } from './core/types.js';
import { scanFiles } from './core/scan.js';
import { render as renderOutput } from './core/render.js';
import { App } from './components/App.js';
import { Confirm } from './components/Confirm.js';

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * Run interactive TUI mode
 */
export async function runInteractive(options: ResolvedOptions): Promise<void> {
  console.log('🎨 Interactive Mode\n');

  // Initial scan
  console.log(`🔍 Scanning files in ${options.root}...`);
  let scan = await scanFiles(options);
  console.log(`✅ Found ${scan.files.length} files (${formatBytes(scan.totalBytes)})\n`);

  if (scan.files.length === 0) {
    console.log('No files found matching the criteria.');
    return;
  }

  // File selection using Ink TUI
  let inkExitPromise: Promise<void> | undefined;
  const selectedPaths = await new Promise<string[]>((resolve) => {
    const { waitUntilExit } = render(
      React.createElement(App, {
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

  // Additional options
  console.log('');
  const stripComments = await promptConfirm('Strip comments from source files?', options.stripComments);

  const withTree = await promptConfirm('Include directory tree view?', options.withTree);

  const withStats = await promptConfirm('Include statistics section?', options.withStats);

  // Summary and confirmation
  console.log('\n📊 Summary:');
  console.log(`  Files: ${scan.files.length}`);
  console.log(`  Total size: ${formatBytes(scan.totalBytes)}`);
  console.log(`  Output: ${options.outFile}`);
  console.log(`  Format: ${options.format.toUpperCase()}`);
  console.log(`  Strip comments: ${stripComments ? 'Yes' : 'No'}`);
  console.log(`  Include tree: ${withTree ? 'Yes' : 'No'}`);
  console.log(`  Include stats: ${withStats ? 'Yes' : 'No'}`);

  const shouldGenerate = await promptConfirm('\nGenerate output file?', true);

  if (!shouldGenerate) {
    console.log('Cancelled.');
    return;
  }

  // Update options with user selections
  const updatedOptions: ResolvedOptions = {
    ...options,
    stripComments,
    withTree,
    withStats,
  };

  // Generate output
  const formatLabel = options.format.toUpperCase();
  console.log(`\n📝 Rendering ${formatLabel} output...`);
  const output = await renderOutput(scan, updatedOptions);

  // Write output
  await writeFile(options.outFile, output, 'utf-8');

  console.log(`✨ Output written to ${options.outFile}`);
  console.log(`   ${scan.files.length} files, ${formatBytes(scan.totalBytes)}`);
}
