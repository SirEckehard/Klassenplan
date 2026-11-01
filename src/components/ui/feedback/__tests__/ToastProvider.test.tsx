// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { ToastProvider } from '@/components/ui/feedback/ToastProvider';
import {
  announce,
  dismissAllToasts,
  dismissToast,
  quietSuccessToasts,
  showToast,
} from '@/utils/ui/toast';
import { registerToastDock } from '@/hooks/ui/toastDock';
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

  // Top right they lay over the inspector's head, where a teacher was
  // typing (decision 0037). Without a shell there is nothing to keep clear
  // of but the window's edge.
  it('stands at the bottom of the window without a shell', () => {
    render(<ToastProvider>{null}</ToastProvider>);
    act(() => {
      showToast('error', 'Fehler beim Import');
    });

    const stack = screen.getByTestId('toast-container');
    expect(stack).toHaveClass('flex-col-reverse', 'items-center');
    expect(stack.style.bottom).toMatch(/1rem.*safe-area-inset-bottom/);
    expect(stack.style.top).toBe('');
  });

  it('stands over the stage the shell measures, above its status bar', () => {
    const unregister = registerToastDock(() => ({
      left: 208,
      right: 320,
      bottom: 77,
    }));
    try {
      render(<ToastProvider>{null}</ToastProvider>);
      act(() => {
        showToast('error', 'Fehler beim Import');
      });

      const stack = screen.getByTestId('toast-container');
      expect(stack.style.left).toMatch(/^calc\(208px/);
      expect(stack.style.right).toMatch(/^calc\(320px/);
      expect(stack.style.bottom).toBe('77px');
    } finally {
      unregister();
    }
  });

  it('says to a screen reader alone what the screen already shows', () => {
    render(<ToastProvider>{null}</ToastProvider>);
    act(() => {
      announce('Plan „Deutsch“ geladen.');
    });

    expect(cards()).toHaveLength(0);
    const said = screen.getByText('Plan „Deutsch“ geladen.');
    expect(said.closest('[role="status"]')).toHaveClass('sr-only');
  });

  describe('a tap on the message', () => {
    it('puts it away wherever it lands', () => {
      const onDismiss = vi.fn();
      render(<ToastProvider>{null}</ToastProvider>);
      act(() => {
        showToast('error', 'Fehler beim Import', { onDismiss });
      });

      fireEvent.click(screen.getByText('Fehler beim Import'));

      expect(screen.queryByText('Fehler beim Import')).toBeNull();
      expect(onDismiss).toHaveBeenCalledOnce();
    });

    it('on its button does what the button says', () => {
      const undo = vi.fn();
      render(<ToastProvider>{null}</ToastProvider>);
      act(() => {
        showToast('info', 'Dienste neu verteilt.', {
          action: { label: 'Rückgängig', onClick: undo },
        });
      });

      fireEvent.click(getButton(/Rückgängig/));

      expect(undo).toHaveBeenCalledOnce();
      expect(screen.queryByText('Dienste neu verteilt.')).toBeNull();
    });

    it('that ends a swipe let go too early leaves it', () => {
      render(<ToastProvider>{null}</ToastProvider>);
      act(() => {
        showToast('error', 'Fehler beim Import');
      });
      const [card] = cards();
      // jsdom lays nothing out; the card's real size decides "far enough".
      Object.defineProperty(card, 'offsetWidth', { value: 368 });
      Object.defineProperty(card, 'offsetHeight', { value: 56 });

      // 20px: a swipe has begun, but it stays short of the distance and of
      // the least a flick needs, however fast the events come.
      fireEvent.pointerDown(card, { pointerId: 1, button: 0, clientX: 100 });
      fireEvent.pointerMove(card, { pointerId: 1, clientX: 120 });
      fireEvent.pointerUp(card, { pointerId: 1, clientX: 120 });
      fireEvent.click(card);

      expect(screen.getByText('Fehler beim Import')).toBeVisible();
    });
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

  it('puts the newest message first, nearest the status bar', () => {
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

  describe('a swipe sideways', () => {
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

    it('to the left puts it away too', () => {
      render(<ToastProvider>{null}</ToastProvider>);
      act(() => {
        showToast('error', 'Fehler beim Import');
      });
      const [card] = cards();

      fireEvent.pointerDown(card, { pointerId: 1, button: 0, clientX: 300 });
      fireEvent.pointerMove(card, { pointerId: 1, clientX: 240 });
      fireEvent.pointerMove(card, { pointerId: 1, clientX: 160 });
      fireEvent.pointerUp(card, { pointerId: 1, clientX: 160 });

      expect(screen.queryByText('Fehler beim Import')).toBeNull();
    });
  });

  it('puts a message away with a swipe down, towards the bar', () => {
    render(<ToastProvider>{null}</ToastProvider>);
    act(() => {
      showToast('error', 'Fehler beim Import');
    });
    const [card] = cards();

    fireEvent.pointerDown(card, {
      pointerId: 1,
      button: 0,
      clientX: 100,
      clientY: 100,
    });
    fireEvent.pointerMove(card, { pointerId: 1, clientX: 100, clientY: 130 });
    fireEvent.pointerMove(card, { pointerId: 1, clientX: 102, clientY: 170 });
    fireEvent.pointerUp(card, { pointerId: 1, clientX: 102, clientY: 170 });

    expect(screen.queryByText('Fehler beim Import')).toBeNull();
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
      expect(
        within(screen.getByTestId('toast-container')).queryByRole('status'),
      ).toBeNull();

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
