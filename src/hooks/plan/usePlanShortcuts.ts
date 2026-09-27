// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useMemo } from 'react';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { isAnyDialogOpen } from '@/hooks/ui/useDialogLayer';

type PlanShortcutHandlers = {
  /** Off while another view owns the plan layer's keys. */
  enabled?: boolean;
  onSave: () => void;
  onExport: () => void;
  /** Only the table plan mixes; the circle has no mix of its own. */
  onMix?: () => void;
};

/**
 * The plan layer's shortcuts, the same for the table plan and the circle:
 * Ctrl/⌘+S saves, Ctrl/⌘+E opens the export and, where the view mixes,
 * Ctrl/⌘+Enter mixes.
 *
 * They used to live in the table editor alone, so in the circle — whose help
 * lists saving and exporting as well — Ctrl+S fell through to the browser's
 * "save page" dialog. Mixing moved off Ctrl/⌘+M, which minimises the window
 * on a Mac before the page ever sees the key.
 *
 * A dialog owns the keyboard while it is up, and a text field keeps its keys:
 * the plan's name field saves on Ctrl/⌘+S by itself (`PlanSavePanel`).
 */
export function usePlanShortcuts({
  enabled = true,
  onSave,
  onExport,
  onMix,
}: PlanShortcutHandlers) {
  const shortcuts = useMemo(() => {
    const map: Record<string, () => void> = {
      'ctrl+s': onSave,
      'cmd+s': onSave,
      'ctrl+e': onExport,
      'cmd+e': onExport,
    };
    if (onMix) {
      map['ctrl+enter'] = onMix;
      map['cmd+enter'] = onMix;
    }
    return map;
  }, [onExport, onMix, onSave]);

  useKeyboardShortcuts(shortcuts, {
    condition: () => enabled && !isAnyDialogOpen(),
  });
}
