// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const storeMocks = vi.hoisted(() => ({
  getStudentPhoto: vi.fn(),
  setStudentPhoto: vi.fn(),
  deleteStudentPhoto: vi.fn(),
}));

vi.mock('@/repositories/studentPhotoStore', () => storeMocks);
vi.mock('@/utils/image/processStudentPhoto', () => ({
  blobToDataUrl: vi.fn(async () => 'data:image/jpeg;base64,QUJD'),
}));

type CacheModule = typeof import('../studentPhotoCache');

let cache: CacheModule;
let createObjectURL: ReturnType<typeof vi.fn>;
let revokeObjectURL: ReturnType<typeof vi.fn>;
let urlCounter: number;

const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;

const blob = () => new Blob(['x'], { type: 'image/jpeg' });

beforeEach(async () => {
  vi.resetModules();
  vi.clearAllMocks();
  urlCounter = 0;
  createObjectURL = vi.fn(() => `blob:mock-${++urlCounter}`);
  revokeObjectURL = vi.fn();
  // Patch only the static helpers; replacing the whole URL global would break
  // `new URL(...)` used elsewhere (e.g. i18n backends).
  URL.createObjectURL =
    createObjectURL as unknown as typeof URL.createObjectURL;
  URL.revokeObjectURL =
    revokeObjectURL as unknown as typeof URL.revokeObjectURL;
  // Fresh module state (module-level Map cache) per test.
  cache = await import('../studentPhotoCache');
});

afterEach(() => {
  URL.createObjectURL = originalCreateObjectURL;
  URL.revokeObjectURL = originalRevokeObjectURL;
});

describe('studentPhotoCache', () => {
  it('loads a photo from the store and caches both representations', async () => {
    storeMocks.getStudentPhoto.mockResolvedValue(blob());

    const entry = await cache.ensurePhotoLoaded('s1');

    expect(entry).toEqual({
      objectUrl: 'blob:mock-1',
      dataUrl: 'data:image/jpeg;base64,QUJD',
    });
    expect(cache.getCachedObjectUrl('s1')).toBe('blob:mock-1');
    expect(cache.getCachedDataUrl('s1')).toBe('data:image/jpeg;base64,QUJD');
    expect(storeMocks.getStudentPhoto).toHaveBeenCalledTimes(1);
  });

  it('returns undefined without caching when no photo is stored', async () => {
    storeMocks.getStudentPhoto.mockResolvedValue(undefined);

    await expect(cache.ensurePhotoLoaded('missing')).resolves.toBeUndefined();
    expect(cache.getCachedObjectUrl('missing')).toBeUndefined();
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it('de-duplicates concurrent loads for the same id', async () => {
    let resolveBlob!: (b: Blob) => void;
    storeMocks.getStudentPhoto.mockReturnValue(
      new Promise<Blob>((resolve) => {
        resolveBlob = resolve;
      }),
    );

    const first = cache.ensurePhotoLoaded('s1');
    const second = cache.ensurePhotoLoaded('s1');
    resolveBlob(blob());

    const [a, b] = await Promise.all([first, second]);
    expect(a).toBe(b);
    expect(storeMocks.getStudentPhoto).toHaveBeenCalledTimes(1);
  });

  it('revokes the previous Object URL when a photo is replaced', async () => {
    storeMocks.setStudentPhoto.mockResolvedValue(undefined);

    await cache.saveStudentPhoto('s1', blob());
    await cache.saveStudentPhoto('s1', blob());

    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-1');
    expect(cache.getCachedObjectUrl('s1')).toBe('blob:mock-2');
  });

  it('removeStudentPhoto invalidates the cache and deletes from the store', async () => {
    storeMocks.setStudentPhoto.mockResolvedValue(undefined);
    storeMocks.deleteStudentPhoto.mockResolvedValue(undefined);

    await cache.saveStudentPhoto('s1', blob());
    await cache.removeStudentPhoto('s1');

    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-1');
    expect(cache.getCachedObjectUrl('s1')).toBeUndefined();
    expect(storeMocks.deleteStudentPhoto).toHaveBeenCalledWith('s1');
  });

  it('clearPhotoCache revokes every Object URL and notifies subscribers', async () => {
    storeMocks.setStudentPhoto.mockResolvedValue(undefined);
    await cache.saveStudentPhoto('s1', blob());
    await cache.saveStudentPhoto('s2', blob());

    const listener = vi.fn();
    cache.subscribe(listener);
    const versionBefore = cache.getVersion();

    cache.clearPhotoCache();

    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-1');
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-2');
    expect(cache.getCachedObjectUrl('s1')).toBeUndefined();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(cache.getVersion()).toBe(versionBefore + 1);
  });

  it('swallows load errors and resolves undefined', async () => {
    storeMocks.getStudentPhoto.mockRejectedValue(new Error('idb down'));

    await expect(cache.ensurePhotoLoaded('s1')).resolves.toBeUndefined();
    // A later call retries instead of returning a stale in-flight promise.
    storeMocks.getStudentPhoto.mockResolvedValue(blob());
    await expect(cache.ensurePhotoLoaded('s1')).resolves.toBeDefined();
  });
});
