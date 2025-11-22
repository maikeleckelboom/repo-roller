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
import { existsSync } from 'node:fs';
import { resolve, join, basename, relative, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
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
import { normalizeExtension, analyzeSelectedFolders } from './helpers.js';
import { env } from './env.js';
import { getGitContext, formatGitContextForFilename } from './gitContext.js';

/**
 * Format date according to the specified format
 */
function formatDate(date: Date, format: string): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  switch (format) {
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;
    case 'YYYYMMDD':
      return `${year}${month}${day}`;
    case 'YYYY-MM':
      return `${year}-${month}`;
    case 'YYYYMM':
      return `${year}${month}`;
    default:
      return `${year}-${month}-${day}`;
  }
}

/**
 * Format time according to the specified format
 */
function formatTime(date: Date, format: '24h' | '12h' | 'timestamp'): string {
  if (format === 'timestamp') {
    return String(date.getTime());
  }

  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  if (format === '24h') {
    return `${String(hours).padStart(2, '0')}${minutes}${seconds}`;
  }

  // 12h format
  const isPM = hours >= 12;
  const hours12 = hours % 12 || 12;
  const period = isPM ? 'PM' : 'AM';
  return `${String(hours12).padStart(2, '0')}${minutes}${period}`;
}

/**
 * Convert path separator style to actual separator character
 */
function getPathSeparatorChar(style: string): string {
  switch (style) {
    case 'dot':
      return '.';
    case 'plus':
      return '+';
    case 'underscore':
      return '_';
    case 'dash':
    default:
      return '-';
  }
}

/**
 * Hash a string to a short identifier (first 8 chars of MD5)
 */
function hashString(str: string): string {
  return createHash('md5').update(str).digest('hex').substring(0, 8);
}

/**
 * Generate a unique filename by appending a number if collision detected
 * Uses synchronous fs operations to maintain backwards compatibility
 */
function avoidCollision(filepath: string): string {
  if (!existsSync(filepath)) {
    return filepath;
  }

  const ext = filepath.substring(filepath.lastIndexOf('.'));
  const base = filepath.substring(0, filepath.lastIndexOf('.'));

  let counter = 1;
  let newPath = `${base}-${counter}${ext}`;

  while (existsSync(newPath)) {
    counter++;
    newPath = `${base}-${counter}${ext}`;
  }

  return newPath;
}

/**
 * Get a smart project name that includes nested directories
 * from the repository root if we're in a git repo
 */
function getSmartProjectName(root: string, config = env.defaults.filenameGeneration): string {
  try {
    // Try to get the git repository root
    const repoRoot = execSync('git rev-parse --show-toplevel', {
      cwd: root,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
    }).trim();

    // Get the relative path from repo root to the current directory
    const relativePath = relative(repoRoot, root);

    if (!relativePath || relativePath === '.') {
      // We're at the repo root, just use the repo name
      return basename(repoRoot) || 'code';
    }

    // Split the path into parts and take up to configured levels (including repo name)
    const repoName = basename(repoRoot);
    const pathParts = relativePath.split(sep);

    // Limit to configurable nested levels
    const maxNestedLevels = config.maxNestedFolders;

    // Get the appropriate separator based on pathSeparator setting
    const separator = getPathSeparatorChar(config.pathSeparator);

    if (pathParts.length > maxNestedLevels && config.showTruncationEllipsis) {
      // Show first and last with truncation pattern in between
      const firstPart = pathParts[0];
      const lastPart = pathParts[pathParts.length - 1];
      return [repoName, firstPart, config.truncationPattern, lastPart].join(separator);
    }

    const selectedParts = pathParts.slice(0, maxNestedLevels);

    // Combine repo name with nested path
    return [repoName, ...selectedParts].join(separator);
  } catch {
    // Not in a git repo or git command failed, fall back to basename
    return basename(root) || 'code';
  }
}

/**
 * Generate contextual output filename with smart naming
 * Supports multiple strategies: smart, simple, detailed, custom
 */
export function generateSmartOutputFile(
  root: string,
  format: OutputFormat,
  profile: string,
  template?: string,
  configOverride?: Partial<typeof env.defaults.filenameGeneration>,
  tokenCount?: number,
  selectedPaths?: readonly string[]
): string {
  // Use env defaults as base (user settings can be passed via configOverride)
  const config = {
    ...env.defaults.filenameGeneration,
    ...(configOverride || {}),
  };
  const now = new Date();

  // Get git context if enabled
  const gitContext = config.includeGitContext ? getGitContext(root) : null;

  // Analyze selected folders if paths provided
  const folderSuffix = selectedPaths && selectedPaths.length > 0
    ? analyzeSelectedFolders(
        selectedPaths,
        3,
        config.maxNestedFolders,
        getPathSeparatorChar(config.pathSeparator)
      )
    : '';

  // Build template variables object
  const projectName = getSmartProjectName(root, config);
  const repoName = basename(root);
  const relativePath = relative(root, root) || '.';

  const variables: Record<string, string> = {
    '{project}': projectName,
    '{repo}': repoName,
    '{path}': relativePath.split(sep).join(getPathSeparatorChar(config.pathSeparator)),
    '{profile}': profile,
    '{date}': formatDate(now, config.dateFormat),
    '{time}': formatTime(now, config.timeFormat),
    '{timestamp}': String(now.getTime()),
    '{ext}': format,
    '{format}': format,
    '{branch}': gitContext?.branch || '',
    '{hash}': gitContext?.shortHash || '',
    '{tag}': gitContext?.tag || '',
    '{label}': config.customLabel || '',
    '{tokens}': tokenCount && config.includeTokenCount ? `${Math.round(tokenCount / 1000)}k` : '',
    '{folders}': folderSuffix,
  };

  // Handle custom template strategy
  if (template || (config.strategy === 'custom' && config.customTemplate)) {
    const effectiveTemplate = template || config.customTemplate || '';

    // Replace all variables in template
    let filename = effectiveTemplate;
    for (const [key, value] of Object.entries(variables)) {
      filename = filename.replace(new RegExp(key, 'g'), value);
    }

    // Clean up any empty segments (multiple dashes/separators in a row)
    filename = filename.replace(/[-_.+]{2,}/g, '-').replace(/^[-_.+]+|[-_.+]+$/g, '');

    return filename;
  }

  const parts: string[] = [];

  // Date/time prefix (if enabled and position is 'prefix')
  if (config.includeDate && config.datePosition === 'prefix') {
    const datePart = formatDate(now, config.dateFormat);
    if (config.includeTime) {
      parts.push(`${datePart}-${formatTime(now, config.timeFormat)}`);
    } else {
      parts.push(datePart);
    }
  }

  // Project name (if enabled)
  if (config.includeProjectName) {
    parts.push(projectName);
  }

  // Folder context from selected files (if available)
  if (folderSuffix) {
    parts.push(folderSuffix);
  }

  // Git context (if enabled and available)
  if (config.includeGitContext && gitContext?.isRepo) {
    const gitPart = formatGitContextForFilename(gitContext, false);
    if (gitPart) {
      parts.push(gitPart);
    }
  }

  // Custom label (if provided)
  if (config.customLabel) {
    parts.push(config.customLabel);
  }

  // Profile name (if enabled and not default)
  if (config.includeProfile && profile !== 'llm-context') {
    parts.push(profile);
  }

  // Date/time suffix (if enabled and position is 'suffix')
  if (config.includeDate && config.datePosition === 'suffix') {
    const datePart = formatDate(now, config.dateFormat);
    if (config.includeTime) {
      parts.push(`${datePart}-${formatTime(now, config.timeFormat)}`);
    } else {
      parts.push(datePart);
    }
  }

  // Token count suffix (if enabled and available)
  if (config.includeTokenCount && tokenCount) {
    const tokenSuffix = `${Math.round(tokenCount / 1000)}k-tokens`;
    parts.push(tokenSuffix);
  }

  // Apply strategy-specific formatting
  let filename: string;
  switch (config.strategy) {
    case 'simple':
      // Simple: just basename + date (if enabled) + format
      filename = parts.length > 0 ? parts.join('-') : 'output';
      break;

    case 'detailed':
      // Detailed: include everything with verbose naming
      filename = parts.length > 0 ? parts.join('-') : 'source_code';
      break;

    case 'smart':
    default:
      // Smart: balanced approach (current default behavior)
      filename = parts.length > 0 ? parts.join('-') : 'source_code';
      break;
  }

  // Construct full filename with extension
  let fullFilename = `${filename}.${format}`;

  // Apply Windows safe mode if enabled and filename is too long
  if (config.enableWindowsSafeMode && fullFilename.length > config.maxFilenameLength) {
    // Keep date and essential parts, hash the project name
    const essentialParts: string[] = [];

    if (config.includeDate) {
      const datePart = formatDate(now, config.dateFormat);
      essentialParts.push(datePart);
    }

    // Hash the project name to keep it short
    const projectHash = hashString(projectName);
    essentialParts.push(repoName);
    essentialParts.push(projectHash);

    if (config.customLabel) {
      essentialParts.push(config.customLabel);
    }

    fullFilename = `${essentialParts.join('-')}.${format}`;
  }

  // Handle collision prevention
  if (config.preventCollisions) {
    fullFilename = avoidCollision(fullFilename);
  }

  return fullFilename;
}

/**
 * Default options used as base (loaded from environment configuration)
 */
const DEFAULT_OPTIONS: Omit<ResolvedOptions, 'root' | 'presetName' | 'repoRollerConfig'> = {
  outFile: env.defaults.outputFile,
  include: [],
  exclude: [],
  extensions: [],
  maxFileSizeBytes: env.defaults.maxFileSizeBytes,
  stripComments: env.defaults.stripComments,
  withTree: env.defaults.withTree,
  withStats: env.defaults.withStats,
  sort: 'path',
  interactive: false,
  verbose: false,
  profile: env.defaults.profile,
  format: env.defaults.outputFormat as OutputFormat,
  // New DX options
  dryRun: false,
  statsOnly: false,
  // Format-specific options
  compact: false,
  indent: env.defaults.indent,
  toc: false,
  frontMatter: false,
  // Token counting options
  tokenCount: env.defaults.tokenCount,
  targetProvider: undefined,
  warnTokens: undefined,
  // DX improvements: Skip prompts
  yes: false,
  // LLM report display options (default to minimal)
  showLLMReport: env.defaults.showLLMReport,
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
  // Display settings (loaded from environment)
  displaySettings: env.defaults.displaySettings,
  // Smart filename generation
  maxNestedFolders: env.defaults.maxNestedFolders,
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
export async function resolveOptions(
  cli: CliOptions,
  config: RollerConfig | undefined,
  repoRollerConfig?: RepoRollerYmlConfig
): Promise<ResolvedOptions> {
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
    // Load user filename settings
    const { getFilenameSettings } = await import('./userSettings.js');
    const userFilenameSettings = await getFilenameSettings();

    // Build filename generation config overrides from CLI options
    // Merge: user settings < CLI overrides
    const filenameConfigOverride: any = {
      ...userFilenameSettings,
    };

    if (cli.nameTemplate) {
      filenameConfigOverride.customTemplate = cli.nameTemplate;
      filenameConfigOverride.strategy = 'custom';
    }

    if (cli.pathSeparator) {
      const validSeparators = ['dash', 'dot', 'plus', 'underscore'];
      if (validSeparators.includes(cli.pathSeparator)) {
        filenameConfigOverride.pathSeparator = cli.pathSeparator;
      }
    }

    if (cli.label) {
      filenameConfigOverride.customLabel = cli.label;
    }

    if (cli.noDate !== undefined) {
      filenameConfigOverride.includeDate = !cli.noDate;
    }

    if (cli.useTime) {
      filenameConfigOverride.includeTime = true;
    }

    if (cli.prefixDate) {
      filenameConfigOverride.datePosition = 'prefix';
    }

    if (cli.showTokens) {
      filenameConfigOverride.includeTokenCount = true;
    }

    if (cli.force !== undefined) {
      filenameConfigOverride.preventCollisions = !cli.force;
    }

    // Default to smart naming (project-date.ext)
    outFile = generateSmartOutputFile(
      root,
      format,
      profile,
      cli.outTemplate || cli.nameTemplate,
      filenameConfigOverride
    );
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
