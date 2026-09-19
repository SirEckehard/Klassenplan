// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowArcLeftIcon, ArrowArcRightIcon } from '@phosphor-icons/react';
import type {
  ClassroomFeature,
  ClassroomFeatureType,
  ClassroomTable,
  TableTemplateType,
} from '@/types';
import {
  CLASSROOM_HEIGHT,
  CLASSROOM_WIDTH,
  dangerButtonClass,
  dataFamilyClass,
  dataHeadingClass,
  inputFieldClass,
  quietIconButtonClass,
} from '@/utils';

/** The canvas rotates in 15° steps, by handle and by Q/E; so does this. */
const ROTATION_STEP = 15;

type FeaturePaletteItem = {
  type: ClassroomFeatureType;
  label: string;
};

type Props = {
  tables: ClassroomTable[];
  features: ClassroomFeature[];
  selectedTableIds: number[];
  selectedFeatureIds: string[];
  featurePalette: FeaturePaletteItem[];
  studentsCount: number;
  /** Takes an undo snapshot before a change lands. */
  snapshot: () => void;
  updateSceneTables: (
    updateFn: (tables: ClassroomTable[]) => ClassroomTable[],
  ) => void;
  setSceneFeatures: React.Dispatch<React.SetStateAction<ClassroomFeature[]>>;
  onDeleteSelection: () => void;
};

const clamp = (value: number, max: number) =>
  Math.max(0, Math.min(Math.round(value), max));

function Field({
  label,
  value,
  onCommit,
  max,
}: {
  label: string;
  value: number;
  onCommit: (next: number) => void;
  max: number;
}) {
  const id = React.useId();
  const rounded = Math.round(value);
  const [draft, setDraft] = React.useState(String(rounded));
  const [lastValue, setLastValue] = React.useState(rounded);

  // The canvas keeps moving things while the panel is open, so the field
  // follows the scene rather than the other way round. Adjusted during render
  // rather than in an effect, so the input never paints a stale number first.
  if (lastValue !== rounded) {
    setLastValue(rounded);
    setDraft(String(rounded));
  }

  const commit = () => {
    const parsed = Number.parseInt(draft, 10);
    if (Number.isNaN(parsed)) {
      setDraft(String(rounded));
      return;
    }
    const next = clamp(parsed, max);
    setDraft(String(next));
    if (next !== rounded) onCommit(next);
  };

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs text-(--text-muted)">
        {label}
      </label>
      <input
        id={id}
        type="number"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            commit();
          }
        }}
        className={`${inputFieldClass} h-9 tabular-nums`}
      />
    </div>
  );
}

/**
 * What the canvas selection actually is, in numbers.
 *
 * A table's seat count, its exact place and its angle were only ever reachable
 * by dragging a handle and guessing; the panel states them and lets them be
 * typed. Seat count and table type stay read-only here on purpose — changing
 * them under a finished plan would move students around without being asked,
 * and the quick setup is where a room gets rebuilt.
 */
export default function SceneInspector({
  tables,
  features,
  selectedTableIds,
  selectedFeatureIds,
  featurePalette,
  studentsCount,
  snapshot,
  updateSceneTables,
  setSceneFeatures,
  onDeleteSelection,
}: Props) {
  const { t } = useTranslation('generator');

  const selectedTables = selectedTableIds
    .map((index) => ({ index, table: tables[index] }))
    .filter((entry) => entry.table !== undefined);
  const selectedFeatures = selectedFeatureIds
    .map((id) => features.find((feature) => feature.id === id))
    .filter((feature) => feature !== undefined);
  const selectionSize = selectedTables.length + selectedFeatures.length;

  const totalSeats = tables.reduce((sum, table) => sum + table.seatCount, 0);

  const tableTypeLabel = (table: ClassroomTable) => {
    const labels: Record<TableTemplateType, string> = {
      single: t('layout.singleSeat'),
      double: t('layout.doubleSeat'),
      group4: t('layout.group4'),
      group6: t('layout.group6'),
    };
    return table.templateType
      ? labels[table.templateType]
      : t('sceneInspector.table');
  };

  const patchTable = (index: number, patch: Partial<ClassroomTable>) => {
    snapshot();
    updateSceneTables((current) =>
      current.map((table, position) =>
        position === index ? { ...table, ...patch } : table,
      ),
    );
  };

  const patchFeature = (id: string, patch: Partial<ClassroomFeature>) => {
    snapshot();
    setSceneFeatures((current) =>
      current.map((feature) =>
        feature.id === id ? { ...feature, ...patch } : feature,
      ),
    );
  };

  if (selectionSize === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h3 className={`${dataHeadingClass} ${dataFamilyClass.space}`}>
          {t('sceneInspector.room')}
        </h3>
        <dl className="m-0 flex flex-col gap-1.5 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-(--text-muted)">
              {t('sceneInspector.tableCount')}
            </dt>
            <dd className="m-0 tabular-nums">{tables.length}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-(--text-muted)">
              {t('sceneInspector.seatCount')}
            </dt>
            <dd className="m-0 tabular-nums">{totalSeats}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-(--text-muted)">
              {t('sceneInspector.studentCount')}
            </dt>
            <dd className="m-0 tabular-nums">{studentsCount}</dd>
          </div>
        </dl>
        <p className="text-xs leading-relaxed text-(--text-muted)">
          {t('sceneInspector.empty')}
        </p>
      </div>
    );
  }

  if (selectionSize > 1) {
    const selectedSeats = selectedTables.reduce(
      (sum, entry) => sum + entry.table.seatCount,
      0,
    );
    return (
      <div className="flex flex-col gap-4">
        <h3 className={`${dataHeadingClass} ${dataFamilyClass.space}`}>
          {t('sceneInspector.selection')}
        </h3>
        <p className="text-sm">
          {t('sceneInspector.multiSelection', {
            tables: selectedTables.length,
            features: selectedFeatures.length,
          })}
        </p>
        {selectedTables.length > 0 && (
          <p className="text-sm tabular-nums text-(--text-muted)">
            {t('sceneInspector.selectedSeats', { count: selectedSeats })}
          </p>
        )}
        <button
          type="button"
          onClick={onDeleteSelection}
          className={`${dangerButtonClass} w-full`}
        >
          {t('sceneInspector.deleteSelection')}
        </button>
      </div>
    );
  }

  if (selectedTables.length === 1) {
    const { index, table } = selectedTables[0];
    const rotate = (delta: number) =>
      patchTable(index, {
        rotation: (((Math.round(table.rotation) + delta) % 360) + 360) % 360,
      });

    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-0.5">
          <h3 className={`${dataHeadingClass} ${dataFamilyClass.space}`}>
            {tableTypeLabel(table)}
          </h3>
          <p className="text-xs tabular-nums text-(--text-muted)">
            {t('sceneInspector.tablePosition', {
              index: index + 1,
              total: tables.length,
            })}
            {' · '}
            {t('sceneInspector.seats', { count: table.seatCount })}
          </p>
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-(--text-muted)">
            {t('sceneInspector.rotation')}
          </span>
          <span className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => rotate(-ROTATION_STEP)}
              className={`${quietIconButtonClass} h-8 w-8`}
              aria-label={t('sceneInspector.rotateLeft')}
            >
              <ArrowArcLeftIcon size={16} aria-hidden="true" />
            </button>
            <span className="w-12 text-center text-sm tabular-nums">
              {Math.round(table.rotation)}°
            </span>
            <button
              type="button"
              onClick={() => rotate(ROTATION_STEP)}
              className={`${quietIconButtonClass} h-8 w-8`}
              aria-label={t('sceneInspector.rotateRight')}
            >
              <ArrowArcRightIcon size={16} aria-hidden="true" />
            </button>
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Field
            label={t('sceneInspector.x')}
            value={table.x}
            max={CLASSROOM_WIDTH}
            onCommit={(next) => patchTable(index, { x: next })}
          />
          <Field
            label={t('sceneInspector.y')}
            value={table.y}
            max={CLASSROOM_HEIGHT}
            onCommit={(next) => patchTable(index, { y: next })}
          />
        </div>

        <button
          type="button"
          onClick={onDeleteSelection}
          className={`${dangerButtonClass} w-full`}
        >
          {t('sceneInspector.deleteTable')}
        </button>
      </div>
    );
  }

  const feature = selectedFeatures[0];
  const featureLabel =
    featurePalette.find((item) => item.type === feature.type)?.label ??
    feature.type;

  return (
    <div className="flex flex-col gap-4">
      <h3 className={`${dataHeadingClass} ${dataFamilyClass.space}`}>
        {featureLabel}
      </h3>

      <div className="grid grid-cols-2 gap-2">
        <Field
          label={t('sceneInspector.x')}
          value={feature.x}
          max={CLASSROOM_WIDTH}
          onCommit={(next) => patchFeature(feature.id, { x: next })}
        />
        <Field
          label={t('sceneInspector.y')}
          value={feature.y}
          max={CLASSROOM_HEIGHT}
          onCommit={(next) => patchFeature(feature.id, { y: next })}
        />
        <Field
          label={t('sceneInspector.width')}
          value={feature.width}
          max={CLASSROOM_WIDTH}
          onCommit={(next) => patchFeature(feature.id, { width: next })}
        />
        <Field
          label={t('sceneInspector.height')}
          value={feature.height}
          max={CLASSROOM_HEIGHT}
          onCommit={(next) => patchFeature(feature.id, { height: next })}
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        <label
          htmlFor={`feature-visible-${feature.id}`}
          className="text-sm text-(--text-muted)"
        >
          {t('sceneInspector.visible')}
        </label>
        <input
          id={`feature-visible-${feature.id}`}
          type="checkbox"
          checked={feature.visible !== false}
          onChange={(event) =>
            patchFeature(feature.id, { visible: event.target.checked })
          }
          className="h-5 w-9 cursor-pointer accent-blue-600"
        />
      </div>

      <button
        type="button"
        onClick={onDeleteSelection}
        className={`${dangerButtonClass} w-full`}
      >
        {t('sceneInspector.deleteFeature')}
      </button>
    </div>
  );
}
