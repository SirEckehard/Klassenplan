import { generateId } from '@/utils';
import i18n from '@/i18n';

/**
 * Toast message keys that map to i18n translation keys.
 * Use with getToastMessage() to get the translated string.
 */
export const TOAST_MESSAGES = {
  // Save operations
  SAVE_SUCCESS: 'toast:save.success',
  SAVE_ERROR: 'toast:save.error',
  SAVE_TEMPLATE_SUCCESS: 'toast:save.templateSuccess',
  SAVE_TEMPLATE_ERROR: 'toast:save.templateError',

  // Load operations
  LOAD_SUCCESS: 'toast:load.success',
  LOAD_ERROR: 'toast:load.error',
  LOAD_TEMPLATE_SUCCESS: 'toast:load.templateSuccess',
  LOAD_TEMPLATE_ERROR: 'toast:load.templateError',

  // Delete operations
  DELETE_SUCCESS: 'toast:delete.success',
  DELETE_ERROR: 'toast:delete.error',
  DELETE_TEMPLATE_SUCCESS: 'toast:delete.templateSuccess',
  DELETE_TEMPLATE_ERROR: 'toast:delete.templateError',

  // Template operations
  TEMPLATE_NAME_EMPTY: 'toast:template.nameEmpty',
  TEMPLATE_NAME_INVALID: 'toast:template.nameInvalid',
  TEMPLATE_NAME_EXISTS: 'toast:template.nameExists',
  TEMPLATE_RENAME_SUCCESS: 'toast:template.renameSuccess',
  TEMPLATE_RENAME_ERROR: 'toast:template.renameError',
  TEMPLATE_UPDATE_SUCCESS: 'toast:template.updateSuccess',
  TEMPLATE_UPDATE_ERROR: 'toast:template.updateError',

  // Export operations
  EXPORT_SUCCESS: 'toast:export.success',
  EXPORT_ERROR: 'toast:export.error',
  EXPORT_PDF_SUCCESS: 'toast:export.pdfSuccess',
  EXPORT_PDF_ERROR: 'toast:export.pdfError',

  // Import operations
  IMPORT_SUCCESS: 'toast:import.success',
  IMPORT_ERROR: 'toast:import.error',
  IMPORT_INVALID_FORMAT: 'toast:import.invalidFormat',

  // Backup operations
  BACKUP_CREATE_SUCCESS: 'toast:backup.createSuccess',
  BACKUP_CREATE_ERROR: 'toast:backup.createError',
  BACKUP_RESTORE_SUCCESS: 'toast:backup.restoreSuccess',
  BACKUP_RESTORE_ERROR: 'toast:backup.restoreError',
  BACKUP_EXPORTED: 'toast:backup.exported',
  BACKUP_WEB_CRYPTO_EXPORT_ERROR: 'toast:backup.webCryptoExportError',
  BACKUP_WEB_CRYPTO_IMPORT_ERROR: 'toast:backup.webCryptoImportError',
  BACKUP_DECRYPT_FAILED: 'toast:backup.decryptFailed',
  BACKUP_IMPORT_SUCCESS: 'toast:backup.importSuccess',

  // Generation operations
  GENERATION_SUCCESS: 'toast:generation.success',
  GENERATION_ERROR: 'toast:generation.error',
  GENERATION_NO_STUDENTS: 'toast:generation.noStudents',
  GENERATION_NO_SEATS: 'toast:generation.noSeats',
  GENERATION_INSUFFICIENT_SEATS: 'toast:generation.insufficientSeats',
  CIRCLE_GENERATION_ERROR: 'toast:generation.circleError',
  CIRCLE_GENERATION_CANCELLED: 'toast:generation.circleCancelled',

  // Validation errors
  VALIDATION_NAME_REQUIRED: 'toast:validation.nameRequired',
  VALIDATION_PASSWORD_REQUIRED: 'toast:validation.passwordRequired',
  VALIDATION_FILE_TOO_LARGE: 'toast:validation.fileTooLarge',
  VALIDATION_INVALID_FILE: 'toast:validation.invalidFile',

  // General operations
  COPY_SUCCESS: 'toast:general.copySuccess',
  COPY_ERROR: 'toast:general.copyError',
  UPDATE_SUCCESS: 'toast:general.updateSuccess',
  UPDATE_ERROR: 'toast:general.updateError',
  CLASS_CREATE_SUCCESS: 'toast:class.createSuccess',
  CLASS_CREATE_ERROR: 'toast:class.createError',
  CLASS_NAME_EXISTS: 'toast:class.nameExists',
  CLASS_UPDATE_SUCCESS: 'toast:class.updateSuccess',
  CLASS_UPDATE_ERROR: 'toast:class.updateError',
  CLASS_DUPLICATE_SUCCESS: 'toast:class.duplicateSuccess',
  CLASS_DUPLICATE_ERROR: 'toast:class.duplicateError',
  CLASS_DELETE_SUCCESS: 'toast:class.deleteSuccess',
  CLASS_DELETE_ERROR: 'toast:class.deleteError',
  CLASS_SWITCH_SUCCESS: 'toast:class.switchSuccess',
  CLASS_SWITCH_ERROR: 'toast:class.switchError',
  CLASS_SWITCH_UNSAVED: 'toast:class.switchUnsaved',

  // Network/Connection
  NETWORK_ERROR: 'toast:network.error',
  CONNECTION_ERROR: 'toast:network.connectionError',
  TIMEOUT_ERROR: 'toast:network.timeout',

  // Student operations
  STUDENT_NAME_EMPTY: 'toast:student.nameEmpty',
  STUDENT_NAME_INVALID: 'toast:student.nameInvalid',
  STUDENT_NAME_EXISTS: 'toast:student.nameExists',
  STUDENT_MAX_REACHED: 'toast:student.maxReached',
  STUDENT_GENDER_REQUIRED: 'toast:student.genderRequired',
  STUDENT_ADD_FIRST: 'toast:student.addFirst',
  STUDENT_INCOMPLETE_DATA: 'toast:student.incompleteData',
  STUDENT_MISSING_NAMES: 'toast:student.missingNames',
  STUDENT_MISSING_GENDER: 'toast:student.missingGender',
  STUDENT_MISSING_NAMES_AND_GENDER: 'toast:student.missingNamesAndGender',

  // CSV operations
  CSV_INVALID_FILE: 'toast:csv.invalidFile',
  CSV_PARSE_ERROR: 'toast:csv.parseError',
  CSV_READ_ERROR: 'toast:csv.readError',
  CSV_LONG_NAMES_IMPORTED: 'toast:csv.longNamesImported',

  // Seating operations
  SEATS_INSUFFICIENT: 'toast:seating.seatsInsufficient',
  SEAT_LOCKED_DROP: 'toast:seating.seatLockedDrop',
  CLASSROOM_NOT_SETUP: 'toast:seating.classroomNotSetup',

  // Plan operations
  PLAN_NAME_CHANGE_ERROR: 'toast:plan.nameChangeError',
  PLAN_NONE_TO_SAVE: 'toast:plan.noneToSave',
  PLAN_SAVE_FAILED: 'toast:plan.saveFailed',

  // Mix operations
  MIX_DELETED: 'toast:mix.deleted',
  MIX_NONE_AVAILABLE: 'toast:mix.noneAvailable',

  // Data operations
  DATA_DELETED: 'toast:data.deleted',
  DATA_DELETE_ERROR: 'toast:data.deleteError',
  PREFERENCES_RESET: 'toast:data.preferencesReset',
} as const;

export type ToastMessageKey =
  (typeof TOAST_MESSAGES)[keyof typeof TOAST_MESSAGES];

/**
 * Resolves a toast message key to its translated string.
 * If the message is not a translation key (doesn't contain ':'), it's returned as-is.
 * This allows backward compatibility with direct string messages.
 */
export function getToastMessage(
  messageOrKey: string,
  interpolation?: Record<string, string | number>,
): string {
  // Check if it's a translation key (contains namespace separator)
  if (messageOrKey.includes(':')) {
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
  | { action: 'dismissAll' };

export type ToastSubscriber = (event: ToastEvent) => void;

const listeners = new Set<ToastSubscriber>();

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
