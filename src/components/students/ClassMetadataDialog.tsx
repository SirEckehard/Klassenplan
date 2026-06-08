import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NotePencilIcon } from '@phosphor-icons/react';
import Modal from '@/components/ui/modals/Modal';
import {
  inputFieldClass,
  primaryButtonClass,
  secondaryButtonClass,
  cardSurfaceClass,
} from '@/utils';

export type ClassMetadataFormValues = {
  name: string;
  label?: string;
  notes?: string;
};

type Props = {
  open: boolean;
  mode: 'create' | 'edit';
  initialValues: ClassMetadataFormValues;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (values: ClassMetadataFormValues) => void;
};

const emptyValues: ClassMetadataFormValues = {
  name: '',
  label: '',
  notes: '',
};

export default function ClassMetadataDialog({
  open,
  mode,
  initialValues,
  isSubmitting = false,
  onClose,
  onSubmit,
}: Props) {
  const { t } = useTranslation('students');
  const [formValues, setFormValues] =
    useState<ClassMetadataFormValues>(emptyValues);

  useEffect(() => {
    if (!open) {
      queueMicrotask(() => {
        setFormValues(emptyValues);
      });
      return;
    }
    queueMicrotask(() => {
      setFormValues({
        name: initialValues.name?.trim() ?? '',
        label: initialValues.label ?? '',
        notes: initialValues.notes ?? '',
      });
    });
  }, [open, initialValues]);

  const handleChange =
    (field: keyof ClassMetadataFormValues) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setFormValues((previous) => ({
        ...previous,
        [field]: event.target.value,
      }));
    };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (formValues.name.trim().length === 0 || isSubmitting) {
      return;
    }
    onSubmit({
      ...formValues,
      name: formValues.name.trim(),
      label: formValues.label?.trim() || undefined,
      notes: formValues.notes?.trim() || undefined,
    });
  };

  if (!open) {
    return null;
  }

  const dialogTitle =
    mode === 'create'
      ? t('classDialog.createTitle', 'Neue Klasse erstellen')
      : t('classDialog.editTitle', 'Klasse bearbeiten');
  const dialogSubtitle =
    mode === 'create'
      ? t(
          'classDialog.createSubtitle',
          'Füge einen Namen und optional das Schuljahr und weitere Notizen hinzu.',
        )
      : t('classDialog.editSubtitle', 'Passe Name, Schuljahr oder Notizen an.');

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={dialogTitle}
      subtitle={dialogSubtitle}
      icon={<NotePencilIcon className="h-6 w-6" aria-hidden="true" />}
      size="sm"
    >
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className={cardSurfaceClass}>
          <div className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="class-name"
                className="text-sm font-semibold text-gray-800 dark:text-gray-100"
              >
                {t('classDialog.className', 'Klassenname')} *
              </label>
              <input
                id="class-name"
                className={inputFieldClass}
                value={formValues.name}
                onChange={handleChange('name')}
                placeholder={t(
                  'classDialog.classNamePlaceholder',
                  'z. B. Klasse 7b',
                )}
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="class-label"
                className="text-sm font-semibold text-gray-800 dark:text-gray-100"
              >
                {t('classDialog.schoolYear', 'Schuljahr / Label')}
                <span className="ml-1 text-xs font-normal text-gray-500 dark:text-gray-400">
                  ({t('common.optional', 'optional')})
                </span>
              </label>
              <input
                id="class-label"
                className={inputFieldClass}
                value={formValues.label}
                onChange={handleChange('label')}
                placeholder={t(
                  'classDialog.schoolYearPlaceholder',
                  'z. B. 2025/26',
                )}
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="class-notes"
                className="text-sm font-semibold text-gray-800 dark:text-gray-100"
              >
                {t('classDialog.notes', 'Notizen')}
                <span className="ml-1 text-xs font-normal text-gray-500 dark:text-gray-400">
                  ({t('common.optional', 'optional')})
                </span>
              </label>
              <textarea
                id="class-notes"
                className={`${inputFieldClass} min-h-24`}
                value={formValues.notes}
                onChange={handleChange('notes')}
                placeholder={t(
                  'classDialog.notesPlaceholder',
                  'Besonderheiten, Schwerpunkt, etc.',
                )}
              />
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className={`${secondaryButtonClass} w-full justify-center gap-2 sm:w-auto`}
            disabled={isSubmitting}
          >
            {t('common.cancel', 'Abbrechen')}
          </button>
          <button
            type="submit"
            className={`${primaryButtonClass} w-full justify-center gap-2 sm:w-auto`}
            disabled={formValues.name.trim().length === 0 || isSubmitting}
          >
            {mode === 'create'
              ? t('classDialog.createButton', 'Klasse anlegen')
              : t('common.save', 'Speichern')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
