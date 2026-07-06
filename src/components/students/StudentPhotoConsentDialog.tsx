// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CameraIcon,
  ShieldCheckIcon,
  UsersThreeIcon,
} from '@phosphor-icons/react';
import Modal from '@/components/ui/modals/Modal';
import {
  cardSurfaceClass,
  primaryButtonClass,
  secondaryButtonClass,
} from '@/utils';

type Props = {
  open: boolean;
  /** Called when the user proceeds; `dontShowAgain` mirrors the checkbox. */
  onConfirm: (dontShowAgain: boolean) => void;
  onCancel: () => void;
};

/**
 * Privacy/consent notice shown before a student photo is picked.
 *
 * Explains that photos never leave the device and that the school
 * administration, students and parents must consent to their use. The notice
 * reappears before every upload until the user actively ticks the
 * "don't show again" checkbox once.
 */
export default function StudentPhotoConsentDialog({
  open,
  onConfirm,
  onCancel,
}: Props) {
  const { t } = useTranslation('students');
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  // Auto-focus the confirm button for keyboard users (same as ConfirmDialog).
  useEffect(() => {
    if (open) {
      confirmButtonRef.current?.focus();
    }
  }, [open]);

  // Reset the checkbox on close so a later open starts unchecked again.
  const handleCancel = () => {
    setDontShowAgain(false);
    onCancel();
  };

  const handleConfirm = () => {
    setDontShowAgain(false);
    onConfirm(dontShowAgain);
  };

  return (
    <Modal
      open={open}
      onClose={handleCancel}
      title={t('photo.consent.title', 'Hinweis zu Schülerfotos')}
      icon={<CameraIcon size={24} aria-hidden="true" />}
      size="sm"
    >
      <div
        className={`${cardSurfaceClass} space-y-3 p-4 text-sm text-gray-700 shadow-sm dark:text-gray-200`}
      >
        <p className="flex items-start gap-2">
          <ShieldCheckIcon
            size={18}
            aria-hidden="true"
            className="mt-0.5 shrink-0 text-green-600 dark:text-green-400"
          />
          {t(
            'photo.consent.local',
            'Fotos werden ausschließlich lokal auf diesem Gerät gespeichert und niemals übertragen.',
          )}
        </p>
        <p className="flex items-start gap-2">
          <UsersThreeIcon
            size={18}
            aria-hidden="true"
            className="mt-0.5 shrink-0 text-blue-600 dark:text-blue-400"
          />
          {t(
            'photo.consent.permission',
            'Für die Nutzung von Schülerfotos benötigst du das Einverständnis der Schulleitung sowie der betroffenen Schüler und ihrer Eltern.',
          )}
        </p>
      </div>

      <label className="flex cursor-pointer items-start gap-2 text-sm text-gray-700 dark:text-gray-200">
        <input
          type="checkbox"
          checked={dontShowAgain}
          onChange={(e) => setDontShowAgain(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-blue-600"
        />
        {t(
          'photo.consent.dontShowAgain',
          'Verstanden – diesen Hinweis nicht mehr anzeigen',
        )}
      </label>

      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={handleCancel}
          className={secondaryButtonClass}
        >
          {t('photo.consent.cancel', 'Abbrechen')}
        </button>
        <button
          ref={confirmButtonRef}
          type="button"
          onClick={handleConfirm}
          className={primaryButtonClass}
        >
          {t('photo.consent.confirm', 'Fortfahren')}
        </button>
      </div>
    </Modal>
  );
}
