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

type Snapshot = {
  state: ReturnType<typeof useSeatingPlanState>;
  actions: ReturnType<typeof useSeatingPlanActions>;
};

function Probe({ onRender }: { onRender: (snapshot: Snapshot) => void }) {
  onRender({ state: useSeatingPlanState(), actions: useSeatingPlanActions() });
  return null;
}

/**
 * "Bibliothek" makes or deletes a class beside the open one, which reads the
 * open class back. Nothing in it changed, so what is not stored with it — the
 * name typed for a plan never saved, the notice that the class list changed
 * since the last mix — stays on screen.
 */
describe('reading the open class back', () => {
  beforeEach(async () => {
    memory.clear();
    vi.stubGlobal('indexedDB', {});
    await resetSeatingRepository();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('keeps the plan name and the class-changed notice', async () => {
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

    act(() => {
      current().actions.addStudent('Cem', 'boy');
      current().actions.setPlanName('Deutsch');
    });
    await waitFor(() =>
      expect(current().state.hasPendingStudentUpdates).toBe(true),
    );

    await act(() =>
      current().actions.createClass({ name: '8b' }, { activate: false }),
    );
    await waitFor(() => expect(current().state.classSummaries).toHaveLength(2));

    expect(current().state.planName).toBe('Deutsch');
    expect(current().state.hasPendingStudentUpdates).toBe(true);
  });
});
