/**
 * Logging Service Entry Point
 * Provides backward compatibility while enabling professional features
 */

import { ProfessionalLogger } from './professionalLogger';
import { getLoggerConfig } from './config';
import { LogLevel } from './loggerCore';

// Create configured logger instance
const loggerConfig = getLoggerConfig();
const professionalLoggerInstance = new ProfessionalLogger(loggerConfig);

/**
 * Enhanced logging interface that maintains backward compatibility
 * with the existing simple logger while adding professional features
 */
export class EnhancedLogger {
  private professional: ProfessionalLogger;

  constructor() {
    this.professional = professionalLoggerInstance;
  }

  // Backward compatibility methods (same signatures as original logger)
  debug(
    message: string,
    context?: Record<string, unknown>,
    source?: string,
  ): void {
    this.professional.debug(message, context, source);
  }

  info(
    message: string,
    context?: Record<string, unknown>,
    source?: string,
  ): void {
    this.professional.info(message, context, source);
  }

  warn(
    message: string,
    context?: Record<string, unknown>,
    source?: string,
  ): void {
    this.professional.warn(message, context, source);
  }

  error(
    message: string,
    context?: Record<string, unknown>,
    source?: string,
  ): void {
    this.professional.error(message, context, source);
  }

  // Professional features
  /**
   * Manually flush buffered logs
   */
  flush(): void {
    this.professional.flush();
  }

  /**
   * Get performance metrics
   */
  getMetrics() {
    return this.professional.getMetrics();
  }

  /**
   * Get recent log history
   */
  getHistory(count?: number) {
    return this.professional.getHistory(count);
  }

  /**
   * Performance timing start
   */
  time(label: string): void {
    this.professional.time(label);
  }

  /**
   * Performance timing end
   */
  timeEnd(label: string): void {
    this.professional.timeEnd(label);
  }

  /**
   * Clear logs and reset metrics
   */
  clear(): void {
    this.professional.clear();
  }

  /**
   * Update configuration at runtime
   */
  updateConfig(
    config: Parameters<ProfessionalLogger['updateConfig']>[0],
  ): void {
    this.professional.updateConfig(config);
  }

  /**
   * Set log level (backward compatibility)
   */
  setLevel(level: LogLevel): void {
    this.professional.updateConfig({ level });
  }

  /**
   * Get current log level (backward compatibility)
   */
  getLevel(): LogLevel {
    return this.config.level ?? LogLevel.INFO;
  }

  private get config() {
    return getLoggerConfig();
  }
}

// Create singleton enhanced logger
export const enhancedLogger = new EnhancedLogger();

// Backward compatibility exports (same as original logger)
export const logDebug = (
  message: string,
  context?: Record<string, unknown>,
  source?: string,
) => enhancedLogger.debug(message, context, source);

export const logInfo = (
  message: string,
  context?: Record<string, unknown>,
  source?: string,
) => enhancedLogger.info(message, context, source);

export const logWarn = (
  message: string,
  context?: Record<string, unknown>,
  source?: string,
) => enhancedLogger.warn(message, context, source);

export const logError = (
  message: string,
  context?: Record<string, unknown>,
  source?: string,
) => enhancedLogger.error(message, context, source);

// Professional features exports
export { LogLevel } from './loggerCore';
export type { LogEntry } from './loggerCore';
export type { LoggerConfig, PerformanceMetrics } from './professionalLogger';
export { componentConfigs, loggingFeatures } from './config';

// Default export for easy migration
export default enhancedLogger;
