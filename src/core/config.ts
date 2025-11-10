import { readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type {
  CliOptions,
  ResolvedOptions,
  RollerConfig,
  RollerPreset,
  SortMode,
} from './types.js';

/**
 * Default options used as base
 */
const DEFAULT_OPTIONS: Omit<ResolvedOptions, 'root' | 'presetName'> = {
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
  defaults: Omit<ResolvedOptions, 'root' | 'presetName'>,
  preset: RollerPreset | undefined
): Omit<ResolvedOptions, 'root' | 'presetName'> {
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
  };
}

/**
 * Resolve and merge all configuration sources:
 * 1. Base defaults
 * 2. Preset from config (if specified)
 * 3. CLI overrides
 */
export function resolveOptions(
  cli: CliOptions,
  config: RollerConfig | undefined
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
  const outFile = cli.out ?? options.outFile;

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
  };
}
