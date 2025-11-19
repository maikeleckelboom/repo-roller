import * as ui from '../core/ui.js';
import {
  queryHistory,
  getHistoryEntry,
  diffHistory,
  exportHistory,
  getHistoryStats,
  entryToCliArgs,
  type HistoryDiff,
} from '../core/history.js';

/**
 * Display history list in a formatted table
 */
export async function displayHistoryList(options: { limit?: number; project?: string } = {}): Promise<void> {
  const entries = await queryHistory({
    limit: options.limit ?? 10,
    project: options.project,
  });

  if (entries.length === 0) {
    console.log(ui.info('No history entries found.'));
    console.log(ui.colors.dim('  Generate some bundles first!'));
    return;
  }

  console.log(ui.header());
  console.log(ui.section('Bundle History'));

  const now = Date.now();

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]!;
    const age = now - new Date(entry.timestamp).getTime();
    const timeAgo = formatTimeAgo(age);

    // First line: ID, project, branch
    const shortId = ui.colors.dim(entry.id.slice(0, 8));
    const project = ui.colors.accent(entry.project.name);
    const branch = entry.project.gitBranch ? ui.colors.muted(`@${entry.project.gitBranch}`) : '';

    console.log(`  ${shortId}  ${project}${branch}`);

    // Second line: metrics
    const files = `${entry.result.fileCount} files`;
    const tokens = ui.tokenCount(entry.result.estimatedTokens);
    const cost = entry.result.estimatedCost !== undefined ? ui.colors.dim(`$${entry.result.estimatedCost.toFixed(4)}`) : '';
    const format = ui.colors.dim(`[${entry.result.format}]`);
    const time = ui.colors.muted(timeAgo);

    console.log(`           ${files}  ${tokens} tokens  ${cost}  ${format}  ${time}`);

    // Third line: preset/profile/tags
    const preset = entry.command.preset ? ui.colors.info(entry.command.preset) : '';
    const profile = entry.command.profile !== 'default' ? ui.colors.secondary(entry.command.profile) : '';
    const tags = entry.tags?.length ? entry.tags.map((t) => ui.colors.warning(`#${t}`)).join(' ') : '';

    if (preset || profile || tags) {
      console.log(`           ${preset}  ${profile}  ${tags}`);
    }

    console.log('');
  }

  console.log(ui.colors.dim(`  Showing ${entries.length} most recent entries`));
  console.log(ui.colors.dim('  Use --show <id> to see details, --diff <id1>..<id2> to compare'));
  console.log('');
}

/**
 * Display detailed information about a single history entry
 */
export async function displayHistoryEntry(idOrIndex: string | number): Promise<void> {
  const entry = await getHistoryEntry(idOrIndex);

  if (!entry) {
    console.error(ui.error(`History entry not found: ${idOrIndex}`));
    return;
  }

  console.log(ui.header());
  console.log(ui.section('Bundle Details'));

  // Entry ID and timestamp
  console.log(ui.keyValue('ID', entry.id));
  console.log(ui.keyValue('Timestamp', formatTimestamp(entry.timestamp)));
  console.log('');

  // Project info
  console.log(ui.colors.primary.bold('  Project'));
  console.log(ui.keyValue('Name', entry.project.name, 18));
  console.log(ui.keyValue('Path', entry.project.path, 18));
  if (entry.project.gitBranch) {
    console.log(ui.keyValue('Branch', entry.project.gitBranch, 18));
  }
  if (entry.project.gitCommit) {
    console.log(ui.keyValue('Commit', entry.project.gitCommit, 18));
  }
  console.log('');

  // Command info
  console.log(ui.colors.primary.bold('  Command'));
  if (entry.command.preset) {
    console.log(ui.keyValue('Preset', entry.command.preset, 18));
  }
  console.log(ui.keyValue('Profile', entry.command.profile, 18));
  if (entry.command.model) {
    console.log(ui.keyValue('Model', entry.command.model, 18));
  }
  console.log(ui.keyValue('Args', entry.command.args.join(' ').slice(0, 50) + '...', 18));
  console.log('');

  // Result metrics
  console.log(ui.colors.primary.bold('  Results'));
  console.log(ui.keyValue('Files', entry.result.fileCount.toString(), 18));
  console.log(ui.keyValue('Size', formatBytes(entry.result.totalBytes), 18));
  console.log(ui.keyValue('Tokens', entry.result.estimatedTokens.toLocaleString(), 18));
  if (entry.result.estimatedCost !== undefined) {
    console.log(ui.keyValue('Cost', `$${entry.result.estimatedCost.toFixed(4)}`, 18));
  }
  console.log(ui.keyValue('Format', entry.result.format, 18));
  console.log(ui.keyValue('Output', entry.result.outputFile, 18));
  console.log(ui.keyValue('Duration', `${entry.result.duration}ms`, 18));
  console.log('');

  // Files included (truncated)
  if (entry.files.included.length > 0) {
    console.log(ui.colors.primary.bold('  Files Included'));
    const maxToShow = 10;
    for (let i = 0; i < Math.min(entry.files.included.length, maxToShow); i++) {
      console.log(`    ${ui.colors.dim(ui.symbols.bullet)} ${entry.files.included[i]}`);
    }
    if (entry.files.included.length > maxToShow) {
      console.log(ui.colors.dim(`    ... and ${entry.files.included.length - maxToShow} more`));
    }
    console.log('');
  }

  // Tags and notes
  if (entry.tags?.length) {
    console.log(ui.colors.primary.bold('  Tags'));
    console.log(`    ${entry.tags.map((t) => ui.colors.warning(`#${t}`)).join(' ')}`);
    console.log('');
  }

  if (entry.notes) {
    console.log(ui.colors.primary.bold('  Notes'));
    console.log(`    ${entry.notes}`);
    console.log('');
  }

  // Replay command
  console.log(ui.colors.primary.bold('  Replay'));
  const replayArgs = entryToCliArgs(entry);
  console.log(`    repo-roller ${replayArgs.join(' ')}`);
  console.log('');
}

/**
 * Display diff between two history entries
 */
export async function displayHistoryDiff(range: string): Promise<void> {
  // Parse range: supports "1..2", "-1..-2", "abc123..def456"
  const parts = range.split('..');
  if (parts.length !== 2) {
    console.error(ui.error('Invalid diff range format. Use: <id1>..<id2> or <index1>..<index2>'));
    return;
  }

  const id1 = parseIdOrIndex(parts[0]!);
  const id2 = parseIdOrIndex(parts[1]!);

  let diff: HistoryDiff;
  try {
    diff = await diffHistory(id1, id2);
  } catch (err) {
    console.error(ui.error(err instanceof Error ? err.message : 'Failed to compute diff'));
    return;
  }

  console.log(ui.header());
  console.log(ui.section('Bundle Comparison'));

  // Entry summaries
  console.log(ui.colors.primary.bold('  Entries'));
  console.log(`    ${ui.colors.dim('From:')} ${diff.entry1.id.slice(0, 8)} ${ui.colors.muted(formatTimestamp(diff.entry1.timestamp))}`);
  console.log(`    ${ui.colors.dim('To:  ')} ${diff.entry2.id.slice(0, 8)} ${ui.colors.muted(formatTimestamp(diff.entry2.timestamp))}`);
  console.log('');

  // Metric changes
  console.log(ui.colors.primary.bold('  Changes'));
  console.log(formatDelta('Files', diff.metricsDiff.fileCount));
  console.log(formatDelta('Bytes', diff.metricsDiff.totalBytes, true));
  console.log(formatDelta('Tokens', diff.metricsDiff.estimatedTokens));
  if (diff.metricsDiff.estimatedCost !== undefined) {
    console.log(formatDelta('Cost', diff.metricsDiff.estimatedCost, false, true));
  }
  console.log(formatDelta('Duration (ms)', diff.metricsDiff.duration));
  console.log('');

  // File changes
  console.log(ui.colors.primary.bold('  Files'));
  console.log(`    ${ui.colors.success('Added:')} ${diff.filesDiff.added.length}`);
  console.log(`    ${ui.colors.error('Removed:')} ${diff.filesDiff.removed.length}`);
  console.log(`    ${ui.colors.dim('Unchanged:')} ${diff.filesDiff.unchanged.length}`);
  console.log('');

  // Show specific file changes (truncated)
  if (diff.filesDiff.added.length > 0) {
    console.log(ui.colors.success.bold('  Added Files'));
    for (const file of diff.filesDiff.added.slice(0, 5)) {
      console.log(`    ${ui.colors.success('+')} ${file}`);
    }
    if (diff.filesDiff.added.length > 5) {
      console.log(ui.colors.dim(`    ... and ${diff.filesDiff.added.length - 5} more`));
    }
    console.log('');
  }

  if (diff.filesDiff.removed.length > 0) {
    console.log(ui.colors.error.bold('  Removed Files'));
    for (const file of diff.filesDiff.removed.slice(0, 5)) {
      console.log(`    ${ui.colors.error('-')} ${file}`);
    }
    if (diff.filesDiff.removed.length > 5) {
      console.log(ui.colors.dim(`    ... and ${diff.filesDiff.removed.length - 5} more`));
    }
    console.log('');
  }
}

/**
 * Display history statistics
 */
export async function displayHistoryStats(): Promise<void> {
  const stats = await getHistoryStats();

  console.log(ui.header());
  console.log(ui.section('History Statistics'));

  if (stats.totalRuns === 0) {
    console.log(ui.info('No history data yet.'));
    return;
  }

  console.log(ui.colors.primary.bold('  Summary'));
  console.log(ui.keyValue('Total Runs', stats.totalRuns.toString(), 22));
  console.log(ui.keyValue('Unique Projects', stats.uniqueProjects.toString(), 22));
  console.log(ui.keyValue('Avg Files/Run', stats.averageFilesPerRun.toString(), 22));
  console.log('');

  console.log(ui.colors.primary.bold('  Totals'));
  console.log(ui.keyValue('Tokens Generated', stats.totalTokensGenerated.toLocaleString(), 22));
  console.log(ui.keyValue('Total Cost', `$${stats.totalCostIncurred.toFixed(4)}`, 22));
  console.log('');

  if (stats.mostUsedPreset || stats.mostActiveProject) {
    console.log(ui.colors.primary.bold('  Favorites'));
    if (stats.mostUsedPreset) {
      console.log(ui.keyValue('Most Used Preset', stats.mostUsedPreset, 22));
    }
    if (stats.mostActiveProject) {
      console.log(ui.keyValue('Most Active Project', stats.mostActiveProject, 22));
    }
    console.log('');
  }

  console.log(ui.colors.primary.bold('  Recent Activity'));
  console.log(ui.keyValue('Last 24h', `${stats.recentActivity.last24h} runs`, 22));
  console.log(ui.keyValue('Last 7 days', `${stats.recentActivity.last7d} runs`, 22));
  console.log(ui.keyValue('Last 30 days', `${stats.recentActivity.last30d} runs`, 22));
  console.log('');
}

/**
 * Export history to specified format
 */
export async function displayHistoryExport(format: 'json' | 'yaml' | 'csv'): Promise<void> {
  const exported = await exportHistory(format);
  console.log(exported);
}

// Helper functions

function formatTimeAgo(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {return `${days}d ago`;}
  if (hours > 0) {return `${hours}h ago`;}
  if (minutes > 0) {return `${minutes}m ago`;}
  return `${seconds}s ago`;
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString();
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  }
  return `${bytes} B`;
}

function formatDelta(label: string, delta: number, isBytes = false, isCost = false): string {
  let value: string;
  let color: (text: string) => string;

  if (delta > 0) {
    color = ui.colors.error;
    if (isCost) {
      value = `+$${delta.toFixed(4)}`;
    } else if (isBytes) {
      value = `+${formatBytes(delta)}`;
    } else {
      value = `+${delta.toLocaleString()}`;
    }
  } else if (delta < 0) {
    color = ui.colors.success;
    if (isCost) {
      value = `-$${Math.abs(delta).toFixed(4)}`;
    } else if (isBytes) {
      value = `-${formatBytes(Math.abs(delta))}`;
    } else {
      value = delta.toLocaleString();
    }
  } else {
    color = ui.colors.dim;
    value = '0';
  }

  return `    ${label.padEnd(18)} ${color(value)}`;
}

function parseIdOrIndex(str: string): string | number {
  const trimmed = str.trim();
  // Check if it's a negative or positive integer
  if (/^-?\d+$/.test(trimmed)) {
    return parseInt(trimmed, 10);
  }
  // Otherwise treat as ID (partial or full)
  return trimmed;
}
