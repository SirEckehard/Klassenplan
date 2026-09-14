// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  HammerIcon,
} from '@phosphor-icons/react';
import HintTooltip from '@/components/ui/feedback/HintTooltip';
import ContextActionMenu, {
  type ContextAction,
} from '@/components/SeatingPlanGenerator/ContextActionMenu';
import ClassroomCanvas from '@/components/SeatingPlanGenerator/canvas/ClassroomCanvas';
import CanvasToolbar from '@/components/SeatingPlanGenerator/canvas/CanvasToolbar';
import MobileTableTemplates from '@/components/SeatingPlanGenerator/mobile/MobileTableTemplates';
import {
  CanvasSettingsButton,
  type CanvasSettingsGroup,
} from '@/components/SeatingPlanGenerator/canvas/CanvasSettingsButton';
import LayoutEditorQuickSetupOverlay from '@/components/SeatingPlanGenerator/views/LayoutEditorQuickSetupOverlay';
import LayoutEditorStatusBadge from '@/components/SeatingPlanGenerator/views/LayoutEditorStatusBadge';
import type { ClassroomFeatureType, TableTemplateType } from '@/types';
import type {
  TableContextMenuState,
  CanvasContextMenuState,
  FeatureContextMenuState,
} from '@/hooks/useContextMenus';
import {
  canvasFrameClass,
  primaryButtonClass,
  neutralButtonClass,
  secondaryButtonClass,
} from '@/utils';
import type { FeaturePaletteItem } from '@/hooks/canvas/useFeaturePaletteDrag';

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
  layoutSettingsGroups: CanvasSettingsGroup[];
  canvasProps: React.ComponentProps<typeof ClassroomCanvas>;
  studentsCount: number;
  seatCount: number;
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
  footerProps: {
    onEditStudents: () => void;
    onProceedToPlan: () => void;
    seatCount: number;
    studentsCount: number;
  };
};

/**
 * The canvas column of step 2: toolbar, canvas, status badge, quick setup
 * overlay, the three context menus, the phone palette and the wizard footer.
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
  layoutSettingsGroups,
  canvasProps,
  studentsCount,
  seatCount,
  quickSetupOverlay,
  onOpenQuickSetup,
  tableMenu,
  canvasMenu,
  featureMenu,
  featurePalette,
  mobileTemplatesProps,
  footerProps,
}: LayoutEditorMainSectionProps) {
  const { t } = useTranslation('generator');
  const seatHintId = React.useId();
  const missingSeats = footerProps.studentsCount - footerProps.seatCount;
  // Empty string when the step is not blocked, so the JSX can test it directly.
  const seatShortfallHint =
    missingSeats <= 0
      ? ''
      : footerProps.seatCount === 0
        ? t('wizard.noTablesYet', {
            students: footerProps.studentsCount,
            defaultValue:
              'Füge zuerst Tische für deine {{students}} Schüler ein.',
          })
        : t('wizard.seatsMissing', {
            count: missingSeats,
            students: footerProps.studentsCount,
            defaultValue:
              'Es fehlen noch {{count}} Sitzplätze für {{students}} Schüler.',
          });
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4">
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
        className={`${canvasFrameClass} relative select-none`}
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
        <div className="absolute top-3 left-3 z-20">
          <CanvasToolbar
            onUndo={undo}
            canUndo={historyLength > 0}
            onRedo={redo}
            canRedo={canRedo}
          />
        </div>
        <CanvasSettingsButton
          groups={layoutSettingsGroups}
          buttonTitle={t('editor.viewSettings', 'Ansichtseinstellungen')}
        />
        <ClassroomCanvas {...canvasProps} />

        {!isQuickSetupOpen && (
          <div className="absolute bottom-3 right-3 z-20">
            <LayoutEditorStatusBadge
              studentsCount={studentsCount}
              seatCount={seatCount}
            />
          </div>
        )}

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

      <div className="flex flex-col sm:flex-row justify-between gap-2 mt-4">
        <button
          type="button"
          onClick={footerProps.onEditStudents}
          className={`${neutralButtonClass} w-full justify-center gap-2 sm:w-auto`}
          title={t(
            'wizard.backToStudentsShortcut',
            'Zurück zur Klassenliste (Alt/Option+←)',
          )}
        >
          <ArrowLeftIcon className="w-4 h-4" />
          {t('wizard.backToStudents', 'Zurück zur Klassenliste')}
        </button>
        {/* Blocked state stays aria-disabled rather than disabled: the button
            keeps focus and pointer events, so the hint shows on hover/focus and
            the click still surfaces the toast explaining the shortfall. */}
        <div className="group relative w-full sm:w-auto">
          <button
            type="button"
            onClick={footerProps.onProceedToPlan}
            aria-disabled={seatShortfallHint ? true : undefined}
            aria-describedby={seatShortfallHint ? seatHintId : undefined}
            className={`${primaryButtonClass} flex w-full items-center justify-center gap-2 sm:w-auto ${
              seatShortfallHint ? 'cursor-not-allowed opacity-60' : ''
            }`}
            title={t(
              'wizard.forwardToPlanShortcut',
              'Weiter zum Sitzplan (Alt/Option+→)',
            )}
          >
            {t('wizard.forwardToPlan', 'Weiter zum Sitzplan')}
            <ArrowRightIcon className="w-4 h-4" />
          </button>
          {seatShortfallHint && (
            <HintTooltip id={seatHintId} hint={seatShortfallHint} />
          )}
        </div>
      </div>
    </div>
  );
});

export default LayoutEditorMainSection;
