// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, expect, it } from 'vitest';
import { buildDropConfirmLookup, getSeatHighlight } from '@/utils';

describe('buildDropConfirmLookup', () => {
  it('marks the seats a student moved between with the confirm tone', () => {
    const lookup = buildDropConfirmLookup([
      { tableIndex: 2, seatIndex: 1 },
      { tableIndex: 0, seatIndex: 0 },
    ]);
    expect(getSeatHighlight(lookup, 2, 1)).toMatchObject({
      tone: 'confirm',
      mode: 'persistent',
    });
    expect(getSeatHighlight(lookup, 0, 0)?.tone).toBe('confirm');
    expect(getSeatHighlight(lookup, 1, 0)).toBeUndefined();
    expect(buildDropConfirmLookup([])).toBeNull();
  });
});
