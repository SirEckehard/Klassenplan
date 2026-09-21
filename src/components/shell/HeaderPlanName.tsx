// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import { FloppyDiskIcon, PencilSimpleIcon } from '@phosphor-icons/react';
import {
  useSeatingPlanState,
  useSeatingPlanActions,
} from '@/contexts/SeatingPlanContext';

/**
 * The plan's name, beside the class it belongs to.
 *
 * It used to sit in a form under the canvas, next to a save button, which made
 * naming feel like a step of saving rather than a property of the thing on
 * screen. In the header it reads as what it is: the class is the document, the
 * plan is the version of it currently open. Saving lives in the toolbar with
 * its Ctrl/Cmd+S — and here, where the name is typed.
 *
 * Borderless, the field read as a fixed title, so it says what it is: a pencil
 * while it rests, and a save button while it is being edited or holds a name
 * no saved plan carries yet. Enter saves under the name, Escape takes the edit
 * back.
 *
 * Below `md` it stands down — a phone header has no room, and a plan saved
 * without a name gets a timestamp, exactly as before.
 */
export default function HeaderPlanName() {
  const {
    planName,
    planNameError,
    planNameInputRef,
    seatingHistory,
    classroomScene,
  } = useSeatingPlanState();
  const { setPlanName, setPlanNameError, handleSaveSeatingPlan } =
    useSeatingPlanActions();
  const { t } = useTranslation('generator');
  const [isEditing, setIsEditing] = React.useState(false);
  // What Escape goes back to: the name as it was when the edit began.
  const nameBeforeEditRef = React.useRef(planName);

  const trimmedName = planName.trim();
  const isUnsaved =
    trimmedName !== '' &&
    !seatingHistory.some((plan) => plan.name === trimmedName);
  const showSave = isEditing || isUnsaved;

  const save = () => {
    handleSaveSeatingPlan(planName, classroomScene);
    planNameInputRef.current?.blur();
  };

  return (
    <div
      className="relative hidden md:block"
      // Focus moving from the field to its own save button is still editing;
      // only leaving both ends it.
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsEditing(false);
        }
      }}
    >
      <input
        ref={planNameInputRef}
        type="text"
        value={planName}
        onChange={(event) => {
          setPlanName(event.target.value);
          if (planNameError) setPlanNameError(false);
        }}
        onFocus={() => {
          if (!isEditing) nameBeforeEditRef.current = planName;
          setIsEditing(true);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            save();
          } else if (event.key === 'Escape') {
            // The field owns Escape while it is being edited, so the layer
            // underneath does not also act on it.
            event.preventDefault();
            event.stopPropagation();
            setPlanName(nameBeforeEditRef.current);
            event.currentTarget.blur();
          }
        }}
        placeholder={t('circle.planNamePlaceholder')}
        aria-label={t('circle.planNameLabel')}
        aria-invalid={planNameError || undefined}
        className={`h-9 w-40 rounded-lg border bg-transparent pr-9 pl-2.5 text-sm text-(--text-page) transition placeholder:text-(--text-muted) hover:bg-(--surface-sunken) focus:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring-primary) lg:w-56 ${
          planNameError
            ? 'border-(--button-danger-bg)'
            : 'border-transparent hover:border-(--border-card) focus:border-(--border-card)'
        }`}
      />
      {showSave ? (
        <button
          type="button"
          // Keeps the field focused, so the press saves what was typed
          // instead of ending the edit first.
          onMouseDown={(event) => event.preventDefault()}
          onClick={save}
          title={t('circle.planNameSave')}
          aria-label={t('circle.planNameSave')}
          className="absolute top-1/2 right-1 inline-flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-(--text-badge) transition hover:bg-(--surface-sunken) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring-primary)"
        >
          <FloppyDiskIcon size={16} aria-hidden="true" />
        </button>
      ) : (
        <PencilSimpleIcon
          size={14}
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-(--text-muted)"
        />
      )}
    </div>
  );
}
