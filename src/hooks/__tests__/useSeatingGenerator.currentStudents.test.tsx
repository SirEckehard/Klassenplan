// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { memory } = vi.hoisted(() => ({ memory: new Map<string, unknown>() }));

vi.mock('idb-keyval', async () =>
  (await import('@/__tests__/utils/memoryIdbKeyval')).createMemoryIdbKeyval(
    memory,
  ),
);

import '@/i18n';
import {
  createMockClassroomScene,
  createMockMixResult,
  createMockStudent,
} from '@/__tests__/utils';
import {
  resetSeatingRepository,
  unmountAndSettle,
} from '@/__tests__/utils/resetSeatingRepository';
import {
  SeatingPlanGeneratorProvider,
  useSeatingPlanActions,
  useSeatingPlanState,
} from '@/contexts/SeatingPlanContext';
import type { SeatingArrangement } from '@/types';

type Snapshot = {
  state: ReturnType<typeof useSeatingPlanState>;
  actions: ReturnType<typeof useSeatingPlanActions>;
};

function Probe({ onRender }: { onRender: (snapshot: Snapshot) => void }) {
  onRender({ state: useSeatingPlanState(), actions: useSeatingPlanActions() });
  return null;
}

const seatedNames = (seating: SeatingArrangement) =>
  seating.map((table) => table.map((student) => student?.name ?? null));

/**
 * A plan, an undo step or a mix brings back the seating as it was then; it
 * goes on screen as the class is now — a student renamed since under the new
 * name, one deleted not at all — and no lock stays where its student is not.
 */
describe('useSeatingGenerator puts back seating as the class is now', () => {
  beforeEach(async () => {
    memory.clear();
    vi.stubGlobal('indexedDB', {});
    await resetSeatingRepository();
  });

  afterEach(async () => {
    await unmountAndSettle();
    vi.unstubAllGlobals();
  });

  const students = [
    createMockStudent({ id: 'anna', name: 'Anna' }),
    createMockStudent({ id: 'ben', name: 'Ben' }),
    createMockStudent({ id: 'cem', name: 'Cem' }),
    createMockStudent({ id: 'dana', name: 'Dana' }),
  ];

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

    await act(() =>
      current().actions.createClass(
        { name: '7b', students },
        { activate: true },
      ),
    );
    await waitFor(() => expect(current().state.students).toHaveLength(4));
    await waitFor(() => expect(current().state.activeRoomId).not.toBeNull());
    act(() =>
      current().actions.updateClassroomScene(createMockClassroomScene(2)),
    );
    act(() =>
      current().actions.setCurrentSeating([
        [students[0], students[1]],
        [students[2], students[3]],
      ]),
    );
    await waitFor(() => expect(current().state.currentSeating).toHaveLength(2));
    return current;
  };

  // The locks as a save writes them into the plan.
  const savedLocks = async (current: () => Snapshot, name: string) => {
    act(() => {
      current().actions.handleSaveSeatingPlan(
        name,
        current().state.classroomScene,
      );
    });
    await waitFor(() =>
      expect(
        current().state.seatingHistory.some((plan) => plan.name === name),
      ).toBe(true),
    );
    return current().state.seatingHistory.find((plan) => plan.name === name)!
      .locks;
  };

  const renameAnnaAndDeleteBen = async (current: () => Snapshot) => {
    act(() => current().actions.updateStudent('anna', { name: 'Anne' }));
    act(() => current().actions.removeStudent('ben'));
    await waitFor(() => {
      const names = seatedNames(current().state.currentSeating).flat();
      expect(names).toContain('Anne');
      expect(names).not.toContain('Ben');
    });
  };

  it('opens a saved plan of the open room with the class as it is now', async () => {
    const current = await renderGenerator();
    act(() => {
      current().actions.handleSaveSeatingPlan(
        'September',
        current().state.classroomScene,
      );
    });
    await waitFor(() => expect(current().state.seatingHistory).toHaveLength(1));

    await renameAnnaAndDeleteBen(current);
    act(() =>
      current().actions.handleHistoryLoad(current().state.seatingHistory[0]),
    );

    await waitFor(() => expect(current().state.activePlanId).not.toBeNull());
    expect(seatedNames(current().state.currentSeating)).toEqual([
      ['Anne', null],
      ['Cem', 'Dana'],
    ]);
  });

  it('undoes a seating step with the class as it is now', async () => {
    const current = await renderGenerator();
    // A step of the plan's own history: an older mix where Anna and Cem
    // trade places.
    act(() => {
      current().actions.handleMixLoad(
        createMockMixResult({
          seating: [
            [students[2], students[1]],
            [students[0], students[3]],
          ],
        }),
      );
    });
    await waitFor(() => expect(current().state.canUndoSeating).toBe(true));

    await renameAnnaAndDeleteBen(current);
    act(() => current().actions.undoSeating());

    await waitFor(() =>
      expect(current().state.currentSeating[0][0]?.id).toBe('anna'),
    );
    expect(seatedNames(current().state.currentSeating)).toEqual([
      ['Anne', null],
      ['Cem', 'Dana'],
    ]);
  });

  it('lets a lock go when an opened mix seats its student elsewhere', async () => {
    const current = await renderGenerator();
    act(() => current().actions.toggleLock('anna', 0, 0));
    act(() => current().actions.toggleLock('dana', 1, 1));
    await waitFor(() =>
      expect(current().actions.isSeatLocked(0, 0)).toBe(true),
    );

    // In the older mix Anna sits where Cem sits now; Dana keeps her seat.
    const mix = createMockMixResult({
      seating: [
        [students[2], students[1]],
        [students[0], students[3]],
      ],
    });
    act(() => {
      expect(current().actions.handleMixLoad(mix)).toBe(true);
    });

    await waitFor(() =>
      expect(current().state.currentSeating[1][0]?.id).toBe('anna'),
    );
    expect(await savedLocks(current, 'Mischung')).toEqual({
      dana: { table: 1, seat: 1 },
    });
  });

  it('moves the locks to where their students sit after a room undo', async () => {
    const current = await renderGenerator();
    act(() => current().actions.toggleLock('dana', 1, 1));
    await waitFor(() =>
      expect(current().actions.isSeatLocked(1, 1)).toBe(true),
    );

    // Removing the first table shifts Dana's lock to table 0; the undo puts
    // the table and the seating back, and the lock follows Dana.
    act(() => current().actions.removeTables([0]));
    await waitFor(() =>
      expect(current().actions.isSeatLocked(0, 1)).toBe(true),
    );
    const restored = [
      [students[0], students[1]],
      [students[2], students[3]],
    ];
    act(() => {
      current().actions.setCurrentSeating(restored);
      current().actions.followLockedStudents(restored);
    });

    await waitFor(() =>
      expect(current().actions.isSeatLocked(1, 1)).toBe(true),
    );
    expect(await savedLocks(current, 'Raum')).toEqual({
      dana: { table: 1, seat: 1 },
    });
  });

  // K13: the swap's answer was set inside the state updater, which React runs
  // later while other updates are pending — the swap happened, was reported
  // as refused, and left no undo step.
  it('reports a swap made while other updates are pending, and records it', async () => {
    const current = await renderGenerator();

    let moved = false;
    act(() => {
      current().actions.setCurrentSeating((seating) => seating);
      moved = current().actions.moveStudent(0, 0, 1, 0);
    });

    expect(moved).toBe(true);
    await waitFor(() =>
      expect(current().state.currentSeating[0][0]?.id).toBe('cem'),
    );
    expect(current().state.canUndoSeating).toBe(true);
  });

  it('still refuses a swap off a locked seat', async () => {
    const current = await renderGenerator();
    act(() => current().actions.toggleLock('anna', 0, 0));
    await waitFor(() =>
      expect(current().actions.isSeatLocked(0, 0)).toBe(true),
    );
    const undoable = current().state.canUndoSeating;

    let moved = true;
    act(() => {
      moved = current().actions.moveStudent(0, 0, 1, 0);
    });

    expect(moved).toBe(false);
    expect(current().state.currentSeating[0][0]?.id).toBe('anna');
    expect(current().state.canUndoSeating).toBe(undoable);
  });
});
