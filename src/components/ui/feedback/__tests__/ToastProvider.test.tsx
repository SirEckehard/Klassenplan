// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { ToastProvider } from '@/components/ui/feedback/ToastProvider';
import {
  dismissAllToasts,
  dismissToast,
  quietSuccessToasts,
  showToast,
} from '@/utils/ui/toast';
import { getButton } from '@/__tests__/utils';

const cards = () => screen.queryAllByTestId('toast-item');

/** Fake timers for the toasts' own clock; React's act flushes the rest. */
const advance = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });

describe('ToastProvider', () => {
  afterEach(() => {
    act(() => dismissAllToasts());
  });

  // Top right, but under the header: in its corner messages lay over Help
  // and the gear.
  it('stacks messages at the top right, under the header', () => {
    render(<ToastProvider>{null}</ToastProvider>);

    expect(screen.getByTestId('toast-container')).toHaveClass(
      'top-18',
      'items-end',
      'sm:right-6',
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

  it('puts the newest message on top, nearest the header', () => {
    render(<ToastProvider>{null}</ToastProvider>);
    act(() => {
      showToast('success', 'Backup exportiert');
      showToast('info', 'Neue Version verfügbar');
    });

    expect(cards().map((card) => card.textContent)).toEqual([
      'Neue Version verfügbar',
      'Backup exportiert',
    ]);
  });

  it('shows the same message once, in its place, and starts its time anew', () => {
    vi.useFakeTimers();
    try {
      render(<ToastProvider>{null}</ToastProvider>);
      act(() => {
        showToast('success', 'Du hast bereits die neueste Version', {
          id: 'check',
        });
        showToast('info', 'Backup exportiert');
      });
      advance(2000);
      act(() => {
        showToast('success', 'Immer noch die neueste Version', { id: 'check' });
      });

      expect(cards().map((card) => card.textContent)).toEqual([
        'Backup exportiert',
        'Immer noch die neueste Version',
      ]);
      advance(2000);
      expect(screen.getByText('Immer noch die neueste Version')).toBeVisible();
      advance(1100);
      expect(screen.queryByText('Immer noch die neueste Version')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  describe('holds a message while it is being read', () => {
    it('while the pointer rests on it, then runs on with the time it had left', () => {
      vi.useFakeTimers();
      try {
        render(<ToastProvider>{null}</ToastProvider>);
        act(() => {
          showToast('success', 'Plan exportiert');
        });
        advance(2000);
        const [card] = cards();
        fireEvent.pointerOver(card);
        advance(10_000);
        expect(screen.getByText('Plan exportiert')).toBeVisible();

        fireEvent.pointerOut(card, { relatedTarget: document.body });
        advance(900);
        expect(screen.getByText('Plan exportiert')).toBeVisible();
        advance(200);
        expect(screen.queryByText('Plan exportiert')).toBeNull();
      } finally {
        vi.useRealTimers();
      }
    });

    it('while the keyboard focus is in it', () => {
      vi.useFakeTimers();
      try {
        render(<ToastProvider>{null}</ToastProvider>);
        act(() => {
          showToast('success', 'Plan exportiert');
        });
        const close = getButton(/schließen|dismiss/i);
        act(() => close.focus());
        advance(10_000);
        expect(screen.getByText('Plan exportiert')).toBeVisible();

        act(() => close.blur());
        advance(3100);
        expect(screen.queryByText('Plan exportiert')).toBeNull();
      } finally {
        vi.useRealTimers();
      }
    });

    it('while the page is in the background', () => {
      vi.useFakeTimers();
      const visibility = vi.spyOn(document, 'visibilityState', 'get');
      try {
        render(<ToastProvider>{null}</ToastProvider>);
        act(() => {
          showToast('success', 'Plan exportiert');
        });
        visibility.mockReturnValue('hidden');
        act(() => {
          document.dispatchEvent(new Event('visibilitychange'));
        });
        advance(10_000);
        expect(screen.getByText('Plan exportiert')).toBeVisible();

        visibility.mockReturnValue('visible');
        act(() => {
          document.dispatchEvent(new Event('visibilitychange'));
        });
        advance(3100);
        expect(screen.queryByText('Plan exportiert')).toBeNull();
      } finally {
        visibility.mockRestore();
        vi.useRealTimers();
      }
    });
  });

  describe('a swipe to the right', () => {
    const swipe = (card: HTMLElement, target: Element = card) => {
      fireEvent.pointerDown(target, { pointerId: 1, button: 0, clientX: 100 });
      fireEvent.pointerMove(card, { pointerId: 1, clientX: 160 });
      fireEvent.pointerMove(card, { pointerId: 1, clientX: 240 });
      fireEvent.pointerUp(card, { pointerId: 1, clientX: 240 });
    };

    it('puts the message away, as its close button does', () => {
      const onDismiss = vi.fn();
      render(<ToastProvider>{null}</ToastProvider>);
      act(() => {
        showToast('info', 'Als genutzter Sitzplan vermerkt', { onDismiss });
      });

      swipe(cards()[0]);

      expect(screen.queryByText('Als genutzter Sitzplan vermerkt')).toBeNull();
      expect(onDismiss).toHaveBeenCalledOnce();
    });

    it('does not start on one of its buttons', () => {
      render(<ToastProvider>{null}</ToastProvider>);
      act(() => {
        showToast('success', 'Nachbarschaften zurückgesetzt', {
          action: { label: 'Rückgängig', onClick: vi.fn() },
        });
      });

      swipe(cards()[0], getButton(/Rückgängig/));

      expect(screen.getByText('Nachbarschaften zurückgesetzt')).toBeVisible();
    });
  });

  it('draws the time left only on a message that goes on its own', () => {
    render(<ToastProvider>{null}</ToastProvider>);
    act(() => {
      showToast('success', 'Plan exportiert');
      showToast('info', 'Neue Version verfügbar', { duration: 0 });
    });

    const [stays, goes] = cards();
    expect(stays.querySelector('.toast-timeline')).toBeNull();
    expect(goes.querySelector('.toast-timeline')).not.toBeNull();
  });

  describe('with motion', () => {
    const originalAnimate = Element.prototype.animate;

    afterEach(() => {
      Element.prototype.animate = originalAnimate;
      Reflect.deleteProperty(window, 'matchMedia');
    });

    /** Every animation finishes when the test says so. */
    const mockAnimations = () => {
      let finish = () => {};
      const finished = new Promise<void>((resolve) => {
        finish = resolve;
      });
      Element.prototype.animate = vi.fn(
        () => ({ finished }) as unknown as Animation,
      );
      return () => finish();
    };

    it('lets a message glide out before it leaves the page, gone for a screen reader at once', async () => {
      const finish = mockAnimations();
      render(<ToastProvider>{null}</ToastProvider>);
      act(() => {
        showToast('success', 'Plan exportiert', { id: 'export' });
      });
      act(() => dismissToast('export'));

      const [card] = cards();
      expect(card).toHaveAttribute('aria-hidden', 'true');
      expect(card).not.toHaveAttribute('role');
      expect(screen.queryByRole('status')).toBeNull();

      await act(async () => {
        finish();
        await Promise.resolve();
      });
      expect(cards()).toHaveLength(0);
    });

    it('takes a message away at once when the system asks for less motion', () => {
      mockAnimations();
      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        value: (query: string) => ({
          matches: query.includes('reduce'),
          media: query,
        }),
      });
      render(<ToastProvider>{null}</ToastProvider>);
      act(() => {
        showToast('success', 'Plan exportiert', { id: 'export' });
      });
      act(() => dismissToast('export'));

      expect(cards()).toHaveLength(0);
    });
  });
});
