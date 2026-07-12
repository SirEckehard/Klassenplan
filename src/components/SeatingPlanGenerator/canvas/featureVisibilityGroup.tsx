// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type { TFunction } from 'i18next';
import type { ClassroomFeatureType } from '@/types';
import {
  FEATURE_TYPES,
  FEATURE_TYPE_ICONS,
  FEATURE_TYPE_LABEL_KEYS,
} from '@/utils/ui';
import type { CanvasSettingsGroup } from './CanvasSettingsButton';

type FeatureVisibilityGroupOptions = {
  id: string;
  title: string;
  t: TFunction;
  isChecked: (type: ClassroomFeatureType) => boolean;
  isDisabled?: (type: ClassroomFeatureType) => boolean;
  onToggle: (type: ClassroomFeatureType, next: boolean) => void;
};

/**
 * Builds the shared "Raumelemente" settings group as one compact icon-chip
 * grid (one chip per feature type) for the canvas view-options popovers.
 * A small switch next to the group title toggles all available types at once.
 * Plain function (not a hook) so callers can use it inside their `useMemo`.
 */
export function buildFeatureVisibilityGroup({
  id,
  title,
  t,
  isChecked,
  isDisabled,
  onToggle,
}: FeatureVisibilityGroupOptions): CanvasSettingsGroup {
  const enabledTypes = FEATURE_TYPES.filter(
    (type) => !(isDisabled?.(type) ?? false),
  );
  return {
    id,
    title,
    headerToggle: {
      label: t('layout.roomElementsToggleAll'),
      checked: enabledTypes.some((type) => isChecked(type)),
      disabled: enabledTypes.length === 0,
      onChange: (next: boolean) => {
        for (const type of enabledTypes) {
          onToggle(type, next);
        }
      },
    },
    options: [
      {
        kind: 'iconGrid',
        id: `${id}-grid`,
        label: title,
        items: FEATURE_TYPES.map((type) => {
          const FeatureIcon = FEATURE_TYPE_ICONS[type];
          return {
            id: `feature-${type}`,
            label: t(FEATURE_TYPE_LABEL_KEYS[type]),
            icon: <FeatureIcon size={18} />,
            checked: isChecked(type),
            onChange: (next: boolean) => onToggle(type, next),
            disabled: isDisabled?.(type) ?? false,
          };
        }),
      },
    ],
  };
}
