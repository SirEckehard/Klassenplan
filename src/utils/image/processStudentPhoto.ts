// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Client-side processing for optional student photos.
 *
 * Goal: keep stored photos tiny so IndexedDB stays lean (~36 students ≈ 0.5 MB)
 * and JSON backups remain portable. We center-crop to a square, downscale to
 * {@link PHOTO_SIZE}px and re-encode as JPEG, yielding roughly 8–15 KB/photo.
 */

/** Output edge length in pixels (square). */
export const PHOTO_SIZE = 160;

/** JPEG quality for the downscaled output (0–1). */
export const PHOTO_JPEG_QUALITY = 0.7;

/** Maximum zoom factor (relative to the cover-fit base scale) in the editor. */
export const MAX_PHOTO_ZOOM = 4;

/**
 * Maximum accepted input file size. Generous enough for phone camera photos
 * while preventing absurdly large uploads from being decoded.
 */
export const MAX_INPUT_PHOTO_BYTES = 20 * 1024 * 1024; // 20 MB

/**
 * Framing of the source image inside the square output, shared by the crop
 * editor's live preview and the final encode so they stay pixel-identical.
 *
 * - `scale`: zoom relative to the cover-fit base (1 = image exactly covers).
 * - `offsetX` / `offsetY`: pan along the square's axes, as a fraction of the
 *   output edge (so it is resolution-independent).
 * - `rotation`: quarter-turn in degrees (0, 90, 180, 270).
 */
export interface PhotoTransform {
  scale: number;
  offsetX: number;
  offsetY: number;
  rotation: number;
}

/** Identity framing: centered, cover-fit, unrotated (matches a plain center-crop). */
export function defaultPhotoTransform(): PhotoTransform {
  return { scale: 1, offsetX: 0, offsetY: 0, rotation: 0 };
}

export class StudentPhotoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StudentPhotoError';
  }
}

// i18n keys resolved by showToast/getToastMessage at display time.
export const STUDENT_PHOTO_ERRORS = {
  notImage: 'toast:studentPhoto.notImage',
  tooLarge: 'toast:studentPhoto.tooLarge',
  decodeFailed: 'toast:studentPhoto.decodeFailed',
} as const;

/**
 * Validate and decode a user-selected image into an ImageBitmap. The caller is
 * responsible for `bitmap.close()` once done.
 *
 * @throws {StudentPhotoError} for non-images, oversized inputs or decode errors.
 */
export async function loadImageBitmapFromFile(
  file: File,
): Promise<ImageBitmap> {
  if (!file.type.startsWith('image/')) {
    throw new StudentPhotoError(STUDENT_PHOTO_ERRORS.notImage);
  }
  if (file.size > MAX_INPUT_PHOTO_BYTES) {
    throw new StudentPhotoError(STUDENT_PHOTO_ERRORS.tooLarge);
  }
  try {
    const bitmap = await createImageBitmap(file);
    if (bitmap.width <= 0 || bitmap.height <= 0) {
      bitmap.close();
      throw new StudentPhotoError(STUDENT_PHOTO_ERRORS.decodeFailed);
    }
    return bitmap;
  } catch (error) {
    if (error instanceof StudentPhotoError) throw error;
    throw new StudentPhotoError(STUDENT_PHOTO_ERRORS.decodeFailed);
  }
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

/**
 * Clamp a framing so the image always fully covers the square (no empty gaps):
 * scale ≥ 1, rotation snapped to a quarter-turn, and pan bounded to the covered
 * range. Single source of truth used by both the editor and the export.
 */
export function clampPhotoTransform(
  bitmap: ImageBitmap,
  transform: PhotoTransform,
): PhotoTransform {
  const rotation =
    (((Math.round(transform.rotation / 90) * 90) % 360) + 360) % 360;
  const scale = clamp(transform.scale, 1, MAX_PHOTO_ZOOM);

  const rotated = rotation % 180 !== 0;
  const renderedW = rotated ? bitmap.height : bitmap.width;
  const renderedH = rotated ? bitmap.width : bitmap.height;
  const minDim = Math.min(bitmap.width, bitmap.height);

  // Rendered edge length relative to the square edge (≥ 1 because of cover-fit).
  const fracW = (renderedW / minDim) * scale;
  const fracH = (renderedH / minDim) * scale;
  const maxOffsetX = Math.max(0, (fracW - 1) / 2);
  const maxOffsetY = Math.max(0, (fracH - 1) / 2);

  return {
    scale,
    rotation,
    offsetX: clamp(transform.offsetX, -maxOffsetX, maxOffsetX),
    offsetY: clamp(transform.offsetY, -maxOffsetY, maxOffsetY),
  };
}

/**
 * Draw `bitmap` into a square `size`×`size` context using `transform`. Used for
 * the editor's live preview (size = viewport) and the final encode (size =
 * {@link PHOTO_SIZE}); identical math keeps them WYSIWYG. Expects a clamped
 * transform (see {@link clampPhotoTransform}).
 */
export function drawPhoto(
  ctx: CanvasRenderingContext2D,
  bitmap: ImageBitmap,
  size: number,
  transform: PhotoTransform,
): void {
  // Cover-fit base scale (rotation-invariant: min dimension is unchanged by a
  // quarter-turn).
  const base = size / Math.min(bitmap.width, bitmap.height);
  const scale = base * transform.scale;

  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.translate(
    size / 2 + transform.offsetX * size,
    size / 2 + transform.offsetY * size,
  );
  ctx.rotate((transform.rotation * Math.PI) / 180);
  ctx.scale(scale, scale);
  ctx.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2);
  ctx.restore();
}

/**
 * Render a framed bitmap to the square JPEG output blob (~8–15 KB).
 *
 * @throws {StudentPhotoError} if a canvas/encode step fails.
 */
export async function renderStudentPhotoBlob(
  bitmap: ImageBitmap,
  transform: PhotoTransform,
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = PHOTO_SIZE;
  canvas.height = PHOTO_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new StudentPhotoError(STUDENT_PHOTO_ERRORS.decodeFailed);
  }
  drawPhoto(ctx, bitmap, PHOTO_SIZE, clampPhotoTransform(bitmap, transform));

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', PHOTO_JPEG_QUALITY),
  );
  if (!blob) {
    throw new StudentPhotoError(STUDENT_PHOTO_ERRORS.decodeFailed);
  }
  return blob;
}

/**
 * Load, center-crop (square), downscale and JPEG-encode a user-selected image
 * with the default framing. Kept for the non-edited path; the crop editor uses
 * {@link loadImageBitmapFromFile} + {@link renderStudentPhotoBlob} directly.
 *
 * @throws {StudentPhotoError} for non-images, oversized inputs or decode errors.
 */
export async function processStudentPhoto(file: File): Promise<Blob> {
  const bitmap = await loadImageBitmapFromFile(file);
  try {
    return await renderStudentPhotoBlob(bitmap, defaultPhotoTransform());
  } finally {
    bitmap.close();
  }
}

/** Convert a Blob to a base64 data URL (for SVG/PDF rendering and export). */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () =>
      reject(new StudentPhotoError(STUDENT_PHOTO_ERRORS.decodeFailed));
    reader.readAsDataURL(blob);
  });
}

/**
 * Convert a base64 data URL back into a Blob (for backup import). Decodes
 * manually instead of `fetch(dataUrl)` to avoid any CSP/network coupling.
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const commaIndex = dataUrl.indexOf(',');
  if (!dataUrl.startsWith('data:') || commaIndex === -1) {
    throw new StudentPhotoError(STUDENT_PHOTO_ERRORS.decodeFailed);
  }
  const header = dataUrl.slice(5, commaIndex); // e.g. "image/jpeg;base64"
  const isBase64 = header.includes(';base64');
  const mime = header.split(';')[0] || 'image/jpeg';
  const data = dataUrl.slice(commaIndex + 1);

  if (!isBase64) {
    // Percent-encoded (non-base64) data URL.
    const decoded = decodeURIComponent(data);
    const bytes = new Uint8Array(decoded.length);
    for (let i = 0; i < decoded.length; i += 1) {
      bytes[i] = decoded.charCodeAt(i);
    }
    return new Blob([bytes], { type: mime });
  }

  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}
