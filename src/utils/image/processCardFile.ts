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

const CARD_IMAGE_JPEG_QUALITY = 0.88;

/** i18n keys, shown under the row that loaded the file. */
export const CARD_FILE_ERRORS = {
  notFont: 'generator:export.cards.errors.notFont',
  fontTooLarge: 'generator:export.cards.errors.fontTooLarge',
  notImage: 'generator:export.cards.errors.notImage',
  imageTooLarge: 'generator:export.cards.errors.imageTooLarge',
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

/**
 * A picture ready to keep: at most `CARD_IMAGE_EDGE` on its longer side, a
 * photo as JPEG, a drawing — PNG or WebP, which may be transparent — as PNG.
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
    const scale = Math.min(
      1,
      CARD_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height),
    );
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new CardFileError(CARD_FILE_ERRORS.notImage);
    context.imageSmoothingQuality = 'high';
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const type = file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png';
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, type, CARD_IMAGE_JPEG_QUALITY),
    );
    if (!blob) throw new CardFileError(CARD_FILE_ERRORS.notImage);
    return { type, data: await blob.arrayBuffer() };
  } finally {
    bitmap.close();
  }
}
