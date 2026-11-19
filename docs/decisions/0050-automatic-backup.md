# 0050 – A backup that writes itself, under a password set once

- **Status:** accepted
- **In place since:** — (the next release)
- **Sources:** the review "Schneller, leichter, einfacher" of 2026-11-17
  (B3; the password chosen by the maintainer on 2026-11-19),
  [school-deployment.md](../school-deployment.md#keeping-the-data),
  `src/hooks/useAutoBackup.ts` with `src/hooks/autoBackupRunner.ts` (loaded
  when first needed), `src/repositories/autoBackupStore.ts`,
  `src/utils/data/backupCrypto.ts`, `src/utils/data/autoBackup.ts`,
  `src/hooks/persistence/autoBackupStatus.ts`

## Context

The classes live in the browser profile. School computers that reset
profiles or delete site data on exit, and every new computer, lose them. The
backup was a button and a reminder after 30 days; a teacher who forgot it
lost the term's plans.

A backup is encrypted with a password the teacher types each time and that
is never stored. A backup that writes itself cannot ask, and a backup without
a password would put the pupils' names and markers unencrypted on OneDrive or
the school's network drive.

## Decision

In Chrome and Edge on the desktop (`showDirectoryPicker`, a secure address)
"Backup" offers "Automatisch sichern …": the teacher chooses a folder, then a
password for the automatic backup. From then on, once a day after a class
changed, Klassenplan writes `klassenplan-auto-YYYY-MM-DD.klassenplan` into that
folder and keeps the newest seven; files of the teacher's own stay. It looks
when the app starts, every five minutes and when the page goes to the
background. Each file is an ordinary backup: "Backup importieren" opens it
with that password on any device.

- **The password is not kept, a key is.** PBKDF2 derives an AES-GCM key from
  it once, with a salt of its own, and IndexedDB keeps that key under
  `spg.autoBackup` with the folder's handle. The key is not extractable and
  may only encrypt: whoever reaches the browser profile can write a backup
  with it, never read one. Every file carries the salt and the iterations in
  its envelope, so the password derives the same key again.
- **After a restart the browser asks for the folder again** — a tab, unlike
  the installed app, keeps no lasting permission. Asking needs a click, so
  the status bar shows "Sicherung fortsetzen" while a file is due and waits.
- **A written file counts as a backup**: the reminder after 30 days starts
  again.
- Firefox and Safari keep the reminder alone; they have no folder to write to.

## Alternatives considered

- **No encryption.** Easiest, but the classes would lie readable in a folder
  that is often shared or synchronised — against the rule that a backup is
  always encrypted (docs/SECURITY.md).
- **Asking for the password every time.** The backup would not write itself.
- **Keeping the password, or a key that also decrypts.** Anyone with the
  profile could then open every backup; the encrypt-only key gives them
  nothing to read.
- **The Origin Private File System.** Lies inside the same profile that is
  lost — what the backup is there to survive.

## Consequences

- A teacher who forgets the password cannot restore the automatic backups;
  the menu says so when it asks for it. Setting the backup up anew takes a
  new password and goes on in a folder of one's choice.
- The folder handle and the key never go into a backup or to another device;
  there the teacher sets the backup up again.
- Files a teacher deletes in the folder are not written again until the next
  change; one renamed stops counting among the seven.
- "Alle Daten löschen" removes the settings with everything else; the files
  in the folder stay, as files the teacher saved do.
