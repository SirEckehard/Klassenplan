// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useTranslation } from 'react-i18next';
import type { CircleLocation, SeatLocation } from '@/utils';

/**
 * Where somebody sits, as one line to read out: table, depth, landmark and
 * who they are next to. Built from {@link SeatLocation}, so the parts that do
 * not apply — a room without windows, a single table — simply do not appear.
 * In the seating circle ({@link CircleLocation}) only the two on either side
 * are worth saying.
 */
export default function SeatLocationLine({
  location,
  className = '',
}: {
  location: SeatLocation | CircleLocation;
  className?: string;
}) {
  const { t } = useTranslation('generator');

  const parts: string[] = [];
  if ('kind' in location) {
    parts.push(t('tools.seat.circle'));
    const [first, second] = location.neighbors;
    if (first && second) {
      parts.push(
        t('tools.seat.between', { first: first.name, second: second.name }),
      );
    } else if (first) {
      parts.push(t('tools.seat.nextTo', { name: first.name }));
    }
  } else {
    parts.push(
      t('tools.seat.table', { number: location.tableNumber }),
      t(`tools.seat.depth.${location.depth}`),
    );
    if (location.landmark) {
      parts.push(t(`tools.seat.landmark.${location.landmark}`));
    }
    for (const neighbor of location.neighbors) {
      parts.push(t('tools.seat.nextTo', { name: neighbor.name }));
    }
  }

  return (
    <span className={`text-sm text-(--text-muted) ${className}`}>
      {parts.join(' · ')}
    </span>
  );
}
