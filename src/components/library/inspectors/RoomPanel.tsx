// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useTranslation } from 'react-i18next';
import { FloppyDiskIcon } from '@phosphor-icons/react';
import {
  InspectorBody,
  InspectorHeader,
  InspectorSection,
} from '@/components/shell/InspectorPanel';
import type { LibraryRoom } from '@/hooks/library/useClassLibrary';
import { checkName, MAX_NAME_LENGTH, type NameProblem } from '@/utils';
import RoomThumbnail from '../RoomThumbnail';
import NameField from './NameField';
import { ActionRow, DeleteFooter, ValueRow } from './panelParts';

/**
 * A room of a class (decision 0024): its name, renamed here; its tables and
 * room elements; keeping it as a template for other classes; and removing it
 * with the plans made in it — never the open room, never the last one.
 */
export default function RoomPanel({
  room,
  otherRoomNames,
  planCount,
  onRename,
  onSaveAsTemplate,
  onDelete,
  deleteBlockedHint,
  renameRequest,
}: {
  room: LibraryRoom;
  /** The names of the class's other rooms, which this one may not take. */
  otherRoomNames: string[];
  planCount: number;
  onRename: (name: string) => Promise<NameProblem | null> | NameProblem | null;
  onSaveAsTemplate: () => void;
  onDelete: () => void;
  deleteBlockedHint: string | null;
  renameRequest: number;
}) {
  const { t } = useTranslation('generator');
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
          <RoomThumbnail scene={room.scene} className="h-10 w-15 shrink-0" />
        }
        title={room.name}
        subtitle={t('library.plans', { count: planCount })}
      />
      <InspectorBody>
        <InspectorSection title={t('library.room.section')}>
          <NameField
            label={t('sceneInspector.roomName')}
            value={room.name}
            problemFor={(draft) =>
              checkName(draft, otherRoomNames, MAX_NAME_LENGTH)
            }
            onCommit={onRename}
            takenMessage={t('sceneInspector.roomNameTaken')}
            focusRequest={renameRequest}
          />
          <ValueRow label={t('library.room.tables')}>
            {[
              t('sceneInspector.tables', { count: room.scene.tables.length }),
              t('sceneInspector.seats', { count: seats }),
            ].join(' · ')}
          </ValueRow>
          <ValueRow label={t('library.room.elements')}>{elements}</ValueRow>
        </InspectorSection>
        <InspectorSection title={t('sceneInspector.templates')}>
          <ActionRow
            icon={FloppyDiskIcon}
            label={t('library.room.saveAsTemplate')}
            onClick={onSaveAsTemplate}
          />
        </InspectorSection>
      </InspectorBody>
      <DeleteFooter
        label={t('library.room.delete')}
        onDelete={onDelete}
        blockedHint={deleteBlockedHint}
      />
    </>
  );
}
