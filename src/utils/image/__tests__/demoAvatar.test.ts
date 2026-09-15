// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderDemoAvatarBlob } from '../demoAvatar';
import { PHOTO_JPEG_QUALITY } from '../processStudentPhoto';

// jsdom has no canvas implementation, so the drawing calls are recorded on a
// stand-in context instead of being rasterised.
const originalGetContext = HTMLCanvasElement.prototype.getContext;
const originalToBlob = HTMLCanvasElement.prototype.toBlob;

function installCanvas(options: { context?: boolean; encodeFails?: boolean }) {
  const colours: string[] = [];
  const context = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    lineCap: 'butt',
    beginPath: vi.fn(),
    ellipse: vi.fn(),
    arc: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(function (this: { fillStyle: string }) {
      colours.push(this.fillStyle);
    }),
    fillRect: vi.fn(function (this: { fillStyle: string }) {
      colours.push(this.fillStyle);
    }),
  };
  const toBlob = vi.fn(
    (callback: BlobCallback, type?: string, _quality?: number) => {
      if (options.encodeFails) {
        throw new Error('encoder unavailable');
      }
      callback(new Blob(['jpeg'], { type }));
    },
  );

  HTMLCanvasElement.prototype.getContext = vi.fn(() =>
    options.context === false ? null : context,
  ) as unknown as typeof HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.toBlob =
    toBlob as unknown as typeof HTMLCanvasElement.prototype.toBlob;

  return { colours, toBlob };
}

describe('renderDemoAvatarBlob', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    HTMLCanvasElement.prototype.getContext = originalGetContext;
    HTMLCanvasElement.prototype.toBlob = originalToBlob;
  });

  it('encodes a JPEG the way an uploaded photo is stored', async () => {
    const { toBlob } = installCanvas({});

    const blob = await renderDemoAvatarBlob(0, 'girl');

    expect(blob?.type).toBe('image/jpeg');
    expect(toBlob).toHaveBeenCalledWith(
      expect.any(Function),
      'image/jpeg',
      PHOTO_JPEG_QUALITY,
    );
  });

  it('draws the same face for the same student and another for the next one', async () => {
    const first = installCanvas({});
    await renderDemoAvatarBlob(3, 'boy');
    const again = installCanvas({});
    await renderDemoAvatarBlob(3, 'boy');
    const next = installCanvas({});
    await renderDemoAvatarBlob(4, 'boy');

    expect(again.colours).toEqual(first.colours);
    expect(next.colours).not.toEqual(first.colours);
  });

  it('returns null where no canvas context is available', async () => {
    installCanvas({ context: false });

    await expect(renderDemoAvatarBlob(0)).resolves.toBeNull();
  });

  it('returns null when encoding fails', async () => {
    installCanvas({ encodeFails: true });

    await expect(renderDemoAvatarBlob(0)).resolves.toBeNull();
  });
});
