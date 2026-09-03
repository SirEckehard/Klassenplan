// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { act, render, screen, cleanup } from '@testing-library/react';
import OfflineIndicator from '../OfflineIndicator';

/** jsdom reports `navigator.onLine` as true and never fires the events itself. */
const setOnline = (value: boolean) => {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    value,
  });
  act(() => {
    window.dispatchEvent(new Event(value ? 'online' : 'offline'));
  });
};

beforeEach(() => {
  setOnline(true);
});

afterEach(() => {
  cleanup();
  setOnline(true);
});

describe('OfflineIndicator', () => {
  it('renders nothing while online', () => {
    render(<OfflineIndicator />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('announces the offline state politely', () => {
    render(<OfflineIndicator />);

    setOnline(false);

    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveTextContent(/Offline/i);
  });

  it('shrinks to the icon after a few seconds and keeps the label for screen readers', () => {
    vi.useFakeTimers();
    try {
      render(<OfflineIndicator />);

      setOnline(false);
      const status = screen.getByRole('status');
      const label = status.querySelector('span');
      expect(label).not.toHaveClass('sr-only');

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(status.querySelector('span')).toHaveClass('sr-only');
      expect(status).toHaveTextContent(/Offline/i);
    } finally {
      vi.useRealTimers();
    }
  });

  it('disappears again once the connection returns', () => {
    render(<OfflineIndicator />);

    setOnline(false);
    expect(screen.getByRole('status')).toBeInTheDocument();

    setOnline(true);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
