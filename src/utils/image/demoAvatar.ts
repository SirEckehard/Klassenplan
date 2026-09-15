// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Pictures for the sample class.
 *
 * Drawn on a canvas in the browser rather than shipped as image files: no stock
 * photos of real children, nothing to license, nothing fetched over the network
 * (the CSP would refuse it anyway), and the result is the same small JPEG a real
 * photo is stored as — so the photo store, the name game, the projector and the
 * exports treat the pictures exactly like uploaded ones.
 *
 * The faces are deliberately plain: a friendly shape per student, told apart by
 * hair, skin tone and shirt colour. No initials — the name game would give its
 * answers away.
 */
import type { Gender } from '@/types';
import { PHOTO_JPEG_QUALITY, PHOTO_SIZE } from './processStudentPhoto';

type HairStyle = 'short' | 'buzz' | 'side' | 'curly' | 'long' | 'bob' | 'bun';

const BACKGROUNDS = [
  '#dbeafe',
  '#fef3c7',
  '#dcfce7',
  '#fce7f3',
  '#ede9fe',
  '#ffedd5',
  '#cffafe',
  '#f1f5f9',
] as const;
const SKIN_TONES = [
  '#f8d9c0',
  '#eebb94',
  '#d9a276',
  '#b98158',
  '#91603f',
  '#6d4631',
] as const;
const HAIR_COLOURS = [
  '#1f1a17',
  '#3b2a20',
  '#6b4228',
  '#9a5b32',
  '#c99a55',
  '#2d2d2d',
] as const;
const SHIRT_COLOURS = [
  '#2563eb',
  '#ea580c',
  '#16a34a',
  '#0d9488',
  '#7c3aed',
  '#dc2626',
  '#0891b2',
  '#ca8a04',
] as const;

const HAIR_STYLES: Record<Gender, readonly HairStyle[]> = {
  girl: ['long', 'bun', 'curly', 'bob'],
  boy: ['short', 'side', 'curly', 'buzz'],
  diverse: ['bob', 'short', 'curly', 'side'],
};

/** Coordinates below are laid out on this grid and scaled to the photo size. */
const GRID = 160;
const FULL_TURN = Math.PI * 2;

/**
 * Deterministic choice: the same student index always gets the same face. The
 * salts differ per trait so neighbouring students do not share every colour.
 */
function pick<T>(options: readonly T[], index: number, salt: number): T {
  return options[((index + 1) * salt) % options.length];
}

function drawAvatar(
  ctx: CanvasRenderingContext2D,
  index: number,
  gender: Gender,
): void {
  const unit = PHOTO_SIZE / GRID;
  const skin = pick(SKIN_TONES, index, 5);
  const hair = pick(HAIR_COLOURS, index, 7);
  const style = pick(HAIR_STYLES[gender], index, 13);

  const ellipse = (
    x: number,
    y: number,
    radiusX: number,
    radiusY: number,
    colour: string,
    startAngle = 0,
    endAngle = FULL_TURN,
  ) => {
    ctx.beginPath();
    ctx.ellipse(
      x * unit,
      y * unit,
      radiusX * unit,
      radiusY * unit,
      0,
      startAngle,
      endAngle,
    );
    ctx.fillStyle = colour;
    ctx.fill();
  };
  // Canvas angles run clockwise from 3 o'clock, so π → 2π is the upper half.
  const cap = (y: number, radiusX: number, radiusY: number) =>
    ellipse(80, y, radiusX, radiusY, hair, Math.PI, FULL_TURN);

  ctx.fillStyle = pick(BACKGROUNDS, index, 3);
  ctx.fillRect(0, 0, PHOTO_SIZE, PHOTO_SIZE);

  // Long hair and a bob fall behind head and shoulders, so they come first.
  if (style === 'long') {
    ellipse(80, 100, 44, 56, hair);
  } else if (style === 'bob') {
    ellipse(80, 86, 42, 40, hair);
  }

  ellipse(80, 176, 62, 48, pick(SHIRT_COLOURS, index, 5));
  ctx.fillStyle = skin;
  ctx.fillRect(71 * unit, 104 * unit, 18 * unit, 24 * unit);
  ellipse(80, 78, 33, 37, skin);

  switch (style) {
    case 'buzz':
      cap(60, 33, 22);
      break;
    case 'curly':
      for (const [x, y] of [
        [54, 60],
        [66, 48],
        [80, 44],
        [94, 48],
        [106, 60],
      ]) {
        ellipse(x, y, 13, 13, hair);
      }
      break;
    case 'side':
      cap(62, 36, 28);
      ellipse(64, 58, 20, 12, hair);
      break;
    case 'bun':
      ellipse(80, 34, 14, 13, hair);
      cap(62, 36, 28);
      break;
    default:
      cap(62, 36, 30);
  }

  ctx.fillStyle = '#1f2937';
  for (const x of [68, 92]) {
    ctx.beginPath();
    ctx.arc(x * unit, 82 * unit, 3.5 * unit, 0, FULL_TURN);
    ctx.fill();
  }

  ctx.beginPath();
  ctx.arc(80 * unit, 92 * unit, 11 * unit, 0.2 * Math.PI, 0.8 * Math.PI);
  ctx.strokeStyle = '#7c2d12';
  ctx.lineWidth = 3 * unit;
  ctx.lineCap = 'round';
  ctx.stroke();
}

/**
 * Render the picture for the sample student at `index` as a JPEG blob.
 *
 * @returns The blob, or null where no canvas is available (tests, very old
 *   browsers) — the sample class then simply has no pictures.
 */
export async function renderDemoAvatarBlob(
  index: number,
  gender: Gender = 'diverse',
): Promise<Blob | null> {
  if (typeof document === 'undefined') {
    return null;
  }

  try {
    const canvas = document.createElement('canvas');
    canvas.width = PHOTO_SIZE;
    canvas.height = PHOTO_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return null;
    }
    drawAvatar(ctx, index, gender);
    return await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', PHOTO_JPEG_QUALITY),
    );
  } catch {
    return null;
  }
}
