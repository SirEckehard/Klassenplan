// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowCounterClockwiseIcon, ShuffleIcon } from '@phosphor-icons/react';
import {
  getSidebarSurfaceClasses,
  getSidebarIconClasses,
  getSidebarIndicatorClasses,
  type SidebarTone,
} from '@/utils';

/**
 * Sidebar actions for the circle view.
 *
 * Display options (connections, photo mode) live in the canvas' settings
 * button instead — same place as the seating plan's, next to the view they
 * change. What stays here are the actions that alter the circle itself.
 */
interface CircleViewControlsProps {
  onSyncCircle?: () => void;
  onShuffleCircle?: () => void;
  isExpanded?: boolean;
  className?: string;
}

interface ControlButtonProps {
  icon: React.ReactNode;
  label: string;
  description?: string;
  isExpanded: boolean;
  onClick?: () => void;
  isActive?: boolean;
}

function ControlButton({
  icon,
  label,
  description,
  isExpanded,
  onClick,
  isActive = false,
}: ControlButtonProps) {
  const tone: SidebarTone = 'blue';
  const variant = isExpanded ? 'expanded' : 'collapsed';
  const surfaceClasses = getSidebarSurfaceClasses({
    variant,
    tone,
    isActive,
    disabled: !onClick,
    interactive: Boolean(onClick),
  });
  const layoutClasses = isExpanded
    ? 'group relative flex w-full items-center gap-2 rounded-2xl p-2'
    : 'group relative inline-flex h-12 w-12 items-center justify-center rounded-full p-0';
  const iconClasses = getSidebarIconClasses({
    tone,
    isActive,
    disabled: !onClick,
  });
  const indicatorClasses = getSidebarIndicatorClasses(tone);
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${layoutClasses} ${surfaceClasses}`}
      title={label}
      aria-pressed={isActive}
    >
      <span className={iconClasses}>{icon}</span>

      {isExpanded && (
        <div className="flex-1 text-left">
          <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
            {label}
          </div>
          {description && (
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {description}
            </div>
          )}
        </div>
      )}

      {/* Active indicator for collapsed mode */}
      {!isExpanded && isActive && <div className={indicatorClasses} />}
    </button>
  );
}

export default function CircleViewControls({
  onSyncCircle,
  onShuffleCircle,
  isExpanded = false,
  className = '',
}: CircleViewControlsProps) {
  const { t } = useTranslation('generator');

  // Action controls
  const actionControls = [
    {
      id: 'sync',
      icon: <ArrowCounterClockwiseIcon size={16} />,
      label: t('circleView.syncButton', 'An Sitzplan anpassen'),
      description: t(
        'circleView.syncDescription',
        'Sitzkreis an Änderungen im Sitzplan anpassen.',
      ),
      onClick: onSyncCircle,
      isActive: false,
    },
  ];

  // Optional controls (only if handlers provided)
  if (onShuffleCircle) {
    actionControls.push({
      id: 'shuffle',
      icon: <ShuffleIcon size={16} />,
      label: t('circleView.shuffleButton', 'Zufällig mischen'),
      description: t(
        'circleView.shuffleDescription',
        'Nur Sitzkreis ändern (Sitzplan bleibt unverändert).',
      ),
      onClick: onShuffleCircle,
      isActive: false,
    });
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div
        className={
          isExpanded
            ? 'space-y-2 px-2 pt-2'
            : 'flex flex-col items-center space-y-2 px-2'
        }
      >
        {actionControls.map((control) => (
          <ControlButton
            key={control.id}
            icon={control.icon}
            label={control.label}
            description={control.description}
            isExpanded={isExpanded}
            onClick={control.onClick}
            isActive={control.isActive}
          />
        ))}
      </div>
    </div>
  );
}
