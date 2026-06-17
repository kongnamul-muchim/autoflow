export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface ILogger {
  level: LogLevel;
  debug(context: string, message: string, data?: Record<string, unknown>): void;
  info(context: string, message: string, data?: Record<string, unknown>): void;
  warn(context: string, message: string, data?: Record<string, unknown>): void;
  error(context: string, message: string, error?: unknown): void;
}
