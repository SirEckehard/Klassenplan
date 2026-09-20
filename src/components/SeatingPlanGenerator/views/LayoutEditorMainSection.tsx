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
import LayoutEditorQuickSetupOverlay from '@/components/SeatingPlanGenerator/views/LayoutEditorQuickSetupOverlay';
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
  quietIconButtonClass,
  secondaryButtonClass,
} from '@/utils';

/** Matches the pair the other layers put in the status bar. */
const statusBarButtonClass = `${quietIconButtonClass} h-9 w-9`;
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
  isQuickSetupOpen: boolean;
  undo: () => void;
  redo: () => void;
  canRedo: boolean;
  historyLength: number;
  canvasProps: React.ComponentProps<typeof ClassroomCanvas>;
  quickSetupOverlay: {
    panel: React.ReactNode;
    canDismiss: boolean;
    onClose: () => void;
  };
  onOpenQuickSetup: () => void;
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
    onSaveTemplate: () => void;
  };
};

/**
 * The canvas column of the room layer: toolbar, canvas, quick setup overlay,
 * the three context menus and the phone palette. Seat counts and the way on to
 * the plan live in the shell's status bar.
 * `LayoutEditorView` owns the state and wiring; this component only renders.
 */
const LayoutEditorMainSection = React.memo(function LayoutEditorMainSection({
  isPhone,
  containerRef,
  isQuickSetupOpen,
  undo,
  redo,
  canRedo,
  historyLength,
  canvasProps,
  quickSetupOverlay,
  onOpenQuickSetup,
  tableMenu,
  canvasMenu,
  featureMenu,
  featurePalette,
  mobileTemplatesProps,
}: LayoutEditorMainSectionProps) {
  const { t } = useTranslation('generator');
  return (
    <div className={`${workspaceStageClass} ${canvasStageClass} gap-4`}>
      {/* Mobile: Quick Setup Button above canvas for easy access */}
      {isPhone && (
        <button
          type="button"
          onClick={onOpenQuickSetup}
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
        className={`${canvasFrameClass} ${canvasFitClass} relative select-none`}
        style={{
          width: '100%',
          maxWidth: '100vw',
          ...(isQuickSetupOpen
            ? {
                borderColor: 'transparent',
                boxShadow: 'none',
                background: 'transparent',
              }
            : undefined),
        }}
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
            buttonClass={statusBarButtonClass}
          />
        </StatusBarPortal>
        <ClassroomCanvas {...canvasProps} />

        <LayoutEditorQuickSetupOverlay
          isOpen={isQuickSetupOpen}
          isPhone={isPhone}
          panel={quickSetupOverlay.panel}
          canDismiss={quickSetupOverlay.canDismiss}
          onClose={quickSetupOverlay.onClose}
        />

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
            onSaveTemplate={mobileTemplatesProps.onSaveTemplate}
          />
        </div>
      )}
    </div>
  );
});

export default LayoutEditorMainSection;
