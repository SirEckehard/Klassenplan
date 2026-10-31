// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import { FloppyDiskIcon } from '@phosphor-icons/react';
import {
  InspectorActionRow,
  InspectorBody,
  InspectorDeleteFooter,
  InspectorHeader,
  InspectorSection,
} from '@/components/shell/InspectorPanel';
import type { LibraryRoom } from '@/hooks/library/useClassLibrary';
import type { ClassroomTemplate } from '@/types';
import { TemplateSaveRow } from '@/components/SeatingPlanGenerator/views/RoomSetupSections';
import { checkName, MAX_NAME_LENGTH, type NameProblem } from '@/utils';
import RoomThumbnail from '../RoomThumbnail';
import InspectorTitleField from '@/components/shell/InspectorTitleField';
import { ValueRow } from './panelParts';

/**
 * A room of a class (decision 0024): its name, renamed in the header; its
 * tables and
 * room elements; keeping it as a template for other classes — named in a row
 * of the panel, as in the room's own inspector; and removing it with the
 * plans made in it — never the open room, never the last one.
 */
export default function RoomPanel({
  room,
  otherRoomNames,
  planCount,
  templates,
  onRename,
  onSaveAsTemplate,
  onDelete,
  deleteBlockedHint,
  renameRequest,
  templateRequest = 0,
}: {
  room: LibraryRoom;
  /** The names of the class's other rooms, which this one may not take. */
  otherRoomNames: string[];
  planCount: number;
  /** The kept templates, whose names a new one is checked against. */
  templates: ClassroomTemplate[];
  onRename: (name: string) => Promise<NameProblem | null> | NameProblem | null;
  /**
   * Keeps the room as a new template, or over the one `overwriteId` names;
   * resolves with whether it was kept.
   */
  onSaveAsTemplate: (name: string, overwriteId?: number) => Promise<boolean>;
  onDelete: () => void;
  deleteBlockedHint: string | null;
  renameRequest: number;
  /** Counts up whenever the row naming the template is asked for (its menu). */
  templateRequest?: number;
}) {
  const { t } = useTranslation('generator');
  const [savingTemplate, setSavingTemplate] = React.useState(
    templateRequest > 0,
  );
  // A new request opens the row, as a click on its action does.
  const [seenTemplateRequest, setSeenTemplateRequest] =
    React.useState(templateRequest);
  if (templateRequest !== seenTemplateRequest) {
    setSeenTemplateRequest(templateRequest);
    if (templateRequest > 0) setSavingTemplate(true);
  }
  const seats = room.scene.tables.reduce(
    (sum, table) => sum + table.seatCount,
    0,
  );
  const elements = (room.scene.features ?? []).filter(
    (feature) => feature.visible !== false,
  ).length;

  return (
    <>
      <InspectorHeader
        media={
          <RoomThumbnail scene={room.scene} className="h-11 w-16.5 shrink-0" />
        }
        title={
          <InspectorTitleField
            label={t('sceneInspector.roomName')}
            value={room.name}
            problemFor={(draft) =>
              checkName(draft, otherRoomNames, MAX_NAME_LENGTH)
            }
            onCommit={onRename}
            takenMessage={t('sceneInspector.roomNameTaken')}
            focusRequest={renameRequest}
          />
        }
        subtitle={t('library.plans', { count: planCount })}
      />
      <InspectorBody>
        <InspectorSection title={t('library.room.section')}>
          <ValueRow label={t('library.room.tables')}>
            {[
              t('sceneInspector.tables', { count: room.scene.tables.length }),
              t('sceneInspector.seats', { count: seats }),
            ].join(' · ')}
          </ValueRow>
          <ValueRow label={t('library.room.elements')}>{elements}</ValueRow>
        </InspectorSection>
        <InspectorSection title={t('sceneInspector.templates')}>
          <InspectorActionRow
            icon={FloppyDiskIcon}
            label={t('library.room.saveAsTemplate')}
            expanded={savingTemplate}
            onClick={() => setSavingTemplate((previous) => !previous)}
          />
          {savingTemplate && (
            <div className="-mx-3">
              <TemplateSaveRow
                initialName={room.name}
                templates={templates}
                onSave={onSaveAsTemplate}
                onDone={() => setSavingTemplate(false)}
              />
            </div>
          )}
        </InspectorSection>
      </InspectorBody>
      <InspectorDeleteFooter
        label={t('library.room.delete')}
        onDelete={onDelete}
        blockedHint={deleteBlockedHint}
      />
    </>
  );
}
