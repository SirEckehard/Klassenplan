// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import SmartSidebar from '@/components/ui/panels/SmartSidebar';
import RoomToolPanel from '@/components/SeatingPlanGenerator/views/RoomToolPanel';
import type { CanvasSettingsGroup } from '@/components/SeatingPlanGenerator/canvas/CanvasSettingsGroups';
import { TOUR_ANCHORS } from '@/components/onboarding/tours';
import type { ClassroomFeatureType, TableTemplateType } from '@/types';

type SidebarFeaturePaletteItem = {
  type: ClassroomFeatureType;
  label: string;
  icon: React.ReactNode;
};

type LayoutEditorSidebarSectionProps = {
  /** Below `lg` the tables come out of the tray at the status bar. */
  tablesInTray: boolean;
  onTemplatePointerDown: (
    type: TableTemplateType,
    event: React.PointerEvent<Element>,
  ) => void;
  onTemplateAdd: (type: TableTemplateType) => void;
  featurePalette: SidebarFeaturePaletteItem[];
  onFeaturePointerDown: (
    type: ClassroomFeatureType,
    event: React.PointerEvent<HTMLButtonElement>,
  ) => void;
  onFeatureAdd: (type: ClassroomFeatureType) => void;
  /** Grid, snapping, guides and room-element visibility. */
  settingsGroups: CanvasSettingsGroup[];
};

const LayoutEditorSidebarSection = React.memo(
  function LayoutEditorSidebarSection({
    tablesInTray,
    onTemplatePointerDown,
    onTemplateAdd,
    featurePalette,
    onFeaturePointerDown,
    onFeatureAdd,
    settingsGroups,
  }: LayoutEditorSidebarSectionProps) {
    // Below `lg` the rail keeps its view settings and the foot every rail
    // shares — the class tools, the plans, the backup — which live nowhere
    // else; the tables are in the tray at the status bar, which carries the
    // tour's mark for them there.
    return (
      <SmartSidebar
        tourAnchor={tablesInTray ? undefined : TOUR_ANCHORS.layoutSidebar}
      >
        {({ isExpanded }) => (
          <RoomToolPanel
            density={isExpanded ? 'comfortable' : 'compact'}
            onTemplatePointerDown={onTemplatePointerDown}
            onTemplateAdd={onTemplateAdd}
            featurePalette={featurePalette}
            onFeaturePointerDown={onFeaturePointerDown}
            onFeatureAdd={onFeatureAdd}
            settingsGroups={settingsGroups}
            tablesInTray={tablesInTray}
          />
        )}
      </SmartSidebar>
    );
  },
);

export type { LayoutEditorSidebarSectionProps };
export default LayoutEditorSidebarSection;
