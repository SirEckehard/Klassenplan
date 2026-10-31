// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import ContextMenu, {
  type ContextMenuItem,
  type ContextMenuRequest,
} from '@/components/ui/navigation/ContextMenu';
import ClassroomCanvas from '@/components/SeatingPlanGenerator/canvas/ClassroomCanvas';
import CanvasToolbar from '@/components/SeatingPlanGenerator/canvas/CanvasToolbar';
import StatusBarPortal from '@/components/shell/StatusBarPortal';
import MobileTableTemplates from '@/components/SeatingPlanGenerator/mobile/MobileTableTemplates';
import { TOUR_ANCHORS } from '@/components/onboarding/tours';
import type { ClassroomFeatureType, TableTemplateType } from '@/types';
import type {
  TableContextMenuState,
  CanvasContextMenuState,
  FeatureContextMenuState,
  PointerKind,
  MenuTrigger,
} from '@/hooks/useContextMenus';
import { canvasFrameClass, canvasStageClass, canvasFitClass } from '@/utils';
import {
  statusBarHistoryButtonClass,
  statusBarHistoryGroupClass,
} from '@/components/shell/StatusBarFrame';
import type { FeaturePaletteItem } from '@/hooks/canvas/useFeaturePaletteDrag';
import { workspaceStageClass } from '@/components/shell/shellTokens';
import { useTurnAnimation } from '@/hooks/ui/useTurnAnimation';
import { TURNED_FRAME_MAX_WIDTH } from '@/utils/ui/portraitPlan';
import type { PlanTurn } from '@/utils/canvas/turn';

export type LayoutEditorContextMenuProps<T> = {
  state: T | null;
  menuRef: React.RefObject<HTMLDivElement | null>;
  actions: ContextMenuItem[];
  onCloseMenu: () => void;
};

type MenuOrigin = {
  clientX: number;
  clientY: number;
  pointerType?: PointerKind;
  trigger?: MenuTrigger;
};

/** Where the canvas asked for a menu, as the shared menu takes it. */
const menuRequestOf = (state: MenuOrigin): ContextMenuRequest => ({
  x: state.clientX,
  y: state.clientY,
  pointer:
    state.trigger === 'longpress' ||
    state.pointerType === 'touch' ||
    state.pointerType === 'pen'
      ? 'touch'
      : state.trigger === 'keyboard' || state.pointerType === 'keyboard'
        ? 'keyboard'
        : 'mouse',
});

type LayoutEditorMainSectionProps = {
  isPhone: boolean;
  containerRef: React.RefObject<HTMLDivElement | null>;
  undo: () => void;
  redo: () => void;
  canRedo: boolean;
  historyLength: number;
  canvasProps: React.ComponentProps<typeof ClassroomCanvas>;
  /** The quarter turn the room is drawn with on a screen held upright. */
  turn: PlanTurn | null;
  tableMenu: LayoutEditorContextMenuProps<TableContextMenuState>;
  canvasMenu: LayoutEditorContextMenuProps<CanvasContextMenuState>;
  featureMenu: LayoutEditorContextMenuProps<FeatureContextMenuState>;
  featurePalette: FeaturePaletteItem[];
  mobileTemplatesProps: {
    onTemplatePointerDown: (
      type: TableTemplateType,
      event: React.PointerEvent<Element>,
    ) => void;
    onFeaturePointerDown: (
      type: ClassroomFeatureType,
      event: React.PointerEvent<Element>,
    ) => void;
    onTemplateAdd: (type: TableTemplateType) => void;
    onFeatureAdd: (type: ClassroomFeatureType) => void;
  };
};

/**
 * The canvas column of the room layer: the canvas, the three context menus and
 * the phone palette. Seat counts and the way on to the plan live in the
 * shell's status bar, the setup and the templates in the inspector.
 * `LayoutEditorView` owns the state and wiring; this component only renders.
 */
const LayoutEditorMainSection = React.memo(function LayoutEditorMainSection({
  isPhone,
  containerRef,
  undo,
  redo,
  canRedo,
  historyLength,
  canvasProps,
  turn,
  tableMenu,
  canvasMenu,
  featureMenu,
  featurePalette,
  mobileTemplatesProps,
}: LayoutEditorMainSectionProps) {
  const { t } = useTranslation('generator');
  // Turning the device turns the frame into its new lie, as on the plan.
  useTurnAnimation(containerRef, turn);
  return (
    // A phone has no inspector column: the setup is in the drawer, opened by
    // the switch at the right end of the status bar, so nothing above the
    // canvas repeats the way there.
    <div className={`${workspaceStageClass} ${canvasStageClass} gap-4`}>
      <div
        data-testid="classroom-canvas"
        data-tour={TOUR_ANCHORS.layoutCanvas}
        // The width comes from `canvas-fit`, the same for room, plan and
        // circle; an inline width would override its cap from `lg` up and push
        // the room's bottom edge out of sight.
        className={`${canvasFrameClass} ${canvasFitClass} relative select-none ${
          turn === null ? '' : 'mx-auto'
        }`}
        style={{ maxWidth: turn === null ? '100vw' : TURNED_FRAME_MAX_WIDTH }}
        ref={containerRef}
      >
        {/* Undo/redo sit in the shell's status bar, where the other two
            histories are too — the stage keeps nothing floating over it. */}
        <StatusBarPortal>
          <CanvasToolbar
            onUndo={undo}
            canUndo={historyLength > 0}
            onRedo={redo}
            canRedo={canRedo}
            buttonClass={statusBarHistoryButtonClass}
            groupClass={statusBarHistoryGroupClass}
          />
        </StatusBarPortal>
        <ClassroomCanvas {...canvasProps} />

        {/* An empty room says what fills it — words on the drawing, not a
            control over it, so a table dragged in lands right through them. */}
        {canvasProps.sceneTables.length === 0 &&
          !canvasProps.templateDragPreview &&
          !canvasProps.featureDragPreview && (
            <p className="pointer-events-none absolute inset-x-8 top-1/2 -translate-y-1/2 text-center text-sm leading-relaxed text-balance text-(--text-muted)">
              {t('layout.emptyRoomHint')}
            </p>
          )}

        {/* One menu at a time: a table's, a room element's or the empty
            floor's — the shared shape, portalled over the page. */}
        {[tableMenu, canvasMenu, featureMenu].map((menu, index) =>
          menu.state && menu.actions.length > 0 ? (
            <ContextMenu
              key={index}
              request={menuRequestOf(menu.state)}
              items={menu.actions}
              label={t('contextMenu.roomLabel')}
              onClose={menu.onCloseMenu}
              returnFocusRef={containerRef}
              menuRef={menu.menuRef}
            />
          ) : null,
        )}
      </div>

      {isPhone && (
        <div className="mt-4">
          <MobileTableTemplates
            onTemplatePointerDown={mobileTemplatesProps.onTemplatePointerDown}
            featurePalette={featurePalette}
            onFeaturePointerDown={mobileTemplatesProps.onFeaturePointerDown}
            onTemplateAdd={mobileTemplatesProps.onTemplateAdd}
            onFeatureAdd={mobileTemplatesProps.onFeatureAdd}
          />
        </div>
      )}
    </div>
  );
});

export default LayoutEditorMainSection;
