// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { FONT_SUBSETS, fontFaceRule } from './fontSubsets';

/**
 * Shared SVG → raster pipeline for every file export.
 *
 * The PDF export and the PNG export must produce pixel-identical output, so
 * font embedding and rasterization live here once instead of in each exporter.
 */

let cachedFontCss: string | null = null;

const fetchAsBase64 = async (url: string): Promise<string> => {
  const res = await fetch(url);
  const bytes = new Uint8Array(await res.arrayBuffer());
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

/**
 * The UI font as `@font-face` rules with the files inlined. The rasterizing
 * browser resolves no external requests for the detached SVG image, so the
 * font has to travel inside the markup.
 */
export async function getEmbeddedFontCss(): Promise<string> {
  if (cachedFontCss) return cachedFontCss;
  const faces = await Promise.all(
    FONT_SUBSETS.map(async ({ url, unicodeRange }) =>
      fontFaceRule(
        `data:font/woff2;base64,${await fetchAsBase64(url)}`,
        unicodeRange,
      ),
    ),
  );
  cachedFontCss = faces.join('');
  return cachedFontCss;
}

/** Inline the embedded font's `@font-face` rules into the SVG. */
export function injectFontIntoSvg(svg: string, fontCss: string): string {
  const style = `<defs><style>${fontCss}</style></defs>`;
  return svg.replace(/(<svg[^>]*>)/, `$1${style}`);
}

/**
 * Parse export markup into a detached `<svg>` element.
 * @throws if the markup is not valid SVG or no document is available.
 */
export function extractSvgElement(svgMarkup: string): SVGSVGElement {
  if (typeof document === 'undefined') {
    throw new Error('Export is only available in the browser.');
  }

  const container = document.createElement('div');
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgMarkup, 'image/svg+xml');
  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    throw new Error('SVG content could not be parsed.');
  }
  container.appendChild(doc.documentElement);
  const svg = container.querySelector('svg');
  if (!svg) {
    throw new Error('SVG content could not be found.');
  }
  return svg.cloneNode(true) as SVGSVGElement;
}

/**
 * Draw SVG markup onto a canvas at the given pixel size.
 *
 * Photos have to be embedded as Data URLs beforehand (see
 * `buildPhotoDataUrlMap`) — an object URL would taint the canvas and make
 * every read below throw a security error.
 *
 * `background` paints an opaque backdrop first. Without it the canvas keeps its
 * alpha channel, which every consumer then has to carry along (the PDF export
 * would need a full-page soft mask for it).
 */
async function drawSvgToCanvas(
  svgMarkup: string,
  widthPx: number,
  heightPx: number,
  background?: string,
): Promise<HTMLCanvasElement> {
  const fontCss = await getEmbeddedFontCss();
  const svgWithFont = injectFontIntoSvg(svgMarkup, fontCss);

  return new Promise((resolve, reject) => {
    const blob = new Blob([svgWithFont], {
      type: 'image/svg+xml;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const image = new Image();

    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = widthPx;
        canvas.height = heightPx;
        // An opaque context lets the browser encode the PNG without an alpha
        // channel at all, which keeps the PDF free of a soft mask.
        const context = canvas.getContext('2d', {
          alpha: background === undefined,
        });
        if (!context) {
          reject(new Error('Canvas context could not be created.'));
          return;
        }
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = 'high';
        if (background === undefined) {
          context.clearRect(0, 0, widthPx, heightPx);
        } else {
          context.fillStyle = background;
          context.fillRect(0, 0, widthPx, heightPx);
        }
        context.drawImage(image, 0, 0, widthPx, heightPx);
        resolve(canvas);
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      } finally {
        URL.revokeObjectURL(url);
      }
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('SVG could not be loaded.'));
    };

    image.src = url;
  });
}

/**
 * Rasterize SVG markup into a lossless PNG Data URL (used by the PDF export).
 *
 * @param background Optional opaque backdrop, e.g. `'#ffffff'` for print.
 */
export async function renderSvgToPngDataUrl(
  svgMarkup: string,
  widthPx: number,
  heightPx: number,
  background?: string,
): Promise<string> {
  const canvas = await drawSvgToCanvas(
    svgMarkup,
    widthPx,
    heightPx,
    background,
  );
  return canvas.toDataURL('image/png', 1);
}

/**
 * Rasterize SVG markup into a PNG Blob.
 * Preferred for downloads — no multi-megabyte Data URL string in memory.
 */
export async function renderSvgToPngBlob(
  svgMarkup: string,
  widthPx: number,
  heightPx: number,
): Promise<Blob> {
  const canvas = await drawSvgToCanvas(svgMarkup, widthPx, heightPx);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }
      reject(new Error('PNG could not be created from the canvas.'));
    }, 'image/png');
  });
}
