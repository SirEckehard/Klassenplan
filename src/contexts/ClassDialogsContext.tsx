// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import ConfirmDialog from '@/components/ui/modals/ConfirmDialog';
import type { ConfirmFact } from '@/components/ui/modals/ConfirmDialog';
import { classFacts } from '@/components/ui/modals/confirmFacts';
import { ENTITY_ICONS } from '@/components/shell/entityIcons';
import { useClassManagementContext } from '@/contexts/seatingPlan/ClassManagementContext';
import { useSeatingPlanActions } from '@/contexts/SeatingPlanContext';
import { useSeatingRepository } from '@/hooks/useSeatingRepository';
import { logError } from '@/utils';

/**
 * Creating and deleting a class, in one place.
 *
 * A class is named before it is made, where it is asked for — a row of the
 * header's class menu, the first screen's card, "Bibliothek" — and renamed
 * where it is read. What those places share is here: the creation with its
 * busy state, which keeps the header's button from switching classes while
 * one is being written, and the question before a class goes, a dialog of
 * its own.
 */
type ClassDialogsContextValue = {
  /**
   * Makes a class of that name — opening it unless `activate` is false —
   * and resolves with its id, or null when it was not made (the reason has
   * been said).
   */
  create: (
    name: string,
    options?: { activate?: boolean },
  ) => Promise<string | null>;
  requestDelete: (classId: string) => void;
  /** True while a class action is being written to the repository. */
  isBusy: boolean;
};

const ClassDialogsContext =
  React.createContext<ClassDialogsContextValue | null>(null);

export function ClassDialogsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = useTranslation('generator');
  const { classSummaries, activeClass, createClass, deleteClass } =
    useClassManagementContext();

  const { handleExportAll } = useSeatingPlanActions();
  const repository = useSeatingRepository();

  const [deleteTarget, setDeleteTarget] = React.useState<string | null>(null);
  // What goes with it; the question comes once that has been counted.
  const [deleteFacts, setDeleteFacts] = React.useState<ConfirmFact[] | null>(
    null,
  );
  const [isBusy, setIsBusy] = React.useState(false);

  const run = React.useCallback(async <T,>(handler: () => Promise<T>) => {
    setIsBusy(true);
    try {
      return await handler();
    } finally {
      setIsBusy(false);
    }
  }, []);

  const create = React.useCallback(
    (name: string, options?: { activate?: boolean }) =>
      run(() => createClass({ name }, { activate: options?.activate ?? true })),
    [createClass, run],
  );

  const requestDelete = React.useCallback(
    (classId: string) => {
      setDeleteFacts(null);
      setDeleteTarget(classId);
      repository
        .loadClassRecord(classId)
        .then((result) => {
          setDeleteFacts(result.success ? classFacts(result.data) : []);
        })
        .catch((error: unknown) => {
          logError('Failed to count a class', { error }, 'ClassDialogs');
          setDeleteFacts([]);
        });
    },
    [repository],
  );

  const handleDeleteConfirmed = React.useCallback(async () => {
    if (!deleteTarget) {
      setDeleteTarget(null);
      return;
    }
    const ok = await run(() => deleteClass(deleteTarget));
    if (ok) setDeleteTarget(null);
  }, [deleteClass, deleteTarget, run]);

  const deleteLabel = React.useMemo(() => {
    const target =
      classSummaries.find((entry) => entry.id === deleteTarget) ??
      (deleteTarget === activeClass.id ? activeClass : null);
    const name = target?.name?.trim();
    return name
      ? t('common:quoted', { text: name })
      : t('classActions.deleteDialog.fallbackName');
  }, [activeClass, classSummaries, deleteTarget, t]);

  const value = React.useMemo(
    () => ({
      create,
      requestDelete,
      isBusy,
    }),
    [create, requestDelete, isBusy],
  );

  return (
    <ClassDialogsContext.Provider value={value}>
      {children}
      <ConfirmDialog
        open={deleteTarget !== null && deleteFacts !== null}
        icon={ENTITY_ICONS.class}
        title={t('classActions.deleteDialog.title', {
          className: deleteLabel,
        })}
        meta={t('shell.layers.class')}
        facts={deleteFacts ?? []}
        message={t('common.cannotUndo')}
        way={{
          label: t('common:dialogs.backupFirst'),
          onSelect: () => {
            setDeleteTarget(null);
            handleExportAll().catch((error: unknown) => {
              logError('Backup export failed', { error }, 'ClassDialogs');
            });
          },
        }}
        confirmLabel={t('classActions.deleteDialog.confirmLabel')}
        cancelLabel={t('classActions.deleteDialog.cancelLabel')}
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setDeleteTarget(null)}
      />
    </ClassDialogsContext.Provider>
  );
}

/**
 * The class dialogs. Returns inert handlers outside the provider so a view can
 * be rendered on its own in a test.
 */
export function useClassDialogs(): ClassDialogsContextValue {
  return React.useContext(ClassDialogsContext) ?? FALLBACK;
}

const noop = () => {};
const FALLBACK: ClassDialogsContextValue = {
  create: () => Promise.resolve(null),
  requestDelete: noop,
  isBusy: false,
};
