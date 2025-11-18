/**
 * @module core/config
 *
 * Configuration loading and resolution system.
 *
 * OWNS:
 * - Loading .reporoller.yml files (profiles, architectural overview)
 * - Loading repo-roller.config.mjs files (custom presets)
 * - Merging configuration from multiple sources
 * - Resolving final ResolvedOptions from defaults + config + CLI args
 * - Generating smart output filenames
 *
 * DOES NOT OWN:
 * - Validation logic (that's validation.ts)
 * - Built-in preset definitions (that's builtInPresets.ts)
 * - CLI argument parsing (that's Commander in cli.ts)
 * - User settings persistence (that's userSettings.ts)
 *
 * RESOLUTION PRIORITY (highest wins):
 * 1. CLI arguments (explicit user intent)
 * 2. User presets from repo-roller.config.mjs
 * 3. Profile layouts from .reporoller.yml
 * 4. Built-in presets (ts, python, docs, etc.)
 * 5. Hardcoded defaults
 *
 * TYPICAL USAGE:
 * ```typescript
 * import { loadConfig, loadRepoRollerYml, resolveOptions } from './config.js';
 *
 * const config = await loadConfig(root);
 * const repoRollerYml = await loadRepoRollerYml(root);
 * const options = await resolveOptions({
 *   root,
 *   preset: 'minimal',
 *   include: ['src/**'],
 * });
 * ```
 *
 * CONFIG FILES:
 * - `.reporoller.yml` - Profile definitions and architectural overview
 * - `repo-roller.config.mjs` - Custom presets (JavaScript module)
 */

import { readFile } from 'node:fs/promises';
import { resolve, join, basename } from 'node:path';
import { pathToFileURL } from 'node:url';
import yaml from 'js-yaml';
import type {
  CliOptions,
  ResolvedOptions,
  RollerConfig,
  RollerPreset,
  RepoRollerYmlConfig,
  OutputFormat,
} from './types.js';
import { getBuiltInPreset, listBuiltInPresets } from './builtInPresets.js';
import { normalizeExtension } from './helpers.js';

/**
 * Generate contextual output filename with smart naming
 */
function generateSmartOutputFile(
  root: string,
  format: OutputFormat,
  profile: string,
  template?: string
): string {
  // Use slice instead of split to avoid TypeScript type issues
  const timestamp = new Date().toISOString().slice(0, 10); // 2025-11-12

  // Try to get project name from directory
  const projectName = basename(root) || 'code';

  // Only add profile suffix if it's not the default
  const profileSuffix = profile !== 'llm-context' ? `-${profile}` : '';

  if (template) {
    // Custom template support
    return template
      .replace('{project}', projectName)
      .replace('{profile}', profile)
      .replace('{date}', timestamp)
      .replace('{ext}', format);
  }

  return `${projectName}${profileSuffix}-${timestamp}.${format}`;
}

/**
 * Default options used as base
 */
const DEFAULT_OPTIONS: Omit<ResolvedOptions, 'root' | 'presetName' | 'repoRollerConfig'> = {
  outFile: 'source_code.md',
  include: [],
  exclude: [],
  extensions: [],
  maxFileSizeBytes: 1024 * 1024, // 1MB
  stripComments: false,
  withTree: true,
  withStats: true,
  sort: 'path',
  interactive: false,
  verbose: false,
  profile: 'llm-context',
  format: 'md' as OutputFormat,
  // New DX options
  dryRun: false,
  statsOnly: false,
  // Format-specific options
  compact: false,
  indent: 2,
  toc: false,
  frontMatter: false,
  // Token counting options
  tokenCount: true, // Enable by default
  targetProvider: undefined,
  warnTokens: undefined,
  // DX improvements: Skip prompts
  yes: false,
  // LLM report display options (default to minimal)
  showLLMReport: false,
  // Enhanced preset fields (default to none)
  presetHeader: undefined,
  presetFooter: undefined,
  presetDescription: undefined,
  addOutlines: false,
  // Model preset options
  modelPreset: undefined,
  // Prompt helper
  showPromptHelper: false,
  // Clipboard support
  copyToClipboard: false,
  // Git-aware filtering
  gitDiff: undefined,
  gitMostRecent: undefined,
  // Display settings
  displaySettings: {
    showGenerationSummary: true,
    showCodeComposition: true,
    showContextFit: true,
    showHealthHints: true,
    showTokenWarnings: true,
    showCostEstimates: true,
    showRecommendations: true,
  },
  // Smart filename generation
  maxNestedFolders: 4,
} as const;

/**
 * Parse extensions from comma-separated string or array
 */
function parseExtensions(ext: string | readonly string[] | undefined): readonly string[] {
  if (!ext) {return [];}
  if (Array.isArray(ext)) {
    return ext.map(normalizeExtension);
  }
  if (typeof ext === 'string') {
    return ext.split(',').map((e: string) => normalizeExtension(e.trim())).filter(Boolean);
  }
  return [];
}

/**
 * Load .reporoller.yml configuration file
 */
export async function loadRepoRollerYml(rootDir: string): Promise<RepoRollerYmlConfig | undefined> {
  const configPath = join(rootDir, '.reporoller.yml');

  try {
    const content = await readFile(configPath, 'utf-8');
    const parsed = yaml.load(content) as RepoRollerYmlConfig;
    return parsed;
  } catch {
    // File doesn't exist or can't be parsed, return undefined
    return undefined;
  }
}

/**
 * Attempt to load config file from the given root directory
 */
export async function loadConfig(rootDir: string): Promise<RollerConfig | undefined> {
  const configNames = [
    'repo-roller.config.mts',
    'repo-roller.config.mjs',
    'repo-roller.config.cjs',
    'repo-roller.config.ts',
    'repo-roller.config.js',
  ];

  for (const name of configNames) {
    const configPath = join(rootDir, name);
    try {
      // Try to read the file first to avoid noisy errors
      await readFile(configPath, 'utf-8');

      // Import as ES module
      const configUrl = pathToFileURL(configPath).href;
      const module = (await import(configUrl)) as { default: RollerConfig };
      const config = module.default;

      if (config && typeof config === 'object') {
        return config;
      }
    } catch {
      // File doesn't exist or can't be loaded, continue
      continue;
    }
  }

  return undefined;
}

/**
 * Merge preset options with defaults
 */
function mergePreset(
  defaults: Omit<ResolvedOptions, 'root' | 'presetName' | 'repoRollerConfig'>,
  preset: RollerPreset | undefined
): Omit<ResolvedOptions, 'root' | 'presetName' | 'repoRollerConfig'> {
  if (!preset) {return defaults;}

  return {
    outFile: defaults.outFile,
    include: preset.include ?? defaults.include,
    exclude: preset.exclude ?? defaults.exclude,
    extensions: preset.extensions ?? defaults.extensions,
    maxFileSizeBytes: preset.maxFileSizeBytes ?? defaults.maxFileSizeBytes,
    stripComments: preset.stripComments ?? defaults.stripComments,
    withTree: preset.withTree ?? defaults.withTree,
    withStats: preset.withStats ?? defaults.withStats,
    sort: preset.sort ?? defaults.sort,
    interactive: defaults.interactive,
    verbose: defaults.verbose,
    profile: defaults.profile,
    format: defaults.format,
    dryRun: defaults.dryRun,
    statsOnly: defaults.statsOnly,
    compact: defaults.compact,
    indent: defaults.indent,
    toc: defaults.toc,
    frontMatter: defaults.frontMatter,
    tokenCount: defaults.tokenCount,
    targetProvider: defaults.targetProvider,
    warnTokens: defaults.warnTokens,
    yes: defaults.yes,
    showLLMReport: defaults.showLLMReport,
    // Enhanced preset fields for intent-based bundling
    presetHeader: preset.header ?? defaults.presetHeader,
    presetFooter: preset.footer ?? defaults.presetFooter,
    presetDescription: preset.description ?? defaults.presetDescription,
    addOutlines: preset.addOutlines ?? defaults.addOutlines,
    // Model preset options
    modelPreset: defaults.modelPreset,
    // Prompt helper
    showPromptHelper: defaults.showPromptHelper,
    // Clipboard support
    copyToClipboard: defaults.copyToClipboard,
    // Git-aware filtering
    gitDiff: defaults.gitDiff,
    gitMostRecent: defaults.gitMostRecent,
    // Display settings
    displaySettings: defaults.displaySettings,
    // Smart filename generation
    maxNestedFolders: defaults.maxNestedFolders,
  };
}

/**
 * Language shortcuts for quick filtering
 */
const LANGUAGE_EXTENSIONS: Record<string, string[]> = {
  typescript: ['ts', 'tsx'],
  ts: ['ts', 'tsx'],
  javascript: ['js', 'jsx', 'mjs', 'cjs'],
  js: ['js', 'jsx', 'mjs', 'cjs'],
  python: ['py', 'pyi'],
  py: ['py', 'pyi'],
  go: ['go'],
  rust: ['rs'],
  rs: ['rs'],
  java: ['java'],
  cpp: ['cpp', 'cc', 'cxx', 'hpp', 'h'],
  c: ['c', 'h'],
  ruby: ['rb'],
  rb: ['rb'],
  php: ['php'],
  swift: ['swift'],
  kotlin: ['kt', 'kts'],
  scala: ['scala'],
  markdown: ['md', 'mdx'],
  md: ['md', 'mdx'],
};

/**
 * Resolve and merge all configuration sources:
 * 1. Base defaults
 * 2. Preset from config (if specified) - checks built-in presets first, then config presets, then YAML presets
 * 3. CLI overrides
 * 4. RepoRoller YAML config
 */
export function resolveOptions(
  cli: CliOptions,
  config: RollerConfig | undefined,
  repoRollerConfig?: RepoRollerYmlConfig
): ResolvedOptions {
  // Start with defaults
  let options = { ...DEFAULT_OPTIONS };

  // Apply preset if specified (check built-in presets first, then config presets, then YAML presets)
  if (cli.preset) {
    const builtInPreset = getBuiltInPreset(cli.preset);
    let presetFound = false;

    if (builtInPreset) {
      options = mergePreset(options, builtInPreset);
      presetFound = true;
    } else if (config?.presets?.[cli.preset]) {
      options = mergePreset(options, config.presets[cli.preset]);
      presetFound = true;
    } else if (repoRollerConfig?.presets?.[cli.preset]) {
      // Check .reporoller.yml presets (enhanced presets with header/footer support)
      options = mergePreset(options, repoRollerConfig.presets[cli.preset]);
      presetFound = true;
    }

    // Warn user if preset not found (prevents silent failures)
    if (!presetFound) {
      const builtInNames = listBuiltInPresets();
      const configNames = config?.presets ? Object.keys(config.presets) : [];
      const yamlNames = repoRollerConfig?.presets ? Object.keys(repoRollerConfig.presets) : [];
      const allPresets = [...new Set([...builtInNames, ...configNames, ...yamlNames])];

      console.warn(
        `WARNING: Preset "${cli.preset}" not found. Using defaults instead.`
      );
      if (allPresets.length > 0) {
        console.warn(`Available presets: ${allPresets.join(', ')}`);
      }
      console.warn('');
    }
  } else if (config?.defaultPreset && config.presets) {
    // Apply default preset if no preset specified but a default exists
    const preset = config.presets[config.defaultPreset];
    if (preset) {
      options = mergePreset(options, preset);
    }
  }

  // Apply CLI overrides
  const root = resolve(cli.root ?? config?.root ?? process.cwd());
  const format = cli.format ?? options.format;
  const profile = cli.profile ?? options.profile;

  // Handle output file naming
  let outFile: string;
  if (cli.out) {
    // User explicitly specified output file
    outFile = cli.out;
  } else {
    // Default to smart naming (project-date.ext)
    outFile = generateSmartOutputFile(root, format, profile, cli.outTemplate);
  }

  // Handle language shortcuts
  let extensions = parseExtensions(cli.ext) ?? options.extensions;
  if (cli.lang) {
    const langs = cli.lang.split(',').map(l => l.trim());
    const langExtensions: string[] = [];
    const unknownLangs: string[] = [];

    for (const lang of langs) {
      const exts = LANGUAGE_EXTENSIONS[lang.toLowerCase()];
      if (exts) {
        langExtensions.push(...exts);
      } else {
        unknownLangs.push(lang);
      }
    }

    // Warn about unknown languages (prevents silent filtering issues)
    if (unknownLangs.length > 0) {
      console.warn(
        `WARNING: Unknown language(s): ${unknownLangs.join(', ')}`
      );
      console.warn(
        `Available languages: ${Object.keys(LANGUAGE_EXTENSIONS).join(', ')}`
      );
      console.warn('');
    }

    if (langExtensions.length > 0) {
      extensions = langExtensions;
    }
  }

  // Handle quick exclude flags
  let exclude = cli.exclude ?? options.exclude;
  if (cli.noTests) {
    exclude = [...exclude, '**/*.test.*', '**/*.spec.*', '**/__tests__/**'];
  }
  if (cli.noDeps) {
    exclude = [...exclude, '**/node_modules/**', '**/vendor/**', '**/.venv/**', '**/venv/**'];
  }
  if (cli.noGenerated) {
    exclude = [...exclude, '**/dist/**', '**/build/**', '**/out/**', '**/.next/**', '**/target/**'];
  }

  // CLI flags override everything
  return {
    root,
    outFile,
    include: cli.include ?? options.include,
    exclude,
    extensions,
    maxFileSizeBytes:
      cli.maxSize !== undefined ? cli.maxSize * 1024 : options.maxFileSizeBytes,
    stripComments: cli.stripComments ?? options.stripComments,
    withTree: cli.tree ?? options.withTree,
    withStats: cli.stats ?? options.withStats,
    sort: cli.sort ?? options.sort,
    interactive: cli.interactive ?? options.interactive,
    verbose: cli.verbose ?? options.verbose,
    presetName: cli.preset,
    profile,
    format,
    repoRollerConfig,
    // New DX options
    dryRun: cli.dryRun ?? options.dryRun,
    statsOnly: cli.statsOnly ?? options.statsOnly,
    // Format-specific options
    compact: cli.compact ?? options.compact,
    indent: cli.indent ?? options.indent,
    toc: cli.toc ?? options.toc,
    frontMatter: cli.frontMatter ?? options.frontMatter,
    // Token counting options
    tokenCount: cli.tokenCount ?? options.tokenCount,
    targetProvider: cli.target ?? options.targetProvider,
    warnTokens: cli.warnTokens ?? options.warnTokens,
    // Token budget options
    maxTokens: cli.maxTokens ?? options.maxTokens,
    maxCost: cli.maxCost ?? options.maxCost,
    maxCostEur: cli.maxCostEur ?? options.maxCostEur,
    // DX improvements: Skip prompts
    yes: cli.yes ?? options.yes,
    // Track what was explicitly specified
    profileExplicitlySet: cli.profile !== undefined,
    maxSizeExplicitlySet: cli.maxSize !== undefined,
    // LLM report display options
    showLLMReport: cli.showLLMReport ?? options.showLLMReport,
    // Enhanced preset fields for intent-based bundling
    presetHeader: options.presetHeader,
    presetFooter: options.presetFooter,
    presetDescription: options.presetDescription,
    addOutlines: options.addOutlines,
    // Model preset options
    modelPreset: cli.model ?? options.modelPreset,
    // Prompt helper
    showPromptHelper: cli.showPromptHelper ?? options.showPromptHelper,
    // Clipboard support
    copyToClipboard: cli.copy ?? options.copyToClipboard,
    // Git-aware filtering
    gitDiff: cli.diff ?? options.gitDiff,
    gitMostRecent: cli.mostRecent ?? options.gitMostRecent,
    // Display settings with CLI overrides
    displaySettings: {
      showGenerationSummary: cli.quiet ? false : options.displaySettings.showGenerationSummary,
      showCodeComposition: cli.quiet || cli.hideComposition ? false : options.displaySettings.showCodeComposition,
      showContextFit: cli.quiet || cli.hideContextFit ? false : options.displaySettings.showContextFit,
      showHealthHints: cli.quiet || cli.hideHealthHints ? false : options.displaySettings.showHealthHints,
      showTokenWarnings: cli.quiet || cli.hideWarnings ? false : options.displaySettings.showTokenWarnings,
      showCostEstimates: cli.quiet || cli.hideCost ? false : options.displaySettings.showCostEstimates,
      showRecommendations: cli.quiet || cli.hideRecommendations ? false : options.displaySettings.showRecommendations,
    },
    // Smart filename generation
    maxNestedFolders: cli.maxNestedFolders ?? options.maxNestedFolders,
  };
}
