/**
 * @file logger.ts
 * Structured logging module for repo-roller
 *
 * OWNS:
 * - Log level management
 * - Formatted log output
 * - Debug/info/warn/error logging
 *
 * DOES NOT OWN:
 * - UI rendering (see ui.ts)
 * - Error handling logic (see validation.ts)
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

interface LoggerOptions {
  level: LogLevel;
  silent: boolean;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
};

class Logger {
  private options: LoggerOptions;

  constructor(options: Partial<LoggerOptions> = {}) {
    this.options = {
      level: options.level ?? 'info',
      silent: options.silent ?? false,
    };
  }

  private shouldLog(level: LogLevel): boolean {
    if (this.options.silent) {
      return false;
    }
    return LOG_LEVELS[level] >= LOG_LEVELS[this.options.level];
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.shouldLog('debug')) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.shouldLog('info')) {
      console.info(message, ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog('warn')) {
      console.warn(`⚠️  ${message}`, ...args);
    }
  }

  error(message: string, ...args: unknown[]): void {
    if (this.shouldLog('error')) {
      console.error(`❌ ${message}`, ...args);
    }
  }

  setLevel(level: LogLevel): void {
    this.options.level = level;
  }

  setSilent(silent: boolean): void {
    this.options.silent = silent;
  }

  getLevel(): LogLevel {
    return this.options.level;
  }
}

// Default logger instance
export const logger = new Logger({
  level: process.env.LOG_LEVEL as LogLevel ?? 'info',
  silent: process.env.SILENT === 'true',
});

// Export Logger class for testing
export { Logger };
