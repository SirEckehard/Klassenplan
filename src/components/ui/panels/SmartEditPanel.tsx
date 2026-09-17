// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  FloppyDiskIcon,
  SquaresFourIcon,
  HammerIcon,
} from '@phosphor-icons/react';
import type { ClassroomFeatureType, TableTemplateType } from '@/types';
import SectionHeader from '../layout/SectionHeader';
import TablePreview from '@/components/TablePreview';
import {
  cardSurfaceClass,
  getSidebarIconClasses,
  getSidebarSurfaceClasses,
  secondaryButtonClass,
  sidebarRailButtonClass,
  type SidebarTone,
} from '@/utils';

/**
 * - `comfortable`: the expanded sidebar, with labels and explanations.
 * - `compact`: the collapsed sidebar, as round buttons whose tooltips carry
 *   the same explanations.
 */
type Density = 'comfortable' | 'compact';

type FeaturePaletteItem = {
  type: ClassroomFeatureType;
  label: string;
  icon: React.ReactNode;
};

interface SmartEditPanelProps {
  density?: Density;
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
}

const TABLE_TEMPLATES: Array<{ type: TableTemplateType; seatCount: number }> = [
  { type: 'single', seatCount: 1 },
  { type: 'double', seatCount: 2 },
  { type: 'group4', seatCount: 4 },
  { type: 'group6', seatCount: 6 },
];

const railButtonClass = (tone: SidebarTone, accent: boolean) =>
  `${sidebarRailButtonClass} ${getSidebarSurfaceClasses({
    variant: 'collapsed',
    tone,
    emphasis: accent ? 'accent' : 'default',
  })}`;

const dragSurfaceClass = getSidebarSurfaceClasses({
  variant: 'collapsed',
  draggable: true,
});
const dragRailButtonClass = `${sidebarRailButtonClass} ${dragSurfaceClass}`;

const dragCardClass = `${cardSurfaceClass} group relative flex w-full items-center gap-3 px-3 py-3 text-left transition-all hover:border-blue-400 hover:bg-blue-50/80 hover:shadow-md dark:hover:border-blue-500 dark:hover:bg-blue-900/30 active:scale-95 cursor-grab active:cursor-grabbing`;

function RailDivider() {
  return (
    <div
      aria-hidden="true"
      className="my-1 h-px w-8 bg-blue-100 dark:bg-blue-900/50"
    />
  );
}

/**
 * A group of the panel: a card with a heading and its explanation, or on the
 * rail its buttons after a divider.
 */
function PanelSection({
  density,
  icon,
  title,
  description,
  listClassName,
  children,
}: {
  density: Density;
  icon: React.ReactNode;
  title: string;
  description: string;
  listClassName: string;
  children: React.ReactNode;
}) {
  if (density === 'compact') {
    return (
      <>
        <RailDivider />
        {children}
      </>
    );
  }

  return (
    <div className={`${cardSurfaceClass} border px-3 py-4`}>
      <SectionHeader icon={icon} title={title} description={description} />
      <div className={`mt-3 ${listClassName}`}>{children}</div>
    </div>
  );
}

/** A table drawn small; the preview is laid out at 80px and scaled down. */
function TemplatePreview({
  type,
  scale,
  className,
}: {
  type: TableTemplateType;
  scale: number;
  className: string;
}) {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <div
        className="absolute"
        style={{
          width: '80px',
          height: '80px',
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
        }}
      >
        <TablePreview type={type} fixedSize={true} />
      </div>
    </div>
  );
}

/**
 * The layout step's sidebar: classroom setup, saving a template, and the
 * tables and room elements to drag into the room — in either density, so
 * both offer the same and a change reaches both.
 */
export default function SmartEditPanel({
  density = 'comfortable',
  handleSaveTemplate,
  onTemplatePointerDown,
  onOpenQuickSetup,
  quickSetupShortcutHint,
  featurePalette,
  onFeaturePointerDown,
}: SmartEditPanelProps) {
  const { t } = useTranslation('generator');
  const isCompact = density === 'compact';

  const templateLabels: Record<TableTemplateType, string> = {
    single: t('layout.singleSeat'),
    double: t('layout.doubleSeat'),
    group4: t('layout.group4'),
    group6: t('layout.group6'),
  };
  const setupLabel = t('layout.setupClassroom');
  const setupTitle = quickSetupShortcutHint
    ? `${setupLabel} (${quickSetupShortcutHint})`
    : setupLabel;
  const saveTitle = t('layout.saveTemplate');

  return (
    <div
      className={
        isCompact ? 'flex flex-col items-center gap-1 px-1' : 'space-y-6 pb-2'
      }
    >
      <div className={isCompact ? 'contents' : 'space-y-3'}>
        <button
          type="button"
          onClick={onOpenQuickSetup}
          className={
            isCompact
              ? railButtonClass('blue', true)
              : `${secondaryButtonClass} flex w-full items-center justify-center gap-3 px-4 py-3 text-center text-sm`
          }
          title={setupTitle}
          aria-label={isCompact ? setupLabel : undefined}
        >
          {isCompact ? (
            <span
              className={getSidebarIconClasses({ emphasis: 'accent' })}
              aria-hidden="true"
            >
              <HammerIcon size={16} />
            </span>
          ) : (
            <>
              <HammerIcon size={18} className="shrink-0" aria-hidden="true" />
              <span className="text-sm font-semibold">{setupLabel}</span>
            </>
          )}
        </button>
        <button
          type="button"
          onClick={handleSaveTemplate}
          className={
            isCompact
              ? railButtonClass('green', true)
              : `${secondaryButtonClass} flex w-full items-center justify-center gap-2 px-4 py-3 text-sm text-green-700 hover:bg-green-50 dark:text-green-300 dark:hover:bg-green-900/30`
          }
          title={saveTitle}
          aria-label={isCompact ? saveTitle : undefined}
        >
          {isCompact ? (
            <span
              className={getSidebarIconClasses({
                tone: 'green',
                emphasis: 'accent',
              })}
              aria-hidden="true"
            >
              <FloppyDiskIcon size={16} />
            </span>
          ) : (
            <>
              <FloppyDiskIcon size={16} aria-hidden="true" />
              <span className="text-sm font-medium">
                {t('layout.saveTemplateButton')}
              </span>
            </>
          )}
        </button>
      </div>

      <PanelSection
        density={density}
        icon={<SquaresFourIcon size={16} />}
        title={t('layout.tableTypes')}
        description={t('layout.tableTypesDescription')}
        listClassName="space-y-3"
      >
        {TABLE_TEMPLATES.map(({ type, seatCount }) => (
          <button
            key={type}
            type="button"
            onPointerDown={(event) => onTemplatePointerDown(type, event)}
            className={isCompact ? dragRailButtonClass : dragCardClass}
            title={`${templateLabels[type]} (${seatCount} ${t('common.seats')}) - ${t('layout.dragDropHint')}`}
            aria-label={isCompact ? templateLabels[type] : undefined}
            style={{ touchAction: 'none' }}
          >
            {isCompact ? (
              <TemplatePreview type={type} scale={0.42} className="size-full" />
            ) : (
              <>
                <TemplatePreview
                  type={type}
                  scale={0.6}
                  className="size-12 shrink-0"
                />
                <span className="flex-1 text-left text-sm font-medium text-gray-800 dark:text-gray-200">
                  {templateLabels[type]}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {seatCount} {t('common.pl')}
                </span>
              </>
            )}
          </button>
        ))}
      </PanelSection>

      {featurePalette.length > 0 && (
        <PanelSection
          density={density}
          icon={<HammerIcon size={16} />}
          title={t('layout.roomElements')}
          description={t('layout.roomElementsDescription')}
          listClassName="space-y-2"
        >
          {featurePalette.map((feature) => (
            <button
              key={feature.type}
              type="button"
              onPointerDown={(event) =>
                onFeaturePointerDown(feature.type, event)
              }
              className={isCompact ? dragRailButtonClass : dragCardClass}
              title={`${feature.label} ${t('layout.dragDropPlace')}`}
              aria-label={isCompact ? feature.label : undefined}
              style={{ touchAction: 'none' }}
            >
              {isCompact ? (
                <span className={getSidebarIconClasses({})} aria-hidden="true">
                  {feature.icon}
                </span>
              ) : (
                <>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-200">
                    {feature.icon}
                  </span>
                  <span className="flex-1 text-sm font-medium text-gray-800 dark:text-gray-200">
                    {feature.label}
                  </span>
                </>
              )}
            </button>
          ))}
        </PanelSection>
      )}
    </div>
  );
}
