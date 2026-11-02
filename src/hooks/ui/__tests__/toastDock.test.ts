// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  measureShellDock,
  measureToastDock,
  registerToastDock,
} from '@/hooks/ui/toastDock';
import { isBreakpointUp } from '@/hooks/ui/useBreakpoint';

vi.mock('@/hooks/ui/useBreakpoint', () => ({
  isBreakpointUp: vi.fn(),
  readRemPx: () => 16,
}));

/** An element of the frame, laid out where jsdom lays out nothing. */
const part = (attribute: string, rect: Partial<DOMRect>, parent: Element) => {
  const element = document.createElement('div');
  element.setAttribute(attribute, '');
  const full = { left: 0, top: 0, width: 0, height: 0, ...rect };
  element.getBoundingClientRect = () =>
    ({
      ...full,
      right: full.left + full.width,
      bottom: full.top + full.height,
    }) as DOMRect;
  parent.appendChild(element);
  return element;
};

/** A 1440 × 900 window's shell: header, toolbar, stage, inspector, bar. */
const desktopFrame = () => {
  const frame = document.createElement('div');
  part(
    'data-shell-toolbar',
    { left: 0, top: 56, width: 208, height: 783 },
    frame,
  );
  part(
    'data-shell-inspector',
    { left: 1120, top: 56, width: 320, height: 783 },
    frame,
  );
  const bar = part(
    'data-shell-status-bar',
    { left: 0, top: 839, width: 1440, height: 61 },
    frame,
  );
  return { frame, bar };
};

let windowWidth = 1440;

afterEach(() => {
  vi.mocked(isBreakpointUp).mockReset();
  windowWidth = 1440;
});

describe('measureShellDock', () => {
  Object.defineProperty(document.documentElement, 'clientWidth', {
    configurable: true,
    get: () => windowWidth,
  });

  // The same insets on both sides: the card stands over the bar's middle, and
  // an inspector opening or closing does not move it.
  it('centres on the window, clear of the toolbar and the inspector', () => {
    vi.mocked(isBreakpointUp).mockReturnValue(true);
    const { frame } = desktopFrame();

    expect(measureShellDock(frame)).toEqual({
      left: 320,
      right: 320,
      bottom: 61 + 16,
    });
  });

  // Over a column the toast lay over its head, where a teacher was typing.
  it('takes the stage where the middle leaves a card too little room', () => {
    vi.mocked(isBreakpointUp).mockReturnValue(true);
    windowWidth = 900;
    const frame = document.createElement('div');
    part('data-shell-toolbar', { left: 0, width: 60, height: 700 }, frame);
    part('data-shell-inspector', { left: 580, width: 320, height: 700 }, frame);

    expect(measureShellDock(frame)).toMatchObject({ left: 60, right: 320 });
  });

  it('takes the window below md and stands over what hangs from the bar', () => {
    vi.mocked(isBreakpointUp).mockReturnValue(false);
    const { frame, bar } = desktopFrame();
    // "Mischen", hanging 12px over the bar's middle.
    part(
      'data-status-bar-hang',
      { left: 600, top: 783, width: 132, height: 44 },
      bar,
    );

    expect(measureShellDock(frame)).toEqual({
      left: 0,
      right: 0,
      bottom: 900 - 783 + 12,
    });
  });

  it('ignores a column folded away', () => {
    vi.mocked(isBreakpointUp).mockReturnValue(true);
    const frame = document.createElement('div');
    part('data-shell-inspector', { left: 1120, width: 0, height: 0 }, frame);

    expect(measureShellDock(frame).right).toBe(0);
  });
});

describe('measureToastDock', () => {
  it('has nothing to say without a shell, and gives the measure back', () => {
    expect(measureToastDock()).toBeNull();
    const unregister = registerToastDock(() => ({
      left: 1,
      right: 2,
      bottom: 3,
    }));
    expect(measureToastDock()).toEqual({ left: 1, right: 2, bottom: 3 });
    unregister();
    expect(measureToastDock()).toBeNull();
  });
});
