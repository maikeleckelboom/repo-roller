/**
 * Sort modes for organizing files in output
 */
export type SortMode = 'path' | 'size' | 'extension';

/**
 * Output formats supported by the tool
 */
export type OutputFormat = 'md' | 'json' | 'yaml' | 'txt';

/**
 * Profile layout configuration
 */
export interface ProfileLayout {
  readonly layout: readonly string[];
}

/**
 * Profile configuration with layout for file ordering
 */
export type ProfileConfig = ProfileLayout;

/**
 * Configuration for .reporoller.yml
 */
export interface RepoRollerYmlConfig {
  readonly architectural_overview?: string;
  readonly profiles?: Readonly<Record<string, ProfileConfig>>;
  readonly presets?: Readonly<Record<string, RollerPreset>>;
}

/**
 * A preset configuration that can be saved and reused
 */
export interface RollerPreset {
  readonly include?: readonly string[];
  readonly exclude?: readonly string[];
  readonly extensions?: readonly string[];
  readonly maxFileSizeBytes?: number;
  readonly stripComments?: boolean;
  readonly withTree?: boolean;
  readonly withStats?: boolean;
  readonly sort?: SortMode;
  // Enhanced preset fields for intent-based bundling
  readonly description?: string;
  readonly header?: string;
  readonly footer?: string;
  readonly addOutlines?: boolean; // Future feature: per-file code outlines
}

/**
 * Configuration loaded from repo-roller.config file
 */
export interface RollerConfig {
  readonly root: string;
  readonly presets?: Readonly<Record<string, RollerPreset>>;
  readonly defaultPreset?: string;
}

/**
 * Information about a single file discovered during scanning
 */
export interface FileInfo {
  readonly absolutePath: string;
  readonly relativePath: string;
  readonly sizeBytes: number;
  readonly extension: string;
  readonly isBinary: boolean;
  readonly isDefaultIncluded: boolean; // Whether file should be pre-selected in interactive mode
  readonly lastModified: Date; // File modification timestamp for metadata display
}

/**
 * Result of scanning the filesystem
 */
export interface ScanResult {
  readonly files: readonly FileInfo[];
  readonly totalBytes: number;
  readonly rootPath: string;
  readonly extensionCounts: Readonly<Record<string, number>>;
}

/**
 * Metadata for structured output formats
 */
export interface OutputMetadata {
  readonly sourceRepository?: string;
  readonly profile: string;
  readonly timestamp: string;
  readonly fileCount: number;
}

/**
 * Structured data for JSON/YAML output
 */
export interface StructuredOutput {
  readonly metadata: OutputMetadata;
  readonly architecturalOverview?: string;
  readonly files: readonly {
    readonly path: string;
    readonly language: string;
    readonly content: string;
  }[];
}

/**
 * Options for rendering markdown output
 */
export interface RenderOptions {
  readonly withTree: boolean;
  readonly withStats: boolean;
  readonly stripComments: boolean;
}

/**
 * Commander.js options (raw from parser, uses different naming convention)
 * Note: Commander converts --no-X flags to X: false, not noX: true
 */
export interface CommanderOptions {
  readonly out?: string;
  readonly outTemplate?: string;
  readonly format?: string;
  readonly include?: string[];
  readonly exclude?: string[];
  readonly ext?: string;
  readonly lang?: string;
  readonly maxSize?: number;
  readonly tests?: boolean;  // --no-tests becomes tests: false
  readonly deps?: boolean;   // --no-deps becomes deps: false
  readonly generated?: boolean; // --no-generated becomes generated: false
  readonly stripComments?: boolean;
  readonly tree?: boolean;
  readonly stats?: boolean;
  readonly sort?: string;
  readonly interactive?: boolean;
  readonly dryRun?: boolean;
  readonly statsOnly?: boolean;
  readonly preset?: string;
  readonly profile?: string;
  readonly compact?: boolean;
  readonly indent?: number;
  readonly toc?: boolean;
  readonly frontMatter?: boolean;
  readonly listPresets?: boolean;
  readonly listProfiles?: boolean;
  readonly showPreset?: string;
  readonly showProfile?: string;
  readonly examples?: boolean;
  readonly verbose?: boolean;
  readonly tokenCount?: boolean;
  readonly target?: string;
  readonly warnTokens?: number;
  readonly listProviders?: boolean;
  readonly maxTokens?: number;
  readonly maxCost?: number;
  readonly maxCostEur?: number;
  readonly validate?: boolean;
  readonly yes?: boolean;
  readonly defaults?: boolean;
  // LLM report display options
  readonly llm?: boolean;
  readonly llmReport?: boolean;
  // Git-aware selection options
  readonly since?: string;
  readonly staged?: boolean;
  readonly unstaged?: boolean;
  readonly changed?: boolean;
}


/**
 * CLI command options (normalized for internal use)
 */
export interface CliOptions {
  readonly root?: string;
  readonly out?: string;
  readonly include?: readonly string[];
  readonly exclude?: readonly string[];
  readonly ext?: string;
  readonly maxSize?: number;
  readonly stripComments?: boolean;
  readonly tree?: boolean;
  readonly stats?: boolean;
  readonly sort?: SortMode;
  readonly interactive?: boolean;
  readonly preset?: string;
  readonly verbose?: boolean;
  readonly profile?: string;
  readonly format?: OutputFormat;
  // New DX options
  readonly dryRun?: boolean;
  readonly statsOnly?: boolean;
  readonly lang?: string;
  readonly noTests?: boolean;
  readonly noDeps?: boolean;
  readonly noGenerated?: boolean;
  readonly changed?: boolean;
  readonly staged?: boolean;
  readonly unstaged?: boolean;
  readonly since?: string;
  readonly listPresets?: boolean;
  readonly listProfiles?: boolean;
  readonly showProfile?: string;
  readonly examples?: boolean;
  readonly outTemplate?: string;
  // Format-specific options
  readonly compact?: boolean;
  readonly indent?: number;
  readonly toc?: boolean;
  readonly frontMatter?: boolean;
  // Token counting options
  readonly tokenCount?: boolean;
  readonly target?: string;
  readonly warnTokens?: number;
  // Token budget options
  readonly maxTokens?: number;
  readonly maxCost?: number;
  readonly maxCostEur?: number;
  // DX improvements: Skip prompts
  readonly yes?: boolean;
  // LLM report display options
  readonly showLLMReport?: boolean;
}

/**
 * Fully resolved options after merging defaults, preset, and CLI args
 */
export interface ResolvedOptions {
  readonly root: string;
  readonly outFile: string;
  readonly include: readonly string[];
  readonly exclude: readonly string[];
  readonly extensions: readonly string[];
  readonly maxFileSizeBytes: number;
  readonly stripComments: boolean;
  readonly withTree: boolean;
  readonly withStats: boolean;
  readonly sort: SortMode;
  readonly interactive: boolean;
  readonly verbose: boolean;
  readonly presetName?: string;
  readonly profile: string;
  readonly format: OutputFormat;
  readonly repoRollerConfig?: RepoRollerYmlConfig;
  // New DX options
  readonly dryRun: boolean;
  readonly statsOnly: boolean;
  // Format-specific options
  readonly compact: boolean;
  readonly indent: number;
  readonly toc: boolean;
  readonly frontMatter: boolean;
  // Token counting options
  readonly tokenCount: boolean;
  readonly targetProvider?: string;
  readonly warnTokens?: number;
  // Token budget options
  readonly maxTokens?: number;
  readonly maxCost?: number;
  readonly maxCostEur?: number;
  // DX improvements: Skip prompts
  readonly yes: boolean;
  // Tracking what was explicitly specified (for smarter recommendations)
  readonly profileExplicitlySet?: boolean;
  readonly maxSizeExplicitlySet?: boolean;
  // LLM report display options
  readonly showLLMReport: boolean;
  // Enhanced preset fields for intent-based bundling
  readonly presetHeader?: string;
  readonly presetFooter?: string;
  readonly presetDescription?: string;
  readonly addOutlines: boolean;
  // Git-aware selection options
  readonly gitSince?: string;
  readonly gitStaged?: boolean;
  readonly gitUnstaged?: boolean;
  readonly gitChanged?: boolean;
}

