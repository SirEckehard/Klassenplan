// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { loadOnDemand } from '@/utils/performance/chunkLoad';

/**
 * The rows of the settings gear and the dialogs they open, kept out of the
 * cold-start payload with the confirm dialog and their icons. One loader for
 * every gear on the page, so a preload by one serves the next.
 */
export const appSettingsItems = loadOnDemand(
  () => import('@/components/ui/navigation/AppSettingsItems'),
  'AppSettingsItems',
);
