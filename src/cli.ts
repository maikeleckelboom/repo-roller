#!/usr/bin/env node

import { writeFile } from 'node:fs/promises';
import { Command } from 'commander';
import type { CliOptions, SortMode, ResolvedOptions, OutputFormat, RollerConfig, RepoRollerYmlConfig } from './core/types.js';
import { loadConfig, loadRepoRollerYml, resolveOptions } from './core/config.js';
import { scanFiles } from './core/scan.js';
import { render } from './core/render.js';
import { runInteractive } from './tui.js';
import { displayPresets, displayProfiles, displayProfileDetails, displayExamples, formatBytes } from './core/helpers.js';
import { runInit } from './core/init.js';
import { estimateTokens, analyzeTokenUsage, formatNumber, calculateCost, LLM_PROVIDERS } from './core/tokens.js';
import type { TokenAnalysisContext } from './core/tokens.js';
import { validateRollerConfig, validateRepoRollerYml, validateCliOptions, formatValidationErrors } from './core/validation.js';
import * as ui from './core/ui.js';

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
    .option('-o, --out <file>', 'Output file path (default: auto-generated {project}-{date}.{ext})')
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
    // Token counting options
    .option('--no-token-count', 'Disable token counting and cost estimation')
    .option('--target <provider>', 'Target LLM provider (claude-sonnet, gpt-4o, etc.)')
    .option('--warn-tokens <number>', 'Warn if output exceeds this token count', parseInt)
    .option('--list-providers', 'List all supported LLM providers')
    // Validation options
    .option('--validate', 'Validate configuration files without generating output')
    // DX improvements: Skip prompts
    .option('-y, --yes', 'Skip all prompts and use defaults (or saved preferences)')
    .option('--defaults', 'Alias for --yes')
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

        if (options.listProviders) {
          displayProviders();
          return;
        }

        // Handle validation command
        if (options.validate) {
          validateConfigs(root, config, repoRollerConfig);
          return;
        }

        // Validate CLI options early
        const cliValidation = validateCliOptions({
          ext: options.ext as string | undefined,
          lang: options.lang as string | undefined,
          maxSize: options.maxSize as number | undefined,
          format: options.format as string | undefined,
          target: options.target as string | undefined,
        });

        if (!cliValidation.valid) {
          console.error('');
          console.error(ui.error('Invalid CLI options'));
          console.error('');
          for (const error of cliValidation.errors) {
            console.error(ui.colors.error(`  ${error.field}: ${error.message}`));
            console.error(ui.bullet(ui.colors.dim(`Fix: ${error.suggestion}`)));
            console.error('');
          }
          process.exit(1);
        }

        if (cliValidation.warnings.length > 0) {
          for (const warning of cliValidation.warnings) {
            console.warn(ui.warning(`${warning.field}: ${warning.message}`));
            console.warn(ui.bullet(ui.colors.dim(`Suggestion: ${warning.suggestion}`)));
            console.warn('');
          }
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
          // Token counting options
          tokenCount: options.tokenCount as boolean | undefined,
          target: options.target as string | undefined,
          warnTokens: options.warnTokens as number | undefined,
          // DX improvements: Skip prompts
          yes: (options.yes as boolean | undefined) ?? (options.defaults as boolean | undefined),
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
 */
async function runNonInteractive(options: ResolvedOptions): Promise<void> {
  // Show modern header
  console.log(ui.header());

  console.log(ui.status('scan', `Scanning ${ui.colors.primary(options.root)}`));

  // Scan files
  const scan = await scanFiles(options);

  if (scan.files.length === 0) {
    displayNoFilesError(options);
    process.exit(1);
  }

  console.log(ui.success(`Found ${ui.colors.primary(scan.files.length.toString())} files ${ui.colors.dim(`(${formatBytes(scan.totalBytes)})`)}`));

  // Render output
  const formatLabel = options.format.toUpperCase();
  console.log(ui.status('render', `Rendering ${ui.colors.accent(formatLabel)} output`));
  const output = await render(scan, options);

  // Write output
  await writeFile(options.outFile, output, 'utf-8');

  console.log(ui.status('write', `Output written to ${ui.colors.success(options.outFile)}`));
  console.log('');

  // Display token analysis if enabled
  if (options.tokenCount) {
    displayTokenAnalysis(output, options);
  }
}

/**
 * Display token analysis and cost estimates
 */
function displayTokenAnalysis(output: string, options: ResolvedOptions): void {
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
function displayProviders(): void {
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
 * Validate configuration files
 */
function validateConfigs(
  _root: string,
  config: RollerConfig | undefined,
  repoRollerConfig: RepoRollerYmlConfig | undefined
): void {
  console.log(ui.header());
  console.log(ui.status('scan', 'Validating configuration files'));
  console.log('');

  let hasErrors = false;
  let foundConfigs = false;

  // Validate repo-roller.config
  if (config) {
    foundConfigs = true;
    const result = validateRollerConfig(config);
    console.log(formatValidationErrors(result, 'repo-roller.config'));
    if (!result.valid) {hasErrors = true;}
  }

  // Validate .reporoller.yml
  if (repoRollerConfig) {
    foundConfigs = true;
    const result = validateRepoRollerYml(repoRollerConfig);
    console.log(formatValidationErrors(result, '.reporoller.yml'));
    if (!result.valid) {hasErrors = true;}
  }

  if (!foundConfigs) {
    console.log(ui.info('No configuration files found.'));
    console.log(ui.bullet(ui.colors.dim('Run "repo-roller init" to create configuration files.')));
    return;
  }

  if (hasErrors) {
    process.exit(1);
  }
}

/**
 * Display helpful error message when no files are found
 */
function displayNoFilesError(options: ResolvedOptions): void {
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

// Run main
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
