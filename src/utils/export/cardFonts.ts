// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import andikaLatinUrl from '@fontsource/andika/files/andika-latin-400-normal.woff2?url';
import andikaLatinExtUrl from '@fontsource/andika/files/andika-latin-ext-400-normal.woff2?url';
import abeezeeLatinUrl from '@fontsource/abeezee/files/abeezee-latin-400-normal.woff2?url';
import abeezeeLatinExtUrl from '@fontsource/abeezee/files/abeezee-latin-ext-400-normal.woff2?url';
import patrickHandLatinUrl from '@fontsource/patrick-hand/files/patrick-hand-latin-400-normal.woff2?url';
import patrickHandLatinExtUrl from '@fontsource/patrick-hand/files/patrick-hand-latin-ext-400-normal.woff2?url';
import openDyslexicLatinUrl from '@fontsource/opendyslexic/files/opendyslexic-latin-400-normal.woff2?url';
import { logWarn } from '@/utils';
import { svgFontFamily } from '@/utils/ui/designTokens';
import { fontFace, LATIN_EXT_RANGE, LATIN_RANGE } from './fontSubsets';
import { fetchAsBase64 } from './svgRasterizer';

/**
 * The fonts a table card is set in (decision 0047): four shipped with the app
 * for children who are learning to read — Andika first, the default — the
 * app's own, and one the teacher loads from a file. They load with the export
 * page's card view only, as files, never with the app: every other page keeps
 * its first load.
 *
 * A card sheet names its font but does not carry it, since an own font may be
 * megabytes: the preview links the shipped files (`cardFontPreviewCss`), the
 * print and the PDF add them inlined once (`cardFontCss`) — cards are a PDF
 * only. The page itself loads the font too, to measure the names with a
 * canvas before they are laid out.
 */

export type CardFontId =
  'andika' | 'abeezee' | 'patrickHand' | 'openDyslexic' | 'atkinson' | 'own';

/** The shipped fonts, in the order the inspector offers them. */
export const SHIPPED_CARD_FONTS = [
  'andika',
  'abeezee',
  'patrickHand',
  'openDyslexic',
  'atkinson',
] as const satisfies readonly CardFontId[];

type ShippedFile = { url: string; unicodeRange: string };

/** A family of its own for each, so none can be mistaken for an installed one. */
const SHIPPED_FILES: Record<
  Exclude<CardFontId, 'atkinson' | 'own'>,
  { family: string; files: readonly ShippedFile[] }
> = {
  andika: {
    family: 'KP Card Andika',
    files: [
      { url: andikaLatinExtUrl, unicodeRange: LATIN_EXT_RANGE },
      { url: andikaLatinUrl, unicodeRange: LATIN_RANGE },
    ],
  },
  abeezee: {
    family: 'KP Card ABeeZee',
    files: [
      { url: abeezeeLatinExtUrl, unicodeRange: LATIN_EXT_RANGE },
      { url: abeezeeLatinUrl, unicodeRange: LATIN_RANGE },
    ],
  },
  patrickHand: {
    family: 'KP Card Patrick Hand',
    files: [
      { url: patrickHandLatinExtUrl, unicodeRange: LATIN_EXT_RANGE },
      { url: patrickHandLatinUrl, unicodeRange: LATIN_RANGE },
    ],
  },
  // Latin alone: a letter beyond it falls back to the app's font.
  openDyslexic: {
    family: 'KP Card OpenDyslexic',
    files: [{ url: openDyslexicLatinUrl, unicodeRange: LATIN_RANGE }],
  },
};

const OWN_FAMILY = 'KP Card Own';

/** A font's own name, as the inspector shows it: a proper name, not a word. */
export const CARD_FONT_NAMES: Record<Exclude<CardFontId, 'own'>, string> = {
  andika: 'Andika',
  abeezee: 'ABeeZee',
  patrickHand: 'Patrick Hand',
  openDyslexic: 'OpenDyslexic',
  atkinson: 'Atkinson Hyperlegible',
};

/** The teacher's own font: its file as a data URL and its format. */
export type OwnCardFont = {
  dataUrl: string;
  format: OwnFontFormat;
};

export type OwnFontFormat = 'woff2' | 'woff' | 'truetype' | 'opentype';

/** The format of a font file by its name, or null for none the app takes. */
export function ownFontFormat(fileName: string): OwnFontFormat | null {
  const extension = fileName.toLowerCase().split('.').pop();
  switch (extension) {
    case 'woff2':
      return 'woff2';
    case 'woff':
      return 'woff';
    case 'ttf':
      return 'truetype';
    case 'otf':
      return 'opentype';
    default:
      return null;
  }
}

const familyOf = (id: CardFontId): string | null =>
  id === 'atkinson'
    ? null
    : id === 'own'
      ? OWN_FAMILY
      : SHIPPED_FILES[id].family;

/**
 * The family stack a card's text takes: the font, then the app's for a letter
 * the font lacks.
 */
export function cardFontFamily(id: CardFontId): string {
  const family = familyOf(id);
  return family ? `'${family}', ${svgFontFamily}` : svgFontFamily;
}

const cssCache = new Map<string, Promise<string>>();

/**
 * The `@font-face` rules a card sheet carries, its files inlined. Empty for
 * the app's own font, which every sheet embeds already
 * (`getEmbeddedFontCss`), and for an own font that is not there.
 */
export function cardFontCss(
  id: CardFontId,
  own?: OwnCardFont | null,
): Promise<string> {
  if (id === 'atkinson') return Promise.resolve('');
  if (id === 'own') {
    return Promise.resolve(
      own
        ? fontFace({ family: OWN_FAMILY, src: own.dataUrl, format: own.format })
        : '',
    );
  }
  const cached = cssCache.get(id);
  if (cached) return cached;
  const { family, files } = SHIPPED_FILES[id];
  const css = Promise.all(
    files.map(async ({ url, unicodeRange }) =>
      fontFace({
        family,
        src: `data:font/woff2;base64,${await fetchAsBase64(url)}`,
        unicodeRange,
      }),
    ),
  ).then((rules) => rules.join(''));
  // A failed fetch (offline) is forgotten, so the next drawing tries again.
  css.catch(() => cssCache.delete(id));
  cssCache.set(id, css);
  return css;
}

/**
 * The same rules with the shipped files linked rather than inlined, for the
 * export page's preview, which loads them like any page.
 */
export function cardFontPreviewCss(
  id: CardFontId,
  own?: OwnCardFont | null,
): string {
  if (id === 'atkinson') return '';
  if (id === 'own') {
    return own
      ? fontFace({ family: OWN_FAMILY, src: own.dataUrl, format: own.format })
      : '';
  }
  const { family, files } = SHIPPED_FILES[id];
  return files
    .map(({ url, unicodeRange }) =>
      fontFace({
        family,
        src: new URL(url, window.location.href).href,
        unicodeRange,
      }),
    )
    .join('');
}

/**
 * How a font runs, per em: the width of a text, and the heights the writing
 * lines follow — the x-height, the height of capitals and ascenders, and how
 * far a descender drops.
 */
export type CardFontMetrics = {
  width: (text: string) => number;
  xHeight: number;
  capHeight: number;
  descent: number;
};

const NARROW = /[ijlrtf.,'’:;!|Iı]/;
const WIDE = /[mwMWÆŒ]/;

/**
 * A guess where nothing can measure (a test without a canvas): letters at
 * about half an em, narrow and wide ones apart, capitals a little wider.
 */
export const ESTIMATED_CARD_METRICS: CardFontMetrics = {
  width: (text) =>
    Array.from(text).reduce(
      (sum, letter) =>
        sum +
        (letter === ' '
          ? 0.28
          : NARROW.test(letter)
            ? 0.28
            : WIDE.test(letter)
              ? 0.82
              : letter === letter.toUpperCase() &&
                  letter !== letter.toLowerCase()
                ? 0.66
                : 0.54),
      0,
    ),
  xHeight: 0.5,
  capHeight: 0.7,
  descent: 0.22,
};

let ownFace: FontFace | null = null;

async function addToPage(
  family: string,
  sources: readonly { src: string; unicodeRange?: string }[],
  replaceOwn: boolean,
): Promise<void> {
  const faces = sources.map(
    ({ src, unicodeRange }) =>
      new FontFace(
        family,
        `url(${src})`,
        unicodeRange ? { unicodeRange } : undefined,
      ),
  );
  await Promise.all(faces.map((face) => face.load()));
  if (replaceOwn) {
    // A new own font takes the family over from the one before it.
    if (ownFace) document.fonts.delete(ownFace);
    ownFace = faces[0] ?? null;
  }
  for (const face of faces) document.fonts.add(face);
}

const metricsCache = new Map<string, Promise<CardFontMetrics>>();

function measureWith(family: string): CardFontMetrics | null {
  const context = document.createElement('canvas').getContext('2d');
  if (!context) return null;
  const SIZE = 100;
  context.font = `${SIZE}px '${family}'`;
  const box = (text: string) => context.measureText(text);
  const xHeight = box('x').actualBoundingBoxAscent / SIZE;
  // Capitals and ascenders reach the top line alike.
  const capHeight = box('Hdklb').actualBoundingBoxAscent / SIZE;
  const descent = box('gjpqy').actualBoundingBoxDescent / SIZE;
  if (!(xHeight > 0 && capHeight > 0)) return null;
  return {
    width: (text) => box(text).width / SIZE,
    xHeight,
    capHeight,
    descent: descent > 0 ? descent : ESTIMATED_CARD_METRICS.descent,
  };
}

/**
 * Loads a card font into the page and measures it with a canvas, so the
 * names can be laid out before they are drawn; a guess where the browser
 * cannot (no `FontFace`, no canvas) or the font does not load.
 */
export function loadCardFontMetrics(
  id: CardFontId,
  own?: OwnCardFont | null,
): Promise<CardFontMetrics> {
  if (
    typeof document === 'undefined' ||
    typeof FontFace === 'undefined' ||
    (id === 'own' && !own)
  ) {
    return Promise.resolve(ESTIMATED_CARD_METRICS);
  }
  const key =
    id === 'own' && own
      ? `own:${own.dataUrl.length}:${own.dataUrl.slice(-48)}`
      : id;
  const cached = metricsCache.get(key);
  if (cached) return cached;

  const family =
    id === 'atkinson'
      ? 'Atkinson Hyperlegible Next Variable'
      : (familyOf(id) as string);
  const loading = (async () => {
    try {
      if (id === 'own' && own) {
        await addToPage(family, [{ src: own.dataUrl }], true);
      } else if (id !== 'atkinson') {
        const { files } = SHIPPED_FILES[id as keyof typeof SHIPPED_FILES];
        await addToPage(
          family,
          files.map(({ url, unicodeRange }) => ({ src: url, unicodeRange })),
          false,
        );
      } else {
        await document.fonts.load(`16px '${family}'`);
      }
      return measureWith(family) ?? ESTIMATED_CARD_METRICS;
    } catch (error) {
      logWarn('A card font did not load', { error, id }, 'cardFonts');
      metricsCache.delete(key);
      return ESTIMATED_CARD_METRICS;
    }
  })();
  metricsCache.set(key, loading);
  return loading;
}

/**
 * Whether a file is a font the browser can use: it is loaded once, under a
 * name of its own. Where the browser cannot tell (no `FontFace`), the name's
 * extension has to do.
 */
export async function isUsableFont(data: ArrayBuffer): Promise<boolean> {
  if (typeof FontFace === 'undefined') return true;
  try {
    await new FontFace('KP Card Probe', data).load();
    return true;
  } catch {
    return false;
  }
}
