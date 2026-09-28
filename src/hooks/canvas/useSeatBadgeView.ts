// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useMemo, useState } from 'react';
import type { MixSettings } from '@/types';
import {
  createBadgeDisplayFilter,
  isBadgeCriterionActive,
  type BadgeDisplayMode,
  type BadgeFocus,
  type SeatBadgeView,
} from '@/utils/ui/seatBadges';

/**
 * What the seats of the table plan and the circle show as badges, and which
 * badge a pointer is on — one derivation for both views, which used to write
 * it out each.
 *
 * `badgeView` keeps the badges legible, with a "+N" for what does not fit, and
 * puts the ones whose criterion the mix weighs first. `badgeFocus` is the
 * badge pointed at — an icon on a seat or a row of the legend — whose students
 * light up. Marking them is a choice (`highlight`); switched off, pointing
 * marks nobody and there is nothing to report a focus to.
 */
export function useSeatBadgeView(
  badgeDisplay: BadgeDisplayMode,
  mixSettings: MixSettings,
  highlight: boolean,
) {
  const badgeView = useMemo<SeatBadgeView>(
    () => ({
      filter: createBadgeDisplayFilter(badgeDisplay, mixSettings),
      collapse: true,
      prioritize: (badge) => isBadgeCriterionActive(badge, mixSettings),
    }),
    [badgeDisplay, mixSettings],
  );
  const [storedBadgeFocus, setBadgeFocus] = useState<BadgeFocus | null>(null);

  return {
    badgeView,
    badgeFocus: highlight ? storedBadgeFocus : null,
    reportBadgeFocus: highlight ? setBadgeFocus : undefined,
  };
}
