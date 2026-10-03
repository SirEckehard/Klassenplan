// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { loadOnDemand } from '@/utils/performance/chunkLoad';

/**
 * The rows both settings menus share and the dialog they open, kept out of the
 * cold-start payload with the confirm dialog and their icons. One loader for
 * the footer's gear and the header's, so a preload by one serves the other.
 */
export const appSettingsItems = loadOnDemand(
  () => import('@/components/ui/navigation/AppSettingsItems'),
  'AppSettingsItems',
);
