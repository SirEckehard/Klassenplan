// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowCounterClockwiseIcon,
  SpinnerGapIcon,
} from '@phosphor-icons/react';
import { primaryButtonClass } from '@/utils';

/**
 * Mix trigger for the seating canvas.
 *
 * Renders unpositioned — the seating editor lines it up with the undo/redo
 * pair in a single canvas overlay row.
 */
interface FloatingMixButtonProps {
  onMix: () => Promise<void>;
  isLoading?: boolean;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export default function FloatingMixButton({
  onMix,
  isLoading = false,
  disabled = false,
  className = '',
  style,
}: FloatingMixButtonProps) {
  const { t } = useTranslation('generator');
  const isButtonDisabled = disabled || isLoading;
  const handleClick = () => {
    if (isButtonDisabled) {
      return;
    }
    void onMix();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isButtonDisabled}
      className={`${primaryButtonClass} group flex h-9 items-center justify-center gap-2 px-3 ${
        isButtonDisabled
          ? 'cursor-not-allowed opacity-60'
          : 'hover:scale-105 active:scale-95'
      } ${className}`}
      style={style}
      title={
        isLoading
          ? t('mixButton.loadingTitle', 'Mischvorgang läuft...')
          : t('mixButton.title', 'Sitzplan mischen')
      }
      aria-label={
        isLoading
          ? t('mixButton.loadingAriaLabel', 'Mischvorgang läuft')
          : t('mixButton.title', 'Sitzplan mischen')
      }
    >
      <div className="relative flex items-center justify-center gap-2">
        {isLoading ? (
          <SpinnerGapIcon size={18} className="animate-spin" />
        ) : (
          <ArrowCounterClockwiseIcon
            size={18}
            className="transition-transform duration-300 group-hover:rotate-180"
          />
        )}
        <span className="hidden text-sm sm:inline">
          {t('mixButton.label', 'Mischen')}
        </span>
      </div>
    </button>
  );
}
