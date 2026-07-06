# Backup import format

This document describes the structure of JSON backups and the limits that apply
when importing them into Klassenplan.

## Structure overview

A backup (`ExportBundle`) contains the following required fields:

- `version` – current format version (currently `2`; version `1` backups
  without student photos remain importable).
- `students` – list of all students, including status flags.
- `seatingHistory` – stored seating plans together with scenes and optional locks.
- `mixHistory` – history of automatically generated seating arrangements.
- `classroomScene` – the currently active classroom layout.
- `classroomScene.features` – optional room features (windows, doors, blackboard, teacher's desk) as `ClassroomFeature`.
- `mixSettings` – most recently used weights for the shuffle algorithm.
- `lockedPositions` – fixed seat assignments for individual students.
- `classroomTemplates` – saved layout templates.

Optional fields (version ≥ 2):

- `studentPhotos` – map of student id → downscaled photo as `data:image/…`
  Data URL (each at most 96 KB, at most 2,000 entries).
- `classCollection`, `circleLayouts`, `currentCircleLayout` – multi-class and
  seating-circle state.

Inside the nested objects, the same structures apply as in the application's
TypeScript types (`Student`, `SavedPlan`, `MixResult`,
`ClassroomScene`, `MixSettings`, `LockedPositions`, `ClassroomTemplate`).

## Size limits

To detect malicious or corrupted backups, the following upper limits apply on
import (see `BACKUP_LIMITS` in
[`src/utils/validation/backupValidation.ts`](../src/utils/validation/backupValidation.ts)):

- Maximum file size of the encrypted backup: **16 MB**.
- Maximum size of the decrypted JSON payload: **12 MB**.
- At most **36** entries in `students` (`MAX_STUDENTS`).
- At most **200** entries in `seatingHistory` and `mixHistory`.
- At most **100** entries in `classroomTemplates`.
- At most **500** entries in `lockedPositions`.
- At most **150** tables per `classroomScene` with at most **12** seats each.
- At most **2,000** entries in `studentPhotos`, each Data URL at most **96 KB**.

## Encryption

Backups are encrypted symmetrically with the browser's Web Crypto API. The
primitives are implemented in
[`src/hooks/useDataBackup.ts`](../src/hooks/useDataBackup.ts)
(`deriveKey`, `encryptJson`, `decryptJson`):

| Parameter             | Value                                                                                     |
| --------------------- | ----------------------------------------------------------------------------------------- |
| Key derivation (KDF)  | PBKDF2                                                                                    |
| KDF hash              | SHA-256                                                                                   |
| KDF iterations        | 600,000 (stored in the envelope; legacy files without a `kdf` field decrypt with 250,000) |
| Salt                  | 16 bytes, random per export (`crypto.getRandomValues`)                                    |
| Encryption            | AES-GCM, 256 bit                                                                          |
| IV (nonce)            | 12 bytes, random per export (`crypto.getRandomValues`)                                    |
| Additional data (AAD) | `klassenplan-backup-v1` (UTF-8, integrity binding)                                        |

The resulting JSON document has the following structure:

```json
{
  "encrypted": true,
  "kdf": { "name": "PBKDF2", "hash": "SHA-256", "iterations": 600000 },
  "iv": "<12-byte nonce as Base64>",
  "salt": "<16-byte salt as Base64>",
  "data": "<AES-GCM ciphertext as Base64>"
}
```

Each export uses a fresh salt and IV. The password is chosen by the user on
export (minimum 8 characters, confirmed with a second prompt) and is never
stored; without the correct password, decryption is impossible. On import, a
declared `kdf.iterations` value outside 100,000–10,000,000 is rejected so a
tampered envelope can neither weaken the derivation nor stall the browser.

## Type definitions & validation

- The full type definitions live in [`src/types/index.ts`](../src/types/index.ts) (`ExportBundleV1`, `Student`, `ClassroomScene`, …).
- Runtime validation happens in [`src/utils/validation/backupValidation.ts`](../src/utils/validation/backupValidation.ts). The export `parseExportBundle(json: string)` checks size limits, structure, and field types and then returns an `ExportBundle`.
- `src/utils/data/dataBackup.ts` uses the parser both for exports (writing) and for imports (reading and merging backups). Tests in `src/utils/__tests__/backupValidation.test.ts` cover all edge cases.
