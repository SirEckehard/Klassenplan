// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import { CheckIcon, XIcon } from '@phosphor-icons/react';
import {
  dangerIconButtonClass,
  editableTitleClass,
  inputFieldClass,
  inspectorTitleTextClass,
  MAX_NAME_LENGTH,
  successIconButtonClass,
} from '@/utils';
import { useNameDraft, type NameDraftOptions } from './useNameDraft';

/**
 * The name in an inspector's header, renamed where it is read — a class, a
 * room, a plan, a template, the export sheet's title — so the panel does not
 * repeat it as a field under the heading. It looks and works as a student's
 * name does (`StudentNameEditor`): pressed, it opens as a field; Enter or
 * leaving it keeps the new name, Escape takes it back, and either way the
 * field closes. A name that cannot be given keeps it open and is said under
 * it — a taken one in `takenMessage`'s words — and an emptied field goes back
 * to the name it had unless the value may stay empty (`optional`).
 *
 * The button's name is the name itself, so the header's heading keeps it;
 * what pressing does is its tooltip. `disabled` shows the name as plain text.
 * `onSaveShortcut` lets Ctrl/⌘+S in the field save under the typed name, as
 * the layer's own shortcut stands down while a field has the focus.
 */
export default function InspectorTitleField({
  label,
  value,
  problemFor,
  onCommit,
  takenMessage,
  focusRequest = 0,
  optional = false,
  placeholder,
  maxLength = MAX_NAME_LENGTH,
  disabled = false,
  onSaveShortcut,
}: NameDraftOptions & {
  /** What the name is ("Name des Raums"): the open field's accessible name. */
  label: string;
  takenMessage?: string;
  /** Counts up whenever the name is asked for (F2), to open the field. */
  focusRequest?: number;
  /** Shown in place of an empty value, in the field and out of it. */
  placeholder?: string;
  maxLength?: number;
  disabled?: boolean;
  /** Ctrl/⌘+S in the field: saves under the typed name (or the old one). */
  onSaveShortcut?: (name: string) => void;
}) {
  const { t } = useTranslation('students');
  const { draft, setDraft, reset, problem, taken, commit } = useNameDraft({
    value,
    problemFor,
    onCommit,
    optional,
  });
  const [editing, setEditing] = React.useState(false);
  const fieldRef = React.useRef<HTMLInputElement>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  // Closing by a key hands the focus back to the name; leaving the field by
  // a click elsewhere leaves it where the click put it.
  const refocusRef = React.useRef(false);
  const messageId = React.useId();

  const open = () => {
    reset();
    setEditing(true);
  };

  const close = (refocus: boolean) => {
    refocusRef.current = refocus;
    setEditing(false);
  };

  // A request opens the field, one that stands as the panel mounts too — a
  // class just made, named in its own panel.
  const [seenRequest, setSeenRequest] = React.useState(0);
  if (seenRequest !== focusRequest) {
    setSeenRequest(focusRequest);
    if (focusRequest > 0 && !disabled) open();
  }

  React.useEffect(() => {
    if (editing) {
      // A frame later, so a drawer that opens for it has taken the focus
      // first.
      const frame = requestAnimationFrame(() => {
        fieldRef.current?.focus();
        fieldRef.current?.select();
      });
      return () => cancelAnimationFrame(frame);
    }
    if (refocusRef.current) {
      refocusRef.current = false;
      buttonRef.current?.focus();
    }
    return undefined;
  }, [editing]);

  const commitAndClose = async (refocus: boolean) => {
    if (await commit()) close(refocus);
  };

  if (disabled) {
    return (
      <span className="block min-w-0 wrap-break-word">
        {value || placeholder}
      </span>
    );
  }

  if (!editing) {
    return (
      <button
        ref={buttonRef}
        type="button"
        onClick={open}
        title={t('nameEditor.editTitle')}
        className={editableTitleClass}
      >
        {value || (
          <span className="text-(--text-muted)">{placeholder ?? label}</span>
        )}
      </button>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="relative w-full min-w-0">
        <input
          ref={fieldRef}
          type="text"
          value={draft}
          maxLength={maxLength}
          placeholder={placeholder}
          aria-label={label}
          aria-invalid={taken || undefined}
          aria-describedby={taken ? messageId : undefined}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            const isSaveShortcut =
              (event.ctrlKey || event.metaKey) &&
              event.key.toLowerCase() === 's';
            if (event.key === 'Enter') {
              event.preventDefault();
              void commitAndClose(true);
            } else if (event.key === 'Escape') {
              // Only "not this name" — a canvas would take Escape as
              // clearing its selection.
              event.preventDefault();
              event.stopPropagation();
              reset();
              close(true);
            } else if (isSaveShortcut && onSaveShortcut) {
              // Otherwise the browser's own save dialog.
              event.preventDefault();
              if (problem) return;
              onSaveShortcut(draft.trim() || value);
              close(true);
            }
          }}
          onBlur={() => void commitAndClose(false)}
          className={`${inputFieldClass} w-full px-3 py-1 pr-14 ${inspectorTitleTextClass}`}
        />
        <div className="absolute inset-y-0 right-1 flex items-center gap-0.5">
          <button
            type="button"
            className={`${successIconButtonClass} h-6 w-6 p-1.5!`}
            title={t('common.save')}
            aria-label={t('common.save')}
            // Keeps the field from losing the focus before the click lands.
            onPointerDown={(event) => event.preventDefault()}
            onClick={() => void commitAndClose(true)}
          >
            <CheckIcon size={12} />
          </button>
          <button
            type="button"
            className={`${dangerIconButtonClass} h-6 w-6 p-1.5!`}
            title={t('common.cancel')}
            aria-label={t('nameEditor.cancelEdit')}
            onPointerDown={(event) => event.preventDefault()}
            onClick={() => {
              reset();
              close(true);
            }}
          >
            <XIcon size={12} />
          </button>
        </div>
      </div>
      {taken && takenMessage && (
        <p
          id={messageId}
          className="text-xs font-normal text-(--status-alert-text)"
        >
          {takenMessage}
        </p>
      )}
    </div>
  );
}
