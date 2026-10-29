// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type { TFunction } from 'i18next';
import { CursorIcon, EyeIcon, EyeSlashIcon } from '@phosphor-icons/react';
import type { PhotoDisplayMode } from '@/types';
import type { CanvasSettingsGroup } from './CanvasSettingsGroups';

type PhotoDisplayGroupOptions = {
  /** The group's id; `optionId` names its one control. */
  id: string;
  optionId: string;
  value: PhotoDisplayMode;
  onChange: (next: PhotoDisplayMode) => void;
  /**
   * Whether the device has a pointer that hovers (`useHasHoverPointer`).
   * Without one, "on hover" shows a photo only while a finger rests on the
   * seat, so the choice is left out — unless it is the one set, which has to
   * stay visible to be changed.
   */
  hasHover: boolean;
  t: TFunction;
};

/**
 * The "Schülerfotos" group of the view settings: on, on hover, off. The table
 * plan and the circle share the setting (`CanvasPreferencesContext`) and so
 * the group. Plain function (not a hook) so callers can use it inside their
 * `useMemo`.
 */
export function buildPhotoDisplayGroup({
  id,
  optionId,
  value,
  onChange,
  hasHover,
  t,
}: PhotoDisplayGroupOptions): CanvasSettingsGroup {
  const offersHover = hasHover || value === 'hover';
  return {
    id,
    title: t('editor.studentPhotos'),
    options: [
      {
        kind: 'segment',
        id: optionId,
        value,
        onChange: (next: string) => onChange(next as PhotoDisplayMode),
        choices: [
          {
            value: 'all',
            label: t('editor.photoModeAll'),
            icon: <EyeIcon size={18} />,
          },
          ...(offersHover
            ? [
                {
                  value: 'hover',
                  label: t('editor.photoModeHover'),
                  icon: <CursorIcon size={18} />,
                },
              ]
            : []),
          {
            value: 'off',
            label: t('editor.photoModeOff'),
            icon: <EyeSlashIcon size={18} />,
          },
        ],
      },
    ],
  };
}
