// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useId,
} from 'react';
import { useTranslation } from 'react-i18next';
import { CheckIcon, SkipForwardIcon, SparkleIcon } from '@phosphor-icons/react';
import Modal from '@/components/ui/modals/Modal';
import {
  cardSurfaceClass,
  inputFieldClass,
  secondaryButtonClass,
  successButtonClass,
} from '@/utils';
import type { Student } from '@/types';

type QuickNameEntryDialogProps = {
  open: boolean;
  students: Student[];
  updateStudent: (id: string, patch: Partial<Student>) => void;
  onClose: () => void;
};

function QuickNameEntryDialog({
  open,
  students,
  updateStudent,
  onClose,
}: QuickNameEntryDialogProps) {
  const { t } = useTranslation('students');
  const [queue, setQueue] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const inputId = useId();

  const studentsWithoutName = useMemo(
    () => students.filter((entry) => entry.name.trim().length === 0),
    [students],
  );

  useEffect(() => {
    if (!open) {
      queueMicrotask(() => {
        setQueue([]);
        setInputValue('');
      });
      return;
    }

    const emptyIds = studentsWithoutName.map((entry) => entry.id);

    if (emptyIds.length === 0) {
      queueMicrotask(() => {
        setQueue([]);
        setInputValue('');
        onClose();
      });
      return;
    }

    queueMicrotask(() => {
      setQueue((previous) => {
        const retained = previous.filter((id) => emptyIds.includes(id));
        const newIds = emptyIds.filter((id) => !retained.includes(id));
        return [...retained, ...newIds];
      });
    });
  }, [open, studentsWithoutName, onClose]);

  const currentStudent = useMemo(() => {
    if (!open || queue.length === 0) {
      return undefined;
    }
    return students.find((entry) => entry.id === queue[0]);
  }, [open, queue, students]);

  useEffect(() => {
    if (!open || !currentStudent) {
      return;
    }
    const trimmedName = currentStudent.name.trim();
    queueMicrotask(() => {
      setInputValue(trimmedName);
    });
    requestAnimationFrame(() => {
      // Focus the field whenever the target student changes
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  }, [open, currentStudent]);

  const remainingCount = queue.length;

  const currentStudentIndex = useMemo(() => {
    if (!currentStudent) {
      return null;
    }
    const index = students.findIndex((entry) => entry.id === currentStudent.id);
    return index >= 0 ? index + 1 : null;
  }, [currentStudent, students]);

  const handleSubmit = useCallback(() => {
    if (!currentStudent) {
      return;
    }
    const trimmed = inputValue.trim();
    if (!trimmed) {
      return;
    }
    updateStudent(currentStudent.id, { name: trimmed });
    setInputValue('');
    setQueue((previous) => previous.slice(1));
  }, [currentStudent, inputValue, updateStudent]);

  const handleSkip = useCallback(() => {
    setQueue((previous) => {
      if (previous.length <= 1) {
        onClose();
        return [];
      }
      const [current, ...rest] = previous;
      return [...rest, current];
    });
  }, [onClose]);

  const handleFormSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      handleSubmit();
    },
    [handleSubmit],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        handleSubmit();
      }
      if (event.key === 'ArrowRight' && event.altKey) {
        event.preventDefault();
        handleSkip();
      }
    },
    [handleSubmit, handleSkip],
  );

  const dialogDescription =
    remainingCount === 1
      ? t('quickEntry.remainingOne', 'Noch 1 Schüler ohne Namen.')
      : t('quickEntry.remainingMultiple', {
          count: remainingCount,
          defaultValue: `Noch ${remainingCount} Schüler ohne Namen.`,
        });

  if (!open) {
    return null;
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('quickEntry.title', 'Schnell-Namenerfassung')}
      subtitle={t(
        'quickEntry.subtitle',
        'Trage fehlende Namen nacheinander ein.',
      )}
      icon={<SparkleIcon className="h-6 w-6" aria-hidden="true" />}
      size="sm"
    >
      {currentStudent ? (
        <form className="space-y-6" onSubmit={handleFormSubmit}>
          <div
            className={`${cardSurfaceClass} border border-blue-200/60 bg-blue-50/70 p-4 text-sm text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/40 dark:text-blue-100`}
          >
            <p className="font-semibold">{dialogDescription}</p>
          </div>
          <div className="space-y-2">
            <label
              htmlFor={inputId}
              className="text-sm font-medium text-gray-800 dark:text-gray-200"
            >
              {currentStudentIndex
                ? t('quickEntry.nameForStudent', {
                    number: currentStudentIndex,
                    defaultValue: `Name für Schüler ${currentStudentIndex}`,
                  })
                : t('quickEntry.enterName', 'Name eintragen')}
            </label>
            <input
              ref={inputRef}
              id={inputId}
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              onKeyDown={handleKeyDown}
              className={`${inputFieldClass} w-full`}
              placeholder={t('quickEntry.enterName', 'Name eintragen')}
              autoComplete="off"
            />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="submit"
              className={`${successButtonClass} order-2 w-full justify-center gap-2 sm:w-auto`}
              disabled={inputValue.trim().length === 0}
              title={t('quickEntry.saveTitle', 'Name speichern (Enter)')}
            >
              <CheckIcon className="h-4 w-4" aria-hidden="true" />
              {t('quickEntry.save', 'Name speichern')}
            </button>
            <button
              type="button"
              onClick={handleSkip}
              className={`${secondaryButtonClass} order-1 w-full justify-center gap-2 sm:w-auto`}
              title={t(
                'quickEntry.skipTitle',
                'Aktuellen Schüler überspringen (Alt/Option+→)',
              )}
            >
              <SkipForwardIcon className="h-4 w-4" aria-hidden="true" />
              {t('quickEntry.skip', 'Überspringen')}
            </button>
          </div>
        </form>
      ) : (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {t('quickEntry.allUpdated', 'Alle Namen wurden aktualisiert.')}
        </div>
      )}
    </Modal>
  );
}

export default React.memo(QuickNameEntryDialog);
