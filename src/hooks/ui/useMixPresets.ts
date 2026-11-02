// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import type { MixPresetData } from '@/types';
import {
  emptyMixPresetData,
  logError,
  resolveMixRecipes,
  type MixRecipe,
} from '@/utils';
import {
  loadMixPresets,
  subscribeToMixPresets,
} from '@/repositories/mixPresetStore';

/**
 * The presets on offer (decision 0038): the shipped ones as the teacher
 * changed them, then the teacher's own. Read anew whenever the criteria panel
 * or "Bibliothek" changes them, and when the tab comes back to the front — a
 * second tab may have saved one meanwhile.
 */
export function useMixPresets(): {
  data: MixPresetData;
  recipes: MixRecipe[];
} {
  const [data, setData] = React.useState<MixPresetData>(emptyMixPresetData);
  const shownRef = React.useRef(JSON.stringify(data));

  React.useEffect(() => {
    let alive = true;
    const load = () => {
      loadMixPresets()
        .then((next) => {
          // The same presets read again change nothing on screen.
          const json = JSON.stringify(next);
          if (!alive || json === shownRef.current) return;
          shownRef.current = json;
          setData(next);
        })
        .catch((error: unknown) => {
          logError('Failed to read mix presets', { error }, 'useMixPresets');
        });
    };
    load();
    const unsubscribe = subscribeToMixPresets(load);
    const onVisible = () => {
      if (document.visibilityState === 'visible') load();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      alive = false;
      unsubscribe();
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  const recipes = React.useMemo(() => resolveMixRecipes(data), [data]);
  return { data, recipes };
}
