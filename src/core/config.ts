import { readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import yaml from 'js-yaml';
import type {
  CliOptions,
  ResolvedOptions,
  RollerConfig,
  RollerPreset,
  SortMode,
  RepoRollerYmlConfig,
  OutputFormat,
} from './types.js';

/**
 * Get default output filename for a given format
 */
function getDefaultOutputFile(format: OutputFormat): string {
  const formatExtensions: Record<OutputFormat, string> = {
    md: 'source_code.md',
    json: 'source_code.json',
    yaml: 'source_code.yaml',
    txt: 'source_code.txt',
  };
  return formatExtensions[format];
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
} as const;

/**
 * Normalize extension to remove leading dot
 */
function normalizeExtension(ext: string): string {
  return ext.startsWith('.') ? ext.slice(1) : ext;
}

/**
 * Parse extensions from comma-separated string or array
 */
function parseExtensions(ext: string | readonly string[] | undefined): readonly string[] {
  if (!ext) return [];
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
      const module = await import(configUrl);
      const config = module.default as RollerConfig;

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
  if (!preset) return defaults;

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
  };
}

/**
 * Resolve and merge all configuration sources:
 * 1. Base defaults
 * 2. Preset from config (if specified)
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

  // Apply preset if specified
  if (cli.preset && config?.presets) {
    const preset = config.presets[cli.preset];
    if (preset) {
      options = mergePreset(options, preset);
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

  // If no explicit output file is specified, use default based on format
  const outFile = cli.out ?? getDefaultOutputFile(format);

  // CLI flags override everything
  return {
    root,
    outFile,
    include: cli.include ?? options.include,
    exclude: cli.exclude ?? options.exclude,
    extensions: parseExtensions(cli.ext) ?? options.extensions,
    maxFileSizeBytes:
      cli.maxSize !== undefined ? cli.maxSize * 1024 : options.maxFileSizeBytes,
    stripComments: cli.stripComments ?? options.stripComments,
    withTree: cli.tree ?? options.withTree,
    withStats: cli.stats ?? options.withStats,
    sort: cli.sort ?? options.sort,
    interactive: cli.interactive ?? options.interactive,
    verbose: cli.verbose ?? options.verbose,
    presetName: cli.preset,
    profile: cli.profile ?? options.profile,
    format,
    repoRollerConfig,
  };
}
