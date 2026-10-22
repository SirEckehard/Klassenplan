// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useTranslation } from 'react-i18next';
import NameField from '@/components/shell/NameField';
import type { UpdateClassMetadataPayload } from '@/types';
import { MAX_NOTE_LENGTH } from '@/utils';

/**
 * A class's school year and notes, changed where they are read — in the
 * class layer's inspector and in "Bibliothek" alike; its name is changed in
 * the panel's header (`ClassPanel`). Each field keeps its value when it is
 * left, and either may be emptied.
 */
export default function ClassMetadataFields({
  label,
  notes,
  onCommit,
}: {
  label?: string;
  notes?: string;
  /** Writes one change; resolves with whether it was kept. */
  onCommit: (patch: UpdateClassMetadataPayload) => Promise<boolean>;
}) {
  const { t } = useTranslation('generator');
  // A refusal the field could not foresee is said by a toast; the field
  // keeps what was typed.
  const commit = async (patch: UpdateClassMetadataPayload) => {
    await onCommit(patch);
    return null;
  };

  return (
    <>
      <NameField
        label={t('classPanel.schoolYear')}
        value={label ?? ''}
        placeholder={t('classPanel.schoolYearPlaceholder')}
        optional
        onCommit={(next) => commit({ label: next })}
      />
      <NameField
        label={t('classPanel.notes')}
        value={notes ?? ''}
        placeholder={t('classPanel.notesPlaceholder')}
        optional
        multiline
        maxLength={MAX_NOTE_LENGTH}
        onCommit={(next) => commit({ notes: next })}
      />
    </>
  );
}
