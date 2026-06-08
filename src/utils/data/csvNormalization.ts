// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
export const normalizeCsvHeader = (header: string): string =>
  String(header ?? '')
    .trim()
    .toLowerCase();
