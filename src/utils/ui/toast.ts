// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { generateId } from '@/utils';
import i18n from '@/i18n';

/**
 * Toast message keys that map to i18n translation keys.
 * Use with getToastMessage() to get the translated string.
 */
export const TOAST_MESSAGES = {
  // Save operations
  SAVE_ERROR: 'toast:save.error',
  SAVE_RECOVERED: 'toast:save.recovered',
  SAVE_TEMPLATE_SUCCESS: 'toast:save.templateSuccess',
  SAVE_TEMPLATE_ERROR: 'toast:save.templateError',

  // Delete operations
  DELETE_TEMPLATE_SUCCESS: 'toast:delete.templateSuccess',
  DELETE_TEMPLATE_ERROR: 'toast:delete.templateError',

  // Template operations
  TEMPLATE_NAME_EMPTY: 'toast:template.nameEmpty',
  TEMPLATE_NAME_EXISTS: 'toast:template.nameExists',
  TEMPLATE_RENAME_SUCCESS: 'toast:template.renameSuccess',
  TEMPLATE_UPDATE_SUCCESS: 'toast:template.updateSuccess',
  TEMPLATE_UPDATE_ERROR: 'toast:template.updateError',

  // Export operations
  EXPORT_ERROR: 'toast:export.error',

  // Import operations
  IMPORT_ERROR: 'toast:import.error',

  // Backup operations
  BACKUP_IMPORT_SUCCESS: 'toast:backup.importSuccess',

  // Generation operations
  GENERATION_ERROR: 'toast:generation.error',
  CIRCLE_GENERATION_ERROR: 'toast:generation.circleError',
  CIRCLE_GENERATION_CANCELLED: 'toast:generation.circleCancelled',

  // Validation errors
  VALIDATION_NAME_REQUIRED: 'toast:validation.nameRequired',
  VALIDATION_FILE_TOO_LARGE: 'toast:validation.fileTooLarge',

  // General operations
  UPDATE_ERROR: 'toast:general.updateError',
  CLASS_CREATE_ERROR: 'toast:class.createError',
  CLASS_NAME_EXISTS: 'toast:class.nameExists',
  CLASS_UPDATE_ERROR: 'toast:class.updateError',
  CLASS_DELETE_SUCCESS: 'toast:class.deleteSuccess',
  CLASS_DELETE_ERROR: 'toast:class.deleteError',
  CLASS_SWITCH_ERROR: 'toast:class.switchError',
  CLASS_SWITCH_UNSAVED: 'toast:class.switchUnsaved',

  // Student operations
  STUDENT_NAME_EMPTY: 'toast:student.nameEmpty',
  STUDENT_NAME_INVALID: 'toast:student.nameInvalid',
  STUDENT_NAME_EXISTS: 'toast:student.nameExists',
  STUDENT_MAX_REACHED: 'toast:student.maxReached',
  STUDENT_ADD_FIRST: 'toast:student.addFirst',

  // CSV operations
  CSV_PARSE_ERROR: 'toast:csv.parseError',
  CSV_READ_ERROR: 'toast:csv.readError',

  // Seating operations
  SEATS_INSUFFICIENT: 'toast:seating.seatsInsufficient',
  SEAT_LOCKED_DROP: 'toast:seating.seatLockedDrop',
  CLASSROOM_NOT_SETUP: 'toast:seating.classroomNotSetup',

  // Plan operations
  PLAN_NONE_TO_SAVE: 'toast:plan.noneToSave',
  PLAN_NONE_YET: 'toast:plan.noneYet',
  PLAN_SAVE_FAILED: 'toast:plan.saveFailed',

  // Data operations
  DATA_DELETED: 'toast:data.deleted',
  DATA_DELETE_ERROR: 'toast:data.deleteError',
  PREFERENCES_RESET: 'toast:data.preferencesReset',
} as const;

export type ToastMessageKey =
  (typeof TOAST_MESSAGES)[keyof typeof TOAST_MESSAGES];

/**
 * Resolves a toast message key to its translated string.
 * Already-translated text is returned unchanged.
 *
 * A key looks like `namespace:some.key` — no whitespace. That second condition
 * matters: German sentences use colons too ("Gefundene Spalten: Name, Klasse"),
 * and i18next would otherwise read everything before the colon as a namespace
 * and return only the remainder of the sentence.
 */
const TRANSLATION_KEY_PATTERN = /^[^\s:]+:[^\s]+$/;

export function getToastMessage(
  messageOrKey: string,
  interpolation?: Record<string, string | number>,
): string {
  if (TRANSLATION_KEY_PATTERN.test(messageOrKey)) {
    return i18n.t(messageOrKey, interpolation);
  }
  // Return as-is for backward compatibility with direct strings
  return messageOrKey;
}

export type ToastType = 'success' | 'error' | 'info' | 'warning' | 'critical';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastOptions {
  duration?: number;
  dismissible?: boolean;
  id?: string;
  action?: ToastAction;
  onDismiss?: () => void;
}

export interface ToastInstance {
  id: string;
  type: ToastType;
  message: string;
  createdAt: number;
  duration: number;
  dismissible: boolean;
  action?: ToastAction;
  onDismiss?: () => void;
}

export type ToastEvent =
  | { action: 'add'; toast: ToastInstance }
  | { action: 'dismiss'; id: string }
  | { action: 'dismissType'; type: ToastType }
  | { action: 'dismissAll' };

export type ToastSubscriber = (event: ToastEvent) => void;

const listeners = new Set<ToastSubscriber>();

/** How many views currently want success messages kept off the screen. */
let successQuietCount = 0;

const DEFAULT_DURATION: Record<ToastType, number> = {
  success: 3000,
  error: 5000,
  info: 4000,
  warning: 4000,
  critical: 0,
};

function emit(event: ToastEvent) {
  listeners.forEach((listener) => {
    listener(event);
  });
}

export function subscribeToToasts(listener: ToastSubscriber): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function showToast(
  type: ToastType,
  message: string,
  options: ToastOptions = {},
): string {
  const id = options.id ?? generateId();
  if (type === 'success' && successQuietCount > 0) {
    return id;
  }
  const duration =
    options.duration ?? DEFAULT_DURATION[type] ?? DEFAULT_DURATION.info;
  const dismissible = options.dismissible ?? true;

  // Resolve translation key to actual message
  const resolvedMessage = getToastMessage(message);

  emit({
    action: 'add',
    toast: {
      id,
      type,
      message: resolvedMessage,
      createdAt: Date.now(),
      duration,
      dismissible,
      action: options.action,
      onDismiss: options.onDismiss,
    },
  });

  return id;
}

export function dismissToast(id: string): void {
  emit({ action: 'dismiss', id });
}

export function dismissAllToasts(): void {
  emit({ action: 'dismissAll' });
}

/**
 * Keeps success messages off the screen until the returned function is
 * called, and takes away the ones showing.
 *
 * The projection is on the wall in front of the class: "Sitzplan …
 * gespeichert" from the save that precedes it was the first thing the room
 * read. Nothing a success message says needs the teacher there; an error
 * still shows, since a plan that did not save is worth knowing about.
 */
export function quietSuccessToasts(): () => void {
  successQuietCount += 1;
  emit({ action: 'dismissType', type: 'success' });
  let released = false;
  return () => {
    if (released) return;
    released = true;
    successQuietCount -= 1;
  };
}
