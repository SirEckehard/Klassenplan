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
import { ROOM_TABLE_TEMPLATES } from '@/components/SeatingPlanGenerator/views/roomTableTemplates';
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
} from '@/components/SeatingPlanGenerator/canvas/CanvasSettingsGroups';
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
   * Below `lg` the tables and the room elements come out of the tray at the
   * status bar (`RoomAddTray`), where a drag reaches the whole room and each
   * piece has its word; the rail carries only what is not there.
   */
  tablesInTray?: boolean;
};

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
  tablesInTray = false,
}: Props) {
  const { t } = useTranslation('generator');

  const groups = settingsGroups.filter((group) => group.options.length > 0);

  return (
    <ToolRail density={density}>
      {!tablesInTray && (
        <ToolRailGroup
          title={t('toolRail.add')}
          data-tour={TOUR_ANCHORS.layoutSidebar}
        >
          {ROOM_TABLE_TEMPLATES.map(({ type, seatCount, labelKey }) => (
            <ToolRailButton
              key={type}
              icon={
                <TablePreview
                  type={type}
                  iconSize={TEMPLATE_ICON_SIZE[density]}
                />
              }
              label={t(labelKey)}
              title={`${t(labelKey)} (${seatCount} ${t('common.seats')}) – ${t('layout.dragDropHint')}`}
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

      <ToolRailGroup title={t('toolRail.viewSettings')}>
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
