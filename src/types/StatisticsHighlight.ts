// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type { MixSettings } from './SeatingPlan';
import type { StatisticStatus } from '@/utils';

export type StatisticHighlightMode = 'hover' | 'persistent';

export type StatisticHighlightTarget = {
  type: 'seat';
  tableIndex: number;
  seatIndex: number;
  studentId?: string | null;
};

export interface StatisticHighlightEntry {
  target: StatisticHighlightTarget;
  percentage: number;
  status: StatisticStatus;
}

export interface StatisticHighlightState {
  key: keyof MixSettings;
  mode: StatisticHighlightMode;
  entries: StatisticHighlightEntry[];
}
