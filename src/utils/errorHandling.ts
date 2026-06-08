/**
 * Centralized error handling utility for consistent user feedback
 * and debugging across the application
 */

import { logError, logInfo, logWarn } from '@/utils';
import { showToast } from '@/utils/ui/toast';

/**
 * Error severity levels for different handling strategies
 */
enum ErrorSeverity {
  /** Silent errors - logged only, no user notification */
  SILENT = 'silent',
  /** Warning - user notification but non-blocking */
  WARNING = 'warning',
  /** Error - user notification with error styling */
  ERROR = 'error',
  /** Critical - user notification and potential app state reset */
  CRITICAL = 'critical',
}

/**
 * Error categories to help with consistent messaging
 */
enum ErrorCategory {
  NETWORK = 'network',
  STORAGE = 'storage',
  VALIDATION = 'validation',
  EXPORT = 'export',
  IMPORT = 'import',
  ALGORITHM = 'algorithm',
  UI = 'ui',
}

/**
 * Standard error messages for different categories
 */
const ERROR_MESSAGES = {
  [ErrorCategory.NETWORK]:
    'Netzwerkfehler. Bitte überprüfen Sie Ihre Verbindung.',
  [ErrorCategory.STORAGE]:
    'Speicherfehler. Daten konnten nicht gespeichert werden.',
  [ErrorCategory.VALIDATION]: 'Eingabefehler. Bitte überprüfen Sie Ihre Daten.',
  [ErrorCategory.EXPORT]:
    'Export fehlgeschlagen. Bitte versuchen Sie es erneut.',
  [ErrorCategory.IMPORT]:
    'Import fehlgeschlagen. Datei könnte beschädigt sein.',
  [ErrorCategory.ALGORITHM]:
    'Berechnungsfehler. Bitte kontaktieren Sie den Support.',
  [ErrorCategory.UI]: 'Anzeigefehler. Bitte laden Sie die Seite neu.',
} as const;

/**
 * Enhanced error object with context information
 */
export interface AppError {
  message: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  originalError?: Error;
  context?: Record<string, unknown>;
  timestamp: number;
}

/**
 * Creates a standardized error object
 */
export function createAppError(
  category: ErrorCategory,
  severity: ErrorSeverity,
  customMessage?: string,
  originalError?: Error,
  context?: Record<string, unknown>,
): AppError {
  return {
    message: customMessage || ERROR_MESSAGES[category],
    category,
    severity,
    originalError,
    context,
    timestamp: Date.now(),
  };
}

/**
 * Handles errors consistently across the application
 *
 * @param error - The error to handle (can be Error, AppError, or string)
 * @param category - Error category for classification
 * @param severity - How severe the error is (affects user notification)
 * @param customMessage - Custom user-facing message (optional)
 * @param context - Additional context for debugging (optional)
 */
export function handleError(
  error: Error | AppError | string,
  category: ErrorCategory,
  severity: ErrorSeverity = ErrorSeverity.ERROR,
  customMessage?: string,
  context?: Record<string, unknown>,
): void {
  // Create standardized error object
  const appError: AppError =
    typeof error === 'object' && 'category' in error
      ? error // Already an AppError
      : createAppError(
          category,
          severity,
          customMessage,
          error instanceof Error ? error : new Error(String(error)),
          context,
        );

  // Always log through the centralized logger for consistent output
  const logContext: Record<string, unknown> = {
    category: appError.category,
    severity: appError.severity,
    timestamp: new Date(appError.timestamp).toISOString(),
    ...appError.context,
  };

  if (appError.originalError) {
    logContext.error = appError.originalError;
  }

  const logMessage = `[${appError.category.toUpperCase()}] ${appError.message}`;

  switch (appError.severity) {
    case ErrorSeverity.SILENT:
      logInfo(logMessage, logContext, 'errorHandling');
      break;
    case ErrorSeverity.WARNING:
      logWarn(logMessage, logContext, 'errorHandling');
      break;
    case ErrorSeverity.ERROR:
    case ErrorSeverity.CRITICAL:
      logError(logMessage, logContext, 'errorHandling');
      break;
  }

  // Handle user notifications based on severity
  switch (appError.severity) {
    case ErrorSeverity.SILENT:
      // No user notification - only logged
      break;

    case ErrorSeverity.WARNING:
      showToast('warning', appError.message, { duration: 4000 });
      break;

    case ErrorSeverity.ERROR:
      showToast('error', appError.message, { duration: 5000 });
      break;

    case ErrorSeverity.CRITICAL:
      showToast('critical', appError.message, { duration: 0 });
      break;
  }
}

/**
 * Convenience functions for common error types
 */
export const errorHandlers = {
  // Storage errors
  storageError: (error: Error | string, customMessage?: string) =>
    handleError(
      error,
      ErrorCategory.STORAGE,
      ErrorSeverity.ERROR,
      customMessage,
    ),

  // Export/Import errors
  exportError: (error: Error | string, customMessage?: string) =>
    handleError(
      error,
      ErrorCategory.EXPORT,
      ErrorSeverity.ERROR,
      customMessage,
    ),

  importError: (error: Error | string, customMessage?: string) =>
    handleError(
      error,
      ErrorCategory.IMPORT,
      ErrorSeverity.ERROR,
      customMessage,
    ),

  // Validation errors
  validationError: (error: Error | string, customMessage?: string) =>
    handleError(
      error,
      ErrorCategory.VALIDATION,
      ErrorSeverity.WARNING,
      customMessage,
    ),

  // Network errors
  networkError: (error: Error | string, customMessage?: string) =>
    handleError(
      error,
      ErrorCategory.NETWORK,
      ErrorSeverity.ERROR,
      customMessage,
    ),

  // Algorithm errors
  algorithmError: (error: Error | string, customMessage?: string) =>
    handleError(
      error,
      ErrorCategory.ALGORITHM,
      ErrorSeverity.CRITICAL,
      customMessage,
    ),

  // Silent errors (only logged)
  silentError: (error: Error | string, context?: Record<string, unknown>) =>
    handleError(
      error,
      ErrorCategory.UI,
      ErrorSeverity.SILENT,
      undefined,
      context,
    ),
};

/**
 * Enhanced try-catch wrapper with automatic error handling
 *
 * @param operation - Async operation to execute
 * @param category - Error category
 * @param severity - Error severity (defaults to ERROR)
 * @param customMessage - Custom error message for users
 * @returns Promise that resolves with operation result or undefined on error
 */
export async function safeTryCatch<T>(
  operation: () => Promise<T>,
  category: ErrorCategory,
  severity: ErrorSeverity = ErrorSeverity.ERROR,
  customMessage?: string,
): Promise<T | undefined> {
  try {
    return await operation();
  } catch (error) {
    handleError(error as Error, category, severity, customMessage);
    return undefined;
  }
}

/**
 * Synchronous try-catch wrapper with automatic error handling
 */
export function safeTryCatchSync<T>(
  operation: () => T,
  category: ErrorCategory,
  severity: ErrorSeverity = ErrorSeverity.ERROR,
  customMessage?: string,
): T | undefined {
  try {
    return operation();
  } catch (error) {
    handleError(error as Error, category, severity, customMessage);
    return undefined;
  }
}

// Export enums for testing purposes only
export { ErrorSeverity, ErrorCategory };
