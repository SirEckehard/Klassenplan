# Data Model

> **Status:** current · **Last reviewed:** 2026-09-16 · **Source of truth:**
> `src/utils/data/storageKeys.ts`, `src/types/`, `src/repositories/`

Everything Klassenplan stores lives in the teacher's browser. This document
lists where it lives, in which shape, how those shapes are versioned and when
data is removed. Stored data outlives any release, so these shapes are among the
hardest things in the project to change. The backup file format has its own
document: [backup-format.md](backup-format.md).

## Overview

| Store           | Location                                                                  | Holds                                                                                |
| --------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Key-value store | IndexedDB, idb-keyval's default database (`keyval-store`, store `keyval`) | Class collection, room templates, circle exports, plan usage record, name game stats |
| Photo store     | IndexedDB database `spg-student-photos`, object store `photos`            | One image blob per student                                                           |
| localStorage    | The origin's localStorage                                                 | UI preferences, backup reminder state, a migration mirror — no student data          |

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
  version: number; // CLASS_COLLECTION_VERSION, currently 1
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
}
```

- **One record per class.** A class's students, plans, room and weights all
  live inside its record; switching classes means reading a different record.
- **The whole collection is one value.** Every write replaces
  `spg.classCollection` as a whole. `IndexedDBRepository` serialises its
  operations through a promise chain and keeps the collection cached in memory.
  This is also why photos have a store of their own.
- **`activeClassId` repairs itself on read** (`ensureActiveClass`): an unknown or
  missing id falls back to the first class.
- **`seatingHistory` holds saved plans**, not a log. At most one entry carries
  `autoSaved: true`; the next silent auto-save overwrites it.
- **`SavedPlan.date`** is an ISO date (`YYYY-MM-DD`). Older entries hold a
  pre-formatted German string; render both through `formatStoredDate`.
- **`mixHistory`** keeps the last `MIX_HISTORY_LIMIT` (20) shuffle results, each
  as the arrangement after refinement
  ([decision 0014](decisions/0014-mix-history-records-refined-plan.md)).
- **`lockedPositions`** maps a student id to `{ table, seat }`.
- **Partner wishes** are stored as `wishPartnerIds` / `avoidPartnerIds`. The
  single-value fields `wishPartnerId` / `avoidPartnerId` predate them;
  `migrateStudentPartnerFields` converts them on load, and the CSV import still
  fills both for compatibility.
- **Photos are not part of the record.** A student only carries `hasPhoto`.

### How changes reach storage

State is not written where it changes. `useClassDataPersistence` compares the
nine persistable fields of the active class — `students`, `seatingHistory`,
`mixHistory`, `currentSeating`, `lockedPositions`, `mixSettings`,
`classroomScene`, `circleLayout`, `activePlanId` — on every render and queues the
ones that changed. `usePersistQueue` then:

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
[ARCHITECTURE.md](ARCHITECTURE.md#switching-classes). Write failures reach the
teacher as a toast through `usePersistErrorHandling`.

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
- A stored value with a version other than 1 is read as empty.

### Name game statistics

A single `NameGameData` value (`version: 1`) with per-student quiz statistics
and the best memory results per round size.

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
  student back. `studentPhotoCache` keeps object URLs in memory.

## localStorage

Only preferences and small bits of workflow state; no student data. The full
list is `PROJECT_LOCAL_STORAGE_KEYS` in `storageKeys.ts`. Groups:

- **Appearance:** `theme`, `showGrid`, `spg.alignmentGuides`,
  `spg.featureVisibility`, `spg.nameDisplay`, `spg.photoDisplayMode`, …
- **Presentation and export:** `spg.present.*`, `export.*` — the export keys
  predate the `spg.` prefix and keep their names so existing preferences survive.
- **Workflow:** sidebar state, class list sort order, first visit, onboarding
  tours seen or switched off (`spg.onboardingTour`,
  [decision 0015](decisions/0015-onboarding-sample-class-and-tour.md)), last
  seen version, PWA install prompt dismissal.
- **Backup reminder:** `spg.lastBackupAt`, `spg.backupDataSince`,
  `spg.backupReminderSnoozedUntil`, `spg.backupReminderDisabled`.
- **Consent:** `cookieConsent`, `spg.photoConsentConfirmed`.
- **Migration mirror:** `spg.migrationVersion`, a synchronous copy of the
  IndexedDB value so start-up can skip opening the database when nothing is
  pending.
- **No longer written:** `klassenplan-language`, the language detector's cache.
  The language follows the URL alone (`/en` or not); the key is only removed by
  a data wipe.

## Versions and migrations

| What                     | Version                           | Stored in                                    | Behaviour                                                                                                                                                                                               |
| ------------------------ | --------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Class collection         | `CLASS_COLLECTION_VERSION` = 1    | `version` field                              | Stamped on every write                                                                                                                                                                                  |
| Pre-collection storage   | —                                 | legacy `spg.*` keys                          | Read into a first class when no collection exists                                                                                                                                                       |
| Table template migration | `CURRENT_MIGRATION_VERSION` = 1   | `spg.migrationVersion` + localStorage mirror | `runMigration()` in `src/index.tsx`, before the first render: migrates the room scene, templates and saved plans (`utils/migration/tableMigration.ts`). A failure is logged and does not block start-up |
| App data stamp           | `APP_DATA_VERSION` = 2            | `spg.version`                                | Stamped on every load                                                                                                                                                                                   |
| Plan usage record        | 1                                 | `version` field                              | Other versions read as empty                                                                                                                                                                            |
| Name game statistics     | 1                                 | `version` field                              |                                                                                                                                                                                                         |
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

| Data                 | Bound                 | Removed when                                                                             |
| -------------------- | --------------------- | ---------------------------------------------------------------------------------------- |
| Mix history          | 20 per class          | A new shuffle pushes out the oldest                                                      |
| Plan usage records   | 40 per class          | A new record pushes out the oldest; records naming nobody in the class are swept on load |
| Saved plans          | none                  | The teacher deletes them                                                                 |
| Student photos       | one per student       | The deletion is committed after undo can no longer reach it; orphans are swept on load   |
| Name game statistics | one entry per student | Orphans are swept on load                                                                |
| A whole class        | —                     | The teacher deletes it; its photos, statistics and usage records go with the next sweep  |

The orphan sweeps (`sweepOrphanPhotos`, `sweepOrphanNameGameStats`,
`sweepOrphanPlanUsage`) run whenever `useSeatingPersistence` applies a loaded
class collection. Nothing expires by age.

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
