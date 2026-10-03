// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { afterEach, describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import { useContextMenus } from '../../hooks/useContextMenus';

describe('useContextMenus', () => {
  it('closes the feature context menu when pressing Escape', () => {
    const { result, unmount } = renderHook(() => useContextMenus());

    act(() => {
      result.current.openFeatureContextMenu({
        featureId: 'podium',
        clientX: 10,
        clientY: 20,
        pointerType: 'mouse',
        trigger: 'contextmenu',
      });
    });

    expect(result.current.featureContextMenu).not.toBeNull();

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });

    expect(result.current.featureContextMenu).toBeNull();
    expect(result.current.tableContextMenu).toBeNull();
    expect(result.current.canvasContextMenu).toBeNull();

    unmount();
  });

  describe('a menu opened by a long press', () => {
    const longPressMenu = {
      tableIndex: 2,
      clientX: 40,
      clientY: 60,
      pointerType: 'touch' as const,
      trigger: 'longpress' as const,
    };

    afterEach(() => {
      vi.useRealTimers();
      document.body.innerHTML = '';
    });

    it('survives the click the lifting finger sends', () => {
      const { result, unmount } = renderHook(() => useContextMenus());
      act(() => {
        result.current.openTableContextMenu(longPressMenu);
      });

      // The finger lifts over the table it held, and the browser clicks there.
      const table = document.createElement('div');
      document.body.append(table);
      const releaseClick = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        clientX: 42,
        clientY: 61,
      });
      act(() => {
        window.dispatchEvent(
          new PointerEvent('pointerup', { clientX: 40, clientY: 60 }),
        );
        table.dispatchEvent(releaseClick);
      });

      expect(releaseClick.defaultPrevented).toBe(true);
      expect(result.current.tableContextMenu).not.toBeNull();

      unmount();
    });

    it('lets a quick tap elsewhere through', () => {
      const { result, unmount } = renderHook(() => useContextMenus());
      act(() => {
        result.current.openTableContextMenu(longPressMenu);
      });
      const tap = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        clientX: 300,
        clientY: 60,
      });

      act(() => {
        window.dispatchEvent(
          new PointerEvent('pointerup', { clientX: 40, clientY: 60 }),
        );
        document.body.dispatchEvent(tap);
      });

      expect(tap.defaultPrevented).toBe(false);
      expect(result.current.tableContextMenu).toBeNull();

      unmount();
    });

    it('closes on a later tap beside it', () => {
      vi.useFakeTimers();
      const { result, unmount } = renderHook(() => useContextMenus());
      act(() => {
        result.current.openTableContextMenu(longPressMenu);
      });
      act(() => {
        window.dispatchEvent(new PointerEvent('pointerup'));
        vi.advanceTimersByTime(1000);
      });

      act(() => {
        document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });

      expect(result.current.tableContextMenu).toBeNull();

      unmount();
    });

    it('stays open on a tap inside the menu that is no entry', () => {
      const { result, unmount } = renderHook(() => useContextMenus());
      act(() => {
        result.current.openTableContextMenu({
          ...longPressMenu,
          trigger: 'contextmenu',
          pointerType: 'mouse',
        });
      });
      const menu = document.createElement('div');
      menu.setAttribute('data-context-action-menu', '');
      document.body.append(menu);

      act(() => {
        menu.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });

      expect(result.current.tableContextMenu).not.toBeNull();

      unmount();
    });
  });
});
