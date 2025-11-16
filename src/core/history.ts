import { homedir } from 'node:os';
import { join, basename, resolve } from 'node:path';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import type { ResolvedOptions, CliOptions, FileInfo } from './types.js';

/**
 * A single history entry representing one bundle generation run
 */
export interface HistoryEntry {
  readonly id: string; // UUID
  readonly timestamp: string; // ISO 8601
  readonly project: {
    readonly name: string;
    readonly path: string;
    readonly gitBranch?: string;
    readonly gitCommit?: string;
  };
  readonly command: {
    readonly args: readonly string[]; // Original CLI args
    readonly preset?: string;
    readonly profile: string;
    readonly model?: string;
  };
  readonly result: {
    readonly fileCount: number;
    readonly totalBytes: number;
    readonly estimatedTokens: number;
    readonly estimatedCost?: number;
    readonly outputFile: string;
    readonly format: string;
    readonly duration: number; // ms
  };
  readonly files: {
    readonly included: readonly string[]; // Relative paths
    readonly excluded: readonly string[]; // Top excluded patterns
  };
  readonly tags?: readonly string[]; // User-defined tags
  readonly notes?: string; // Optional notes
}

/**
 * History storage format
 */
interface HistoryStore {
  version: number;
  entries: HistoryEntry[];
}

const CONFIG_DIR = join(homedir(), '.config', 'repo-roller');
const HISTORY_FILE = join(CONFIG_DIR, 'history.json');
const MAX_HISTORY_ENTRIES = 1000;

async function ensureConfigDir(): Promise<void> {
  try {
    await mkdir(CONFIG_DIR, { recursive: true });
  } catch {
    // Directory might already exist
  }
}

/**
 * Generate a simple UUID v4
 */
function generateId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;

  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Get git information for the current directory
 */
function getGitInfo(cwd: string): { branch?: string; commit?: string } {
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', {
      cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();

    const commit = execSync('git rev-parse --short HEAD', {
      cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();

    return { branch, commit };
  } catch {
    return {};
  }
}

/**
 * Load history from disk
 */
export async function loadHistory(): Promise<HistoryStore> {
  try {
    const content = await readFile(HISTORY_FILE, 'utf-8');
    const store = JSON.parse(content) as HistoryStore;
    return store;
  } catch {
    return { version: 1, entries: [] };
  }
}

/**
 * Save history to disk
 */
async function saveHistory(store: HistoryStore): Promise<void> {
  await ensureConfigDir();
  // Prune old entries if over limit
  if (store.entries.length > MAX_HISTORY_ENTRIES) {
    store.entries = store.entries.slice(-MAX_HISTORY_ENTRIES);
  }
  await writeFile(HISTORY_FILE, JSON.stringify(store, null, 2), 'utf-8');
}

/**
 * Record a new history entry after successful bundle generation
 */
export async function recordHistoryEntry(params: {
  resolvedOptions: ResolvedOptions;
  cliArgs: readonly string[];
  selectedFiles: readonly FileInfo[];
  estimatedTokens: number;
  estimatedCost?: number;
  duration: number;
}): Promise<HistoryEntry> {
  const { resolvedOptions, cliArgs, selectedFiles, estimatedTokens, estimatedCost, duration } = params;

  const gitInfo = getGitInfo(resolvedOptions.root);

  const entry: HistoryEntry = {
    id: generateId(),
    timestamp: new Date().toISOString(),
    project: {
      name: basename(resolve(resolvedOptions.root)),
      path: resolve(resolvedOptions.root),
      gitBranch: gitInfo.branch,
      gitCommit: gitInfo.commit,
    },
    command: {
      args: cliArgs,
      preset: resolvedOptions.presetName,
      profile: resolvedOptions.profile,
      model: resolvedOptions.modelPreset,
    },
    result: {
      fileCount: selectedFiles.length,
      totalBytes: selectedFiles.reduce((sum, f) => sum + f.sizeBytes, 0),
      estimatedTokens,
      estimatedCost,
      outputFile: resolvedOptions.outFile,
      format: resolvedOptions.format,
      duration,
    },
    files: {
      included: selectedFiles.map((f) => f.relativePath),
      excluded: resolvedOptions.exclude.slice(0, 10), // Top 10 exclusion patterns
    },
  };

  const store = await loadHistory();
  store.entries.push(entry);
  await saveHistory(store);

  return entry;
}

/**
 * Query history entries with filters
 */
export interface HistoryQueryOptions {
  readonly project?: string; // Filter by project name (partial match)
  readonly branch?: string; // Filter by git branch
  readonly preset?: string; // Filter by preset used
  readonly tag?: string; // Filter by tag
  readonly since?: Date; // Filter entries after this date
  readonly limit?: number; // Max entries to return
  readonly offset?: number; // Skip first N entries
}

export async function queryHistory(options: HistoryQueryOptions = {}): Promise<readonly HistoryEntry[]> {
  const store = await loadHistory();
  let entries = [...store.entries];

  // Apply filters
  if (options.project) {
    const needle = options.project.toLowerCase();
    entries = entries.filter((e) => e.project.name.toLowerCase().includes(needle));
  }

  if (options.branch) {
    entries = entries.filter((e) => e.project.gitBranch === options.branch);
  }

  if (options.preset) {
    entries = entries.filter((e) => e.command.preset === options.preset);
  }

  if (options.tag) {
    entries = entries.filter((e) => e.tags?.includes(options.tag!));
  }

  if (options.since) {
    entries = entries.filter((e) => new Date(e.timestamp) >= options.since!);
  }

  // Sort by timestamp descending (most recent first)
  entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Apply pagination
  const offset = options.offset ?? 0;
  const limit = options.limit ?? 20;
  entries = entries.slice(offset, offset + limit);

  return entries;
}

/**
 * Get a specific history entry by ID or index
 */
export async function getHistoryEntry(idOrIndex: string | number): Promise<HistoryEntry | undefined> {
  const store = await loadHistory();

  if (typeof idOrIndex === 'number') {
    // Support negative indexing (like Python): -1 = last, -2 = second-to-last
    const index = idOrIndex < 0 ? store.entries.length + idOrIndex : idOrIndex;
    return store.entries[index];
  }

  // Search by ID (supports partial match)
  return store.entries.find((e) => e.id.startsWith(idOrIndex));
}

/**
 * Tag a history entry
 */
export async function tagHistoryEntry(idOrIndex: string | number, tags: readonly string[]): Promise<void> {
  const store = await loadHistory();
  const entry = typeof idOrIndex === 'number' ? store.entries[idOrIndex < 0 ? store.entries.length + idOrIndex : idOrIndex] : store.entries.find((e) => e.id.startsWith(idOrIndex));

  if (!entry) {
    throw new Error(`History entry not found: ${idOrIndex}`);
  }

  // Update entry in place (find the mutable reference)
  const mutableEntry = entry as { tags?: string[] };
  mutableEntry.tags = [...(entry.tags ?? []), ...tags];

  await saveHistory(store);
}

/**
 * Add notes to a history entry
 */
export async function annotateHistoryEntry(idOrIndex: string | number, notes: string): Promise<void> {
  const store = await loadHistory();
  const entry = typeof idOrIndex === 'number' ? store.entries[idOrIndex < 0 ? store.entries.length + idOrIndex : idOrIndex] : store.entries.find((e) => e.id.startsWith(idOrIndex));

  if (!entry) {
    throw new Error(`History entry not found: ${idOrIndex}`);
  }

  const mutableEntry = entry as { notes?: string };
  mutableEntry.notes = notes;

  await saveHistory(store);
}

/**
 * Delete history entries
 */
export async function clearHistory(options: { all?: boolean; beforeDate?: Date; id?: string }): Promise<number> {
  const store = await loadHistory();
  const originalCount = store.entries.length;

  if (options.all) {
    store.entries = [];
  } else if (options.beforeDate) {
    store.entries = store.entries.filter((e) => new Date(e.timestamp) >= options.beforeDate!);
  } else if (options.id) {
    store.entries = store.entries.filter((e) => !e.id.startsWith(options.id!));
  }

  await saveHistory(store);
  return originalCount - store.entries.length;
}

/**
 * Compute diff between two history entries
 */
export interface HistoryDiff {
  readonly entry1: HistoryEntry;
  readonly entry2: HistoryEntry;
  readonly filesDiff: {
    readonly added: readonly string[]; // In entry2 but not entry1
    readonly removed: readonly string[]; // In entry1 but not entry2
    readonly unchanged: readonly string[]; // In both
  };
  readonly metricsDiff: {
    readonly fileCount: number; // entry2.fileCount - entry1.fileCount
    readonly totalBytes: number;
    readonly estimatedTokens: number;
    readonly estimatedCost?: number;
    readonly duration: number;
  };
}

export async function diffHistory(id1: string | number, id2: string | number): Promise<HistoryDiff> {
  const entry1 = await getHistoryEntry(id1);
  const entry2 = await getHistoryEntry(id2);

  if (!entry1) {
    throw new Error(`History entry not found: ${id1}`);
  }
  if (!entry2) {
    throw new Error(`History entry not found: ${id2}`);
  }

  const files1 = new Set(entry1.files.included);
  const files2 = new Set(entry2.files.included);

  const added = [...files2].filter((f) => !files1.has(f));
  const removed = [...files1].filter((f) => !files2.has(f));
  const unchanged = [...files1].filter((f) => files2.has(f));

  return {
    entry1,
    entry2,
    filesDiff: { added, removed, unchanged },
    metricsDiff: {
      fileCount: entry2.result.fileCount - entry1.result.fileCount,
      totalBytes: entry2.result.totalBytes - entry1.result.totalBytes,
      estimatedTokens: entry2.result.estimatedTokens - entry1.result.estimatedTokens,
      estimatedCost: entry2.result.estimatedCost !== undefined && entry1.result.estimatedCost !== undefined ? entry2.result.estimatedCost - entry1.result.estimatedCost : undefined,
      duration: entry2.result.duration - entry1.result.duration,
    },
  };
}

/**
 * Convert history entry to CLI arguments for replay
 */
export function entryToCliArgs(entry: HistoryEntry): readonly string[] {
  const args: string[] = [entry.project.path];

  if (entry.command.preset) {
    args.push('--preset', entry.command.preset);
  }

  if (entry.command.profile !== 'default') {
    args.push('--profile', entry.command.profile);
  }

  if (entry.command.model) {
    args.push('--model', entry.command.model);
  }

  // We preserve the format but generate new output file
  args.push('--format', entry.result.format);

  return args;
}

/**
 * Export history in various formats
 */
export type HistoryExportFormat = 'json' | 'yaml' | 'csv';

export async function exportHistory(format: HistoryExportFormat): Promise<string> {
  const store = await loadHistory();

  switch (format) {
    case 'json':
      return JSON.stringify(store.entries, null, 2);

    case 'yaml': {
      // Simple YAML serialization
      const lines: string[] = [];
      for (const entry of store.entries) {
        lines.push(`- id: ${entry.id}`);
        lines.push(`  timestamp: ${entry.timestamp}`);
        lines.push(`  project:`);
        lines.push(`    name: ${entry.project.name}`);
        lines.push(`    path: ${entry.project.path}`);
        if (entry.project.gitBranch) {
          lines.push(`    branch: ${entry.project.gitBranch}`);
        }
        lines.push(`  result:`);
        lines.push(`    files: ${entry.result.fileCount}`);
        lines.push(`    tokens: ${entry.result.estimatedTokens}`);
        lines.push(`    output: ${entry.result.outputFile}`);
        lines.push('');
      }
      return lines.join('\n');
    }

    case 'csv': {
      const headers = ['id', 'timestamp', 'project', 'branch', 'files', 'bytes', 'tokens', 'cost', 'format', 'duration_ms'];
      const rows = store.entries.map((e) => [e.id.slice(0, 8), e.timestamp, e.project.name, e.project.gitBranch ?? '', e.result.fileCount, e.result.totalBytes, e.result.estimatedTokens, e.result.estimatedCost?.toFixed(4) ?? '', e.result.format, e.result.duration].join(','));
      return [headers.join(','), ...rows].join('\n');
    }
  }
}

/**
 * Get summary statistics from history
 */
export interface HistoryStats {
  readonly totalRuns: number;
  readonly uniqueProjects: number;
  readonly totalTokensGenerated: number;
  readonly totalCostIncurred: number;
  readonly averageFilesPerRun: number;
  readonly mostUsedPreset?: string;
  readonly mostActiveProject?: string;
  readonly recentActivity: {
    readonly last24h: number;
    readonly last7d: number;
    readonly last30d: number;
  };
}

export async function getHistoryStats(): Promise<HistoryStats> {
  const store = await loadHistory();
  const entries = store.entries;

  if (entries.length === 0) {
    return {
      totalRuns: 0,
      uniqueProjects: 0,
      totalTokensGenerated: 0,
      totalCostIncurred: 0,
      averageFilesPerRun: 0,
      recentActivity: { last24h: 0, last7d: 0, last30d: 0 },
    };
  }

  const projects = new Set(entries.map((e) => e.project.path));
  const presetCounts = new Map<string, number>();
  const projectCounts = new Map<string, number>();

  let totalTokens = 0;
  let totalCost = 0;
  let totalFiles = 0;

  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  let last24h = 0;
  let last7d = 0;
  let last30d = 0;

  for (const entry of entries) {
    totalTokens += entry.result.estimatedTokens;
    totalCost += entry.result.estimatedCost ?? 0;
    totalFiles += entry.result.fileCount;

    if (entry.command.preset) {
      presetCounts.set(entry.command.preset, (presetCounts.get(entry.command.preset) ?? 0) + 1);
    }
    projectCounts.set(entry.project.name, (projectCounts.get(entry.project.name) ?? 0) + 1);

    const age = now - new Date(entry.timestamp).getTime();
    if (age <= day) {last24h++;}
    if (age <= 7 * day) {last7d++;}
    if (age <= 30 * day) {last30d++;}
  }

  const mostUsedPreset = [...presetCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const mostActiveProject = [...projectCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

  return {
    totalRuns: entries.length,
    uniqueProjects: projects.size,
    totalTokensGenerated: totalTokens,
    totalCostIncurred: totalCost,
    averageFilesPerRun: Math.round(totalFiles / entries.length),
    mostUsedPreset,
    mostActiveProject,
    recentActivity: { last24h, last7d, last30d },
  };
}
