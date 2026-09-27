// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import { HammerIcon } from '@phosphor-icons/react';
import ContextActionMenu, {
  type ContextAction,
} from '@/components/SeatingPlanGenerator/ContextActionMenu';
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
} from '@/hooks/useContextMenus';
import {
  canvasFrameClass,
  canvasStageClass,
  canvasFitClass,
  secondaryButtonClass,
} from '@/utils';
import {
  statusBarHistoryButtonClass,
  statusBarHistoryGroupClass,
} from '@/components/shell/StatusBarFrame';
import type { FeaturePaletteItem } from '@/hooks/canvas/useFeaturePaletteDrag';
import { workspaceStageClass } from '@/components/shell/shellTokens';

export type LayoutEditorContextMenuProps<T> = {
  state: T | null;
  position: { left: number; top: number } | null;
  menuRef: React.RefObject<HTMLDivElement | null>;
  actions: ContextAction[];
  onCloseMenu: () => void;
};

type LayoutEditorMainSectionProps = {
  isPhone: boolean;
  containerRef: React.RefObject<HTMLDivElement | null>;
  undo: () => void;
  redo: () => void;
  canRedo: boolean;
  historyLength: number;
  canvasProps: React.ComponentProps<typeof ClassroomCanvas>;
  /** Shows the inspector's setup — on a phone, in the drawer. */
  onOpenSetup: () => void;
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
  onOpenSetup,
  tableMenu,
  canvasMenu,
  featureMenu,
  featurePalette,
  mobileTemplatesProps,
}: LayoutEditorMainSectionProps) {
  const { t } = useTranslation('generator');
  return (
    <div className={`${workspaceStageClass} ${canvasStageClass} gap-4`}>
      {/* A phone has no inspector column: the setup is in the drawer, and
          this names the way there. */}
      {isPhone && (
        <button
          type="button"
          onClick={onOpenSetup}
          className={`${secondaryButtonClass} flex w-full items-center justify-center gap-3 px-4 py-3 text-sm h-12`}
          title={t('layout.setupClassroom', 'Klassenraum einrichten')}
        >
          <HammerIcon className="h-4 w-4 shrink-0" />
          <span className="text-sm font-semibold">
            {t('layout.setupClassroom', 'Klassenraum einrichten')}
          </span>
        </button>
      )}
      <div
        data-testid="classroom-canvas"
        data-tour={TOUR_ANCHORS.layoutCanvas}
        // Full width as a class, not an inline style: from `lg` up
        // `canvas-fit` caps the width by the stage's height, and an inline
        // width would override it and push the room's bottom edge out of sight.
        className={`${canvasFrameClass} ${canvasFitClass} relative w-full select-none`}
        style={{ maxWidth: '100vw' }}
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

        {tableMenu.state && tableMenu.position && (
          <div ref={tableMenu.menuRef}>
            <ContextActionMenu
              x={tableMenu.position.left}
              y={tableMenu.position.top}
              actions={tableMenu.actions}
              onCloseMenu={tableMenu.onCloseMenu}
              pointerType={tableMenu.state.pointerType}
              trigger={tableMenu.state.trigger}
            />
          </div>
        )}
        {canvasMenu.state && canvasMenu.position && (
          <div ref={canvasMenu.menuRef}>
            <ContextActionMenu
              x={canvasMenu.position.left}
              y={canvasMenu.position.top}
              actions={canvasMenu.actions}
              onCloseMenu={canvasMenu.onCloseMenu}
              pointerType={canvasMenu.state.pointerType}
              trigger={canvasMenu.state.trigger}
            />
          </div>
        )}
        {featureMenu.state && featureMenu.position && (
          <div ref={featureMenu.menuRef}>
            <ContextActionMenu
              x={featureMenu.position.left}
              y={featureMenu.position.top}
              actions={featureMenu.actions}
              onCloseMenu={featureMenu.onCloseMenu}
              pointerType={featureMenu.state.pointerType}
              trigger={featureMenu.state.trigger}
            />
          </div>
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
