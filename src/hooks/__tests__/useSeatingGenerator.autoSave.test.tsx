// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { memory } = vi.hoisted(() => ({ memory: new Map<string, unknown>() }));

vi.mock('idb-keyval', async () =>
  (await import('@/__tests__/utils/memoryIdbKeyval')).createMemoryIdbKeyval(
    memory,
  ),
);

import '@/i18n';
import { createMockStudent } from '@/__tests__/utils';
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
  beforeEach(() => {
    memory.clear();
    vi.stubGlobal('indexedDB', {});
    return () => vi.unstubAllGlobals();
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
});
