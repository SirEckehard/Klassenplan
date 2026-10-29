// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { memory } = vi.hoisted(() => ({ memory: new Map<string, unknown>() }));

vi.mock('idb-keyval', async () =>
  (await import('@/__tests__/utils/memoryIdbKeyval')).createMemoryIdbKeyval(
    memory,
  ),
);

import '@/i18n';
import { createMockStudent } from '@/__tests__/utils';
import { resetSeatingRepository } from '@/__tests__/utils/resetSeatingRepository';
import {
  SeatingPlanGeneratorProvider,
  useSeatingPlanActions,
  useSeatingPlanState,
} from '@/contexts/SeatingPlanContext';
import type { ClassroomScene } from '@/types';
import { usePlanSaveState } from '../usePlanSaveState';

type Snapshot = {
  state: ReturnType<typeof useSeatingPlanState>;
  actions: ReturnType<typeof useSeatingPlanActions>;
  save: ReturnType<typeof usePlanSaveState>;
};

function Probe({ onRender }: { onRender: (snapshot: Snapshot) => void }) {
  onRender({
    state: useSeatingPlanState(),
    actions: useSeatingPlanActions(),
    save: usePlanSaveState(),
  });
  return null;
}

/**
 * The exits save a plan only when it differs from the saved one, and the
 * inspector says whether it does. A lock is part of the plan: one set after
 * saving that went unnoticed was gone the next time the plan opened.
 */
describe('usePlanSaveState', () => {
  beforeEach(async () => {
    memory.clear();
    vi.stubGlobal('indexedDB', {});
    await resetSeatingRepository();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('counts a lock set on the saved plan as a change to save', async () => {
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

    const students = ['Anna', 'Ben'].map((name, index) =>
      createMockStudent({ id: `s-${index}`, name }),
    );
    await act(() =>
      current().actions.createClass(
        { name: '7a', students },
        { activate: true },
      ),
    );
    await waitFor(() => expect(current().state.students).toHaveLength(2));

    const scene: ClassroomScene = {
      ...current().state.classroomScene,
      tables: [
        {
          x: 100,
          y: 100,
          width: 120,
          height: 60,
          rotation: 0,
          seatCount: 2,
          locked: false,
          zIndex: 0,
          templateType: 'double',
        },
      ],
    };
    act(() => {
      current().actions.updateClassroomScene(scene);
      current().actions.setCurrentSeating([[students[0]!, students[1]!]]);
    });
    act(() => {
      current().actions.handleSaveSeatingPlan(
        'Deutsch',
        current().state.classroomScene,
      );
    });
    await waitFor(() => expect(current().state.activePlanId).not.toBeNull());
    expect(current().save.hasUnsavedChanges()).toBe(false);

    act(() => {
      current().actions.toggleLock('s-0', 0, 0);
    });
    await waitFor(() =>
      expect(current().actions.isSeatLocked(0, 0)).toBe(true),
    );

    expect(current().save.hasUnsavedChanges()).toBe(true);
  });
});
