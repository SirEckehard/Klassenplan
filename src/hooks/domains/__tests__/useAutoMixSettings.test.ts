// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * A criterion weighs once the class has data for it and stops when the data
 * is gone (decision 0016) — here for the free seat beside and the
 * left-handers (decision 0043).
 */
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { MixSettings, Student } from '@/types';
import { DEFAULT_MIX_WEIGHTS, neutralSettings } from '@/utils';
import { createMockStudent } from '@/__tests__/utils';
import { useAutoMixSettings } from '../useAutoMixSettings';

/** The settings after every update the hook asked for. */
const applied = (
  setMixSettings: ReturnType<typeof vi.fn>,
  start: MixSettings,
): MixSettings =>
  setMixSettings.mock.calls.reduce<MixSettings>(
    (settings, [update]) =>
      typeof update === 'function' ? update(settings) : update,
    start,
  );

const renderWith = (students: Student[], settings: MixSettings) => {
  const setMixSettings = vi.fn();
  const view = renderHook(
    ({ list }) => useAutoMixSettings(list, settings, setMixSettings, 'class'),
    { initialProps: { list: students } },
  );
  return { setMixSettings, rerender: view.rerender };
};

describe('useAutoMixSettings', () => {
  const plain = [
    createMockStudent({ id: 'a' }),
    createMockStudent({ id: 'b' }),
  ];

  it.each([
    ['needsFreeNeighbourSeat', 'keepNeighbourSeatFree'],
    ['leftHanded', 'seatLeftHandersLeft'],
  ] as const)('weighs %s once a student carries it', (marker, criterion) => {
    const { setMixSettings, rerender } = renderWith(plain, neutralSettings);

    rerender({ list: [{ ...plain[0]!, [marker]: true }, plain[1]!] });

    expect(applied(setMixSettings, neutralSettings)[criterion]).toBe(
      DEFAULT_MIX_WEIGHTS[criterion],
    );
  });

  it.each([['keepNeighbourSeatFree'], ['seatLeftHandersLeft']] as const)(
    'clears %s while nobody carries the marker',
    (criterion) => {
      const start = { ...neutralSettings, [criterion]: 8 };
      const { setMixSettings } = renderWith(plain, start);

      expect(applied(setMixSettings, start)[criterion]).toBe(0);
    },
  );
});
