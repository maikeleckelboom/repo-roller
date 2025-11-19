import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { Logger } from '../../src/core/logger.js';

describe('Logger', () => {
  // Mock console methods
  let consoleDebugSpy: ReturnType<typeof vi.spyOn>;
  let consoleInfoSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create logger with default options', () => {
      const logger = new Logger();
      expect(logger.getLevel()).toBe('info');
    });

    it('should create logger with custom log level', () => {
      const logger = new Logger({ level: 'debug' });
      expect(logger.getLevel()).toBe('debug');
    });

    it('should create logger with silent mode', () => {
      const logger = new Logger({ silent: true });
      logger.info('test');
      expect(consoleInfoSpy).not.toHaveBeenCalled();
    });
  });

  describe('log level hierarchy', () => {
    it('should log debug when level is debug', () => {
      const logger = new Logger({ level: 'debug' });
      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');

      expect(consoleDebugSpy).toHaveBeenCalledWith('[DEBUG] debug message');
      expect(consoleInfoSpy).toHaveBeenCalledWith('info message');
      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should not log debug when level is info', () => {
      const logger = new Logger({ level: 'info' });
      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');

      expect(consoleDebugSpy).not.toHaveBeenCalled();
      expect(consoleInfoSpy).toHaveBeenCalledWith('info message');
      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should only log warn and error when level is warn', () => {
      const logger = new Logger({ level: 'warn' });
      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');

      expect(consoleDebugSpy).not.toHaveBeenCalled();
      expect(consoleInfoSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should only log error when level is error', () => {
      const logger = new Logger({ level: 'error' });
      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');

      expect(consoleDebugSpy).not.toHaveBeenCalled();
      expect(consoleInfoSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should log nothing when level is silent', () => {
      const logger = new Logger({ level: 'silent' });
      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');

      expect(consoleDebugSpy).not.toHaveBeenCalled();
      expect(consoleInfoSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });

  describe('silent mode', () => {
    it('should suppress all logs when silent is true', () => {
      const logger = new Logger({ level: 'debug', silent: true });
      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');

      expect(consoleDebugSpy).not.toHaveBeenCalled();
      expect(consoleInfoSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should resume logging when silent is set to false', () => {
      const logger = new Logger({ silent: true });
      logger.info('should not log');

      logger.setSilent(false);
      logger.info('should log');

      expect(consoleInfoSpy).toHaveBeenCalledOnce();
      expect(consoleInfoSpy).toHaveBeenCalledWith('should log');
    });
  });

  describe('debug()', () => {
    it('should log with [DEBUG] prefix', () => {
      const logger = new Logger({ level: 'debug' });
      logger.debug('test message');
      expect(consoleDebugSpy).toHaveBeenCalledWith('[DEBUG] test message');
    });

    it('should support additional arguments', () => {
      const logger = new Logger({ level: 'debug' });
      const obj = { key: 'value' };
      logger.debug('test', obj, 123);
      expect(consoleDebugSpy).toHaveBeenCalledWith('[DEBUG] test', obj, 123);
    });
  });

  describe('info()', () => {
    it('should log without prefix', () => {
      const logger = new Logger({ level: 'info' });
      logger.info('test message');
      expect(consoleInfoSpy).toHaveBeenCalledWith('test message');
    });

    it('should support additional arguments', () => {
      const logger = new Logger({ level: 'info' });
      const obj = { key: 'value' };
      logger.info('test', obj, 123);
      expect(consoleInfoSpy).toHaveBeenCalledWith('test', obj, 123);
    });
  });

  describe('warn()', () => {
    it('should log with warning emoji prefix', () => {
      const logger = new Logger({ level: 'warn' });
      logger.warn('test message');
      expect(consoleWarnSpy).toHaveBeenCalledWith('⚠️  test message');
    });

    it('should support additional arguments', () => {
      const logger = new Logger({ level: 'warn' });
      const obj = { key: 'value' };
      logger.warn('test', obj, 123);
      expect(consoleWarnSpy).toHaveBeenCalledWith('⚠️  test', obj, 123);
    });
  });

  describe('error()', () => {
    it('should log with error emoji prefix', () => {
      const logger = new Logger({ level: 'error' });
      logger.error('test message');
      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ test message');
    });

    it('should support additional arguments', () => {
      const logger = new Logger({ level: 'error' });
      const obj = { key: 'value' };
      logger.error('test', obj, 123);
      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ test', obj, 123);
    });
  });

  describe('setLevel()', () => {
    it('should change log level dynamically', () => {
      const logger = new Logger({ level: 'info' });

      logger.debug('should not log');
      expect(consoleDebugSpy).not.toHaveBeenCalled();

      logger.setLevel('debug');
      logger.debug('should log');
      expect(consoleDebugSpy).toHaveBeenCalledWith('[DEBUG] should log');
    });

    it('should update getLevel() return value', () => {
      const logger = new Logger({ level: 'info' });
      expect(logger.getLevel()).toBe('info');

      logger.setLevel('debug');
      expect(logger.getLevel()).toBe('debug');

      logger.setLevel('error');
      expect(logger.getLevel()).toBe('error');
    });
  });

  describe('setSilent()', () => {
    it('should enable silent mode', () => {
      const logger = new Logger({ level: 'info' });
      logger.info('should log');

      logger.setSilent(true);
      logger.info('should not log');

      expect(consoleInfoSpy).toHaveBeenCalledOnce();
      expect(consoleInfoSpy).toHaveBeenCalledWith('should log');
    });

    it('should disable silent mode', () => {
      const logger = new Logger({ silent: true });
      logger.info('should not log');

      logger.setSilent(false);
      logger.info('should log');

      expect(consoleInfoSpy).toHaveBeenCalledOnce();
      expect(consoleInfoSpy).toHaveBeenCalledWith('should log');
    });
  });

  describe('getLevel()', () => {
    it('should return current log level', () => {
      const logger = new Logger({ level: 'debug' });
      expect(logger.getLevel()).toBe('debug');
    });

    it('should return default level when not specified', () => {
      const logger = new Logger();
      expect(logger.getLevel()).toBe('info');
    });
  });

  describe('message formatting', () => {
    it('should format debug messages correctly', () => {
      const logger = new Logger({ level: 'debug' });
      logger.debug('Hello world');
      expect(consoleDebugSpy).toHaveBeenCalledWith('[DEBUG] Hello world');
    });

    it('should format warn messages correctly', () => {
      const logger = new Logger({ level: 'warn' });
      logger.warn('Warning message');
      expect(consoleWarnSpy).toHaveBeenCalledWith('⚠️  Warning message');
    });

    it('should format error messages correctly', () => {
      const logger = new Logger({ level: 'error' });
      logger.error('Error message');
      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Error message');
    });
  });

  describe('edge cases', () => {
    it('should handle empty string messages', () => {
      const logger = new Logger({ level: 'info' });
      logger.info('');
      expect(consoleInfoSpy).toHaveBeenCalledWith('');
    });

    it('should handle messages with special characters', () => {
      const logger = new Logger({ level: 'info' });
      logger.info('Message with\nnewline');
      expect(consoleInfoSpy).toHaveBeenCalledWith('Message with\nnewline');
    });

    it('should handle multiple calls in sequence', () => {
      const logger = new Logger({ level: 'info' });
      logger.info('First');
      logger.info('Second');
      logger.info('Third');

      expect(consoleInfoSpy).toHaveBeenCalledTimes(3);
    });
  });
});
