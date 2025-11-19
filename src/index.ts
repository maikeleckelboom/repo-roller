/**
 * repo-roller - Source code aggregation for LLMs
 *
 * Public API Stability:
 * - ✓ STABLE: Core functions (scan, render, tokens) - Safe to use in production
 * - ✓ STABLE: Core types (FileInfo, ResolvedOptions, etc.)
 * - ⚠️ BETA: Daemon API - May change in minor versions
 * - ⚠️ BETA: Schema/introspection API - May change in minor versions
 * - 🔬 EXPERIMENTAL: Logger API - Interface may evolve
 *
 * Breaking changes follow semantic versioning (major version bumps).
 */

// Core types (STABLE)
export type {
  SortMode,
  OutputFormat,
  ProfileLayout,
  ProfileConfig,
  RepoRollerYmlConfig,
  RollerPreset,
  RollerConfig,
  FileInfo,
  ScanResult,
  OutputMetadata,
  StructuredOutput,
  RenderOptions,
  CliOptions,
  ResolvedOptions,
} from "./core/types.js";

// Core functions (STABLE)
export { scanFiles } from "./core/scan.js";
export {
  renderMarkdown,
  renderJson,
  renderYaml,
  renderTxt,
  render,
  getLanguage,
} from "./core/render.js";
export { loadConfig, loadRepoRollerYml, resolveOptions } from "./core/config.js";
export {
  estimateTokens,
  estimateTokensDetailed,
  calculateCost,
  getAllCostEstimates,
  formatCostEstimate,
  analyzeTokenUsage,
  generateTokenReport,
  LLM_PROVIDERS,
} from "./core/tokens.js";
export {
  selectFilesWithinBudget,
  estimateFileTokens,
  estimateFileCost,
  parseBudgetString,
  formatBudget,
  formatBudgetUsage,
} from "./core/budget.js";
export { formatBytes } from "./core/helpers.js";
export type { FileRole, LanguageBreakdown, RoleBreakdown, DirectorySize } from "./core/helpers.js";
export {
  BUILT_IN_PRESETS,
  getBuiltInPreset,
  listBuiltInPresets,
  isBuiltInPreset,
} from "./core/builtInPresets.js";
export {
  validateRollerConfig,
  validateRepoRollerYml,
  formatValidationErrors,
  validateCliOptions,
} from "./core/validation.js";

// History (STABLE)
export {
  loadHistory,
  recordHistoryEntry,
  queryHistory,
  getHistoryEntry,
  tagHistoryEntry,
  annotateHistoryEntry,
  clearHistory,
  diffHistory,
  entryToCliArgs,
  exportHistory,
  getHistoryStats,
} from "./core/history.js";

export type {
  HistoryEntry,
  HistoryQueryOptions,
  HistoryDiff,
  HistoryStats,
  HistoryExportFormat,
} from "./core/history.js";

// Schema introspection (BETA - May change in minor versions)
export {
  generateCliSchema,
  generateLlmToolDefinition,
  generateShellCompletions,
  generateOpenApiDocs,
} from "./core/schema.js";

export type {
  CliSchema,
  CliCommand,
  CliOption,
  CliArgument,
  SchemaProperty,
  LlmToolDefinition,
} from "./core/schema.js";

// Daemon (BETA - May change in minor versions)
export {
  startDaemon,
  sendRequest,
  isDaemonRunning,
  getDaemonPid,
  getDefaultSocketPath,
  generateRequestId,
} from "./core/daemon.js";

export type {
  DaemonRequest,
  DaemonResponse,
  DaemonConfig,
} from "./core/daemon.js";

// Logging (EXPERIMENTAL - Interface may evolve)
export { logger, Logger } from "./core/logger.js";
export type { LogLevel } from "./core/logger.js";

// Version
export const VERSION = "1.0.0";