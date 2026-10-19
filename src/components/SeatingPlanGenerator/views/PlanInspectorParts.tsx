// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import { CopyIcon, FloppyDiskIcon } from '@phosphor-icons/react';
import {
  useSeatingPlanState,
  useSeatingPlanActions,
} from '@/contexts/SeatingPlanContext';
import { usePlanSaveState } from '@/hooks/plan/usePlanSaveState';
import {
  InspectorActionRow,
  InspectorHeader,
  InspectorMenuButton,
  InspectorSection,
} from '@/components/shell/InspectorPanel';
import { showToast } from '@/utils/ui/toast';
import {
  formatStoredDate,
  hasPlanForScene,
  inputFieldClass,
  MAX_NAME_LENGTH,
} from '@/utils';

/**
 * The plan layer's inspector heading: the plan itself, as the room's names
 * the room and the class layer's the class — its name, and under it whether
 * what is on the stage is what was saved. Shared by the table plan and the
 * circle, which are the same plan seated two ways.
 *
 * "Nicht gespeichert" alone is the status bar's word for a write to storage
 * that failed, so the subtitle never says only that.
 */
export function PlanInspectorHeader() {
  const { t } = useTranslation('generator');
  const { planName, classroomScene, currentSeating, rooms, activeRoomId } =
    useSeatingPlanState();
  const { openPlan, hasUnsavedChanges } = usePlanSaveState();

  const title = openPlan?.name ?? (planName.trim() || t('planSave.untitled'));
  const state = !hasPlanForScene(classroomScene, currentSeating)
    ? t('shell.status.noPlan')
    : !openPlan
      ? t('planSave.state.new')
      : hasUnsavedChanges()
        ? t('planSave.state.changed')
        : openPlan.autoSaved
          ? t('planSave.state.autoSaved')
          : t('planSave.state.saved', {
              date: formatStoredDate(openPlan.date),
            });
  // Once the class has more than one room, the heading says which one the
  // plan belongs to (decision 0024).
  const roomName =
    rooms.length > 1
      ? rooms.find((room) => room.id === activeRoomId)?.name
      : undefined;

  return (
    <InspectorHeader
      title={title}
      subtitle={[state, roomName && t('planSave.room', { name: roomName })]
        .filter(Boolean)
        .join(' · ')}
    />
  );
}

/**
 * The plan's own section, first in its inspector: its name, the ways to keep
 * it, and the other plans of the class to open instead.
 *
 * The name counts when the plan is saved, not when the field is left: a plan
 * on the stage is a working state, and only saving writes it. What a new name
 * does is spelled out — the open plan is renamed ("Umbenennen und speichern"),
 * or it stays as it was and the plan on screen becomes another one ("Als
 * neuen Plan speichern"). A plan never saved has only "Speichern".
 *
 * Enter and Ctrl/⌘+S in the field save, Escape takes the draft back. A name
 * another plan carries is refused here rather than by a toast after the fact.
 * An emptied field keeps the open plan's name; a plan without one gets a
 * timestamp, as it always has.
 *
 * "Plan öffnen …" is shaped as the room's "Raum öffnen …": the saved plans
 * of the class, the open room's first and the open one checked; once the
 * class has more than one room, each names its own, and a plan of another
 * room opens that room (`handleHistoryLoad`). Renaming and removing another
 * plan stay in "Bibliothek".
 */
export function PlanSection() {
  const { t } = useTranslation('generator');
  const {
    planName,
    seatingHistory,
    classroomScene,
    currentSeating,
    activePlanId,
    activeRoomId,
    rooms,
  } = useSeatingPlanState();
  const { handleSaveSeatingPlan, handleHistoryLoad } = useSeatingPlanActions();
  // The saved plan on screen, by the id a save writes to — the section must
  // not offer a rename the save would then refuse.
  const { openPlan } = usePlanSaveState();
  const [draft, setDraft] = React.useState(planName);
  const fieldId = React.useId();
  const hintId = React.useId();

  // A name changed elsewhere — Ctrl/⌘+S, a plan opened — shows here.
  const [shownName, setShownName] = React.useState(planName);
  if (shownName !== planName) {
    setShownName(planName);
    setDraft(planName);
  }

  const canSave = hasPlanForScene(classroomScene, currentSeating);
  const name = draft.trim();
  const nameTaken =
    name !== '' &&
    seatingHistory.some(
      (plan) => plan.name === name && plan.id !== openPlan?.id,
    );
  const renames =
    openPlan !== undefined && name !== '' && name !== openPlan.name;

  // The open room's plans first, then the others room by room; each keeps
  // the order it has in the history.
  const roomOrder = (roomId: string | undefined) =>
    roomId === activeRoomId
      ? -1
      : rooms.findIndex((room) => room.id === roomId);
  const classPlans = [...seatingHistory].sort(
    (a, b) => roomOrder(a.roomId) - roomOrder(b.roomId),
  );
  const roomNameOf = (roomId: string | undefined) =>
    rooms.length > 1
      ? rooms.find((room) => room.id === roomId)?.name
      : undefined;

  const save = () => {
    if (!canSave || nameTaken) return;
    handleSaveSeatingPlan(name || openPlan?.name || '', classroomScene, {
      rename: openPlan !== undefined,
    });
  };

  const saveAsNew = () => {
    if (!canSave || !renames || nameTaken) return;
    handleSaveSeatingPlan(name, classroomScene);
  };

  return (
    <InspectorSection title={t('planSave.section')}>
      <div className="flex flex-col gap-1">
        <label
          htmlFor={fieldId}
          className="text-xs font-medium text-(--text-muted)"
        >
          {t('planSave.nameLabel')}
        </label>
        <input
          id={fieldId}
          type="text"
          value={draft}
          disabled={!canSave}
          // As long as the backup import lets a plan's name be.
          maxLength={MAX_NAME_LENGTH}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            const isSaveShortcut =
              (event.ctrlKey || event.metaKey) &&
              event.key.toLowerCase() === 's';
            if (event.key === 'Enter' || isSaveShortcut) {
              // Ctrl/⌘+S would otherwise open the browser's own save dialog:
              // the layer's shortcut stands down while a field has focus.
              event.preventDefault();
              save();
            } else if (event.key === 'Escape') {
              // Only "not this name" — the canvas would take Escape as
              // clearing its selection.
              event.preventDefault();
              event.stopPropagation();
              setDraft(planName);
            }
          }}
          // An emptied field keeps the open plan's name, so that is what it
          // shows.
          placeholder={openPlan?.name ?? t('planSave.namePlaceholder')}
          aria-invalid={nameTaken || undefined}
          aria-describedby={nameTaken ? hintId : undefined}
          className={inputFieldClass}
        />
        {nameTaken && (
          <p id={hintId} className="text-xs text-(--status-alert-text)">
            {t('planSave.nameTaken')}
          </p>
        )}
      </div>
      <div className="flex flex-col">
        <InspectorActionRow
          icon={FloppyDiskIcon}
          label={renames ? t('planSave.rename') : t('planSave.save')}
          title={t('actions.saveShortcut')}
          disabled={!canSave || nameTaken}
          onClick={save}
        />
        {/* Only a new name can start a new plan, so the way appears with one. */}
        {renames && !nameTaken && (
          <InspectorActionRow
            icon={CopyIcon}
            label={t('planSave.saveAsNew')}
            disabled={!canSave}
            onClick={saveAsNew}
          />
        )}
      </div>
      {classPlans.length > 0 && (
        <InspectorMenuButton
          label={t('planSave.open')}
          menuLabel={t('planSave.plans')}
          rows={classPlans.map((plan) => ({
            key: plan.id,
            label: plan.name,
            description: [
              roomNameOf(plan.roomId),
              formatStoredDate(plan.date),
              plan.autoSaved ? t('library.chipAutoSaved') : null,
            ]
              .filter(Boolean)
              .join(' · '),
            checked: plan.id === activePlanId,
            onSelect: () => {
              if (plan.id === activePlanId) return;
              handleHistoryLoad(plan);
              showToast(
                'success',
                t('storage.planLoaded', { name: plan.name }),
              );
            },
          }))}
        />
      )}
    </InspectorSection>
  );
}
