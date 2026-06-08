# Backup import format

This document describes the structure of JSON backups and the limits that apply
when importing them into Klassenplan.

## Structure overview

A backup (`ExportBundle`) contains the following required fields:

- `version` – current format version (currently `1`).
- `students` – list of all students, including status flags.
- `seatingHistory` – stored seating plans together with scenes and optional locks.
- `mixHistory` – history of automatically generated seating arrangements.
- `classroomScene` – the currently active classroom layout.
- `classroomScene.features` – optional room features (windows, doors, blackboard, teacher's desk) as `ClassroomFeature`.
- `mixSettings` – most recently used weights for the shuffle algorithm.
- `lockedPositions` – fixed seat assignments for individual students.
- `classroomTemplates` – saved layout templates.

Inside the nested objects, the same structures apply as in the application's
TypeScript types (`Student`, `SavedPlan`, `MixResult`,
`ClassroomScene`, `MixSettings`, `LockedPositions`, `ClassroomTemplate`).

## Size limits

To detect malicious or corrupted backups, the following upper limits apply on
import:

- Maximum file size of the encrypted backup: **2 MB**.
- Maximum size of the decrypted JSON payload: **1 MB**.
- At most **500** entries in `students`.
- At most **200** entries in `seatingHistory` and `mixHistory`.
- At most **100** entries in `classroomTemplates`.
- At most **500** entries in `lockedPositions`.
- At most **150** tables per `classroomScene` with at most **12** seats each.

## Encryption

Backups are encrypted symmetrically with the browser's Web Crypto API. The
following primitives are implemented in [`src/hooks/useDataBackup.ts`](../src/hooks/useDataBackup.ts) (lines 57–109):

| Parameter | Value |
|---|---|
| Key derivation (KDF) | PBKDF2 |
| KDF hash | SHA-256 |
| KDF iterations | 250,000 |
| Salt | 16 bytes, random per export (`crypto.getRandomValues`) |
| Encryption | AES-GCM, 256 bit |
| IV (nonce) | 12 bytes, random per export (`crypto.getRandomValues`) |
| Additional data (AAD) | `klassenplan-backup-v1` (UTF-8, integrity binding) |

The resulting JSON document has the following structure:

```json
{
  "encrypted": true,
  "iv": "<12-byte nonce as Base64>",
  "salt": "<16-byte salt as Base64>",
  "data": "<AES-GCM ciphertext as Base64>"
}
```

Each export uses a fresh salt and IV. The password is never stored; without the correct password, decryption is impossible.

## Type definitions & validation

- The full type definitions live in [`src/types/index.ts`](../src/types/index.ts) (`ExportBundleV1`, `Student`, `ClassroomScene`, …).
- Runtime validation happens in [`src/utils/validation/backupValidation.ts`](../src/utils/validation/backupValidation.ts). The export `parseExportBundle(json: string)` checks size limits, structure, and field types and then returns an `ExportBundle`.
- `src/utils/data/dataBackup.ts` uses the parser both for exports (writing) and for imports (reading and merging backups). Tests in `src/utils/__tests__/backupValidation.test.ts` cover all edge cases.
