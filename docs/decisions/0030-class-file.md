# 0030 – A class can be saved to a file and opened from one

- **Status:** proposed
- **In place since:** —
- **Sources:** [school-deployment.md](../school-deployment.md#keeping-the-data),
  [backup-format.md](../backup-format.md),
  [decision 0001](0001-offline-first-no-server.md)

## Context

Everything a teacher enters lives in the browser profile
([0001](0001-offline-first-no-server.md)). On many school computers that
profile does not survive: mandatory or temporary profiles, shared-device modes
and browsers that clear site data on exit wipe the classes at sign-out. The
backup carries all classes at once and is meant for moving to a new device, not
for taking one class from the classroom computer to the staff room and back.

Teachers already keep their documents as files — on a USB stick, a network
drive, a school cloud folder. A class should be able to live there too.

## Decision

- **A class file is a backup that holds one class**: the class with its rooms,
  plans, mixes and circle, the photos of its students, its plan usage record and
  its duties — no room templates and no other class. It uses the backup's
  encrypted envelope (AES-GCM, PBKDF2, see [backup-format.md](../backup-format.md))
  and its extension, `.klassenplan`; a new field `scope: "class"` in the
  decrypted bundle tells it from a full backup.
- **Encrypted with a password**, like the backup, because the file leaves the
  browser and holds names, photos and attributes of minors. The password is
  asked once per session and per class and kept in memory only, never stored.
- **Saved and opened by hand**, like a document: "Als Datei speichern" and "Aus
  Datei öffnen" in the class menu of the header. That works in every browser.
  Where the browser can keep a file handle (Chrome and Edge, File System Access
  API), the class remembers its file, and saving again writes to it without a
  dialog; elsewhere every save is a download.
- **Opening a class that is already on the device asks**, naming when each side
  was last changed: "Datei übernehmen" replaces the class here with the file's,
  "Als neue Klasse öffnen" adds it beside it with fresh ids for the class and
  its students, so photos and plan usage stay apart.
- **One way in**: a class file chosen under "Backup importieren", opened with
  "Aus Datei öffnen" or double-clicked into the installed app
  (`src/hooks/pwa/useBackupFileLaunch.ts`) takes the class route; a full backup
  keeps the restore route (replace or merge).

## Alternatives considered

- **No encryption.** Simpler and no password to forget, but a lost USB stick
  would expose the class. Rejected: only encrypted data leaves the browser so
  far, and this keeps it that way.
- **A live link** in which every change goes to the file at once. Only possible
  in Chrome and Edge, and it fails in ways a teacher cannot see — a network
  drive that is gone, two computers writing the same file. Not now; a manual
  save can grow into it later.
- **An extension of its own** (`.klasse`). Easier to tell apart by name, but a
  second file type to register and explain; the content already says what it
  is.
- **The file always wins**, or **always a new class**. The first loses work done
  on this device without asking, the second fills the class list with copies.

## Consequences

- The backup format gains the optional field `scope`. A bundle without it is a
  full backup, as before. Older versions of the app ignore the field: their
  merge adds the class, their replace would put the one class in place of
  everything — they offer only `.json` in their file dialog, which keeps that
  case rare.
- A teacher with a class on a stick has two copies, the file and the one in the
  browser. Nothing syncs them; the dialog on opening is the only guard.
- Losing the password loses the file's content, as with the backup.
- The file handle and the remembered password belong to the device and the
  session; neither travels with the class.
