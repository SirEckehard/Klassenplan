// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import { PlusIcon } from '@phosphor-icons/react';
import type { ClassroomFeatureType, TableTemplateType } from '@/types';
import TablePreview from '@/components/TablePreview';
import StatusBarPortal from '@/components/shell/StatusBarPortal';
import { statusBarPressedClass } from '@/components/shell/StatusBarFrame';
import { touchHitAreaClass } from '@/components/shell/shellTokens';
import { TOUR_ANCHORS } from '@/components/onboarding/tours';
import { ROOM_TABLE_TEMPLATES } from '@/components/SeatingPlanGenerator/views/roomTableTemplates';
import { useInspector } from '@/contexts/InspectorContext';
import { useShellToolRail } from '@/contexts/ToolRailContext';
import { useLayoutMode } from '@/hooks/ui/useLayoutMode';
import { useOutsideTap } from '@/hooks/ui/useOutsideTap';
import { usePanelMotion } from '@/hooks/ui/usePanelMotion';
import { secondaryButtonClass } from '@/utils';
import { CANVAS_COVER_ATTRIBUTE } from '@/utils/canvas/canvasCover';

/** What the tray shows of a room element: its kind, its word, its icon. */
type TrayFeature = {
  type: ClassroomFeatureType;
  label: string;
  icon: React.ReactNode;
};

type RoomAddTrayProps = {
  onTemplatePointerDown: (
    type: TableTemplateType,
    event: React.PointerEvent<Element>,
  ) => void;
  /** A tap adds one where there is room; dragging picks the place. */
  onTemplateAdd: (type: TableTemplateType) => void;
  featurePalette: TrayFeature[];
  onFeaturePointerDown: (
    type: ClassroomFeatureType,
    event: React.PointerEvent<HTMLButtonElement>,
  ) => void;
  onFeatureAdd: (type: ClassroomFeatureType) => void;
};

/** Marks the switch, whose own taps the tray leaves to it. */
const TOGGLE_SELECTOR = '[data-room-add-toggle]';

/**
 * A piece of the tray: a table's drawing or a room element's icon over its
 * word, on the paper of the tray rather than a card of its own. It is dragged
 * out as often as it is tapped, so a finger on it never scrolls.
 */
const pieceClass =
  'flex min-w-0 cursor-grab touch-none flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-caption font-medium whitespace-nowrap text-(--text-muted) transition select-none hover:bg-(--surface-sunken) focus-visible:ring-2 focus-visible:ring-(--focus-ring) focus-visible:outline-none active:cursor-grabbing active:bg-(--surface-option-selected) md:min-w-15 md:text-micro';

/**
 * Where tables and room elements come from below `lg`, where the toolbar is
 * a drawer or a column of icons: "Hinzufügen" in the status bar — the room
 * layer's own action, where the plan layer has "Mischen", hanging over the
 * bar below `md` — raises a tray out of the bar.
 *
 * A tap on a piece puts it on the free spot nearest the middle of the room
 * and leaves the tray open, so several follow one another. A piece dragged
 * out sinks the tray into the bar once the finger has left it, so the whole
 * room takes the drop, and the tray rises again when the drag is over. The
 * switch, a tap beside the tray and Escape put it away; a drawer opening
 * takes its place, as the two drawers take turns.
 */
export default function RoomAddTray({
  onTemplatePointerDown,
  onTemplateAdd,
  featurePalette,
  onFeaturePointerDown,
  onFeatureAdd,
}: RoomAddTrayProps) {
  const { t } = useTranslation('generator');
  const layoutMode = useLayoutMode();
  const { drawerOpen, setDrawerOpen, helpOpen, setHelpOpen } = useInspector();
  const toolRail = useShellToolRail();
  const railDrawerOpen = toolRail?.sheetOpen ?? false;
  const setRailDrawerOpen = toolRail?.setSheetOpen;

  const [open, setOpen] = React.useState(false);
  // A piece is being dragged out and the finger has left the tray.
  const [sunk, setSunk] = React.useState(false);
  const trayRef = React.useRef<HTMLDivElement | null>(null);
  const toggleRef = React.useRef<HTMLButtonElement | null>(null);
  const focusFirstRef = React.useRef(false);
  const stopWatchRef = React.useRef<(() => void) | null>(null);
  const trayId = React.useId();

  // A drawer covers the bottom of the stage as well, so it takes the tray's
  // place however it was opened — its switch, Ctrl/⌘+E, the help.
  const shown = open && !drawerOpen && !helpOpen && !railDrawerOpen;

  const close = React.useCallback(() => setOpen(false), []);

  useOutsideTap(trayRef, close, shown && !sunk, {
    ignoreSelector: TOGGLE_SELECTOR,
  });
  usePanelMotion(trayRef, shown && !sunk, 'bottom', layoutMode);

  // Opened from the keyboard, the focus goes to the first piece: the tray
  // stands apart from its switch in the page's order.
  React.useEffect(() => {
    if (!shown || !focusFirstRef.current) return;
    focusFirstRef.current = false;
    trayRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
  }, [shown]);

  React.useEffect(() => () => stopWatchRef.current?.(), []);

  const handleToggle = (event: React.MouseEvent<HTMLButtonElement>) => {
    const next = !shown;
    if (next) {
      setDrawerOpen(false);
      setHelpOpen(false);
      setRailDrawerOpen?.(false);
      // A click from the keyboard has no pointer and counts no presses.
      focusFirstRef.current = event.detail === 0;
    }
    setOpen(next);
  };

  const closeAndReturn = () => {
    setOpen(false);
    toggleRef.current?.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== 'Escape' || !shown) return;
    event.preventDefault();
    event.stopPropagation();
    closeAndReturn();
  };

  /**
   * Follows the pointer that pressed a piece: once it leaves the tray the
   * tray sinks, and when the pointer lifts — over the room or not — it rises
   * again. The tray stays mounted meanwhile, hidden, since the piece under the
   * finger is where its pointer events are dispatched.
   */
  const watchDragOut = (event: React.PointerEvent) => {
    const tray = trayRef.current;
    if (!tray) return;
    stopWatchRef.current?.();
    const rect = tray.getBoundingClientRect();
    const pointerId = event.pointerId;
    function handleMove(move: PointerEvent) {
      if (move.pointerId !== pointerId) return;
      const inside =
        move.clientX >= rect.left &&
        move.clientX <= rect.right &&
        move.clientY >= rect.top &&
        move.clientY <= rect.bottom;
      if (!inside) setSunk(true);
    }
    function handleEnd(end: PointerEvent) {
      if (end.pointerId !== pointerId) return;
      stop();
      setSunk(false);
    }
    function stop() {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleEnd);
      window.removeEventListener('pointercancel', handleEnd);
      stopWatchRef.current = null;
    }
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleEnd);
    window.addEventListener('pointercancel', handleEnd);
    stopWatchRef.current = stop;
  };

  return (
    <>
      <StatusBarPortal slot="action">
        <button
          ref={toggleRef}
          type="button"
          data-room-add-toggle=""
          // Where the tables are, as the toolbar is from `lg` up.
          data-tour={TOUR_ANCHORS.layoutSidebar}
          aria-expanded={shown}
          aria-controls={shown ? trayId : undefined}
          title={t('layout.addTrayTitle')}
          onClick={handleToggle}
          onKeyDown={handleKeyDown}
          className={`${secondaryButtonClass} ${touchHitAreaClass} h-9 shrink-0 gap-2 px-3 whitespace-nowrap ${
            shown ? statusBarPressedClass : ''
          }`}
        >
          <PlusIcon className="h-4 w-4" aria-hidden="true" />
          <span>{t('toolRail.add')}</span>
        </button>
      </StatusBarPortal>

      {shown && (
        // It stands on the status bar, under it in the stacking order, so it
        // rises out of the bar; below `md` it leaves room at its foot for the
        // switch, which hangs over the bar there.
        <div
          ref={trayRef}
          id={trayId}
          role="group"
          aria-label={t('layout.addTrayTitle')}
          // A piece let go over the tray lands nowhere, though the room lies
          // under it.
          {...{ [CANVAS_COVER_ATTRIBUTE]: '' }}
          onKeyDown={handleKeyDown}
          className={`fixed inset-x-0 bottom-(--shell-bottom-inset) z-20 touch-none rounded-t-xl border-t border-(--border-card) bg-(--surface-card) p-2 shadow-(--shadow-sheet) max-md:pb-16 md:inset-x-4 md:mx-auto md:w-fit md:border-x ${
            sunk ? 'invisible' : ''
          }`}
        >
          <div className="flex flex-col md:flex-row md:items-center">
            <div className="grid grid-cols-4 gap-0.5 md:flex">
              {ROOM_TABLE_TEMPLATES.map(({ type, seatCount, labelKey }) => {
                const label = t(labelKey);
                return (
                  <button
                    key={type}
                    type="button"
                    className={pieceClass}
                    title={`${label} (${seatCount} ${t('common.seats')}) – ${t('layout.dragDropHint')}`}
                    onPointerDown={(event) => {
                      onTemplatePointerDown(type, event);
                      watchDragOut(event);
                    }}
                    onClick={() => onTemplateAdd(type)}
                  >
                    <TablePreview type={type} iconSize={28} />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
            {featurePalette.length > 0 && (
              <div
                aria-hidden="true"
                className="mx-2 my-1.5 h-px bg-(--border-card) md:my-0 md:h-10 md:w-px"
              />
            )}
            <div className="grid grid-cols-4 gap-0.5 md:flex">
              {featurePalette.map((feature) => (
                <button
                  key={feature.type}
                  type="button"
                  className={pieceClass}
                  title={`${feature.label} – ${t('layout.dragDropHint')}`}
                  onPointerDown={(event) => {
                    onFeaturePointerDown(feature.type, event);
                    watchDragOut(event);
                  }}
                  onClick={() => onFeatureAdd(feature.type)}
                >
                  <span
                    aria-hidden="true"
                    className="flex h-7 items-center text-(--text-page)"
                  >
                    {feature.icon}
                  </span>
                  <span>{feature.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
