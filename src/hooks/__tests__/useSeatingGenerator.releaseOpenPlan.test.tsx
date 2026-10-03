// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { memory } = vi.hoisted(() => ({ memory: new Map<string, unknown>() }));

vi.mock('idb-keyval', () => {
  type Store = { name: string } | undefined;
  const prefix = (store: Store) => `${store?.name ?? 'default'}::`;
  const toKey = (key: IDBValidKey, store: Store) =>
    `${prefix(store)}${String(key)}`;
  const own = (store: Store) =>
    [...memory.entries()].filter(([key]) => key.startsWith(prefix(store)));
  return {
    createStore: vi.fn((db: string, name: string) => ({
      name: `${db}/${name}`,
    })),
    get: vi.fn(async (key: IDBValidKey, store?: Store) => {
      const value = memory.get(toKey(key, store));
      return value === undefined ? undefined : structuredClone(value);
    }),
    set: vi.fn(async (key: IDBValidKey, value: unknown, store?: Store) => {
      memory.set(toKey(key, store), structuredClone(value));
    }),
    del: vi.fn(async (key: IDBValidKey, store?: Store) => {
      memory.delete(toKey(key, store));
    }),
    keys: vi.fn(async (store?: Store) =>
      own(store).map(([key]) => key.slice(prefix(store).length)),
    ),
    entries: vi.fn(async (store?: Store) =>
      own(store).map(([key, value]) => [
        key.slice(prefix(store).length),
        value,
      ]),
    ),
    clear: vi.fn(async (store?: Store) => {
      own(store).forEach(([key]) => memory.delete(key));
    }),
  };
});

import '@/i18n';
import { createMockStudent } from '@/__tests__/utils';
import {
  SeatingPlanGeneratorProvider,
  useSeatingPlanActions,
  useSeatingPlanState,
} from '@/contexts/SeatingPlanContext';

type Snapshot = {
  state: ReturnType<typeof useSeatingPlanState>;
  actions: ReturnType<typeof useSeatingPlanActions>;
};

/** Reads the generator the way the views do: through the store bridge. */
function Probe({ onRender }: { onRender: (snapshot: Snapshot) => void }) {
  onRender({ state: useSeatingPlanState(), actions: useSeatingPlanActions() });
  return null;
}

/**
 * The same class in a lab is another plan. Loading a room template or setting
 * the room up anew lets go of the open plan, so the save before export or
 * present cannot write the lab over the plan for the home room.
 */
describe('useSeatingGenerator releaseOpenPlan', () => {
  beforeEach(() => {
    memory.clear();
    vi.stubGlobal('indexedDB', {});
    return () => vi.unstubAllGlobals();
  });

  const renderGenerator = async () => {
    const probe: { current: Snapshot | null } = { current: null };
    render(
      <MemoryRouter>
        <SeatingPlanGeneratorProvider>
          <Probe
            onRender={(snapshot) => {
              probe.current = snapshot;
            }}
          />
        </SeatingPlanGeneratorProvider>
      </MemoryRouter>,
    );
    await waitFor(() => expect(probe.current).not.toBeNull());
    const current = () => probe.current!;

    const students = Array.from({ length: 4 }, (_, index) =>
      createMockStudent({ id: `s-${index}`, name: `Kind ${index}` }),
    );
    await act(() =>
      current().actions.createClass(
        { name: '7b', students },
        { activate: true },
      ),
    );
    await waitFor(() => expect(current().state.students).toHaveLength(4));
    act(() =>
      current().actions.setCurrentSeating([
        [students[0], students[1]],
        [students[2], students[3]],
      ]),
    );
    await waitFor(() => expect(current().state.currentSeating).toHaveLength(2));
    return current;
  };

  it('lets go of the open plan, name and all', async () => {
    const current = await renderGenerator();

    act(() => {
      current().actions.handleSaveSeatingPlan(
        '7b Klassenraum',
        current().state.classroomScene,
      );
    });
    await waitFor(() => expect(current().state.activePlanId).not.toBeNull());

    act(() => current().actions.releaseOpenPlan());

    await waitFor(() => expect(current().state.activePlanId).toBeNull());
    expect(current().state.planName).toBe('');
    // The plan itself stays as it was saved.
    expect(current().state.seatingHistory.map((plan) => plan.name)).toEqual([
      '7b Klassenraum',
    ]);
  });

  it('keeps the save before export from overwriting the plan it let go of', async () => {
    const current = await renderGenerator();

    act(() => {
      current().actions.handleSaveSeatingPlan(
        '7b Klassenraum',
        current().state.classroomScene,
      );
    });
    await waitFor(() => expect(current().state.activePlanId).not.toBeNull());

    act(() => current().actions.releaseOpenPlan());
    await waitFor(() => expect(current().state.planName).toBe(''));

    // What the save before export does with the name the plan now has.
    act(() => {
      current().actions.handleSaveSeatingPlan(
        current().state.planName,
        current().state.classroomScene,
      );
    });
    await waitFor(() => expect(current().state.seatingHistory).toHaveLength(2));
    expect(
      current().state.seatingHistory.filter(
        (plan) => plan.name === '7b Klassenraum',
      ),
    ).toHaveLength(1);
  });

  it('does nothing while no plan is open', async () => {
    const current = await renderGenerator();
    act(() => current().actions.setPlanName('Entwurf'));
    await waitFor(() => expect(current().state.planName).toBe('Entwurf'));

    act(() => current().actions.releaseOpenPlan());

    expect(current().state.planName).toBe('Entwurf');
    expect(current().state.activePlanId).toBeNull();
  });
});
