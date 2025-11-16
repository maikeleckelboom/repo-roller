#!/usr/bin/env node

import { Command } from 'commander';
import type { CliOptions, SortMode, OutputFormat, CommanderOptions } from './core/types.js';
import { loadConfig, loadRepoRollerYml, resolveOptions } from './core/config.js';
import { runInteractive } from './tui.js';
import { displayPresets, displayPresetDetails, displayProfiles, displayProfileDetails, displayExamples } from './core/helpers.js';
import { runInit } from './core/init.js';
import { validateCliOptions } from './core/validation.js';
import * as ui from './core/ui.js';
import {
  parseTokenBudget,
  displayProviders,
  validateConfigs,
  runPreview,
  runNonInteractive,
} from './cli/index.js';

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
    .option('--show-preset <name>', 'Show details of a specific preset')
    .option('--show-profile <name>', 'Show details of a specific profile')
    .option('--examples', 'Show usage examples')
    .option('-v, --verbose', 'Verbose output')
    // Token counting options
    .option('--no-token-count', 'Disable token counting and cost estimation')
    .option('--target <provider>', 'Target LLM provider (claude-sonnet, gpt-4o, etc.)')
    .option('--warn-tokens <number>', 'Warn if output exceeds this token count', parseInt)
    .option('--list-providers', 'List all supported LLM providers')
    // Token budget options
    .option('--max-tokens <number>', 'Maximum token budget (e.g., 50000, 50k, 1m)', parseTokenBudget)
    .option('--max-cost <dollars>', 'Maximum cost budget in USD (e.g., 0.50)', parseFloat)
    .option('--max-cost-eur <euros>', 'Maximum cost budget in EUR (e.g., 0.45)', parseFloat)
    // Validation options
    .option('--validate', 'Validate configuration files without generating output')
    // DX improvements: Skip prompts
    .option('-y, --yes', 'Skip all prompts and use defaults (or saved preferences)')
    .option('--defaults', 'Alias for --yes')
    // LLM report display options
    .option('--llm', 'Show detailed LLM provider/cost breakdown')
    .option('--llm-report', 'Alias for --llm')
    // Git-aware selection options
    .option('--since <commit>', 'Include only files changed since commit/tag/branch')
    .option('--staged', 'Include only staged files')
    .option('--unstaged', 'Include only unstaged modified files')
    .option('--changed', 'Include only changed files (staged + unstaged)')
    .action(async (root: string, options: CommanderOptions) => {
      try {
        // Load config files early for info commands
        const config = await loadConfig(root);
        const repoRollerConfig = await loadRepoRollerYml(root);

        // Handle info commands first (these exit immediately)
        if (options.listPresets) {
          displayPresets(config, repoRollerConfig);
          return;
        }

        if (options.listProfiles) {
          displayProfiles(repoRollerConfig);
          return;
        }

        if (options.showPreset) {
          displayPresetDetails(options.showPreset, config, repoRollerConfig);
          return;
        }

        if (options.showProfile) {
          displayProfileDetails(options.showProfile, repoRollerConfig);
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
          ext: options.ext,
          lang: options.lang,
          maxSize: options.maxSize,
          format: options.format,
          target: options.target,
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

        // Build CLI options object (convert Commander naming to internal naming)
        // Note: Commander sets tree/stats to true by default due to --no-tree/--no-stats options
        // We need to check if the user explicitly set these flags by checking process.argv
        const hasTreeFlag = process.argv.includes('--tree') || process.argv.includes('--no-tree');
        const hasStatsFlag = process.argv.includes('--stats') || process.argv.includes('--no-stats');

        const cliOptions: CliOptions = {
          root,
          out: options.out,
          outTemplate: options.outTemplate,
          include: options.include,
          exclude: options.exclude,
          ext: options.ext,
          lang: options.lang,
          maxSize: options.maxSize,
          stripComments: options.stripComments,
          // Only pass tree/stats if explicitly set by user, otherwise let preset decide
          tree: hasTreeFlag ? options.tree : undefined,
          stats: hasStatsFlag ? options.stats : undefined,
          sort: options.sort as SortMode | undefined,
          interactive: options.interactive,
          preset: options.preset,
          profile: options.profile,
          format: options.format as OutputFormat | undefined,
          verbose: options.verbose,
          // New DX options
          dryRun: options.dryRun,
          statsOnly: options.statsOnly,
          noTests: options.tests === false ? true : undefined,
          noDeps: options.deps === false ? true : undefined,
          noGenerated: options.generated === false ? true : undefined,
          // Format-specific options
          compact: options.compact,
          indent: options.indent,
          toc: options.toc,
          frontMatter: options.frontMatter,
          // Token counting options
          tokenCount: options.tokenCount,
          target: options.target,
          warnTokens: options.warnTokens,
          // Token budget options
          maxTokens: options.maxTokens,
          maxCost: options.maxCost,
          maxCostEur: options.maxCostEur,
          // DX improvements: Skip prompts
          yes: options.yes ?? options.defaults,
          // LLM report display options
          showLLMReport: options.llm ?? options.llmReport,
          // Git-aware selection options
          since: options.since,
          staged: options.staged,
          unstaged: options.unstaged,
          changed: options.changed,
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

// Run main
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
