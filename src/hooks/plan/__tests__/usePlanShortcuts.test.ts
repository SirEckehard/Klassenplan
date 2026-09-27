// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { usePlanShortcuts } from '../usePlanShortcuts';
import {
  resetDialogLayersForTests,
  useDialogLayer,
} from '@/hooks/ui/useDialogLayer';

const press = (init: KeyboardEventInit) =>
  window.dispatchEvent(new KeyboardEvent('keydown', init));

const handlers = () => ({
  onSave: vi.fn(),
  onExport: vi.fn(),
  onMix: vi.fn(),
});

afterEach(() => {
  resetDialogLayersForTests();
});

describe('usePlanShortcuts', () => {
  it('saves, exports and mixes with Ctrl on Windows and ⌘ on a Mac', () => {
    const calls = handlers();
    renderHook(() => usePlanShortcuts(calls));

    press({ key: 's', ctrlKey: true });
    press({ key: 's', metaKey: true });
    press({ key: 'e', ctrlKey: true });
    press({ key: 'Enter', metaKey: true });

    expect(calls.onSave).toHaveBeenCalledTimes(2);
    expect(calls.onExport).toHaveBeenCalledTimes(1);
    expect(calls.onMix).toHaveBeenCalledTimes(1);
  });

  // ⌘+M minimises the window on a Mac before the page sees it.
  it('no longer mixes on Ctrl/⌘+M', () => {
    const calls = handlers();
    renderHook(() => usePlanShortcuts(calls));

    press({ key: 'm', ctrlKey: true });
    press({ key: 'm', metaKey: true });

    expect(calls.onMix).not.toHaveBeenCalled();
  });

  it('leaves Ctrl/⌘+Enter alone where the view does not mix', () => {
    const { onSave, onExport } = handlers();
    renderHook(() => usePlanShortcuts({ onSave, onExport }));

    press({ key: 'Enter', ctrlKey: true });
    press({ key: 's', ctrlKey: true });

    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('stays silent while another view owns the keys', () => {
    const calls = handlers();
    renderHook(() => usePlanShortcuts({ ...calls, enabled: false }));

    press({ key: 's', ctrlKey: true });
    press({ key: 'e', ctrlKey: true });

    expect(calls.onSave).not.toHaveBeenCalled();
    expect(calls.onExport).not.toHaveBeenCalled();
  });

  it('stands down while a dialog is open', () => {
    const calls = handlers();
    renderHook(() => {
      useDialogLayer(true);
      usePlanShortcuts(calls);
    });

    press({ key: 's', ctrlKey: true });
    press({ key: 'Enter', ctrlKey: true });

    expect(calls.onSave).not.toHaveBeenCalled();
    expect(calls.onMix).not.toHaveBeenCalled();
  });
});
