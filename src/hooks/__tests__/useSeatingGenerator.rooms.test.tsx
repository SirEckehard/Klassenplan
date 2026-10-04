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
import { createMockClassroomScene, createMockStudent } from '@/__tests__/utils';
import type { ClassCollectionState, ClassroomTemplate } from '@/types';
import { subscribeToToasts, type ToastInstance } from '@/utils/ui/toast';
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

  /** A class with a saved plan "September" open in its first room. */
  const classWithPlan = async () => {
    const { current } = await renderGenerator();
    await createClassWithSeating(current);
    act(() => {
      current().actions.handleSaveSeatingPlan(
        'September',
        current().state.classroomScene,
      );
    });
    await waitFor(() => expect(current().state.planName).toBe('September'));
    return current;
  };

  it('opens a new room empty and the first one again as it was left', async () => {
    const current = await classWithPlan();
    const first = current().state;
    const firstRoomId = first.activeRoomId!;

    act(() => {
      current().actions.createRoom({ name: 'Labor' });
    });
    await waitFor(() => expect(current().state.rooms).toHaveLength(2));
    const lab = current().state;
    expect(lab.rooms.map((room) => room.name)).toEqual([
      expect.stringMatching(/Klassenraum|Classroom/),
      'Labor',
    ]);
    expect(lab.activeRoomId).not.toBe(firstRoomId);
    expect(lab.currentSeating).toEqual([]);
    expect(lab.activePlanId).toBeNull();
    expect(lab.planName).toBe('');

    act(() => {
      current().actions.openRoom(firstRoomId);
    });
    await waitFor(() => expect(current().state.activeRoomId).toBe(firstRoomId));
    const back = current().state;
    expect(back.currentSeating).toEqual(first.currentSeating);
    expect(back.classroomScene).toEqual(first.classroomScene);
    expect(back.activePlanId).toBe(first.activePlanId);
    expect(back.planName).toBe('September');
    // The undo history belonged to the room that was open.
    expect(back.canUndoSeating).toBe(false);
  });

  it('opens the room of a plan from another room, with the plan on screen', async () => {
    const current = await classWithPlan();
    const september = current().state.seatingHistory[0]!;

    act(() => {
      current().actions.createRoom({ name: 'Labor' });
    });
    await waitFor(() => expect(current().state.rooms).toHaveLength(2));

    act(() => current().actions.handleHistoryLoad(september));

    await waitFor(() =>
      expect(current().state.activeRoomId).toBe(september.roomId),
    );
    expect(current().state.activePlanId).toBe(september.id);
    expect(current().state.planName).toBe('September');
    // The lab parks what it had: nothing, and no plan.
    const lab = current().state.rooms.find((room) => room.name === 'Labor');
    expect(lab?.parked).toMatchObject({ seating: [], activePlanId: null });
  });

  it('loads a template as a room of its own and offers the way back', async () => {
    const toasts: ToastInstance[] = [];
    const unsubscribe = subscribeToToasts((event) => {
      if (event.action === 'add') toasts.push(event.toast);
    });
    const current = await classWithPlan();
    const classroomId = current().state.activeRoomId;
    const template: ClassroomTemplate = {
      id: 7,
      name: 'Chemie-Fachraum',
      scene: createMockClassroomScene(3),
    };

    act(() => {
      current().actions.createRoomFromTemplate(template);
    });
    await waitFor(() => expect(current().state.rooms).toHaveLength(2));
    expect(current().state.classroomScene.tables).toHaveLength(3);
    expect(current().state.rooms[1]?.name).toBe('Chemie-Fachraum');
    // The classroom keeps its plan, parked.
    expect(current().state.rooms[0]?.parked?.activePlanId).toBe(
      current().state.seatingHistory[0]?.id,
    );

    const message = toasts.find((toast) => toast.action);
    expect(message?.message).toMatch(/Chemie-Fachraum/);
    act(() => message?.action?.onClick());

    await waitFor(() => expect(current().state.activeRoomId).toBe(classroomId));
    expect(current().state.rooms).toHaveLength(1);
    expect(current().state.planName).toBe('September');
    unsubscribe();
  });

  it('refuses a mix that no longer fits the tables of its room', async () => {
    const current = await classWithPlan();
    const mix = {
      id: 1,
      timestamp: '2026-10-04T08:00:00.000Z',
      seating: [[null], [null], [null]],
      mixSettings: current().state.mixSettings,
      roomId: current().state.activeRoomId ?? undefined,
    };

    let loaded = true;
    act(() => {
      loaded = current().actions.handleMixLoad(mix);
    });

    expect(loaded).toBe(false);
    expect(current().state.currentSeating).toHaveLength(2);
  });
});
