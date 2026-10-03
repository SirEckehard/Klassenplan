// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { ToolRailProvider, useShellToolRail } from '@/contexts/ToolRailContext';

const EXPANDED_KEY = 'spg.sidebarExpanded';

const setWidth = (width: number): void => {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: width,
  });
  act(() => {
    window.dispatchEvent(new Event('resize'));
  });
};

const pointerIs = (coarse: boolean) =>
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches: coarse && query === '(pointer: coarse)',
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  });

const renderRail = () =>
  renderHook(() => useShellToolRail(), {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <ToolRailProvider>{children}</ToolRailProvider>
    ),
  });

describe('ToolRailProvider', () => {
  beforeEach(() => {
    localStorage.removeItem(EXPANDED_KEY);
  });

  afterEach(() => {
    localStorage.removeItem(EXPANDED_KEY);
    Reflect.deleteProperty(window, 'matchMedia');
    setWidth(1024);
  });

  // No tooltip explains an icon on a touch screen; a whiteboard has the
  // width for the labels.
  it('starts with labels on a wide touch screen', () => {
    pointerIs(true);
    setWidth(1920);

    expect(renderRail().result.current?.isExpanded).toBe(true);
  });

  it('starts as icons on an iPad in landscape', () => {
    pointerIs(true);
    setWidth(1180);

    expect(renderRail().result.current?.isExpanded).toBe(false);
  });

  it('starts as icons with a mouse, however wide', () => {
    pointerIs(false);
    setWidth(1920);

    expect(renderRail().result.current?.isExpanded).toBe(false);
  });

  it('keeps the choice the teacher made', () => {
    localStorage.setItem(EXPANDED_KEY, 'false');
    pointerIs(true);
    setWidth(1920);

    expect(renderRail().result.current?.isExpanded).toBe(false);
  });
});
