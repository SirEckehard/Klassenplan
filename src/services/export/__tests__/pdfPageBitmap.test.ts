// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * A PDF page carries its bitmap as red, green and blue, deflated by the
 * browser before jsPDF sees it. jsPDF knows no such format: the export
 * registers one through jsPDF's own way of finding an image's processor,
 * which an update of jsPDF could change. So this runs the real jsPDF and
 * reads the file it writes.
 */
import { deflateSync } from 'node:zlib';
import { describe, expect, it, vi } from 'vitest';

// Two pixels, red and blue, packed as the rasterizer packs a page.
const PIXELS = new Uint8Array([255, 0, 0, 0, 0, 255]);
const PACKED = new Uint8Array(deflateSync(PIXELS));

vi.mock('@/utils/export/svgRasterizer', () => ({
  extractSvgElement: () =>
    document.createElementNS('http://www.w3.org/2000/svg', 'svg'),
  renderSvgToDeflatedRgb: vi.fn(async () => PACKED.slice()),
}));

import { generatePdfBlob } from '@/services/export/pdfExportFunctions';

/** The PDF as text, its binary streams one character per byte. */
async function pdfText(blob: Blob): Promise<string> {
  return new TextDecoder('latin1').decode(await blob.arrayBuffer());
}

describe('the page bitmap of a PDF', () => {
  it('goes in as an RGB image that is deflated once, by the browser', async () => {
    const text = await pdfText(await generatePdfBlob('<svg/>', 'portrait'));

    const image = text.match(/<<[^>]*\/Subtype \/Image[\s\S]*?>>\s*stream/);
    expect(image?.[0]).toContain('/ColorSpace /DeviceRGB');
    expect(image?.[0]).toContain('/BitsPerComponent 8');
    expect(image?.[0]).toContain('/Filter /FlateDecode');
    // A4 at 300 dpi; no predictor and no soft mask to undo.
    expect(image?.[0]).toContain('/Width 2480');
    expect(image?.[0]).toContain('/Height 3508');
    expect(image?.[0]).not.toContain('/DecodeParms');
    expect(image?.[0]).not.toContain('/SMask');

    // The stream is the rasterizer's bytes as they came, not packed again.
    const packed = new TextDecoder('latin1').decode(PACKED);
    expect(text).toContain(`stream\n${packed}\nendstream`);
  });

  it('gives every page an image of its own', async () => {
    const text = await pdfText(
      await generatePdfBlob(['<svg/>', '<svg/>', '<svg/>'], 'landscape'),
    );

    expect(text.match(/\/Subtype \/Image/g)).toHaveLength(3);
    expect(text).toContain('/Width 3508');
  });
});
