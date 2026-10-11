// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/export/svgRasterizer', () => ({
  getEmbeddedFontCss: vi.fn(async () => '@font-face{font-family:Test;}'),
}));

import { buildPrintDocument, printSheets } from '@/services/export/printSheets';

const options = {
  lang: 'de',
  title: 'Plan <A>',
};
const input = { ...options, fontCss: '@font-face{font-family:Test;}' };

describe('buildPrintDocument', () => {
  it('sets the page to the sheet’s paper and orientation, without margins', () => {
    const landscape = buildPrintDocument(['<svg/>'], 'landscape', input);
    const portrait = buildPrintDocument(['<svg/>'], 'portrait', input);

    expect(landscape).toContain('@page { size: 297mm 210mm; margin: 0; }');
    expect(portrait).toContain('@page { size: 210mm 297mm; margin: 0; }');
    // The sheet in millimetres: Chrome resolves viewport units against its
    // default portrait page before it applies a landscape `@page`.
    expect(landscape).toContain('width: 297mm;');
    expect(landscape).not.toMatch(/\d+v[wh]/);
  });

  it('gives every page a sheet of its own and breaks only between them', () => {
    const html = buildPrintDocument(
      ['<svg id="one"/>', '<svg id="two"/>'],
      'portrait',
      input,
    );

    expect(html.match(/<div class="sheet">/g)).toHaveLength(2);
    expect(html).toContain('<div class="sheet"><svg id="one"/></div>');
    expect(html).toContain('.sheet + .sheet');
    expect(html).not.toContain('break-after');
  });

  it('names the document for the dialog, escapes the name and carries the font', () => {
    const html = buildPrintDocument(['<svg/>'], 'portrait', input);

    expect(html).toContain('<html lang="de">');
    expect(html).toContain('<title>Plan &lt;A&gt;</title>');
    expect(html).toContain('@font-face{font-family:Test;}');
  });
});

describe('printSheets', () => {
  const userAgent = navigator.userAgent;

  afterEach(() => {
    Object.defineProperty(navigator, 'userAgent', {
      value: userAgent,
      configurable: true,
    });
    document.body.innerHTML = '';
  });

  it('leaves iOS to the PDF, whose frames print the whole page', async () => {
    Object.defineProperty(navigator, 'userAgent', {
      value:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15',
      configurable: true,
    });

    await expect(printSheets(['<svg/>'], 'portrait', options)).resolves.toBe(
      false,
    );
    expect(document.querySelector('iframe')).toBeNull();
  });

  it('prints from a hidden frame and keeps it out of the accessibility tree', async () => {
    const print = vi.fn();
    const appendChild = document.body.appendChild.bind(document.body);
    vi.spyOn(document.body, 'appendChild').mockImplementation((node) => {
      const appended = appendChild(node);
      if (node instanceof HTMLIFrameElement) {
        Object.defineProperty(node.contentWindow, 'print', { value: print });
        Object.defineProperty(node.contentWindow, 'focus', { value: vi.fn() });
        node.dispatchEvent(new Event('load'));
      }
      return appended;
    });

    await expect(printSheets(['<svg/>'], 'landscape', options)).resolves.toBe(
      true,
    );

    const frame = document.querySelector('iframe');
    expect(frame?.getAttribute('aria-hidden')).toBe('true');
    expect(frame?.getAttribute('srcdoc')).toContain('297mm 210mm');
    expect(print).toHaveBeenCalledTimes(1);
    vi.restoreAllMocks();
  });
});
