// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import SmartSidebar from '@/components/ui/panels/SmartSidebar';
import RoomToolPanel from '@/components/SeatingPlanGenerator/views/RoomToolPanel';
import type { CanvasSettingsGroup } from '@/components/SeatingPlanGenerator/canvas/CanvasSettingsButton';
import { TOUR_ANCHORS } from '@/components/onboarding/tours';
import type { ClassroomFeatureType, TableTemplateType } from '@/types';

type SidebarFeaturePaletteItem = {
  type: ClassroomFeatureType;
  label: string;
  icon: React.ReactNode;
};

type LayoutEditorSidebarSectionProps = {
  isPhone: boolean;
  handleSaveTemplate: () => void;
  onTemplatePointerDown: (
    type: TableTemplateType,
    event: React.PointerEvent<Element>,
  ) => void;
  onOpenQuickSetup: () => void;
  quickSetupShortcutHint: string;
  featurePalette: SidebarFeaturePaletteItem[];
  onFeaturePointerDown: (
    type: ClassroomFeatureType,
    event: React.PointerEvent<HTMLButtonElement>,
  ) => void;
  /** Grid, snapping, guides and room-element visibility. */
  settingsGroups: CanvasSettingsGroup[];
};

const LayoutEditorSidebarSection = React.memo(
  function LayoutEditorSidebarSection({
    isPhone,
    handleSaveTemplate,
    onTemplatePointerDown,
    onOpenQuickSetup,
    quickSetupShortcutHint,
    featurePalette,
    onFeaturePointerDown,
    settingsGroups,
  }: LayoutEditorSidebarSectionProps) {
    // A phone gets the sheet too: its tables and its setup sit under the
    // canvas, but the view settings and the foot every rail shares — the
    // class tools, the plans, the backup — live nowhere else.
    return (
      <SmartSidebar tourAnchor={TOUR_ANCHORS.layoutSidebar}>
        {({ isExpanded }) => (
          <RoomToolPanel
            density={isExpanded ? 'comfortable' : 'compact'}
            handleSaveTemplate={handleSaveTemplate}
            onTemplatePointerDown={onTemplatePointerDown}
            onOpenQuickSetup={onOpenQuickSetup}
            quickSetupShortcutHint={quickSetupShortcutHint}
            featurePalette={featurePalette}
            onFeaturePointerDown={onFeaturePointerDown}
            settingsGroups={settingsGroups}
            isPhone={isPhone}
          />
        )}
      </SmartSidebar>
    );
  },
);

export type { LayoutEditorSidebarSectionProps };
export default LayoutEditorSidebarSection;
