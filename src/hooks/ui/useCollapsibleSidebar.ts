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
  isFirstVisit?: boolean;
}

/**
 * Hook for managing collapsible sidebar state
 *
 * @param defaultExpanded - Default expanded state if no user preference exists
 * @param isFirstVisit - If true, sidebar will be expanded on first visit regardless of defaultExpanded
 */
export function useCollapsibleSidebar({
  defaultExpanded = false,
  isFirstVisit = false,
}: UseCollapsibleSidebarOptions = {}): CollapsibleSidebarState &
  CollapsibleSidebarActions {
  // On first visit, override default to expanded
  const effectiveDefault = isFirstVisit ? true : defaultExpanded;

  // Persistent state for user preferences
  const [isExpanded, setIsExpanded] = usePersistentState(
    LOCAL_STORAGE_KEYS.sidebarExpanded,
    effectiveDefault,
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
