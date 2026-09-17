// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import SmartSidebar from '@/components/ui/panels/SmartSidebar';
import SmartEditPanel from '@/components/ui/panels/SmartEditPanel';
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
    event: React.PointerEvent<Element>,
  ) => void;
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
  }: LayoutEditorSidebarSectionProps) {
    if (isPhone) {
      return null;
    }

    return (
      <SmartSidebar tourAnchor={TOUR_ANCHORS.layoutSidebar}>
        {({ isExpanded }) => (
          <SmartEditPanel
            density={isExpanded ? 'comfortable' : 'compact'}
            handleSaveTemplate={handleSaveTemplate}
            onTemplatePointerDown={onTemplatePointerDown}
            onOpenQuickSetup={onOpenQuickSetup}
            quickSetupShortcutHint={quickSetupShortcutHint}
            featurePalette={featurePalette}
            onFeaturePointerDown={onFeaturePointerDown}
          />
        )}
      </SmartSidebar>
    );
  },
);

export type { LayoutEditorSidebarSectionProps };
export default LayoutEditorSidebarSection;
