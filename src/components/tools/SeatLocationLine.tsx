// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useTranslation } from 'react-i18next';
import type { SeatLocation } from '@/utils';

/**
 * Where somebody sits, as one line to read out: table, depth, landmark and
 * who they are next to. Built from {@link SeatLocation}, so the parts that do
 * not apply — a room without windows, a single table — simply do not appear.
 */
export default function SeatLocationLine({
  location,
  className = '',
}: {
  location: SeatLocation;
  className?: string;
}) {
  const { t } = useTranslation('generator');

  const parts = [
    t('tools.seat.table', { number: location.tableNumber }),
    t(`tools.seat.depth.${location.depth}`),
  ];
  if (location.landmark) {
    parts.push(t(`tools.seat.landmark.${location.landmark}`));
  }
  for (const neighbor of location.neighbors) {
    parts.push(t('tools.seat.nextTo', { name: neighbor.name }));
  }

  return (
    <span className={`text-sm text-(--text-muted) ${className}`}>
      {parts.join(' · ')}
    </span>
  );
}
