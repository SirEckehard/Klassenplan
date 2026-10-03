// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { afterEach, describe, expect, it } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { ToastProvider } from '@/components/ui/feedback/ToastProvider';
import {
  dismissAllToasts,
  quietSuccessToasts,
  showToast,
} from '@/utils/ui/toast';

describe('ToastProvider', () => {
  afterEach(() => {
    act(() => dismissAllToasts());
  });

  // Top right, messages lay over Help, the gear and the inspector's head.
  it('stacks messages at the bottom centre', () => {
    render(<ToastProvider>{null}</ToastProvider>);

    expect(screen.getByTestId('toast-container')).toHaveClass(
      'bottom-18',
      'items-center',
    );
  });

  describe('with success messages quieted, as on the projection', () => {
    it('takes away a success message showing and lets none in', () => {
      render(<ToastProvider>{null}</ToastProvider>);
      act(() => {
        showToast('success', 'Sitzplan „Montag“ gespeichert');
      });
      expect(screen.getByText('Sitzplan „Montag“ gespeichert')).toBeVisible();

      let release = () => {};
      act(() => {
        release = quietSuccessToasts();
      });
      expect(screen.queryByText('Sitzplan „Montag“ gespeichert')).toBeNull();

      act(() => {
        showToast('success', 'Plan exportiert');
      });
      expect(screen.queryByText('Plan exportiert')).toBeNull();

      release();
      act(() => {
        showToast('success', 'Plan exportiert');
      });
      expect(screen.getByText('Plan exportiert')).toBeVisible();
    });

    it('still shows an error', () => {
      render(<ToastProvider>{null}</ToastProvider>);
      const release = quietSuccessToasts();

      act(() => {
        showToast('error', 'Sitzplan konnte nicht gespeichert werden');
      });

      expect(
        screen.getByText('Sitzplan konnte nicht gespeichert werden'),
      ).toBeVisible();
      release();
    });
  });
});
