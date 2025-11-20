import type { CliOptions, SortMode, OutputFormat, CommanderOptions, RollerConfig, RepoRollerYmlConfig, ResolvedOptions } from '../core/types.js';
import { displayPresets, displayPresetDetails, displayProfiles, displayProfileDetails, displayExamples } from './presets.js';
import { validateCliOptions } from '../core/validation.js';
import { resolveOptions } from '../core/config.js';
import { runInteractive } from '../tui.js';
import { displayProviders, validateConfigs, runPreview, runNonInteractive } from './index.js';
import { listModelPresets } from '../core/modelPresets.js';
import * as ui from '../core/ui.js';
import { getDisplaySettings, loadUserSettings, getLastSelectedFiles } from '../core/userSettings.js';

export interface CommandContext {
  root: string;
  config: RollerConfig | null | undefined;
  repoRollerConfig: RepoRollerYmlConfig | null | undefined;
  options: CommanderOptions;
}

export interface CommandResult {
  handled: boolean;
  exitCode?: number;
}

export const infoCommands = {
  listPresets: (ctx: CommandContext): CommandResult => {
    if (!ctx.options.listPresets) {
      return { handled: false };
    }
    displayPresets(ctx.config, ctx.repoRollerConfig);
    return { handled: true };
  },

  listProfiles: (ctx: CommandContext): CommandResult => {
    if (!ctx.options.listProfiles) {
      return { handled: false };
    }
    displayProfiles(ctx.repoRollerConfig);
    return { handled: true };
  },

  showPreset: (ctx: CommandContext): CommandResult => {
    if (!ctx.options.showPreset) {
      return { handled: false };
    }
    displayPresetDetails(ctx.options.showPreset, ctx.config, ctx.repoRollerConfig);
    return { handled: true };
  },

  showProfile: (ctx: CommandContext): CommandResult => {
    if (!ctx.options.showProfile) {
      return { handled: false };
    }
    displayProfileDetails(ctx.options.showProfile, ctx.repoRollerConfig);
    return { handled: true };
  },

  examples: (ctx: CommandContext): CommandResult => {
    if (!ctx.options.examples) {
      return { handled: false };
    }
    displayExamples();
    return { handled: true };
  },

  listProviders: (ctx: CommandContext): CommandResult => {
    if (!ctx.options.listProviders) {
      return { handled: false };
    }
    displayProviders();
    return { handled: true };
  },

  listModels: (ctx: CommandContext): CommandResult => {
    if (!ctx.options.listModels) {
      return { handled: false };
    }
    displayModelPresets();
    return { handled: true };
  },

  validate: (ctx: CommandContext): CommandResult => {
    if (!ctx.options.validate) {
      return { handled: false };
    }
    validateConfigs(ctx.root, ctx.config, ctx.repoRollerConfig);
    return { handled: true };
  },
};

export function handleInfoCommands(ctx: CommandContext): CommandResult {
  for (const handler of Object.values(infoCommands)) {
    const result = handler(ctx);
    if (result.handled) {
      return result;
    }
  }
  return { handled: false };
}

export interface ValidationResult {
  valid: boolean;
  cliOptions?: CliOptions;
  errors?: string[];
}

export function validateAndTransformOptions(ctx: CommandContext): ValidationResult {
  const { options, root } = ctx;

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

  for (const warning of validation.warnings) {
    console.warn(ui.warning(`${warning.field}: ${warning.message}`));
    console.warn(ui.bullet(ui.colors.dim(`Suggestion: ${warning.suggestion}`)));
    console.warn('');
  }

  const cliOptions = transformCommanderOptions(root, options);
  return { valid: true, cliOptions };
}

/**
 * Detect which CLI flags were explicitly set (not just default values)
 */
function detectExplicitFlags(): {
  stripComments: boolean;
  tree: boolean;
  stats: boolean;
} {
  return {
    stripComments: process.argv.includes('--strip-comments') || process.argv.includes('--no-strip-comments'),
    tree: process.argv.includes('--tree') || process.argv.includes('--no-tree'),
    stats: process.argv.includes('--stats') || process.argv.includes('--no-stats'),
  };
}

export function transformCommanderOptions(root: string, options: CommanderOptions): CliOptions {
  const explicitFlags = detectExplicitFlags();

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
    tree: explicitFlags.tree ? options.tree : undefined,
    stats: explicitFlags.stats ? options.stats : undefined,
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
    copy: options.copy,
    diff: options.diff,
    mostRecent: options.mostRecent,
    quiet: options.quiet,
    hideComposition: options.hideComposition,
    hideContextFit: options.hideContextFit,
    hideHealthHints: options.hideHealthHints,
    hideWarnings: options.hideWarnings,
    hideCost: options.hideCost,
    hideRecommendations: options.hideRecommendations,
  };
}

export async function executeMainCommand(ctx: CommandContext): Promise<void> {
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

  const cliOptions = validation.cliOptions;
  if (!cliOptions) {
    throw new Error('cliOptions should be defined when validation is valid');
  }

  // Load ALL user settings BEFORE resolving options
  // This ensures user preferences are respected in both interactive and non-interactive modes
  const userSettings = await loadUserSettings();
  const userDisplaySettings = await getDisplaySettings();

  // Check if we should use last selected files
  // Use last selected files if:
  // 1. Not in interactive mode
  // 2. No explicit include patterns provided
  // 3. Last selected files exist for this root
  const shouldUseLastSelected = !cliOptions.interactive &&
    (!cliOptions.include || cliOptions.include.length === 0);

  let lastSelectedFiles: string[] = [];
  if (shouldUseLastSelected) {
    lastSelectedFiles = await getLastSelectedFiles(cliOptions.root);
    if (lastSelectedFiles.length > 0) {
      console.log(ui.colors.dim(`Using ${lastSelectedFiles.length} previously selected files`));
    }
  }

  // Get explicit flag information (reuse helper function to avoid duplication)
  const explicitFlags = detectExplicitFlags();

  // Create a modified cliOptions that includes user settings as the base
  // CLI flags will override these in resolveOptions
  const cliOptionsWithUserSettings = {
    ...cliOptions,
    // Apply last selected files if available and no explicit include patterns
    include: lastSelectedFiles.length > 0 ? lastSelectedFiles : cliOptions.include,
    // Apply user settings for stripComments/withTree/withStats if not explicitly set via CLI
    // This ensures user preferences are respected in non-interactive mode
    stripComments: explicitFlags.stripComments
      ? cliOptions.stripComments
      : (userSettings.stripComments ?? cliOptions.stripComments),
    tree: explicitFlags.tree
      ? cliOptions.tree
      : (userSettings.withTree ?? cliOptions.tree),
    stats: explicitFlags.stats
      ? cliOptions.stats
      : (userSettings.withStats ?? cliOptions.stats),
    // Pass user display settings as base - CLI flags will override in resolveOptions
    _userDisplaySettings: userDisplaySettings,
  };

  let resolved = await resolveOptions(cliOptionsWithUserSettings, ctx.config, ctx.repoRollerConfig);

  // Now properly merge: user settings as base, then CLI overrides
  // Each setting should be evaluated individually, not all-or-nothing
  resolved = {
    ...resolved,
    displaySettings: {
      // For each setting: CLI flag takes priority, then user setting, then default
      showGenerationSummary: cliOptions.quiet
        ? false
        : userDisplaySettings.showGenerationSummary,
      showCodeComposition: cliOptions.quiet || cliOptions.hideComposition
        ? false
        : userDisplaySettings.showCodeComposition,
      showContextFit: cliOptions.quiet || cliOptions.hideContextFit
        ? false
        : userDisplaySettings.showContextFit,
      showHealthHints: cliOptions.quiet || cliOptions.hideHealthHints
        ? false
        : userDisplaySettings.showHealthHints,
      showTokenWarnings: cliOptions.quiet || cliOptions.hideWarnings
        ? false
        : userDisplaySettings.showTokenWarnings,
      showCostEstimates: cliOptions.quiet || cliOptions.hideCost
        ? false
        : userDisplaySettings.showCostEstimates,
      showRecommendations: cliOptions.quiet || cliOptions.hideRecommendations
        ? false
        : userDisplaySettings.showRecommendations,
    },
  };

  if (resolved.verbose) {
    console.log('Configuration:', resolved);
  }

  if (resolved.dryRun || resolved.statsOnly) {
    await runPreview(resolved);
    return;
  }

  const shouldRunInteractive = resolved.interactive && process.stdout.isTTY;

  if (shouldRunInteractive) {
    await runInteractive(resolved);
  } else {
    await runNonInteractive(resolved);
  }
}

function displayModelPresets(): void {
  console.log(ui.header());
  console.log(ui.section('Model Presets'));
  console.log(ui.colors.dim('  Use --model <name> to select a model preset\n'));

  const presets = listModelPresets();
  const grouped: Record<string, typeof presets> = {};

  for (const preset of presets) {
    grouped[preset.family] ??= [];
    grouped[preset.family].push(preset);
  }

  const familyOrder = ['openai', 'anthropic', 'google', 'other'];

  for (const family of familyOrder) {
    const familyPresets = grouped[family];
    if (!familyPresets || familyPresets.length === 0) {
      continue;
    }

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
