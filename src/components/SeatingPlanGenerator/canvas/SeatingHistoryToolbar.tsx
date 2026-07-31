// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import CanvasToolbar from '@/components/SeatingPlanGenerator/canvas/CanvasToolbar';
import { useSeatingAlgorithmContext } from '@/contexts/SeatingPlanContext';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

/**
 * Undo/redo for seating actions, including the Ctrl/Cmd+Z bindings.
 *
 * Table plan and circle share one history, so both views mount this and a
 * mis-drop in either can be taken back from either. Reads the actions from the
 * algorithm context instead of props — the views it sits in are already the
 * two most prop-heavy components in the app.
 */
export default function SeatingHistoryToolbar() {
  const { undoSeating, redoSeating, canUndoSeating, canRedoSeating } =
    useSeatingAlgorithmContext();

  useKeyboardShortcuts({
    'ctrl+z': undoSeating,
    'cmd+z': undoSeating,
    'ctrl+shift+z': redoSeating,
    'cmd+shift+z': redoSeating,
    'ctrl+y': redoSeating,
    'cmd+y': redoSeating,
  });

  return (
    <CanvasToolbar
      onUndo={undoSeating}
      canUndo={canUndoSeating}
      onRedo={redoSeating}
      canRedo={canRedoSeating}
    />
  );
}
