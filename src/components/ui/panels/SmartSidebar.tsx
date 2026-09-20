// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import { GearIcon, SidebarSimpleIcon, XIcon } from '@phosphor-icons/react';
import {
  iconButtonClass,
  panelSurfaceClass,
  primaryButtonClass,
  secondaryButtonClass,
} from '@/utils';
import { type UseCollapsibleSidebarOptions } from '@/hooks/ui/useCollapsibleSidebar';
import { useShellToolRail, useToolRailState } from '@/contexts/ToolRailContext';
import { useLayoutMode } from '@/hooks/ui/useLayoutMode';
import { useFloatingActionOffset } from '@/hooks/ui/useFloatingActionOffset';
import { useAdaptiveViewportHeight } from '@/hooks/ui/useAdaptiveViewportHeight';
import { useDialogA11y } from '@/hooks/ui/useDialogA11y';
import { useDialogLayer } from '@/hooks/ui/useDialogLayer';
import { TOUR_ANCHORS } from '@/components/onboarding/tours';

interface SmartSidebarProps extends UseCollapsibleSidebarOptions {
  className?: string;
  /** `data-tour` anchor for the onboarding tour, set on the rail (not the phone sheet). */
  tourAnchor?: string;
  /**
   * The column's two widths. The default is the workspace toolbar's — 208px
   * labelled, 60px as icons, which is what a `ToolRail` entry is cut for. A
   * sidebar whose entries are a different size says so here.
   */
  widths?: { expanded: string; collapsed: string };
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
  tourAnchor,
  widths = { expanded: 'w-52', collapsed: 'w-15' },
  children,
  ...sidebarOptions
}: SmartSidebarProps) {
  const { t } = useTranslation('generator');
  const layoutMode = useLayoutMode();
  const isPhone = layoutMode === 'phone';
  // Inside the workspace the status bar owns the switch and the state is
  // shared; a sidebar outside the shell — the export page's — keeps both.
  const shellRail = useShellToolRail();
  const ownRail = useToolRailState(sidebarOptions);
  const rail = shellRail ?? ownRail;
  const ownsSwitch = shellRail === null;
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
  const mobileSheetRef = useDialogA11y<HTMLDivElement>({
    open: isPhone && mobileOpen,
  });
  // The phone sheet owns Escape while it is up.
  useDialogLayer(isPhone && mobileOpen);
  const mobileSheetTitleId = React.useId();

  const { isExpanded, expand, toggle } = rail;
  const { maxHeight } = useAdaptiveViewportHeight<HTMLElement>({
    containerRef,
    // From `lg` up the shell is the window: the column has a real height from
    // the frame, and a measured `max-height` on top of it would only fight it.
    disabled: layoutMode === 'desktop',
    reservedTop: 24,
    detectOverflow: false, // Disabled to prevent scrollHeight reads during resize
    debounceMs: 100, // Increased debounce for smoother zoom handling
    dependencies: [isExpanded],
  });
  const renderProps = React.useMemo(
    () => ({
      isExpanded: isPhone ? mobileOpen : isExpanded,
      expand: isPhone ? openMobileOverlay : expand,
      close: isPhone ? closeMobileOverlay : undefined,
    }),
    [
      closeMobileOverlay,
      expand,
      isExpanded,
      isPhone,
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

  const { expanded: expandedWidth, collapsed: collapsedWidth } = widths;

  // Paper, like every other surface of the workspace: the toolbar is where
  // the tools are, not something that has to announce itself in blue.
  //
  // On the desktop shell it is not a card at all but the left edge of the
  // window — one hairline against the sunken stage. Below `lg` the layer is
  // still a stacked document, where a panel needs its own frame to read as one.
  const isDesktopShell = layoutMode === 'desktop';
  const frameClass = isDesktopShell
    ? 'border-r border-(--border-card) bg-(--surface-page)'
    : panelSurfaceClass;
  const expandedContainerClass = `${frameClass} self-stretch`;
  const collapsedContainerClass = `${frameClass} ${
    isDesktopShell ? 'self-stretch' : 'self-start'
  }`;

  // Only the document layouts below `lg` need a measured ceiling.
  const sidebarStyle = React.useMemo<React.CSSProperties | undefined>(() => {
    if (maxHeight == null) {
      return undefined;
    }
    return { maxHeight };
  }, [maxHeight]);

  // Only a phone has no room for a column: floating button + full-screen sheet.
  if (isPhone) {
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
          <div
            ref={mobileSheetRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={mobileSheetTitleId}
            tabIndex={-1}
            className="fixed inset-0 z-50 overflow-y-auto bg-(--surface-page) focus:outline-none"
          >
            {/* Header with close button */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-(--border-panel) bg-(--surface-card) px-4 py-3">
              <h2 id={mobileSheetTitleId} className="text-lg font-semibold">
                {t('sidebar.options', 'Optionen')}
              </h2>
              <button
                type="button"
                onClick={closeMobileOverlay}
                className={`${iconButtonClass} h-10 w-10 border-none bg-transparent shadow-none`}
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
      data-tour={tourAnchor}
    >
      <div className="flex h-full min-h-0 flex-col">
        {/* A sidebar outside the shell has no status bar to hang its switch
            in, so it keeps one of its own above the tools. */}
        {ownsSwitch && (
          <div className="shrink-0 px-2 pt-2">
            <button
              ref={collapseButtonRef}
              type="button"
              onClick={toggle}
              data-tour={TOUR_ANCHORS.sidebarToggle}
              onMouseUp={(event) => event.currentTarget.blur()}
              className={`${secondaryButtonClass} h-9 w-full justify-center gap-2 px-2 text-sm`}
              title={
                isExpanded
                  ? t(
                      'sidebar.collapseShortcut',
                      'Sidebar minimieren (⌘/Strg+B)',
                    )
                  : t('sidebar.expandShortcut', 'Sidebar erweitern (⌘/Strg+B)')
              }
              aria-label={
                isExpanded
                  ? t('sidebar.collapseLabel', 'Sidebar minimieren')
                  : t('sidebar.expandLabel', 'Sidebar erweitern')
              }
              aria-expanded={isExpanded}
            >
              <SidebarSimpleIcon size={18} aria-hidden="true" />
              {isExpanded && <span>{t('sidebar.options', 'Optionen')}</span>}
            </button>
          </div>
        )}

        {/* The tools themselves, in the padding the rail's own entries are
            measured against (`ToolRail`). */}
        <div className="min-h-0 flex-1 overflow-x-visible overflow-y-auto">
          <div className="flex h-full flex-col px-2 py-3">
            {renderedChildren}
          </div>
        </div>
      </div>
    </aside>
  );
}
