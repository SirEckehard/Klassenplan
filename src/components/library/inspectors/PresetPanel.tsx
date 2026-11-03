// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
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
import {
  checkName,
  fullRecipeWeights,
  MAX_NAME_LENGTH,
  neutralSettings,
  SCALAR_MIX_SETTING_KEYS,
} from '@/utils';
import type { MixRecipe, NameProblem } from '@/utils';
import type { MixPresetWeights, MixSettings } from '@/types';
import InspectorTitleField from '@/components/shell/InspectorTitleField';
import SmartMixControls from '@/components/ui/controls/SmartMixControls';
import { ENTITY_ICONS } from '@/components/shell/entityIcons';
import { presetKind, presetLabel } from '../libraryColumns';

const NO_STUDENTS: never[] = [];

/** A preset's weights as settings the criteria list can show. */
const settingsOf = (preset: MixRecipe): MixSettings => ({
  ...neutralSettings,
  ...fullRecipeWeights(preset.weights),
});

const weightsOf = (settings: MixSettings): MixPresetWeights =>
  fullRecipeWeights(
    Object.fromEntries(
      SCALAR_MIX_SETTING_KEYS.map((key) => [key, settings[key]]),
    ),
  );

/**
 * A mixing preset (decision 0038), changed where it is read: its criteria as
 * the plan's inspector shows them — every criterion, since a preset belongs
 * to no class — each change kept at once; "Standard" read only, the way back.
 * An own preset is renamed in the header and removed below, a changed shipped
 * one given back its own weights. Opened — from the status bar — it sets the
 * open class's criteria.
 */
export default function PresetPanel({
  preset,
  takenNames,
  onRename,
  onChangeWeights,
  onDelete,
  onRestore,
  renameRequest,
}: {
  preset: MixRecipe;
  /** Every other preset's name, the shipped ones' included. */
  takenNames: readonly string[];
  onRename: (name: string) => Promise<NameProblem | null>;
  /** Keeps the preset's new weights; never asked of "Standard". */
  onChangeWeights: (weights: MixPresetWeights) => void;
  onDelete: () => void;
  onRestore: () => void;
  renameRequest: number;
}) {
  const { t } = useTranslation('generator');
  const name = presetLabel(preset, t);
  const readOnly = preset.builtin === 'standard';
  // A change shows at once; the store's answer follows a moment later and
  // takes its place — as does a change from elsewhere ("Original
  // wiederherstellen", another tab).
  const storedKey = JSON.stringify(fullRecipeWeights(preset.weights));
  const [pending, setPending] = React.useState<MixSettings | null>(null);
  const [seenKey, setSeenKey] = React.useState(storedKey);
  if (seenKey !== storedKey) {
    setSeenKey(storedKey);
    setPending(null);
  }
  const settings = pending ?? settingsOf(preset);

  const setMixSettings: React.Dispatch<React.SetStateAction<MixSettings>> = (
    update,
  ) => {
    if (readOnly) return;
    const next = typeof update === 'function' ? update(settings) : update;
    setPending(next);
    onChangeWeights(weightsOf(next));
  };

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
        <InspectorSection title={t('mix.recipes.title')}>
          {preset.builtin && !preset.changed && (
            <p className="text-control leading-relaxed text-(--text-muted)">
              {t(`mix.recipes.${preset.builtin}.desc`)}
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
            {readOnly
              ? t('library.preset.standardHint')
              : t('library.preset.hint')}
          </p>
        </InspectorSection>
        <SmartMixControls
          settings={settings}
          setMixSettings={setMixSettings}
          students={NO_STUDENTS}
          allCriteria
          readOnly={readOnly}
        />
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
