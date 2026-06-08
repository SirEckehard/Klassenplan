export type StatisticStatus = 'ok' | 'warn' | 'alert';

export const STATISTIC_STATUS_THRESHOLDS = {
  ok: 80,
  warn: 50,
} as const;

const STATUS_META: Record<
  StatisticStatus,
  { ariaLabel: string; title: string; dotClass: string }
> = {
  ok: {
    ariaLabel: 'Erfüllung über 80% (ok)',
    title: 'Gut erfüllt (>80%)',
    dotClass: 'bg-green-500',
  },
  warn: {
    ariaLabel: 'Erfüllung zwischen 50% und 80% (warn)',
    title: 'Teilweise erfüllt (50–80%)',
    dotClass: 'bg-amber-500',
  },
  alert: {
    ariaLabel: 'Erfüllung unter 50% (alert)',
    title: 'Gering erfüllt (<50%)',
    dotClass: 'bg-red-500',
  },
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
  return { status, ...STATUS_META[status] };
}
