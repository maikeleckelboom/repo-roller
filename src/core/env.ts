/**
 * @module core/env
 *
 * Central environment configuration module.
 *
 * OWNS:
 * - Loading .env file with dotenv
 * - Parsing and validating environment variables
 * - Providing typed configuration objects
 * - Fallback to sensible defaults
 *
 * DESIGN PRINCIPLES:
 * - All settings have sensible defaults
 * - Type-safe configuration objects
 * - Single source of truth for all configurable values
 * - Lazy loading (only load .env when needed)
 *
 * USAGE:
 * ```typescript
 * import { env } from './env.js';
 *
 * const maxHeight = env.interactive.maxHeightPercentage;
 * const colors = env.treeTheme.colors;
 * ```
 */

import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Get project root directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../..');

// Load .env file from project root
config({ path: join(projectRoot, '.env') });

/**
 * Helper to get environment variable with default value
 */
function getEnv(key: string, defaultValue: string): string {
  return process.env[key] ?? defaultValue;
}

/**
 * Helper to get numeric environment variable with default value
 */
function getEnvNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (value === undefined) {
    return defaultValue;
  }
  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Helper to get boolean environment variable with default value
 */
function getEnvBoolean(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  if (value === undefined) {
    return defaultValue;
  }
  return value.toLowerCase() === 'true' || value === '1';
}

/**
 * Interactive UI configuration
 */
export interface InteractiveConfig {
  readonly maxHeightPercentage: number;
  readonly cursorBlinkInterval: number;
  readonly reservedLines: number;
  readonly terminalOverlayBuffer: number;
  readonly minVisibleRows: number;
}

const interactive: InteractiveConfig = {
  maxHeightPercentage: getEnvNumber('INTERACTIVE_MAX_HEIGHT_PERCENTAGE', 0.65),
  cursorBlinkInterval: getEnvNumber('CURSOR_BLINK_INTERVAL', 500),
  reservedLines: getEnvNumber('INTERACTIVE_RESERVED_LINES', 6),
  terminalOverlayBuffer: getEnvNumber('INTERACTIVE_TERMINAL_OVERLAY_BUFFER', 10),
  minVisibleRows: getEnvNumber('INTERACTIVE_MIN_VISIBLE_ROWS', 5),
};

/**
 * Tree view column widths
 */
export interface TreeColumnWidths {
  readonly selection: number;
  readonly expand: number;
  readonly icon: number;
  readonly hint: number;
}

const treeColumnWidths: TreeColumnWidths = {
  selection: getEnvNumber('TREE_COLUMN_SELECTION', 3),
  expand: getEnvNumber('TREE_COLUMN_EXPAND', 2),
  icon: getEnvNumber('TREE_COLUMN_ICON', 3),
  hint: getEnvNumber('TREE_COLUMN_HINT', 8),
};

/**
 * Tree theme colors
 */
export interface TreeThemeColors {
  readonly folder: string;
  readonly typescript: string;
  readonly javascript: string;
  readonly test: string;
  readonly doc: string;
  readonly config: string;
  readonly lockfile: string;
  readonly default: string;
  readonly selected: string;
  readonly partial: string;
  readonly unselected: string;
  readonly cursor: string;
  readonly dim: string;
}

const treeThemeColors: TreeThemeColors = {
  folder: getEnv('TREE_COLOR_FOLDER', 'blueBright'),
  typescript: getEnv('TREE_COLOR_TYPESCRIPT', 'blue'),
  javascript: getEnv('TREE_COLOR_JAVASCRIPT', 'yellow'),
  test: getEnv('TREE_COLOR_TEST', 'magentaBright'),
  doc: getEnv('TREE_COLOR_DOC', 'cyanBright'),
  config: getEnv('TREE_COLOR_CONFIG', 'gray'),
  lockfile: getEnv('TREE_COLOR_LOCKFILE', 'gray'),
  default: getEnv('TREE_COLOR_DEFAULT', 'white'),
  selected: getEnv('TREE_COLOR_SELECTED', 'greenBright'),
  partial: getEnv('TREE_COLOR_PARTIAL', 'yellowBright'),
  unselected: getEnv('TREE_COLOR_UNSELECTED', 'gray'),
  cursor: getEnv('TREE_COLOR_CURSOR', 'cyanBright'),
  dim: getEnv('TREE_COLOR_DIM', 'gray'),
};

/**
 * Tree markers
 */
export interface TreeMarkers {
  readonly selected: string;
  readonly unselected: string;
  readonly partial: string;
  readonly expanded: string;
  readonly collapsed: string;
  readonly leaf: string;
}

const treeMarkers: TreeMarkers = {
  selected: getEnv('TREE_MARKER_SELECTED', '◉'),
  unselected: getEnv('TREE_MARKER_UNSELECTED', '○'),
  partial: getEnv('TREE_MARKER_PARTIAL', '◐'),
  expanded: getEnv('TREE_MARKER_EXPANDED', '⌄'),
  collapsed: getEnv('TREE_MARKER_COLLAPSED', '›'),
  leaf: getEnv('TREE_MARKER_LEAF', ' '),
};

/**
 * Tree branch characters
 */
export interface TreeBranches {
  readonly vertical: string;
  readonly tee: string;
  readonly corner: string;
  readonly horizontal: string;
  readonly space: string;
}

const treeBranches: TreeBranches = {
  vertical: getEnv('TREE_BRANCH_VERTICAL', '│'),
  tee: getEnv('TREE_BRANCH_TEE', '├'),
  corner: getEnv('TREE_BRANCH_CORNER', '└'),
  horizontal: getEnv('TREE_BRANCH_HORIZONTAL', '─'),
  space: getEnv('TREE_BRANCH_SPACE', ' '),
};

/**
 * Tree theme configuration
 */
export interface TreeThemeConfig {
  readonly colors: TreeThemeColors;
  readonly markers: TreeMarkers;
  readonly branches: TreeBranches;
  readonly columnWidths: TreeColumnWidths;
}

const treeTheme: TreeThemeConfig = {
  colors: treeThemeColors,
  markers: treeMarkers,
  branches: treeBranches,
  columnWidths: treeColumnWidths,
};

/**
 * Token estimation configuration
 */
export interface TokenEstimationConfig {
  readonly charsPerToken: number;
  readonly largeContentThreshold: number;
  readonly whitespace: {
    readonly high: number;
    readonly medium: number;
    readonly low: number;
  };
  readonly symbols: {
    readonly veryHigh: number;
    readonly high: number;
    readonly medium: number;
  };
  readonly whitespaceCorrection: {
    readonly high: number;
    readonly medium: number;
    readonly low: number;
  };
  readonly symbolCorrection: {
    readonly veryHigh: number;
    readonly high: number;
    readonly medium: number;
  };
}

const tokenEstimation: TokenEstimationConfig = {
  charsPerToken: getEnvNumber('TOKEN_CHARS_PER_TOKEN', 4.0),
  largeContentThreshold: getEnvNumber('TOKEN_LARGE_CONTENT_THRESHOLD', 100000),
  whitespace: {
    high: getEnvNumber('TOKEN_WHITESPACE_HIGH', 0.30),
    medium: getEnvNumber('TOKEN_WHITESPACE_MEDIUM', 0.25),
    low: getEnvNumber('TOKEN_WHITESPACE_LOW', 0.20),
  },
  symbols: {
    veryHigh: getEnvNumber('TOKEN_SYMBOL_VERY_HIGH', 0.35),
    high: getEnvNumber('TOKEN_SYMBOL_HIGH', 0.25),
    medium: getEnvNumber('TOKEN_SYMBOL_MEDIUM', 0.20),
  },
  whitespaceCorrection: {
    high: getEnvNumber('TOKEN_WHITESPACE_CORRECTION_HIGH', 0.85),
    medium: getEnvNumber('TOKEN_WHITESPACE_CORRECTION_MEDIUM', 0.90),
    low: getEnvNumber('TOKEN_WHITESPACE_CORRECTION_LOW', 0.95),
  },
  symbolCorrection: {
    veryHigh: getEnvNumber('TOKEN_SYMBOL_CORRECTION_VERY_HIGH', 1.25),
    high: getEnvNumber('TOKEN_SYMBOL_CORRECTION_HIGH', 1.15),
    medium: getEnvNumber('TOKEN_SYMBOL_CORRECTION_MEDIUM', 1.05),
  },
};

/**
 * LLM provider configuration
 */
export interface LLMProviderConfig {
  readonly name: string;
  readonly displayName: string;
  readonly contextWindow: number;
  readonly inputCostPerMillion: number;
  readonly outputCostPerMillion: number;
}

const llmProviders = {
  claudeSonnet: {
    name: getEnv('LLM_CLAUDE_SONNET_NAME', 'claude-sonnet'),
    displayName: getEnv('LLM_CLAUDE_SONNET_DISPLAY_NAME', 'Claude 3.5 Sonnet'),
    contextWindow: getEnvNumber('LLM_CLAUDE_SONNET_CONTEXT_WINDOW', 200000),
    inputCostPerMillion: getEnvNumber('LLM_CLAUDE_SONNET_INPUT_COST_PER_MILLION', 3.0),
    outputCostPerMillion: getEnvNumber('LLM_CLAUDE_SONNET_OUTPUT_COST_PER_MILLION', 15.0),
  },
  claudeOpus: {
    name: getEnv('LLM_CLAUDE_OPUS_NAME', 'claude-opus'),
    displayName: getEnv('LLM_CLAUDE_OPUS_DISPLAY_NAME', 'Claude 3 Opus'),
    contextWindow: getEnvNumber('LLM_CLAUDE_OPUS_CONTEXT_WINDOW', 200000),
    inputCostPerMillion: getEnvNumber('LLM_CLAUDE_OPUS_INPUT_COST_PER_MILLION', 15.0),
    outputCostPerMillion: getEnvNumber('LLM_CLAUDE_OPUS_OUTPUT_COST_PER_MILLION', 75.0),
  },
  claudeHaiku: {
    name: getEnv('LLM_CLAUDE_HAIKU_NAME', 'claude-haiku'),
    displayName: getEnv('LLM_CLAUDE_HAIKU_DISPLAY_NAME', 'Claude 3.5 Haiku'),
    contextWindow: getEnvNumber('LLM_CLAUDE_HAIKU_CONTEXT_WINDOW', 200000),
    inputCostPerMillion: getEnvNumber('LLM_CLAUDE_HAIKU_INPUT_COST_PER_MILLION', 0.80),
    outputCostPerMillion: getEnvNumber('LLM_CLAUDE_HAIKU_OUTPUT_COST_PER_MILLION', 4.0),
  },
  gpt4o: {
    name: getEnv('LLM_GPT4O_NAME', 'gpt-4o'),
    displayName: getEnv('LLM_GPT4O_DISPLAY_NAME', 'GPT-4o'),
    contextWindow: getEnvNumber('LLM_GPT4O_CONTEXT_WINDOW', 128000),
    inputCostPerMillion: getEnvNumber('LLM_GPT4O_INPUT_COST_PER_MILLION', 2.50),
    outputCostPerMillion: getEnvNumber('LLM_GPT4O_OUTPUT_COST_PER_MILLION', 10.0),
  },
  gpt4Turbo: {
    name: getEnv('LLM_GPT4_TURBO_NAME', 'gpt-4-turbo'),
    displayName: getEnv('LLM_GPT4_TURBO_DISPLAY_NAME', 'GPT-4 Turbo'),
    contextWindow: getEnvNumber('LLM_GPT4_TURBO_CONTEXT_WINDOW', 128000),
    inputCostPerMillion: getEnvNumber('LLM_GPT4_TURBO_INPUT_COST_PER_MILLION', 10.0),
    outputCostPerMillion: getEnvNumber('LLM_GPT4_TURBO_OUTPUT_COST_PER_MILLION', 30.0),
  },
  o1: {
    name: getEnv('LLM_O1_NAME', 'o1'),
    displayName: getEnv('LLM_O1_DISPLAY_NAME', 'OpenAI o1'),
    contextWindow: getEnvNumber('LLM_O1_CONTEXT_WINDOW', 200000),
    inputCostPerMillion: getEnvNumber('LLM_O1_INPUT_COST_PER_MILLION', 15.0),
    outputCostPerMillion: getEnvNumber('LLM_O1_OUTPUT_COST_PER_MILLION', 60.0),
  },
  gemini: {
    name: getEnv('LLM_GEMINI_NAME', 'gemini'),
    displayName: getEnv('LLM_GEMINI_DISPLAY_NAME', 'Gemini 1.5 Pro'),
    contextWindow: getEnvNumber('LLM_GEMINI_CONTEXT_WINDOW', 2000000),
    inputCostPerMillion: getEnvNumber('LLM_GEMINI_INPUT_COST_PER_MILLION', 1.25),
    outputCostPerMillion: getEnvNumber('LLM_GEMINI_OUTPUT_COST_PER_MILLION', 5.0),
  },
} as const;

/**
 * Model preset configuration
 */
export interface ModelPresetConfig {
  readonly displayName: string;
  readonly contextLimit: number;
  readonly safetyMargin: number;
  readonly inputCostPerMillion: number;
  readonly outputCostPerMillion: number;
}

const modelPresets = {
  gpt51: {
    displayName: getEnv('MODEL_GPT51_DISPLAY_NAME', 'GPT-5.1'),
    contextLimit: getEnvNumber('MODEL_GPT51_CONTEXT_LIMIT', 256000),
    safetyMargin: getEnvNumber('MODEL_GPT51_SAFETY_MARGIN', 0.75),
    inputCostPerMillion: getEnvNumber('MODEL_GPT51_INPUT_COST_PER_MILLION', 5.0),
    outputCostPerMillion: getEnvNumber('MODEL_GPT51_OUTPUT_COST_PER_MILLION', 15.0),
  },
  gpt51Thinking: {
    displayName: getEnv('MODEL_GPT51_THINKING_DISPLAY_NAME', 'GPT-5.1 Thinking'),
    contextLimit: getEnvNumber('MODEL_GPT51_THINKING_CONTEXT_LIMIT', 256000),
    safetyMargin: getEnvNumber('MODEL_GPT51_THINKING_SAFETY_MARGIN', 0.65),
    inputCostPerMillion: getEnvNumber('MODEL_GPT51_THINKING_INPUT_COST_PER_MILLION', 8.0),
    outputCostPerMillion: getEnvNumber('MODEL_GPT51_THINKING_OUTPUT_COST_PER_MILLION', 24.0),
  },
  gpt41: {
    displayName: getEnv('MODEL_GPT41_DISPLAY_NAME', 'GPT-4.1'),
    contextLimit: getEnvNumber('MODEL_GPT41_CONTEXT_LIMIT', 128000),
    safetyMargin: getEnvNumber('MODEL_GPT41_SAFETY_MARGIN', 0.75),
    inputCostPerMillion: getEnvNumber('MODEL_GPT41_INPUT_COST_PER_MILLION', 2.50),
    outputCostPerMillion: getEnvNumber('MODEL_GPT41_OUTPUT_COST_PER_MILLION', 10.0),
  },
  o3: {
    displayName: getEnv('MODEL_O3_DISPLAY_NAME', 'GPT-o3'),
    contextLimit: getEnvNumber('MODEL_O3_CONTEXT_LIMIT', 200000),
    safetyMargin: getEnvNumber('MODEL_O3_SAFETY_MARGIN', 0.70),
    inputCostPerMillion: getEnvNumber('MODEL_O3_INPUT_COST_PER_MILLION', 15.0),
    outputCostPerMillion: getEnvNumber('MODEL_O3_OUTPUT_COST_PER_MILLION', 60.0),
  },
  o3Mini: {
    displayName: getEnv('MODEL_O3_MINI_DISPLAY_NAME', 'GPT-o3 Mini'),
    contextLimit: getEnvNumber('MODEL_O3_MINI_CONTEXT_LIMIT', 128000),
    safetyMargin: getEnvNumber('MODEL_O3_MINI_SAFETY_MARGIN', 0.75),
    inputCostPerMillion: getEnvNumber('MODEL_O3_MINI_INPUT_COST_PER_MILLION', 3.0),
    outputCostPerMillion: getEnvNumber('MODEL_O3_MINI_OUTPUT_COST_PER_MILLION', 12.0),
  },
  claude35Sonnet: {
    displayName: getEnv('MODEL_CLAUDE35_SONNET_DISPLAY_NAME', 'Claude 3.5 Sonnet'),
    contextLimit: getEnvNumber('MODEL_CLAUDE35_SONNET_CONTEXT_LIMIT', 200000),
    safetyMargin: getEnvNumber('MODEL_CLAUDE35_SONNET_SAFETY_MARGIN', 0.75),
    inputCostPerMillion: getEnvNumber('MODEL_CLAUDE35_SONNET_INPUT_COST_PER_MILLION', 3.0),
    outputCostPerMillion: getEnvNumber('MODEL_CLAUDE35_SONNET_OUTPUT_COST_PER_MILLION', 15.0),
  },
  claude35Opus: {
    displayName: getEnv('MODEL_CLAUDE35_OPUS_DISPLAY_NAME', 'Claude 3.5 Opus'),
    contextLimit: getEnvNumber('MODEL_CLAUDE35_OPUS_CONTEXT_LIMIT', 200000),
    safetyMargin: getEnvNumber('MODEL_CLAUDE35_OPUS_SAFETY_MARGIN', 0.75),
    inputCostPerMillion: getEnvNumber('MODEL_CLAUDE35_OPUS_INPUT_COST_PER_MILLION', 15.0),
    outputCostPerMillion: getEnvNumber('MODEL_CLAUDE35_OPUS_OUTPUT_COST_PER_MILLION', 75.0),
  },
  claude35Haiku: {
    displayName: getEnv('MODEL_CLAUDE35_HAIKU_DISPLAY_NAME', 'Claude 3.5 Haiku'),
    contextLimit: getEnvNumber('MODEL_CLAUDE35_HAIKU_CONTEXT_LIMIT', 200000),
    safetyMargin: getEnvNumber('MODEL_CLAUDE35_HAIKU_SAFETY_MARGIN', 0.80),
    inputCostPerMillion: getEnvNumber('MODEL_CLAUDE35_HAIKU_INPUT_COST_PER_MILLION', 0.80),
    outputCostPerMillion: getEnvNumber('MODEL_CLAUDE35_HAIKU_OUTPUT_COST_PER_MILLION', 4.0),
  },
  gemini15Pro: {
    displayName: getEnv('MODEL_GEMINI15_PRO_DISPLAY_NAME', 'Gemini 1.5 Pro'),
    contextLimit: getEnvNumber('MODEL_GEMINI15_PRO_CONTEXT_LIMIT', 2000000),
    safetyMargin: getEnvNumber('MODEL_GEMINI15_PRO_SAFETY_MARGIN', 0.80),
    inputCostPerMillion: getEnvNumber('MODEL_GEMINI15_PRO_INPUT_COST_PER_MILLION', 1.25),
    outputCostPerMillion: getEnvNumber('MODEL_GEMINI15_PRO_OUTPUT_COST_PER_MILLION', 5.0),
  },
  gemini20Flash: {
    displayName: getEnv('MODEL_GEMINI20_FLASH_DISPLAY_NAME', 'Gemini 2.0 Flash'),
    contextLimit: getEnvNumber('MODEL_GEMINI20_FLASH_CONTEXT_LIMIT', 1000000),
    safetyMargin: getEnvNumber('MODEL_GEMINI20_FLASH_SAFETY_MARGIN', 0.85),
    inputCostPerMillion: getEnvNumber('MODEL_GEMINI20_FLASH_INPUT_COST_PER_MILLION', 0.075),
    outputCostPerMillion: getEnvNumber('MODEL_GEMINI20_FLASH_OUTPUT_COST_PER_MILLION', 0.30),
  },
} as const;

/**
 * Default configuration options
 */
export interface DefaultConfig {
  readonly maxFileSizeBytes: number;
  readonly maxNestedFolders: number;
  readonly outputFile: string;
  readonly outputFormat: string;
  readonly profile: string;
  readonly indent: number;
  readonly stripComments: boolean;
  readonly withTree: boolean;
  readonly withStats: boolean;
  readonly tokenCount: boolean;
  readonly showLLMReport: boolean;
  readonly displaySettings: {
    readonly showGenerationSummary: boolean;
    readonly showCodeComposition: boolean;
    readonly showContextFit: boolean;
    readonly showHealthHints: boolean;
    readonly showTokenWarnings: boolean;
    readonly showCostEstimates: boolean;
    readonly showRecommendations: boolean;
  };
}

const defaults: DefaultConfig = {
  maxFileSizeBytes: getEnvNumber('DEFAULT_MAX_FILE_SIZE_BYTES', 1024 * 1024),
  maxNestedFolders: getEnvNumber('DEFAULT_MAX_NESTED_FOLDERS', 4),
  outputFile: getEnv('DEFAULT_OUTPUT_FILE', 'source_code.md'),
  outputFormat: getEnv('DEFAULT_OUTPUT_FORMAT', 'md'),
  profile: getEnv('DEFAULT_PROFILE', 'llm-context'),
  indent: getEnvNumber('DEFAULT_INDENT', 2),
  stripComments: getEnvBoolean('DEFAULT_STRIP_COMMENTS', false),
  withTree: getEnvBoolean('DEFAULT_WITH_TREE', true),
  withStats: getEnvBoolean('DEFAULT_WITH_STATS', true),
  tokenCount: getEnvBoolean('DEFAULT_TOKEN_COUNT', true),
  showLLMReport: getEnvBoolean('DEFAULT_SHOW_LLM_REPORT', false),
  displaySettings: {
    showGenerationSummary: getEnvBoolean('DEFAULT_SHOW_GENERATION_SUMMARY', true),
    showCodeComposition: getEnvBoolean('DEFAULT_SHOW_CODE_COMPOSITION', true),
    showContextFit: getEnvBoolean('DEFAULT_SHOW_CONTEXT_FIT', true),
    showHealthHints: getEnvBoolean('DEFAULT_SHOW_HEALTH_HINTS', true),
    showTokenWarnings: getEnvBoolean('DEFAULT_SHOW_TOKEN_WARNINGS', true),
    showCostEstimates: getEnvBoolean('DEFAULT_SHOW_COST_ESTIMATES', true),
    showRecommendations: getEnvBoolean('DEFAULT_SHOW_RECOMMENDATIONS', true),
  },
};

/**
 * Performance settings
 */
export interface PerformanceConfig {
  readonly daemonCacheTTL: number;
  readonly daemonCacheMaxSize: number;
  readonly binaryFileSampleSize: number;
  readonly binaryFileThreshold: number;
  readonly historyMaxEntries: number;
}

const performance: PerformanceConfig = {
  daemonCacheTTL: getEnvNumber('DAEMON_CACHE_TTL', 300000),
  daemonCacheMaxSize: getEnvNumber('DAEMON_CACHE_MAX_SIZE', 10),
  binaryFileSampleSize: getEnvNumber('BINARY_FILE_SAMPLE_SIZE', 8192),
  binaryFileThreshold: getEnvNumber('BINARY_FILE_THRESHOLD', 0.30),
  historyMaxEntries: getEnvNumber('HISTORY_MAX_ENTRIES', 1000),
};

/**
 * Budget settings
 */
export interface BudgetConfig {
  readonly eurUsdConversion: number;
  readonly markdownOverhead: number;
}

const budget: BudgetConfig = {
  eurUsdConversion: getEnvNumber('BUDGET_EUR_USD_CONVERSION', 1.08),
  markdownOverhead: getEnvNumber('BUDGET_MARKDOWN_OVERHEAD', 1.08),
};

/**
 * CLI output colors
 */
export interface CLIColors {
  readonly success: string;
  readonly error: string;
  readonly warning: string;
  readonly info: string;
  readonly accent: string;
  readonly dim: string;
  readonly highlight: string;
}

const cliColors: CLIColors = {
  success: getEnv('CLI_COLOR_SUCCESS', 'greenBright'),
  error: getEnv('CLI_COLOR_ERROR', 'redBright'),
  warning: getEnv('CLI_COLOR_WARNING', 'yellowBright'),
  info: getEnv('CLI_COLOR_INFO', 'cyanBright'),
  accent: getEnv('CLI_COLOR_ACCENT', 'magentaBright'),
  dim: getEnv('CLI_COLOR_DIM', 'gray'),
  highlight: getEnv('CLI_COLOR_HIGHLIGHT', 'white'),
};

/**
 * Complete environment configuration
 */
export interface EnvConfig {
  readonly interactive: InteractiveConfig;
  readonly treeTheme: TreeThemeConfig;
  readonly tokenEstimation: TokenEstimationConfig;
  readonly llmProviders: typeof llmProviders;
  readonly modelPresets: typeof modelPresets;
  readonly defaults: DefaultConfig;
  readonly performance: PerformanceConfig;
  readonly budget: BudgetConfig;
  readonly cliColors: CLIColors;
}

/**
 * Exported environment configuration
 */
export const env: EnvConfig = {
  interactive,
  treeTheme,
  tokenEstimation,
  llmProviders,
  modelPresets,
  defaults,
  performance,
  budget,
  cliColors,
};
