// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLocalizedNavigate } from '@/hooks/useLocalizedNavigate';

/**
 * Router state a link inside the site carries — the help dialog's FAQ link,
 * the toolbar's support entry, the settings gear, the start page's and the
 * footer's links — so the page it opens can offer the way back.
 *
 * A visitor who arrives from a search engine carries no such state and sees no
 * back link: going back would lead them out of the site.
 */
export const APP_RETURN_STATE = { fromApp: true } as const;

/**
 * Goes back to where the visitor came from, or null when the page was not
 * opened from inside the site. History rather than a fixed route: the workspace keeps its
 * layer across the trip, and the projection or a classroom tool are just as
 * likely to be where the teacher came from.
 */
export function useReturnToApp(): (() => void) | null {
  const location = useLocation();
  const navigate = useNavigate();
  const goBack = useCallback(() => navigate(-1), [navigate]);
  const state = location.state as { fromApp?: unknown } | null;
  return state?.fromApp === true ? goBack : null;
}

/**
 * The way back of a page the whole app can open — a classroom tool,
 * "Bibliothek": where it was opened from, through the history. Opened straight
 * from a link or a bookmark there is nothing behind it inside the app, and the
 * workspace is the way in.
 */
export function useBackThroughHistory(): () => void {
  const location = useLocation();
  const navigate = useLocalizedNavigate();
  return useCallback(() => {
    if (location.key !== 'default') {
      navigate(-1);
      return;
    }
    navigate('/generator');
  }, [location.key, navigate]);
}

/**
 * Router state the workspace hands the export page and the projection, the
 * two ways a plan leaves it, so their way back returns through the history.
 */
export const FROM_WORKSPACE_STATE = { fromWorkspace: true } as const;

/**
 * The way back from the export page or the projection: through the history
 * when the workspace opened the page — a forward step to the workspace would
 * leave the page behind it, and the browser's or the phone's back would open
 * it again — else `fallback`, for a page opened from an address or reloaded
 * without one.
 */
export function useBackToWorkspace(fallback: () => void): () => void {
  const location = useLocation();
  const navigate = useNavigate();
  const fromWorkspace =
    (location.state as { fromWorkspace?: unknown } | null)?.fromWorkspace ===
    true;
  return useCallback(
    () => (fromWorkspace ? navigate(-1) : fallback()),
    [fallback, fromWorkspace, navigate],
  );
}
