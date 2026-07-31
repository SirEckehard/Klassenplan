// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useTranslation } from 'react-i18next';
import { cardSurfaceClass, getTablePresets } from '@/utils';
import type { TableTemplateType } from '@/types';
import TablePreview from '@/components/TablePreview';

type TableTypeSelectorProps = {
  currentType: TableTemplateType;
  onTypeChange: (type: TableTemplateType) => void;
  /**
   * If false, prevents visual "active" state even if currentType matches
   * Used in Quick Setup to avoid showing pre-selected state before user interaction
   */
  hasExistingTables?: boolean;
};

export default function TableTypeSelector({
  currentType,
  onTypeChange,
  hasExistingTables = true,
}: TableTypeSelectorProps) {
  const { t } = useTranslation('generator');
  const presets = getTablePresets();

  // Human-readable labels for table types
  const tableTypeLabels: Record<TableTemplateType, string> = {
    single: t('layout.singleSeat', 'Einzelplatz'),
    double: t('layout.doubleSeat', 'Doppelplatz'),
    group4: t('layout.group4', '4er-Gruppe'),
    group6: t('layout.group6', '6er-Gruppe'),
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
        {t('quickSetup.selectType', 'Tischtyp wählen')}
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(presets).map(([key, preset]) => {
          const tableType = key as TableTemplateType;
          // Only show as active if tables exist - prevents false "pre-selection" in empty classroom
          const isActive = hasExistingTables && currentType === tableType;

          return (
            <button
              key={tableType}
              type="button"
              onClick={() => onTypeChange(tableType)}
              aria-pressed={isActive}
              className={`
                ${cardSurfaceClass}
                relative flex cursor-pointer flex-col items-center gap-3 border-2 p-4 transition-all duration-200
                hover:border-blue-300 dark:hover:border-blue-500
                ${
                  isActive
                    ? 'border-blue-600 bg-blue-50/90 shadow-md dark:border-blue-400 dark:bg-blue-900/30'
                    : 'border-blue-300 bg-white/90 dark:border-blue-900/40 dark:bg-gray-950/70'
                }
              `}
            >
              {/* TableIcon Preview */}
              <div className="flex justify-center mb-3">
                <div
                  className={`
                    inline-flex rounded-xl p-3 transition-colors
                    ${
                      isActive
                        ? 'bg-blue-100/80 dark:bg-blue-900/35'
                        : 'bg-white/80 dark:bg-gray-900/60'
                    }
                  `}
                >
                  <TablePreview type={tableType} fixedSize={true} />
                </div>
              </div>

              {/* Label and Seat Count */}
              <div className="text-center space-y-1">
                <p
                  className={`
                  text-sm font-medium
                  ${
                    isActive
                      ? 'text-blue-900 dark:text-blue-100'
                      : 'text-gray-900 dark:text-gray-100'
                  }
                `}
                >
                  {tableTypeLabels[tableType]}
                </p>
                <p
                  className={`
                  text-xs
                  ${
                    isActive
                      ? 'text-blue-600 dark:text-blue-300'
                      : 'text-gray-600 dark:text-gray-400'
                  }
                `}
                >
                  {preset.seatCount} {t('common.seats', 'Plätze')}
                </p>
              </div>

              {/* Active Indicator */}
              {isActive && (
                <div className="absolute top-2 right-2 w-3 h-3 bg-blue-600 dark:bg-blue-400 rounded-full"></div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
