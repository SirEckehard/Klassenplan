// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
export type StatisticStatus = 'ok' | 'warn' | 'alert';

export const STATISTIC_STATUS_THRESHOLDS = {
  ok: 80,
  warn: 50,
} as const;

// User-facing texts live in i18n under `generator:statisticsBadge.status.*`,
// keyed by the returned status — this module stays presentation-language-free.
const STATUS_DOT_CLASSES: Record<StatisticStatus, string> = {
  ok: 'bg-green-500',
  warn: 'bg-amber-500',
  alert: 'bg-red-500',
};

export function getStatisticStatus(percentage: number): StatisticStatus {
  const normalized = Number.isFinite(percentage) ? percentage : 0;
  if (normalized > STATISTIC_STATUS_THRESHOLDS.ok) {
    return 'ok';
  }
  if (normalized >= STATISTIC_STATUS_THRESHOLDS.warn) {
    return 'warn';
  }
  return 'alert';
}

export function getStatisticStatusMeta(percentage: number) {
  const status = getStatisticStatus(percentage);
  return { status, dotClass: STATUS_DOT_CLASSES[status] };
}
