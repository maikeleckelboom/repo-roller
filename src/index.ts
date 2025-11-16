// Core types
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

// Core functions
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
export { formatBytes, displayExamples } from "./core/helpers.js";
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

// History
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

// Schema introspection
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

// Daemon
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

// Version
export const VERSION = "1.0.0";