// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const downloadBlobMock = vi.hoisted(() => vi.fn(async () => {}));
const renderSvgToPngBlobMock = vi.hoisted(() =>
  vi.fn(async () => new Blob(['png'], { type: 'image/png' })),
);

vi.mock('@/utils', async () => {
  const actual = await vi.importActual<typeof import('@/utils')>('@/utils');
  return { ...actual, downloadBlob: downloadBlobMock };
});

vi.mock('@/utils/export/svgRasterizer', async () => {
  const actual = await vi.importActual<
    typeof import('@/utils/export/svgRasterizer')
  >('@/utils/export/svgRasterizer');
  return {
    ...actual,
    getDmSansBase64: vi.fn(async () => 'Zm9udA=='),
    renderSvgToPngBlob: renderSvgToPngBlobMock,
  };
});

const { exportSvgAsPng, exportSvgAsFile } =
  await import('@/utils/export/imageExportFunctions');

const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" />';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-07-31T10:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
  downloadBlobMock.mockClear();
  renderSvgToPngBlobMock.mockClear();
});

describe('exportSvgAsPng', () => {
  it('rasterizes at A4 proportions for the given orientation', async () => {
    await exportSvgAsPng(SVG, 'Klasse 5a', 'landscape');

    const [, width, height] = renderSvgToPngBlobMock.mock
      .calls[0] as unknown as [string, number, number];
    expect(width).toBeGreaterThan(height);
    expect(width / height).toBeCloseTo(297 / 210, 2);
  });

  it('swaps the dimensions in portrait', async () => {
    await exportSvgAsPng(SVG, 'Klasse 5a', 'portrait');

    const [, width, height] = renderSvgToPngBlobMock.mock
      .calls[0] as unknown as [string, number, number];
    expect(height).toBeGreaterThan(width);
    expect(height / width).toBeCloseTo(297 / 210, 2);
  });

  it('downloads a PNG named after the plan and the date', async () => {
    await exportSvgAsPng(SVG, 'Klasse 5a', 'landscape');

    expect(downloadBlobMock).toHaveBeenCalledTimes(1);
    const [blob, filename, mimeType] = downloadBlobMock.mock
      .calls[0] as unknown as [Blob, string, string];
    expect(blob).toBeInstanceOf(Blob);
    expect(filename).toBe('Klasse 5a_2026-07-31.png');
    expect(mimeType).toBe('image/png');
  });

  it('reports a wrapped error when the markup is not valid SVG', async () => {
    await expect(
      exportSvgAsPng('<not-svg>', 'Klasse 5a', 'landscape'),
    ).rejects.toThrow(/PNG export failed/);
    expect(downloadBlobMock).not.toHaveBeenCalled();
  });
});

describe('exportSvgAsFile', () => {
  it('embeds the font so the file renders without DM Sans installed', async () => {
    await exportSvgAsFile(SVG, 'Klasse 5a');

    const [content, filename, mimeType] = downloadBlobMock.mock
      .calls[0] as unknown as [string, string, string];
    expect(content).toContain('@font-face');
    expect(content).toContain('data:font/woff2;base64,');
    expect(filename).toBe('Klasse 5a_2026-07-31.svg');
    expect(mimeType).toContain('image/svg+xml');
  });

  it('refuses to write invalid markup', async () => {
    await expect(exportSvgAsFile('<not-svg>', 'Klasse 5a')).rejects.toThrow(
      /SVG export failed/,
    );
    expect(downloadBlobMock).not.toHaveBeenCalled();
  });
});
