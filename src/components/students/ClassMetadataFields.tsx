// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useTranslation } from 'react-i18next';
import NameField from '@/components/shell/NameField';
import type { UpdateClassMetadataPayload } from '@/types';
import { checkName, MAX_NAME_LENGTH, MAX_NOTE_LENGTH } from '@/utils';

/**
 * A class's name, school year and notes, changed where they are read — in
 * the class layer's inspector and in "Bibliothek" alike. Each field keeps its
 * value when it is left (the name also on Enter); a name another class
 * carries is refused under the field as it is typed, and the school year and
 * the notes may be emptied.
 */
export default function ClassMetadataFields({
  name,
  label,
  notes,
  otherNames,
  onCommit,
  focusRequest,
}: {
  name: string;
  label?: string;
  notes?: string;
  /** The names of the other classes, which this one may not take. */
  otherNames: string[];
  /** Writes one change; resolves with whether it was kept. */
  onCommit: (patch: UpdateClassMetadataPayload) => Promise<boolean>;
  /** Counts up whenever the name is asked for (F2), to take the focus. */
  focusRequest?: number;
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
        label={t('classPanel.name')}
        value={name}
        problemFor={(draft) => checkName(draft, otherNames, MAX_NAME_LENGTH)}
        onCommit={(next) => commit({ name: next })}
        takenMessage={t('classPanel.nameTaken')}
        focusRequest={focusRequest}
      />
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
