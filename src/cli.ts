#!/usr/bin/env node

import { writeFile } from 'node:fs/promises';
import { Command } from 'commander';
import type { CliOptions, SortMode, ResolvedOptions, OutputFormat } from './core/types.js';
import { loadConfig, loadRepoRollerYml, resolveOptions } from './core/config.js';
import { scanFiles } from './core/scan.js';
import { render } from './core/render.js';
import { runInteractive } from './tui.js';

/**
 * Main CLI function
 */
async function main(): Promise<void> {
  const program = new Command();

  program
    .name('repo-roller')
    .description('Aggregate source code into a single output file with multiple format support')
    .version('1.0.0')
    .argument('[root]', 'Root directory to scan', '.')
    .option('-o, --out <file>', 'Output file path (defaults based on format: source_code.{md|json|yaml|txt})')
    .option('-i, --include <patterns...>', 'Include glob patterns')
    .option('-x, --exclude <patterns...>', 'Exclude glob patterns')
    .option('--ext <extensions>', 'Comma-separated list of file extensions (e.g., ts,tsx,md)')
    .option('--max-size <kb>', 'Maximum file size in KB', parseFloat)
    .option('--strip-comments', 'Strip comments from source files')
    .option('--no-tree', 'Disable directory tree view')
    .option('--no-stats', 'Disable statistics section')
    .option('--sort <mode>', 'Sort mode: path, size, or extension', 'path')
    .option('-I, --interactive', 'Force interactive mode')
    .option('--no-interactive', 'Force non-interactive mode')
    .option('--preset <name>', 'Use a preset from config file')
    .option('--profile <name>', 'Use a profile from .reporoller.yml (default: llm-context)')
    .option('-f, --format <type>', 'Output format: md, json, yaml, txt (default: md)')
    .option('-v, --verbose', 'Verbose output')
    .action(async (root: string, options: Record<string, unknown>) => {
      try {
        // Build CLI options object
        const cliOptions: CliOptions = {
          root,
          out: options.out as string | undefined,
          include: options.include as string[] | undefined,
          exclude: options.exclude as string[] | undefined,
          ext: options.ext as string | undefined,
          maxSize: options.maxSize as number | undefined,
          stripComments: options.stripComments as boolean | undefined,
          tree: options.tree as boolean | undefined,
          stats: options.stats as boolean | undefined,
          sort: options.sort as SortMode | undefined,
          interactive: options.interactive as boolean | undefined,
          preset: options.preset as string | undefined,
          profile: options.profile as string | undefined,
          format: options.format as OutputFormat | undefined,
          verbose: options.verbose as boolean | undefined,
        };

        // Load config files
        const config = await loadConfig(root);
        const repoRollerConfig = await loadRepoRollerYml(root);

        // Resolve final options
        const resolved = resolveOptions(cliOptions, config, repoRollerConfig);

        if (resolved.verbose) {
          console.log('Configuration:', resolved);
        }

        // Determine if we should run interactive mode
        const shouldRunInteractive =
          resolved.interactive && process.stdout.isTTY;

        if (shouldRunInteractive) {
          // Run interactive TUI
          await runInteractive(resolved);
        } else {
          // Run non-interactive mode
          await runNonInteractive(resolved);
        }
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  await program.parseAsync(process.argv);
}

/**
 * Run non-interactive mode
 */
async function runNonInteractive(options: ResolvedOptions): Promise<void> {
  console.log(`🔍 Scanning files in ${options.root}...`);

  // Scan files
  const scan = await scanFiles(options);

  console.log(`✅ Found ${scan.files.length} files (${formatBytes(scan.totalBytes)})`);

  // Render output
  const formatLabel = options.format.toUpperCase();
  console.log(`📝 Rendering ${formatLabel} output...`);
  const output = await render(scan, options);

  // Write output
  await writeFile(options.outFile, output, 'utf-8');

  console.log(`✨ Output written to ${options.outFile}`);
}

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

// Run main
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
