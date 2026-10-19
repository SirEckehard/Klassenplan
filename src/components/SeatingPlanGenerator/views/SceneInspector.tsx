// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowArcLeftIcon,
  ArrowArcRightIcon,
  ArrowLineUpIcon,
  ClipboardTextIcon,
  CopyIcon,
  CopySimpleIcon,
  EyeIcon,
  ScissorsIcon,
  ShuffleIcon,
} from '@phosphor-icons/react';
import type {
  ClassroomFeature,
  ClassroomFeatureType,
  ClassroomTable,
  ClassroomTemplate,
  TableTemplateType,
} from '@/types';
import {
  InspectorBody,
  InspectorActionRow,
  InspectorDeleteFooter,
  InspectorHeader,
  InspectorIcon,
  InspectorMediaTile,
  InspectorRow,
  InspectorSection,
} from '@/components/shell/InspectorPanel';
import ToggleSwitch from '@/components/ui/controls/ToggleSwitch';
import TablePreview from '@/components/TablePreview';
import NameField from '@/components/shell/NameField';
import {
  RoomListControls,
  RoomSetupSection,
  RoomTemplatesSection,
} from '@/components/SeatingPlanGenerator/views/RoomSetupSections';
import {
  useOptionalSeatingPlanActions,
  useOptionalSeatingPlanState,
} from '@/contexts/seatingPlan/seatingPlanSelectors';
import type { SceneTransactionRunner } from '@/hooks/scene/useSceneManager';
import {
  checkName,
  DEFAULT_ROTATION_SNAP_STEP,
  MAX_NAME_LENGTH,
  collectRotationTargets,
  hasRotationTargets,
  rotateTargets,
  rotationsChangeTargets,
  inputFieldClass,
  isTableActive,
  type SceneRotations,
  quietIconButtonClass,
} from '@/utils';
import { FEATURE_TYPE_ICONS } from '@/utils/ui';

/**
 * The arrows turn as far as Q/E do on the canvas, whose shortcut their
 * tooltips name — and the handle snaps to the same step.
 */
const ROTATION_STEP = DEFAULT_ROTATION_SNAP_STEP;

/** A typed angle wraps round within one turn: 360 is 0, −90 is 270. */
const wrapAngle = (degrees: number) => ((degrees % 360) + 360) % 360;

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
  /** Rebuilds the room's tables from one kind, as many as the class needs. */
  onSetUpRoom: (type: TableTemplateType) => void;
  /** Counts up whenever the setup is asked for, to take the focus. */
  setupFocusRequest?: number;
  templates: ClassroomTemplate[];
  /** Replaces the room with a saved one. */
  onLoadTemplate: (id: number) => void;
  onRenameTemplate: (
    id: number,
    name: string,
  ) => Promise<{ success: boolean; error?: string }>;
  onDeleteTemplate: (id: number) => void;
  /**
   * Keeps this room as a new template, or over the one `overwriteId` names;
   * resolves with whether it was kept.
   */
  onSaveTemplate: (name: string, overwriteId?: number) => Promise<boolean>;
  /** Takes an undo snapshot before a change lands. */
  snapshot: () => void;
  /** Sets rotations of tables and room elements and commits the scene. */
  onRotateSelection: (rotations: SceneRotations) => void;
  /** Changes the scene and commits it, as the canvas's own actions do. */
  runSceneTransaction: SceneTransactionRunner;
  onDeleteSelection: () => void;
  /** Pastes a copy of the selection without touching the clipboard. */
  onDuplicateSelection: () => void;
  /** The canvas's own clipboard: the same actions as its context menu. */
  onCopySelection: () => void;
  onCutSelection: () => void;
  onPasteSelection: () => void;
  canPaste: boolean;
};

/**
 * The angle as a field: it shows the rotation as it is — live while a
 * handle turns it — until somebody types, and takes the typed value on
 * Enter or when the field is left. Escape drops the draft. What lies outside
 * 0–359° wraps round as a turn does: 360 is 0, −90 is 270. A selection
 * turned differently leaves it empty.
 */
function RotationField({
  value,
  label,
  mixedHint,
  onCommit,
}: {
  /** The shared angle, or null when the tables stand at different ones. */
  value: number | null;
  label: string;
  mixedHint: string;
  onCommit: (degrees: number) => void;
}) {
  const [draft, setDraft] = React.useState<string | null>(null);
  const mixed = value === null;

  const commit = () => {
    if (draft === null) return;
    setDraft(null);
    // A German keyboard types the decimal comma.
    const degrees = Number(draft.trim().replace(',', '.'));
    if (draft.trim() === '' || !Number.isFinite(degrees)) return;
    onCommit(wrapAngle(Math.round(degrees)));
  };

  return (
    <span className="relative">
      <input
        type="text"
        inputMode="numeric"
        value={draft ?? (mixed ? '' : String(Math.round(value)))}
        placeholder={mixed ? '–' : undefined}
        title={mixed ? mixedHint : undefined}
        onChange={(event) => setDraft(event.target.value)}
        onFocus={(event) => event.currentTarget.select()}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            commit();
          } else if (event.key === 'Escape') {
            // The canvas clears its selection on Escape; here it only
            // means "not this number".
            event.preventDefault();
            event.stopPropagation();
            setDraft(null);
          }
        }}
        aria-label={label}
        className={`${inputFieldClass} h-7 w-16 py-0 pr-5 pl-2 text-right tabular-nums pointer-coarse:h-11`}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-sm text-(--text-muted)"
      >
        °
      </span>
    </span>
  );
}

/**
 * What can be done with the canvas selection besides dragging it.
 *
 * The panel used to state a table's place and size in pixels and let them be
 * typed. Nobody places a table by its x coordinate: dragging does all of that
 * directly, so the numbers were noise. What stays is what a drag cannot do in
 * one gesture — turning to an exact angle or in steps, duplicating, copying,
 * cutting, removing — each with the shortcut that does the same on the
 * canvas, and each for one table as for a whole selection.
 *
 * Seat count and table type stay out of reach on purpose — changing them under
 * a finished plan would move students around without being asked. A room is
 * rebuilt as a whole: while nothing is selected the panel is the room's own,
 * with the setup and the templates that used to open over the canvas.
 */
export default function SceneInspector({
  tables,
  features,
  selectedTableIds,
  selectedFeatureIds,
  featurePalette,
  studentsCount,
  onSetUpRoom,
  setupFocusRequest,
  templates,
  onLoadTemplate,
  onRenameTemplate,
  onDeleteTemplate,
  onSaveTemplate,
  snapshot,
  onRotateSelection,
  runSceneTransaction,
  onDeleteSelection,
  onDuplicateSelection,
  onCopySelection,
  onCutSelection,
  onPasteSelection,
  canPaste,
}: Props) {
  const { t } = useTranslation('generator');
  // The room is named where it is edited (decision 0024).
  const seatingPlanState = useOptionalSeatingPlanState();
  const seatingPlanActions = useOptionalSeatingPlanActions();
  const activeRoomId = seatingPlanState?.activeRoomId;
  const openRoomName = seatingPlanState?.rooms.find(
    (room) => room.id === activeRoomId,
  )?.name;
  const otherRoomNames = (seatingPlanState?.rooms ?? [])
    .filter((room) => room.id !== activeRoomId)
    .map((room) => room.name);

  const selectedTables = selectedTableIds
    .map((index) => ({ index, table: tables[index] }))
    .filter((entry) => entry.table !== undefined);
  const selectedFeatures = selectedFeatureIds
    .map((id) => features.find((feature) => feature.id === id))
    .filter((feature) => feature !== undefined);
  const selectionSize = selectedTables.length + selectedFeatures.length;

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

  /**
   * Takes tables into the mix or out of it. In the mix is the absent flag, so
   * a table taken back in compares equal to one that was never out.
   */
  const setTablesActive = (indices: number[], active: boolean) => {
    const chosen = new Set(indices);
    snapshot();
    runSceneTransaction(
      ({ tables: current }) => ({
        tables: current.map((table, index) => {
          if (!chosen.has(index)) return table;
          const next = { ...table };
          if (active) delete next.inactive;
          else next.inactive = true;
          return next;
        }),
      }),
      { skipSeatingUpdate: true },
    );
  };

  const fillFromFront = seatingPlanState?.classroomScene.fillFromFront === true;
  const setFillFromFront = (on: boolean) => {
    snapshot();
    runSceneTransaction(
      ({ scene, tables: current, features: currentFeatures }) => {
        const next = { ...scene, tables: current, features: currentFeatures };
        if (on) next.fillFromFront = true;
        else delete next.fillFromFront;
        return { scene: next };
      },
      { skipSeatingUpdate: true },
    );
  };

  /**
   * Whether mixing seats students at the selected tables. A table taken out
   * stays in the room and in the plan — empty, unless somebody is put there
   * by hand. A selection of both kinds shows the switch in the middle; a
   * press takes them all in.
   */
  const mixRow = (entries: { index: number; table: ClassroomTable }[]) => {
    if (entries.length === 0) return null;
    const activeCount = entries.filter(({ table }) =>
      isTableActive(table),
    ).length;
    const allActive = activeCount === entries.length;
    const mixed = activeCount > 0 && !allActive;
    const label = t('sceneInspector.inMix');
    return (
      <InspectorRow
        label={label}
        icon={<InspectorIcon icon={ShuffleIcon} />}
        description={
          activeCount === 0
            ? t('sceneInspector.inMixOffHint', { count: entries.length })
            : undefined
        }
        labelsControl
      >
        <ToggleSwitch
          checked={allActive}
          mixed={mixed}
          onChange={(active) =>
            setTablesActive(
              entries.map(({ index }) => index),
              active,
            )
          }
          label={mixed ? t('sceneInspector.inMixMixed') : label}
          size="sm"
        />
      </InspectorRow>
    );
  };

  const patchFeature = (id: string, patch: Partial<ClassroomFeature>) => {
    snapshot();
    runSceneTransaction(
      ({ features: current }) => ({
        features: current.map((feature) =>
          feature.id === id ? { ...feature, ...patch } : feature,
        ),
      }),
      { skipSeatingUpdate: true },
    );
  };

  /**
   * Turning acts on what the canvas would turn: the unlocked tables and the
   * freely placed room elements (cabinet, divider, lectern) of the selection.
   * A window, a door or the board takes its angle from its wall.
   */
  const rotatable = collectRotationTargets(
    tables,
    features,
    selectedTableIds,
    selectedFeatureIds,
  );

  const applyRotation = (next: (rotation: number) => number) => {
    const rotations = rotateTargets(rotatable, next);
    if (!rotationsChangeTargets(rotatable, rotations)) return;
    snapshot();
    onRotateSelection(rotations);
  };

  const rotationRow = () => {
    if (!hasRotationTargets(rotatable)) return null;
    const angles = new Set(
      [...rotatable.tables, ...rotatable.features].map(({ rotation }) =>
        Math.round(rotation),
      ),
    );
    const sharedAngle = angles.size === 1 ? [...angles][0] : null;
    const turnBy = (delta: number) =>
      applyRotation((rotation) => Math.round(rotation) + delta);

    return (
      <InspectorRow label={t('sceneInspector.rotation')}>
        <button
          type="button"
          onClick={() => turnBy(-ROTATION_STEP)}
          className={`${quietIconButtonClass} h-7 w-7 pointer-coarse:h-11 pointer-coarse:w-11`}
          title={`${t('sceneInspector.rotateLeft')} (Q)`}
          aria-label={t('sceneInspector.rotateLeft')}
        >
          <ArrowArcLeftIcon size={16} aria-hidden="true" />
        </button>
        <RotationField
          // A new selection starts without a draft.
          key={[
            ...rotatable.tables.map(({ index }) => index),
            ...rotatable.features.map(({ id }) => id),
          ].join(',')}
          value={sharedAngle}
          label={t('sceneInspector.rotationAngle')}
          mixedHint={t('sceneInspector.rotationMixed')}
          onCommit={(degrees) => applyRotation(() => degrees)}
        />
        <button
          type="button"
          onClick={() => turnBy(ROTATION_STEP)}
          className={`${quietIconButtonClass} h-7 w-7 pointer-coarse:h-11 pointer-coarse:w-11`}
          title={`${t('sceneInspector.rotateRight')} (E)`}
          aria-label={t('sceneInspector.rotateRight')}
        >
          <ArrowArcRightIcon size={16} aria-hidden="true" />
        </button>
      </InspectorRow>
    );
  };

  /**
   * What the selection is — its angle first, since tables and room elements
   * share it and it stays in its place as the selection changes, then whether
   * the tables take part in the mix or the element is drawn. One section
   * rather than one per row: a heading over a single row only repeated it.
   */
  const propertiesSection = (extra?: React.ReactNode) => {
    const rotation = rotationRow();
    const mix = mixRow(selectedTables);
    if (!rotation && !mix && !extra) return null;
    return (
      <InspectorSection title={t('sceneInspector.title')}>
        {rotation}
        {mix}
        {extra}
      </InspectorSection>
    );
  };

  const pasteRow = canPaste && (
    <InspectorActionRow
      icon={ClipboardTextIcon}
      label={t('canvas.paste')}
      title={t('sceneInspector.pasteShortcut')}
      onClick={onPasteSelection}
    />
  );

  /**
   * Duplicate, copy and cut (and paste, once something is copied) for any
   * selection. Duplicating is a paste of the selection that leaves the
   * clipboard alone, so the copies land and get selected as pasted ones do.
   */
  const clipboardSection = (copyable: boolean) =>
    copyable || canPaste ? (
      <InspectorSection title={t('sceneInspector.edit')}>
        <div className="flex flex-col">
          {copyable && (
            <>
              <InspectorActionRow
                icon={CopySimpleIcon}
                label={t('sceneInspector.duplicate')}
                onClick={onDuplicateSelection}
              />
              <InspectorActionRow
                icon={CopyIcon}
                label={t('common.copy')}
                title={t('sceneInspector.copyShortcut')}
                onClick={onCopySelection}
              />
              <InspectorActionRow
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

  // Nothing selected: the room itself, by its name — renamed in its own
  // section, as the class is in the class layer's inspector, and beside the
  // name the class's other rooms: a new one, and the others to open. Seats
  // and students are the status bar's to state; what the panel adds is how a
  // room is set up and how a room is kept for others, which comes last: a
  // template opens as a room of its own.
  if (selectionSize === 0) {
    return (
      <>
        <InspectorHeader
          title={openRoomName ?? t('sceneInspector.room')}
          subtitle={
            tables.length > 0
              ? t('sceneInspector.tables', { count: tables.length })
              : t('sceneInspector.noTables')
          }
        />
        <InspectorBody>
          {openRoomName !== undefined && activeRoomId && seatingPlanActions && (
            <InspectorSection title={t('sceneInspector.room')}>
              <NameField
                label={t('sceneInspector.roomName')}
                value={openRoomName}
                problemFor={(draft) =>
                  checkName(draft, otherRoomNames, MAX_NAME_LENGTH)
                }
                onCommit={(name) =>
                  seatingPlanActions.renameRoom(activeRoomId, name)
                }
                takenMessage={t('sceneInspector.roomNameTaken')}
              />
              <RoomListControls />
            </InspectorSection>
          )}
          <RoomSetupSection
            studentsCount={studentsCount}
            hasTables={tables.length > 0}
            onSetUp={onSetUpRoom}
            focusRequest={setupFocusRequest}
          />
          {tables.length > 0 && (
            <InspectorSection title={t('sceneInspector.mixing')}>
              <InspectorRow
                label={t('sceneInspector.fillFromFront')}
                icon={<InspectorIcon icon={ArrowLineUpIcon} />}
                description={t('sceneInspector.fillFromFrontHint')}
                labelsControl
              >
                <ToggleSwitch
                  checked={fillFromFront}
                  onChange={setFillFromFront}
                  label={t('sceneInspector.fillFromFront')}
                  size="sm"
                />
              </InspectorRow>
            </InspectorSection>
          )}
          {clipboardSection(false)}
          <RoomTemplatesSection
            templates={templates}
            onSave={onSaveTemplate}
            onLoad={onLoadTemplate}
            onRename={onRenameTemplate}
            onDelete={onDeleteTemplate}
          />
        </InspectorBody>
      </>
    );
  }

  if (selectionSize > 1) {
    const selectedSeats = selectedTables.reduce(
      (sum, entry) => sum + entry.table.seatCount,
      0,
    );
    // "2 Tische · 1 Raumelement · 8 Plätze": what is not there is not said.
    const summary = [
      selectedTables.length > 0 &&
        t('sceneInspector.tables', { count: selectedTables.length }),
      selectedFeatures.length > 0 &&
        t('sceneInspector.features', { count: selectedFeatures.length }),
      selectedTables.length > 0 &&
        t('sceneInspector.seats', { count: selectedSeats }),
    ]
      .filter(Boolean)
      .join(' · ');
    return (
      <>
        <InspectorHeader
          title={t('sceneInspector.selection')}
          subtitle={summary}
        />
        <InspectorBody>
          {propertiesSection()}
          {clipboardSection(true)}
        </InspectorBody>
        <InspectorDeleteFooter
          label={t('sceneInspector.deleteSelection')}
          onDelete={onDeleteSelection}
        />
      </>
    );
  }

  if (selectedTables.length === 1) {
    const { index, table } = selectedTables[0];

    return (
      <>
        <InspectorHeader
          media={
            table.templateType && (
              <InspectorMediaTile>
                <TablePreview type={table.templateType} iconSize={24} />
              </InspectorMediaTile>
            )
          }
          title={tableTypeLabel(table)}
          subtitle={`${t('sceneInspector.tablePosition', {
            index: index + 1,
            total: tables.length,
          })} · ${t('sceneInspector.seats', { count: table.seatCount })}`}
        />
        <InspectorBody>
          {propertiesSection()}
          {clipboardSection(true)}
        </InspectorBody>
        <InspectorDeleteFooter
          label={t('sceneInspector.deleteTable')}
          onDelete={onDeleteSelection}
        />
      </>
    );
  }

  const feature = selectedFeatures[0];
  const paletteItem = featurePalette.find((item) => item.type === feature.type);
  const featureLabel = paletteItem?.label ?? feature.type;
  const FeatureIcon = FEATURE_TYPE_ICONS[feature.type];
  // The board is one of a kind: copying it would only produce a toast saying
  // so, so the rows are not offered.
  const copyable = paletteItem?.allowMultiple ?? true;

  return (
    <>
      <InspectorHeader
        media={
          FeatureIcon && (
            <InspectorMediaTile>
              <FeatureIcon size={22} />
            </InspectorMediaTile>
          )
        }
        title={featureLabel}
      />
      <InspectorBody>
        {propertiesSection(
          <InspectorRow
            label={t('sceneInspector.visible')}
            icon={<InspectorIcon icon={EyeIcon} />}
            labelsControl
          >
            <ToggleSwitch
              checked={feature.visible !== false}
              onChange={(visible) => patchFeature(feature.id, { visible })}
              label={t('sceneInspector.visible')}
              size="sm"
            />
          </InspectorRow>,
        )}
        {clipboardSection(copyable)}
      </InspectorBody>
      <InspectorDeleteFooter
        label={t('sceneInspector.deleteFeature')}
        onDelete={onDeleteSelection}
      />
    </>
  );
}
