# 0035 – Stored seats name their students by id

- **Status:** accepted
- **In place since:** v3.3.0 (2026-11-05)
- **Sources:** the review of 3.2.3 on 2026-11-01 (findings H4 and E2, the
  maintainer's choice of "only ids in storage"), the review of 3.1.0 on
  2026-10-10 (D5, set aside until measured), `src/utils/data/storedSeating.ts`,
  `src/repositories/IndexedDBRepository.ts`,
  `src/utils/validation/backupValidation.ts`, `src/services/backup/dataBackup.ts`,
  [backup-format.md](../backup-format.md), [data-model.md](../data-model.md)

## Context

A seating arrangement is a list of tables holding students
(`SeatingArrangement`, `(Student | null)[][]`). The app works with it in that
form, and it was stored in that form too: every saved plan, every one of the
twenty mixes a class keeps, every parked room and every circle carried a full
copy of each seated student — name, markers, partner lists.

Measured on the sample class (24 students, ten saved plans, twenty mixes), a
class took 286 KB stored and 512 KB in the indented backup; a mix alone some
13 KB. A subject teacher's school year of some thirteen classes with photos
went past the 12 MB the backup import took, and the export never said so
(finding H4, fixed separately: compact JSON, an export that refuses what the
import would refuse, higher limits).

The copies also kept the class as it was: a plan named a student by the name
they had when it was saved, and showed one deleted since. Every place that
puts a plan on screen therefore synchronised it with the class first
(`syncSeatingWithStudents`), so the copies were carried but never shown.

## Decision

Storage holds who sits where by id; the app keeps working with students.

- `src/utils/data/storedSeating.ts` converts at the boundary.
  `dehydrateCollection` turns every seat of `currentSeating`, of the plans,
  the mixes and the parked rooms into its student's id and every place of a
  circle into a `studentId`; `hydrateCollection` puts the class's students
  back, as they are now. A seat whose student is gone is empty, a place of a
  circle whose student is gone is dropped, and every table keeps its number of
  seats, so a plan still fits the tables it was made for.
- `IndexedDBRepository` dehydrates wherever it writes the class collection and
  hydrates wherever it reads it — the read, the change in one transaction, the
  replacement by a restore, the migration of data from before classes.
  `CLASS_COLLECTION_VERSION` is 3.
- The backup follows: export version 3 writes ids (`dehydrateExportBundle`),
  and `parseExportBundle` validates either form and hydrates
  (`hydrateExportBundle`), so the import works with students whatever the
  version.
- Reading takes both forms, everywhere: a seat that holds a whole student, as
  data and backups written before this decision do, counts by its id.

## Alternatives considered

- **Leave the copies and fix H4 alone.** Compact JSON and higher limits make
  the backup restorable again; the stored data would still be six times the
  size, and every write of the open class rewrites the whole collection.
- **Ids in the live state as well.** Every view, the algorithm and the exports
  read students from the seats; changing all of them would touch most of the
  app for no gain a teacher sees, while the boundary keeps the change in one
  module.
- **Keep the open arrangement whole for older tabs.** A tab still running a
  build from before (the update model lets one run until it is reloaded,
  [decision 0009](0009-prompt-update-model.md)) reads ids where it expects
  students. Storing `currentSeating` whole would spare that tab's open plan
  but keep two formats in one record; not taken, see the consequences.

## Consequences

- A class takes about a sixth of the space: 47 KB instead of 286 KB for the
  measured class, and the backup shrinks alike.
- A saved plan, a mix and a parked room show the class as it is now — a
  renamed student under the new name, a deleted one nowhere — which is what
  opening one showed already. The fulfilment read for a saved plan in
  "Bibliothek" takes the students' markers as they are now.
- Data written by this version cannot be read by an earlier one. A tab that
  still runs an earlier build and reloads the open class after this version
  wrote it may show an error card in the layer; reloading the page gives it
  the current build, and nothing it wrote meanwhile is lost, since every seat
  it writes is read again. An operator who goes back to an earlier version
  restores a backup that version made; a version 3 backup is refused by the
  earlier import as an unsupported version.
- A new place that stores students on seats goes through `storedSeating.ts`,
  in both directions.
