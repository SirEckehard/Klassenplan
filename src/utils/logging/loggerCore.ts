/**
 * Shared logger core that provides environment-agnostic logging behaviour.
 */

export const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  SILENT: 4,
} as const;

export type LogLevelName = keyof typeof LogLevel;
export type LogLevel = (typeof LogLevel)[LogLevelName];

const LOG_LEVEL_NAME_BY_VALUE: Record<LogLevel, LogLevelName> = {
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR',
  [LogLevel.SILENT]: 'SILENT',
};

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: Record<string, unknown>;
  source?: string;
}

export type LoggerFormatter = (entry: LogEntry) => string;
export type LoggerSink = (entry: LogEntry, formattedMessage: string) => void;
export type LoggerContextProvider = () => Record<string, unknown> | undefined;
export type Clock = () => Date;

export interface LoggerCoreOptions {
  level?: LogLevel;
  formatter?: LoggerFormatter;
  sink: LoggerSink;
  clock?: Clock;
  contextProvider?: LoggerContextProvider;
}

export function getLogLevelName(level: LogLevel): LogLevelName {
  return LOG_LEVEL_NAME_BY_VALUE[level];
}

export function defaultLogFormatter(entry: LogEntry): string {
  const timestamp = entry.timestamp.toISOString();
  const levelName = getLogLevelName(entry.level);
  const sourcePrefix = entry.source ? `[${entry.source}] ` : '';
  const contextSuffix = entry.context
    ? ` ${JSON.stringify(entry.context)}`
    : '';

  return `${timestamp} ${levelName} ${sourcePrefix}${entry.message}${contextSuffix}`;
}

export class LoggerCore {
  private level: LogLevel;
  private readonly sink: LoggerSink;
  private readonly formatter: LoggerFormatter;
  private readonly clock: Clock;
  private readonly contextProvider?: LoggerContextProvider;

  constructor(options: LoggerCoreOptions) {
    this.level = options.level ?? LogLevel.INFO;
    this.sink = options.sink;
    this.formatter = options.formatter ?? defaultLogFormatter;
    this.clock = options.clock ?? (() => new Date());
    this.contextProvider = options.contextProvider;
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  getLevel(): LogLevel {
    return this.level;
  }

  log(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    source?: string,
    timestamp?: Date,
  ): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const finalTimestamp = timestamp ?? this.clock();
    const combinedContext = this.combineContext(context);
    const entry: LogEntry = {
      level,
      message,
      timestamp: finalTimestamp,
      context: combinedContext,
      source,
    };

    if (!combinedContext) {
      delete entry.context;
    }

    const formattedMessage = this.formatter(entry);
    this.sink(entry, formattedMessage);
  }

  debug(
    message: string,
    context?: Record<string, unknown>,
    source?: string,
    timestamp?: Date,
  ): void {
    this.log(LogLevel.DEBUG, message, context, source, timestamp);
  }

  info(
    message: string,
    context?: Record<string, unknown>,
    source?: string,
    timestamp?: Date,
  ): void {
    this.log(LogLevel.INFO, message, context, source, timestamp);
  }

  warn(
    message: string,
    context?: Record<string, unknown>,
    source?: string,
    timestamp?: Date,
  ): void {
    this.log(LogLevel.WARN, message, context, source, timestamp);
  }

  error(
    message: string,
    context?: Record<string, unknown>,
    source?: string,
    timestamp?: Date,
  ): void {
    this.log(LogLevel.ERROR, message, context, source, timestamp);
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.level && this.level !== LogLevel.SILENT;
  }

  private combineContext(
    context?: Record<string, unknown>,
  ): Record<string, unknown> | undefined {
    const baseContext = this.contextProvider?.();

    if (!baseContext && !context) {
      return undefined;
    }

    const mergedContext = {
      ...(baseContext ?? {}),
      ...(context ?? {}),
    } as Record<string, unknown>;

    if (Object.keys(mergedContext).length === 0) {
      return undefined;
    }

    return mergedContext;
  }
}
