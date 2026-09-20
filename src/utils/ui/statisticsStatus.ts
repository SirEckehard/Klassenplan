// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
export type StatisticStatus = 'ok' | 'warn' | 'alert';

export const STATISTIC_STATUS_THRESHOLDS = {
  ok: 80,
  warn: 50,
} as const;

// User-facing texts live in i18n under `generator:statisticsBadge.status.*`,
// keyed by the returned status — this module stays presentation-language-free.
//
// The three colours are the `--status-*` tokens, which carry their own dark
// mode: how far something got is chrome, not one of the `--data-*` families a
// criterion belongs to (docs/DESIGNSYSTEM.md § 4).
const STATUS_DOT_CLASSES: Record<StatisticStatus, string> = {
  ok: 'bg-(--status-ok)',
  warn: 'bg-(--status-warn)',
  alert: 'bg-(--status-alert)',
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
