import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { copyToClipboard } from '../../src/core/clipboard.js';

// Mock child_process
vi.mock('node:child_process', () => ({
  spawn: vi.fn(),
}));

describe('copyToClipboard', () => {
  let originalPlatform: string;
  let mockProc: EventEmitter & {
    stdin: EventEmitter & { write: ReturnType<typeof vi.fn>; end: ReturnType<typeof vi.fn> };
    stderr: EventEmitter;
  };

  beforeEach(() => {
    originalPlatform = process.platform;

    // Create mock process
    mockProc = new EventEmitter() as typeof mockProc;
    mockProc.stdin = new EventEmitter() as typeof mockProc.stdin;
    mockProc.stdin.write = vi.fn();
    mockProc.stdin.end = vi.fn();
    mockProc.stderr = new EventEmitter();

    vi.mocked(spawn).mockReturnValue(mockProc as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(process, 'platform', {
      value: originalPlatform,
      writable: true,
      configurable: true,
    });
  });

  describe('macOS (darwin)', () => {
    beforeEach(() => {
      Object.defineProperty(process, 'platform', {
        value: 'darwin',
        writable: true,
        configurable: true,
      });
    });

    it('should use pbcopy on macOS', async () => {
      const promise = copyToClipboard('test text');

      expect(spawn).toHaveBeenCalledWith('pbcopy', [], {
        stdio: ['pipe', 'ignore', 'pipe'],
      });

      expect(mockProc.stdin.write).toHaveBeenCalledWith('test text');
      expect(mockProc.stdin.end).toHaveBeenCalled();

      mockProc.emit('close', 0);
      await promise;
    });

    it('should resolve when pbcopy succeeds', async () => {
      const promise = copyToClipboard('success');
      mockProc.emit('close', 0);
      await expect(promise).resolves.toBeUndefined();
    });

    it('should reject when pbcopy fails', async () => {
      const promise = copyToClipboard('fail');
      mockProc.stderr.emit('data', Buffer.from('pbcopy error'));
      mockProc.emit('close', 1);
      await expect(promise).rejects.toThrow('Clipboard command failed: pbcopy error');
    });

    it('should handle spawn errors on macOS', async () => {
      const promise = copyToClipboard('error');
      const error = new Error('Command not found');
      mockProc.emit('error', error);
      await expect(promise).rejects.toThrow(error);
    });
  });

  describe('Windows (win32)', () => {
    beforeEach(() => {
      Object.defineProperty(process, 'platform', {
        value: 'win32',
        writable: true,
        configurable: true,
      });
    });

    it('should use clip on Windows', async () => {
      const promise = copyToClipboard('test text');

      expect(spawn).toHaveBeenCalledWith('clip', [], {
        stdio: ['pipe', 'ignore', 'pipe'],
      });

      expect(mockProc.stdin.write).toHaveBeenCalledWith('test text');
      expect(mockProc.stdin.end).toHaveBeenCalled();

      mockProc.emit('close', 0);
      await promise;
    });

    it('should resolve when clip succeeds', async () => {
      const promise = copyToClipboard('success');
      mockProc.emit('close', 0);
      await expect(promise).resolves.toBeUndefined();
    });

    it('should reject when clip fails', async () => {
      const promise = copyToClipboard('fail');
      mockProc.stderr.emit('data', Buffer.from('clip error'));
      mockProc.emit('close', 1);
      await expect(promise).rejects.toThrow('Clipboard command failed: clip error');
    });

    it('should handle spawn errors on Windows', async () => {
      const promise = copyToClipboard('error');
      const error = new Error('Command not found');
      mockProc.emit('error', error);
      await expect(promise).rejects.toThrow(error);
    });
  });

  describe('Linux with xclip', () => {
    beforeEach(() => {
      Object.defineProperty(process, 'platform', {
        value: 'linux',
        writable: true,
        configurable: true,
      });
    });

    it('should use xclip on Linux', async () => {
      const promise = copyToClipboard('test text');

      expect(spawn).toHaveBeenCalledWith('xclip', ['-selection', 'clipboard'], {
        stdio: ['pipe', 'ignore', 'pipe'],
      });

      expect(mockProc.stdin.write).toHaveBeenCalledWith('test text');
      expect(mockProc.stdin.end).toHaveBeenCalled();

      mockProc.emit('close', 0);
      await promise;
    });

    it('should resolve when xclip succeeds', async () => {
      const promise = copyToClipboard('success');
      mockProc.emit('close', 0);
      await expect(promise).resolves.toBeUndefined();
    });
  });

  describe('Linux with xsel fallback', () => {
    let mockXselProc: EventEmitter & {
      stdin: EventEmitter & { write: ReturnType<typeof vi.fn>; end: ReturnType<typeof vi.fn> };
      stderr: EventEmitter;
    };

    beforeEach(() => {
      Object.defineProperty(process, 'platform', {
        value: 'linux',
        writable: true,
        configurable: true,
      });

      // Create mock xsel process
      mockXselProc = new EventEmitter() as typeof mockXselProc;
      mockXselProc.stdin = new EventEmitter() as typeof mockXselProc.stdin;
      mockXselProc.stdin.write = vi.fn();
      mockXselProc.stdin.end = vi.fn();
      mockXselProc.stderr = new EventEmitter();

      // Mock spawn to return different processes for xclip and xsel
      vi.mocked(spawn).mockImplementation((cmd: string) => {
        if (cmd === 'xclip') {
          return mockProc as any;
        } else if (cmd === 'xsel') {
          return mockXselProc as any;
        }
        return mockProc as any;
      });
    });

    it('should fall back to xsel when xclip fails', async () => {
      const promise = copyToClipboard('test text');

      // First call is xclip
      expect(spawn).toHaveBeenCalledWith('xclip', ['-selection', 'clipboard'], {
        stdio: ['pipe', 'ignore', 'pipe'],
      });

      // Fail xclip
      mockProc.emit('close', 1);

      // Wait a tick for the fallback to be called
      await new Promise(resolve => setImmediate(resolve));

      // Second call should be xsel
      expect(spawn).toHaveBeenCalledWith('xsel', ['--clipboard', '--input'], {
        stdio: ['pipe', 'ignore', 'pipe'],
      });

      expect(mockXselProc.stdin.write).toHaveBeenCalledWith('test text');
      expect(mockXselProc.stdin.end).toHaveBeenCalled();

      // Succeed xsel
      mockXselProc.emit('close', 0);
      await promise;
    });

    it('should reject when both xclip and xsel fail', async () => {
      const promise = copyToClipboard('test text');

      // Fail xclip
      mockProc.emit('close', 1);

      // Wait for xsel to be spawned
      await new Promise(resolve => setImmediate(resolve));

      // Fail xsel
      mockXselProc.emit('close', 1);

      await expect(promise).rejects.toThrow(
        'Clipboard not available. Install xclip or xsel on Linux.'
      );
    });

    it('should reject when xsel spawn fails', async () => {
      const promise = copyToClipboard('test text');

      // Fail xclip
      mockProc.emit('close', 1);

      // Wait for xsel to be spawned
      await new Promise(resolve => setImmediate(resolve));

      // Fail xsel spawn
      mockXselProc.emit('error', new Error('xsel not found'));

      await expect(promise).rejects.toThrow(
        'Clipboard not available. Install xclip or xsel on Linux.'
      );
    });
  });

  describe('Linux spawn errors', () => {
    beforeEach(() => {
      Object.defineProperty(process, 'platform', {
        value: 'linux',
        writable: true,
        configurable: true,
      });
    });

    it('should provide helpful error message when xclip is not installed', async () => {
      const promise = copyToClipboard('test text');
      mockProc.emit('error', new Error('spawn xclip ENOENT'));
      await expect(promise).rejects.toThrow(
        'Clipboard not available. Install xclip or xsel on Linux.'
      );
    });
  });

  describe('content handling', () => {
    beforeEach(() => {
      Object.defineProperty(process, 'platform', {
        value: 'darwin',
        writable: true,
        configurable: true,
      });
    });

    it('should copy empty string', async () => {
      const promise = copyToClipboard('');
      expect(mockProc.stdin.write).toHaveBeenCalledWith('');
      mockProc.emit('close', 0);
      await promise;
    });

    it('should copy multiline text', async () => {
      const text = 'line1\nline2\nline3';
      const promise = copyToClipboard(text);
      expect(mockProc.stdin.write).toHaveBeenCalledWith(text);
      mockProc.emit('close', 0);
      await promise;
    });

    it('should copy text with special characters', async () => {
      const text = 'Special chars: \t\n\r !@#$%^&*()';
      const promise = copyToClipboard(text);
      expect(mockProc.stdin.write).toHaveBeenCalledWith(text);
      mockProc.emit('close', 0);
      await promise;
    });

    it('should copy large text content', async () => {
      const text = 'x'.repeat(100000);
      const promise = copyToClipboard(text);
      expect(mockProc.stdin.write).toHaveBeenCalledWith(text);
      mockProc.emit('close', 0);
      await promise;
    });

    it('should copy unicode characters', async () => {
      const text = '你好 世界 🌍';
      const promise = copyToClipboard(text);
      expect(mockProc.stdin.write).toHaveBeenCalledWith(text);
      mockProc.emit('close', 0);
      await promise;
    });
  });

  describe('error message handling', () => {
    beforeEach(() => {
      Object.defineProperty(process, 'platform', {
        value: 'darwin',
        writable: true,
        configurable: true,
      });
    });

    it('should include stderr in error message', async () => {
      const promise = copyToClipboard('test');
      mockProc.stderr.emit('data', Buffer.from('Error: '));
      mockProc.stderr.emit('data', Buffer.from('something went wrong'));
      mockProc.emit('close', 1);
      await expect(promise).rejects.toThrow('Clipboard command failed: Error: something went wrong');
    });

    it('should handle unknown error when stderr is empty', async () => {
      const promise = copyToClipboard('test');
      mockProc.emit('close', 1);
      await expect(promise).rejects.toThrow('Clipboard command failed: unknown error');
    });
  });
});
