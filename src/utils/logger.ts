// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Consolidated Logger Entry Point
 *
 * This is the single source of truth for all logging in the application.
 * `ClientLogger` writes straight to the console; `LoggerCore` holds the
 * level/format/sink logic so a non-console sink can be added without a second
 * logger implementation.
 */
export { LogLevel, type LogEntry } from './logging/loggerCore';
export {
  ClientLogger,
  clientLogger as logger,
  logDebug,
  logInfo,
  logWarn,
  logError,
} from './logging/logger.client';
