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

// Version
export const VERSION = "1.0.0";