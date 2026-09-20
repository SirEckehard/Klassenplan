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
  ToolRailGroup,
  type ToolRailDensity,
} from '@/components/shell/ToolRail';
import {
  CanvasSettingsGroups,
  type CanvasSettingsGroup,
} from '@/components/SeatingPlanGenerator/canvas/CanvasSettingsButton';
import { cardSurfaceClass } from '@/utils';
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

/** A table drawn small; the preview is laid out at 80px and scaled down. */
function TemplatePreview({ type }: { type: TableTemplateType }) {
  return (
    <span className="relative flex h-6 w-6 items-center justify-center">
      <span
        className="absolute"
        style={{
          width: '80px',
          height: '80px',
          transform: 'scale(0.3)',
          transformOrigin: 'center center',
        }}
      >
        <TablePreview type={type} fixedSize={true} />
      </span>
    </span>
  );
}

/**
 * The room layer's toolbar: what goes into the room, what the plan of it
 * shows, and the templates a whole room is built from.
 *
 * Same three sections and the same order as the other layers': the tables and
 * room elements are dragged out of the insert group, the view switches sit in
 * the middle where the class layer has its views, and setting a room up from
 * scratch or keeping it as a template is managing, so it sits at the bottom.
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
      <ToolRailGroup title={t('layout.tableTypes')}>
        {TABLE_TEMPLATES.map(({ type, seatCount }) => (
          <ToolRailButton
            key={type}
            icon={<TemplatePreview type={type} />}
            label={templateLabels[type]}
            title={`${templateLabels[type]} (${seatCount} ${t('common.seats')}) - ${t('layout.dragDropHint')}`}
            onPointerDown={(event) => onTemplatePointerDown(type, event)}
          />
        ))}
      </ToolRailGroup>

      {featurePalette.length > 0 && (
        <ToolRailGroup title={t('layout.roomElements')}>
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

      <ToolRailGroup title={t('planToolbar.show')}>
        {groups.map((group) => (
          <ToolRailButton
            key={group.id}
            icon={GROUP_ICONS[group.id] ?? <SlidersHorizontalIcon size={18} />}
            label={group.title ?? t('editor.viewSettings')}
            data-tour={
              group.id === 'layout-base'
                ? TOUR_ANCHORS.canvasSettings
                : undefined
            }
            panel={() => (
              <div className={`${cardSurfaceClass} border p-4`}>
                <CanvasSettingsGroups groups={[group]} />
              </div>
            )}
          />
        ))}
      </ToolRailGroup>

      <ToolRailGroup title={t('planToolbar.manage')} atEnd>
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
    </ToolRail>
  );
}
