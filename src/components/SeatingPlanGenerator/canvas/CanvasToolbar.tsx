// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUUpLeftIcon } from '@phosphor-icons/react';
import { mutedIconButtonClass } from '@/utils';

interface CanvasToolbarProps {
  /**
   * Undo callback
   */
  onUndo: () => void;
  /**
   * Whether undo is available (history length > 0)
   */
  canUndo: boolean;
}

/**
 * CanvasToolbar - Overlay toolbar for canvas operations
 *
 * Positioned in top-left corner with:
 * - Undo button with keyboard shortcut hint
 * - Semi-transparent background
 * - Touch-optimized sizing (min 44x44px)
 */
const CanvasToolbar: React.FC<CanvasToolbarProps> = ({ onUndo, canUndo }) => {
  const { t } = useTranslation('generator');
  return (
    <div className="absolute top-3 left-3 z-20">
      <button
        type="button"
        onClick={onUndo}
        disabled={!canUndo}
        className={`${mutedIconButtonClass} h-12 w-12 text-gray-700 transition disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-100`}
        title={t('canvas.undo', 'Rückgängig (Strg/Cmd+Z)')}
        aria-label={t('canvas.undoLabel', 'Letzte Aktion rückgängig machen')}
      >
        <ArrowUUpLeftIcon size={16} />
      </button>
    </div>
  );
};

export default CanvasToolbar;
