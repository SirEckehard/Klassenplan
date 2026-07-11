// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  processStudentPhoto,
  loadImageBitmapFromBlob,
  clampPhotoTransform,
  defaultPhotoTransform,
  blobToDataUrl,
  dataUrlToBlob,
  StudentPhotoError,
  STUDENT_PHOTO_ERRORS,
  MAX_INPUT_PHOTO_BYTES,
  MAX_PHOTO_ZOOM,
} from '../processStudentPhoto';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('processStudentPhoto validation', () => {
  it('rejects non-image files', async () => {
    const file = new File(['x'], 'note.txt', { type: 'text/plain' });
    await expect(processStudentPhoto(file)).rejects.toThrowError(
      new StudentPhotoError(STUDENT_PHOTO_ERRORS.notImage),
    );
  });

  it('rejects oversized files before decoding', async () => {
    const file = new File(['x'], 'huge.png', { type: 'image/png' });
    Object.defineProperty(file, 'size', {
      value: MAX_INPUT_PHOTO_BYTES + 1,
    });
    await expect(processStudentPhoto(file)).rejects.toThrowError(
      new StudentPhotoError(STUDENT_PHOTO_ERRORS.tooLarge),
    );
  });
});

describe('loadImageBitmapFromBlob', () => {
  it('decodes a blob into an ImageBitmap', async () => {
    const bitmap = { width: 160, height: 160, close: vi.fn() };
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => bitmap),
    );
    const blob = new Blob([new Uint8Array([1])], { type: 'image/jpeg' });
    await expect(loadImageBitmapFromBlob(blob)).resolves.toBe(bitmap);
  });

  it('wraps decode failures in a StudentPhotoError', async () => {
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => {
        throw new Error('decode boom');
      }),
    );
    const blob = new Blob([new Uint8Array([1])], { type: 'image/jpeg' });
    await expect(loadImageBitmapFromBlob(blob)).rejects.toThrowError(
      new StudentPhotoError(STUDENT_PHOTO_ERRORS.decodeFailed),
    );
  });

  it('rejects zero-dimension bitmaps and closes them', async () => {
    const close = vi.fn();
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => ({ width: 0, height: 0, close })),
    );
    const blob = new Blob([new Uint8Array([1])], { type: 'image/jpeg' });
    await expect(loadImageBitmapFromBlob(blob)).rejects.toThrowError(
      new StudentPhotoError(STUDENT_PHOTO_ERRORS.decodeFailed),
    );
    expect(close).toHaveBeenCalledOnce();
  });
});

describe('processStudentPhoto pipeline', () => {
  it('cover-fits the source centered and encodes JPEG, closing the bitmap', async () => {
    const close = vi.fn();
    // Landscape source 400x300 -> cover base = 160 / min(400,300) = 160/300.
    const bitmap = { width: 400, height: 300, close };
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => bitmap),
    );

    const drawImage = vi.fn();
    const scale = vi.fn();
    const fakeCtx = {
      imageSmoothingEnabled: false,
      imageSmoothingQuality: 'low',
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      scale,
      drawImage,
    } as unknown as CanvasRenderingContext2D;

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      fakeCtx as unknown as ReturnType<HTMLCanvasElement['getContext']>,
    );
    const toBlob = vi
      .spyOn(HTMLCanvasElement.prototype, 'toBlob')
      .mockImplementation((cb, type, quality) => {
        expect(type).toBe('image/jpeg');
        expect(quality).toBeCloseTo(0.7);
        cb(new Blob([new Uint8Array([1, 2, 3])], { type: 'image/jpeg' }));
      });

    const file = new File(['img'], 'photo.png', { type: 'image/png' });
    const result = await processStudentPhoto(file);

    expect(result.type).toBe('image/jpeg');
    expect(toBlob).toHaveBeenCalledOnce();
    expect(close).toHaveBeenCalledOnce();
    // Cover-fit base scale applied uniformly, source drawn centered on origin.
    expect(scale).toHaveBeenCalledWith(160 / 300, 160 / 300);
    expect(drawImage).toHaveBeenCalledWith(bitmap, -200, -150);
  });
});

describe('clampPhotoTransform', () => {
  const bitmap = (width: number, height: number) =>
    ({ width, height }) as ImageBitmap;

  it('snaps rotation to quarter-turns and clamps scale', () => {
    const result = clampPhotoTransform(bitmap(300, 300), {
      scale: 99,
      offsetX: 0,
      offsetY: 0,
      rotation: -90,
    });
    expect(result.rotation).toBe(270);
    expect(result.scale).toBe(MAX_PHOTO_ZOOM);
  });

  it('forbids panning a square image at cover scale', () => {
    const result = clampPhotoTransform(bitmap(300, 300), {
      ...defaultPhotoTransform(),
      offsetX: 0.5,
      offsetY: -0.5,
    });
    expect(result.offsetX).toBeCloseTo(0, 10);
    expect(result.offsetY).toBeCloseTo(0, 10);
  });

  it('allows panning along the long axis of a landscape image', () => {
    const result = clampPhotoTransform(bitmap(400, 300), {
      scale: 1,
      offsetX: 0.9,
      offsetY: 0.9,
      rotation: 0,
    });
    // fracW = 400/300 -> maxOffsetX = (4/3 - 1)/2 ≈ 0.1667; fracH = 1 -> 0.
    expect(result.offsetX).toBeCloseTo((400 / 300 - 1) / 2, 5);
    expect(result.offsetY).toBe(0);
  });

  it('swaps the pannable axis when rotated a quarter-turn', () => {
    const result = clampPhotoTransform(bitmap(400, 300), {
      scale: 1,
      offsetX: 0.9,
      offsetY: 0.9,
      rotation: 90,
    });
    // After 90° the 400px edge is vertical -> pan allowed on Y, not X.
    expect(result.offsetX).toBe(0);
    expect(result.offsetY).toBeCloseTo((400 / 300 - 1) / 2, 5);
  });
});

describe('data URL helpers', () => {
  it('round-trips a blob through base64 without data loss', async () => {
    const bytes = new Uint8Array([0, 1, 2, 250, 251, 255]);
    const blob = new Blob([bytes], { type: 'image/jpeg' });

    const dataUrl = await blobToDataUrl(blob);
    expect(dataUrl.startsWith('data:image/jpeg')).toBe(true);

    const restored = dataUrlToBlob(dataUrl);
    expect(restored.type).toBe('image/jpeg');
    const restoredBytes = new Uint8Array(await restored.arrayBuffer());
    expect(Array.from(restoredBytes)).toEqual(Array.from(bytes));
  });

  it('throws on malformed data URLs', () => {
    expect(() => dataUrlToBlob('not-a-data-url')).toThrowError(
      StudentPhotoError,
    );
  });
});
