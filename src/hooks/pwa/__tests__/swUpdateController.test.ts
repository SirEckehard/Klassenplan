// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  applyPendingUpdate,
  checkForUpdate,
  getUpdateController,
  setUpdateController,
} from '../swUpdateController';

interface FakeRegistration {
  installing: ServiceWorker | null;
  waiting: ServiceWorker | null;
  update: ReturnType<typeof vi.fn>;
}

const worker = {} as ServiceWorker;

/**
 * The browser sets `registration.installing` before update() resolves, so the
 * fake mirrors that ordering rather than resolving with a result value.
 */
const createRegistration = (
  onUpdate?: (registration: FakeRegistration) => void,
): FakeRegistration => {
  const registration: FakeRegistration = {
    installing: null,
    waiting: null,
    update: vi.fn(async () => {
      onUpdate?.(registration);
    }),
  };
  return registration;
};

const register = (registration: FakeRegistration, applyUpdate = vi.fn()) => {
  setUpdateController({
    registration: registration as unknown as ServiceWorkerRegistration,
    applyUpdate,
  });
  return applyUpdate;
};

afterEach(() => {
  setUpdateController(null);
});

describe('checkForUpdate', () => {
  it('reports unavailable while no service worker owns the page', async () => {
    await expect(checkForUpdate()).resolves.toBe('unavailable');
  });

  it('reports up-to-date when the fetched worker is unchanged', async () => {
    const registration = createRegistration();
    register(registration);

    await expect(checkForUpdate()).resolves.toBe('up-to-date');
    expect(registration.update).toHaveBeenCalledOnce();
  });

  it('reports update-ready once a new worker starts installing', async () => {
    const registration = createRegistration((r) => {
      r.installing = worker;
    });
    register(registration);

    await expect(checkForUpdate()).resolves.toBe('update-ready');
  });

  it('reports update-ready for an already waiting worker without re-fetching', async () => {
    const registration = createRegistration();
    registration.waiting = worker;
    register(registration);

    await expect(checkForUpdate()).resolves.toBe('update-ready');
    // Re-fetching would compare identical bytes and hide the pending update.
    expect(registration.update).not.toHaveBeenCalled();
  });

  it('propagates a failing update check', async () => {
    const registration = createRegistration();
    registration.update.mockRejectedValue(new Error('offline'));
    register(registration);

    await expect(checkForUpdate()).rejects.toThrow('offline');
  });
});

describe('update controller registry', () => {
  it('hands out the registration and applies the pending update', () => {
    const registration = createRegistration();
    const applyUpdate = register(registration);

    expect(getUpdateController()?.registration).toBe(registration);
    applyPendingUpdate();
    expect(applyUpdate).toHaveBeenCalledOnce();
  });

  it('ignores an apply request while nothing is registered', () => {
    expect(() => applyPendingUpdate()).not.toThrow();
  });
});
