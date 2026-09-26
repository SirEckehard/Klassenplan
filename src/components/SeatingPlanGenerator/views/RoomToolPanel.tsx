// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlignCenterVerticalSimpleIcon,
  ArmchairIcon,
  FloppyDiskIcon,
  HammerIcon,
  SlidersHorizontalIcon,
} from '@phosphor-icons/react';
import type { ClassroomFeatureType, TableTemplateType } from '@/types';
import TablePreview from '@/components/TablePreview';
import {
  ToolRail,
  ToolRailButton,
  ToolRailDivider,
  ToolRailGroup,
  type ToolRailDensity,
} from '@/components/shell/ToolRail';
import {
  CanvasSettingsGroups,
  type CanvasSettingsGroup,
} from '@/components/SeatingPlanGenerator/canvas/CanvasSettingsButton';
import { menuSurfaceClass } from '@/utils';
import { TOUR_ANCHORS } from '@/components/onboarding/tours';

type FeaturePaletteItem = {
  type: ClassroomFeatureType;
  label: string;
  icon: React.ReactNode;
};

type Props = {
  density: ToolRailDensity;
  handleSaveTemplate: () => void;
  onTemplatePointerDown: (
    type: TableTemplateType,
    event: React.PointerEvent<Element>,
  ) => void;
  onOpenQuickSetup: () => void;
  quickSetupShortcutHint?: string;
  featurePalette: FeaturePaletteItem[];
  onFeaturePointerDown: (
    type: ClassroomFeatureType,
    event: React.PointerEvent<HTMLButtonElement>,
  ) => void;
  /** Grid, snapping, alignment guides and which room elements are shown. */
  settingsGroups: CanvasSettingsGroup[];
  /**
   * On a phone the tables, the room elements, the setup and the template
   * saving sit under the canvas (`MobileTableTemplates`), where a drag can
   * reach the room; the sheet carries only what is not there.
   */
  isPhone?: boolean;
};

const TABLE_TEMPLATES: Array<{ type: TableTemplateType; seatCount: number }> = [
  { type: 'single', seatCount: 1 },
  { type: 'double', seatCount: 2 },
  { type: 'group4', seatCount: 4 },
  { type: 'group6', seatCount: 6 },
];

/** One icon per settings group, so the rail stays readable without labels. */
const GROUP_ICONS: Record<string, React.ReactNode> = {
  'layout-base': <AlignCenterVerticalSimpleIcon size={18} />,
  'layout-features': <ArmchairIcon size={18} />,
};

/**
 * The tables are the room's main tool, so on the rail — where they stand
 * without their words — they get most of the 44px entry.
 */
const TEMPLATE_ICON_SIZE: Record<ToolRailDensity, number> = {
  compact: 32,
  comfortable: 24,
};

/**
 * The room layer's toolbar: what goes into the room, what the drawing of it
 * shows, and the templates a whole room is built from.
 *
 * Same sections and the same order as the other layers': the tables and the
 * room elements are dragged out of "Hinzufügen" — one group, split by a
 * hairline, so "Raumelemente" does not name a group and a view setting at
 * once — the view settings follow, and setting a room up from scratch or
 * keeping it as a template is managing.
 */
export default function RoomToolPanel({
  density,
  handleSaveTemplate,
  onTemplatePointerDown,
  onOpenQuickSetup,
  quickSetupShortcutHint,
  featurePalette,
  onFeaturePointerDown,
  settingsGroups,
  isPhone = false,
}: Props) {
  const { t } = useTranslation('generator');

  const templateLabels: Record<TableTemplateType, string> = {
    single: t('layout.singleSeat'),
    double: t('layout.doubleSeat'),
    group4: t('layout.group4'),
    group6: t('layout.group6'),
  };
  const setupLabel = t('layout.setupClassroom');
  const groups = settingsGroups.filter((group) => group.options.length > 0);

  return (
    <ToolRail density={density}>
      {!isPhone && (
        <ToolRailGroup title={t('toolRail.add')}>
          {TABLE_TEMPLATES.map(({ type, seatCount }) => (
            <ToolRailButton
              key={type}
              icon={
                <TablePreview
                  type={type}
                  iconSize={TEMPLATE_ICON_SIZE[density]}
                />
              }
              label={templateLabels[type]}
              title={`${templateLabels[type]} (${seatCount} ${t('common.seats')}) - ${t('layout.dragDropHint')}`}
              onPointerDown={(event) => onTemplatePointerDown(type, event)}
            />
          ))}
          {featurePalette.length > 0 && <ToolRailDivider />}
          {featurePalette.map((feature) => (
            <ToolRailButton
              key={feature.type}
              icon={feature.icon}
              label={feature.label}
              title={`${feature.label} ${t('layout.dragDropPlace')}`}
              onPointerDown={(event) =>
                onFeaturePointerDown(feature.type, event)
              }
            />
          ))}
        </ToolRailGroup>
      )}

      {/* The tour's mark names every option of the group, so it frames the
          group rather than its first entry. */}
      <ToolRailGroup
        title={t('toolRail.viewSettings')}
        data-tour={TOUR_ANCHORS.canvasSettings}
      >
        {groups.map((group) => (
          <ToolRailButton
            key={group.id}
            icon={GROUP_ICONS[group.id] ?? <SlidersHorizontalIcon size={18} />}
            label={group.title ?? t('editor.viewSettings')}
            panel={() => (
              <div className={`${menuSurfaceClass} p-1`}>
                <CanvasSettingsGroups groups={[group]} />
              </div>
            )}
          />
        ))}
      </ToolRailGroup>

      {!isPhone && (
        <ToolRailGroup title={t('toolRail.manage')}>
          <ToolRailButton
            icon={<HammerIcon size={18} />}
            label={setupLabel}
            title={
              quickSetupShortcutHint
                ? `${setupLabel} (${quickSetupShortcutHint})`
                : setupLabel
            }
            onClick={onOpenQuickSetup}
          />
          <ToolRailButton
            icon={<FloppyDiskIcon size={18} />}
            label={t('layout.saveTemplateButton')}
            title={t('layout.saveTemplate')}
            onClick={handleSaveTemplate}
          />
        </ToolRailGroup>
      )}
    </ToolRail>
  );
}
