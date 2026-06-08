/**
 * Professional Logging Configuration
 * Environment-specific configurations for the logging service
 */

import { LogLevel } from './loggerCore';
import type { LoggerConfig } from './professionalLogger';

/**
 * Development environment configuration
 */
export const developmentConfig: Partial<LoggerConfig> = {
  environment: 'development',
  level: LogLevel.DEBUG,
  debug: true,
  bufferSize: 10, // Smaller buffer for immediate feedback
  flushInterval: 1000, // 1 second for quick feedback
  sampleRate: 1.0, // No sampling in development
  maxEntries: 500,
  enablePerformanceTracking: true,
};

/**
 * Production environment configuration
 */
export const productionConfig: Partial<LoggerConfig> = {
  environment: 'production',
  level: LogLevel.WARN, // Only warnings and errors
  debug: false,
  bufferSize: 100, // Larger buffer for efficiency
  flushInterval: 10000, // 10 seconds
  sampleRate: 0.1, // Sample 10% of logs to reduce load
  maxEntries: 200, // Smaller history in production
  enablePerformanceTracking: false,
  // remoteEndpoint: 'https://logs.klassenplan.de/api/logs', // Configure when available
};

/**
 * Test environment configuration
 */
export const testConfig: Partial<LoggerConfig> = {
  environment: 'test',
  level: LogLevel.ERROR, // Only errors in tests
  debug: false,
  bufferSize: 5,
  flushInterval: 100, // Quick flush for tests
  sampleRate: 1.0,
  maxEntries: 50,
  enablePerformanceTracking: false,
};

/**
 * Get configuration based on current environment
 */
export function getLoggerConfig(): Partial<LoggerConfig> {
  // Detect environment
  if (typeof window === 'undefined') {
    return testConfig;
  }

  if (import.meta.env.DEV) {
    return developmentConfig;
  }

  return productionConfig;
}

/**
 * Custom configuration for specific components or features
 */
export const componentConfigs = {
  algorithm: {
    level: LogLevel.INFO,
    sampleRate: 0.5, // Sample algorithm logs more aggressively
  },

  migration: {
    level: LogLevel.DEBUG,
    sampleRate: 1.0, // Always log migration activities
  },

  export: {
    level: LogLevel.INFO,
    sampleRate: 1.0, // Always log export activities
  },

  validation: {
    level: LogLevel.WARN,
    sampleRate: 0.1, // Validation logs can be noisy
  },

  storage: {
    level: LogLevel.ERROR,
    sampleRate: 1.0, // Always log storage errors
  },
} as const;

/**
 * Feature flags for logging
 */
export const loggingFeatures = {
  /** Enable user interaction tracking */
  trackUserInteractions: false,

  /** Enable performance monitoring */
  performanceMonitoring: true,

  /** Enable error boundary logging */
  errorBoundaryLogging: true,

  /** Enable API request logging */
  apiRequestLogging: false,

  /** Enable state change logging */
  stateChangeLogging: false,
} as const;
