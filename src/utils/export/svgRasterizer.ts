// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import dmSansWoff2Url from '@fontsource-variable/dm-sans/files/dm-sans-latin-wght-normal.woff2?url';

/**
 * Shared SVG → raster pipeline for every file export.
 *
 * The PDF export and the PNG export must produce pixel-identical output, so
 * font embedding and rasterization live here once instead of in each exporter.
 */

let cachedFontBase64: string | null = null;

/**
 * DM Sans as base64. The rasterizing browser resolves no external requests for
 * the detached SVG image, so the font has to travel inside the markup.
 */
export async function getDmSansBase64(): Promise<string> {
  if (cachedFontBase64) return cachedFontBase64;
  const res = await fetch(dmSansWoff2Url);
  const buf = await res.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  cachedFontBase64 = btoa(binary);
  return cachedFontBase64;
}

/** Inline an `@font-face` rule carrying the embedded font into the SVG. */
export function injectFontIntoSvg(svg: string, base64: string): string {
  const style = `<defs><style>@font-face{font-family:'DM Sans Variable';src:url('data:font/woff2;base64,${base64}');font-weight:100 900;font-style:normal;}</style></defs>`;
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
 */
async function drawSvgToCanvas(
  svgMarkup: string,
  widthPx: number,
  heightPx: number,
): Promise<HTMLCanvasElement> {
  const fontBase64 = await getDmSansBase64();
  const svgWithFont = injectFontIntoSvg(svgMarkup, fontBase64);

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
        const context = canvas.getContext('2d');
        if (!context) {
          reject(new Error('Canvas context could not be created.'));
          return;
        }
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = 'high';
        context.clearRect(0, 0, widthPx, heightPx);
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

/** Rasterize SVG markup into a PNG Data URL (used by the PDF export). */
export async function renderSvgToPngDataUrl(
  svgMarkup: string,
  widthPx: number,
  heightPx: number,
): Promise<string> {
  const canvas = await drawSvgToCanvas(svgMarkup, widthPx, heightPx);
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
