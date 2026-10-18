// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import type { NameProblem } from '@/utils';
import { inputFieldClass, MAX_NAME_LENGTH } from '@/utils';

/**
 * A name in the inspector, renamed where it is read: Enter or leaving the
 * field keeps the new name, Escape takes it back. A name that cannot be given
 * is said under the field — a taken one in `takenMessage`'s words — and an
 * emptied field goes back to the name it had.
 *
 * The same field holds a value that may stay empty (`optional`: a class's
 * school year), and a longer text (`multiline`: its notes), where Enter
 * starts a new line and leaving the field keeps it.
 */
export default function NameField({
  label,
  value,
  problemFor,
  onCommit,
  takenMessage,
  focusRequest = 0,
  optional = false,
  multiline = false,
  placeholder,
  maxLength = MAX_NAME_LENGTH,
}: {
  label: string;
  value: string;
  /** What speaks against a draft, checked as it is typed. */
  problemFor?: (draft: string) => NameProblem | null;
  /** Gives the name; resolves with what spoke against it after all. */
  onCommit: (name: string) => Promise<NameProblem | null> | NameProblem | null;
  takenMessage?: string;
  /** Counts up whenever the name is asked for (F2), to take the focus. */
  focusRequest?: number;
  /** An emptied field is kept empty instead of going back. */
  optional?: boolean;
  /** A text of several lines: Enter starts a new one. */
  multiline?: boolean;
  placeholder?: string;
  maxLength?: number;
}) {
  const [draft, setDraft] = React.useState(value);
  const [refused, setRefused] = React.useState<NameProblem | null>(null);
  const fieldRef = React.useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const fieldId = React.useId();
  const messageId = React.useId();
  const committingRef = React.useRef(false);

  // A name changed elsewhere — or another entry with its own — shows here.
  const [shownValue, setShownValue] = React.useState(value);
  if (shownValue !== value) {
    setShownValue(value);
    setDraft(value);
    setRefused(null);
  }

  React.useEffect(() => {
    if (focusRequest === 0) return undefined;
    // A frame later, so a drawer that opens for it has taken the focus first.
    const frame = requestAnimationFrame(() => {
      fieldRef.current?.focus();
      fieldRef.current?.select();
    });
    return () => cancelAnimationFrame(frame);
  }, [focusRequest]);

  const problem =
    draft.trim() === value || (optional && draft.trim() === '')
      ? null
      : (problemFor?.(draft) ?? null);
  // Only a taken name needs words: an empty field goes back, and the field
  // takes no more than a name may have.
  const taken = refused === 'taken' || problem === 'taken';

  const commit = async () => {
    const trimmed = draft.trim();
    if (trimmed === value || committingRef.current) return;
    if (trimmed === '' && !optional) {
      setDraft(value);
      return;
    }
    if (problem) return;
    committingRef.current = true;
    try {
      const result = await onCommit(trimmed);
      setRefused(result);
    } finally {
      committingRef.current = false;
    }
  };

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    if (event.key === 'Enter' && !multiline) {
      event.preventDefault();
      void commit();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      setDraft(value);
      setRefused(null);
    }
  };

  const fieldProps = {
    id: fieldId,
    value: draft,
    maxLength,
    placeholder,
    onChange: (
      event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => {
      setDraft(event.target.value);
      setRefused(null);
    },
    onBlur: () => {
      void commit();
    },
    onKeyDown: handleKeyDown,
    'aria-invalid': taken || undefined,
    'aria-describedby': taken ? messageId : undefined,
  };

  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={fieldId}
        className="text-xs font-medium text-(--text-muted)"
      >
        {label}
      </label>
      {multiline ? (
        <textarea
          ref={fieldRef}
          {...fieldProps}
          rows={3}
          className={`${inputFieldClass} min-h-20 resize-y`}
        />
      ) : (
        <input
          ref={fieldRef}
          type="text"
          {...fieldProps}
          className={inputFieldClass}
        />
      )}
      {taken && takenMessage && (
        <p id={messageId} className="text-xs text-(--status-alert-text)">
          {takenMessage}
        </p>
      )}
    </div>
  );
}
