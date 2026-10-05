// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useTranslation } from 'react-i18next';
import { GraduationCapIcon, PencilLineIcon } from '@phosphor-icons/react';
import {
  InspectorBody,
  InspectorHeader,
  InspectorSection,
} from '@/components/shell/InspectorPanel';
import type { LibraryClass } from '@/hooks/library/useClassLibrary';
import { formatStoredDate } from '@/utils';
import { ActionRow, DeleteFooter, IconTile, ValueRow } from './panelParts';

/**
 * A class in "Bibliothek": what it is called and what it holds. Its name,
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
        media={<IconTile icon={GraduationCapIcon} />}
        title={library.name}
        subtitle={library.label || undefined}
      />
      <InspectorBody>
        <InspectorSection title={t('library.class.section')}>
          <ValueRow label={t('library.class.schoolYear')}>
            {library.label || '–'}
          </ValueRow>
          {library.notes && (
            <p className="text-[13px] leading-relaxed whitespace-pre-line text-(--text-page)">
              {library.notes}
            </p>
          )}
          <ActionRow
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
      <DeleteFooter label={t('library.class.delete')} onDelete={onDelete} />
    </>
  );
}
