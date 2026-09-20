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
      <h3 className="text-sm font-semibold text-(--text-page)">
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
                hover:border-(--border-option-hover)
                ${
                  isActive
                    ? 'border-(--border-option-selected) bg-(--surface-option-selected)'
                    : 'border-(--border-card) bg-(--surface-card)'
                }
              `}
            >
              {/* TableIcon Preview */}
              <div className="flex justify-center mb-3">
                <div
                  className={`
                    inline-flex rounded-xl p-3 transition-colors
                    ${isActive ? 'bg-(--surface-option-selected)' : 'bg-(--surface-card)'}
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
                  ${isActive ? 'text-(--text-page)' : 'text-(--text-page)'}
                `}
                >
                  {tableTypeLabels[tableType]}
                </p>
                <p
                  className={`
                  text-xs
                  ${isActive ? 'text-(--text-badge)' : 'text-(--text-muted)'}
                `}
                >
                  {preset.seatCount} {t('common.seats', 'Plätze')}
                </p>
              </div>

              {/* Active Indicator */}
              {isActive && (
                <div className="absolute top-2 right-2 w-3 h-3 bg-(--button-primary-bg) rounded-full"></div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
