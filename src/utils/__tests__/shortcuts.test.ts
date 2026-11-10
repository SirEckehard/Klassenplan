// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, expect, it } from 'vitest';
import { shortcutSectionsFor } from '../shortcuts';

describe('shortcutSectionsFor', () => {
  it('leads every workspace screen with the keys all of them share', () => {
    expect(shortcutSectionsFor(['plan'])).toEqual(['global', 'plan']);
    expect(shortcutSectionsFor(['global', 'library'])).toEqual([
      'global',
      'library',
    ]);
  });

  it('lists the projection’s keys alone, since it has no layers or toolbar', () => {
    expect(shortcutSectionsFor(['present'])).toEqual(['present']);
  });

  it('lists nothing for a screen without keys', () => {
    expect(shortcutSectionsFor(undefined)).toEqual([]);
    expect(shortcutSectionsFor([])).toEqual([]);
  });
});
