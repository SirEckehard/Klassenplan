// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowsClockwiseIcon,
  FloppyDiskIcon,
  PlusIcon,
} from '@phosphor-icons/react';
import type { ClassroomTemplate, TableTemplateType } from '@/types';
import {
  InspectorActionRow,
  InspectorMenuButton,
  InspectorSection,
} from '@/components/shell/InspectorPanel';
import {
  useOptionalSeatingPlanActions,
  useOptionalSeatingPlanState,
} from '@/contexts/seatingPlan/seatingPlanSelectors';
import TablePreview from '@/components/TablePreview';
import { TOUR_ANCHORS } from '@/components/onboarding/tours';
import { confirmDialog } from '@/services/ui/dialogs';
import { showToast } from '@/utils/ui/toast';
import {
  checkName,
  getTablePresets,
  inputFieldClass,
  MAX_NAME_LENGTH,
  menuItemClass,
  uniqueName,
} from '@/utils';

/** The four kinds of table a room can be set up with, smallest first. */
const SETUP_TYPES: TableTemplateType[] = [
  'single',
  'double',
  'group4',
  'group6',
];

/**
 * Sets the whole room up from one kind of table: as many of them as the class
 * needs, arranged in rows. It replaces the tables that stand there — windows,
 * doors and the board stay — so the hint says so, and the undo history holds
 * the room it replaced.
 */
export function RoomSetupSection({
  studentsCount,
  hasTables,
  onSetUp,
  focusRequest = 0,
}: {
  studentsCount: number;
  hasTables: boolean;
  onSetUp: (type: TableTemplateType) => void;
  /** Counts up whenever the setup is asked for (Ctrl/⌘+E), to take the focus. */
  focusRequest?: number;
}) {
  const { t } = useTranslation('generator');
  const hintId = React.useId();
  const firstRowRef = React.useRef<HTMLButtonElement | null>(null);
  const presets = getTablePresets();
  const labels: Record<TableTemplateType, string> = {
    single: t('sceneInspector.setupSingle'),
    double: t('sceneInspector.setupDouble'),
    group4: t('sceneInspector.setupGroup4'),
    group6: t('sceneInspector.setupGroup6'),
  };
  const tableCount = (type: TableTemplateType) =>
    t('sceneInspector.tables', {
      count: Math.ceil(studentsCount / presets[type].seatCount),
    });
  // A room that has its tables is seldom set up again, so the four kinds
  // fold into a menu there; in an empty room they are the first step and
  // stand as rows.
  const asMenu = hasTables && studentsCount > 0;

  React.useEffect(() => {
    if (focusRequest === 0) return undefined;
    // A frame later, so the drawer below `lg` has taken the focus for itself
    // first and this lands inside it.
    const frame = requestAnimationFrame(() => firstRowRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [focusRequest]);

  const hint =
    studentsCount === 0
      ? t('sceneInspector.setupNoStudents')
      : hasTables
        ? t('sceneInspector.setupReplaceHint')
        : t('sceneInspector.setupHint');

  return (
    <InspectorSection
      title={t('sceneInspector.setup')}
      tourAnchor={TOUR_ANCHORS.layoutSetup}
    >
      {asMenu ? (
        <>
          <InspectorMenuButton
            label={t('sceneInspector.setupChoose')}
            menuLabel={t('sceneInspector.setup')}
            focusRequest={focusRequest}
            describedBy={hintId}
            rows={SETUP_TYPES.map((type) => ({
              key: type,
              label: labels[type],
              icon: <TablePreview type={type} iconSize={20} />,
              meta: tableCount(type),
              onSelect: () => onSetUp(type),
            }))}
          />
          <p id={hintId} className="text-xs text-(--text-muted)">
            {hint}
          </p>
        </>
      ) : (
        <>
          <p id={hintId} className="text-xs text-(--text-muted)">
            {hint}
          </p>
          {/* The rows carry their own padding, as in a menu; the section's
              edge stays in line with the heading. */}
          <div className="-mx-3 flex flex-col">
            {SETUP_TYPES.map((type, index) => (
              <button
                key={type}
                ref={index === 0 ? firstRowRef : undefined}
                type="button"
                onClick={() => onSetUp(type)}
                disabled={studentsCount === 0}
                aria-describedby={hintId}
                className={menuItemClass}
              >
                <span aria-hidden="true" className="flex shrink-0">
                  <TablePreview type={type} iconSize={20} />
                </span>
                <span className="min-w-0 flex-1 truncate">{labels[type]}</span>
                {studentsCount > 0 && (
                  <span className="shrink-0 text-xs tabular-nums text-(--text-muted)">
                    {tableCount(type)}
                  </span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </InspectorSection>
  );
}

/** Renaming a template in its own row: Enter keeps the name, Escape drops it. */
function TemplateRenameRow({
  template,
  templates,
  onRename,
  onDone,
}: {
  template: ClassroomTemplate;
  templates: ClassroomTemplate[];
  onRename: (
    id: number,
    name: string,
  ) => Promise<{ success: boolean; error?: string }>;
  onDone: () => void;
}) {
  const { t } = useTranslation('generator');
  const [draft, setDraft] = React.useState(template.name);
  // Enter and leaving the field can both ask while the rename is on its way.
  const committingRef = React.useRef(false);
  const errorId = React.useId();
  const trimmed = draft.trim();
  // Refused here rather than by a toast, as a plan's name is.
  const taken = templates.some(
    (entry) => entry.id !== template.id && entry.name === trimmed,
  );

  const commit = async () => {
    if (committingRef.current) return;
    if (trimmed === '' || trimmed === template.name) {
      onDone();
      return;
    }
    if (taken) return;
    committingRef.current = true;
    try {
      const result = await onRename(template.id, trimmed);
      if (result.success) onDone();
    } finally {
      committingRef.current = false;
    }
  };

  return (
    <div className="flex flex-col gap-1 px-3 py-1">
      <input
        type="text"
        value={draft}
        maxLength={MAX_NAME_LENGTH}
        autoFocus
        onFocus={(event) => event.currentTarget.select()}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          void commit();
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            void commit();
          } else if (event.key === 'Escape') {
            // Only "not this name" — the canvas would take Escape as
            // clearing its selection.
            event.preventDefault();
            event.stopPropagation();
            onDone();
          }
        }}
        aria-label={t('sceneInspector.templateName')}
        aria-invalid={taken || undefined}
        aria-describedby={taken ? errorId : undefined}
        className={`${inputFieldClass} h-8 w-full py-0 text-sm`}
      />
      {taken && (
        <p id={errorId} className="text-xs text-(--status-alert-text)">
          {t('template.duplicateWarning')}
        </p>
      )}
    </div>
  );
}

/**
 * Naming a room as a template, in its own row: Enter keeps it as a new one.
 * A name a template already carries is not saved over by Enter — the row
 * says so and offers the replacement as a step of its own. Escape, or
 * leaving the row, drops it. The room's inspector and "Bibliothek" share it.
 */
export function TemplateSaveRow({
  initialName,
  templates,
  onSave,
  onDone,
}: {
  initialName: string;
  templates: ClassroomTemplate[];
  onSave: (name: string, overwriteId?: number) => Promise<boolean>;
  onDone: () => void;
}) {
  const { t } = useTranslation('generator');
  const [draft, setDraft] = React.useState(initialName);
  const rowRef = React.useRef<HTMLDivElement | null>(null);
  // Enter and the replacement can both ask while the save is on its way.
  const savingRef = React.useRef(false);
  const hintId = React.useId();
  const trimmed = draft.trim();
  // The same rule the template service applies to a new name.
  const existing = templates.find((template) => template.name === trimmed);

  const save = async (overwriteId?: number) => {
    if (savingRef.current || trimmed === '') return;
    savingRef.current = true;
    try {
      if (await onSave(trimmed, overwriteId)) onDone();
    } finally {
      savingRef.current = false;
    }
  };

  return (
    <div
      ref={rowRef}
      className="flex flex-col gap-1 px-3 py-1"
      onBlur={(event) => {
        // Leaving the row drops it; moving to its replacement does not.
        if (!rowRef.current?.contains(event.relatedTarget as Node | null)) {
          onDone();
        }
      }}
    >
      <input
        type="text"
        value={draft}
        maxLength={MAX_NAME_LENGTH}
        autoFocus
        onFocus={(event) => event.currentTarget.select()}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            if (!existing) void save();
          } else if (event.key === 'Escape') {
            // Only "not this name" — the canvas would take Escape as
            // clearing its selection.
            event.preventDefault();
            event.stopPropagation();
            onDone();
          }
        }}
        aria-label={t('sceneInspector.templateName')}
        aria-describedby={existing ? hintId : undefined}
        className={`${inputFieldClass} h-8 w-full py-0 text-sm`}
      />
      {existing && (
        <>
          <p id={hintId} className="text-xs text-(--text-muted)">
            {t('template.duplicateWarning')}
          </p>
          <button
            type="button"
            // Keeps the focus in the field, so a tap — which does not focus
            // a button in Safari — does not drop the row before it lands.
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              void save(existing.id);
            }}
            className={`${menuItemClass} pointer-coarse:min-h-11`}
          >
            <ArrowsClockwiseIcon
              size={16}
              aria-hidden="true"
              className="shrink-0 text-(--text-muted)"
            />
            <span className="min-w-0 flex-1 truncate">
              {t('sceneInspector.replaceTemplate', { name: existing.name })}
            </span>
          </button>
        </>
      )}
    </div>
  );
}

/**
 * Rooms kept for other classes: this one saved as a template — named in the
 * panel, after the room — and the kept ones in a menu shaped as the header's
 * class menu — a click opens one as a room of its own, the pencil renames it
 * here in the panel, the bin removes it after asking.
 */
export function RoomTemplatesSection({
  templates,
  onSave,
  onLoad,
  onRename,
  onDelete,
}: {
  templates: ClassroomTemplate[];
  /**
   * Keeps this room as a new template, or over the one `overwriteId` names;
   * resolves with whether it was kept.
   */
  onSave: (name: string, overwriteId?: number) => Promise<boolean>;
  onLoad: (id: number) => void;
  onRename: (
    id: number,
    name: string,
  ) => Promise<{ success: boolean; error?: string }>;
  onDelete: (id: number) => void;
}) {
  const { t } = useTranslation('generator');
  const state = useOptionalSeatingPlanState();
  const [renamingId, setRenamingId] = React.useState<number | null>(null);
  const [saving, setSaving] = React.useState(false);
  const renaming = templates.find((template) => template.id === renamingId);
  // A room opened from a template carries its name, so saving it again
  // offers to replace that template.
  const roomName =
    state?.rooms.find((room) => room.id === state.activeRoomId)?.name ??
    t('sceneInspector.room');

  // Deleting a template is not part of the room's undo history, so it asks.
  const requestDelete = async (template: ClassroomTemplate) => {
    const confirmed = await confirmDialog(
      t('sceneInspector.deleteTemplateMessage', { name: template.name }),
      {
        title: t('sceneInspector.deleteTemplateTitle'),
        confirmLabel: t('common.delete'),
      },
    );
    if (confirmed) onDelete(template.id);
  };

  return (
    <InspectorSection title={t('sceneInspector.templates')}>
      {templates.length === 0 && (
        <p className="text-xs text-(--text-muted)">
          {t('sceneInspector.templatesHint')}
        </p>
      )}
      <InspectorActionRow
        icon={FloppyDiskIcon}
        label={t('sceneInspector.saveAsTemplate')}
        expanded={saving}
        onClick={() => {
          setRenamingId(null);
          setSaving((previous) => !previous);
        }}
      />
      {saving && (
        <div className="-mx-3">
          <TemplateSaveRow
            initialName={roomName}
            templates={templates}
            onSave={onSave}
            onDone={() => setSaving(false)}
          />
        </div>
      )}
      {templates.length > 0 && (
        <InspectorMenuButton
          label={t('sceneInspector.openTemplate')}
          menuLabel={t('sceneInspector.templates')}
          rows={templates.map((template) => {
            const seatCount = template.scene.tables.reduce(
              (sum, table) => sum + table.seatCount,
              0,
            );
            return {
              key: String(template.id),
              label: template.name,
              description: `${t('sceneInspector.tables', {
                count: template.scene.tables.length,
              })} · ${t('sceneInspector.seats', { count: seatCount })}`,
              onSelect: () => onLoad(template.id),
              rename: {
                label: t('sceneInspector.renameTemplateNamed', {
                  name: template.name,
                }),
                onSelect: () => {
                  setSaving(false);
                  setRenamingId(template.id);
                },
              },
              remove: {
                label: t('sceneInspector.deleteTemplateNamed', {
                  name: template.name,
                }),
                onSelect: () => {
                  void requestDelete(template);
                },
              },
            };
          })}
        />
      )}
      {renaming && (
        <div className="-mx-3">
          <TemplateRenameRow
            key={renaming.id}
            template={renaming}
            templates={templates}
            onRename={onRename}
            onDone={() => setRenamingId(null)}
          />
        </div>
      )}
    </InspectorSection>
  );
}

/**
 * A room's name in its own row: Enter keeps it, Escape or leaving the field
 * without a change drops it. A name another room of the class carries is
 * refused here, as a template's is.
 */
function RoomNameRow({
  initialName,
  roomId,
  onCommit,
  onDone,
}: {
  initialName: string;
  /** The room renamed; none while a new one is named. */
  roomId?: string;
  onCommit: (name: string) => void;
  onDone: () => void;
}) {
  const { t } = useTranslation('generator');
  const state = useOptionalSeatingPlanState();
  const [draft, setDraft] = React.useState(initialName);
  const errorId = React.useId();
  const otherNames = (state?.rooms ?? [])
    .filter((room) => room.id !== roomId)
    .map((room) => room.name);
  const problem = checkName(draft, otherNames, MAX_NAME_LENGTH);
  const taken = problem === 'taken';

  const commit = () => {
    if (draft.trim() === '' || (roomId && draft.trim() === initialName)) {
      onDone();
      return;
    }
    if (problem) return;
    onCommit(draft.trim());
    onDone();
  };

  return (
    <div className="flex flex-col gap-1 px-3 py-1">
      <input
        type="text"
        value={draft}
        maxLength={MAX_NAME_LENGTH}
        autoFocus
        onFocus={(event) => event.currentTarget.select()}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          // A new room is made only on purpose: leaving the field drops it.
          if (roomId) commit();
          else onDone();
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            commit();
          } else if (event.key === 'Escape') {
            // Only "not this name" — the canvas would take Escape as
            // clearing its selection.
            event.preventDefault();
            event.stopPropagation();
            onDone();
          }
        }}
        aria-label={t('sceneInspector.roomName')}
        aria-invalid={taken || undefined}
        aria-describedby={taken ? errorId : undefined}
        className={`${inputFieldClass} h-8 w-full py-0 text-sm`}
      />
      {taken && (
        <p id={errorId} className="text-xs text-(--status-alert-text)">
          {t('sceneInspector.roomNameTaken')}
        </p>
      )}
    </div>
  );
}

/**
 * The rooms of the class (decision 0024), inside the room's own section under
 * its name: "Neuer Raum" as a row of its own, as "Raum als Vorlage speichern"
 * is — named before it is made, since making it opens it — and, once the class
 * has another room, "Raum öffnen …", a menu shaped as the header's class menu:
 * every room, the open one checked, a click opening a room as it was left, a
 * pencil renaming it here in the panel and a bin removing it. Removing takes
 * the room's plans and mixes along, so it asks first; the open room and the
 * last one stay, and their bin says why.
 */
export function RoomListControls() {
  const { t } = useTranslation('generator');
  const state = useOptionalSeatingPlanState();
  const actions = useOptionalSeatingPlanActions();
  const [renamingId, setRenamingId] = React.useState<string | null>(null);
  const [naming, setNaming] = React.useState(false);
  if (!state || !actions) return null;
  const { rooms, activeRoomId, seatingHistory } = state;
  const renaming = rooms.find((room) => room.id === renamingId);

  // Not part of the room's undo history, so it asks — as "Bibliothek"
  // does, in the same words.
  const requestDelete = async (room: { id: string; name: string }) => {
    const count = seatingHistory.filter(
      (plan) => plan.roomId === room.id,
    ).length;
    const confirmed = await confirmDialog(
      count === 0
        ? t('library.room.deleteMessageEmpty', { name: room.name })
        : t('library.room.deleteMessage', { name: room.name, count }),
      {
        title: t('library.room.delete'),
        confirmLabel: t('common.delete'),
      },
    );
    if (!confirmed) return;
    if (actions.deleteRoom(room.id) === null) {
      showToast('success', t('library.room.deleted', { name: room.name }));
    }
  };

  return (
    <>
      <InspectorActionRow
        icon={PlusIcon}
        label={t('sceneInspector.newRoom')}
        expanded={naming}
        onClick={() => {
          setRenamingId(null);
          setNaming((previous) => !previous);
        }}
      />
      {naming && (
        <div className="-mx-3">
          <RoomNameRow
            initialName={uniqueName(
              t('rooms.newName'),
              rooms.map((room) => room.name),
              MAX_NAME_LENGTH,
            )}
            onCommit={(name) => {
              actions.createRoom({ name });
            }}
            onDone={() => setNaming(false)}
          />
        </div>
      )}
      {/* With one room the menu would only hold the room named above. */}
      {rooms.length > 1 && (
        <InspectorMenuButton
          label={t('sceneInspector.openRoom')}
          menuLabel={t('sceneInspector.rooms')}
          rows={rooms.map((room) => {
            const isOpen = room.id === activeRoomId;
            return {
              key: room.id,
              label: room.name,
              checked: isOpen,
              onSelect: () => {
                if (!isOpen) actions.openRoom(room.id);
              },
              rename: {
                label: t('sceneInspector.renameRoomNamed', {
                  name: room.name,
                }),
                onSelect: () => {
                  setNaming(false);
                  setRenamingId(room.id);
                },
              },
              remove: {
                label: t('sceneInspector.deleteRoomNamed', {
                  name: room.name,
                }),
                blockedHint: isOpen
                  ? t('library.room.deleteOpenHint')
                  : undefined,
                onSelect: () => {
                  void requestDelete(room);
                },
              },
            };
          })}
        />
      )}
      {renaming && (
        <div className="-mx-3">
          <RoomNameRow
            key={renaming.id}
            roomId={renaming.id}
            initialName={renaming.name}
            onCommit={(name) => {
              actions.renameRoom(renaming.id, name);
            }}
            onDone={() => setRenamingId(null)}
          />
        </div>
      )}
    </>
  );
}
