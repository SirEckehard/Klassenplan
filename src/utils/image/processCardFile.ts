// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * The teacher's own font and picture for the table cards (decision 0047),
 * checked and made ready to keep: a font as it is, a picture made smaller.
 */
import {
  isUsableFont,
  ownFontFormat,
  type OwnFontFormat,
} from '@/utils/export/cardFonts';

/** A font file a teacher may load: larger ones are no beginner's font. */
const MAX_CARD_FONT_BYTES = 2 * 1024 * 1024;

/** A picture as a phone takes it is welcome; it is made smaller. */
const MAX_CARD_IMAGE_INPUT_BYTES = 20 * 1024 * 1024;

/** The longest side a picture keeps: 300 dpi on the largest card's slot. */
const CARD_IMAGE_EDGE = 1200;

/**
 * The longer sides a transparent drawing is tried at, largest first, when
 * its PNG weighs too much: a JPEG would lose the transparency.
 */
const TRANSPARENT_EDGES = [CARD_IMAGE_EDGE, 900, 600] as const;

const CARD_IMAGE_JPEG_QUALITY = 0.88;

/**
 * The most a kept picture may weigh. A backup carries it as a data URL and
 * its check refuses a file far above this (`maxCardFileDataUrlLength`); a
 * photo kept as a 1200 px PNG came to 3 MB and stopped every backup (review
 * of 2026-11-14).
 */
export const CARD_IMAGE_MAX_BYTES = 1.5 * 1024 * 1024;

/** i18n keys, shown under the row that loaded the file. */
export const CARD_FILE_ERRORS = {
  notFont: 'generator:export.cards.errors.notFont',
  fontTooLarge: 'generator:export.cards.errors.fontTooLarge',
  notImage: 'generator:export.cards.errors.notImage',
  imageTooLarge: 'generator:export.cards.errors.imageTooLarge',
  imageTooHeavy: 'generator:export.cards.errors.imageTooHeavy',
  saveFailed: 'generator:export.cards.errors.saveFailed',
} as const;

export class CardFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CardFileError';
  }
}

const FONT_MEDIA_TYPES: Record<OwnFontFormat, string> = {
  woff2: 'font/woff2',
  woff: 'font/woff',
  truetype: 'font/ttf',
  opentype: 'font/otf',
};

/** The `format()` of a stored font by its media type. */
export function fontFormatOfType(type: string): OwnFontFormat {
  const entry = Object.entries(FONT_MEDIA_TYPES).find(
    ([, mediaType]) => mediaType === type,
  );
  return (entry?.[0] as OwnFontFormat | undefined) ?? 'truetype';
}

/**
 * A font file ready to keep, with its media type.
 *
 * @throws {CardFileError} for a file that is no font the browser can use, or
 *   one that is too large
 */
export async function prepareCardFont(
  file: File,
): Promise<{ type: string; data: ArrayBuffer }> {
  const format = ownFontFormat(file.name);
  if (!format) throw new CardFileError(CARD_FILE_ERRORS.notFont);
  if (file.size > MAX_CARD_FONT_BYTES) {
    throw new CardFileError(CARD_FILE_ERRORS.fontTooLarge);
  }
  const data = await file.arrayBuffer();
  if (!(await isUsableFont(data))) {
    throw new CardFileError(CARD_FILE_ERRORS.notFont);
  }
  return { type: FONT_MEDIA_TYPES[format], data };
}

/** The picture drawn at most `edge` on its longer side. */
function drawAt(bitmap: ImageBitmap, edge: number) {
  const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new CardFileError(CARD_FILE_ERRORS.notImage);
  context.imageSmoothingQuality = 'high';
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return { canvas, context };
}

const encode = (canvas: HTMLCanvasElement, type: string) =>
  new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, type, CARD_IMAGE_JPEG_QUALITY),
  );

/** Whether any pixel lets the paper through. */
function isTransparent(
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
): boolean {
  const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
  for (let index = 3; index < data.length; index += 4) {
    if (data[index]! < 255) return true;
  }
  return false;
}

/** The blob, ready to keep, when it is within `CARD_IMAGE_MAX_BYTES`. */
async function kept(
  blob: Blob | null,
  type: string,
): Promise<{ type: string; data: ArrayBuffer } | null> {
  if (!blob || blob.size > CARD_IMAGE_MAX_BYTES) return null;
  return { type, data: await blob.arrayBuffer() };
}

/**
 * A picture ready to keep: at most `CARD_IMAGE_EDGE` on its longer side and
 * `CARD_IMAGE_MAX_BYTES` in weight. A photo stays a JPEG. A PNG or WebP —
 * often a drawing, which may be transparent — becomes a PNG, which keeps its
 * lines sharp; where that weighs too much, an opaque one becomes a JPEG and a
 * transparent one a smaller PNG.
 *
 * @throws {CardFileError} for a file that is no picture or too large
 */
export async function prepareCardImage(
  file: File,
): Promise<{ type: string; data: ArrayBuffer }> {
  if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
    throw new CardFileError(CARD_FILE_ERRORS.notImage);
  }
  if (file.size > MAX_CARD_IMAGE_INPUT_BYTES) {
    throw new CardFileError(CARD_FILE_ERRORS.imageTooLarge);
  }
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new CardFileError(CARD_FILE_ERRORS.notImage);
  }
  try {
    const { canvas, context } = drawAt(bitmap, CARD_IMAGE_EDGE);
    if (file.type === 'image/jpeg') {
      const photo = await encode(canvas, 'image/jpeg');
      if (!photo) throw new CardFileError(CARD_FILE_ERRORS.notImage);
      const result = await kept(photo, 'image/jpeg');
      if (result) return result;
      throw new CardFileError(CARD_FILE_ERRORS.imageTooHeavy);
    }

    const png = await encode(canvas, 'image/png');
    if (!png) throw new CardFileError(CARD_FILE_ERRORS.notImage);
    const sharp = await kept(png, 'image/png');
    if (sharp) return sharp;

    if (!isTransparent(context, canvas)) {
      const photo = await kept(
        await encode(canvas, 'image/jpeg'),
        'image/jpeg',
      );
      if (photo) return photo;
    } else {
      for (const edge of TRANSPARENT_EDGES.slice(1)) {
        const smaller = drawAt(bitmap, edge).canvas;
        const result = await kept(
          await encode(smaller, 'image/png'),
          'image/png',
        );
        if (result) return result;
      }
    }
    throw new CardFileError(CARD_FILE_ERRORS.imageTooHeavy);
  } finally {
    bitmap.close();
  }
}
