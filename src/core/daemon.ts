import { createServer, createConnection, type Socket } from 'node:net';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { mkdir, unlink, stat, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import type { ResolvedOptions, ScanResult, FileInfo } from './types.js';
import { scanFiles } from './scan.js';
import { render } from './render.js';
import { estimateTokens, calculateCost } from './tokens.js';
import { loadConfig, loadRepoRollerYml, resolveOptions } from './config.js';
import { recordHistoryEntry, queryHistory, getHistoryEntry, getHistoryStats } from './history.js';
import { generateCliSchema, generateLlmToolDefinition } from './schema.js';
import { getModelPreset } from './modelPresets.js';
import { writeFile as writeOutputFile } from 'node:fs/promises';

/**
 * RPC request format
 */
export interface DaemonRequest {
  id: string;
  method: string;
  params?: Record<string, unknown>;
}

/**
 * RPC response format
 */
export interface DaemonResponse {
  id: string;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

/**
 * Daemon session state
 */
interface DaemonSession {
  projectCaches: Map<string, {
    scan: ScanResult;
    timestamp: number;
    options: ResolvedOptions;
  }>;
  activeConnections: number;
  startTime: number;
  requestCount: number;
}

/**
 * Daemon configuration
 */
export interface DaemonConfig {
  socketPath?: string;
  cacheTtlMs?: number;
  maxCacheSize?: number;
}

const DEFAULT_SOCKET_PATH = join(homedir(), '.cache', 'repo-roller', 'daemon.sock');
const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const DEFAULT_MAX_CACHE_SIZE = 10;
const PID_FILE = join(homedir(), '.cache', 'repo-roller', 'daemon.pid');

/**
 * JSON-RPC error codes
 */
const ErrorCodes = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
} as const;

/**
 * Create and start the daemon server
 */
export async function startDaemon(config: DaemonConfig = {}): Promise<void> {
  const socketPath = config.socketPath ?? DEFAULT_SOCKET_PATH;
  const cacheTtlMs = config.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
  const maxCacheSize = config.maxCacheSize ?? DEFAULT_MAX_CACHE_SIZE;

  // Ensure socket directory exists
  const socketDir = join(socketPath, '..');
  await mkdir(socketDir, { recursive: true });

  // Remove stale socket if exists
  if (existsSync(socketPath)) {
    await unlink(socketPath);
  }

  // Initialize session state
  const session: DaemonSession = {
    projectCaches: new Map(),
    activeConnections: 0,
    startTime: Date.now(),
    requestCount: 0,
  };

  // Create RPC handlers
  const handlers = createHandlers(session, cacheTtlMs, maxCacheSize);

  // Create server
  const server = createServer((socket: Socket) => {
    session.activeConnections++;

    let buffer = '';

    socket.on('data', async (data) => {
      buffer += data.toString();

      // Process complete JSON messages (newline-delimited)
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? ''; // Keep incomplete line in buffer

      for (const line of lines) {
        if (!line.trim()) {continue;}

        try {
          const request = JSON.parse(line) as DaemonRequest;
          const response = await handleRequest(request, handlers);
          socket.write(JSON.stringify(response) + '\n');
        } catch (err) {
          const errorResponse: DaemonResponse = {
            id: 'unknown',
            error: {
              code: ErrorCodes.PARSE_ERROR,
              message: 'Failed to parse request',
              data: err instanceof Error ? err.message : String(err),
            },
          };
          socket.write(JSON.stringify(errorResponse) + '\n');
        }
      }
    });

    socket.on('close', () => {
      session.activeConnections--;
    });

    socket.on('error', () => {
      session.activeConnections--;
    });
  });

  server.listen(socketPath, () => {
    console.log(`Daemon listening on ${socketPath}`);
    console.log(`PID: ${process.pid}`);
  });

  // Write PID file
  await writeFile(PID_FILE, process.pid.toString(), 'utf-8');

  // Cleanup on exit
  const cleanup = async () => {
    console.log('\nShutting down daemon...');
    server.close();
    if (existsSync(socketPath)) {
      await unlink(socketPath);
    }
    if (existsSync(PID_FILE)) {
      await unlink(PID_FILE);
    }
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  // Keep process alive
  process.stdin.resume();
}

/**
 * Handle a single RPC request
 */
async function handleRequest(
  request: DaemonRequest,
  handlers: Record<string, (params: Record<string, unknown>) => Promise<unknown>>
): Promise<DaemonResponse> {
  const handler = handlers[request.method];

  if (!handler) {
    return {
      id: request.id,
      error: {
        code: ErrorCodes.METHOD_NOT_FOUND,
        message: `Method not found: ${request.method}`,
      },
    };
  }

  try {
    const result = await handler(request.params ?? {});
    return {
      id: request.id,
      result,
    };
  } catch (err) {
    return {
      id: request.id,
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: err instanceof Error ? err.message : 'Internal error',
        data: err instanceof Error ? err.stack : undefined,
      },
    };
  }
}

/**
 * Create RPC method handlers
 */
function createHandlers(
  session: DaemonSession,
  cacheTtlMs: number,
  maxCacheSize: number
): Record<string, (params: Record<string, unknown>) => Promise<unknown>> {
  return {
    // Status and health
    'daemon.status': async () => ({
      uptime: Date.now() - session.startTime,
      activeConnections: session.activeConnections,
      requestCount: session.requestCount,
      cacheSize: session.projectCaches.size,
      cachedProjects: [...session.projectCaches.keys()],
    }),

    'daemon.ping': async () => ({ pong: true, timestamp: Date.now() }),

    'daemon.shutdown': async () => {
      setTimeout(() => process.exit(0), 100);
      return { shutting_down: true };
    },

    // Project scanning with cache
    'project.scan': async (params) => {
      session.requestCount++;
      const root = resolve((params.root as string) ?? '.');
      const forceRefresh = params.force === true;

      // Check cache
      const cached = session.projectCaches.get(root);
      if (cached && !forceRefresh && Date.now() - cached.timestamp < cacheTtlMs) {
        return {
          cached: true,
          files: cached.scan.files.length,
          totalBytes: cached.scan.totalBytes,
          extensionCounts: cached.scan.extensionCounts,
        };
      }

      // Load configs
      const config = await loadConfig(root);
      const repoRollerConfig = await loadRepoRollerYml(root);

      // Resolve options
      const options = resolveOptions(
        {
          root,
          preset: params.preset as string | undefined,
          profile: params.profile as string | undefined,
          ext: params.ext as string | undefined,
          include: params.include as readonly string[] | undefined,
          exclude: params.exclude as readonly string[] | undefined,
        },
        config,
        repoRollerConfig
      );

      // Scan
      const scan = await scanFiles(options);

      // Update cache
      session.projectCaches.set(root, {
        scan,
        timestamp: Date.now(),
        options,
      });

      // Prune cache if too large
      if (session.projectCaches.size > maxCacheSize) {
        const oldest = [...session.projectCaches.entries()]
          .sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
        if (oldest) {
          session.projectCaches.delete(oldest[0]);
        }
      }

      return {
        cached: false,
        files: scan.files.length,
        totalBytes: scan.totalBytes,
        extensionCounts: scan.extensionCounts,
        fileList: scan.files.map((f) => f.relativePath),
      };
    },

    // Bundle generation
    'bundle.generate': async (params) => {
      session.requestCount++;
      const startTime = Date.now();
      const root = resolve((params.root as string) ?? '.');

      // Load configs
      const config = await loadConfig(root);
      const repoRollerConfig = await loadRepoRollerYml(root);

      // Resolve options
      const options = resolveOptions(
        {
          root,
          preset: params.preset as string | undefined,
          profile: params.profile as string | undefined,
          format: params.format as 'md' | 'json' | 'yaml' | 'txt' | undefined,
          ext: params.ext as string | undefined,
          include: params.include as readonly string[] | undefined,
          exclude: params.exclude as readonly string[] | undefined,
          stripComments: params.stripComments as boolean | undefined,
          tree: params.withTree as boolean | undefined,
          stats: params.withStats as boolean | undefined,
          model: params.model as string | undefined,
        },
        config,
        repoRollerConfig
      );

      // Use cached scan if available
      let scan: ScanResult;
      const cached = session.projectCaches.get(root);
      if (cached && Date.now() - cached.timestamp < cacheTtlMs) {
        scan = cached.scan;
      } else {
        scan = await scanFiles(options);
        session.projectCaches.set(root, {
          scan,
          timestamp: Date.now(),
          options,
        });
      }

      // Render output
      const output = await render(scan, options);
      const estimatedTokens = estimateTokens(output);

      // Calculate cost
      const modelPreset = options.modelPreset ? getModelPreset(options.modelPreset) : undefined;
      const costEstimate = modelPreset
        ? calculateCost(estimatedTokens, modelPreset.name)
        : calculateCost(estimatedTokens, 'claude-sonnet');
      const estimatedCost = costEstimate?.inputCost;

      // Write output if path provided
      if (params.outFile) {
        await writeOutputFile(params.outFile as string, output, 'utf-8');
      }

      // Record to history
      const duration = Date.now() - startTime;
      const historyEntry = await recordHistoryEntry({
        resolvedOptions: options,
        cliArgs: ['daemon', 'bundle.generate', JSON.stringify(params)],
        selectedFiles: scan.files,
        estimatedTokens,
        estimatedCost,
        duration,
      });

      return {
        outputFile: params.outFile ?? options.outFile,
        fileCount: scan.files.length,
        totalBytes: scan.totalBytes,
        estimatedTokens,
        estimatedCost,
        duration,
        historyId: historyEntry.id,
        ...(params.returnContent === true ? { content: output } : {}),
      };
    },

    // Token estimation (fast, uses cache)
    'tokens.estimate': async (params) => {
      session.requestCount++;
      const root = resolve((params.root as string) ?? '.');

      // Use cached scan
      const cached = session.projectCaches.get(root);
      if (!cached || Date.now() - cached.timestamp >= cacheTtlMs) {
        return { error: 'No cached scan. Call project.scan first.' };
      }

      const output = await render(cached.scan, cached.options);
      const tokens = estimateTokens(output);

      const providers = ['claude-sonnet', 'gpt-4o', 'gemini-1.5-pro'];
      const estimates = providers.map((p) => {
        const est = calculateCost(tokens, p);
        return {
          provider: p,
          tokens,
          cost: est?.inputCost ?? 0,
          withinContext: est?.withinContextWindow ?? false,
        };
      });

      return { tokens, estimates };
    },

    // History queries
    'history.list': async (params) => {
      session.requestCount++;
      const entries = await queryHistory({
        limit: params.limit as number | undefined,
        project: params.project as string | undefined,
      });
      return entries.map((e) => ({
        id: e.id,
        timestamp: e.timestamp,
        project: e.project.name,
        files: e.result.fileCount,
        tokens: e.result.estimatedTokens,
        cost: e.result.estimatedCost,
      }));
    },

    'history.get': async (params) => {
      session.requestCount++;
      const idOrIndex = params.id as string | number;
      const entry = await getHistoryEntry(idOrIndex);
      return entry ?? { error: 'Entry not found' };
    },

    'history.stats': async () => {
      session.requestCount++;
      return await getHistoryStats();
    },

    // Schema introspection
    'schema.cli': async () => {
      session.requestCount++;
      return generateCliSchema();
    },

    'schema.llm': async () => {
      session.requestCount++;
      return generateLlmToolDefinition();
    },

    // Cache management
    'cache.clear': async (params) => {
      session.requestCount++;
      if (params.project) {
        const root = resolve(params.project as string);
        session.projectCaches.delete(root);
        return { cleared: root };
      } else {
        const count = session.projectCaches.size;
        session.projectCaches.clear();
        return { cleared: 'all', count };
      }
    },

    'cache.stats': async () => {
      session.requestCount++;
      const entries = [...session.projectCaches.entries()].map(([path, cache]) => ({
        path,
        files: cache.scan.files.length,
        bytes: cache.scan.totalBytes,
        age: Date.now() - cache.timestamp,
      }));
      return { size: session.projectCaches.size, entries };
    },
  };
}

/**
 * Send a request to the daemon
 */
export async function sendRequest(
  request: DaemonRequest,
  socketPath: string = DEFAULT_SOCKET_PATH
): Promise<DaemonResponse> {
  return new Promise((resolve, reject) => {
    const socket = createConnection(socketPath, () => {
      socket.write(JSON.stringify(request) + '\n');
    });

    let buffer = '';

    socket.on('data', (data) => {
      buffer += data.toString();
      const lines = buffer.split('\n');
      for (const line of lines) {
        if (line.trim()) {
          try {
            const response = JSON.parse(line) as DaemonResponse;
            socket.end();
            resolve(response);
          } catch {
            // Continue buffering
          }
        }
      }
    });

    socket.on('error', (err) => {
      reject(err);
    });

    socket.setTimeout(5000, () => {
      socket.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

/**
 * Check if daemon is running
 */
export async function isDaemonRunning(socketPath: string = DEFAULT_SOCKET_PATH): Promise<boolean> {
  try {
    const response = await sendRequest({ id: 'ping', method: 'daemon.ping' }, socketPath);
    return !!response.result;
  } catch {
    return false;
  }
}

/**
 * Get daemon PID
 */
export async function getDaemonPid(): Promise<number | null> {
  try {
    const pid = await readFile(PID_FILE, 'utf-8');
    return parseInt(pid, 10);
  } catch {
    return null;
  }
}

/**
 * Get default socket path
 */
export function getDefaultSocketPath(): string {
  return DEFAULT_SOCKET_PATH;
}

/**
 * Generate unique request ID
 */
export function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}
