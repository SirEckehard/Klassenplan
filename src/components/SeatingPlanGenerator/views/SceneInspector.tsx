// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowArcLeftIcon,
  ArrowArcRightIcon,
  ClipboardTextIcon,
  CopyIcon,
  CopySimpleIcon,
  ScissorsIcon,
  type Icon,
} from '@phosphor-icons/react';
import type {
  ClassroomFeature,
  ClassroomFeatureType,
  ClassroomTable,
  TableTemplateType,
} from '@/types';
import {
  InspectorBody,
  InspectorFooter,
  InspectorHeader,
  InspectorRow,
  InspectorSection,
} from '@/components/shell/InspectorPanel';
import ToggleSwitch from '@/components/ui/controls/ToggleSwitch';
import {
  CLASSROOM_HEIGHT,
  CLASSROOM_WIDTH,
  GRID_SIZE,
  dangerButtonClass,
  menuItemClass,
  quietIconButtonClass,
} from '@/utils';

/** The canvas rotates in 15° steps, by handle and by Q/E; so does this. */
const ROTATION_STEP = 15;

type FeaturePaletteItem = {
  type: ClassroomFeatureType;
  label: string;
  /** False for the one-of-a-kind elements (the board), which cannot be copied. */
  allowMultiple?: boolean;
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
  /** The canvas's own clipboard: the same actions as its context menu. */
  onCopySelection: () => void;
  onCutSelection: () => void;
  onPasteSelection: () => void;
  canPaste: boolean;
};

/** One thing to do with the selection: an icon and a word, as in a menu. */
function ActionRow({
  icon: RowIcon,
  label,
  title,
  onClick,
}: {
  icon: Icon;
  label: string;
  /** Tooltip with the keyboard shortcut, where there is one. */
  title?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title ?? label}
      className={menuItemClass}
    >
      <RowIcon
        size={16}
        aria-hidden="true"
        className="shrink-0 text-(--text-muted)"
      />
      {label}
    </button>
  );
}

/**
 * What can be done with the canvas selection besides dragging it.
 *
 * The panel used to state a table's place and size in pixels and let them be
 * typed. Nobody places a table by its x coordinate: dragging does all of that
 * directly, so the numbers were noise. What stays is what a drag cannot do in
 * one gesture — turning it in exact steps, duplicating, copying, cutting,
 * removing — each with the shortcut that does the same on the canvas.
 *
 * Seat count and table type stay out of reach on purpose — changing them under
 * a finished plan would move students around without being asked, and the
 * quick setup is where a room gets rebuilt.
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
  onCopySelection,
  onCutSelection,
  onPasteSelection,
  canPaste,
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

  /**
   * A copy one grid step down and to the right, so it is visibly a second
   * table rather than one hiding exactly under the first.
   */
  const duplicateTable = (index: number) => {
    const table = tables[index];
    if (!table) return;
    snapshot();
    updateSceneTables((current) => [
      ...current,
      {
        ...table,
        x: Math.min(table.x + GRID_SIZE, CLASSROOM_WIDTH - table.width),
        y: Math.min(table.y + GRID_SIZE, CLASSROOM_HEIGHT - table.height),
        locked: false,
      },
    ]);
  };

  const patchFeature = (id: string, patch: Partial<ClassroomFeature>) => {
    snapshot();
    setSceneFeatures((current) =>
      current.map((feature) =>
        feature.id === id ? { ...feature, ...patch } : feature,
      ),
    );
  };

  const pasteRow = canPaste && (
    <ActionRow
      icon={ClipboardTextIcon}
      label={t('canvas.paste')}
      title={t('sceneInspector.pasteShortcut')}
      onClick={onPasteSelection}
    />
  );

  /** Copy and cut (and paste, once something is copied) for any selection. */
  const clipboardSection = (copyable: boolean) =>
    copyable || canPaste ? (
      <InspectorSection title={t('sceneInspector.edit')}>
        {/* The rows carry their own padding, as in a menu; the section's
            edge stays in line with the heading. */}
        <div className="-mx-3 flex flex-col">
          {copyable && (
            <>
              <ActionRow
                icon={CopyIcon}
                label={t('common.copy')}
                title={t('sceneInspector.copyShortcut')}
                onClick={onCopySelection}
              />
              <ActionRow
                icon={ScissorsIcon}
                label={t('common.cut')}
                title={t('sceneInspector.cutShortcut')}
                onClick={onCutSelection}
              />
            </>
          )}
          {pasteRow}
        </div>
      </InspectorSection>
    ) : null;

  if (selectionSize === 0) {
    return (
      <>
        <InspectorHeader
          title={t('sceneInspector.room')}
          subtitle={t('sceneInspector.title')}
        />
        <InspectorBody>
          <InspectorSection title={t('sceneInspector.overview')}>
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
          </InspectorSection>
          {clipboardSection(false)}
        </InspectorBody>
      </>
    );
  }

  if (selectionSize > 1) {
    const selectedSeats = selectedTables.reduce(
      (sum, entry) => sum + entry.table.seatCount,
      0,
    );
    return (
      <>
        <InspectorHeader
          title={t('sceneInspector.selection')}
          subtitle={t('sceneInspector.multiSelection', {
            tables: selectedTables.length,
            features: selectedFeatures.length,
          })}
        />
        <InspectorBody>
          {selectedTables.length > 0 && (
            <p className="pb-3 text-sm tabular-nums text-(--text-muted)">
              {t('sceneInspector.selectedSeats', { count: selectedSeats })}
            </p>
          )}
          {clipboardSection(true)}
        </InspectorBody>
        <InspectorFooter>
          <button
            type="button"
            onClick={onDeleteSelection}
            className={`${dangerButtonClass} h-8 px-3 text-xs`}
          >
            {t('sceneInspector.deleteSelection')}
          </button>
        </InspectorFooter>
      </>
    );
  }

  if (selectedTables.length === 1) {
    const { index, table } = selectedTables[0];
    const rotate = (delta: number) =>
      patchTable(index, {
        rotation: (((Math.round(table.rotation) + delta) % 360) + 360) % 360,
      });

    return (
      <>
        <InspectorHeader
          title={tableTypeLabel(table)}
          subtitle={`${t('sceneInspector.tablePosition', {
            index: index + 1,
            total: tables.length,
          })} · ${t('sceneInspector.seats', { count: table.seatCount })}`}
        />
        <InspectorBody>
          <InspectorSection title={t('sceneInspector.orientation')}>
            <InspectorRow label={t('sceneInspector.rotation')}>
              <button
                type="button"
                onClick={() => rotate(-ROTATION_STEP)}
                className={`${quietIconButtonClass} h-8 w-8`}
                title={`${t('sceneInspector.rotateLeft')} (Q)`}
                aria-label={t('sceneInspector.rotateLeft')}
              >
                <ArrowArcLeftIcon size={16} aria-hidden="true" />
              </button>
              <span className="w-10 text-center text-sm tabular-nums">
                {Math.round(table.rotation)}°
              </span>
              <button
                type="button"
                onClick={() => rotate(ROTATION_STEP)}
                className={`${quietIconButtonClass} h-8 w-8`}
                title={`${t('sceneInspector.rotateRight')} (E)`}
                aria-label={t('sceneInspector.rotateRight')}
              >
                <ArrowArcRightIcon size={16} aria-hidden="true" />
              </button>
            </InspectorRow>
          </InspectorSection>
          <InspectorSection title={t('sceneInspector.edit')}>
            <div className="-mx-3 flex flex-col">
              <ActionRow
                icon={CopySimpleIcon}
                label={t('sceneInspector.duplicate')}
                onClick={() => duplicateTable(index)}
              />
              <ActionRow
                icon={CopyIcon}
                label={t('common.copy')}
                title={t('sceneInspector.copyShortcut')}
                onClick={onCopySelection}
              />
              <ActionRow
                icon={ScissorsIcon}
                label={t('common.cut')}
                title={t('sceneInspector.cutShortcut')}
                onClick={onCutSelection}
              />
              {pasteRow}
            </div>
          </InspectorSection>
        </InspectorBody>
        <InspectorFooter>
          <button
            type="button"
            onClick={onDeleteSelection}
            className={`${dangerButtonClass} h-8 px-3 text-xs`}
          >
            {t('sceneInspector.deleteTable')}
          </button>
        </InspectorFooter>
      </>
    );
  }

  const feature = selectedFeatures[0];
  const paletteItem = featurePalette.find((item) => item.type === feature.type);
  const featureLabel = paletteItem?.label ?? feature.type;
  // The board is one of a kind: copying it would only produce a toast saying
  // so, so the rows are not offered.
  const copyable = paletteItem?.allowMultiple ?? true;

  return (
    <>
      <InspectorHeader title={featureLabel} />
      <InspectorBody>
        <InspectorSection title={t('sceneInspector.display')}>
          <InspectorRow label={t('sceneInspector.visible')}>
            <ToggleSwitch
              checked={feature.visible !== false}
              onChange={(visible) => patchFeature(feature.id, { visible })}
              label={t('sceneInspector.visible')}
            />
          </InspectorRow>
        </InspectorSection>
        {clipboardSection(copyable)}
      </InspectorBody>
      <InspectorFooter>
        <button
          type="button"
          onClick={onDeleteSelection}
          className={`${dangerButtonClass} h-8 px-3 text-xs`}
        >
          {t('sceneInspector.deleteFeature')}
        </button>
      </InspectorFooter>
    </>
  );
}
