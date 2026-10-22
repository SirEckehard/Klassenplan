// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, afterEach } from 'vitest';
import '@/i18n'; // Initialize i18n for tests
import UpdateCheckButton from '../UpdateCheckButton';
import { ToastProvider } from '@/components/ui/feedback/ToastProvider';
import { setUpdateController } from '@/hooks/pwa/swUpdateController';
import { getButton } from '@/__tests__/utils';

const worker = {} as ServiceWorker;

const registerController = (
  registration: Partial<ServiceWorkerRegistration>,
  applyUpdate = vi.fn(),
) => {
  setUpdateController({
    registration: {
      installing: null,
      waiting: null,
      update: vi.fn(async () => {}),
      ...registration,
    } as unknown as ServiceWorkerRegistration,
    applyUpdate,
  });
  return applyUpdate;
};

const clickCheck = async () => {
  render(
    <ToastProvider>
      <UpdateCheckButton />
    </ToastProvider>,
  );
  const user = userEvent.setup();
  await user.click(getButton(/Auf Updates prüfen|Check for updates/i));
  return user;
};

afterEach(() => {
  setUpdateController(null);
});

describe('UpdateCheckButton', () => {
  // The answer stands in the gear's row: a toast lay over the open menu.
  it('confirms the current version in the row itself, not in a toast', async () => {
    registerController({});

    await clickCheck();

    const answer = await screen.findByRole('button', {
      name: /^(Aktuell|Current) · v\d/,
    });
    expect(screen.getByRole('status')).toHaveTextContent(
      /^(Aktuell|Current) · v\d/,
    );
    expect(screen.queryByTestId('toast-item')).toBeNull();

    // Pressing it again checks again.
    await userEvent.setup().click(answer);
    await vi.waitFor(() => {
      expect(
        screen.getByRole('button', { name: /^(Aktuell|Current) · v\d/ }),
      ).toBeInTheDocument();
    });
  });

  it('goes back to the check after three seconds', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      registerController({});
      await clickCheck();
      await screen.findByRole('button', { name: /^(Aktuell|Current) · v\d/ });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(3000);
      });

      expect(
        getButton(/Auf Updates prüfen|Check for updates/i),
      ).toBeInTheDocument();
      expect(screen.getByRole('status')).toBeEmptyDOMElement();
    } finally {
      vi.useRealTimers();
    }
  });

  it('offers the reload action when a worker is waiting', async () => {
    const applyUpdate = registerController({ waiting: worker });

    const user = await clickCheck();

    const reload = await screen.findByRole('button', {
      name: /^(Aktualisieren|Update)$/i,
    });
    await user.click(reload);
    expect(applyUpdate).toHaveBeenCalledOnce();
  });

  it('falls back to a plain reload without a service worker', async () => {
    const reload = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload },
    });

    await clickCheck();

    await vi.waitFor(() => {
      expect(reload).toHaveBeenCalledOnce();
    });
  });

  it('surfaces a failed check instead of claiming the app is current', async () => {
    registerController({
      update: vi.fn(() => Promise.reject(new Error('offline'))),
    });

    await clickCheck();

    expect(
      await screen.findByText(/fehlgeschlagen|Update check failed/i),
    ).toBeInTheDocument();
  });
});
