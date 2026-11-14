// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * The teacher's own picture for the name cards (decision 0047) is kept within
 * a weight a backup carries: a photo kept as a 1200 px PNG came to 3 MB and
 * stopped every backup (review of 2026-11-14).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  CARD_FILE_ERRORS,
  CARD_IMAGE_MAX_BYTES,
  prepareCardImage,
} from '../processCardFile';

const TOO_HEAVY = CARD_IMAGE_MAX_BYTES + 1;

/**
 * A canvas whose encodings weigh what `weigh` says for a type and a width,
 * and whose pixels are transparent or not.
 */
function fakeCanvas({
  transparent,
  weigh,
}: {
  transparent: boolean;
  weigh: (type: string, width: number) => number;
}) {
  const encoded: Array<{ type: string; width: number }> = [];
  vi.stubGlobal(
    'createImageBitmap',
    vi.fn(async () => ({ width: 2400, height: 1800, close: vi.fn() })),
  );
  // One row of pixels stands for the picture: all clear or all opaque.
  const pixels = new Uint8ClampedArray(4 * 8).fill(transparent ? 0 : 255);
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    imageSmoothingQuality: 'low',
    drawImage: vi.fn(),
    getImageData: () => ({ data: pixels }),
  } as unknown as ReturnType<HTMLCanvasElement['getContext']>);
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (
    this: HTMLCanvasElement,
    callback,
    type = 'image/png',
  ) {
    encoded.push({ type, width: this.width });
    callback(new Blob([new Uint8Array(weigh(type, this.width))], { type }));
  });
  return encoded;
}

const file = (type: string) => new File(['picture'], 'bild', { type });

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('prepareCardImage', () => {
  it('keeps a drawing as a sharp PNG of 1200 px where it is light enough', async () => {
    const encoded = fakeCanvas({ transparent: true, weigh: () => 300_000 });

    const kept = await prepareCardImage(file('image/png'));

    expect(kept.type).toBe('image/png');
    expect(encoded).toEqual([{ type: 'image/png', width: 1200 }]);
  });

  it('keeps an opaque picture too heavy as a PNG as a JPEG', async () => {
    const encoded = fakeCanvas({
      transparent: false,
      weigh: (type) => (type === 'image/png' ? 3_000_000 : 320_000),
    });

    const kept = await prepareCardImage(file('image/webp'));

    expect(kept.type).toBe('image/jpeg');
    expect(kept.data.byteLength).toBe(320_000);
    expect(encoded.map((entry) => entry.type)).toEqual([
      'image/png',
      'image/jpeg',
    ]);
  });

  it('makes a transparent drawing smaller rather than losing its transparency', async () => {
    const encoded = fakeCanvas({
      transparent: true,
      weigh: (_type, width) => (width > 900 ? TOO_HEAVY : 900_000),
    });

    const kept = await prepareCardImage(file('image/png'));

    expect(kept.type).toBe('image/png');
    expect(encoded).toEqual([
      { type: 'image/png', width: 1200 },
      { type: 'image/png', width: 900 },
    ]);
  });

  it('says so when nothing makes it light enough', async () => {
    fakeCanvas({ transparent: true, weigh: () => TOO_HEAVY });

    await expect(prepareCardImage(file('image/png'))).rejects.toThrow(
      CARD_FILE_ERRORS.imageTooHeavy,
    );
  });

  it('keeps a photo a JPEG', async () => {
    const encoded = fakeCanvas({ transparent: false, weigh: () => 250_000 });

    const kept = await prepareCardImage(file('image/jpeg'));

    expect(kept.type).toBe('image/jpeg');
    expect(encoded).toEqual([{ type: 'image/jpeg', width: 1200 }]);
  });
});
