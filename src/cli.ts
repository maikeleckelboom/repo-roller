#!/usr/bin/env node

import { writeFile } from 'node:fs/promises';
import { Command } from 'commander';
import type { CliOptions, SortMode, ResolvedOptions, OutputFormat } from './core/types.js';
import { loadConfig, loadRepoRollerYml, resolveOptions } from './core/config.js';
import { scanFiles } from './core/scan.js';
import { render } from './core/render.js';
import { runInteractive } from './tui.js';
import { displayPresets, displayProfiles, displayProfileDetails, displayExamples, formatBytes } from './core/helpers.js';
import { runInit } from './core/init.js';

/**
 * Main CLI function
 */
async function main(): Promise<void> {
  const program = new Command();

  // Init command
  program
    .command('init')
    .description('Initialize repo-roller configuration files')
    .argument('[root]', 'Root directory', '.')
    .action(async (root: string) => {
      try {
        await runInit(root);
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  // Main command
  program
    .name('repo-roller')
    .description('Aggregate source code into a single output file with multiple format support')
    .version('1.0.0')
    .argument('[root]', 'Root directory to scan', '.')
    // Output options
    .option('-o, --out <file>', 'Output file path (use "auto" for smart naming)')
    .option('--out-template <template>', 'Output filename template (e.g., "{project}-{date}.{ext}")')
    .option('-f, --format <type>', 'Output format: md, json, yaml, txt (default: md)')
    // Filter options
    .option('-i, --include <patterns...>', 'Include glob patterns')
    .option('-x, --exclude <patterns...>', 'Exclude glob patterns')
    .option('--ext <extensions>', 'Comma-separated list of file extensions (e.g., ts,tsx,md)')
    .option('--lang <languages>', 'Language filter (e.g., typescript, python, go)')
    .option('--max-size <kb>', 'Maximum file size in KB', parseFloat)
    // Quick filters
    .option('--no-tests', 'Exclude test files')
    .option('--no-deps', 'Exclude dependency directories')
    .option('--no-generated', 'Exclude generated/build directories')
    // Processing options
    .option('--strip-comments', 'Strip comments from source files')
    .option('--no-tree', 'Disable directory tree view')
    .option('--no-stats', 'Disable statistics section')
    .option('--sort <mode>', 'Sort mode: path, size, or extension', 'path')
    // Mode options
    .option('-I, --interactive', 'Force interactive mode')
    .option('--no-interactive', 'Force non-interactive mode')
    .option('--dry-run', 'Preview what would be included without generating output')
    .option('--stats-only', 'Show statistics only without generating output')
    // Preset/Profile options
    .option('--preset <name>', 'Use a preset (built-in or from config)')
    .option('--profile <name>', 'Use a profile from .reporoller.yml (default: llm-context)')
    // Format-specific options
    .option('--compact', 'Minify JSON output (JSON format only)')
    .option('--indent <number>', 'Indentation for JSON/YAML (default: 2)', parseInt)
    .option('--toc', 'Add table of contents (Markdown format only)')
    .option('--front-matter', 'Add YAML front matter (Markdown format only)')
    // Info options
    .option('--list-presets', 'List all available presets')
    .option('--list-profiles', 'List all available profiles')
    .option('--show-profile <name>', 'Show details of a specific profile')
    .option('--examples', 'Show usage examples')
    .option('-v, --verbose', 'Verbose output')
    .action(async (root: string, options: Record<string, unknown>) => {
      try {
        // Load config files early for info commands
        const config = await loadConfig(root);
        const repoRollerConfig = await loadRepoRollerYml(root);

        // Handle info commands first (these exit immediately)
        if (options.listPresets) {
          displayPresets(config);
          return;
        }

        if (options.listProfiles) {
          displayProfiles(repoRollerConfig);
          return;
        }

        if (options.showProfile) {
          displayProfileDetails(options.showProfile as string, repoRollerConfig);
          return;
        }

        if (options.examples) {
          displayExamples();
          return;
        }

        // Build CLI options object
        const cliOptions: CliOptions = {
          root,
          out: options.out as string | undefined,
          outTemplate: options.outTemplate as string | undefined,
          include: options.include as string[] | undefined,
          exclude: options.exclude as string[] | undefined,
          ext: options.ext as string | undefined,
          lang: options.lang as string | undefined,
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
          // New DX options
          dryRun: options.dryRun as boolean | undefined,
          statsOnly: options.statsOnly as boolean | undefined,
          noTests: options.tests === false ? true : undefined,
          noDeps: options.deps === false ? true : undefined,
          noGenerated: options.generated === false ? true : undefined,
          // Format-specific options
          compact: options.compact as boolean | undefined,
          indent: options.indent as number | undefined,
          toc: options.toc as boolean | undefined,
          frontMatter: options.frontMatter as boolean | undefined,
        };

        // Resolve final options
        const resolved = resolveOptions(cliOptions, config, repoRollerConfig);

        if (resolved.verbose) {
          console.log('Configuration:', resolved);
        }

        // Handle dry-run and stats-only modes
        if (resolved.dryRun || resolved.statsOnly) {
          await runPreview(resolved);
          return;
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
 * Run preview mode (dry-run or stats-only)
 */
async function runPreview(options: ResolvedOptions): Promise<void> {
  console.log(`🔍 Scanning files in ${options.root}...\n`);

  // Scan files
  const scan = await scanFiles(options);

  if (scan.files.length === 0) {
    displayNoFilesError(options);
    process.exit(1);
  }

  if (options.statsOnly) {
    // Stats only mode
    console.log('📊 Statistics:\n');
    console.log(`Total files: ${scan.files.length}`);
    console.log(`Total size: ${formatBytes(scan.totalBytes)}\n`);

    if (Object.keys(scan.extensionCounts).length > 0) {
      console.log('Extensions:');
      const sorted = Object.entries(scan.extensionCounts)
        .sort(([, a], [, b]) => b - a);
      for (const [ext, count] of sorted) {
        const extLabel = ext || '(no extension)';
        console.log(`  - ${extLabel}: ${count} file${count !== 1 ? 's' : ''}`);
      }
    }
  } else {
    // Dry run mode - show what would be included
    console.log(`📋 Preview (would include ${scan.files.length} files):\n`);

    const maxDisplay = 20;
    const filesToShow = scan.files.slice(0, maxDisplay);

    for (const file of filesToShow) {
      console.log(`✓ ${file.relativePath} (${formatBytes(file.sizeBytes)})`);
    }

    if (scan.files.length > maxDisplay) {
      console.log(`\n... and ${scan.files.length - maxDisplay} more files`);
    }

    console.log(`\nTotal: ${scan.files.length} files, ${formatBytes(scan.totalBytes)}`);
    console.log('\nRun without --dry-run to generate output');
  }
}

/**
 * Run non-interactive mode
 */
async function runNonInteractive(options: ResolvedOptions): Promise<void> {
  console.log(`🔍 Scanning files in ${options.root}...`);

  // Scan files
  const scan = await scanFiles(options);

  if (scan.files.length === 0) {
    displayNoFilesError(options);
    process.exit(1);
  }

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
 * Display helpful error message when no files are found
 */
function displayNoFilesError(options: ResolvedOptions): void {
  console.error('❌ No files found!\n');
  console.error('💡 Possible reasons:');
  console.error('  • All files are excluded by .gitignore or exclude patterns');
  console.error('  • Extension filter too restrictive (--ext or --lang)');
  console.error('  • Files exceed size limit (--max-size)');
  console.error('  • No files match include patterns\n');
  console.error('Try:');
  console.error('  repo-roller . --dry-run         # Preview what would be included');
  console.error('  repo-roller . --verbose         # See detailed filtering');
  console.error('  repo-roller . --preset full     # Include all files');
  if (options.extensions.length > 0) {
    console.error(`  repo-roller . --ext ""          # Remove extension filter (current: ${options.extensions.join(',')})`);
  }
}

// Run main
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
