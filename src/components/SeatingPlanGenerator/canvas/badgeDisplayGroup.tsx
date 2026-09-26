// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type { TFunction } from 'i18next';
import {
  ChatCircleTextIcon,
  EyeIcon,
  EyeSlashIcon,
  FunnelSimpleIcon,
  UsersThreeIcon,
} from '@phosphor-icons/react';
import type { Student } from '@/types';
import type {
  BadgeDisplayMode,
  BadgeFocus,
  BadgeHoverSettings,
} from '@/utils/ui/seatBadges';
import BadgeLegend from './BadgeLegend';
import type { CanvasSettingsGroup } from './CanvasSettingsButton';

const BADGE_DISPLAY_ICONS: Record<BadgeDisplayMode, typeof EyeIcon> = {
  all: EyeIcon,
  active: FunnelSimpleIcon,
  off: EyeSlashIcon,
};

/**
 * The "Merkmale" settings group of the plan and the circle: which badges the
 * seats show, and under it the key to them. Plain function (not a hook) so
 * callers can build it inside their `useMemo`, like the name group.
 */
export function buildBadgeDisplayGroup({
  id,
  value,
  onChange,
  hover,
  onHoverChange,
  students,
  onFocusChange,
  t,
}: {
  id: string;
  value: BadgeDisplayMode;
  onChange: (next: BadgeDisplayMode) => void;
  /** What pointing at a badge does; two switches under the display choice. */
  hover: BadgeHoverSettings;
  onHoverChange: (next: BadgeHoverSettings) => void;
  students: Student[];
  /** Pointing at a legend row lights the seats of everyone who carries it. */
  onFocusChange?: (focus: BadgeFocus | null) => void;
  t: TFunction;
}): CanvasSettingsGroup {
  const choice = (mode: BadgeDisplayMode) => {
    const Icon = BADGE_DISPLAY_ICONS[mode];
    return {
      value: mode,
      label: t(`editor.badges.${mode}`),
      icon: <Icon size={18} />,
    };
  };
  return {
    id,
    title: t('editor.badges.title'),
    options: [
      {
        kind: 'segment',
        id: `${id}-mode`,
        ariaLabel: t('editor.badges.title'),
        value,
        onChange: (next) => onChange(next as BadgeDisplayMode),
        choices: [choice('all'), choice('active'), choice('off')],
        description: t('editor.badges.hint'),
      },
      {
        // What pointing at an icon does. Without icons there is nothing to
        // point at, so both wait for the badges to come back.
        kind: 'checkList',
        id: `${id}-hover`,
        label: t('editor.badges.hoverLabel'),
        items: [
          {
            id: `${id}-hover-tooltip`,
            icon: <ChatCircleTextIcon size={18} />,
            label: t('editor.badges.hoverTooltip'),
            checked: hover.tooltip,
            disabled: value === 'off',
            onChange: (next) => onHoverChange({ ...hover, tooltip: next }),
          },
          {
            id: `${id}-hover-highlight`,
            icon: <UsersThreeIcon size={18} />,
            label: t('editor.badges.hoverHighlight'),
            checked: hover.highlight,
            disabled: value === 'off',
            onChange: (next) => onHoverChange({ ...hover, highlight: next }),
          },
        ],
      },
    ],
    footer: <BadgeLegend students={students} onFocusChange={onFocusChange} />,
  };
}
