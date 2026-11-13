// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/ui/dialogs', () => ({
  confirmDialog: vi.fn().mockResolvedValue(true),
}));

import '@/i18n';
import { createMockClassroomScene } from '@/__tests__/utils';
import { confirmDialog } from '@/services/ui/dialogs';
import { confirmSharedFile } from '@/services/ui/sharedFileDialog';
import { fullRecipeWeights } from '@/utils';

const confirmMock = vi.mocked(confirmDialog);

const askedWith = () => confirmMock.mock.calls[0]?.[0];

beforeEach(() => {
  confirmMock.mockClear();
});

describe('confirmSharedFile', () => {
  it('names a template under the name it will get, with its tables and seats', async () => {
    const scene = createMockClassroomScene();
    const seats = scene.tables.reduce((sum, table) => sum + table.seatCount, 0);

    await expect(
      confirmSharedFile(
        { kind: 'template', name: 'Raum 204', scene },
        'Raum 204 (2)',
      ),
    ).resolves.toBe(true);

    expect(askedWith()).toMatchObject({
      title: expect.stringContaining('Raum 204 (2)'),
      tone: 'primary',
      facts: [{ count: scene.tables.length }, { count: seats }],
    });
  });

  it('counts a preset’s criteria by level', async () => {
    await confirmSharedFile(
      {
        kind: 'preset',
        name: 'Ruhig',
        weights: fullRecipeWeights({
          avoidRestlessTogether: 10,
          preferGenderMix: 5,
          preferWindowSeats: 2,
          preferDoorSeats: 2,
        }),
      },
      'Ruhig',
    );

    expect(askedWith()?.facts?.map((fact) => fact.count)).toEqual([1, 1, 2]);
  });
});
