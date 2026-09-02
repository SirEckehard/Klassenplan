// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { ArrowUUpLeftIcon, ArrowUUpRightIcon } from '@phosphor-icons/react';

interface UndoRedoButtonsProps {
  onUndo: () => void;
  /** Whether undo is available (history not empty) */
  canUndo: boolean;
  onRedo: () => void;
  /** Whether redo is available (redo stack not empty) */
  canRedo: boolean;
  /** Tooltip text, usually including the keyboard shortcut */
  undoTitle: string;
  redoTitle: string;
  /** Accessible name, spelling out what would be undone */
  undoLabel: string;
  redoLabel: string;
  /** Applied to both buttons so the pair matches the row it sits in */
  buttonClass: string;
  iconSize?: number;
}

/**
 * The undo/redo pair, without an opinion on where it sits.
 *
 * Three histories use it — the class list, the layout editor and the seating
 * plan — and each lives in a differently styled row, so sizing and wording stay
 * with the caller. What is shared is the part that must not drift: the same two
 * icons in the same order, and a disabled state whenever the stack behind a
 * button is empty.
 *
 * Touch-optimized: give both buttons at least 44x44px.
 */
const UndoRedoButtons: React.FC<UndoRedoButtonsProps> = ({
  onUndo,
  canUndo,
  onRedo,
  canRedo,
  undoTitle,
  redoTitle,
  undoLabel,
  redoLabel,
  buttonClass,
  iconSize = 16,
}) => (
  <div className="flex gap-1">
    <button
      type="button"
      onClick={onUndo}
      disabled={!canUndo}
      className={buttonClass}
      title={undoTitle}
      aria-label={undoLabel}
    >
      <ArrowUUpLeftIcon size={iconSize} aria-hidden="true" />
    </button>
    <button
      type="button"
      onClick={onRedo}
      disabled={!canRedo}
      className={buttonClass}
      title={redoTitle}
      aria-label={redoLabel}
    >
      <ArrowUUpRightIcon size={iconSize} aria-hidden="true" />
    </button>
  </div>
);

export default UndoRedoButtons;
