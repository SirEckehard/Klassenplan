// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useTranslation } from 'react-i18next';
import { GraduationCapIcon, PencilLineIcon } from '@phosphor-icons/react';
import {
  InspectorActionRow,
  InspectorBody,
  InspectorDeleteFooter,
  InspectorHeader,
  InspectorMediaTile,
  InspectorSection,
} from '@/components/shell/InspectorPanel';
import type { LibraryClass } from '@/hooks/library/useClassLibrary';
import { formatStoredDate } from '@/utils';
import { ValueRow } from './panelParts';

/**
 * A class in "Bibliothek": what it is called and what it holds. Its school
 * year is the header's subtitle and not repeated in a row. Its name,
 * school year and notes are changed in the class dialog the header's class
 * menu opens too — one form for them, with its checks — and the class goes
 * with everything in it only after the question that dialog asks.
 */
export default function ClassPanel({
  library,
  onEdit,
  onDelete,
}: {
  library: LibraryClass;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation('generator');

  return (
    <>
      <InspectorHeader
        media={<InspectorMediaTile icon={GraduationCapIcon} />}
        title={library.name}
        subtitle={library.label || undefined}
      />
      <InspectorBody>
        <InspectorSection title={t('library.class.section')}>
          {library.notes && (
            <p className="text-control leading-relaxed whitespace-pre-line text-(--text-page)">
              {library.notes}
            </p>
          )}
          <InspectorActionRow
            icon={PencilLineIcon}
            label={t('library.class.edit')}
            title={t('library.renameShortcut')}
            onClick={onEdit}
          />
        </InspectorSection>
        <InspectorSection title={t('library.contents')}>
          <ValueRow label={t('library.class.students')}>
            {library.students.length}
          </ValueRow>
          <ValueRow label={t('library.rooms')}>{library.rooms.length}</ValueRow>
          <ValueRow label={t('library.class.plans')}>
            {library.plans.length}
          </ValueRow>
          {library.lastUsedAt && (
            <ValueRow label={t('library.class.lastUsed')}>
              {formatStoredDate(library.lastUsedAt.slice(0, 10))}
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
