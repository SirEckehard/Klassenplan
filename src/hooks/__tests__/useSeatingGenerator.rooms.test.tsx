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
import type { ClassCollectionState } from '@/types';
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
 * A class keeps the rooms its plans were made in (decision 0024). From the
 * first moment a class has one, and what is saved or mixed notes it.
 */
const storedCollection = () =>
  [...memory.entries()].find(([key]) =>
    key.endsWith('::spg.classCollection'),
  )?.[1] as ClassCollectionState | undefined;

describe('useSeatingGenerator rooms', () => {
  beforeEach(() => {
    memory.clear();
    vi.stubGlobal('indexedDB', {});
    return () => vi.unstubAllGlobals();
  });

  const renderGenerator = async () => {
    const probe: { current: Snapshot | null } = { current: null };
    const view = render(
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
    return { current: () => probe.current!, unmount: view.unmount };
  };

  const createClassWithSeating = async (current: () => Snapshot) => {
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
  };

  it('opens a new class in a room of its own', async () => {
    const { current } = await renderGenerator();

    await createClassWithSeating(current);

    const { rooms, activeRoomId } = current().state;
    expect(rooms).toHaveLength(1);
    expect(rooms[0]?.name).toMatch(/Klassenraum|Classroom/);
    expect(activeRoomId).toBe(rooms[0]?.id);
  });

  it('notes the open room on a saved plan and keeps it over a reload', async () => {
    const first = await renderGenerator();
    await createClassWithSeating(first.current);
    const roomId = first.current().state.activeRoomId;

    act(() => {
      first
        .current()
        .actions.handleSaveSeatingPlan(
          'September',
          first.current().state.classroomScene,
        );
    });
    await waitFor(() =>
      expect(first.current().state.seatingHistory).toHaveLength(1),
    );
    expect(first.current().state.seatingHistory[0]?.roomId).toBe(roomId);

    // The save reaches storage through the persist queue.
    await waitFor(() => {
      const stored = storedCollection();
      expect(stored?.classes[0]?.seatingHistory[0]?.roomId).toBe(roomId);
      expect(stored?.classes[0]?.activeRoomId).toBe(roomId);
    });
    first.unmount();

    const second = await renderGenerator();
    await waitFor(() =>
      expect(second.current().state.seatingHistory).toHaveLength(1),
    );
    expect(second.current().state.activeRoomId).toBe(roomId);
    expect(second.current().state.seatingHistory[0]?.roomId).toBe(roomId);
  });
});
