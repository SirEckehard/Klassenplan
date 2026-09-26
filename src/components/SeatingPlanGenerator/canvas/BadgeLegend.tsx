// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { Student } from '@/types';
import { dataFamilyClass, dataHeadingClass } from '@/utils';
import {
  getClassBadges,
  groupBadgesByFamily,
  type BadgeFocus,
} from '@/utils/ui/seatBadges';
import { describeBadge } from '@/utils/ui/studentAppearance';
import { badgeFamilyLabelKey } from '@/components/scene/BadgeTooltip';
import { menuHeadingClass } from './CanvasSettingsButton';

/**
 * The key to the icons on the seats: every badge the class carries, under its
 * family, each in its family's ink.
 *
 * It sits under the display choice in the "Merkmale" menu, so the icons are
 * explained where they are switched — and on a tablet, which cannot hover a
 * seat, that is where the meaning can be looked up. Pointing at a row lights
 * the seats of everyone who carries it.
 */
export default function BadgeLegend({
  students,
  onFocusChange,
}: {
  students: Student[];
  onFocusChange?: (focus: BadgeFocus | null) => void;
}) {
  const { t } = useTranslation(['generator', 'students']);
  const groups = React.useMemo(
    () => groupBadgesByFamily(getClassBadges(students)),
    [students],
  );

  // The menu can close under the pointer, which then never leaves the row.
  React.useEffect(() => () => onFocusChange?.(null), [onFocusChange]);

  return (
    <div className="mt-1 flex flex-col gap-2 border-t border-(--border-card) px-3 pt-2 pb-2">
      <span className={menuHeadingClass}>
        {t('generator:editor.badges.legend')}
      </span>
      {groups.length === 0 ? (
        <p className="text-xs text-(--text-muted)">
          {t('generator:editor.badges.legendEmpty')}
        </p>
      ) : (
        groups.map(({ family, entries }) => (
          <div
            key={family}
            className={`${dataFamilyClass[family]} flex flex-col gap-0.5`}
          >
            <span className={dataHeadingClass}>
              {t(badgeFamilyLabelKey(family))}
            </span>
            <ul className="flex flex-col">
              {entries.map((badge) => {
                const Icon = badge.icon;
                return (
                  <li
                    key={badge.key}
                    onPointerEnter={() =>
                      onFocusChange?.({ badgeKey: badge.key, studentId: null })
                    }
                    onPointerLeave={() => onFocusChange?.(null)}
                    className="flex items-center gap-2 rounded-md px-1 py-1 text-sm text-(--text-page) hover:bg-(--surface-sunken)"
                  >
                    <Icon
                      size={16}
                      aria-hidden="true"
                      className="shrink-0 text-(--data-chip-text)"
                    />
                    <span className="first-letter:uppercase">
                      {describeBadge(badge).heading}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))
      )}
    </div>
  );
}
