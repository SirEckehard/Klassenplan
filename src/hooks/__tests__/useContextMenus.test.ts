// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, it, expect } from 'vitest';
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
});
