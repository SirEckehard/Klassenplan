// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlignCenterVerticalSimpleIcon,
  ArmchairIcon,
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
  onTemplatePointerDown: (
    type: TableTemplateType,
    event: React.PointerEvent<Element>,
  ) => void;
  /** A click or Enter adds one where there is room — dragging is optional. */
  onTemplateAdd: (type: TableTemplateType) => void;
  featurePalette: FeaturePaletteItem[];
  onFeaturePointerDown: (
    type: ClassroomFeatureType,
    event: React.PointerEvent<HTMLButtonElement>,
  ) => void;
  onFeatureAdd: (type: ClassroomFeatureType) => void;
  /** Grid, snapping, alignment guides and which room elements are shown. */
  settingsGroups: CanvasSettingsGroup[];
  /**
   * On a phone the tables and the room elements sit under the canvas
   * (`MobileTableTemplates`), where a drag can reach the room; the sheet
   * carries only what is not there.
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
 * The room layer's toolbar: what goes into the room and what the drawing of
 * it shows.
 *
 * Same sections and the same order as the other layers': the tables and the
 * room elements come out of "Hinzufügen" — dragged to a place, or clicked
 * (Enter) onto the free spot nearest the middle — one group, split by a
 * hairline, so "Raumelemente" does not name a group and a view setting at
 * once — and the view settings follow. Setting a room up from scratch and
 * keeping it as a template concern the room as a whole, so they are the
 * inspector's while nothing is selected (`RoomSetupSections`), and the room
 * has no "Verwalten" of its own.
 */
export default function RoomToolPanel({
  density,
  onTemplatePointerDown,
  onTemplateAdd,
  featurePalette,
  onFeaturePointerDown,
  onFeatureAdd,
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
              title={`${templateLabels[type]} (${seatCount} ${t('common.seats')}) – ${t('layout.dragDropHint')}`}
              onPointerDown={(event) => onTemplatePointerDown(type, event)}
              onClick={() => onTemplateAdd(type)}
            />
          ))}
          {featurePalette.length > 0 && <ToolRailDivider />}
          {featurePalette.map((feature) => (
            <ToolRailButton
              key={feature.type}
              icon={feature.icon}
              label={feature.label}
              title={`${feature.label} – ${t('layout.dragDropHint')}`}
              onPointerDown={(event) =>
                onFeaturePointerDown(feature.type, event)
              }
              onClick={() => onFeatureAdd(feature.type)}
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
    </ToolRail>
  );
}
