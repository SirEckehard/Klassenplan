// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useTranslation } from 'react-i18next';
import { GraduationCapIcon } from '@phosphor-icons/react';
import {
  InspectorBody,
  InspectorDeleteFooter,
  InspectorHeader,
  InspectorMediaTile,
  InspectorSection,
} from '@/components/shell/InspectorPanel';
import ClassMetadataFields from '@/components/students/ClassMetadataFields';
import type { UpdateClassMetadataPayload } from '@/types';
import { formatStoredDate } from '@/utils';
import { ValueRow } from './panelParts';

/**
 * A class: what it is called and what it holds — in "Bibliothek", and in the
 * class layer's inspector while no student is open there. Its school year is
 * the header's subtitle. Name, school year and notes are changed in the panel
 * itself, and the class goes with everything in it only after the question
 * the delete asks.
 */
export default function ClassPanel({
  name,
  label,
  notes,
  studentCount,
  roomCount,
  planCount,
  lastUsedAt,
  otherNames,
  onCommit,
  onDelete,
  renameRequest,
}: {
  name: string;
  label?: string;
  notes?: string;
  studentCount: number;
  roomCount: number;
  planCount: number;
  lastUsedAt?: string;
  /** The names of the other classes, which this one may not take. */
  otherNames: string[];
  onCommit: (patch: UpdateClassMetadataPayload) => Promise<boolean>;
  onDelete: () => void;
  /** Counts up whenever the name is asked for (F2), to take the focus. */
  renameRequest?: number;
}) {
  const { t } = useTranslation('generator');

  return (
    <>
      <InspectorHeader
        media={<InspectorMediaTile icon={GraduationCapIcon} />}
        title={name}
        subtitle={label || undefined}
      />
      <InspectorBody>
        <InspectorSection title={t('library.class.section')}>
          <ClassMetadataFields
            name={name}
            label={label}
            notes={notes}
            otherNames={otherNames}
            onCommit={onCommit}
            focusRequest={renameRequest}
          />
        </InspectorSection>
        <InspectorSection title={t('library.contents')}>
          <ValueRow label={t('library.class.students')}>
            {studentCount}
          </ValueRow>
          <ValueRow label={t('library.rooms')}>{roomCount}</ValueRow>
          <ValueRow label={t('library.class.plans')}>{planCount}</ValueRow>
          {lastUsedAt && (
            <ValueRow label={t('library.class.lastUsed')}>
              {formatStoredDate(lastUsedAt.slice(0, 10))}
            </ValueRow>
          )}
        </InspectorSection>
      </InspectorBody>
      <InspectorDeleteFooter
        label={t('library.class.delete')}
        onDelete={onDelete}
      />
    </>
  );
}
