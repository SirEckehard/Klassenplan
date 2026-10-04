// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import { CopyIcon, FloppyDiskIcon } from '@phosphor-icons/react';
import {
  useSeatingPlanState,
  useSeatingPlanActions,
} from '@/contexts/SeatingPlanContext';
import { useIsCoarsePointer } from '@/hooks/ui/useCoarsePointer';
import { useOpenPlan } from '@/hooks/plan/useOpenPlan';
import {
  inputFieldClass,
  MAX_NAME_LENGTH,
  menuItemClass,
  menuSurfaceClass,
} from '@/utils';

const iconClass = 'h-4 w-4 shrink-0 text-(--text-muted)';

/**
 * What "Plan speichern" in the plan layer's toolbar opens: the plan's name and
 * the ways to keep it.
 *
 * The name used to sit in the header, where changing it looked like renaming
 * but saved a copy beside the old plan. Here it is asked for where the plan is
 * saved, and what a new name does is spelled out: the open plan is renamed
 * ("Umbenennen und speichern"), or it stays as it was and the plan on screen
 * becomes another one ("Als neuen Plan speichern"). A plan never saved has
 * only "Speichern" — it is new either way.
 *
 * Enter and Ctrl/⌘+S save, Escape closes without saving (the rail owns it).
 * A name another plan carries is refused here rather than by a toast after
 * the fact. An emptied field keeps the open plan's name; a plan without one
 * gets a timestamp, as it always has.
 */
export default function PlanSavePanel({ onDone }: { onDone: () => void }) {
  const { planName, seatingHistory, classroomScene, rooms, activeRoomId } =
    useSeatingPlanState();
  const { handleSaveSeatingPlan } = useSeatingPlanActions();
  const { t } = useTranslation('generator');
  const isCoarsePointer = useIsCoarsePointer();
  const [draft, setDraft] = React.useState(planName);
  const fieldRef = React.useRef<HTMLInputElement | null>(null);
  const fieldId = React.useId();
  const hintId = React.useId();

  // The saved plan on screen, by the id a save writes to — the panel must
  // not offer a rename the save would then refuse.
  const openPlan = useOpenPlan();

  // Ready for a new name at once — but a finger may only have come to save,
  // so it does not get the on-screen keyboard for nothing.
  React.useEffect(() => {
    if (isCoarsePointer) return;
    fieldRef.current?.focus();
    fieldRef.current?.select();
  }, [isCoarsePointer]);

  const name = draft.trim();
  const nameTaken =
    name !== '' &&
    seatingHistory.some(
      (plan) => plan.name === name && plan.id !== openPlan?.id,
    );
  const renames =
    openPlan !== undefined && name !== '' && name !== openPlan.name;

  // Once the class has more than one room, the panel says which one the plan
  // goes into (decision 0024).
  const roomName =
    rooms.length > 1
      ? rooms.find((room) => room.id === activeRoomId)?.name
      : undefined;

  const save = () => {
    if (nameTaken) return;
    const saved = handleSaveSeatingPlan(
      name || openPlan?.name || '',
      classroomScene,
      { rename: openPlan !== undefined },
    );
    if (saved) onDone();
  };

  const saveAsNew = () => {
    if (!renames || nameTaken) return;
    if (handleSaveSeatingPlan(name, classroomScene)) onDone();
  };

  return (
    <div className={`${menuSurfaceClass} p-1`}>
      <div className="flex flex-col gap-1 p-2">
        <label
          htmlFor={fieldId}
          className="text-xs font-medium text-(--text-muted)"
        >
          {t('planSave.nameLabel')}
        </label>
        <input
          ref={fieldRef}
          id={fieldId}
          type="text"
          value={draft}
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
        {roomName && (
          <p className="text-xs text-(--text-muted)">
            {t('planSave.room', { name: roomName })}
          </p>
        )}
      </div>
      <div className="my-1 h-px bg-(--border-card)" aria-hidden="true" />
      <button
        type="button"
        onClick={save}
        disabled={nameTaken}
        className={menuItemClass}
      >
        <FloppyDiskIcon className={iconClass} aria-hidden="true" />
        {renames ? t('planSave.rename') : t('planSave.save')}
      </button>
      {/* Only a new name can start a new plan, so the way appears with one. */}
      {renames && !nameTaken && (
        <button type="button" onClick={saveAsNew} className={menuItemClass}>
          <CopyIcon className={iconClass} aria-hidden="true" />
          {t('planSave.saveAsNew')}
        </button>
      )}
    </div>
  );
}
