// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useTranslation } from 'react-i18next';
import { DownloadIcon, FolderSimpleIcon } from '@phosphor-icons/react';
import {
  InspectorActionRow,
  InspectorBody,
  InspectorDeleteFooter,
  InspectorHeader,
  InspectorMediaTile,
  InspectorSection,
} from '@/components/shell/InspectorPanel';
import type { ClassroomTemplate } from '@/types';
import type { NameProblem } from '@/utils';
import InspectorTitleField from '@/components/shell/InspectorTitleField';
import { ENTITY_ICONS } from '@/components/shell/entityIcons';
import { ValueRow } from './panelParts';

/**
 * A room kept for every class: its name, renamed in the header, its tables,
 * saving it as a file for a colleague (decision 0046), and removing it.
 * Opened — from the status bar — it becomes a room of its own of the class
 * that is open (decision 0024). One made here starts without tables, and its
 * hint says how it gets them.
 */
export default function TemplatePanel({
  template,
  templates,
  onRename,
  onSaveFile,
  onDelete,
  renameRequest,
}: {
  template: ClassroomTemplate;
  templates: ClassroomTemplate[];
  onRename: (name: string) => Promise<NameProblem | null>;
  onSaveFile: () => void;
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
        media={<InspectorMediaTile icon={ENTITY_ICONS.template} />}
        title={
          <InspectorTitleField
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
        }
        meta={[{ icon: FolderSimpleIcon, label: t('library.templates') }]}
      />
      <InspectorBody>
        <InspectorSection title={t('library.template.section')}>
          <ValueRow label={t('library.room.tables')}>
            {[
              t('sceneInspector.tables', {
                count: template.scene.tables.length,
              }),
              t('sceneInspector.seats', { count: seats }),
            ].join(' · ')}
          </ValueRow>
          <InspectorActionRow
            icon={DownloadIcon}
            label={t('library.share.save')}
            // A room without tables is nothing to hand on.
            disabled={template.scene.tables.length === 0}
            onClick={onSaveFile}
          />
          {/* In the section it speaks of, not loose under the panel. */}
          <p className="text-xs text-(--text-muted)">
            {template.scene.tables.length > 0
              ? t('library.template.hint')
              : t('library.template.emptyHint')}
          </p>
        </InspectorSection>
      </InspectorBody>
      <InspectorDeleteFooter
        label={t('library.template.delete')}
        onDelete={onDelete}
      />
    </>
  );
}
