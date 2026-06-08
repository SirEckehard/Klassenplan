import React from 'react';
import { useTranslation } from 'react-i18next';
import type { ClassroomFeatureType, TableTemplateType } from '@/types';
import { HammerIcon, FloppyDiskIcon } from '@phosphor-icons/react';
import TablePreview from '@/components/TablePreview';
import {
  cardSurfaceClass,
  iconButtonClass,
  mutedIconButtonClass,
  getSidebarSurfaceClasses,
} from '@/utils';

interface TableTemplateIconsProps {
  onTemplatePointerDown?: (
    type: TableTemplateType,
    e: React.PointerEvent<Element>,
  ) => void;
  isExpanded?: boolean;
  className?: string;
  onOpenQuickSetup?: () => void;
  quickSetupShortcutHint?: string;
  onSaveTemplate?: () => void;
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

interface TemplateIconProps {
  type: TableTemplateType;
  label: string;
  seatCount: number;
  isExpanded: boolean;
  onPointerDown?: (
    type: TableTemplateType,
    e: React.PointerEvent<Element>,
  ) => void;
}

function TemplateIcon({
  type,
  label,
  seatCount,
  isExpanded,
  onPointerDown,
}: TemplateIconProps) {
  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (onPointerDown) {
      onPointerDown(type, e);
    }
  };

  const expandedSurfaceClass = getSidebarSurfaceClasses({
    variant: 'expanded',
    interactive: true,
  });

  return (
    <button
      type="button"
      onPointerDown={handlePointerDown}
      className={`
        group relative flex items-center gap-2 p-2
        ${
          isExpanded
            ? `w-full justify-start rounded-2xl text-left active:scale-95 ${expandedSurfaceClass}`
            : `${mutedIconButtonClass} relative h-12 w-12 cursor-grab justify-center gap-0 rounded-full border-2 border-blue-100 p-0 text-gray-600 shadow-sm transition-all hover:shadow-md active:cursor-grabbing dark:border-blue-900/40`
        }
      `}
      title={`${label} (${seatCount})`}
      aria-label={`${label}`}
      style={{ touchAction: 'none' }}
    >
      {/* Collapsed Mode: TablePreview centered */}
      {!isExpanded && (
        <div className="relative w-full h-full flex items-center justify-center">
          <div
            className="absolute"
            style={{
              width: '80px',
              height: '80px',
              transform: 'scale(0.42)',
              transformOrigin: 'center center',
            }}
          >
            <TablePreview type={type} fixedSize={true} />
          </div>
        </div>
      )}

      {/* Expanded Mode: TablePreview left, text right */}
      {isExpanded && (
        <>
          <div className="w-12 h-12 flex items-center justify-center shrink-0 relative">
            <div
              className="absolute"
              style={{
                width: '80px',
                height: '80px',
                transform: 'scale(0.6)',
                transformOrigin: 'center center',
              }}
            >
              <TablePreview type={type} fixedSize={true} />
            </div>
          </div>
          <div className="flex-1 text-left">
            <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
              {label}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {seatCount}
            </div>
          </div>
        </>
      )}

      {/* Drag indicator */}
      {isExpanded && (
        <div
          className={`
          absolute inset-0 rounded-2xl border-2 border-dashed border-transparent
          group-hover:border-blue-400 dark:group-hover:border-blue-500
          opacity-0 group-hover:opacity-50 transition-opacity pointer-events-none
        `}
        />
      )}
    </button>
  );
}

export default function TableTemplateIcons({
  onTemplatePointerDown,
  isExpanded = false,
  className = '',
  onOpenQuickSetup,
  quickSetupShortcutHint,
  onSaveTemplate,
  featurePalette,
  onFeaturePointerDown,
}: TableTemplateIconsProps) {
  const { t } = useTranslation('generator');

  const TABLE_TEMPLATE_LABELS: Record<TableTemplateType, string> = {
    single: t('layout.singleSeat', 'Einzelplatz'),
    double: t('layout.doubleSeat', 'Doppelplatz'),
    group4: t('layout.group4', '4er-Gruppe'),
    group6: t('layout.group6', '6er-Gruppe'),
  };

  const tableTemplates = [
    { type: 'single' as TableTemplateType, seatCount: 1 },
    { type: 'double' as TableTemplateType, seatCount: 2 },
    { type: 'group4' as TableTemplateType, seatCount: 4 },
    { type: 'group6' as TableTemplateType, seatCount: 6 },
  ];

  return (
    <div className={`space-y-2 ${className}`}>
      {isExpanded && (
        <div className="px-3 py-2">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
            {t('layout.tableTypes', 'Tischtypen')}
          </h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
            {t(
              'layout.tableTypesDescription',
              'Ziehe Tische in den Klassenraum.',
            )}
          </p>
        </div>
      )}

      <div
        className={`${
          isExpanded
            ? 'space-y-2 px-3'
            : 'flex flex-col items-center space-y-2 px-2'
        }`}
      >
        {!isExpanded && onOpenQuickSetup && (
          <button
            type="button"
            onClick={onOpenQuickSetup}
            onMouseDown={(e) => e.preventDefault()}
            className={`${iconButtonClass} h-12 w-12 rounded-full border-2 border-blue-500 text-blue-600 hover:shadow-md dark:border-blue-400`}
            title={`${t('layout.setupClassroom', 'Klassenraum einrichten')}${quickSetupShortcutHint ? ` (${quickSetupShortcutHint})` : ''}`}
          >
            <HammerIcon size={16} />
          </button>
        )}

        {!isExpanded && onSaveTemplate && (
          <button
            type="button"
            onClick={onSaveTemplate}
            onMouseDown={(e) => e.preventDefault()}
            className={`${iconButtonClass} h-12 w-12 rounded-full border-2 border-green-500 text-green-600 hover:shadow-md dark:border-green-400`}
            title={t(
              'layout.saveTemplateShortcut',
              'Klassenraum-Vorlage speichern',
            )}
            aria-label={t(
              'layout.saveTemplate',
              'Aktuellen Klassenraum als Vorlage speichern',
            )}
          >
            <FloppyDiskIcon size={16} />
          </button>
        )}

        {isExpanded && onOpenQuickSetup && (
          <div className="pt-2 border-t border-gray-200 dark:border-gray-700 mt-2">
            <button
              type="button"
              onClick={onOpenQuickSetup}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 text-white shadow transition-colors"
              title={t('layout.setupClassroom', 'Klassenraum einrichten')}
            >
              <HammerIcon size={16} className="shrink-0" />
              <div className="flex-1 text-left">
                <div className="text-sm font-semibold">
                  {t('layout.setupClassroom', 'Klassenraum einrichten')}
                </div>
                {quickSetupShortcutHint && (
                  <div className="text-[11px] text-blue-100">
                    Shortcut: {quickSetupShortcutHint}
                  </div>
                )}
              </div>
            </button>
          </div>
        )}

        {tableTemplates.map((template) => (
          <TemplateIcon
            key={template.type}
            type={template.type}
            label={TABLE_TEMPLATE_LABELS[template.type]}
            seatCount={template.seatCount}
            isExpanded={isExpanded}
            onPointerDown={onTemplatePointerDown}
          />
        ))}
      </div>
      {featurePalette && featurePalette.length > 0 && (
        <div
          className={`${
            isExpanded
              ? 'space-y-2 px-3'
              : 'flex flex-col items-center space-y-2 px-2'
          }`}
        >
          {isExpanded && (
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700 mt-2">
              <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                {t('layout.roomElements', 'Raumelemente')}
              </h4>
            </div>
          )}
          {featurePalette.map((feature) => (
            <button
              key={feature.type}
              type="button"
              onPointerDown={(event) =>
                onFeaturePointerDown?.(feature.type, event)
              }
              className={
                isExpanded
                  ? `${cardSurfaceClass} flex w-full items-center gap-3 border border-blue-100 bg-white/80 px-3 py-2 text-left transition-all hover:border-blue-400 hover:bg-blue-50/80 hover:shadow-md dark:border-blue-900/50 dark:bg-blue-950/40 dark:hover:border-blue-500 dark:hover:bg-blue-900/30 active:scale-95 cursor-grab active:cursor-grabbing`
                  : `${iconButtonClass} h-12 w-12 cursor-grab rounded-full border-2 border-blue-100 text-blue-600 transition hover:shadow-md active:cursor-grabbing dark:border-blue-900/40 dark:text-blue-200`
              }
              title={`${feature.label} ${t('layout.place', 'platzieren')}`}
              style={{ touchAction: 'none' }}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-200">
                {feature.icon}
              </span>
              {isExpanded && (
                <span className="flex-1 text-sm font-medium text-gray-800 dark:text-gray-200">
                  {feature.label}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
