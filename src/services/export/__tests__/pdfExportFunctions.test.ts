// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, expect, it, vi, beforeEach } from 'vitest';

const pdf = vi.hoisted(() => ({
  addImage: vi.fn(),
  addPage: vi.fn(),
  output: vi.fn(() => new Blob()),
  save: vi.fn(),
}));

vi.mock('jspdf', () => ({
  jsPDF: vi.fn(function jsPDF() {
    return pdf;
  }),
}));

vi.mock('@/utils/export/svgRasterizer', () => ({
  extractSvgElement: () =>
    document.createElementNS('http://www.w3.org/2000/svg', 'svg'),
  renderSvgToPngDataUrl: vi.fn(async () => 'data:image/png;base64,'),
}));

vi.mock('@/utils/ui/downloadConfirmation', () => ({
  confirmDownload: vi.fn(async () => true),
}));

vi.mock('@/services/export/sceneRenderer', () => ({
  renderSceneSvg: vi.fn(),
  renderCircleSvg: vi.fn(),
  renderNoteListSvgPages: vi.fn(async () => ['<svg/>', '<svg/>', '<svg/>']),
}));

import {
  exportNoteListToPdf,
  generatePdfBlob,
} from '@/services/export/pdfExportFunctions';
import { DEFAULT_NOTE_LIST_SETTINGS } from '@/utils/ui/noteList';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('generatePdfBlob', () => {
  it('puts a single sheet on one page', async () => {
    await generatePdfBlob('<svg/>', 'portrait');

    expect(pdf.addImage).toHaveBeenCalledTimes(1);
    expect(pdf.addPage).not.toHaveBeenCalled();
  });

  it('gives every page of a list a page of its own', async () => {
    await generatePdfBlob(['<svg/>', '<svg/>'], 'landscape');

    expect(pdf.addImage).toHaveBeenCalledTimes(2);
    expect(pdf.addPage).toHaveBeenCalledTimes(1);
    expect(pdf.addPage).toHaveBeenCalledWith('a4', 'landscape');
  });
});

describe('exportNoteListToPdf', () => {
  it('saves every page of the list in one file', async () => {
    await exportNoteListToPdf(
      {
        students: [],
        entries: [],
        settings: DEFAULT_NOTE_LIST_SETTINGS,
        title: 'Klasse 7b',
      },
      'Notizliste_7b',
    );

    expect(pdf.addImage).toHaveBeenCalledTimes(3);
    expect(pdf.save).toHaveBeenCalledWith(
      expect.stringMatching(/^Notizliste_7b_\d{4}-\d{2}-\d{2}\.pdf$/),
    );
  });
});
