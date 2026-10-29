# Data Model

> **Status:** current · **Last reviewed:** 2026-10-29 · **Source of truth:**
> `src/utils/data/storageKeys.ts`, `src/types/`, `src/repositories/`

Everything Klassenplan stores lives in the teacher's browser. This document
lists where it lives, in which shape, how those shapes are versioned and when
data is removed. Stored data outlives any release, so these shapes are among the
hardest things in the project to change. The backup file format has its own
document: [backup-format.md](backup-format.md).

## Overview

| Store           | Location                                                                  | Holds                                                                                        |
| --------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Key-value store | IndexedDB, idb-keyval's default database (`keyval-store`, store `keyval`) | Class collection, room templates, circle exports, plan usage record, name game stats, duties |
| Photo store     | IndexedDB database `spg-student-photos`, object store `photos`            | One image blob per student                                                                   |
| localStorage    | The origin's localStorage                                                 | UI preferences, backup reminder state, a migration mirror — no student data                  |

All IndexedDB access goes through `src/repositories/idbClient.ts`, the only
module that imports `idb-keyval` ([decision 0002](decisions/0002-single-indexeddb-entry-point.md)).

## Key-value store

| Key                      | Type                   | Content                                                 |
| ------------------------ | ---------------------- | ------------------------------------------------------- |
| `spg.classCollection`    | `ClassCollectionState` | Every class and everything it owns, see below           |
| `spg.classroomTemplates` | `ClassroomTemplate[]`  | Saved room layouts, shared by all classes               |
| `spg.circleLayouts`      | `CircleExportData[]`   | Circle layouts kept for export, shared by all classes   |
| `spg.planUsage`          | `PlanUsageData`        | Plan usage record, one bucket per class                 |
| `spg.nameGameStats`      | `NameGameData`         | Name game statistics per student                        |
| `spg.duties`             | `DutyData`             | Class duties and their rounds, one entry per class      |
| `spg.migrationVersion`   | `number`               | Version of the last completed table migration           |
| `spg.version`            | `number`               | `APP_DATA_VERSION` (currently 2), stamped on every load |

The keys `spg.students`, `spg.seatingHistory`, `spg.mixHistory`,
`spg.currentSeating`, `spg.lockedPositions`, `spg.classroomScene`,
`spg.mixSettings` and `spg.currentCircleLayout` hold the single-class storage
from before the class collection existed. When no `spg.classCollection` is
found, `IndexedDBRepository.migrateLegacyStorage` reads them into a first class
(named by `generator:common.defaultClassName`), or creates an empty collection
when they are empty too.

### Class collection

```ts
interface ClassCollectionState {
  version: number; // CLASS_COLLECTION_VERSION, currently 2
  activeClassId: string | null;
  classes: ClassRecord[];
}

interface ClassRecord {
  id: string;
  name: string;
  label?: string;
  notes?: string;
  createdAt: string; // ISO 8601
  updatedAt: string;
  lastUsedAt?: string;
  students: Student[];
  seatingHistory: SavedPlan[];
  mixHistory: MixResult[];
  currentSeating: SeatingArrangement;
  lockedPositions: LockedPositions;
  mixSettings: MixSettings | null;
  classroomScene: ClassroomScene | null;
  circleLayout: CircleLayout | null;
  activePlanId?: string | null;
  rooms?: RoomRecord[]; // decision 0024
  activeRoomId?: string | null;
}

interface RoomRecord {
  id: string;
  name: string; // unique within the class, case ignored
  createdAt: string; // ISO 8601
  parked?: RoomWorkingState; // only while another room is open
}

interface RoomWorkingState {
  scene: ClassroomScene | null;
  seating: SeatingArrangement;
  lockedPositions: LockedPositions;
  circleLayout: CircleLayout | null;
  activePlanId: string | null;
}

// SavedPlan and MixResult carry `roomId?: string`.
```

`MixSettings` carries `criteriaVersion` (`MIX_CRITERIA_VERSION`, currently 2)
since [decision 0031](decisions/0031-one-criterion-model.md): from version 2
only "Sehr wichtig" keeps students needing a front seat in the front rows.
Settings stored without it — a class's `mixSettings`, the browser's last
weights under `spg.mixSettings`, a backup's, a mix of the history — are
brought up to it where they come in (`migrateStoredMixSettings`): a level of
`preferFrontForNeedsFrontSeat` below "Sehr wichtig" is lifted to the
recommended 8 once. `neighborWeights` is still stored but no longer read.

- **One record per class.** A class's students, plans, room and weights all
  live inside its record; switching classes means reading a different record.
- **The whole collection is one value.** Every write replaces
  `spg.classCollection` as a whole, but reads it in the same transaction and
  changes only what it is about (`changeCollection`, idb-keyval's `update`):
  two tabs on one device — or the installed app beside a browser tab — each
  have a repository of their own, and one that wrote back a copy read earlier
  put every class the other had changed back. So nothing is kept in memory;
  every operation reads what is stored. `IndexedDBRepository` serialises its
  operations through a promise chain — extended before anything awaits, so two
  calls in the same tick queue up. This is also why photos have a store of
  their own.
- **`activeClassId` repairs itself on read** (`ensureActiveClass`): an unknown or
  missing id falls back to the first class. It names the class the app opens
  next; each tab keeps the class it has open on its own (`openClassId`), so
  opening a class in one tab moves neither the other tab nor its writes.
- **A class keeps its rooms** ([decision 0024](decisions/0024-rooms-of-a-class.md)).
  The open room (`activeRoomId`) holds its state in the class's working fields —
  `classroomScene`, `currentSeating`, `lockedPositions`, `circleLayout`,
  `activePlanId` — and every other room keeps how it was left in `parked`.
  Every saved plan and mix carries the `roomId` of the room it was made in.
  Reading repairs the shape, as `ensureActiveClass` does for the collection
  (`ensureClassRooms` in `src/utils/data/classRooms.ts`, applied on every read,
  when a class is created and when a collection is saved as a whole): a class
  without a room gets one named `generator:rooms.defaultName` ("Klassenraum");
  plans and mixes without a room of the class go into the open room; the open
  room is the open plan's; it parks nothing; a parked open plan lies in its own
  room. A record that needs nothing comes back unchanged, so a read writes only
  when there was something to repair. Writes of the live state are never
  repaired: the live state keeps itself consistent.
- **`seatingHistory` holds saved plans**, not a log. At most one entry per room
  carries `autoSaved: true`; the next silent auto-save in that room overwrites
  it. The name an auto-save generated is no name the teacher chose: leaving the
  plan layer again writes to the same entry, and only a save on purpose, an
  export or a projection make it a plan of its own. Names are unique
  within a class: a save writes to the open plan when the name is its own or
  the save renames it (`SaveSeatingPlanOptions.rename`), and otherwise starts a
  new entry (`resolvePlanSlot`). Every entry keeps its own copy of the room
  (`SavedPlan.scene`), so one class can hold a plan per room; loading a template
  or setting the room up anew clears `activePlanId` and the plan name
  (`releaseOpenPlan`), so the next save starts a new entry instead of writing
  the new room over the open one. Setting the room up anew also lets every
  lock go (`releaseLocks`): its table and seat numbers name seats of tables
  that are gone. Undoing the setup brings the old tables back with the plan
  and the locks (`restoreOpenPlan`, `restoreLocks`, `HistorySnapshot.released`);
  redoing it lets them go once more.
- **`SavedPlan.date`** is an ISO date (`YYYY-MM-DD`). Older entries hold a
  pre-formatted German string; render both through `formatStoredDate`.
- **`mixHistory`** keeps the last `MIX_HISTORY_LIMIT` (20) shuffle results, each
  as the arrangement after refinement
  ([decision 0014](decisions/0014-mix-history-records-refined-plan.md)).
- **`lockedPositions`** maps a student id to `{ table, seat }`.
- **`classroomScene`** is the open room: its tables and room elements. A table
  with `inactive: true` stays out of the mix, and `fillFromFront: true` fills
  the room from the board backwards
  ([decision 0026](decisions/0026-tables-out-of-the-mix.md)). Both are absent
  rather than `false` when off, so rooms from before them read unchanged.
- **`circleLayout.lockedStudentIds`** (optional) lists the students held in
  their place in the circle; a regenerated circle puts them back
  ([decision 0022](decisions/0022-one-drag-for-plan-and-circle.md)). Circles
  without the field have nothing locked.
- **Partner wishes** are stored as `wishPartnerIds` / `avoidPartnerIds`. The
  single-value fields `wishPartnerId` / `avoidPartnerId` predate them and are
  still written by the editors and the CSV import for compatibility. Records
  are not rewritten on load: every reader normalizes both shapes through
  `getWishPartnerIds` / `getAvoidPartnerIds` (`src/utils/student/partnerUtils.ts`),
  which is the only place allowed to know about the legacy fields. Removing a
  student takes them out of everyone's lists (`withoutPartners`); links left
  behind by a removal before that are dropped when the open class is read
  (`dropMissingPartners` in `loadActiveClassSnapshot`), not written, and the
  statistics count only the classmates still in the class.
- **Photos are not part of the record.** A student only carries `hasPhoto`.

### How changes reach storage

State is not written where it changes. `useClassDataPersistence` compares the
eleven persistable fields of the active class — `students`, `seatingHistory`,
`mixHistory`, `currentSeating`, `lockedPositions`, `mixSettings`,
`classroomScene`, `circleLayout`, `activePlanId`, `rooms`, `activeRoomId` — on
every render and queues the ones that changed. `usePersistQueue` then:

1. keeps only the newest job per key, each tagged with a version and the class
   it belongs to;
2. flushes in an idle callback, and immediately on `visibilitychange` (hidden)
   and `pagehide`, so the last edit before closing a tab is not lost;
3. drops jobs whose version is outdated or whose class is no longer active,
   skips values identical to the last successful write, and writes the rest
   with `repository.saveClassSnapshot(classId, changes)`.

On a class switch, the reload first writes what is still queued for the class
that was open, then loads the new class and bumps every version, so a job queued
before the load is discarded; see
[ARCHITECTURE.md](ARCHITECTURE.md#switching-classes). A restore that replaces
everything writes what is queued first, then holds the queue shut
(`isRestoringRef`) and reloads without writing
(`reloadCurrentClassData({ discardPending: true })`): the backup's top-level
fields go on screen during the import, and queued for the class open then,
they used to land in that class of the restored collection.

A write that fails is said at once, one toast per run of failures
(`usePersistErrorHandling`). Its jobs go back into the queue unless a newer job
for the same key arrived, and the queue tries again after one second, then
twice as long each time up to half a minute, eight times on its own; the next
edit and the status bar's "Nicht gespeichert" — a button, shown until a write
succeeds (`hooks/persistence/persistStatus.ts`) — try again at once. While
writes fail, leaving the page asks first. When the browser closed the
database connection under the page — Safari does after a while in the
background — `idbClient` opens the default store anew and repeats the call
once.

Once a class is active, `ensureStoragePersistence()` asks the browser once per
page load to exempt the site from storage eviction (`navigator.storage.persist`;
Chromium decides silently, Firefox asks the user) and warns once when the quota
runs low.

### Plan usage record

```ts
interface PlanUsageData {
  version: 1;
  byClass: Record<string, PlanUsage[]>; // class id → records
  backfilledClassIds: string[];
  resetAtByClass?: Record<string, string>; // class id → ISO 8601 of the last reset
  manualClassIds?: string[]; // classes that mark the plans in use by hand
}
```

Each `PlanUsage` holds a `fingerprint`, the sorted pair keys (`"idA::idB"`),
`firstSeenAt` / `lastSeenAt`, the `sources` that raised it, the resulting
`confidence` and `confirmed` — the teacher's answer to the confirmation prompt,
undefined until they give one. It never holds a full arrangement. Semantics are described in
[ALGORITHM.md](ALGORITHM.md#plan-usage-record).

- At most `PLAN_USAGE_LIMIT` (40) records per class — roughly two school years —
  the oldest dropping out first.
- Writes are chained so interleaving signals cannot overwrite each other.
  Failures are logged and swallowed; subscribers (`subscribeToPlanUsage`) are
  notified after every change.
- "Zurücksetzen" in the neighbourhood view (`resetPlanUsage`) empties a class's
  bucket, keeps it among `backfilledClassIds` so its saved plans do not seed it
  again, and stamps `resetAtByClass`. The field is additive; data written
  before it reads as never reset. `undoPlanUsageReset` puts the records back
  beside any that arrived since ([decision 0023](decisions/0023-neighbourhood-reset.md)).
- A class in `manualClassIds` has its detection switched off
  (`setPlanUsageManual`): `recordPlanUsage` and the backfill write nothing for
  it, and only records with `confirmed: true` count — `usePlanUsageRecords`
  resolves the others as not counted on reading (`resolvePlanUsageMode`), so
  the stored records are kept and count again once the detection is back on.
  `markPlanUsed` answers a plan's record or, for a plan without one, writes a
  record with the source `marked`, dated the day the plan was made. The field
  is additive; data written before it reads as detecting
  ([decision 0025](decisions/0025-plan-usage-marked-by-hand.md)).
- A stored value with a version other than 1 is read as empty.

### Name game statistics

A single `NameGameData` value (`version: 1`) with per-student quiz statistics
and the best memory results per round size.

### Class duties

A single `DutyData` value (`version: 1`), `byClass` mapping a class id to its
`ClassDuties` ([decision 0028](decisions/0028-duties-remembered-per-class.md)):

- `duties` – `{ id, name, count }`, at most 12 (`MAX_DUTIES`), a name of up to
  40 characters, 1 to 10 students each.
- `current` – the round on the wall, `null` before the first draw.
- `rounds` – up to 20 earlier rounds (`MAX_DUTY_ROUNDS`), oldest first.

A round is `{ at, assignments }`: an ISO 8601 timestamp and duty id → student
ids. A round may name a student who has since left or a duty since removed;
`trimRound` leaves both out when it is shown or changed.

## Photo store

- Database `spg-student-photos`, object store `photos`. Key: the student id.
  Value: the image blob, re-encoded to a ~160 px JPEG on import, which strips
  EXIF and GPS data.
- The schema version (`STUDENT_PHOTO_STORE_VERSION`, currently 1) sits under the
  reserved key `__photoStoreVersion` and is stamped by the start-up sweep.
- A separate database keeps a photo write from re-serialising the class
  collection and lets photos be wiped on their own.
- Removing a photo or a student is undoable, so the blob is only **scheduled**
  for deletion (`studentPhotoTrash`) and deleted once no undo step can bring the
  student back. A photo back on the list — an undone removal, a new photo — is
  never deleted, whatever was scheduled for it, and an undo or redo that takes
  one off the list schedules it as a removal does. `studentPhotoCache` keeps
  object URLs in memory.

## localStorage

Only preferences and small bits of workflow state; no student data. The full
list is `PROJECT_LOCAL_STORAGE_KEYS` in `storageKeys.ts`. Groups:

- **Appearance:** `spg.theme` (`light` or `dark`; absent, the page follows
  the system's — `utils/ui/themePreference.ts`; the retired `theme` is no
  longer read), `showGrid`, `spg.alignmentGuides`,
  `spg.featureVisibility`, `spg.nameDisplay`, `spg.photos`,
  `spg.badgeDisplay` (which badges the seats show: `all`, `active`, `off`),
  `spg.badgeHover` (`{ tooltip, highlight }`: what pointing at one does),
  `circle-connection-mode` (whether the circle draws the arcs between table
  neighbours, `subtle` or `off`; it predates the prefix), …
  The table plan and the circle share photos, names and badges through
  `CanvasPreferencesContext`; the circle's own `circle-photo-mode` is retired
  and only still listed so a wipe removes it, as is `spg.photoDisplayMode`,
  which `spg.photos` replaced so that every device starts with the photos on
  once — most held the old default `hover` rather than a choice.
- **Presentation and export:** `spg.present.*`, `export.*` — the export keys
  predate the `spg.` prefix and keep their names so existing preferences
  survive. The projection keeps its own contrast mode and name rule
  (`spg.present.contrast`, `spg.present.nameDisplay`): it is read from the back
  row, the editor's plan from 40 cm away. `spg.export.hiddenBadgeFamilies`
  lists the badge families a printout leaves out
  ([decision 0021](decisions/0021-seat-badges-explained.md)), and
  `spg.export.frameOnTables` is `false` once the table plan's sheet shows the
  whole room instead of being framed on the tables, and
  `spg.export.showGenderColors` is `false` once the sheet leaves the gender
  tint off its seats ([decision 0020](decisions/0020-gender-tint-on-seats.md)).
  `spg.export.noteList` holds the note list's settings in one object
  (`NoteListSettings`: form, lines, columns, order, orientation, photos,
  badges), read field by field (`normalizeNoteListSettings`) so a field added
  later starts at its default.
- **Keyboard:** `spg.characterKeyShortcuts` — `false` once the teacher has
  switched off the shortcuts on a single character key ("?", P, F, 1–3, Q/E …)
  in the settings menu, for speech input (WCAG 2.1.4, `utils/characterKeys.ts`).
- **Workflow:** the toolbar's density (`spg.sidebarExpanded`), whether the inspector's column is folded away
  from `lg` up (`spg.inspectorFolded`), class list sort order, first visit, onboarding
  tours seen or switched off (`spg.onboardingTour`,
  [decision 0015](decisions/0015-onboarding-sample-class-and-tour.md)), last
  seen version, PWA install prompt dismissal, and the year the status bar last
  greeted on World Teachers' Day (`spg.teachersDayGreeted`).
- **Backup reminder:** `spg.lastBackupAt`, `spg.backupDataSince`,
  `spg.backupReminderSnoozedUntil`, `spg.backupReminderDisabled`.
- **Consent:** `cookieConsent`, `spg.photoConsentConfirmed`.
- **Migration mirror:** `spg.migrationVersion`, a synchronous copy of the
  IndexedDB value so start-up can skip opening the database when nothing is
  pending.
- **No longer written:** `klassenplan-language`, the language detector's cache.
  The language follows the URL alone (`/en` or not); the key is only removed by
  a data wipe. The same goes for `spg.mixFineTuning`, which remembered whether
  the criteria showed their weights beside the named levels until the fine
  tuning was removed
  ([decision 0018](decisions/0018-criteria-in-words-with-recipes.md)), and for
  `spg.mixWeightHintSeen`, the one-time hint of the round criterion buttons
  under a phone's plan, which gave way to the inspector's drawer.

## Versions and migrations

| What                     | Version                           | Stored in                                    | Behaviour                                                                                                                                                                                               |
| ------------------------ | --------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Class collection         | `CLASS_COLLECTION_VERSION` = 2    | `version` field                              | Stamped on every write. Version 1 has no rooms; reading repairs it (`ensureClassRooms`), and an older build passes over the rooms it does not know                                                      |
| Pre-collection storage   | —                                 | legacy `spg.*` keys                          | Read into a first class when no collection exists                                                                                                                                                       |
| Table template migration | `CURRENT_MIGRATION_VERSION` = 1   | `spg.migrationVersion` + localStorage mirror | `runMigration()` in `src/index.tsx`, before the first render: migrates the room scene, templates and saved plans (`utils/migration/tableMigration.ts`). A failure is logged and does not block start-up |
| App data stamp           | `APP_DATA_VERSION` = 2            | `spg.version`                                | Stamped on every load                                                                                                                                                                                   |
| Plan usage record        | 1                                 | `version` field                              | Other versions read as empty                                                                                                                                                                            |
| Name game statistics     | 1                                 | `version` field                              |                                                                                                                                                                                                         |
| Class duties             | 1                                 | `version` field                              | Other versions read as empty                                                                                                                                                                            |
| Photo store              | `STUDENT_PHOTO_STORE_VERSION` = 1 | `__photoStoreVersion` key                    | Stamped by the start-up sweep                                                                                                                                                                           |
| Backup file              | 2                                 | `version` in the bundle                      | Version 1 files stay importable ([backup-format.md](backup-format.md))                                                                                                                                  |

### Changing a stored shape

1. Bump the version constant next to the store and keep a reader for the old
   shape — installations upgrade whenever the teacher next opens the app, which
   can be months later.
2. Update `src/utils/validation/backupValidation.ts` and
   [backup-format.md](backup-format.md): backups carry the same shapes and are
   imported years after they were written.
3. Add a test that loads the old shape.

## Retention and deletion

| Data                 | Bound                 | Removed when                                                                                 |
| -------------------- | --------------------- | -------------------------------------------------------------------------------------------- |
| Mix history          | 20 per class          | A new shuffle pushes out the oldest                                                          |
| Plan usage records   | 40 per class          | A new record pushes out the oldest; records naming nobody in the class are swept at start-up |
| Saved plans          | none                  | The teacher deletes them                                                                     |
| Student photos       | one per student       | The deletion is committed after undo can no longer reach it; orphans are swept at start-up   |
| Name game statistics | one entry per student | Orphans are swept at start-up                                                                |
| Duty rounds          | 20 per class          | A new round pushes out the oldest; students no longer in the class are swept at start-up     |
| A whole class        | —                     | The teacher deletes it; its photos, statistics and usage records go with the next sweep      |

The orphan sweeps (`sweepOrphanPhotos`, `sweepOrphanNameGameStats`,
`sweepOrphanPlanUsage`, `sweepOrphanDuties`) run once, when `useSeatingPersistence`
loads the classes at start-up — never on a later reload (a class made or deleted
in "Bibliothek", a backup merged), which keeps the open class's undo history: a
student it can still bring back is in no class until then, and the sweep would
take their photo. Nothing expires by age.

### "Delete all data"

The footer action (`useSeatingPersistence.clearAllData`) deletes every key of
the key-value store listed in `DB_KEYS` through the repository, then calls the
shared `clearAllData` helper in `src/services/backup/dataBackup.ts`. That helper wipes
the photo database, the in-memory photo cache, pending photo deletions and every
project localStorage key, and resets the application state. If the photos
cannot be wiped, the action fails and the teacher sees an error instead of a
success message.

Until 2026-09-14 the `skipIndexedDBClear` flag skipped the photo wipe as well,
so photos stayed on the device until the next app start. The migration marker
`spg.migrationVersion` in IndexedDB is not part of `DB_KEYS` and stays; it holds
no personal data.

### Without IndexedDB

Every repository and photo store call fails with a `STORAGE_ERROR`; the plan
usage and name game stores read as empty and skip their writes.
