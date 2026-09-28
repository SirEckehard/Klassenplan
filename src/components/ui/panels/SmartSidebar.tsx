// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowLineLeftIcon,
  ArrowLineRightIcon,
  WrenchIcon,
  XIcon,
} from '@phosphor-icons/react';
import {
  iconButtonClass,
  panelSurfaceClass,
  secondaryButtonClass,
} from '@/utils';
import { type UseCollapsibleSidebarOptions } from '@/hooks/ui/useCollapsibleSidebar';
import {
  TOOL_RAIL_DRAWER_ID,
  useShellToolRail,
  useToolRailState,
} from '@/contexts/ToolRailContext';
import { useLayoutMode } from '@/hooks/ui/useLayoutMode';
import { useAdaptiveViewportHeight } from '@/hooks/ui/useAdaptiveViewportHeight';
import { isAnyDialogOpen } from '@/hooks/ui/useDialogLayer';
import { TOUR_ANCHORS } from '@/components/onboarding/tours';

/**
 * The toolbar's drawer on a phone: the left-hand mirror of the inspector's
 * (`Inspector`), between the header and the status bar.
 */
const toolRailDrawerClass =
  'fixed top-14 left-0 bottom-(--shell-bottom-inset) z-40 flex w-64 max-w-full flex-col overflow-hidden border-r border-(--border-card) bg-(--surface-card) shadow-(--menu-shadow) focus:outline-none';

interface SmartSidebarProps extends UseCollapsibleSidebarOptions {
  className?: string;
  /** `data-tour` anchor for the onboarding tour, set on the rail (not the phone drawer). */
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
  // shared — the column's width and, on a phone, whether the drawer is open.
  // A sidebar outside the shell keeps both.
  const shellRail = useShellToolRail();
  const ownRail = useToolRailState(sidebarOptions);
  const rail = shellRail ?? ownRail;
  const ownsSwitch = shellRail === null;
  const { sheetOpen: mobileOpen, setSheetOpen } = rail;
  const openMobileOverlay = React.useCallback(
    () => setSheetOpen(true),
    [setSheetOpen],
  );
  const closeMobileOverlay = React.useCallback(
    () => setSheetOpen(false),
    [setSheetOpen],
  );
  const containerRef = React.useRef<HTMLElement | null>(null);
  const collapseButtonRef = React.useRef<HTMLButtonElement | null>(null);
  const drawerRef = React.useRef<HTMLElement | null>(null);
  const drawerTitleId = React.useId();
  const showsDrawer = isPhone && mobileOpen;

  // Like the inspector's drawer, not modal: the focus moves in when it opens
  // and goes back to the switch when Escape closes it. An open panel of the
  // toolbar is a dialog layer and takes Escape first.
  React.useEffect(() => {
    if (!showsDrawer) return undefined;
    const opener =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    drawerRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || isAnyDialogOpen()) return;
      event.stopPropagation();
      setSheetOpen(false);
      opener?.focus();
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [setSheetOpen, showsDrawer]);

  // An action taken in the drawer — a view switched, an export started —
  // closes it, so the stage shows what it did. An entry that opens a panel or
  // a dialog of its own keeps it open behind that.
  const handleDrawerClick = React.useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      const target = event.target instanceof Element ? event.target : null;
      const control = target?.closest('button, a');
      if (!control || !event.currentTarget.contains(control)) return;
      if (control.hasAttribute('aria-haspopup')) return;
      setSheetOpen(false);
    },
    [setSheetOpen],
  );

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

  // Handle keyboard shortcuts
  React.useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      // Toggle sidebar with Ctrl/Cmd + B
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        toggle();
      }
    };

    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  }, [toggle]);

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

  // Only a phone has no room for a column: the toolbar is a drawer from the
  // left, the mirror of the inspector's on the right. Its switch sits at the
  // left end of the status bar, where the column's switch sits on a tablet —
  // nothing floats over the stage, and the bar's blue button stays the only
  // one on the screen. The panels its entries open are portalled to the end
  // of the page and stack above it; the full-screen sheet it replaces lay
  // above them, so on a phone they opened out of sight.
  if (isPhone) {
    return (
      <>
        {ownsSwitch && (
          <button
            type="button"
            onClick={() => setSheetOpen(!mobileOpen)}
            aria-expanded={mobileOpen}
            aria-controls={TOOL_RAIL_DRAWER_ID}
            className={`${secondaryButtonClass} h-9 gap-2 self-start px-3 text-sm`}
          >
            <WrenchIcon size={18} aria-hidden="true" />
            <span>{t('sidebar.ariaLabel')}</span>
          </button>
        )}

        {showsDrawer && (
          <aside
            id={TOOL_RAIL_DRAWER_ID}
            ref={drawerRef}
            tabIndex={-1}
            aria-labelledby={drawerTitleId}
            className={toolRailDrawerClass}
            onClick={handleDrawerClick}
          >
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-(--border-card) px-4 py-2">
              <h2 id={drawerTitleId} className="text-[15px] font-semibold">
                {t('sidebar.ariaLabel')}
              </h2>
              <button
                type="button"
                onClick={closeMobileOverlay}
                className={`${iconButtonClass} h-9 w-9 border-none bg-transparent shadow-none`}
                aria-label={t('common.close', 'Schließen')}
              >
                <XIcon size={18} aria-hidden="true" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
              <div className="flex min-h-full flex-col">{renderedChildren}</div>
            </div>
          </aside>
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
      aria-label={t('sidebar.ariaLabel')}
      // A landmark has no expanded state; the switch that changes the width
      // announces it (`aria-expanded` there). Tests read it from here.
      data-expanded={isExpanded}
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
                  ? t('sidebar.collapseShortcut')
                  : t('sidebar.expandShortcut')
              }
              aria-label={
                isExpanded
                  ? t('sidebar.collapseLabel')
                  : t('sidebar.expandLabel')
              }
              aria-expanded={isExpanded}
            >
              {isExpanded ? (
                <ArrowLineLeftIcon size={18} aria-hidden="true" />
              ) : (
                <ArrowLineRightIcon size={18} aria-hidden="true" />
              )}
              {isExpanded && <span>{t('sidebar.ariaLabel')}</span>}
            </button>
          </div>
        )}

        {/* The tools themselves, in the padding the rail's own entries are
            measured against (`ToolRail`). The rail's scrolling part reaches
            back into this padding with negative margins, so change the two
            together. */}
        <div className="min-h-0 flex-1 overflow-x-visible overflow-y-auto">
          <div className="flex h-full flex-col px-2 py-3">
            {renderedChildren}
          </div>
        </div>
      </div>
    </aside>
  );
}
