// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * Router state a link out of the app carries — the help dialog's FAQ link, the
 * toolbar's support entry — so the page it opens can offer the way back.
 *
 * A visitor who arrives from a search engine carries no such state and sees no
 * back link: going back would lead them out of the site.
 */
export const APP_RETURN_STATE = { fromApp: true } as const;

/**
 * Goes back to where the app was left, or null when the page was not opened
 * from the app. History rather than a fixed route: the workspace keeps its
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
