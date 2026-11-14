# 0046 – A room template or a preset as a file of its own

- **Status:** accepted
- **In place since:** — (the next release)
- **Sources:** the maintainer's choices of 2026-11-12 on the checklist
  "Klassenplan Ausbau 3.4" (one extension, the content decides),
  [decision 0030](0030-class-file.md),
  [decision 0038](0038-own-mixing-presets.md),
  [backup-format.md](../backup-format.md#room-templates-and-presets-as-files),
  `src/utils/data/shareFiles.ts`, `src/hooks/library/useShareFiles.ts`,
  `src/hooks/useDataBackup.ts`

## Context

Teachers who share a building share its rooms: the chemistry lab with its
benches, the room 204 every class of the year uses. A preset that suits a
subject suits the colleague who teaches it too. Until now the only way to
hand either on was a backup, which carries every class and its students,
needs a password, and on a merge brings everything along.

## Decision

- **A file per template or preset.** In "Bibliothek", the inspector of a room
  template ("Als Datei speichern", once it has tables) and of an own or a
  changed shipped preset writes a file: `Raumvorlage Raum 204.klassenplan`,
  `Voreinstellung Stillarbeit.klassenplan`. Neither holds anything about a
  student, so the file is **plain JSON, not encrypted**: `format`
  (`klassenplan-room-template` or `klassenplan-mix-preset`), `version` 1,
  `app`, `savedAt`, and `template` (`name`, `scene`) or `preset` (`name`,
  `weights`, `criteriaVersion`).
- **One extension, the content decides**, as 0030 proposes for a class file. The
  file takes the way a backup takes — the restore's file dialog, "Aus Datei
  öffnen …" in the library's toolbar, a double-click in the installed app —
  and `importBackupFile` reads `format` before it looks for the encrypted
  envelope. No password is asked.
- **Checked as a backup's part:** `readSharedFile` wraps the backup's own
  template and preset validators (`validateSharedTemplate`,
  `validateSharedPreset`), refuses a file over 1 MB, a version above 1 and a
  `klassenplan-…` format it does not know ("from a newer version"), and reads
  the weights the way the preset store does (missing criteria off, older
  weights lifted).
- **Asked, then added beside what is here.** A quiet dialog names what the
  file brings — the tables and seats, or the criteria by level — and
  "Übernehmen" adds it under a name of its own, "Raum 204 (2)" where "Raum
  204" is taken; a preset never takes a shipped preset's name. Nothing is
  replaced. A preset arrives as the teacher's own, a changed shipped one
  included. "Bibliothek" chooses what came, and undo takes it back; elsewhere a
  toast says it came, and the room layer's template list takes it in.

## Alternatives considered

- **Extensions of their own** (`.klassenplan-raum`, `.klassenplan-mischung`):
  recognisable by name, but two more registrations and two more things to
  explain. The file's name says what it is instead.
- **Encrypting these files too.** Nothing in them is personal; a password
  would only stand between two colleagues.
- **Overwriting a template of the same name.** A colleague's "Raum 204" may
  not be one's own; a number keeps both, and renaming is a keystroke.
- **Opening without a question.** The installed app opens a file on a
  double-click, and a file from a colleague is worth a look before it lands.

## Consequences

- **No stored shape changes:** an opened file becomes an ordinary template or
  own preset, and the backup carries it as before.
- **The limit of own presets** (`MAX_MIX_PRESETS`) holds for files too; the
  teacher hears it and deletes one first.
- **A later app** that adds a field reads version-1 files as they are; one that
  changes their meaning raises `version`, which this app then declines with a
  message instead of guessing.
- A scene keeps its table ids. They name tables only within a room (decision
  0036), so a colleague's ids clash with nothing here.

## Addendum of 2026-11-14: where a file is opened

One "Aus Datei öffnen …" at the foot of the library's additions was hard to
find and did not say what it opens (the maintainer's note of 2026-11-14). The
library now has an entry beside each "new": "Raumvorlage aus Datei …" after
"Neue Raumvorlage", "Voreinstellung aus Datei …" after "Neue Voreinstellung".
Both open the same file dialog, and the file's content still decides: a preset
picked through the first entry is added as a preset. The room layer's
"Vorlagen" offers "Raum aus Datei öffnen …" below its menu of templates, the
teacher's word for what the file brings there; the template joins that menu.
