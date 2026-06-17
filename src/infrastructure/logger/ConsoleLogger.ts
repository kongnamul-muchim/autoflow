import { ILogger, LogLevel } from '../../domain/ports/ILogger.js';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export class ConsoleLogger implements ILogger {
  level: LogLevel = 'debug';

  constructor(level?: LogLevel) {
    if (level) this.level = level;
  }

  debug(context: string, message: string, data?: Record<string, unknown>): void {
    if (LOG_LEVELS[this.level] > LOG_LEVELS.debug) return;
    console.log(`[DEBUG] [${context}] ${message}`, data ? JSON.stringify(data) : '');
  }

  info(context: string, message: string, data?: Record<string, unknown>): void {
    if (LOG_LEVELS[this.level] > LOG_LEVELS.info) return;
    console.log(`[INFO]  [${context}] ${message}`, data ? JSON.stringify(data) : '');
  }

  warn(context: string, message: string, data?: Record<string, unknown>): void {
    if (LOG_LEVELS[this.level] > LOG_LEVELS.warn) return;
    console.warn(`[WARN]  [${context}] ${message}`, data ? JSON.stringify(data) : '');
  }

  error(context: string, message: string, error?: unknown): void {
    if (LOG_LEVELS[this.level] > LOG_LEVELS.error) return;
    console.error(`[ERROR] [${context}] ${message}`, error instanceof Error ? error.message : error ?? '');
  }
}
