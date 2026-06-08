// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Repository Pattern Types
 * Provides type-safe error handling with Result<T> pattern
 */

/**
 * Success result with data
 */
export type Success<T> = {
  success: true;
  data: T;
};

/**
 * Failure result with error information
 */
export type Failure = {
  success: false;
  error: RepositoryError;
};

/**
 * Result type for repository operations
 * Either Success<T> or Failure
 */
export type Result<T> = Success<T> | Failure;

/**
 * Repository error types
 */
export enum RepositoryErrorType {
  NOT_FOUND = 'NOT_FOUND',
  STORAGE_ERROR = 'STORAGE_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  DUPLICATE_KEY = 'DUPLICATE_KEY',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Structured error information from repository operations
 */
export type RepositoryError = {
  type: RepositoryErrorType;
  message: string;
  originalError?: unknown;
};

/**
 * Helper functions for creating Results
 */
export const ResultHelpers = {
  success: <T>(data: T): Success<T> => ({
    success: true,
    data,
  }),

  failure: (error: RepositoryError): Failure => ({
    success: false,
    error,
  }),

  fromError: (
    error: unknown,
    type: RepositoryErrorType = RepositoryErrorType.UNKNOWN_ERROR,
    message?: string,
  ): Failure => ({
    success: false,
    error: {
      type,
      message: message || String(error),
      originalError: error,
    },
  }),
};
