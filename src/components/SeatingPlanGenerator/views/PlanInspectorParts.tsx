// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useTranslation } from 'react-i18next';
import {
  CheckIcon,
  CopyIcon,
  FloppyDiskIcon,
  HouseIcon,
} from '@phosphor-icons/react';
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
import InspectorTitleField from '@/components/shell/InspectorTitleField';
import {
  formatStoredDate,
  hasPlanForScene,
  MAX_NAME_LENGTH,
  toIsoDate,
  uniqueName,
} from '@/utils';

/** The day a plan was saved, "heute" and "gestern" by name. */
function savedOn(
  stored: string,
  t: ReturnType<typeof useTranslation>['t'],
): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (stored === toIsoDate()) return t('planSave.state.savedToday');
  if (stored === toIsoDate(yesterday)) {
    return t('planSave.state.savedYesterday');
  }
  return t('planSave.state.saved', { date: formatStoredDate(stored) });
}

/**
 * Saving the plan on the stage, shared by the inspector's heading (Ctrl/⌘+S
 * in its name) and the plan's section: under the plan's name, into the open
 * plan — the one `activePlanId` names, never the one that happens to share
 * the name — or as a copy beside it under a free name ("Deutsch (2)"), which
 * leaves the open plan as it was saved.
 */
function usePlanSave() {
  const { planName, seatingHistory, classroomScene, currentSeating } =
    useSeatingPlanState();
  const { handleSaveSeatingPlan } = useSeatingPlanActions();
  const { openPlan } = usePlanSaveState();

  const canSave = hasPlanForScene(classroomScene, currentSeating);
  // Plan names are held exactly, as saving holds them.
  const nameTaken = (name: string) =>
    name !== '' &&
    seatingHistory.some(
      (plan) => plan.name === name && plan.id !== openPlan?.id,
    );

  /** An empty name keeps the open plan's; a plan without one gets a date. */
  const save = (name = planName.trim()) => {
    const next = name || openPlan?.name || '';
    if (!canSave || nameTaken(next)) return;
    handleSaveSeatingPlan(next, classroomScene, {
      rename: openPlan !== undefined,
    });
  };

  const saveAsNew = () => {
    if (!canSave || !openPlan) return;
    handleSaveSeatingPlan(
      uniqueName(
        openPlan.name,
        seatingHistory.map((plan) => plan.name),
        MAX_NAME_LENGTH,
      ),
      classroomScene,
    );
  };

  return { openPlan, canSave, nameTaken, save, saveAsNew };
}

/**
 * The plan layer's inspector heading: the plan itself, as the room's names
 * the room and the class layer's the class — its name, renamed here as a
 * student's is, and under it whether what is on the stage is what was saved.
 * Shared by the table plan and the circle, which are the same plan seated
 * two ways.
 *
 * A saved plan is renamed at once, as in "Bibliothek" — what it holds stays
 * as it was saved. A plan never saved takes the name its first save will
 * use; emptied, it gets a date then, as it always has. A name another plan
 * carries is refused under the name rather than by a toast after the fact,
 * and Ctrl/⌘+S in the field saves under the typed name.
 *
 * "Nicht gespeichert" alone is the status bar's word for a write to storage
 * that failed, so the subtitle never says only that.
 */
export function PlanInspectorHeader() {
  const { t } = useTranslation('generator');
  const { planName, classroomScene, currentSeating, rooms, activeRoomId } =
    useSeatingPlanState();
  const { renameSeatingPlan, setPlanName } = useSeatingPlanActions();
  const { hasUnsavedChanges } = usePlanSaveState();
  const { openPlan, canSave, nameTaken, save } = usePlanSave();

  // What the stage is against what was saved: a check once it is saved, a
  // dot while it has changed — the mark an editor puts on an unsaved
  // document —, a ring while it never was. Nothing mixed yet takes no mark.
  const mark = (className: string) => (
    <span
      aria-hidden="true"
      className={`size-1.5 shrink-0 rounded-full ${className}`}
    />
  );
  const check = (
    <CheckIcon
      size={12}
      weight="bold"
      aria-hidden="true"
      className="shrink-0 text-(--status-ok)"
    />
  );
  const [stateIcon, state] = !hasPlanForScene(classroomScene, currentSeating)
    ? [null, t('shell.status.noPlan')]
    : !openPlan
      ? [mark('border border-current'), t('planSave.state.new')]
      : hasUnsavedChanges()
        ? [mark('bg-(--text-page)'), t('planSave.state.changed')]
        : openPlan.autoSaved
          ? [check, t('planSave.state.autoSaved')]
          : [check, savedOn(openPlan.date, t)];
  // Once the class has more than one room, the heading says which one the
  // plan belongs to (decision 0024).
  const roomName =
    rooms.length > 1
      ? rooms.find((room) => room.id === activeRoomId)?.name
      : undefined;

  return (
    <InspectorHeader
      title={
        <InspectorTitleField
          label={t('planSave.nameLabel')}
          value={openPlan?.name ?? planName.trim()}
          placeholder={t('planSave.untitled')}
          optional={!openPlan}
          disabled={!canSave}
          problemFor={(draft) => (nameTaken(draft.trim()) ? 'taken' : null)}
          onCommit={(name) => {
            if (openPlan) {
              return renameSeatingPlan(openPlan.id, name) ? null : 'taken';
            }
            setPlanName(name);
            return null;
          }}
          takenMessage={t('planSave.nameTaken')}
          onSaveShortcut={save}
        />
      }
      subtitle={
        // Two marks side by side, each kept whole where they wrap.
        <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
          <span className="inline-flex items-center gap-1.5">
            {stateIcon}
            {state}
          </span>
          {roomName && (
            <span className="inline-flex min-w-0 items-center gap-1">
              <HouseIcon size={12} aria-hidden="true" className="shrink-0" />
              <span className="sr-only">{t('shell.layers.room')}:</span>
              <span className="truncate">{roomName}</span>
            </span>
          )}
        </span>
      }
    />
  );
}

/**
 * The plan's own section, first in its inspector: the ways to keep it, and
 * the other plans of the class to open instead. Its name is the heading's
 * (`PlanInspectorHeader`).
 *
 * "Plan speichern" writes the stage into the open plan, or starts the first
 * one. "Als neuen Plan speichern" leaves the open plan as it was and keeps
 * the stage beside it under a free name, which the heading then renames.
 *
 * "Plan öffnen …" is shaped as the room's "Raum öffnen …": the saved plans
 * of the class, the open room's first and the open one checked; once the
 * class has more than one room, each names its own, and a plan of another
 * room opens that room (`handleHistoryLoad`). Renaming and removing another
 * plan stay in "Bibliothek".
 */
export function PlanSection() {
  const { t } = useTranslation('generator');
  const { planName, seatingHistory, activePlanId, activeRoomId, rooms } =
    useSeatingPlanState();
  const { handleHistoryLoad } = useSeatingPlanActions();
  const { openPlan, canSave, nameTaken, save, saveAsNew } = usePlanSave();
  // A name a saved plan carries while the persistence does not hold that
  // plan open: a save would be refused, so the section says why.
  const taken = nameTaken(planName.trim());

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

  return (
    <InspectorSection title={t('planSave.section')}>
      <div className="flex flex-col">
        <InspectorActionRow
          icon={FloppyDiskIcon}
          label={t('planSave.save')}
          title={t('actions.saveShortcut')}
          disabled={!canSave || taken}
          onClick={() => save()}
        />
        {taken && (
          <p className="text-xs text-(--status-alert-text)">
            {t('planSave.nameTaken')}
          </p>
        )}
        {/* Only a saved plan can be kept as it was beside a new one. */}
        {openPlan && (
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
