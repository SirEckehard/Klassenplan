// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  CANVAS_COVER_ATTRIBUTE,
  isCanvasCovered,
} from '@/utils/canvas/canvasCover';

describe('isCanvasCovered', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  const hit = (element: Element | null) => {
    // jsdom lays nothing out, so the hit test is the browser's to stand in for.
    Object.defineProperty(document, 'elementFromPoint', {
      configurable: true,
      value: vi.fn(() => element),
    });
  };

  // A tap on the tray at the status bar put a table under the finger as well.
  it('is true over what lies over the canvas, inside it too', () => {
    const tray = document.createElement('div');
    tray.setAttribute(CANVAS_COVER_ATTRIBUTE, '');
    const piece = document.createElement('button');
    tray.appendChild(piece);
    document.body.appendChild(tray);
    hit(piece);

    expect(isCanvasCovered(10, 10)).toBe(true);
  });

  it('is false over the canvas itself and where nothing is hit', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    document.body.appendChild(svg);
    hit(svg);
    expect(isCanvasCovered(10, 10)).toBe(false);

    hit(null);
    expect(isCanvasCovered(10, 10)).toBe(false);
  });
});
