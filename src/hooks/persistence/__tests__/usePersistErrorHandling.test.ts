// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * A write to storage that fails has no button of its own to report to: the
 * teacher has to hear about it while still at work, not when leaving the tab.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { usePersistErrorHandling } from '../usePersistErrorHandling';
import { getPersistStatus, setPersistStatus } from '../persistStatus';
import {
  subscribeToToasts,
  TOAST_MESSAGES,
  type ToastInstance,
} from '@/utils/ui/toast';
import i18n from '@/i18n';
import { RepositoryErrorType, type Result } from '@/repositories';

const storageFailure: Result<unknown> = {
  success: false,
  error: { type: RepositoryErrorType.STORAGE_ERROR, message: 'quota exceeded' },
};

const success: Result<unknown> = { success: true, data: undefined };

let toasts: ToastInstance[] = [];
let unsubscribe: () => void = () => {};

beforeEach(() => {
  setPersistStatus('saved');
  toasts = [];
  unsubscribe = subscribeToToasts((event) => {
    if (event.action === 'add') toasts.push(event.toast);
  });
});

afterEach(() => {
  unsubscribe();
  setPersistStatus('saved');
});

describe('usePersistErrorHandling', () => {
  it('says a failed write at once, and once for a run of failures', () => {
    const { result } = renderHook(() => usePersistErrorHandling(true));

    act(() => {
      result.current.persistSnapshotResult(storageFailure, ['students']);
      result.current.persistSnapshotResult(storageFailure, ['students']);
    });

    expect(getPersistStatus()).toBe('failed');
    expect(toasts.map((toast) => toast.type)).toEqual(['error']);
    expect(toasts[0]?.message).toBe(i18n.t(TOAST_MESSAGES.SAVE_ERROR));
  });

  it('says so when saving works again', () => {
    const { result } = renderHook(() => usePersistErrorHandling(true));

    act(() => {
      result.current.persistSnapshotResult(storageFailure, ['students']);
      result.current.persistSnapshotResult(success, ['students']);
    });

    expect(getPersistStatus()).toBe('saved');
    expect(toasts.map((toast) => toast.type)).toEqual(['error', 'success']);
    expect(toasts[1]?.message).toBe(i18n.t(TOAST_MESSAGES.SAVE_RECOVERED));
  });

  it('stays quiet about a write that went through anyway', () => {
    const { result } = renderHook(() => usePersistErrorHandling(true));

    act(() => {
      result.current.persistSnapshotResult(success, ['students']);
    });

    expect(toasts).toEqual([]);
  });

  it('stays quiet about a class that no longer exists', () => {
    const { result } = renderHook(() => usePersistErrorHandling(true));

    act(() => {
      result.current.persistSnapshotResult(
        {
          success: false,
          error: {
            type: RepositoryErrorType.NOT_FOUND,
            message: 'Class not found',
          },
        },
        ['students'],
      );
    });

    expect(getPersistStatus()).toBe('saved');
    expect(toasts).toEqual([]);
  });

  it('reports a write that threw', () => {
    const { result } = renderHook(() => usePersistErrorHandling(true));

    act(() => {
      result.current.reportPersistFailure(new Error('connection lost'));
    });

    expect(getPersistStatus()).toBe('failed');
    expect(toasts.map((toast) => toast.type)).toEqual(['error']);
  });

  it('asks before the page is left while writes fail', () => {
    const { result } = renderHook(() => usePersistErrorHandling(true));
    const leave = () => {
      const event = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    };

    expect(leave()).toBe(false);
    act(() => {
      result.current.persistSnapshotResult(storageFailure, ['students']);
    });
    expect(leave()).toBe(true);
    act(() => {
      result.current.persistSnapshotResult(success, ['students']);
    });
    expect(leave()).toBe(false);
  });
});
