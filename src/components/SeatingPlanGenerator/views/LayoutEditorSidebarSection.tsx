import React from 'react';
import SmartSidebar from '@/components/ui/panels/SmartSidebar';
import SmartEditPanel from '@/components/ui/panels/SmartEditPanel';
import TableTemplateIcons from '@/components/ui/icons/TableTemplateIcons';
import StorageSidebarSection from '@/components/ui/navigation/StorageSidebarSection';
import type { ClassroomFeatureType, TableTemplateType } from '@/types';

type SidebarFeaturePaletteItem = {
  type: ClassroomFeatureType;
  label: string;
  icon: React.ReactNode;
};

type LayoutEditorSidebarSectionProps = {
  isMobile: boolean;
  isFirstVisit: boolean;
  studentsCount: number;
  seatCount: number;
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
    isMobile,
    isFirstVisit,
    studentsCount,
    seatCount,
    handleSaveTemplate,
    onTemplatePointerDown,
    onOpenQuickSetup,
    quickSetupShortcutHint,
    featurePalette,
    onFeaturePointerDown,
  }: LayoutEditorSidebarSectionProps) {
    if (isMobile) {
      return null;
    }

    return (
      <SmartSidebar isFirstVisit={isFirstVisit}>
        {({ isExpanded }) =>
          isExpanded ? (
            <>
              <SmartEditPanel
                studentsCount={studentsCount}
                seatCount={seatCount}
                handleSaveTemplate={handleSaveTemplate}
                onTemplatePointerDown={onTemplatePointerDown}
                onOpenQuickSetup={onOpenQuickSetup}
                quickSetupShortcutHint={quickSetupShortcutHint}
                featurePalette={featurePalette}
                onFeaturePointerDown={onFeaturePointerDown}
              />
              <StorageSidebarSection isExpanded />
            </>
          ) : (
            <>
              <TableTemplateIcons
                onTemplatePointerDown={onTemplatePointerDown}
                isExpanded={isExpanded}
                onOpenQuickSetup={onOpenQuickSetup}
                quickSetupShortcutHint={quickSetupShortcutHint}
                onSaveTemplate={handleSaveTemplate}
                featurePalette={featurePalette}
                onFeaturePointerDown={onFeaturePointerDown}
              />
              <StorageSidebarSection isExpanded={false} />
            </>
          )
        }
      </SmartSidebar>
    );
  },
);

export type { LayoutEditorSidebarSectionProps };
export default LayoutEditorSidebarSection;
