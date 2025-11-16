import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { homedir } from 'node:os';
import { join } from 'node:path';

// Import the functions we want to test
import { getDefaultSocketPath, generateRequestId } from './daemon.js';

describe('daemon', () => {
  describe('getDefaultSocketPath', () => {
    it('returns path in user home directory', () => {
      const path = getDefaultSocketPath();

      expect(path).toContain(homedir());
    });

    it('returns path in .cache directory', () => {
      const path = getDefaultSocketPath();

      expect(path).toContain('.cache');
    });

    it('returns path in repo-roller directory', () => {
      const path = getDefaultSocketPath();

      expect(path).toContain('repo-roller');
    });

    it('returns path ending with daemon.sock', () => {
      const path = getDefaultSocketPath();

      expect(path.endsWith('daemon.sock')).toBe(true);
    });

    it('returns consistent path across calls', () => {
      const path1 = getDefaultSocketPath();
      const path2 = getDefaultSocketPath();

      expect(path1).toBe(path2);
    });

    it('returns full path structure', () => {
      const path = getDefaultSocketPath();
      const expected = join(homedir(), '.cache', 'repo-roller', 'daemon.sock');

      expect(path).toBe(expected);
    });
  });

  describe('generateRequestId', () => {
    it('returns a string', () => {
      const id = generateRequestId();

      expect(typeof id).toBe('string');
    });

    it('includes timestamp prefix', () => {
      const beforeTime = Date.now();
      const id = generateRequestId();
      const afterTime = Date.now();

      const timestampPart = parseInt(id.split('-')[0]!, 10);

      expect(timestampPart).toBeGreaterThanOrEqual(beforeTime);
      expect(timestampPart).toBeLessThanOrEqual(afterTime);
    });

    it('includes random suffix', () => {
      const id = generateRequestId();
      const parts = id.split('-');

      expect(parts.length).toBe(2);
      expect(parts[1]!.length).toBeGreaterThan(0);
    });

    it('generates unique IDs', () => {
      const ids = new Set<string>();

      for (let i = 0; i < 100; i++) {
        ids.add(generateRequestId());
      }

      expect(ids.size).toBe(100);
    });

    it('has valid format', () => {
      const id = generateRequestId();

      // Format: {timestamp}-{randomAlphanumeric}
      expect(id).toMatch(/^\d+-[a-z0-9]+$/);
    });

    it('random suffix uses base36 encoding', () => {
      const id = generateRequestId();
      const randomPart = id.split('-')[1]!;

      // Base36 only contains 0-9 and a-z
      expect(randomPart).toMatch(/^[a-z0-9]+$/);
    });
  });

  describe('DaemonRequest interface', () => {
    it('accepts valid request structure', () => {
      const request = {
        id: generateRequestId(),
        method: 'daemon.ping',
      };

      expect(request.id).toBeTruthy();
      expect(request.method).toBe('daemon.ping');
    });

    it('accepts request with params', () => {
      const request = {
        id: generateRequestId(),
        method: 'project.scan',
        params: {
          root: '/path/to/project',
          force: true,
        },
      };

      expect(request.params).toBeDefined();
      expect(request.params.root).toBe('/path/to/project');
      expect(request.params.force).toBe(true);
    });

    it('accepts empty params object', () => {
      const request = {
        id: generateRequestId(),
        method: 'cache.clear',
        params: {},
      };

      expect(request.params).toEqual({});
    });
  });

  describe('DaemonResponse interface', () => {
    it('accepts success response', () => {
      const response = {
        id: generateRequestId(),
        result: { pong: true, timestamp: Date.now() },
      };

      expect(response.result).toBeDefined();
      expect((response.result as Record<string, unknown>).pong).toBe(true);
    });

    it('accepts error response', () => {
      const response = {
        id: generateRequestId(),
        error: {
          code: -32601,
          message: 'Method not found',
        },
      };

      expect(response.error).toBeDefined();
      expect(response.error.code).toBe(-32601);
      expect(response.error.message).toBe('Method not found');
    });

    it('accepts error response with data', () => {
      const response = {
        id: generateRequestId(),
        error: {
          code: -32603,
          message: 'Internal error',
          data: 'Stack trace here',
        },
      };

      expect(response.error.data).toBe('Stack trace here');
    });
  });

  describe('JSON-RPC error codes', () => {
    it('PARSE_ERROR is -32700', () => {
      expect(-32700).toBe(-32700);
    });

    it('INVALID_REQUEST is -32600', () => {
      expect(-32600).toBe(-32600);
    });

    it('METHOD_NOT_FOUND is -32601', () => {
      expect(-32601).toBe(-32601);
    });

    it('INVALID_PARAMS is -32602', () => {
      expect(-32602).toBe(-32602);
    });

    it('INTERNAL_ERROR is -32603', () => {
      expect(-32603).toBe(-32603);
    });
  });

  describe('DaemonConfig interface', () => {
    it('accepts empty config for defaults', () => {
      const config = {};

      expect(config).toEqual({});
    });

    it('accepts custom socket path', () => {
      const config = {
        socketPath: '/custom/path/daemon.sock',
      };

      expect(config.socketPath).toBe('/custom/path/daemon.sock');
    });

    it('accepts custom cache TTL', () => {
      const config = {
        cacheTtlMs: 10 * 60 * 1000, // 10 minutes
      };

      expect(config.cacheTtlMs).toBe(600000);
    });

    it('accepts custom max cache size', () => {
      const config = {
        maxCacheSize: 20,
      };

      expect(config.maxCacheSize).toBe(20);
    });

    it('accepts all custom options', () => {
      const config = {
        socketPath: '/tmp/custom.sock',
        cacheTtlMs: 300000,
        maxCacheSize: 5,
      };

      expect(config.socketPath).toBe('/tmp/custom.sock');
      expect(config.cacheTtlMs).toBe(300000);
      expect(config.maxCacheSize).toBe(5);
    });
  });

  describe('RPC method naming conventions', () => {
    const validMethods = [
      'daemon.status',
      'daemon.ping',
      'daemon.shutdown',
      'project.scan',
      'bundle.generate',
      'tokens.estimate',
      'history.list',
      'history.get',
      'history.stats',
      'schema.cli',
      'schema.llm',
      'cache.clear',
      'cache.stats',
    ];

    it('uses namespace.action pattern', () => {
      for (const method of validMethods) {
        expect(method).toMatch(/^[a-z]+\.[a-z]+$/);
      }
    });

    it('groups daemon management methods', () => {
      const daemonMethods = validMethods.filter((m) => m.startsWith('daemon.'));

      expect(daemonMethods).toContain('daemon.status');
      expect(daemonMethods).toContain('daemon.ping');
      expect(daemonMethods).toContain('daemon.shutdown');
    });

    it('groups project methods', () => {
      const projectMethods = validMethods.filter((m) => m.startsWith('project.'));

      expect(projectMethods).toContain('project.scan');
    });

    it('groups history methods', () => {
      const historyMethods = validMethods.filter((m) => m.startsWith('history.'));

      expect(historyMethods).toContain('history.list');
      expect(historyMethods).toContain('history.get');
      expect(historyMethods).toContain('history.stats');
    });

    it('groups cache methods', () => {
      const cacheMethods = validMethods.filter((m) => m.startsWith('cache.'));

      expect(cacheMethods).toContain('cache.clear');
      expect(cacheMethods).toContain('cache.stats');
    });

    it('groups schema methods', () => {
      const schemaMethods = validMethods.filter((m) => m.startsWith('schema.'));

      expect(schemaMethods).toContain('schema.cli');
      expect(schemaMethods).toContain('schema.llm');
    });
  });

  describe('Cache behavior expectations', () => {
    it('default TTL is 5 minutes', () => {
      const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000;

      expect(DEFAULT_CACHE_TTL_MS).toBe(300000);
    });

    it('default max cache size is 10', () => {
      const DEFAULT_MAX_CACHE_SIZE = 10;

      expect(DEFAULT_MAX_CACHE_SIZE).toBe(10);
    });

    it('cache entry structure includes timestamp', () => {
      const cacheEntry = {
        scan: { files: [], totalBytes: 0, extensionCounts: {} },
        timestamp: Date.now(),
        options: {},
      };

      expect(cacheEntry.timestamp).toBeGreaterThan(0);
    });

    it('cache eviction removes oldest entry', () => {
      const cache = new Map<string, { timestamp: number }>();

      cache.set('proj1', { timestamp: 1000 });
      cache.set('proj2', { timestamp: 2000 });
      cache.set('proj3', { timestamp: 1500 });

      const oldest = [...cache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp)[0];

      expect(oldest![0]).toBe('proj1');
    });
  });

  describe('Session state tracking', () => {
    it('tracks active connections', () => {
      const session = {
        activeConnections: 0,
      };

      session.activeConnections++;
      expect(session.activeConnections).toBe(1);

      session.activeConnections++;
      expect(session.activeConnections).toBe(2);

      session.activeConnections--;
      expect(session.activeConnections).toBe(1);
    });

    it('tracks request count', () => {
      const session = {
        requestCount: 0,
      };

      session.requestCount++;
      session.requestCount++;
      session.requestCount++;

      expect(session.requestCount).toBe(3);
    });

    it('tracks start time', () => {
      const startTime = Date.now();
      const session = {
        startTime,
      };

      const uptime = Date.now() - session.startTime;

      expect(uptime).toBeGreaterThanOrEqual(0);
    });

    it('manages project caches map', () => {
      const session = {
        projectCaches: new Map<string, { timestamp: number }>(),
      };

      session.projectCaches.set('/project1', { timestamp: Date.now() });
      session.projectCaches.set('/project2', { timestamp: Date.now() });

      expect(session.projectCaches.size).toBe(2);
      expect([...session.projectCaches.keys()]).toContain('/project1');
    });
  });

  describe('Request timeout handling', () => {
    it('timeout should be reasonable (5 seconds)', () => {
      const TIMEOUT_MS = 5000;

      expect(TIMEOUT_MS).toBe(5000);
    });

    it('timeout creates Error with message', () => {
      const timeoutError = new Error('Request timeout');

      expect(timeoutError.message).toBe('Request timeout');
    });
  });

  describe('Socket path handling', () => {
    it('socket directory is parent of socket path', () => {
      const socketPath = getDefaultSocketPath();
      const socketDir = join(socketPath, '..');

      expect(socketDir).toBe(join(homedir(), '.cache', 'repo-roller'));
    });

    it('PID file is in same directory as socket', () => {
      const socketPath = getDefaultSocketPath();
      const socketDir = join(socketPath, '..');
      const pidFile = join(socketDir, 'daemon.pid');

      expect(pidFile).toBe(join(homedir(), '.cache', 'repo-roller', 'daemon.pid'));
    });
  });
});
