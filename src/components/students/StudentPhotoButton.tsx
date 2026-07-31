// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CameraIcon, XIcon, SpinnerGapIcon } from '@phosphor-icons/react';
import type { Student } from '@/types';
import { useIsDarkMode } from '@/hooks/useIsDarkMode';
import {
  useStudentPhoto,
  getStudentPhoto,
  saveStudentPhoto,
  removeStudentPhoto,
} from '@/hooks/student/useStudentPhoto';
import {
  loadImageBitmapFromBlob,
  loadImageBitmapFromFile,
  StudentPhotoError,
  STUDENT_PHOTO_ERRORS,
} from '@/utils/image/processStudentPhoto';
import StudentPhotoCropModal from './StudentPhotoCropModal';
import StudentPhotoConsentDialog from './StudentPhotoConsentDialog';
import { confirmDialog } from '@/services/ui/dialogs';
import { getStudentAppearance } from '@/utils/ui/studentAppearance';
import { logError, withBrowserLocalStorage } from '@/utils';
import { LOCAL_STORAGE_KEYS } from '@/utils/data/storageKeys';
import { showToast } from '@/utils/ui/toast';

type Props = {
  student: Student;
  updateStudent: (id: string, patch: Partial<Student>) => void;
};

/**
 * Whether the user permanently acknowledged the photo consent notice. Read
 * from localStorage on every click (not component state) so ticking the
 * checkbox in one row immediately applies to all other rows.
 */
function isPhotoConsentConfirmed(): boolean {
  return (
    withBrowserLocalStorage(
      (storage) =>
        storage.getItem(LOCAL_STORAGE_KEYS.photoConsentConfirmed) === 'true',
      false,
    ) ?? false
  );
}

function persistPhotoConsent(): void {
  withBrowserLocalStorage((storage) => {
    storage.setItem(LOCAL_STORAGE_KEYS.photoConsentConfirmed, 'true');
  });
}

/**
 * Round avatar + upload control for an optional student photo.
 *
 * Without a photo it shows the student's initial on a gender-tinted background;
 * with a photo it shows the image and a small remove button. Photos are
 * processed (square crop, 160px JPEG) and stored locally only — they never
 * leave the device.
 */
function StudentPhotoButton({ student, updateStudent }: Props) {
  const { t } = useTranslation('students');
  const isDark = useIsDarkMode();
  const inputRef = useRef<HTMLInputElement>(null);
  const nextEditorId = useRef(0);
  const [busy, setBusy] = useState(false);
  // `id` bumps per picked image so the crop modal remounts (fresh framing).
  const [editor, setEditor] = useState<{
    bitmap: ImageBitmap;
    id: number;
  } | null>(null);
  const [showConsentDialog, setShowConsentDialog] = useState(false);

  const { objectUrl } = useStudentPhoto(student.id, student.hasPhoto);
  const appearance = getStudentAppearance(student, isDark);

  // Release the decoded source image if the row unmounts while editing.
  const editorBitmapRef = useRef<ImageBitmap | null>(null);
  useEffect(() => {
    editorBitmapRef.current = editor?.bitmap ?? null;
  }, [editor]);
  useEffect(() => () => editorBitmapRef.current?.close(), []);

  const closeEditor = useCallback(() => {
    setEditor((current) => {
      current?.bitmap.close();
      return null;
    });
  }, []);

  const privacyHint = t(
    'photo.privacyHint',
    'Fotos werden ausschließlich lokal auf diesem Gerät gespeichert und nie übertragen.',
  );
  const uploadLabel = student.hasPhoto
    ? t('photo.change', 'Foto ändern')
    : t('photo.add', 'Foto hinzufügen');

  // Swap the decoded image into the editor, releasing a previously open one
  // (e.g. when "replace image" picks a new file while the editor is open).
  const openEditor = useCallback((bitmap: ImageBitmap) => {
    const id = nextEditorId.current++;
    setEditor((current) => {
      current?.bitmap.close();
      return { bitmap, id };
    });
  }, []);

  // The consent notice gates the file picker until it is permanently
  // acknowledged; the "continue" click still counts as a user gesture, so
  // opening the picker from the dialog is allowed by the browser.
  const openFilePicker = () => {
    if (isPhotoConsentConfirmed()) {
      inputRef.current?.click();
      return;
    }
    setShowConsentDialog(true);
  };

  // Re-open the crop editor for the stored photo. Falls back to the file
  // picker when the blob is missing (stale `hasPhoto`) or cannot be decoded.
  const openEditorForStoredPhoto = async () => {
    setBusy(true);
    try {
      const stored = await getStudentPhoto(student.id);
      if (!stored.success || !stored.data) {
        openFilePicker();
        return;
      }
      openEditor(await loadImageBitmapFromBlob(stored.data));
    } catch (error) {
      showToast('error', STUDENT_PHOTO_ERRORS.decodeFailed);
      logError(
        'Student photo edit failed',
        { error, studentId: student.id },
        'StudentPhotoButton',
      );
      openFilePicker();
    } finally {
      setBusy(false);
    }
  };

  const handleAvatarClick = () => {
    if (student.hasPhoto) {
      void openEditorForStoredPhoto();
      return;
    }
    openFilePicker();
  };

  const handleConsentConfirm = (dontShowAgain: boolean) => {
    if (dontShowAgain) {
      persistPhotoConsent();
    }
    setShowConsentDialog(false);
    inputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setBusy(true);
    try {
      // Decode then hand off to the crop editor; saving happens on "apply".
      openEditor(await loadImageBitmapFromFile(file));
    } catch (error) {
      const message =
        error instanceof StudentPhotoError
          ? error.message
          : STUDENT_PHOTO_ERRORS.decodeFailed;
      showToast('error', message);
      logError(
        'Student photo upload failed',
        { error, studentId: student.id },
        'StudentPhotoButton',
      );
    } finally {
      setBusy(false);
    }
  };

  const handleEditorApply = async (blob: Blob) => {
    try {
      await saveStudentPhoto(student.id, blob);
      updateStudent(student.id, { hasPhoto: true });
    } catch (error) {
      logError(
        'Student photo save failed',
        { error, studentId: student.id },
        'StudentPhotoButton',
      );
    } finally {
      closeEditor();
    }
  };

  const handleRemove = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const name = student.name.trim();
    const confirmed = await confirmDialog(
      name
        ? t(
            'photo.removeConfirmNamed',
            'Foto von {{name}} wirklich entfernen?',
            {
              name,
            },
          )
        : t('photo.removeConfirm', 'Dieses Foto wirklich entfernen?'),
      { confirmLabel: t('photo.remove', 'Foto entfernen') },
    );
    if (!confirmed) return;
    try {
      await removeStudentPhoto(student.id);
      updateStudent(student.id, { hasPhoto: false });
    } catch (error) {
      logError(
        'Student photo removal failed',
        { error, studentId: student.id },
        'StudentPhotoButton',
      );
    }
  };

  const initial = student.name.trim().charAt(0).toUpperCase();

  return (
    <>
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={handleAvatarClick}
          disabled={busy}
          title={`${uploadLabel} – ${privacyHint}`}
          aria-label={`${uploadLabel} – ${student.name || ''}`.trim()}
          className="group relative flex h-10 w-10 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-gray-300 bg-white transition hover:border-blue-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-800"
          style={
            objectUrl
              ? undefined
              : {
                  backgroundColor: appearance.fill,
                  borderColor: appearance.stroke,
                }
          }
        >
          {objectUrl ? (
            <img
              src={objectUrl}
              alt=""
              className="h-full w-full object-cover"
              draggable={false}
            />
          ) : initial ? (
            <span
              className="text-sm font-semibold"
              style={{ color: appearance.text }}
            >
              {initial}
            </span>
          ) : (
            <CameraIcon
              size={16}
              className="text-gray-400 dark:text-gray-500"
            />
          )}

          {busy ? (
            <span className="absolute inset-0 flex items-center justify-center bg-white/70 dark:bg-gray-900/70">
              <SpinnerGapIcon
                size={16}
                className="animate-spin text-blue-600"
              />
            </span>
          ) : (
            /* Camera badge: permanently visible while no photo exists (upload
               affordance), hover-only once a photo is set so it stays clear. */
            <span
              className={`absolute inset-x-0 bottom-0 items-center justify-center bg-black/45 py-0.5 ${
                objectUrl ? 'hidden group-hover:flex' : 'flex'
              }`}
            >
              <CameraIcon size={11} className="text-white" />
            </span>
          )}
        </button>

        {student.hasPhoto && !busy && (
          <button
            type="button"
            onClick={handleRemove}
            title={t('photo.remove', 'Foto entfernen')}
            aria-label={t('photo.remove', 'Foto entfernen')}
            className="absolute -right-1 -top-1 flex h-4 w-4 cursor-pointer items-center justify-center rounded-full border border-white bg-rose-500 text-white shadow-sm transition hover:bg-rose-600 dark:border-gray-800"
          >
            <XIcon size={9} weight="bold" />
          </button>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      <StudentPhotoConsentDialog
        open={showConsentDialog}
        onConfirm={handleConsentConfirm}
        onCancel={() => setShowConsentDialog(false)}
      />

      <StudentPhotoCropModal
        key={editor?.id ?? 'idle'}
        open={editor !== null}
        bitmap={editor?.bitmap ?? null}
        onApply={handleEditorApply}
        onCancel={closeEditor}
        onReplace={() => inputRef.current?.click()}
      />
    </>
  );
}

export default React.memo(StudentPhotoButton);
