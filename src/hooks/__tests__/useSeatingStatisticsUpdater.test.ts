// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * The fulfilment is computed by the provider around every page, but its module
 * loads with the plan layer, not with the app (`scripts/check-bundle.mjs`).
 * The tests share the module's cache, so they run in order: nothing loaded
 * while disabled, then the first computation after the load.
 */
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { SeatingArrangement } from '@/types';
import { createMockClassroomScene, createMockStudent } from '@/__tests__/utils';
import { neutralSettings, normalizeMixSettings } from '@/utils';
import {
  seatingStatistics,
  useSeatingStatisticsUpdater,
} from '../useSeatingStatisticsUpdater';

const ada = createMockStudent({ id: 'ada', name: 'Ada' });
const ben = createMockStudent({ id: 'ben', name: 'Ben' });
const seating: SeatingArrangement = [[ada, ben]];
const settings = normalizeMixSettings(
  { avoidRestlessTogether: 5 },
  neutralSettings,
);

const renderUpdater = (enabled: boolean) => {
  const setLastStatistics = vi.fn();
  renderHook(() =>
    useSeatingStatisticsUpdater({
      currentSeating: seating,
      students: [ada, ben],
      mixSettings: settings,
      seatingHistory: [],
      planUsage: [],
      classroomScene: createMockClassroomScene(1),
      setLastStatistics,
      enabled,
    }),
  );
  return setLastStatistics;
};

describe('useSeatingStatisticsUpdater', () => {
  it('loads nothing away from the plan layer', () => {
    const setLastStatistics = renderUpdater(false);

    expect(seatingStatistics.get()).toBeNull();
    expect(setLastStatistics).not.toHaveBeenCalled();
  });

  it('computes the fulfilment once the module has loaded', async () => {
    const setLastStatistics = renderUpdater(true);

    expect(setLastStatistics).toHaveBeenNthCalledWith(1, null);
    await waitFor(() =>
      expect(setLastStatistics).toHaveBeenLastCalledWith(expect.any(Array)),
    );
    expect(seatingStatistics.get()).not.toBeNull();
  });

  it('computes at once while the module is at hand', () => {
    const setLastStatistics = renderUpdater(true);

    expect(setLastStatistics).toHaveBeenCalledTimes(1);
    expect(setLastStatistics).toHaveBeenCalledWith(expect.any(Array));
  });
});
