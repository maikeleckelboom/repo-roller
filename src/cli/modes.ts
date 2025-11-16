import { writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import type { ResolvedOptions } from '../core/types.js';
import { scanFiles } from '../core/scan.js';
import { render } from '../core/render.js';
import { estimateTokens, calculateCost } from '../core/tokens.js';
import { formatBytes } from '../core/helpers.js';
import * as ui from '../core/ui.js';
import { applyBudgetConstraints } from './budget.js';
import { displayBudgetSummary, displayNoFilesError, displayDetailedLLMAnalysis } from './display.js';
import { renderGenerationSummary } from '../core/dashboard.js';
import { getModelPreset } from '../core/modelPresets.js';
import { renderPromptHelper } from '../core/promptHelper.js';
import { recordHistoryEntry } from '../core/history.js';

/**
 * Copy text to system clipboard (cross-platform)
 */
async function copyToClipboard(text: string): Promise<void> {
  const platform = process.platform;

  let cmd: string;
  let args: string[];

  if (platform === 'darwin') {
    cmd = 'pbcopy';
    args = [];
  } else if (platform === 'win32') {
    cmd = 'clip';
    args = [];
  } else {
    // Linux - try xclip first, then xsel
    cmd = 'xclip';
    args = ['-selection', 'clipboard'];
  }

  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { stdio: ['pipe', 'ignore', 'pipe'] });

    let stderr = '';
    proc.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        // If xclip fails on Linux, try xsel
        if (platform === 'linux' && cmd === 'xclip') {
          const xselProc = spawn('xsel', ['--clipboard', '--input'], { stdio: ['pipe', 'ignore', 'pipe'] });
          xselProc.on('close', (xselCode) => {
            if (xselCode === 0) {
              resolve();
            } else {
              reject(new Error('Clipboard not available. Install xclip or xsel on Linux.'));
            }
          });
          xselProc.on('error', () => {
            reject(new Error('Clipboard not available. Install xclip or xsel on Linux.'));
          });
          xselProc.stdin?.write(text);
          xselProc.stdin?.end();
        } else {
          reject(new Error(`Clipboard command failed: ${stderr || 'unknown error'}`));
        }
      }
    });

    proc.on('error', (err) => {
      if (platform === 'linux') {
        reject(new Error('Clipboard not available. Install xclip or xsel on Linux.'));
      } else {
        reject(err);
      }
    });

    proc.stdin?.write(text);
    proc.stdin?.end();
  });
}
export async function runPreview(options: ResolvedOptions): Promise<void> {
  console.log(ui.header());
  console.log(ui.status('scan', `Scanning ${ui.colors.primary(options.root)}`));
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

  const startTime = Date.now();

  console.log(ui.status('scan', `Scanning ${ui.colors.primary(options.root)}`));

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

  // Display repo-first generation summary with minimal LLM info
  const estimatedTokens = estimateTokens(output);

  // Get model preset if specified
  const modelPreset = options.modelPreset ? getModelPreset(options.modelPreset) : undefined;

  // Calculate cost for history
  const costEstimate = modelPreset
    ? calculateCost(estimatedTokens, modelPreset.name)
    : calculateCost(estimatedTokens, 'claude-sonnet');
  const estimatedCost = costEstimate?.inputCost;

  // Record to history
  const duration = Date.now() - startTime;
  await recordHistoryEntry({
    resolvedOptions: options,
    cliArgs: process.argv.slice(2),
    selectedFiles: scan.files,
    estimatedTokens,
    estimatedCost,
    duration,
  }).catch((err) => {
    // Don't fail on history errors, just log if verbose
    if (options.verbose) {
      console.log(ui.colors.dim(`  (History recording failed: ${err instanceof Error ? err.message : 'unknown error'})`));
    }
  });

  // Render the new dashboard
  const dashboardLines = renderGenerationSummary(
    { scan, options, estimatedTokens, modelPreset },
    { mode: 'compact', displaySettings: options.displaySettings }
  );
  for (const line of dashboardLines) {
    console.log(line);
  }

  // Display detailed LLM analysis only if --llm flag is set
  if (options.showLLMReport) {
    displayDetailedLLMAnalysis(output, options);
  }

  // Display prompt helper if requested
  if (options.showPromptHelper) {
    const promptLines = renderPromptHelper(scan);
    for (const line of promptLines) {
      console.log(line);
    }
  }

  console.log(ui.separator());

  // Copy to clipboard if requested
  if (options.copyToClipboard) {
    try {
      await copyToClipboard(output);
      console.log(ui.success(`Copied to clipboard`));
    } catch (err) {
      console.log(ui.warning(`Could not copy to clipboard: ${err instanceof Error ? err.message : 'unknown error'}`));
    }
  }

  // Final success confirmation with file location
  console.log(ui.success(`Generation complete`));
  console.log(ui.keyValue('Output file', ui.colors.success(options.outFile)));
  console.log('');
}
