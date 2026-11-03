// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useEffect, useId, useRef } from 'react';
import { DownloadSimpleIcon } from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import Modal from '../modals/Modal';
import {
  dangerButtonClass,
  primaryButtonClass,
  secondaryButtonClass,
} from '@/utils/ui/designTokens';

/** One line of what goes with a deletion: "Sitzpläne 7". */
export type ConfirmFact = { label: string; count: number };

type Props = {
  open: boolean;
  /** The question, naming the thing: „8b“ löschen? */
  title: string;
  /** The thing's own icon, in the inspector head's tile. */
  icon: Icon;
  /** What the thing is, under the title. */
  meta?: string;
  /** What goes with it, in figures; a line that counts nothing is left out. */
  facts?: readonly ConfirmFact[];
  /** What the figures do not say. */
  message?: string;
  /** A way out first: the backup before a class goes. Ends the question. */
  way?: { label: string; onSelect: () => void };
  confirmLabel: string;
  cancelLabel: string;
  /**
   * `danger` guards a deletion, `neutral` a step that destroys nothing,
   * `primary` a step the teacher asked for. The first two focus the cancel, so
   * a reflexive Enter aborts; `primary` focuses what it offers.
   */
  tone?: 'danger' | 'neutral' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
};

const CONFIRM_BUTTON_CLASS = {
  danger: dangerButtonClass,
  neutral: secondaryButtonClass,
  primary: primaryButtonClass,
} as const;

/**
 * The question that may stop the work: a deletion that takes other things with
 * it, or a step that has to be decided before anything goes on. It reads as the
 * inspector's head — the thing's tile, its name, a line of what it is — over
 * what goes with it. A deletion that loses only itself asks at its button
 * instead (`InlineQuestion`), and one that can be undone does not ask (decision
 * 0041).
 */
export default function ConfirmDialog({
  open,
  title,
  icon: IconComponent,
  meta,
  facts = [],
  message,
  way,
  confirmLabel,
  cancelLabel,
  tone = 'danger',
  onConfirm,
  onCancel,
}: Props) {
  const titleId = useId();
  const messageId = useId();
  const firstFocusRef = useRef<HTMLButtonElement>(null);
  const shownFacts = facts.filter((fact) => fact.count > 0);

  // No global Enter handler on purpose: the focused button handles Enter
  // natively, and a window-wide listener would confirm this dialog even after
  // the user moved the focus elsewhere.
  useEffect(() => {
    if (open) firstFocusRef.current?.focus();
  }, [open]);

  return (
    <Modal
      open={open}
      onClose={onCancel}
      size="sm"
      bare
      role={tone === 'primary' ? 'dialog' : 'alertdialog'}
      labelledBy={titleId}
      describedBy={message ? messageId : undefined}
    >
      <div className="flex items-center gap-3 border-b border-(--border-card) px-5 py-4">
        <span
          aria-hidden="true"
          className="flex size-11 shrink-0 items-center justify-center rounded-md bg-(--surface-sunken) text-(--text-muted)"
        >
          <IconComponent size={20} />
        </span>
        <div className="min-w-0">
          <h2
            id={titleId}
            className="wrap-break-word text-lg leading-snug font-semibold text-(--text-page)"
          >
            {title}
          </h2>
          {meta && <p className="text-xs text-(--text-muted)">{meta}</p>}
        </div>
      </div>

      {shownFacts.length > 0 && (
        <ul className="divide-y divide-(--border-card) px-5 pt-2 text-sm">
          {shownFacts.map((fact) => (
            <li
              key={fact.label}
              className="flex items-baseline justify-between gap-4 py-2"
            >
              <span className="text-(--text-page)">{fact.label}</span>
              <span className="font-semibold tabular-nums text-(--text-page)">
                {fact.count}
              </span>
            </li>
          ))}
        </ul>
      )}

      {message && (
        <p
          id={messageId}
          className="px-5 pt-3 text-sm wrap-break-word text-(--text-muted)"
        >
          {message}
        </p>
      )}

      {way && (
        <div className="px-3 pt-2">
          <button
            type="button"
            onClick={way.onSelect}
            className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-(--text-page) transition hover:bg-(--surface-sunken) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring) pointer-coarse:min-h-11"
          >
            <DownloadSimpleIcon
              size={16}
              aria-hidden="true"
              className="shrink-0 text-(--text-muted)"
            />
            {way.label}
          </button>
        </div>
      )}

      <div className="flex flex-wrap justify-end gap-2 px-5 pt-4 pb-5">
        <button
          ref={tone === 'primary' ? undefined : firstFocusRef}
          type="button"
          onClick={onCancel}
          className={`${secondaryButtonClass} pointer-coarse:min-h-11`}
        >
          {cancelLabel}
        </button>
        <button
          ref={tone === 'primary' ? firstFocusRef : undefined}
          type="button"
          onClick={onConfirm}
          className={`${CONFIRM_BUTTON_CLASS[tone]} pointer-coarse:min-h-11`}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
