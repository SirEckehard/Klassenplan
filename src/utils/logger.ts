/**
 * Consolidated Logger Entry Point
 *
 * This is the single source of truth for all logging in the application.
 * Uses ClientLogger for direct console output without buffering.
 *
 * For advanced features (buffering, metrics, remote logging), use:
 * import { enhancedLogger } from '@/utils/logging';
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

// Re-export advanced logger for optional use
export { enhancedLogger, EnhancedLogger } from './logging';
