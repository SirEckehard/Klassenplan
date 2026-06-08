// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import { FloppyDiskIcon } from '@phosphor-icons/react';
import TablePreview from '@/components/TablePreview';
import type { ClassroomFeatureType, TableTemplateType } from '@/types';
import { cardSurfaceClass, secondaryButtonClass } from '@/utils';

interface TemplateConfig {
  type: TableTemplateType;
  label: string;
  seatCount: number;
}

const TEMPLATES: TemplateConfig[] = [
  {
    type: 'single',
    label: 'Einzelplatz',
    seatCount: 1,
  },
  {
    type: 'double',
    label: 'Doppelplatz',
    seatCount: 2,
  },
  {
    type: 'group4',
    label: '4er-Gruppe',
    seatCount: 4,
  },
  {
    type: 'group6',
    label: '6er-Gruppe',
    seatCount: 6,
  },
];

interface MobileTableTemplatesProps {
  onTemplatePointerDown: (
    type: TableTemplateType,
    e: React.PointerEvent<Element>,
  ) => void;
  featurePalette?: Array<{
    type: ClassroomFeatureType;
    label: string;
    icon: React.ReactNode;
  }>;
  onFeaturePointerDown?: (
    type: ClassroomFeatureType,
    event: React.PointerEvent<HTMLButtonElement>,
  ) => void;
  onSaveTemplate?: () => void;
}

/**
 * MobileTableTemplates - Grid of table templates optimized for mobile/touch
 *
 * Displays 4 template types in a responsive grid with:
 * - Touch-optimized drag interaction
 * - Visual preview of each table type
 * - Seat count indicators
 */
const MobileTableTemplates: React.FC<MobileTableTemplatesProps> = ({
  onTemplatePointerDown,
  featurePalette,
  onFeaturePointerDown,
  onSaveTemplate,
}) => {
  const { t } = useTranslation('generator');

  const TABLE_TEMPLATE_LABELS: Record<TableTemplateType, string> = {
    single: t('layout.singleSeat', 'Einzelplatz'),
    double: t('layout.doubleSeat', 'Doppelplatz'),
    group4: t('layout.group4', '4er-Gruppe'),
    group6: t('layout.group6', '6er-Gruppe'),
  };

  return (
    <div className="mt-4 px-2">
      <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
        {t('layout.tableTypes', 'Tischtypen')}
      </h3>
      <div className="grid grid-cols-4 gap-1.5">
        {TEMPLATES.map((template) => (
          <button
            key={template.type}
            type="button"
            onPointerDown={(e) => onTemplatePointerDown(template.type, e)}
            className={`${cardSurfaceClass} group relative flex h-16 min-w-0 cursor-grab flex-col items-center gap-0.5 border-2 border-blue-100/80 p-1.5 transition hover:border-blue-400 hover:bg-blue-50/80 active:scale-95 active:cursor-grabbing dark:border-blue-900/40 dark:hover:border-blue-500`}
            title={`${TABLE_TEMPLATE_LABELS[template.type]} (${template.seatCount} ${t('common.seats', 'Plätze')})`}
            style={{ touchAction: 'none' }}
          >
            {/* TablePreview */}
            <div className="relative flex h-10 w-full items-center justify-center overflow-hidden">
              <div
                className="absolute"
                style={{
                  width: '80px',
                  height: '80px',
                  transform: 'scale(0.45)',
                  transformOrigin: 'center center',
                }}
              >
                <TablePreview type={template.type} fixedSize={true} />
              </div>
            </div>
            <span className="text-[10px] font-medium text-gray-700 dark:text-gray-200">
              {template.seatCount} {t('common.pl', 'Pl.')}
            </span>

            {/* Drag indicator */}
            <div className="pointer-events-none absolute inset-0 rounded-2xl border-2 border-dashed border-transparent opacity-0 transition-opacity group-hover:border-blue-400 group-hover:opacity-60 dark:group-hover:border-blue-500" />
          </button>
        ))}
      </div>
      {featurePalette && featurePalette.length > 0 && (
        <div className="mt-3">
          <h4 className="text-xs font-semibold text-gray-800 dark:text-gray-200 mb-1.5">
            {t('layout.roomElements', 'Raumelemente')}
          </h4>
          <div className="grid grid-cols-4 gap-1.5">
            {featurePalette.map((feature) => (
              <button
                key={feature.type}
                type="button"
                onPointerDown={(event) =>
                  onFeaturePointerDown?.(feature.type, event)
                }
                className={`${cardSurfaceClass} flex h-14 min-w-0 cursor-grab flex-col items-center justify-center gap-0.5 border-2 border-blue-100/80 p-1 text-[10px] font-medium text-gray-700 transition hover:border-blue-400 hover:bg-blue-50/80 active:scale-95 active:cursor-grabbing dark:border-blue-900/40 dark:text-gray-200 dark:hover:border-blue-500`}
                style={{ touchAction: 'none' }}
                title={`${feature.label} ${t('layout.place', 'platzieren')}`}
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-200">
                  {feature.icon}
                </span>
                <span>{feature.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {onSaveTemplate && (
        <div className="mt-4">
          <button
            type="button"
            onClick={onSaveTemplate}
            className={`${secondaryButtonClass} flex w-full items-center justify-center gap-3 px-4 py-3 text-sm text-green-700 hover:bg-green-50 dark:text-green-300 dark:hover:bg-green-900/30 h-12`}
            title={t(
              'layout.saveTemplate',
              'Aktuellen Klassenraum als Vorlage speichern',
            )}
          >
            <FloppyDiskIcon className="h-4 w-4 shrink-0" />
            <span className="text-sm font-medium">
              {t('layout.saveTemplateButton', 'Vorlage speichern')}
            </span>
          </button>
        </div>
      )}
    </div>
  );
};

export default MobileTableTemplates;
