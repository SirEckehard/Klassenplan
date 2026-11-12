// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Writes `e2e/fixtures/sheets.klassenplan`, the class the export sheet
 * snapshots print (`e2e/export-sheets.spec.ts`): the sample class as "7b",
 * mixed with a fixed seed, its plan saved as "Herbst", a seating circle, a
 * note and two photos — enough for every sheet to show what it can show.
 *
 * A mix in the app is random, so the snapshots read this file instead of a
 * class built through the interface. The backup goes through the app's own
 * export and encryption (`exportAllAsJson`, `useDataBackup`), and the spec
 * restores it through the app's own import. Backups stay importable across
 * versions, so the file rarely needs writing again; when it does, every
 * snapshot changes with it:
 *
 *   WRITE_SHEET_FIXTURE=1 npx vitest run sheetsFixture
 *   npm run test:visual:update
 */
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { deflateSync } from 'node:zlib';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { memory, photos } = vi.hoisted(() => ({
  memory: new Map<string, unknown>(),
  photos: new Map<string, Blob>(),
}));

vi.mock('idb-keyval', async () =>
  (await import('@/__tests__/utils/memoryIdbKeyval')).createMemoryIdbKeyval(
    memory,
  ),
);
vi.mock('@/repositories/studentPhotoStore', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('@/repositories/studentPhotoStore')
  >()),
  getAllPhotos: async () => ({ success: true as const, data: photos }),
}));
vi.mock('@/services/ui/backupDialogs', () => ({
  promptBackupPassword: async () => SHEETS_FIXTURE_PASSWORD,
  promptBackupRestoreMode: async () => 'replace',
}));

import '@/i18n';
import * as utilsModule from '@/utils';
import { DEFAULT_MIX_WEIGHTS, MIX_CRITERIA_VERSION } from '@/utils';
import type { MixSettings, SavedPlan } from '@/types';
import useDataBackup from '@/hooks/useDataBackup';
import { exportAllAsJson } from '@/services/backup/dataBackup';
import {
  buildDemoClassroomScene,
  buildDemoStudents,
} from '@/utils/demo/demoClass';
import {
  createClassCollection,
  createClassRecord,
} from '@/utils/data/classCollection';
import { runMixSession } from '@/utils/algorithm/seatingAlgorithm';
import { generateOptimizedCircleLayout } from '@/utils/algorithm/CircleSeatingAlgorithm';
import { createRng } from '@/utils/algorithm/rng';

/** The password the spec types; it guards invented data only. */
const SHEETS_FIXTURE_PASSWORD = 'klassenplan-e2e';
const SEED = 2026;
const OUTPUT = path.resolve(
  __dirname,
  '../../../e2e/fixtures/sheets.klassenplan',
);

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return c >>> 0;
});

const crc32 = (bytes: Uint8Array): number => {
  let c = 0xffffffff;
  for (const byte of bytes) c = CRC_TABLE[(c ^ byte) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

const pngChunk = (type: string, data: Uint8Array): Uint8Array<ArrayBuffer> => {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  out.set(new TextEncoder().encode(type), 4);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
};

type Rgb = readonly [number, number, number];

/**
 * A portrait drawn without a canvas, which jsdom lacks: a head and shoulders
 * on a coloured ground, as a PNG.
 */
function portrait(background: Rgb, figure: Rgb): Blob {
  const size = 96;
  const raw = new Uint8Array(size * (size * 3 + 1));
  for (let y = 0; y < size; y += 1) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x += 1) {
      const head = (x - 48) ** 2 + (y - 38) ** 2 < 18 ** 2;
      const shoulders = (x - 48) ** 2 / 34 ** 2 + (y - 98) ** 2 / 36 ** 2 < 1;
      const [r, g, b] = head || shoulders ? figure : background;
      const offset = y * (size * 3 + 1) + 1 + x * 3;
      raw[offset] = r;
      raw[offset + 1] = g;
      raw[offset + 2] = b;
    }
  }
  const header = new Uint8Array(13);
  const view = new DataView(header.buffer);
  view.setUint32(0, size);
  view.setUint32(4, size);
  header.set([8, 2, 0, 0, 0], 8);
  const bytes: Uint8Array<ArrayBuffer>[] = [
    new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', new Uint8Array(deflateSync(raw))),
    pngChunk('IEND', new Uint8Array(0)),
  ];
  return new Blob(bytes, { type: 'image/png' });
}

describe.skipIf(!process.env.WRITE_SHEET_FIXTURE)('sheets fixture', () => {
  it('writes the class the export sheet snapshots print', async () => {
    let next = 0;
    const students = buildDemoStudents(
      'de',
      () => `student-${String(++next).padStart(2, '0')}`,
    ).map((student, index) =>
      index < 2 ? { ...student, hasPhoto: true } : student,
    );
    photos.set(students[0]!.id, portrait([214, 228, 240], [62, 92, 128]));
    photos.set(students[1]!.id, portrait([240, 226, 210], [150, 92, 60]));

    const scene = buildDemoClassroomScene(students.length);
    const mixSettings: MixSettings = {
      ...DEFAULT_MIX_WEIGHTS,
      criteriaVersion: MIX_CRITERIA_VERSION,
    };
    const seating = runMixSession(students, [], {}, mixSettings, scene, {
      rng: createRng(SEED),
      refine: true,
    });
    const circle = generateOptimizedCircleLayout(
      students,
      scene,
      mixSettings,
      [],
      seating,
      createRng(SEED),
    );
    const plan: SavedPlan = {
      id: 'plan-herbst',
      name: 'Herbst',
      date: '2026-09-14',
      seating,
      scene,
      circleLayout: circle,
    };
    const created = createClassRecord({
      id: 'class-7b',
      name: '7b',
      label: '2026/27',
      notes: 'Elternabend am 24. September, 19 Uhr',
      createdAt: '2026-09-01T07:30:00.000Z',
      updatedAt: '2026-09-14T07:30:00.000Z',
      lastUsedAt: '2026-09-14T07:30:00.000Z',
      students,
      seatingHistory: [plan],
      currentSeating: seating,
      classroomScene: scene,
      circleLayout: circle,
      mixSettings,
    });
    const record = { ...created, activePlanId: plan.id };

    const json = await exportAllAsJson(
      {
        students,
        seatingHistory: record.seatingHistory,
        mixHistory: [],
        classroomScene: scene,
        mixSettings,
        lockedPositions: {},
        currentCircleLayout: circle,
        classCollection: createClassCollection(record),
      },
      async () => [],
    );

    vi.spyOn(utilsModule, 'isWebCryptoAvailable').mockReturnValue(true);
    const download = vi
      .spyOn(utilsModule, 'downloadBlob')
      .mockResolvedValue(true);
    const { result } = renderHook(() =>
      useDataBackup({
        exportAllAsJson: async () => json,
        importAllFromJson: async () => ({ merge: false }),
      }),
    );
    await act(async () => {
      await result.current.handleExportAll();
    });

    const [payload] = download.mock.calls[0]!;
    expect(typeof payload).toBe('string');
    writeFileSync(OUTPUT, payload as string);
  }, 30_000);
});
