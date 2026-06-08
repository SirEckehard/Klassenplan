// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import { LinkSimpleIcon, ArrowCounterClockwiseIcon, ShuffleIcon, LinkBreakIcon } from '@phosphor-icons/react';
import type { ConnectionDisplayMode } from '@/components/circle/SimpleCircleView';
import {
  getSidebarSurfaceClasses,
  getSidebarIconClasses,
  getSidebarIndicatorClasses,
  type SidebarTone,
} from '@/utils';

interface CircleViewControlsProps {
  connectionMode?: ConnectionDisplayMode;
  onConnectionModeChange?: (mode: ConnectionDisplayMode) => void;
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
  connectionMode = 'subtle',
  onConnectionModeChange,
  onSyncCircle,
  onShuffleCircle,
  isExpanded = false,
  className = '',
}: CircleViewControlsProps) {
  const { t } = useTranslation('generator');

  const handleConnectionToggle = () => {
    if (onConnectionModeChange) {
      const nextMode: ConnectionDisplayMode =
        connectionMode === 'off' ? 'subtle' : 'off';
      onConnectionModeChange(nextMode);
    }
  };

  // Connection mode controls
  const connectionControls = [
    {
      id: 'connections',
      // Show what will happen on click: LinkSimpleIcon icon when off (to turn on), LinkBreakIcon when on (to turn off)
      icon:
        connectionMode === 'off' ? <LinkSimpleIcon size={16} /> : <LinkBreakIcon size={16} />,
      label: t('circleView.showConnections', 'Verbindungen anzeigen'),
      description: t(
        'circleView.connectionDescription',
        'Nachbarschaftsverbindungen zwischen Schülern.',
      ),
      onClick: handleConnectionToggle,
      isActive: connectionMode !== 'off',
    },
  ];

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
      {isExpanded ? (
        <div className="space-y-4">
          <div className="space-y-2 px-2 pt-2">
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

          <div className="py-1" />
          <div className="space-y-2 px-2 pt-2">
            {connectionControls.map((control) => (
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
      ) : (
        /* Collapsed Mode - Show all controls without categories */
        <div className="flex flex-col items-center space-y-2 px-2">
          {[...actionControls, ...connectionControls].map((control) => (
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
      )}
    </div>
  );
}
