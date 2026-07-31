// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { downloadBlob, logError } from '@/utils';
import {
  extractSvgElement,
  getDmSansBase64,
  injectFontIntoSvg,
  renderSvgToPngBlob,
} from '@/utils/export/svgRasterizer';

/**
 * Image exports of the seating plan, for embedding into parent letters,
 * newsletters or an LMS where a PDF would be unwieldy.
 *
 * Both functions take the very markup the export preview renders, so what the
 * user downloads is what the user saw.
 */

/** Long edge of the exported PNG, in pixels. ~200 dpi across an A4 page. */
const PNG_LONG_EDGE_PX = 2400;

/** A4 aspect ratio (297/210), matching the PDF page the preview mirrors. */
const A4_RATIO = 297 / 210;

const PNG_DIMENSIONS: Record<
  'landscape' | 'portrait',
  { width: number; height: number }
> = {
  landscape: {
    width: PNG_LONG_EDGE_PX,
    height: Math.round(PNG_LONG_EDGE_PX / A4_RATIO),
  },
  portrait: {
    width: Math.round(PNG_LONG_EDGE_PX / A4_RATIO),
    height: PNG_LONG_EDGE_PX,
  },
};

const withDateSuffix = (filename: string, extension: string): string =>
  `${filename}_${new Date().toISOString().split('T')[0]}.${extension}`;

/**
 * Rasterize the export markup and download it as PNG.
 *
 * @param svgMarkup Rendered export SVG (photos already inlined as Data URLs).
 * @param filename Base name without extension; the date is appended.
 * @param orientation Page orientation the preview was rendered for.
 */
export async function exportSvgAsPng(
  svgMarkup: string,
  filename: string,
  orientation: 'landscape' | 'portrait',
): Promise<void> {
  try {
    const { width, height } = PNG_DIMENSIONS[orientation];
    const svgElement = extractSvgElement(svgMarkup);
    svgElement.setAttribute('width', `${width}px`);
    svgElement.setAttribute('height', `${height}px`);
    svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');

    const serialized = new XMLSerializer().serializeToString(svgElement);
    const blob = await renderSvgToPngBlob(serialized, width, height);

    await downloadBlob(blob, withDateSuffix(filename, 'png'), 'image/png', {
      logContext: 'exportSvgAsPng',
      filePickerTypes: [
        {
          description: 'PNG',
          accept: { 'image/png': ['.png'] },
        },
      ],
    });
  } catch (error) {
    logError('PNG export failed', { error, filename }, 'imageExportFunctions');
    throw new Error('PNG export failed', { cause: error });
  }
}

/**
 * Download the export markup as a standalone SVG file.
 *
 * The font is embedded like in the raster exports so the file renders the same
 * on a machine without DM Sans installed. Student photos are already inlined,
 * which is what makes the file self-contained — and sizeable.
 */
export async function exportSvgAsFile(
  svgMarkup: string,
  filename: string,
): Promise<void> {
  try {
    // Validate before writing: a broken SVG should fail here, not on the disk.
    extractSvgElement(svgMarkup);
    const fontBase64 = await getDmSansBase64();
    const withFont = injectFontIntoSvg(svgMarkup, fontBase64);

    await downloadBlob(
      withFont,
      withDateSuffix(filename, 'svg'),
      'image/svg+xml;charset=utf-8',
      {
        logContext: 'exportSvgAsFile',
        filePickerTypes: [
          {
            description: 'SVG',
            accept: { 'image/svg+xml': ['.svg'] },
          },
        ],
      },
    );
  } catch (error) {
    logError('SVG export failed', { error, filename }, 'imageExportFunctions');
    throw new Error('SVG export failed', { cause: error });
  }
}
