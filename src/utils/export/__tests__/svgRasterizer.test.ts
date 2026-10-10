// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getEmbeddedFontCss, injectFontIntoSvg } from '../svgRasterizer';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getEmbeddedFontCss', () => {
  it('carries the Latin Extended letters along with the Latin ones', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(new Uint8Array([1, 2, 3]))),
    );

    const css = await getEmbeddedFontCss();

    const faces = css.match(/@font-face\{[^}]*\}/g) ?? [];
    expect(faces).toHaveLength(2);
    // ğ, ş and ł lie in the extended range, the umlauts in the basic one.
    expect(faces[0]).toContain('unicode-range:U+0100-02BA');
    expect(faces[1]).toContain('unicode-range:U+0000-00FF');
    for (const face of faces) {
      expect(face).toContain("src:url('data:font/woff2;base64,AQID')");
    }
  });
});

describe('injectFontIntoSvg', () => {
  it('puts the rules first into the SVG', () => {
    const svg = injectFontIntoSvg(
      '<svg xmlns="http://www.w3.org/2000/svg"><rect /></svg>',
      '@font-face{}',
    );

    expect(svg).toBe(
      '<svg xmlns="http://www.w3.org/2000/svg"><defs><style>@font-face{}</style></defs><rect /></svg>',
    );
  });
});
