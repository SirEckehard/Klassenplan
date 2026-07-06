// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, it, expect, beforeEach, vi } from 'vitest';

import {
  handleError,
  createAppError,
  errorHandlers,
  safeTryCatch,
  safeTryCatchSync,
  ErrorSeverity,
  ErrorCategory,
} from '../errorHandling';
import { logError, logInfo, logWarn } from '../../utils/logger';
import * as toastModule from '../../utils/ui/toast';

vi.mock('@/utils/logger', () => ({
  logDebug: vi.fn(),
  logInfo: vi.fn(),
  logWarn: vi.fn(),
  logError: vi.fn(),
}));

const showToastSpy = vi.spyOn(toastModule, 'showToast');

describe('errorHandling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    showToastSpy.mockClear();
  });

  describe('createAppError', () => {
    it('creates a standardized error object', () => {
      const error = createAppError(
        ErrorCategory.STORAGE,
        ErrorSeverity.ERROR,
        'Custom message',
        new Error('Original error'),
        { userId: '123' },
      );

      expect(error).toEqual({
        message: 'Custom message',
        category: ErrorCategory.STORAGE,
        severity: ErrorSeverity.ERROR,
        originalError: expect.any(Error),
        context: { userId: '123' },
        timestamp: expect.any(Number),
      });
    });

    it('uses default message when custom message missing', () => {
      const error = createAppError(ErrorCategory.STORAGE, ErrorSeverity.ERROR);

      expect(error.message).toBe('toast:errors.storage');
    });
  });

  describe('handleError', () => {
    it('logs error via centralized logger', () => {
      const testError = new Error('Test error');

      handleError(testError, ErrorCategory.STORAGE, ErrorSeverity.ERROR);

      expect(logError).toHaveBeenCalledWith(
        '[STORAGE] toast:errors.storage',
        expect.objectContaining({
          category: ErrorCategory.STORAGE,
          severity: ErrorSeverity.ERROR,
          error: testError,
        }),
        'errorHandling',
      );
    });

    it('shows error toast for ERROR severity', () => {
      handleError(new Error('fail'), ErrorCategory.EXPORT, ErrorSeverity.ERROR);

      expect(showToastSpy).toHaveBeenCalledWith(
        'error',
        'toast:errors.export',
        { duration: 5000 },
      );
    });

    it('shows warning toast for WARNING severity', () => {
      const testError = new Error('warn');

      handleError(testError, ErrorCategory.VALIDATION, ErrorSeverity.WARNING);

      expect(showToastSpy).toHaveBeenCalledWith(
        'warning',
        'toast:errors.validation',
        { duration: 4000 },
      );
      expect(logWarn).toHaveBeenCalled();
    });

    it('shows critical toast for CRITICAL severity', () => {
      handleError(
        new Error('critical'),
        ErrorCategory.ALGORITHM,
        ErrorSeverity.CRITICAL,
      );

      expect(showToastSpy).toHaveBeenCalledWith(
        'critical',
        'toast:errors.algorithm',
        { duration: 0 },
      );
    });

    it('does not show toast for SILENT severity', () => {
      handleError(new Error('silent'), ErrorCategory.UI, ErrorSeverity.SILENT);

      expect(showToastSpy).not.toHaveBeenCalled();
    });

    it('handles string errors', () => {
      handleError('String error', ErrorCategory.NETWORK, ErrorSeverity.ERROR);

      expect(showToastSpy).toHaveBeenCalledWith(
        'error',
        'toast:errors.network',
        { duration: 5000 },
      );
    });

    it('uses custom message when provided', () => {
      handleError(
        new Error('custom'),
        ErrorCategory.STORAGE,
        ErrorSeverity.ERROR,
        'Custom error message',
      );

      expect(showToastSpy).toHaveBeenCalledWith(
        'error',
        'Custom error message',
        { duration: 5000 },
      );
    });
  });

  describe('errorHandlers convenience functions', () => {
    it('handles storage errors', () => {
      errorHandlers.storageError(new Error('storage'), 'Storage broken');

      expect(showToastSpy).toHaveBeenCalledWith('error', 'Storage broken', {
        duration: 5000,
      });
    });

    it('handles export errors', () => {
      errorHandlers.exportError(new Error('export'));

      expect(showToastSpy).toHaveBeenCalledWith(
        'error',
        'toast:errors.export',
        { duration: 5000 },
      );
    });

    it('handles validation errors as warnings', () => {
      errorHandlers.validationError(new Error('validation'));

      expect(showToastSpy).toHaveBeenCalledWith(
        'warning',
        'toast:errors.validation',
        { duration: 4000 },
      );
    });

    it('handles silent errors without toast', () => {
      errorHandlers.silentError(new Error('silent'), {
        component: 'TestComponent',
      });

      expect(showToastSpy).not.toHaveBeenCalled();
      expect(logInfo).toHaveBeenCalled();
    });
  });

  describe('safeTryCatch', () => {
    it('returns result when operation succeeds', async () => {
      const operation = vi.fn().mockResolvedValue('success');

      const result = await safeTryCatch(operation, ErrorCategory.STORAGE);

      expect(result).toBe('success');
      expect(showToastSpy).not.toHaveBeenCalled();
    });

    it('handles errors and returns undefined', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('failed'));

      const result = await safeTryCatch(operation, ErrorCategory.STORAGE);

      expect(result).toBeUndefined();
      expect(showToastSpy).toHaveBeenCalled();
    });

    it('uses custom error message', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('failed'));

      await safeTryCatch(
        operation,
        ErrorCategory.EXPORT,
        ErrorSeverity.WARNING,
        'Custom export message',
      );

      expect(showToastSpy).toHaveBeenCalledWith(
        'warning',
        'Custom export message',
        { duration: 4000 },
      );
    });
  });

  describe('safeTryCatchSync', () => {
    it('returns result when operation succeeds', () => {
      const operation = vi.fn().mockReturnValue('success');

      const result = safeTryCatchSync(operation, ErrorCategory.UI);

      expect(result).toBe('success');
      expect(showToastSpy).not.toHaveBeenCalled();
    });

    it('handles errors and returns undefined', () => {
      const operation = vi.fn().mockImplementation(() => {
        throw new Error('failed');
      });

      const result = safeTryCatchSync(operation, ErrorCategory.UI);

      expect(result).toBeUndefined();
      expect(showToastSpy).toHaveBeenCalled();
    });
  });
});
