/**
 * CLI Command Handlers
 *
 * Composable, testable command handlers that separate concerns.
 */

import type { CliOptions, SortMode, OutputFormat, CommanderOptions, RollerConfig, RepoRollerYmlConfig } from '../core/types.js';
import { displayPresets, displayPresetDetails, displayProfiles, displayProfileDetails, displayExamples } from '../core/helpers.js';
import { validateCliOptions } from '../core/validation.js';
import { resolveOptions } from '../core/config.js';
import { runInteractive } from '../tui.js';
import { displayProviders, validateConfigs, runPreview, runNonInteractive } from './index.js';
import { listModelPresets } from '../core/modelPresets.js';
import * as ui from '../core/ui.js';

/**
 * Context for command execution
 */
export interface CommandContext {
  root: string;
  config: RollerConfig | null;
  repoRollerConfig: RepoRollerYmlConfig | null;
  options: CommanderOptions;
}

/**
 * Command handler result
 */
export interface CommandResult {
  handled: boolean;
  exitCode?: number;
}

/**
 * Info command handlers - queries that exit immediately
 */
export const infoCommands = {
  listPresets: (ctx: CommandContext): CommandResult => {
    if (!ctx.options.listPresets) {return { handled: false };}
    displayPresets(ctx.config, ctx.repoRollerConfig);
    return { handled: true };
  },

  listProfiles: (ctx: CommandContext): CommandResult => {
    if (!ctx.options.listProfiles) {return { handled: false };}
    displayProfiles(ctx.repoRollerConfig);
    return { handled: true };
  },

  showPreset: (ctx: CommandContext): CommandResult => {
    if (!ctx.options.showPreset) {return { handled: false };}
    displayPresetDetails(ctx.options.showPreset, ctx.config, ctx.repoRollerConfig);
    return { handled: true };
  },

  showProfile: (ctx: CommandContext): CommandResult => {
    if (!ctx.options.showProfile) {return { handled: false };}
    displayProfileDetails(ctx.options.showProfile, ctx.repoRollerConfig);
    return { handled: true };
  },

  examples: (ctx: CommandContext): CommandResult => {
    if (!ctx.options.examples) {return { handled: false };}
    displayExamples();
    return { handled: true };
  },

  listProviders: (ctx: CommandContext): CommandResult => {
    if (!ctx.options.listProviders) {return { handled: false };}
    displayProviders();
    return { handled: true };
  },

  listModels: (ctx: CommandContext): CommandResult => {
    if (!ctx.options.listModels) {return { handled: false };}
    displayModelPresets();
    return { handled: true };
  },

  validate: (ctx: CommandContext): CommandResult => {
    if (!ctx.options.validate) {return { handled: false };}
    validateConfigs(ctx.root, ctx.config, ctx.repoRollerConfig);
    return { handled: true };
  },
};

/**
 * Try all info commands in order
 */
export function handleInfoCommands(ctx: CommandContext): CommandResult {
  for (const handler of Object.values(infoCommands)) {
    const result = handler(ctx);
    if (result.handled) {return result;}
  }
  return { handled: false };
}

/**
 * Validate and transform CLI options
 */
export interface ValidationResult {
  valid: boolean;
  cliOptions?: CliOptions;
  errors?: string[];
}

export function validateAndTransformOptions(ctx: CommandContext): ValidationResult {
  const { options, root } = ctx;

  // Validate CLI options
  const validation = validateCliOptions({
    ext: options.ext,
    lang: options.lang,
    maxSize: options.maxSize,
    format: options.format,
    target: options.target,
  });

  if (!validation.valid) {
    const errors: string[] = [];
    for (const error of validation.errors) {
      errors.push(`${error.field}: ${error.message} (${error.suggestion})`);
    }
    return { valid: false, errors };
  }

  // Show warnings
  for (const warning of validation.warnings) {
    console.warn(ui.warning(`${warning.field}: ${warning.message}`));
    console.warn(ui.bullet(ui.colors.dim(`Suggestion: ${warning.suggestion}`)));
    console.warn('');
  }

  // Transform Commander options to internal format
  const cliOptions = transformCommanderOptions(root, options);

  return { valid: true, cliOptions };
}

/**
 * Transform Commander.js options to internal CliOptions
 */
export function transformCommanderOptions(root: string, options: CommanderOptions): CliOptions {
  // Check if user explicitly set tree/stats flags
  const hasTreeFlag = process.argv.includes('--tree') || process.argv.includes('--no-tree');
  const hasStatsFlag = process.argv.includes('--stats') || process.argv.includes('--no-stats');

  return {
    root,
    out: options.out,
    outTemplate: options.outTemplate,
    include: options.include,
    exclude: options.exclude,
    ext: options.ext,
    lang: options.lang,
    maxSize: options.maxSize,
    stripComments: options.stripComments,
    tree: hasTreeFlag ? options.tree : undefined,
    stats: hasStatsFlag ? options.stats : undefined,
    sort: options.sort as SortMode | undefined,
    interactive: options.interactive,
    preset: options.preset,
    profile: options.profile,
    format: options.format as OutputFormat | undefined,
    verbose: options.verbose,
    dryRun: options.dryRun,
    statsOnly: options.statsOnly,
    noTests: options.tests === false ? true : undefined,
    noDeps: options.deps === false ? true : undefined,
    noGenerated: options.generated === false ? true : undefined,
    compact: options.compact,
    indent: options.indent,
    toc: options.toc,
    frontMatter: options.frontMatter,
    tokenCount: options.tokenCount,
    target: options.target,
    warnTokens: options.warnTokens,
    maxTokens: options.maxTokens,
    maxCost: options.maxCost,
    maxCostEur: options.maxCostEur,
    yes: options.yes ?? options.defaults,
    showLLMReport: options.llm ?? options.llmReport,
    model: options.model,
    showPromptHelper: options.promptHelper,
  };
}

/**
 * Execute the main bundle generation workflow
 */
export async function executeMainCommand(ctx: CommandContext): Promise<void> {
  // Validate and transform options
  const validation = validateAndTransformOptions(ctx);

  if (!validation.valid) {
    console.error('');
    console.error(ui.error('Invalid CLI options'));
    console.error('');
    for (const error of validation.errors ?? []) {
      console.error(ui.colors.error(`  ${error}`));
      console.error('');
    }
    process.exit(1);
  }

  const cliOptions = validation.cliOptions!;

  // Resolve final options
  const resolved = resolveOptions(cliOptions, ctx.config, ctx.repoRollerConfig);

  if (resolved.verbose) {
    console.log('Configuration:', resolved);
  }

  // Handle dry-run and stats-only modes
  if (resolved.dryRun || resolved.statsOnly) {
    await runPreview(resolved);
    return;
  }

  // Determine execution mode
  const shouldRunInteractive = resolved.interactive && process.stdout.isTTY;

  if (shouldRunInteractive) {
    await runInteractive(resolved);
  } else {
    await runNonInteractive(resolved);
  }
}

/**
 * Display model presets
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
    grouped[preset.family]!.push(preset);
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
