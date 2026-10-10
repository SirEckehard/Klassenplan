// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { render, waitFor } from '@testing-library/react';
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
import {
  SeatingPlanGeneratorProvider,
  useSeatingPlanActions,
  useSeatingPlanState,
} from '@/contexts/SeatingPlanContext';

type ActEnvironment = { IS_REACT_ACT_ENVIRONMENT?: boolean };

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
 * A class switch loads the new class's data and its id together. Students and
 * room live in Zustand stores, seating and class id in React state; applying
 * them in a transition let the stores arrive first, and the seating sync that
 * followed re-rendered without end — the tab froze on the old class.
 *
 * It only shows with the real provider (the store bridge re-renders every
 * consumer) and without the act environment, whose `act` flushes every
 * priority at once and hides exactly that split.
 */
describe('useSeatingGenerator class switch', () => {
  beforeEach(() => {
    memory.clear();
    vi.stubGlobal('indexedDB', {});
    (globalThis as ActEnvironment).IS_REACT_ACT_ENVIRONMENT = false;
  });

  afterEach(() => {
    (globalThis as ActEnvironment).IS_REACT_ACT_ENVIRONMENT = true;
    vi.unstubAllGlobals();
  });

  it('lands on the chosen class when the open one has a seating plan', async () => {
    const probe: { current: Snapshot | null; renders: number } = {
      current: null,
      renders: 0,
    };
    render(
      <MemoryRouter>
        <SeatingPlanGeneratorProvider>
          <Probe
            onRender={(snapshot) => {
              probe.current = snapshot;
              probe.renders += 1;
            }}
          />
        </SeatingPlanGeneratorProvider>
      </MemoryRouter>,
    );
    const current = () => probe.current!;
    await waitFor(() => expect(probe.current).not.toBeNull());

    const students = Array.from({ length: 4 }, (_, index) =>
      createMockStudent({ id: `a-${index}`, name: `A ${index}` }),
    );
    await current().actions.createClass(
      { name: 'A', students },
      { activate: true },
    );
    await current().actions.createClass({ name: 'B' }, { activate: false });
    await waitFor(() => expect(current().state.classSummaries).toHaveLength(2));

    current().actions.setCurrentSeating([
      [students[0], students[1]],
      [students[2], students[3]],
    ]);
    await waitFor(() => expect(current().state.currentSeating).toHaveLength(2));

    const target = current().state.classSummaries.find(
      (entry) => entry.name === 'B',
    );
    const rendersBeforeSwitch = probe.renders;
    await current().actions.selectClass(target!.id);

    await waitFor(() => expect(current().state.activeClass.name).toBe('B'), {
      timeout: 1500,
    });
    expect(current().state.students).toEqual([]);
    expect(current().state.currentSeating).toEqual([]);
    // A switch settles in a few dozen renders; the loop ran thousands.
    expect(probe.renders - rendersBeforeSwitch).toBeLessThan(100);
  });
});
