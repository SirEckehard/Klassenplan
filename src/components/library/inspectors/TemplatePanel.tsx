// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useTranslation } from 'react-i18next';
import {
  InspectorBody,
  InspectorHeader,
  InspectorSection,
} from '@/components/shell/InspectorPanel';
import type { ClassroomTemplate } from '@/types';
import type { NameProblem } from '@/utils';
import RoomThumbnail from '../RoomThumbnail';
import NameField from './NameField';
import { DeleteFooter, ValueRow } from './panelParts';

/**
 * A room kept for every class: its name, renamed here, its tables, and
 * removing it. Opened — from the status bar — it becomes a room of its own of
 * the class that is open (decision 0024).
 */
export default function TemplatePanel({
  template,
  templates,
  onRename,
  onDelete,
  renameRequest,
}: {
  template: ClassroomTemplate;
  templates: ClassroomTemplate[];
  onRename: (name: string) => Promise<NameProblem | null>;
  onDelete: () => void;
  renameRequest: number;
}) {
  const { t } = useTranslation('generator');
  const seats = template.scene.tables.reduce(
    (sum, table) => sum + table.seatCount,
    0,
  );

  return (
    <>
      <InspectorHeader
        media={
          <RoomThumbnail
            scene={template.scene}
            className="h-10 w-15 shrink-0"
          />
        }
        title={template.name}
        subtitle={t('library.templates')}
      />
      <InspectorBody>
        <InspectorSection title={t('library.template.section')}>
          <NameField
            label={t('sceneInspector.templateName')}
            value={template.name}
            // Template names are held exactly, as saving one holds them.
            problemFor={(draft) =>
              draft.trim() === ''
                ? 'empty'
                : templates.some(
                      (entry) =>
                        entry.id !== template.id && entry.name === draft.trim(),
                    )
                  ? 'taken'
                  : null
            }
            onCommit={onRename}
            takenMessage={t('template.duplicateWarning')}
            focusRequest={renameRequest}
          />
          <ValueRow label={t('library.room.tables')}>
            {[
              t('sceneInspector.tables', {
                count: template.scene.tables.length,
              }),
              t('sceneInspector.seats', { count: seats }),
            ].join(' · ')}
          </ValueRow>
        </InspectorSection>
        <p className="text-xs leading-relaxed text-(--text-muted)">
          {t('library.template.hint')}
        </p>
      </InspectorBody>
      <DeleteFooter label={t('library.template.delete')} onDelete={onDelete} />
    </>
  );
}
