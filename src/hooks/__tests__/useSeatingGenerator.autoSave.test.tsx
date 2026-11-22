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
  resetSeatingRepository,
  unmountAndSettle,
} from '@/__tests__/utils/resetSeatingRepository';
import { createMockClassroomScene, createMockStudent } from '@/__tests__/utils';
import {
  SeatingPlanGeneratorProvider,
  useSeatingPlanActions,
  useSeatingPlanState,
} from '@/contexts/SeatingPlanContext';
import { algorithmStore, useAlgorithmStore } from '@/stores/algorithmStore';

type Snapshot = {
  state: ReturnType<typeof useSeatingPlanState>;
  actions: ReturnType<typeof useSeatingPlanActions>;
  step: number;
};

/** Reads the generator the way the views do: through the store bridge. */
function Probe({ onRender }: { onRender: (snapshot: Snapshot) => void }) {
  onRender({
    state: useSeatingPlanState(),
    actions: useSeatingPlanActions(),
    step: useAlgorithmStore((store) => store.step),
  });
  return null;
}

/**
 * Leaving the plan layer with a plan nobody named writes it into the room's
 * auto-save slot. The name that save generated is no name the teacher chose,
 * so leaving again writes to the same slot instead of turning the auto-save
 * into a plan of its own.
 */
describe('useSeatingGenerator auto-save on leaving the plan layer', () => {
  beforeEach(async () => {
    memory.clear();
    vi.stubGlobal('indexedDB', {});
    await resetSeatingRepository();
  });

  afterEach(async () => {
    await unmountAndSettle();
    vi.unstubAllGlobals();
  });

  it('keeps one auto-save however often the plan layer is left', async () => {
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
    // Two double desks: a plan is a plan for the tables it stands on.
    act(() =>
      current().actions.updateClassroomScene(createMockClassroomScene(2)),
    );
    // The first seating after a class opens is what the tracker compares to.
    act(() =>
      current().actions.setCurrentSeating([
        [students[0]!, students[1]!],
        [students[2]!, students[3]!],
      ]),
    );
    await waitFor(() => expect(current().state.currentSeating).toHaveLength(2));

    const leaveWith = async (seating: (typeof students)[number][][]) => {
      act(() => algorithmStore.getState().setStep(3));
      await waitFor(() => expect(current().step).toBe(3));
      act(() => current().actions.setCurrentSeating(seating));
      await waitFor(() =>
        expect(current().state.hasUnsavedSeatingChanges).toBe(true),
      );
      await act(async () => {
        current().actions.handleStepChange(2);
      });
      await waitFor(() => expect(current().step).toBe(2));
    };

    await leaveWith([
      [students[1]!, students[0]!],
      [students[3]!, students[2]!],
    ]);
    await waitFor(() => expect(current().state.seatingHistory).toHaveLength(1));

    await leaveWith([
      [students[0]!, students[2]!],
      [students[1]!, students[3]!],
    ]);

    await waitFor(() =>
      expect(current().state.seatingHistory[0]?.seating[0]?.[1]?.id).toBe(
        's-2',
      ),
    );
    expect(current().state.seatingHistory).toHaveLength(1);
    expect(current().state.seatingHistory[0]?.autoSaved).toBe(true);
  });
  /** Mounts the generator as the app does on a page load. */
  const mountGenerator = (probe: { current: Snapshot | null }) =>
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

  /** A class of four on two double desks, its plan saved as "Deutsch". */
  const openClassWithSavedPlan = async (probe: {
    current: Snapshot | null;
  }) => {
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
      current().actions.updateClassroomScene(createMockClassroomScene(2)),
    );
    act(() =>
      current().actions.setCurrentSeating([
        [students[0]!, students[1]!],
        [students[2]!, students[3]!],
      ]),
    );
    act(() => algorithmStore.getState().setStep(3));
    await waitFor(() => expect(current().step).toBe(3));
    act(() => {
      current().actions.handleSaveSeatingPlan(
        'Deutsch',
        current().state.classroomScene,
      );
    });
    await waitFor(() => expect(current().state.seatingHistory).toHaveLength(1));
    return current;
  };

  const drawCircle = async (current: () => Snapshot) => {
    await act(async () => {
      await current().actions.generateCircleSeating();
    });
    await waitFor(() => expect(current().state.circleLayout).not.toBeNull());
    await waitFor(() =>
      expect(current().state.hasUnsavedSeatingChanges).toBe(true),
    );
  };

  it('saves the circle into the open plan on the way to "Bibliothek"', async () => {
    const probe: { current: Snapshot | null } = { current: null };
    mountGenerator(probe);
    const current = await openClassWithSavedPlan(probe);
    expect(current().state.seatingHistory[0]?.circleLayout).toBeUndefined();

    await drawCircle(current);
    // Back to the table plan first: the circle stays the plan's all the same.
    act(() => current().actions.setSeatingMode('table'));

    let go = false;
    await act(async () => {
      go = await current().actions.leavePlanLayer();
    });

    expect(go).toBe(true);
    const [plan] = current().state.seatingHistory;
    expect(plan?.name).toBe('Deutsch');
    expect(plan?.autoSaved).toBeUndefined();
    expect(plan?.circleLayout).toEqual(current().state.circleLayout);
    expect(current().state.seatingHistory).toHaveLength(1);
  });

  it('counts a circle drawn right after the class opens as a change', async () => {
    const probe: { current: Snapshot | null } = { current: null };
    const first = mountGenerator(probe);
    await openClassWithSavedPlan(probe);
    // The page loads anew: the class opens as it was stored.
    first.unmount();
    await new Promise((resolve) => setTimeout(resolve, 250));
    probe.current = null;
    mountGenerator(probe);
    await waitFor(() =>
      expect(probe.current?.state.currentSeating).toHaveLength(2),
    );
    const current = () => probe.current!;
    expect(current().state.hasUnsavedSeatingChanges).toBe(false);

    await drawCircle(current);
    await act(async () => {
      current().actions.handleStepChange(2);
    });
    await waitFor(() => expect(current().step).toBe(2));

    expect(current().state.seatingHistory[0]?.circleLayout).toEqual(
      current().state.circleLayout,
    );
  });
});
