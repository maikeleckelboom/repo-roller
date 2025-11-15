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
import { getBuiltInPreset } from './builtInPresets.js';

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
 * 2. Preset from config (if specified) - checks built-in presets first
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

  // Apply preset if specified (check built-in presets first, then config presets)
  if (cli.preset) {
    const builtInPreset = getBuiltInPreset(cli.preset);
    if (builtInPreset) {
      options = mergePreset(options, builtInPreset);
    } else if (config?.presets) {
      const preset = config.presets[cli.preset];
      if (preset) {
        options = mergePreset(options, preset);
      }
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
    for (const lang of langs) {
      const exts = LANGUAGE_EXTENSIONS[lang.toLowerCase()];
      if (exts) {
        langExtensions.push(...exts);
      }
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
    // DX improvements: Skip prompts
    yes: cli.yes ?? options.yes,
    // Track what was explicitly specified
    profileExplicitlySet: cli.profile !== undefined,
    maxSizeExplicitlySet: cli.maxSize !== undefined,
  };
}
