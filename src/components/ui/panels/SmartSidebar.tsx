// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import { CaretLeftIcon, CaretRightIcon, GearIcon, XIcon } from '@phosphor-icons/react';
import {
  iconButtonClass,
  primaryButtonClass,
  secondaryButtonClass,
} from '@/utils';
import {
  useCollapsibleSidebar,
  type UseCollapsibleSidebarOptions,
} from '@/hooks/ui/useCollapsibleSidebar';
import { useIsMobile } from '@/hooks/ui/useIsMobile';
import { useFloatingActionOffset } from '@/hooks/ui/useFloatingActionOffset';
import { useAdaptiveViewportHeight } from '@/hooks/ui/useAdaptiveViewportHeight';

interface SmartSidebarProps extends UseCollapsibleSidebarOptions {
  className?: string;
  children?:
  | React.ReactNode
  | ((props: {
    isExpanded: boolean;
    expand: () => void;
    close?: () => void;
  }) => React.ReactNode);
}

// Main sidebar component
export default function SmartSidebar({
  className = '',
  children,
  ...sidebarOptions
}: SmartSidebarProps) {
  const { t } = useTranslation('generator');
  const sidebar = useCollapsibleSidebar(sidebarOptions);
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const openMobileOverlay = React.useCallback(
    () => setMobileOpen(true),
    [setMobileOpen],
  );
  const closeMobileOverlay = React.useCallback(
    () => setMobileOpen(false),
    [setMobileOpen],
  );
  const containerRef = React.useRef<HTMLElement | null>(null);
  const collapseButtonRef = React.useRef<HTMLButtonElement | null>(null);

  const { isExpanded, collapse, toggle, expand } = sidebar;
  const { maxHeight } = useAdaptiveViewportHeight<HTMLElement>({
    containerRef,
    disabled: false,
    reservedTop: 24,
    detectOverflow: false, // Disabled to prevent scrollHeight reads during resize
    debounceMs: 100, // Increased debounce for smoother zoom handling
    dependencies: [isExpanded],
  });
  const renderProps = React.useMemo(
    () => ({
      isExpanded: isMobile ? mobileOpen : isExpanded,
      expand: isMobile ? openMobileOverlay : expand,
      close: isMobile ? closeMobileOverlay : undefined,
    }),
    [
      closeMobileOverlay,
      expand,
      isExpanded,
      isMobile,
      mobileOpen,
      openMobileOverlay,
    ],
  );
  const renderedChildren =
    typeof children === 'function' ? children(renderProps) : children;

  const floatingTriggerOffsets = useFloatingActionOffset();

  // Handle keyboard shortcuts
  React.useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      // Toggle sidebar with Ctrl/Cmd + B
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        toggle();
      }

      // Close mobile overlay with Escape
      if (e.key === 'Escape' && mobileOpen) {
        closeMobileOverlay();
      }
    };

    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  }, [closeMobileOverlay, mobileOpen, toggle]);

  const collapsedWidth = 'w-22';
  const expandedWidth = 'w-72';

  const expandedContainerClass =
    'self-stretch rounded-3xl border-2 border-blue-200 bg-linear-to-br from-blue-50 via-white to-indigo-50 shadow-2xl backdrop-blur-md dark:border-blue-900/40 dark:from-gray-900 dark:via-gray-900 dark:to-gray-950';
  const collapsedContainerClass =
    'self-start rounded-2xl border border-blue-100 bg-white/70 shadow-lg backdrop-blur-sm dark:border-blue-900/40 dark:bg-gray-950/60';

  // Simplified style - only use maxHeight from the debounced hook
  const sidebarStyle = React.useMemo<React.CSSProperties | undefined>(() => {
    if (maxHeight == null) {
      return undefined;
    }
    return { maxHeight };
  }, [maxHeight]);

  // On mobile, render floating button + full-screen overlay
  if (isMobile) {
    return (
      <>
        {/* Floating trigger button */}
        <button
          type="button"
          onClick={openMobileOverlay}
          className={`${primaryButtonClass} fixed bottom-4 right-4 z-40 flex items-center gap-2 px-4 py-3 shadow-lg`}
          style={floatingTriggerOffsets}
          aria-label={t('sidebar.openOptions', 'Optionen öffnen')}
        >
          <GearIcon size={20} />
          <span className="text-sm font-medium">
            {t('sidebar.options', 'Optionen')}
          </span>
        </button>

        {/* Full-screen overlay */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-white dark:bg-gray-900">
            {/* Header with close button */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-blue-100/70 bg-white px-4 py-3 shadow-sm dark:border-blue-900/40 dark:bg-gray-900">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {t('sidebar.options', 'Optionen')}
              </h2>
              <button
                type="button"
                onClick={closeMobileOverlay}
                className={`${iconButtonClass} h-10 w-10 border-none bg-transparent text-gray-500 shadow-none transition hover:text-blue-600 dark:text-gray-300`}
                aria-label={t('common.close', 'Schließen')}
              >
                <XIcon size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="p-4">{renderedChildren}</div>
          </div>
        )}
      </>
    );
  }

  return (
    <aside
      ref={containerRef}
      style={sidebarStyle}
      className={`
        relative shrink-0 border-0
        ${isExpanded ? 'overflow-hidden' : 'overflow-y-auto'}
        transition-[width] duration-100 ease-out
        ${isExpanded ? expandedWidth : collapsedWidth}
        ${isExpanded ? expandedContainerClass : collapsedContainerClass}
        ${className}
      `}
      role="complementary"
      aria-label={t('sidebar.ariaLabel', 'Optionen-Sidebar')}
      aria-expanded={isExpanded}
    >
      {/* Sidebar Header and Content */}
      <div className="flex flex-col h-full min-h-0">
        {/* Header with toggle button */}
        <div className="shrink-0 border-b border-blue-100/70 px-2 py-2 dark:border-blue-900/50">
          {isExpanded ? (
            // Expanded header with title and collapse button
              <button
                ref={collapseButtonRef}
                type="button"
                onClick={collapse}
                onMouseUp={(event) => event.currentTarget.blur()}
                className={`${secondaryButtonClass} w-full justify-between gap-2 px-3 py-2 text-sm`}
                title={t(
                  'sidebar.collapseShortcut',
                  'Sidebar minimieren (Strg/Cmd+B)',
                )}
                aria-label={t('sidebar.collapseLabel', 'Sidebar minimieren')}
              >
                <span className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                  <GearIcon
                    size={18}
                    className="text-blue-600 dark:text-blue-300"
                    aria-hidden="true"
                  />
                  {t('sidebar.options', 'Optionen')}
                </span>
                <CaretLeftIcon size={22} />
              </button>
          ) : (
            // Collapsed header with expand button only
            <button
              type="button"
              onClick={toggle}
              onMouseUp={(event) => event.currentTarget.blur()}
              className={`${secondaryButtonClass} h-12 w-full justify-center px-0 text-gray-600 hover:text-blue-600 dark:text-gray-300`}
              title={t(
                'sidebar.expandShortcut',
                'Sidebar erweitern (Strg/Cmd+B)',
              )}
              aria-label={t('sidebar.expandLabel', 'Sidebar erweitern')}
            >
              <CaretRightIcon size={22} />
            </button>
          )}
        </div>

        {/* Content Area */}
        <div
          className={`overflow-x-visible ${isExpanded
            ? 'flex-1 min-h-0 overflow-y-auto'
            : 'flex-1 min-h-0 overflow-y-auto'
            }`}
        >
          {isExpanded ? (
            <div className="p-3 sm:p-4">{renderedChildren}</div>
          ) : (
            <div className="py-3">{renderedChildren}</div>
          )}
        </div>
      </div>
    </aside>
  );
}
