// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  GridFourIcon,
  RectangleIcon,
  RowsIcon,
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
import type { ExportView } from '@/components/SeatingPlanGenerator/ExportToolPanel';
import {
  NOTE_LIST_COLUMN_COUNTS,
  NOTE_LIST_LINE_COUNTS,
  type NoteListOrder,
  type NoteListSettings,
} from '@/utils/ui/noteList';

type PageOrientation = 'landscape' | 'portrait';

/** A setting that is on or off. */
type Toggle = { checked: boolean; onChange: (next: boolean) => void };

type Props = {
  /** What the sheet shows; some settings only apply to one view. */
  mode: ExportView;
  /** The note list's own settings; read while the list is on the sheet. */
  noteList?: {
    settings: NoteListSettings;
    onChange: (patch: Partial<NoteListSettings>) => void;
    /**
     * The orders there is something to follow for: by table only with a
     * plan, round the circle only with a circle; by name always.
     */
    orders: readonly NoteListOrder[];
  };
  /** How many pages the sheet runs to, where that is more than one. */
  pageCount?: number;
  title: string;
  onTitleChange: (title: string) => void;
  orientation: PageOrientation;
  onOrientationChange: (orientation: PageOrientation) => void;
  /** Seating plan only: read the sheet from the back of the room. */
  flipView: Toggle;
  /** Seating plan only: frame the sheet on the tables or show the whole room. */
  frameOnTables: Toggle;
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
  /** The gender tint on the occupied seats (decision 0020). */
  genderColors: Toggle;
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
  noteList,
  pageCount = 1,
  title,
  onTitleChange,
  orientation,
  onOrientationChange,
  flipView,
  frameOnTables,
  needs,
  badgeFamilies,
  genderColors,
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
  const isList = mode === 'list';
  const orientationLabel =
    orientation === 'landscape' ? t('export.landscape') : t('export.portrait');
  const sheetSubtitle =
    pageCount > 1
      ? `${t('export.sheetFormat', { orientation: orientationLabel })} · ${t(
          'export.noteList.pages',
          { count: pageCount },
        )}`
      : t('export.sheetFormat', { orientation: orientationLabel });
  const listSettings = isList ? noteList?.settings : undefined;
  const orderOptions: readonly NoteListOrder[] = noteList?.orders ?? [
    'alphabetical',
    'lastName',
  ];
  const orderLabelKey: Record<NoteListOrder, string> = {
    tables: 'export.noteList.orderTables',
    circle: 'export.noteList.orderCircle',
    alphabetical: 'export.noteList.orderAlphabetical',
    lastName: 'export.noteList.orderLastName',
  };
  const nameHint = buildNameDisplayHint(nameDisplay, names, t);
  const availableFeatures = FEATURE_TYPES.filter(
    (type) => featureAvailability[type] === true,
  );
  const shownFeatures = availableFeatures.filter(
    (type) => featureVisibility[type] !== false,
  ).length;

  const switchRow = (label: string, toggle: Toggle) => (
    <InspectorRow label={label} labelsControl>
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
      <InspectorHeader title={t('export.sheet')} subtitle={sheetSubtitle} />
      <InspectorBody>
        <InspectorSection title={t('export.pageFormat')}>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor={titleId}
              className="text-control text-(--text-page)"
            >
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
          {isTable && switchRow(t('export.rows.frameOnTables'), frameOnTables)}
          {isTable && frameOnTables.checked && (
            <p className="text-xs text-(--text-muted)">
              {t('export.frameOnTablesHint')}
            </p>
          )}
        </InspectorSection>

        {listSettings && noteList && (
          <InspectorSection title={t('export.noteList.section')}>
            <InspectorRow label={t('export.noteList.form')}>
              <InspectorChoice
                label={t('export.noteList.form')}
                value={listSettings.form}
                onChange={(next) => next && noteList.onChange({ form: next })}
                options={[
                  {
                    value: 'lines',
                    label: t('export.noteList.formLines'),
                    icon: <RowsIcon size={14} aria-hidden="true" />,
                  },
                  {
                    value: 'grid',
                    label: t('export.noteList.formGrid'),
                    icon: <GridFourIcon size={14} aria-hidden="true" />,
                  },
                ]}
              />
            </InspectorRow>
            {listSettings.form === 'lines' ? (
              <InspectorRow label={t('export.noteList.lineCount')}>
                <InspectorChoice
                  label={t('export.noteList.lineCount')}
                  value={String(listSettings.lines)}
                  onChange={(next) =>
                    next &&
                    noteList.onChange({
                      lines: Number(next) as NoteListSettings['lines'],
                    })
                  }
                  options={NOTE_LIST_LINE_COUNTS.map((count) => ({
                    value: String(count),
                    label: String(count),
                  }))}
                />
              </InspectorRow>
            ) : (
              <InspectorRow label={t('export.noteList.columnCount')}>
                <InspectorChoice
                  label={t('export.noteList.columnCount')}
                  value={String(listSettings.columns)}
                  onChange={(next) =>
                    next &&
                    noteList.onChange({
                      columns: Number(next) as NoteListSettings['columns'],
                    })
                  }
                  options={NOTE_LIST_COLUMN_COUNTS.map((count) => ({
                    value: String(count),
                    label: String(count),
                  }))}
                />
              </InspectorRow>
            )}
            <InspectorRow label={t('export.noteList.order')} stacked>
              <InspectorChoice
                label={t('export.noteList.order')}
                layout="list"
                value={
                  orderOptions.includes(listSettings.order)
                    ? listSettings.order
                    : orderOptions[0]
                }
                onChange={(next) => next && noteList.onChange({ order: next })}
                options={orderOptions.map((order) => ({
                  value: order,
                  label: t(orderLabelKey[order]),
                }))}
              />
            </InspectorRow>
          </InspectorSection>
        )}

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
            </div>
          )}
          {!isList && switchRow(t('export.rows.genderColors'), genderColors)}
          {switchRow(t('export.rows.photos'), photos)}
          {!isList && switchRow(t('export.rows.legend'), legend)}
          {switchRow(t('export.rows.classInfo'), classInfo)}
          {mode === 'circle' &&
            switchRow(t('export.rows.connections'), connections)}
        </InspectorSection>

        <InspectorSection title={t('editor.nameDisplay.label')}>
          {/* Three rules, one of them a phrase: a list, as the language
              levels are in the student inspector, not chips that wrap. */}
          <InspectorChoice
            label={t('editor.nameDisplay.label')}
            layout="list"
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
          <InspectorSection
            title={t('export.roomElements')}
            actions={
              // One switch for all of them: a plan for the class often wants
              // the tables alone. Half on, its knob rests in the middle.
              <ToggleSwitch
                checked={shownFeatures === availableFeatures.length}
                mixed={
                  shownFeatures > 0 && shownFeatures < availableFeatures.length
                }
                onChange={(next) =>
                  availableFeatures.forEach((type) =>
                    onFeatureToggle(type, next),
                  )
                }
                label={
                  shownFeatures > 0 && shownFeatures < availableFeatures.length
                    ? t('export.roomElementsToggleAllMixed')
                    : t('layout.roomElementsToggleAll')
                }
                size="sm"
              />
            }
          >
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
