// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import {
  LoggerCore,
  LogLevel,
  defaultLogFormatter,
  type LogEntry,
} from './loggerCore';

const DEBUG_STORAGE_KEY = 'debug';

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const consoleSink = (entry: LogEntry, formattedMessage: string) => {
  switch (entry.level) {
    case LogLevel.DEBUG:
      console.debug(formattedMessage);
      break;
    case LogLevel.INFO:
      console.info(formattedMessage);
      break;
    case LogLevel.WARN:
      console.warn(formattedMessage);
      break;
    case LogLevel.ERROR:
      console.error(formattedMessage);
      break;
    default:
      console.log(formattedMessage);
      break;
  }
};

function resolveStorage(): StorageLike | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  try {
    if ('localStorage' in window) {
      const storage = window.localStorage;
      const probeKey = '__logger_probe__';
      storage.setItem(probeKey, '1');
      storage.removeItem(probeKey);
      return storage;
    }
  } catch {
    // Storage not available (private mode, blocked, etc.)
  }

  return undefined;
}

function readStorageFlag(
  storage: StorageLike | undefined,
  key: string,
): boolean {
  if (!storage) {
    return false;
  }

  try {
    return storage.getItem(key) === 'true';
  } catch {
    return false;
  }
}

function writeStorageValue(
  storage: StorageLike | undefined,
  key: string,
  value: string,
): void {
  if (!storage) {
    return;
  }

  try {
    storage.setItem(key, value);
  } catch {
    // Ignore write errors
  }
}

function removeStorageKey(storage: StorageLike | undefined, key: string): void {
  if (!storage) {
    return;
  }

  try {
    storage.removeItem(key);
  } catch {
    // Ignore removal errors
  }
}

export class ClientLogger {
  private readonly core: LoggerCore;
  private readonly storage?: StorageLike;
  private readonly isDevelopment: boolean;
  private readonly baseLevel: LogLevel;

  constructor() {
    this.isDevelopment = import.meta.env.DEV;
    this.storage = resolveStorage();
    this.baseLevel = this.isDevelopment ? LogLevel.INFO : LogLevel.WARN;

    const debugEnabled = this.isDevelopment
      ? readStorageFlag(this.storage, DEBUG_STORAGE_KEY)
      : false;

    this.core = new LoggerCore({
      level: debugEnabled ? LogLevel.DEBUG : this.baseLevel,
      formatter: defaultLogFormatter,
      sink: consoleSink,
    });
  }

  debug(
    message: string,
    context?: Record<string, unknown>,
    source?: string,
    timestamp?: Date,
  ): void {
    this.core.debug(message, context, source, timestamp);
  }

  info(
    message: string,
    context?: Record<string, unknown>,
    source?: string,
    timestamp?: Date,
  ): void {
    this.core.info(message, context, source, timestamp);
  }

  warn(
    message: string,
    context?: Record<string, unknown>,
    source?: string,
    timestamp?: Date,
  ): void {
    this.core.warn(message, context, source, timestamp);
  }

  error(
    message: string,
    context?: Record<string, unknown>,
    source?: string,
    timestamp?: Date,
  ): void {
    this.core.error(message, context, source, timestamp);
  }

  setLevel(level: LogLevel): void {
    this.core.setLevel(level);
  }

  getLevel(): LogLevel {
    return this.core.getLevel();
  }

  enableDebug(): void {
    if (!this.isDevelopment) {
      this.core.setLevel(LogLevel.DEBUG);
      return;
    }

    writeStorageValue(this.storage, DEBUG_STORAGE_KEY, 'true');
    this.core.setLevel(LogLevel.DEBUG);
  }

  disableDebug(): void {
    if (this.isDevelopment) {
      removeStorageKey(this.storage, DEBUG_STORAGE_KEY);
    }

    this.core.setLevel(this.baseLevel);
  }
}

export const clientLogger = new ClientLogger();

export const logDebug = (
  message: string,
  context?: Record<string, unknown>,
  source?: string,
  timestamp?: Date,
) => clientLogger.debug(message, context, source, timestamp);

export const logInfo = (
  message: string,
  context?: Record<string, unknown>,
  source?: string,
  timestamp?: Date,
) => clientLogger.info(message, context, source, timestamp);

export const logWarn = (
  message: string,
  context?: Record<string, unknown>,
  source?: string,
  timestamp?: Date,
) => clientLogger.warn(message, context, source, timestamp);

export const logError = (
  message: string,
  context?: Record<string, unknown>,
  source?: string,
  timestamp?: Date,
) => clientLogger.error(message, context, source, timestamp);

if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as typeof window & { logger: ClientLogger }).logger = clientLogger;
}
