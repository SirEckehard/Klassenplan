# 0002 – One IndexedDB entry point, repositories return a `Result`

- **Status:** accepted
- **Sources:** module comments in `src/repositories/idbClient.ts`,
  `src/repositories/studentPhotoStore.ts`, `src/utils/data/storageKeys.ts`;
  [ERROR-HANDLING.md](../ERROR-HANDLING.md)

## Context

Several modules persist data: the class repository, the photo store, the plan
usage record, the name game statistics, the start-up migration and the backup
import. Storage fails in ordinary situations — full quota, private mode, a
browser without IndexedDB — and the callers differ in what such a failure means
to them.

## Decision

- `src/repositories/idbClient.ts` is the only module that imports `idb-keyval`.
  It offers plain functions that reject, for callers with their own error
  handling, and `try…` variants that return a `Result` and log the failure.
- Repositories and stores return `Result<T>` instead of throwing; hooks map the
  failure to a toast or a log entry.
- Student photos get a database of their own (`spg-student-photos`).

The reasons given in the code: the storage driver stays swappable, error
handling is uniform, and there is one place to answer "who writes to the
database?". Photos are separate so that writing one photo never re-serialises
the whole class collection, and so they can be wiped on their own.

## Alternatives considered

None recorded.

## Consequences

- The class collection is a single value; every write replaces it
  ([data-model.md](../data-model.md#class-collection)).
- Without IndexedDB, repository and photo calls fail with `STORAGE_ERROR`
  instead of crashing.
- The rule is written in `AGENTS.md` but not enforced by a linter.
