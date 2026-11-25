# 0049 – Every class under a key of its own

- **Status:** accepted
- **In place since:** — (the next release)
- **Sources:** the review "Schneller, leichter, einfacher" of 2026-11-17
  (S2 and B2, chosen by the maintainer on 2026-11-19),
  [decision 0035](0035-seats-stored-by-id.md) (seats as ids),
  `src/repositories/classStorage.ts`, `src/repositories/IndexedDBRepository.ts`,
  `src/hooks/useDataBackup.ts` (`restoreClassesFromBeforeUpdate`),
  `src/repositories/__tests__/classStorage.property.test.ts`,
  `src/repositories/__tests__/IndexedDBRepository.classStorage.test.ts`

## Context

Up to version 3 every class of the device sat in one IndexedDB value,
`spg.classCollection`. Every save of the open class — the persist queue writes
after each change — read that value, put the students back on every seat of
every class (0035), took the change, turned every seat back into an id and
wrote it all, on the main thread. Measured on an M1, without IndexedDB's own
write, with 30 students, 15 plans and 20 mixes per class:

| Classes | Before  | After  |
| ------- | ------- | ------ |
| 1       | 0.5 ms  | 0.6 ms |
| 6       | 3.0 ms  | 0.5 ms |
| 12      | 6.0 ms  | 0.5 ms |
| 24      | 12.4 ms | 0.5 ms |

On the slow reference device (CPU ÷6, `npm run measure:slow-device`) six
classes already cost a frame per save, 24 about 75 ms.

A switch of the stored shape is the moment data can be lost: the new shape is
written on the first start after the update, and a fault in the migration that
the tests missed leaves only a backup, if the teacher has one (B2).

## Decision

Since version 4 of the class storage (`CLASS_STORAGE_VERSION`) each class lies
under `spg.class:<id>` as `{ version, record }`, the record in its stored form
(seats as ids). `spg.classIndex` holds `{ version, activeClassId, order }`:
which classes there are, in which order, and which one opens next. Saving a
class reads and writes that class alone, in one transaction as before.

- **The index is the truth.** A class is written before the index names it and
  goes out of the index before its key goes; a key the index does not name is
  left over and is removed at start-up once it is older than ten minutes, so a
  class another tab is creating in that moment stays. A restore that replaces
  every class writes the new ones, then the index, then removes the rest: a
  failure before the index leaves the classes as they were.
- **The switch happens once per device**, on the first read of a version that
  knows version 4: the collection — or the keys from before there were classes
  — is repaired as before and split. A class or an index another tab wrote
  first stays.
- **The classes from before stay 30 days** (B2). `spg.classCollection` keeps its
  value, marked with `retiredAt` and `retiredFromVersion`; its `version`
  becomes 4, so a window still running 3.4.1 reads it and writes nothing over
  it (`newerStoredData`). In those 30 days the backup menu offers "Stand vor
  dem Update …", which restores them as a backup is restored with "Alles
  ersetzen": everything stays as it is now but the classes. After the 30 days
  the classes go and the marker stays, without classes, for the same reason.
- **The app sees none of it.** The repository hands out and takes a whole
  `ClassCollectionState` as before; the backup format does not change.

## Alternatives considered

- **One object store per class, or a store with an index, through `idb`.**
  Faster to list, but a second IndexedDB library beside idb-keyval, or a
  schema with upgrades of its own; the key-value store does what is needed.
- **Keeping the collection and only saving less often.** The cost per save
  stays and grows with every class; saving less often risks more on a crash.
- **One transaction over the index and the class.** idb-keyval offers none,
  and the order above makes a stop between the two harmless.

## Consequences

- A save costs the same with one class as with 24.
- Two tabs that create classes with the same name in the same instant can both
  succeed: the name is checked before the write, no longer inside one
  transaction with all classes.
- A tab whose open class another tab deleted no longer writes its state into
  the class it moves on to; the write is refused, and the tab reloads when it
  comes to the front.
- A window of 3.4.0 or earlier — before the newer-data guard — still writes
  its classes into `spg.classCollection`, which nobody reads any more: what it
  changes is lost. 3.4.1 shipped the guard for this reason first.
- "Alle Daten löschen" removes every `spg.class:` key besides the fixed ones.
- The next change of a stored shape keeps the old value for 30 days the same
  way (`docs/data-model.md`, "Changing a stored shape").

## Addendum of 2026-11-24: what the review before the release found

The review of 2026-11-22 (N42, N43 and N44 on its checklist) brought three
changes the maintainer chose:

- **A replace that stops puts the classes back.** A backup of this device
  brings classes of the same id, which a replace overwrites in place before
  the index names the new set; the promise above held for new ids only.
  `writeStoredCollection` now reads what stands under those ids first and
  writes it back — or removes a class that was not there — when the replace
  stops before the index.
- **Opening a class changes nothing in it.** `setActiveClass` and the class
  a deletion moves on to note `lastUsedAt` alone, as `markOpenClassOpened`
  did: `updatedAt` is what another window and the automatic backup tell a
  change by. A window whose open class was deleted elsewhere tells it by the
  class it moves on to, not by a stamp that may match.
- **Whether the classes from before are kept is asked once per window**
  (`hasRetiredClasses`), without reading them as classes; the toolbar's foot
  asked on every layer and put every old class on its seats to answer.

## Addendum of 2026-11-25: a window still on 3.4.0

The consequence above — what a window of 3.4.0 or earlier changes is lost —
is too dark, as the same review found (A10) in the code of 3.4.0. Such a
window reads the copy as its collection, changes it and spreads the rest
back, so `retiredAt` stays and its change lands in the copy: for the 30 days
"Stand vor dem Update" offers it, the way back to work done there after the
switch. The question dates the copy by its newest change, no longer by the
switch alone. Only that window's "Alles ersetzen" writes a collection
without the marker; the index stays the truth, the copy is no more, and the
classes are in the backup file it restored. Tests in
`IndexedDBRepository.classStorage.test.ts` write as 3.4.0 does.
