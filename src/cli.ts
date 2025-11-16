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
import { listModelPresets, getModelPreset } from './core/modelPresets.js';
import {
  displayHistoryList,
  displayHistoryEntry,
  displayHistoryDiff,
  displayHistoryStats,
  displayHistoryExport,
} from './cli/history.js';
import {
  displayJsonSchema,
  displayLlmToolDefinition,
  displayShellCompletions,
  displaySchemaSummary,
  displayOpenApiDocs,
} from './cli/schema.js';
import { clearHistory, tagHistoryEntry, annotateHistoryEntry, entryToCliArgs, getHistoryEntry } from './core/history.js';
import {
  displayDaemonStatus,
  daemonScan,
  daemonBundle,
  daemonTokenEstimate,
  displayCacheStats,
  clearDaemonCache,
  sendDaemonRpc,
} from './cli/daemon.js';
import { startDaemon, isDaemonRunning, getDaemonPid, getDefaultSocketPath } from './core/daemon.js';

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

  // History command
  program
    .command('history')
    .description('View and manage bundle generation history')
    .option('--list', 'List recent history entries (default)')
    .option('--show <id>', 'Show details of a specific history entry (ID or index, e.g., -1 for last)')
    .option('--diff <range>', 'Compare two history entries (e.g., -1..-2 or abc123..def456)')
    .option('--replay <id>', 'Show command to replay a previous bundle generation')
    .option('--export <format>', 'Export history (json, yaml, csv)')
    .option('--stats', 'Show history statistics')
    .option('--clear', 'Clear all history')
    .option('--tag <id>', 'Add tags to a history entry (with --tags)')
    .option('--tags <tags>', 'Comma-separated tags to add')
    .option('--annotate <id>', 'Add notes to a history entry (with --notes)')
    .option('--notes <notes>', 'Notes to add')
    .option('--project <name>', 'Filter by project name')
    .option('--limit <number>', 'Limit number of entries shown', parseInt)
    .action(async (options: {
      list?: boolean;
      show?: string;
      diff?: string;
      replay?: string;
      export?: string;
      stats?: boolean;
      clear?: boolean;
      tag?: string;
      tags?: string;
      annotate?: string;
      notes?: string;
      project?: string;
      limit?: number;
    }) => {
      try {
        if (options.show) {
          const idOrIndex = /^-?\d+$/.test(options.show) ? parseInt(options.show, 10) : options.show;
          await displayHistoryEntry(idOrIndex);
        } else if (options.diff) {
          await displayHistoryDiff(options.diff);
        } else if (options.replay) {
          const idOrIndex = /^-?\d+$/.test(options.replay) ? parseInt(options.replay, 10) : options.replay;
          const entry = await getHistoryEntry(idOrIndex);
          if (!entry) {
            console.error(ui.error(`History entry not found: ${options.replay}`));
            process.exit(1);
          }
          const args = entryToCliArgs(entry);
          console.log(ui.info('Replay command:'));
          console.log(`  repo-roller ${args.join(' ')}`);
        } else if (options.export) {
          if (!['json', 'yaml', 'csv'].includes(options.export)) {
            console.error(ui.error('Invalid export format. Use: json, yaml, or csv'));
            process.exit(1);
          }
          await displayHistoryExport(options.export as 'json' | 'yaml' | 'csv');
        } else if (options.stats) {
          await displayHistoryStats();
        } else if (options.clear) {
          const count = await clearHistory({ all: true });
          console.log(ui.success(`Cleared ${count} history entries`));
        } else if (options.tag && options.tags) {
          const idOrIndex = /^-?\d+$/.test(options.tag) ? parseInt(options.tag, 10) : options.tag;
          const tags = options.tags.split(',').map((t) => t.trim());
          await tagHistoryEntry(idOrIndex, tags);
          console.log(ui.success(`Added tags: ${tags.join(', ')}`));
        } else if (options.annotate && options.notes) {
          const idOrIndex = /^-?\d+$/.test(options.annotate) ? parseInt(options.annotate, 10) : options.annotate;
          await annotateHistoryEntry(idOrIndex, options.notes);
          console.log(ui.success('Added notes to entry'));
        } else {
          // Default: list
          await displayHistoryList({
            limit: options.limit,
            project: options.project,
          });
        }
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  // Schema introspection command
  program
    .command('__schema')
    .description('Output machine-readable CLI schema for introspection')
    .option('--json', 'Output full JSON Schema')
    .option('--for-llm', 'Output LLM tool definition (for AI agents)')
    .option('--openapi', 'Output OpenAPI-style documentation')
    .option('--completions <shell>', 'Generate shell completions (bash, zsh, fish)')
    .option('--categories', 'Show options grouped by category')
    .option('--summary', 'Show human-readable schema summary (default)')
    .action(async (options: {
      json?: boolean;
      forLlm?: boolean;
      openapi?: boolean;
      completions?: string;
      categories?: boolean;
      summary?: boolean;
    }) => {
      try {
        if (options.json) {
          displayJsonSchema();
        } else if (options.forLlm) {
          displayLlmToolDefinition();
        } else if (options.openapi) {
          await displayOpenApiDocs('.');
        } else if (options.completions) {
          if (!['bash', 'zsh', 'fish'].includes(options.completions)) {
            console.error(ui.error('Invalid shell. Use: bash, zsh, or fish'));
            process.exit(1);
          }
          displayShellCompletions(options.completions as 'bash' | 'zsh' | 'fish');
        } else if (options.categories) {
          const { displayOptionsByCategory } = await import('./cli/schema.js');
          displayOptionsByCategory();
        } else {
          // Default: summary
          displaySchemaSummary();
        }
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  // Daemon command
  program
    .command('daemon')
    .description('Run repo-roller as a background daemon with warm cache and RPC interface')
    .option('--start', 'Start the daemon')
    .option('--stop', 'Stop the daemon')
    .option('--status', 'Show daemon status (default)')
    .option('--scan [root]', 'Quick scan via daemon (uses cache)')
    .option('--bundle [root]', 'Generate bundle via daemon')
    .option('--tokens [root]', 'Quick token estimate via daemon')
    .option('--cache', 'Show cache statistics')
    .option('--cache-clear [project]', 'Clear daemon cache')
    .option('--force', 'Force refresh (skip cache)')
    .option('--preset <name>', 'Preset for daemon operations')
    .option('--format <type>', 'Output format for daemon bundle')
    .option('--rpc <method>', 'Send raw RPC method')
    .option('--params <json>', 'JSON params for RPC method')
    .action(async (options: {
      start?: boolean;
      stop?: boolean;
      status?: boolean;
      scan?: string | boolean;
      bundle?: string | boolean;
      tokens?: string | boolean;
      cache?: boolean;
      cacheClear?: string | boolean;
      force?: boolean;
      preset?: string;
      format?: string;
      rpc?: string;
      params?: string;
    }) => {
      try {
        if (options.start) {
          console.log(ui.info('Starting daemon...'));
          await startDaemon();
        } else if (options.stop) {
          const running = await isDaemonRunning();
          if (!running) {
            console.log(ui.warning('Daemon is not running'));
            return;
          }
          const pid = await getDaemonPid();
          if (pid) {
            process.kill(pid, 'SIGTERM');
            console.log(ui.success(`Sent stop signal to daemon (PID ${pid})`));
          } else {
            console.error(ui.error('Could not find daemon PID'));
          }
        } else if (options.scan !== undefined) {
          const root = typeof options.scan === 'string' ? options.scan : '.';
          await daemonScan(root, options.force ?? false);
        } else if (options.bundle !== undefined) {
          const root = typeof options.bundle === 'string' ? options.bundle : '.';
          await daemonBundle({
            root,
            preset: options.preset,
            format: options.format,
          });
        } else if (options.tokens !== undefined) {
          const root = typeof options.tokens === 'string' ? options.tokens : '.';
          await daemonTokenEstimate(root);
        } else if (options.cache) {
          await displayCacheStats();
        } else if (options.cacheClear !== undefined) {
          const project = typeof options.cacheClear === 'string' ? options.cacheClear : undefined;
          await clearDaemonCache(project);
        } else if (options.rpc) {
          const params = options.params ? JSON.parse(options.params) : {};
          await sendDaemonRpc(options.rpc, params);
        } else {
          // Default: status
          await displayDaemonStatus();
        }
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
    // Model preset options
    .option('--model <name>', 'Use a model preset (e.g., claude-3.5-sonnet, gpt-5.1)')
    .option('--list-models', 'List all available model presets')
    // Prompt helper
    .option('--prompt-helper', 'Show suggested LLM prompts tailored to the bundle')
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

        if (options.listModels) {
          displayModelPresets();
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
          // Model preset options
          model: options.model,
          // Prompt helper
          showPromptHelper: options.promptHelper,
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
 * Display all available model presets
 */
function displayModelPresets(): void {
  console.log(ui.header());
  console.log(ui.section('Model Presets'));
  console.log(ui.colors.dim('  Use --model <name> to select a model preset\n'));

  const presets = listModelPresets();
  const grouped: Record<string, typeof presets> = {};

  for (const preset of presets) {
    if (!grouped[preset.family]) {
      grouped[preset.family] = [];
    }
    const familyArray = grouped[preset.family];
    if (familyArray) {
      familyArray.push(preset);
    }
  }

  const familyOrder = ['openai', 'anthropic', 'google', 'other'];

  for (const family of familyOrder) {
    const familyPresets = grouped[family];
    if (!familyPresets || familyPresets.length === 0) {continue;}

    const familyName = family.charAt(0).toUpperCase() + family.slice(1);
    console.log(ui.colors.primary.bold(`  ${familyName}`));
    console.log(ui.colors.muted('  ' + ui.symbols.line.repeat(50)));

    for (const preset of familyPresets) {
      const contextStr = preset.contextLimit >= 1_000_000
        ? `${(preset.contextLimit / 1_000_000).toFixed(0)}M`
        : `${(preset.contextLimit / 1_000).toFixed(0)}K`;
      const marginStr = `${(preset.safetyMargin * 100).toFixed(0)}%`;

      console.log(`  ${ui.colors.accent(preset.name.padEnd(22))} ${contextStr.padEnd(8)} ${ui.colors.dim(`margin: ${marginStr}`)}`);
      console.log(`  ${ui.colors.dim(preset.description)}`);
      console.log(`  ${ui.colors.muted(`$${preset.inputCostPerMillion.toFixed(2)}/1M tokens`)}`);
      console.log('');
    }
  }

  console.log(ui.colors.dim('  Aliases: sonnet, opus, haiku, gpt5, gpt4, o3, gemini, flash'));
  console.log('');
}

// Run main
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
