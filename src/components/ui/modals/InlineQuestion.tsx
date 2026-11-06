// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import { isTopDialogLayer, useDialogLayer } from '@/hooks/ui/useDialogLayer';
import { useClickOutside } from '@/hooks/ui/useClickOutside';
import {
  dangerButtonClass,
  secondaryButtonClass,
} from '@/utils/ui/designTokens';

/** What a button asks before it deletes something that loses only itself. */
export type DeleteQuestion = {
  /** The question; "Sitzplan löschen?", or with the name in a menu's row. */
  title: string;
  /** What the question does not say: that it cannot be undone. */
  detail?: string;
  confirmLabel: string;
};

/** Why a question ended without its answer being yes. */
export type QuestionEnd = 'answered' | 'outside';

/**
 * How long "Löschen" takes no press. It appears where the button that asked
 * stood, so the second click of a double click would otherwise land on it.
 */
const ARM_DELAY_MS = 300;

const BUTTON_SIZE_CLASS = 'h-8 px-3 text-xs pointer-coarse:h-11';

/**
 * A question that stands where it was asked: in the inspector's foot or a
 * menu's row, with no window and nothing dimmed, so what it is about stays in
 * sight (decision 0041). The focus starts on the cancel, so a reflexive Enter
 * aborts; Escape ends it, and so does pressing anywhere else.
 */
export default function InlineQuestion({
  question,
  onConfirm,
  onCancel,
  returnFocusRef,
  className = '',
}: {
  question: DeleteQuestion;
  onConfirm: () => void;
  onCancel: (end: QuestionEnd) => void;
  /** Takes what held the focus when the question came, if it still stands. */
  returnFocusRef?: React.RefObject<HTMLElement | null>;
  className?: string;
}) {
  const { t } = useTranslation('common');
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const cancelRef = React.useRef<HTMLButtonElement | null>(null);
  const titleId = React.useId();
  const detailId = React.useId();
  const layerId = useDialogLayer(true);

  const onCancelRef = React.useRef(onCancel);
  React.useLayoutEffect(() => {
    onCancelRef.current = onCancel;
  });

  const [armed, setArmed] = React.useState(false);
  React.useEffect(() => {
    const timer = window.setTimeout(() => setArmed(true), ARM_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);

  // A frame later as well: a drawer opening for the question, or a menu closing
  // over it, takes the focus for itself first.
  React.useLayoutEffect(() => {
    // A second run of this effect finds the focus on the question itself.
    const held = document.activeElement;
    if (returnFocusRef && !rootRef.current?.contains(held)) {
      returnFocusRef.current =
        held instanceof HTMLElement && held !== document.body ? held : null;
    }
    cancelRef.current?.focus();
    const frame = requestAnimationFrame(() => {
      if (!rootRef.current?.contains(document.activeElement)) {
        cancelRef.current?.focus();
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [returnFocusRef]);

  // On the window and before anyone else: the question ends, and the menu or
  // the drawer it stands in stays.
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !isTopDialogLayer(layerId)) return;
      event.preventDefault();
      event.stopPropagation();
      onCancelRef.current('answered');
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [layerId]);

  useClickOutside(rootRef, () => onCancelRef.current('outside'));

  return (
    <div
      ref={rootRef}
      role="alertdialog"
      aria-labelledby={titleId}
      aria-describedby={question.detail ? detailId : undefined}
      className={`flex flex-col gap-2.5 bg-(--surface-sunken) ${className}`}
    >
      <div className="min-w-0 text-control">
        <p
          id={titleId}
          className="wrap-anywhere font-semibold text-(--text-page)"
        >
          {question.title}
        </p>
        {question.detail && (
          <p id={detailId} className="text-(--text-muted)">
            {question.detail}
          </p>
        )}
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <button
          ref={cancelRef}
          type="button"
          onClick={() => onCancel('answered')}
          className={`${secondaryButtonClass} ${BUTTON_SIZE_CLASS}`}
        >
          {t('buttons.cancel')}
        </button>
        <button
          type="button"
          onClick={() => {
            if (armed) onConfirm();
          }}
          aria-disabled={armed ? undefined : true}
          className={`${dangerButtonClass} ${BUTTON_SIZE_CLASS}`}
        >
          {question.confirmLabel}
        </button>
      </div>
    </div>
  );
}
