// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React, { lazy, Suspense } from 'react';

// Opened on demand only, so the plan and mix history, the neighbourhood matrix
// and their icons stay out of the bundle every layer starts with.
const StorageHistoryModal = lazy(
  () => import('@/components/ui/navigation/StorageHistoryModal'),
);

/**
 * "Pläne & Verlauf" — the saved plans, the recent shuffles and the
 * neighbourhoods — for every place that offers it: the foot of every toolbar
 * and the footer's settings menu. One opener, so the two cannot drift apart.
 *
 * Returns the opener and the modal to render next to it. The modal mounts on
 * first open and stays mounted, so the chosen tab survives closing it.
 */
export function useStorageHistoryModal() {
  const [mounted, setMounted] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  const show = React.useCallback(() => {
    setMounted(true);
    setOpen(true);
  }, []);
  const close = React.useCallback(() => setOpen(false), []);

  const modal = mounted ? (
    <Suspense fallback={null}>
      <StorageHistoryModal open={open} onClose={close} />
    </Suspense>
  ) : null;

  return { show, modal } as const;
}
