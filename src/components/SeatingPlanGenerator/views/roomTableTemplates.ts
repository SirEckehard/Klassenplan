// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type { TableTemplateType } from '@/types';

/**
 * The four tables a room is built from, in the order the toolbar and the tray
 * at the status bar offer them, each with the key of its name.
 */
export const ROOM_TABLE_TEMPLATES: ReadonlyArray<{
  type: TableTemplateType;
  seatCount: number;
  labelKey: string;
}> = [
  { type: 'single', seatCount: 1, labelKey: 'layout.singleSeat' },
  { type: 'double', seatCount: 2, labelKey: 'layout.doubleSeat' },
  { type: 'group4', seatCount: 4, labelKey: 'layout.group4' },
  { type: 'group6', seatCount: 6, labelKey: 'layout.group6' },
];
