// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useCallback } from 'react';
import usePersistentState from '@/hooks/usePersistentState';
import { LOCAL_STORAGE_KEYS } from '@/utils/data/storageKeys';

interface CollapsibleSidebarState {
  isExpanded: boolean;
}

interface CollapsibleSidebarActions {
  expand: () => void;
  collapse: () => void;
  toggle: () => void;
}

export interface UseCollapsibleSidebarOptions {
  defaultExpanded?: boolean;
}

/**
 * Hook for managing collapsible sidebar state
 *
 * A first visit starts collapsed like any other: the onboarding tour and the
 * Help dialog point out the toggle instead.
 *
 * @param defaultExpanded - Default expanded state if no user preference exists
 */
export function useCollapsibleSidebar({
  defaultExpanded = false,
}: UseCollapsibleSidebarOptions = {}): CollapsibleSidebarState &
  CollapsibleSidebarActions {
  // Persistent state for user preferences
  const [isExpanded, setIsExpanded] = usePersistentState(
    LOCAL_STORAGE_KEYS.sidebarExpanded,
    defaultExpanded,
  );

  // Actions
  const expand = useCallback(() => {
    setIsExpanded(true);
  }, [setIsExpanded]);

  const collapse = useCallback(() => {
    setIsExpanded(false);
  }, [setIsExpanded]);

  const toggle = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, [setIsExpanded]);

  return {
    // State
    isExpanded,

    // Actions
    expand,
    collapse,
    toggle,
  };
}
