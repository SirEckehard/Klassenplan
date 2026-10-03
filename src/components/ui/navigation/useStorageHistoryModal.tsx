// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { scheduleIdleTask } from '@/utils/performance/idleTasks';
import {
  loadOnDemand,
  reportChunkLoadFailure,
} from '@/utils/performance/chunkLoad';

// Opened on demand only, so the plan and mix history, the neighbourhood matrix
// and their icons stay out of the bundle every layer starts with. Not through
// `React.lazy`: a chunk that cannot be fetched — offline, where no service
// worker serves the page — gets a message instead of taking the layer around
// the toolbar down to its error screen.
const storageHistoryModal = loadOnDemand(
  () => import('@/components/ui/navigation/StorageHistoryModal'),
  'useStorageHistoryModal',
);

type StorageHistoryModalComponent =
  typeof import('@/components/ui/navigation/StorageHistoryModal').default;

interface UseStorageHistoryModalOptions {
  /**
   * Fetch the dialog once the page is idle rather than on the first open, so
   * it opens offline as well where no service worker has cached it.
   */
  preloadWhenIdle?: boolean;
}

/**
 * "Pläne & Verlauf" — the saved plans, the recent shuffles and the
 * neighbourhoods — for every place that offers it: the foot of every toolbar
 * and the footer's settings menu. One opener, so the two cannot drift apart.
 *
 * Returns the opener and the modal to render next to it. The modal mounts on
 * first open and stays mounted, so the chosen tab survives closing it.
 */
export function useStorageHistoryModal({
  preloadWhenIdle = false,
}: UseStorageHistoryModalOptions = {}) {
  const [Modal, setModal] = React.useState<StorageHistoryModalComponent | null>(
    null,
  );
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (preloadWhenIdle) {
      scheduleIdleTask(storageHistoryModal.preload);
    }
  }, [preloadWhenIdle]);

  const show = React.useCallback(() => {
    storageHistoryModal.load().then(
      (module) => {
        setModal(() => module.default);
        setOpen(true);
      },
      (error: unknown) => {
        reportChunkLoadFailure(error, 'useStorageHistoryModal');
      },
    );
  }, []);
  const close = React.useCallback(() => setOpen(false), []);

  const modal = Modal ? <Modal open={open} onClose={close} /> : null;

  return { show, modal } as const;
}
