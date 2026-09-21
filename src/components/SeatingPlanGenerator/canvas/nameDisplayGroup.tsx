// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type { TFunction } from 'i18next';
import {
  IdentificationBadgeIcon,
  IdentificationCardIcon,
  UserIcon,
} from '@phosphor-icons/react';
import { applyNameDisplayMode, summarizeNameLabels } from '@/utils';
import type { NameDisplayMode } from '@/utils';
import type { CanvasSettingsGroup } from './CanvasSettingsButton';

type NameDisplayGroupOptions = {
  id: string;
  value: NameDisplayMode;
  onChange: (next: NameDisplayMode) => void;
  /** Names of the current class, used for the hint below the control. */
  names: string[];
  t: TFunction;
};

/** Choices of the name-display control, in ascending name length. */
export const NAME_DISPLAY_MODES: NameDisplayMode[] = [
  'firstName',
  'firstNameInitial',
  'full',
];

export const NAME_DISPLAY_ICONS: Record<NameDisplayMode, typeof UserIcon> = {
  firstName: UserIcon,
  firstNameInitial: IdentificationBadgeIcon,
  full: IdentificationCardIcon,
};

/** i18n key of a mode's label, shared by every view that offers the control. */
export function nameDisplayLabelKey(mode: NameDisplayMode): string {
  return `editor.nameDisplay.${mode}`;
}

/**
 * Line below the choices: warns about students whose full names repeat (no
 * label can separate them), then reports labels lengthened to tell students
 * apart, otherwise previews the rule on a real name from the class.
 */
function buildHint(
  value: NameDisplayMode,
  names: string[],
  t: TFunction,
): string | undefined {
  const { lengthened, identical } = summarizeNameLabels(names, value);
  if (identical > 0) {
    return t('editor.nameDisplay.identicalHint', { count: identical });
  }
  if (lengthened > 0) {
    return t('editor.nameDisplay.lengthenedHint', { count: lengthened });
  }

  const sample = names.find((name) => /\s/.test(name.trim())) ?? names[0];
  if (!sample) {
    return undefined;
  }

  return t('editor.nameDisplay.example', {
    name: applyNameDisplayMode(sample, value),
  });
}

/**
 * Builds the shared "Namen" settings group: one choice of rule that shortens
 * every seat label alike. Offered by the seating plan, the circle view and the
 * export, so all three read identically.
 * Plain function (not a hook) so callers can use it inside their `useMemo`.
 */
export function buildNameDisplayGroup({
  id,
  value,
  onChange,
  names,
  t,
}: NameDisplayGroupOptions): CanvasSettingsGroup {
  return {
    id,
    title: t('editor.nameDisplay.label'),
    options: [
      {
        kind: 'segment',
        id: `${id}-segment`,
        ariaLabel: t('editor.nameDisplay.label'),
        value,
        choices: NAME_DISPLAY_MODES.map((mode) => {
          const ModeIcon = NAME_DISPLAY_ICONS[mode];
          return {
            value: mode,
            label: t(nameDisplayLabelKey(mode)),
            icon: <ModeIcon size={18} />,
          };
        }),
        onChange: (next: string) => onChange(next as NameDisplayMode),
        description: buildHint(value, names, t),
      },
    ],
  };
}
