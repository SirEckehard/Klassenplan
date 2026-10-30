// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, it, expect } from 'vitest';
import {
  BOARD_WIDTH,
  CLASSROOM_HEIGHT,
  CLASSROOM_WIDTH,
  getTablePresets,
  TABLE_PRESETS,
} from '../../utils/constants';

describe('table templates', () => {
  it('builds every template from seats of 55 × 65', () => {
    expect(getTablePresets()).toEqual(TABLE_PRESETS);
    expect(TABLE_PRESETS).toEqual({
      single: { seatCount: 1, width: 55, height: 65 },
      double: { seatCount: 2, width: 55, height: 130 },
      group4: { seatCount: 4, width: 110, height: 130 },
      group6: { seatCount: 6, width: 165, height: 130 },
    });
  });

  it('fits every template into the room beside the board', () => {
    for (const preset of Object.values(TABLE_PRESETS)) {
      expect(preset.width).toBeLessThan(CLASSROOM_WIDTH - BOARD_WIDTH);
      expect(preset.height).toBeLessThan(CLASSROOM_HEIGHT);
    }
  });
});
