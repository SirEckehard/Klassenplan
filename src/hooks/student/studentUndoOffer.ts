// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import type { Student } from '@/types';
import i18n from '@/i18n';
import { dismissToast, showToast } from '@/utils/ui/toast';

/**
 * "Rückgängig" on a card, for what leaves the class list without a question: a
 * student, several of them, a photo (decision 0041).
 *
 * The class list's undo takes back its latest step, whichever that is, so the
 * card only stands while that step is the deletion it speaks of: any later
 * change to the list, another class and leaving the class layer take it away.
 * The status bar's undo stays for as long as the history does.
 */
type UndoHost = { undo: () => void; getStudents: () => Student[] };

const OFFER_ID = 'student-undo-offer';
const OFFER_DURATION_MS = 8000;

let host: UndoHost | null = null;
/** The list as the deletion left it, while the offer stands. */
let offeredList: Student[] | null = null;

export function offerStudentUndo(message: string): void {
  const current = host;
  if (!current) {
    showToast('info', message);
    return;
  }
  offeredList = current.getStudents();
  showToast('info', message, {
    id: OFFER_ID,
    duration: OFFER_DURATION_MS,
    action: {
      label: i18n.t('buttons.undo', { ns: 'common' }),
      onClick: () => {
        offeredList = null;
        current.undo();
      },
    },
    onDismiss: () => {
      offeredList = null;
    },
  });
}

/** Takes the card away; nothing happens if none stands. */
export function withdrawStudentUndoOffer(): void {
  if (offeredList === null) return;
  offeredList = null;
  dismissToast(OFFER_ID);
}

/** Connects the offer to the open class's list and its undo. */
export function useStudentUndoOfferHost(
  students: Student[],
  getStudents: () => Student[],
  undo: () => void,
): void {
  React.useEffect(() => {
    const own: UndoHost = { undo, getStudents };
    host = own;
    return () => {
      if (host === own) host = null;
    };
  }, [undo, getStudents]);

  React.useEffect(() => {
    if (offeredList !== null && students !== offeredList) {
      withdrawStudentUndoOffer();
    }
  }, [students]);
}
