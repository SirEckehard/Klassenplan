// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import ClassMetadataDialog, {
  type ClassMetadataFormValues,
} from '@/components/students/ClassMetadataDialog';
import ConfirmDialog from '@/components/ui/modals/ConfirmDialog';
import { useClassManagementContext } from '@/contexts/seatingPlan/ClassManagementContext';

/**
 * Creating and deleting a class — the dialogs, in one place. A class is
 * renamed where it is read: in its inspector, in "Bibliothek" and in the
 * header's class menu.
 *
 * Two very different spots ask for them: the class menu in the header, which is
 * where a teacher with classes works, and the empty state of the class layer,
 * which is the first screen of all. Keeping one copy of the dialogs here means
 * the empty state can offer "create a class" without owning a second dialog
 * whose state could drift from the header's.
 */
type ClassDialogsContextValue = {
  openCreate: () => void;
  requestDelete: (classId: string) => void;
  /** True while a class action is being written to the repository. */
  isBusy: boolean;
};

const ClassDialogsContext =
  React.createContext<ClassDialogsContextValue | null>(null);

const defaultValues: ClassMetadataFormValues = {
  name: '',
  label: '',
  notes: '',
};

export function ClassDialogsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = useTranslation('generator');
  const { classSummaries, activeClass, createClass, deleteClass } =
    useClassManagementContext();

  const [createOpen, setCreateOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<string | null>(null);
  const [isBusy, setIsBusy] = React.useState(false);

  const run = React.useCallback(async (handler: () => Promise<boolean>) => {
    setIsBusy(true);
    try {
      return await handler();
    } finally {
      setIsBusy(false);
    }
  }, []);

  const openCreate = React.useCallback(() => setCreateOpen(true), []);

  const handleSubmit = React.useCallback(
    async (values: ClassMetadataFormValues) => {
      const ok = await run(() => createClass(values, { activate: true }));
      if (ok) setCreateOpen(false);
    },
    [createClass, run],
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
      openCreate,
      requestDelete: setDeleteTarget,
      isBusy,
    }),
    [isBusy, openCreate],
  );

  return (
    <ClassDialogsContext.Provider value={value}>
      {children}
      <ClassMetadataDialog
        open={createOpen}
        mode="create"
        initialValues={defaultValues}
        isSubmitting={isBusy}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleSubmit}
      />
      <ConfirmDialog
        open={deleteTarget !== null}
        title={t('classActions.deleteDialog.title')}
        message={t('classActions.deleteDialog.message', {
          className: deleteLabel,
        })}
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
  openCreate: noop,
  requestDelete: noop,
  isBusy: false,
};
