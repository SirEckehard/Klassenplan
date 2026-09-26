// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type {
  StatisticHighlightState,
  StatisticHighlightMode,
  StatisticHighlightTarget,
} from '@/types';
import type { StatisticStatus } from '@/utils';

export type SeatHighlightTone = 'focus' | 'confirm';

export type SeatHighlightInfo = {
  status: StatisticStatus;
  percentage: number;
  mode: StatisticHighlightMode;
  target: StatisticHighlightTarget;
  /**
   * `focus` marks a seat a hovered badge points at. That is no verdict on the
   * seat, so it takes the selection colour rather than a status colour.
   * `confirm` marks the seats a student has just moved between, for a moment.
   */
  tone?: SeatHighlightTone;
};

type SeatHighlightLookup = Map<string, SeatHighlightInfo>;

const buildSeatKey = (target: StatisticHighlightTarget) =>
  target.type === 'seat'
    ? `${target.tableIndex}-${target.seatIndex}`
    : 'unknown';

const STATUS_PRIORITY: Record<StatisticStatus, number> = {
  alert: 3,
  warn: 2,
  ok: 1,
};

const pickPreferred = (
  existing: SeatHighlightInfo | undefined,
  incoming: SeatHighlightInfo,
): SeatHighlightInfo => {
  if (!existing) return incoming;
  const existingPriority = STATUS_PRIORITY[existing.status];
  const incomingPriority = STATUS_PRIORITY[incoming.status];

  if (incomingPriority > existingPriority) return incoming;
  if (incomingPriority < existingPriority) return existing;

  // Same status: prefer higher percentage, fallback to persistent mode
  if (incoming.percentage !== existing.percentage) {
    return incoming.percentage > existing.percentage ? incoming : existing;
  }
  if (existing.mode === 'persistent' && incoming.mode !== 'persistent') {
    return existing;
  }
  if (incoming.mode === 'persistent' && existing.mode !== 'persistent') {
    return incoming;
  }
  return incoming;
};

export function buildSeatHighlightLookup(
  highlight: StatisticHighlightState | null,
): SeatHighlightLookup | null {
  if (!highlight || !highlight.entries.length) {
    return null;
  }

  const lookup: SeatHighlightLookup = new Map();
  for (const entry of highlight.entries) {
    if (entry.target.type !== 'seat') continue;
    const key = buildSeatKey(entry.target);
    const info: SeatHighlightInfo = {
      status: entry.status,
      percentage: entry.percentage,
      mode: highlight.mode,
      target: entry.target,
    };
    const current = lookup.get(key);
    lookup.set(key, pickPreferred(current, info));
  }

  return lookup;
}

export function getSeatHighlight(
  lookup: SeatHighlightLookup | null,
  tableIndex: number,
  seatIndex: number,
): SeatHighlightInfo | undefined {
  if (!lookup) return undefined;
  const key = `${tableIndex}-${seatIndex}`;
  return lookup.get(key);
}

/**
 * The seats a student has just moved between: a moment of the confirm tone,
 * no verdict and no percentage.
 */
export function buildDropConfirmLookup(
  seats: ReadonlyArray<{ tableIndex: number; seatIndex: number }>,
): SeatHighlightLookup | null {
  if (seats.length === 0) return null;
  const lookup: SeatHighlightLookup = new Map();
  for (const { tableIndex, seatIndex } of seats) {
    lookup.set(`${tableIndex}-${seatIndex}`, {
      status: 'ok',
      percentage: 100,
      mode: 'persistent',
      tone: 'confirm',
      target: { type: 'seat', tableIndex, seatIndex },
    });
  }
  return lookup;
}

export type { SeatHighlightLookup };
