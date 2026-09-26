// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  RectangleIcon,
} from '@phosphor-icons/react';
import type { ClassroomFeatureType } from '@/types';
import {
  dataFamilyClass,
  inputFieldClass,
  type DataFamily,
  type NameDisplayMode,
} from '@/utils';
import { badgeFamilyLabelKey } from '@/components/scene/BadgeTooltip';
import {
  FEATURE_TYPES,
  FEATURE_TYPE_LABEL_KEYS,
  type FeatureVisibilityFlags,
} from '@/utils/ui';
import {
  InspectorBody,
  InspectorChoice,
  InspectorHeader,
  InspectorRow,
  InspectorSection,
} from '@/components/shell/InspectorPanel';
import ToggleSwitch from '@/components/ui/controls/ToggleSwitch';
import {
  buildNameDisplayHint,
  NAME_DISPLAY_MODES,
  nameDisplayLabelKey,
} from '@/components/SeatingPlanGenerator/canvas/nameDisplayGroup';

type PageOrientation = 'landscape' | 'portrait';

/** A setting that is on or off. */
type Toggle = { checked: boolean; onChange: (next: boolean) => void };

type Props = {
  /** Which arrangement the sheet shows; some settings only apply to one. */
  mode: 'table' | 'circle';
  title: string;
  onTitleChange: (title: string) => void;
  orientation: PageOrientation;
  onOrientationChange: (orientation: PageOrientation) => void;
  /** Seating plan only: read the sheet from the back of the room. */
  flipView: Toggle;
  needs: Toggle;
  /**
   * Which badge families the sheet carries, one switch each, for the families
   * the class has. Shown while the badges themselves are on.
   */
  badgeFamilies: {
    present: readonly DataFamily[];
    hidden: readonly DataFamily[];
    onToggle: (family: DataFamily, visible: boolean) => void;
  };
  photos: Toggle;
  legend: Toggle;
  classInfo: Toggle;
  /** Circle only: the lines between wish partners. */
  connections: Toggle;
  nameDisplay: NameDisplayMode;
  onNameDisplayChange: (mode: NameDisplayMode) => void;
  /** The class's names, for the line that previews the rule. */
  names: string[];
  /** Seating plan only: which room elements the sheet draws. */
  featureAvailability: FeatureVisibilityFlags;
  featureVisibility: FeatureVisibilityFlags;
  onFeatureToggle: (type: ClassroomFeatureType, next: boolean) => void;
};

/**
 * What the printed sheet carries, in the shape of every inspector.
 *
 * It replaces a card-per-setting sidebar and a gear floating over the preview:
 * the sheet is the thing selected on this page, so its settings are read the
 * way a student's or a table's are — a row per setting, its value on the right.
 * Settings an arrangement has no use for are left out rather than disabled,
 * and so are room elements the room does not have.
 */
export default function ExportSheetInspector({
  mode,
  title,
  onTitleChange,
  orientation,
  onOrientationChange,
  flipView,
  needs,
  badgeFamilies,
  photos,
  legend,
  classInfo,
  connections,
  nameDisplay,
  onNameDisplayChange,
  names,
  featureAvailability,
  featureVisibility,
  onFeatureToggle,
}: Props) {
  const { t } = useTranslation('generator');
  const titleId = React.useId();
  const isTable = mode === 'table';
  const orientationLabel =
    orientation === 'landscape' ? t('export.landscape') : t('export.portrait');
  const nameHint = buildNameDisplayHint(nameDisplay, names, t);
  const availableFeatures = FEATURE_TYPES.filter(
    (type) => featureAvailability[type] === true,
  );

  const switchRow = (label: string, toggle: Toggle) => (
    <InspectorRow label={label}>
      <ToggleSwitch
        checked={toggle.checked}
        onChange={toggle.onChange}
        label={label}
        size="sm"
      />
    </InspectorRow>
  );

  return (
    <>
      <InspectorHeader
        title={t('export.sheet')}
        subtitle={t('export.sheetFormat', { orientation: orientationLabel })}
      />
      <InspectorBody>
        <InspectorSection title={t('export.pageFormat')}>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={titleId} className="text-[13px] text-(--text-page)">
              {t('export.title')}
            </label>
            <input
              id={titleId}
              type="text"
              value={title}
              onChange={(event) => onTitleChange(event.target.value)}
              placeholder={t('export.titlePlaceholder')}
              className={`${inputFieldClass} w-full`}
            />
          </div>
          <InspectorRow label={t('export.orientation')}>
            <InspectorChoice
              label={t('export.orientation')}
              value={orientation}
              // A sheet always has an orientation: pressing the current one
              // keeps it rather than clearing it.
              onChange={(next) => next && onOrientationChange(next)}
              options={[
                {
                  value: 'portrait',
                  label: t('export.portrait'),
                  icon: (
                    <RectangleIcon
                      size={14}
                      className="rotate-90"
                      aria-hidden="true"
                    />
                  ),
                },
                {
                  value: 'landscape',
                  label: t('export.landscape'),
                  icon: <RectangleIcon size={14} aria-hidden="true" />,
                },
              ]}
            />
          </InspectorRow>
          {isTable && (
            <InspectorRow label={t('export.viewDirection')}>
              <InspectorChoice
                label={t('export.viewDirection')}
                value={flipView.checked ? 'back' : 'front'}
                onChange={(next) => next && flipView.onChange(next === 'back')}
                options={[
                  {
                    value: 'front',
                    label: t('export.viewFromFront'),
                    title: t('export.viewFromFrontTitle'),
                    icon: <ArrowUpIcon size={14} aria-hidden="true" />,
                  },
                  {
                    value: 'back',
                    label: t('export.viewFromBack'),
                    title: t('export.viewFromBackTitle'),
                    icon: <ArrowDownIcon size={14} aria-hidden="true" />,
                  },
                ]}
              />
            </InspectorRow>
          )}
        </InspectorSection>

        <InspectorSection title={t('export.content')}>
          {switchRow(t('export.rows.needs'), needs)}
          {needs.checked && badgeFamilies.present.length > 0 && (
            // The families under the switch they belong to: what a printout
            // on the classroom wall should not say is left out here.
            <div
              role="group"
              aria-label={t('export.badgeFamilies')}
              className="flex flex-col gap-2 border-l border-(--border-card) pl-3"
            >
              {badgeFamilies.present.map((family) => (
                <div
                  key={family}
                  className={`${dataFamilyClass[family]} flex items-center gap-2`}
                >
                  <span
                    aria-hidden="true"
                    className="size-2 shrink-0 rounded-full bg-(--data-chip-accent)"
                  />
                  <div className="min-w-0 flex-1">
                    {switchRow(t(badgeFamilyLabelKey(family)), {
                      checked: !badgeFamilies.hidden.includes(family),
                      onChange: (next) => badgeFamilies.onToggle(family, next),
                    })}
                  </div>
                </div>
              ))}
              <p className="text-xs text-(--text-muted)">
                {t('export.badgeFamiliesHint')}
              </p>
            </div>
          )}
          {switchRow(t('export.rows.photos'), photos)}
          {switchRow(t('export.rows.legend'), legend)}
          {switchRow(t('export.rows.classInfo'), classInfo)}
          {!isTable && switchRow(t('export.rows.connections'), connections)}
        </InspectorSection>

        <InspectorSection title={t('editor.nameDisplay.label')}>
          <InspectorChoice
            label={t('editor.nameDisplay.label')}
            value={nameDisplay}
            onChange={(next) => next && onNameDisplayChange(next)}
            options={NAME_DISPLAY_MODES.map((rule) => ({
              value: rule,
              label: t(nameDisplayLabelKey(rule)),
            }))}
          />
          {nameHint && (
            <p className="text-xs text-(--text-muted)">{nameHint}</p>
          )}
        </InspectorSection>

        {isTable && availableFeatures.length > 0 && (
          <InspectorSection title={t('export.roomElements')}>
            {availableFeatures.map((type) => (
              <React.Fragment key={type}>
                {switchRow(t(FEATURE_TYPE_LABEL_KEYS[type]), {
                  checked: featureVisibility[type] !== false,
                  onChange: (next) => onFeatureToggle(type, next),
                })}
              </React.Fragment>
            ))}
          </InspectorSection>
        )}
      </InspectorBody>
    </>
  );
}
