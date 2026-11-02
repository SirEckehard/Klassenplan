// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useTranslation } from 'react-i18next';
import {
  ArrowCounterClockwiseIcon,
  FolderSimpleIcon,
  PackageIcon,
  UserIcon,
} from '@phosphor-icons/react';
import {
  InspectorActionRow,
  InspectorBody,
  InspectorDeleteFooter,
  InspectorHeader,
  InspectorMediaTile,
  InspectorSection,
} from '@/components/shell/InspectorPanel';
import { checkName, MAX_NAME_LENGTH, recipeLevels } from '@/utils';
import type { MixRecipe, NameProblem } from '@/utils';
import InspectorTitleField from '@/components/shell/InspectorTitleField';
import { ENTITY_ICONS } from '@/components/shell/entityIcons';
import { presetKind, presetLabel } from '../libraryColumns';
import { ValueRow } from './panelParts';

/**
 * A mixing preset (decision 0038): what it sets, by level, and what can be
 * done with it here — an own one renamed in the header and removed, a changed
 * shipped one given back its own weights. Its weights are changed where they
 * act, in the plan's criteria; opened — from the status bar — it sets the
 * open class's criteria.
 */
export default function PresetPanel({
  preset,
  takenNames,
  onRename,
  onDelete,
  onRestore,
  renameRequest,
}: {
  preset: MixRecipe;
  /** Every other preset's name, the shipped ones' included. */
  takenNames: readonly string[];
  onRename: (name: string) => Promise<NameProblem | null>;
  onDelete: () => void;
  onRestore: () => void;
  renameRequest: number;
}) {
  const { t } = useTranslation('generator');
  const name = presetLabel(preset, t);
  const levels = recipeLevels(preset.weights);
  const shown = (['essential', 'important', 'consider'] as const).filter(
    (level) => levels[level].length > 0,
  );

  return (
    <>
      <InspectorHeader
        media={<InspectorMediaTile icon={ENTITY_ICONS.preset} />}
        title={
          preset.builtin ? (
            name
          ) : (
            <InspectorTitleField
              label={t('mix.recipes.name')}
              value={name}
              problemFor={(draft) =>
                checkName(draft, takenNames, MAX_NAME_LENGTH)
              }
              onCommit={onRename}
              takenMessage={t('mix.recipes.nameTaken')}
              focusRequest={renameRequest}
            />
          )
        }
        meta={[
          { icon: FolderSimpleIcon, label: t('library.presets') },
          {
            icon: preset.builtin ? PackageIcon : UserIcon,
            label: presetKind(preset, t),
          },
        ]}
      />
      <InspectorBody>
        <InspectorSection title={t('library.preset.section')}>
          {preset.builtin && !preset.changed && (
            <p className="text-control leading-relaxed text-(--text-muted)">
              {t(`mix.recipes.${preset.builtin}.desc`)}
            </p>
          )}
          {shown.map((level) => (
            <ValueRow key={level} label={t(`mix.importance.${level}`)}>
              {levels[level]
                .map((key) => t(`mix.criteria.${key}.label`))
                .join(', ')}
            </ValueRow>
          ))}
          {shown.length === 0 && (
            <p className="text-xs text-(--text-muted)">
              {t('mix.recipes.allOff')}
            </p>
          )}
          {preset.changed && (
            <InspectorActionRow
              icon={ArrowCounterClockwiseIcon}
              label={t('mix.recipes.restore')}
              onClick={onRestore}
            />
          )}
          {/* In the section it speaks of, not loose under the panel. */}
          <p className="text-xs text-(--text-muted)">
            {t('library.preset.hint')}
          </p>
        </InspectorSection>
      </InspectorBody>
      {!preset.builtin && (
        <InspectorDeleteFooter
          label={t('library.preset.delete')}
          onDelete={onDelete}
        />
      )}
    </>
  );
}
