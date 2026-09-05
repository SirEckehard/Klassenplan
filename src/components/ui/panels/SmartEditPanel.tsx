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
import { cardSurfaceClass, secondaryButtonClass } from '@/utils';

interface SmartEditPanelProps {
  studentsCount: number;
  seatCount: number;
  handleSaveTemplate: () => void;
  onTemplatePointerDown?: (
    type: TableTemplateType,
    e: React.PointerEvent<Element>,
  ) => void;
  hideTableTemplates?: boolean;
  onOpenQuickSetup?: () => void;
  quickSetupShortcutHint?: string;
  onRequestClose?: () => void;
  featurePalette?: Array<{
    type: ClassroomFeatureType;
    label: string;
    icon: React.ReactNode;
  }>;
  onFeaturePointerDown?: (
    type: ClassroomFeatureType,
    event: React.PointerEvent<HTMLButtonElement>,
  ) => void;
}

interface TableTemplate {
  key: TableTemplateType;
  label: string;
  seatCount: number;
}

const TABLE_TEMPLATES: TableTemplate[] = [
  {
    key: 'single',
    label: 'Einzelplatz',
    seatCount: 1,
  },
  {
    key: 'double',
    label: 'Doppelplatz',
    seatCount: 2,
  },
  {
    key: 'group4',
    label: '4er-Gruppe',
    seatCount: 4,
  },
  {
    key: 'group6',
    label: '6er-Gruppe',
    seatCount: 6,
  },
];

/**
 * Redesigned EditPanel with modern UI components
 * Uses shared components for consistency across sidebar panels
 */
export default function SmartEditPanel(props: SmartEditPanelProps) {
  const { t } = useTranslation('generator');

  const TABLE_TEMPLATES_LABELS: Record<TableTemplateType, string> = {
    single: t('layout.singleSeat', 'Einzelplatz'),
    double: t('layout.doubleSeat', 'Doppelplatz'),
    group4: t('layout.group4', '4er-Gruppe'),
    group6: t('layout.group6', '6er-Gruppe'),
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-6 pb-2">
          {props.onOpenQuickSetup && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => {
                  props.onRequestClose?.();
                  props.onOpenQuickSetup?.();
                }}
                className={`${secondaryButtonClass} flex w-full items-center justify-center gap-3 px-4 py-3 text-sm text-center`}
                title={t('layout.setupClassroom', 'Klassenraum einrichten')}
              >
                <HammerIcon size={18} className="shrink-0" />
                <span className="text-sm font-semibold">
                  {t('layout.setupClassroom', 'Klassenraum einrichten')}
                </span>
              </button>
              <button
                type="button"
                onClick={props.handleSaveTemplate}
                className={`${secondaryButtonClass} flex w-full items-center justify-center gap-2 px-4 py-3 text-sm text-green-700 hover:bg-green-50 dark:text-green-300 dark:hover:bg-green-900/30`}
                title={t(
                  'layout.saveTemplate',
                  'Aktuellen Klassenraum als Vorlage speichern',
                )}
              >
                <FloppyDiskIcon size={16} />
                <span className="text-sm font-medium">
                  {t('layout.saveTemplateButton', 'Vorlage speichern')}
                </span>
              </button>
            </div>
          )}

          {/* TableIcon Templates Section - conditionally hidden */}
          {!props.hideTableTemplates && (
            <div className={`${cardSurfaceClass} border px-3 py-4`}>
              <SectionHeader
                icon={<SquaresFourIcon size={16} />}
                title={t('layout.tableTypes', 'Tischtypen')}
                description={t(
                  'layout.tableTypesDescription',
                  'Ziehe Tische in den Klassenraum.',
                )}
              />

              <div className="mt-3 space-y-3">
                {TABLE_TEMPLATES.map((template) => (
                  <button
                    key={template.key}
                    type="button"
                    onPointerDown={(e) =>
                      props.onTemplatePointerDown?.(template.key, e)
                    }
                    className={`${cardSurfaceClass} group relative flex w-full items-center gap-3 px-3 py-3 text-left transition-all hover:border-blue-400 hover:bg-blue-50/80 hover:shadow-md dark:hover:border-blue-500 dark:hover:bg-blue-900/30 active:scale-95 cursor-grab active:cursor-grabbing`}
                    title={`${TABLE_TEMPLATES_LABELS[template.key]} (${template.seatCount} ${t('common.seats', 'Plätze')}) - ${t('layout.dragDropHint', 'Per Drag & Drop hinzufügen')}`}
                    style={{ touchAction: 'none' }}
                  >
                    {/* TablePreview instead of Lucide icon */}
                    <div className="relative flex h-12 w-12 shrink-0 items-center justify-center">
                      <div
                        className="absolute"
                        style={{
                          width: '80px',
                          height: '80px',
                          transform: 'scale(0.6)',
                          transformOrigin: 'center center',
                        }}
                      >
                        <TablePreview type={template.key} fixedSize={true} />
                      </div>
                    </div>

                    <span className="flex-1 text-left text-sm font-medium text-gray-800 dark:text-gray-200">
                      {TABLE_TEMPLATES_LABELS[template.key]}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {template.seatCount} {t('common.pl', 'Pl.')}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {props.featurePalette && props.featurePalette.length > 0 && (
            <div className={`${cardSurfaceClass} border px-3 py-4`}>
              <SectionHeader
                icon={<HammerIcon size={16} />}
                title={t('layout.roomElements', 'Raumelemente')}
                description={t(
                  'layout.roomElementsDescription',
                  'Ziehe Fenster, Türen, Pult, Tafel oder Möbel in den Klassenraum.',
                )}
              />

              <div className="mt-3 space-y-2">
                {props.featurePalette.map((feature) => (
                  <button
                    key={feature.type}
                    type="button"
                    onPointerDown={(event) =>
                      props.onFeaturePointerDown?.(feature.type, event)
                    }
                    className={`${cardSurfaceClass} flex w-full items-center gap-3 px-3 py-3 text-left transition-all hover:border-blue-400 hover:bg-blue-50/80 hover:shadow-md dark:hover:border-blue-500 dark:hover:bg-blue-900/30 active:scale-95 cursor-grab active:cursor-grabbing`}
                    title={`${feature.label} ${t('layout.dragDropPlace', 'per Drag & Drop platzieren')}`}
                    style={{ touchAction: 'none' }}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-200">
                      {feature.icon}
                    </span>
                    <span className="flex-1 text-sm font-medium text-gray-800 dark:text-gray-200">
                      {feature.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
