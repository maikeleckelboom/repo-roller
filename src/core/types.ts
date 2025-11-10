/**
 * Sort modes for organizing files in output
 */
export type SortMode = 'path' | 'size' | 'extension';

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
 * Options for rendering markdown output
 */
export interface RenderOptions {
  readonly withTree: boolean;
  readonly withStats: boolean;
  readonly stripComments: boolean;
}

/**
 * CLI command options (raw from commander)
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
}
