import * as ui from '../core/ui.js';
import {
  sendRequest,
  isDaemonRunning,
  getDaemonPid,
  getDefaultSocketPath,
  generateRequestId,
  type DaemonResponse,
} from '../core/daemon.js';

/**
 * Display daemon status
 */
export async function displayDaemonStatus(): Promise<void> {
  const socketPath = getDefaultSocketPath();
  const running = await isDaemonRunning(socketPath);

  console.log(ui.header());
  console.log(ui.section('Daemon Status'));

  if (!running) {
    console.log(ui.warning('Daemon is not running'));
    console.log('');
    console.log(ui.colors.dim('  Start with: repo-roller daemon start'));
    console.log('');
    return;
  }

  const pid = await getDaemonPid();
  const response = await sendRequest({ id: generateRequestId(), method: 'daemon.status' }, socketPath);

  if (response.error) {
    console.error(ui.error(`Failed to get status: ${response.error.message}`));
    return;
  }

  const status = response.result as {
    uptime: number;
    activeConnections: number;
    requestCount: number;
    cacheSize: number;
    cachedProjects: string[];
  };

  console.log(ui.keyValue('Status', ui.colors.success('Running'), 20));
  console.log(ui.keyValue('PID', pid?.toString() ?? 'unknown', 20));
  console.log(ui.keyValue('Socket', socketPath, 20));
  console.log(ui.keyValue('Uptime', formatUptime(status.uptime), 20));
  console.log(ui.keyValue('Connections', status.activeConnections.toString(), 20));
  console.log(ui.keyValue('Requests', status.requestCount.toString(), 20));
  console.log('');

  console.log(ui.colors.primary.bold('  Cache'));
  console.log(ui.keyValue('Projects Cached', status.cacheSize.toString(), 20));
  if (status.cachedProjects.length > 0) {
    console.log('');
    for (const project of status.cachedProjects.slice(0, 5)) {
      console.log(`    ${ui.colors.dim(ui.symbols.bullet)} ${project}`);
    }
    if (status.cachedProjects.length > 5) {
      console.log(ui.colors.dim(`    ... and ${status.cachedProjects.length - 5} more`));
    }
  }
  console.log('');
}

/**
 * Quick scan via daemon (uses warm cache)
 */
export async function daemonScan(root: string, force: boolean = false): Promise<void> {
  const socketPath = getDefaultSocketPath();

  if (!(await isDaemonRunning(socketPath))) {
    console.error(ui.error('Daemon is not running. Start with: repo-roller daemon start'));
    return;
  }

  const startTime = Date.now();
  const response = await sendRequest(
    {
      id: generateRequestId(),
      method: 'project.scan',
      params: { root, force },
    },
    socketPath
  );

  if (response.error) {
    console.error(ui.error(`Scan failed: ${response.error.message}`));
    return;
  }

  const result = response.result as {
    cached: boolean;
    files: number;
    totalBytes: number;
    extensionCounts: Record<string, number>;
    fileList?: string[];
  };

  const duration = Date.now() - startTime;

  console.log(ui.header());

  if (result.cached) {
    console.log(ui.success(`Scan result from cache ${ui.colors.dim(`(${duration}ms)`)}`));
  } else {
    console.log(ui.success(`Fresh scan completed ${ui.colors.dim(`(${duration}ms)`)}`));
  }

  console.log('');
  console.log(ui.keyValue('Files', result.files.toString()));
  console.log(ui.keyValue('Total Size', formatBytes(result.totalBytes)));
  console.log('');

  if (Object.keys(result.extensionCounts).length > 0) {
    console.log(ui.colors.primary.bold('  Extensions'));
    const sorted = Object.entries(result.extensionCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);
    for (const [ext, count] of sorted) {
      console.log(ui.keyValue(`  ${ext || '(none)'}`, `${count} files`));
    }
  }
  console.log('');
}

/**
 * Quick bundle generation via daemon
 */
export async function daemonBundle(params: {
  root?: string;
  preset?: string;
  format?: string;
  outFile?: string;
}): Promise<void> {
  const socketPath = getDefaultSocketPath();

  if (!(await isDaemonRunning(socketPath))) {
    console.error(ui.error('Daemon is not running. Start with: repo-roller daemon start'));
    return;
  }

  console.log(ui.status('render', 'Generating bundle via daemon...'));

  const response = await sendRequest(
    {
      id: generateRequestId(),
      method: 'bundle.generate',
      params: {
        root: params.root ?? '.',
        preset: params.preset,
        format: params.format,
        outFile: params.outFile,
      },
    },
    socketPath
  );

  if (response.error) {
    console.error(ui.error(`Bundle generation failed: ${response.error.message}`));
    return;
  }

  const result = response.result as {
    outputFile: string;
    fileCount: number;
    totalBytes: number;
    estimatedTokens: number;
    estimatedCost?: number;
    duration: number;
    historyId: string;
  };

  console.log(ui.success(`Bundle generated ${ui.colors.dim(`(${result.duration}ms)`)}`));
  console.log('');
  console.log(ui.keyValue('Output', result.outputFile));
  console.log(ui.keyValue('Files', result.fileCount.toString()));
  console.log(ui.keyValue('Size', formatBytes(result.totalBytes)));
  console.log(ui.keyValue('Tokens', ui.tokenCount(result.estimatedTokens)));
  if (result.estimatedCost !== undefined) {
    console.log(ui.keyValue('Cost', `$${result.estimatedCost.toFixed(4)}`));
  }
  console.log(ui.keyValue('History ID', result.historyId.slice(0, 8)));
  console.log('');
}

/**
 * Quick token estimate via daemon (instant if cached)
 */
export async function daemonTokenEstimate(root: string = '.'): Promise<void> {
  const socketPath = getDefaultSocketPath();

  if (!(await isDaemonRunning(socketPath))) {
    console.error(ui.error('Daemon is not running. Start with: repo-roller daemon start'));
    return;
  }

  const startTime = Date.now();

  // Ensure project is scanned first
  await sendRequest(
    { id: generateRequestId(), method: 'project.scan', params: { root } },
    socketPath
  );

  const response = await sendRequest(
    { id: generateRequestId(), method: 'tokens.estimate', params: { root } },
    socketPath
  );

  if (response.error) {
    console.error(ui.error(`Token estimation failed: ${response.error.message}`));
    return;
  }

  const result = response.result as {
    tokens: number;
    estimates: Array<{
      provider: string;
      tokens: number;
      cost: number;
      withinContext: boolean;
    }>;
  };

  const duration = Date.now() - startTime;

  console.log(ui.header());
  console.log(ui.success(`Token estimate ${ui.colors.dim(`(${duration}ms)`)}`));
  console.log('');
  console.log(ui.keyValue('Estimated Tokens', ui.tokenCount(result.tokens)));
  console.log('');

  console.log(ui.colors.primary.bold('  Provider Costs'));
  for (const est of result.estimates) {
    const status = est.withinContext ? ui.colors.success(ui.symbols.check) : ui.colors.error(ui.symbols.cross);
    console.log(`  ${status} ${est.provider.padEnd(20)} $${est.cost.toFixed(4)}`);
  }
  console.log('');
}

/**
 * Display cache statistics
 */
export async function displayCacheStats(): Promise<void> {
  const socketPath = getDefaultSocketPath();

  if (!(await isDaemonRunning(socketPath))) {
    console.error(ui.error('Daemon is not running'));
    return;
  }

  const response = await sendRequest({ id: generateRequestId(), method: 'cache.stats' }, socketPath);

  if (response.error) {
    console.error(ui.error(`Failed to get cache stats: ${response.error.message}`));
    return;
  }

  const result = response.result as {
    size: number;
    entries: Array<{
      path: string;
      files: number;
      bytes: number;
      age: number;
    }>;
  };

  console.log(ui.header());
  console.log(ui.section('Cache Statistics'));

  console.log(ui.keyValue('Cached Projects', result.size.toString()));
  console.log('');

  if (result.entries.length > 0) {
    console.log(ui.colors.primary.bold('  Entries'));
    console.log(ui.colors.muted('  ' + ui.symbols.line.repeat(50)));

    for (const entry of result.entries) {
      console.log(`  ${ui.colors.accent(entry.path)}`);
      console.log(`    ${entry.files} files, ${formatBytes(entry.bytes)}, age: ${formatAge(entry.age)}`);
    }
  }
  console.log('');
}

/**
 * Clear daemon cache
 */
export async function clearDaemonCache(project?: string): Promise<void> {
  const socketPath = getDefaultSocketPath();

  if (!(await isDaemonRunning(socketPath))) {
    console.error(ui.error('Daemon is not running'));
    return;
  }

  const response = await sendRequest(
    {
      id: generateRequestId(),
      method: 'cache.clear',
      params: project ? { project } : {},
    },
    socketPath
  );

  if (response.error) {
    console.error(ui.error(`Failed to clear cache: ${response.error.message}`));
    return;
  }

  const result = response.result as { cleared: string; count?: number };

  if (result.cleared === 'all') {
    console.log(ui.success(`Cleared ${result.count} cached projects`));
  } else {
    console.log(ui.success(`Cleared cache for ${result.cleared}`));
  }
}

/**
 * Send arbitrary RPC request
 */
export async function sendDaemonRpc(method: string, params: Record<string, unknown>): Promise<void> {
  const socketPath = getDefaultSocketPath();

  if (!(await isDaemonRunning(socketPath))) {
    console.error(ui.error('Daemon is not running'));
    return;
  }

  const response = await sendRequest({ id: generateRequestId(), method, params }, socketPath);

  console.log(JSON.stringify(response, null, 2));
}

// Helper functions

function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {return `${days}d ${hours % 24}h`;}
  if (hours > 0) {return `${hours}h ${minutes % 60}m`;}
  if (minutes > 0) {return `${minutes}m ${seconds % 60}s`;}
  return `${seconds}s`;
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

function formatAge(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) {return `${seconds}s`;}
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {return `${minutes}m`;}
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}
