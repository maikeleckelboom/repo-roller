#!/usr/bin/env node

import { Command } from 'commander';
import type { CommanderOptions } from './core/types.js';
import { loadConfig, loadRepoRollerYml } from './core/config.js';
import { runInit } from './core/init.js';
import * as ui from './core/ui.js';
import { parseTokenBudget } from './cli/index.js';
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
import { startDaemon, isDaemonRunning, getDaemonPid } from './core/daemon.js';
import { handleInfoCommands, executeMainCommand, type CommandContext } from './cli/commands.js';

/**
 * Main CLI entry point
 */
async function main(): Promise<void> {
  const program = new Command();

  // Init command
  program
    .command('init')
    .description('Initialize repo-roller configuration files')
    .argument('[root]', 'Root directory', '.')
    .action(async (root: string) => {
      await runInit(root);
    });

  // History command
  program
    .command('history')
    .description('View and manage bundle generation history')
    .option('--list', 'List recent history entries (default)')
    .option('--show <id>', 'Show details of a specific history entry')
    .option('--diff <range>', 'Compare two history entries (e.g., -1..-2)')
    .option('--replay <id>', 'Show command to replay a bundle')
    .option('--export <format>', 'Export history (json, yaml, csv)')
    .option('--stats', 'Show history statistics')
    .option('--clear', 'Clear all history')
    .option('--tag <id>', 'Add tags to an entry (with --tags)')
    .option('--tags <tags>', 'Comma-separated tags')
    .option('--annotate <id>', 'Add notes to an entry (with --notes)')
    .option('--notes <notes>', 'Notes to add')
    .option('--project <name>', 'Filter by project name')
    .option('--limit <number>', 'Limit entries shown', parseInt)
    .action(handleHistoryCommand);

  // Schema introspection command
  program
    .command('__schema')
    .description('Output machine-readable CLI schema')
    .option('--json', 'Output full JSON Schema')
    .option('--for-llm', 'Output LLM tool definition')
    .option('--openapi', 'Output OpenAPI-style documentation')
    .option('--completions <shell>', 'Generate shell completions (bash, zsh, fish)')
    .option('--categories', 'Show options grouped by category')
    .option('--summary', 'Show human-readable summary (default)')
    .action(handleSchemaCommand);

  // Daemon command
  program
    .command('daemon')
    .description('Run as background daemon with RPC interface')
    .option('--start', 'Start the daemon')
    .option('--stop', 'Stop the daemon')
    .option('--status', 'Show daemon status (default)')
    .option('--scan [root]', 'Quick scan via daemon')
    .option('--bundle [root]', 'Generate bundle via daemon')
    .option('--tokens [root]', 'Token estimate via daemon')
    .option('--cache', 'Show cache statistics')
    .option('--cache-clear [project]', 'Clear daemon cache')
    .option('--force', 'Force refresh (skip cache)')
    .option('--preset <name>', 'Preset for daemon operations')
    .option('--format <type>', 'Output format for daemon bundle')
    .option('--rpc <method>', 'Send raw RPC method')
    .option('--params <json>', 'JSON params for RPC')
    .action(handleDaemonCommand);

  // Main command
  program
    .name('repo-roller')
    .description('Aggregate source code into LLM-friendly bundles')
    .version('1.0.0')
    .argument('[root]', 'Root directory to scan', '.')
    .option('-o, --out <file>', 'Output file path')
    .option('--out-template <template>', 'Output filename template')
    .option('-f, --format <type>', 'Output format: md, json, yaml, txt')
    .option('-i, --include <patterns...>', 'Include glob patterns')
    .option('-x, --exclude <patterns...>', 'Exclude glob patterns')
    .option('--ext <extensions>', 'File extensions (comma-separated)')
    .option('--lang <languages>', 'Language filter')
    .option('--max-size <kb>', 'Max file size in KB', parseFloat)
    .option('--no-tests', 'Exclude test files')
    .option('--no-deps', 'Exclude dependency directories')
    .option('--no-generated', 'Exclude generated directories')
    .option('--strip-comments', 'Strip comments from source')
    .option('--no-tree', 'Disable directory tree')
    .option('--no-stats', 'Disable statistics')
    .option('--sort <mode>', 'Sort: path, size, extension', 'path')
    .option('-I, --interactive', 'Force interactive mode')
    .option('--no-interactive', 'Force non-interactive mode')
    .option('--dry-run', 'Preview without generating')
    .option('--stats-only', 'Show statistics only')
    .option('--preset <name>', 'Use a preset')
    .option('--profile <name>', 'Use a profile')
    .option('--compact', 'Minify JSON output')
    .option('--indent <number>', 'JSON/YAML indentation', parseInt)
    .option('--toc', 'Add table of contents')
    .option('--front-matter', 'Add YAML front matter')
    .option('--list-presets', 'List presets')
    .option('--list-profiles', 'List profiles')
    .option('--show-preset <name>', 'Show preset details')
    .option('--show-profile <name>', 'Show profile details')
    .option('--examples', 'Show usage examples')
    .option('-v, --verbose', 'Verbose output')
    .option('--no-token-count', 'Disable token counting')
    .option('--target <provider>', 'Target LLM provider')
    .option('--warn-tokens <number>', 'Token warning threshold', parseInt)
    .option('--list-providers', 'List LLM providers')
    .option('--max-tokens <number>', 'Max token budget', parseTokenBudget)
    .option('--max-cost <dollars>', 'Max cost in USD', parseFloat)
    .option('--max-cost-eur <euros>', 'Max cost in EUR', parseFloat)
    .option('--validate', 'Validate configuration')
    .option('-y, --yes', 'Skip prompts')
    .option('--defaults', 'Alias for --yes')
    .option('--llm', 'Show LLM breakdown')
    .option('--llm-report', 'Alias for --llm')
    .option('--model <name>', 'Use model preset')
    .option('--list-models', 'List model presets')
    .option('--prompt-helper', 'Show prompt suggestions')
    .option('-c, --copy', 'Copy output to clipboard')
    .action(handleMainCommand);

  await program.parseAsync(process.argv);
}

/**
 * Handle history subcommand
 */
async function handleHistoryCommand(options: {
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
}): Promise<void> {
  if (options.show) {
    const id = parseIdOrIndex(options.show);
    await displayHistoryEntry(id);
  } else if (options.diff) {
    await displayHistoryDiff(options.diff);
  } else if (options.replay) {
    const id = parseIdOrIndex(options.replay);
    const entry = await getHistoryEntry(id);
    if (!entry) {
      throw new Error(`History entry not found: ${options.replay}`);
    }
    const args = entryToCliArgs(entry);
    console.log(ui.info('Replay command:'));
    console.log(`  repo-roller ${args.join(' ')}`);
  } else if (options.export) {
    if (!['json', 'yaml', 'csv'].includes(options.export)) {
      throw new Error('Invalid export format. Use: json, yaml, or csv');
    }
    await displayHistoryExport(options.export as 'json' | 'yaml' | 'csv');
  } else if (options.stats) {
    await displayHistoryStats();
  } else if (options.clear) {
    const count = await clearHistory({ all: true });
    console.log(ui.success(`Cleared ${count} history entries`));
  } else if (options.tag && options.tags) {
    const id = parseIdOrIndex(options.tag);
    const tags = options.tags.split(',').map((t) => t.trim());
    await tagHistoryEntry(id, tags);
    console.log(ui.success(`Added tags: ${tags.join(', ')}`));
  } else if (options.annotate && options.notes) {
    const id = parseIdOrIndex(options.annotate);
    await annotateHistoryEntry(id, options.notes);
    console.log(ui.success('Added notes to entry'));
  } else {
    await displayHistoryList({ limit: options.limit, project: options.project });
  }
}

/**
 * Handle schema subcommand
 */
async function handleSchemaCommand(options: {
  json?: boolean;
  forLlm?: boolean;
  openapi?: boolean;
  completions?: string;
  categories?: boolean;
  summary?: boolean;
}): Promise<void> {
  if (options.json) {
    displayJsonSchema();
  } else if (options.forLlm) {
    displayLlmToolDefinition();
  } else if (options.openapi) {
    await displayOpenApiDocs('.');
  } else if (options.completions) {
    if (!['bash', 'zsh', 'fish'].includes(options.completions)) {
      throw new Error('Invalid shell. Use: bash, zsh, or fish');
    }
    displayShellCompletions(options.completions as 'bash' | 'zsh' | 'fish');
  } else if (options.categories) {
    const { displayOptionsByCategory } = await import('./cli/schema.js');
    displayOptionsByCategory();
  } else {
    displaySchemaSummary();
  }
}

/**
 * Handle daemon subcommand
 */
async function handleDaemonCommand(options: {
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
}): Promise<void> {
  if (options.start) {
    console.log(ui.info('Starting daemon...'));
    await startDaemon();
  } else if (options.stop) {
    if (!(await isDaemonRunning())) {
      console.log(ui.warning('Daemon is not running'));
      return;
    }
    const pid = await getDaemonPid();
    if (pid) {
      process.kill(pid, 'SIGTERM');
      console.log(ui.success(`Sent stop signal to daemon (PID ${pid})`));
    } else {
      throw new Error('Could not find daemon PID');
    }
  } else if (options.scan !== undefined) {
    const root = typeof options.scan === 'string' ? options.scan : '.';
    await daemonScan(root, options.force ?? false);
  } else if (options.bundle !== undefined) {
    const root = typeof options.bundle === 'string' ? options.bundle : '.';
    await daemonBundle({ root, preset: options.preset, format: options.format });
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
    await displayDaemonStatus();
  }
}

/**
 * Handle main bundle command
 */
async function handleMainCommand(root: string, options: CommanderOptions): Promise<void> {
  // Load config files
  const config = await loadConfig(root);
  const repoRollerConfig = await loadRepoRollerYml(root);

  // Build command context
  const ctx: CommandContext = { root, config, repoRollerConfig, options };

  // Try info commands first
  const infoResult = handleInfoCommands(ctx);
  if (infoResult.handled) {
    return;
  }

  // Execute main generation workflow
  await executeMainCommand(ctx);
}

/**
 * Parse ID or index from string
 */
function parseIdOrIndex(str: string): string | number {
  return /^-?\d+$/.test(str) ? parseInt(str, 10) : str;
}

// Run with error handling
main().catch((error) => {
  console.error(ui.error(error instanceof Error ? error.message : String(error)));
  process.exit(1);
});
