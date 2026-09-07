// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
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
  it('confirms the current version when nothing new is deployed', async () => {
    registerController({});

    await clickCheck();

    expect(
      await screen.findByText(/neueste Version|latest version/i),
    ).toBeInTheDocument();
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
