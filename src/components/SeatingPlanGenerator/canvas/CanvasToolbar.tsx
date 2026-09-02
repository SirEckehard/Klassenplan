// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import { mutedIconButtonClass } from '@/utils';
import UndoRedoButtons from '@/components/ui/buttons/UndoRedoButtons';

interface CanvasToolbarProps {
  /**
   * Undo callback
   */
  onUndo: () => void;
  /**
   * Whether undo is available (history length > 0)
   */
  canUndo: boolean;
  /**
   * Redo callback
   */
  onRedo: () => void;
  /**
   * Whether redo is available (redo stack not empty)
   */
  canRedo: boolean;
}

const canvasButtonClass = `${mutedIconButtonClass} h-12 w-12 text-gray-700 transition disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-100`;

/**
 * CanvasToolbar - undo/redo pair for a canvas overlay.
 *
 * Renders as a plain flex group; the caller positions it. Both the layout
 * editor and the seating editor place it in the canvas' top-left corner, but
 * the seating editor lines further actions up next to it in the same row.
 *
 * Touch-optimized sizing (min 44x44px).
 */
const CanvasToolbar: React.FC<CanvasToolbarProps> = ({
  onUndo,
  canUndo,
  onRedo,
  canRedo,
}) => {
  const { t } = useTranslation('generator');
  return (
    <UndoRedoButtons
      onUndo={onUndo}
      canUndo={canUndo}
      onRedo={onRedo}
      canRedo={canRedo}
      undoTitle={t('canvas.undo', 'Rückgängig (Strg/Cmd+Z)')}
      redoTitle={t('canvas.redo', 'Wiederherstellen (Strg/Cmd+Y)')}
      undoLabel={t('canvas.undoLabel', 'Letzte Aktion rückgängig machen')}
      redoLabel={t('canvas.redoLabel', 'Letzte Aktion wiederherstellen')}
      buttonClass={canvasButtonClass}
    />
  );
};

export default CanvasToolbar;
