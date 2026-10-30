# 0034 – A sheet for the substitute, with names and nothing else

- **Status:** accepted
- **In place since:** unreleased
- **Sources:** the maintainer's decisions of 2026-10-30 (a view of its own on
  the export page; no badges, no gender tint, no lines in the circle, without
  a switch; photos and the class info only when asked for; a note for this
  sheet alone, never stored; the room, the day of the cover and lines to write
  on; full names by default; the seating plan or the circle; reached from the
  export page alone), [decision 0001](0001-offline-first-no-server.md),
  [ARCHITECTURE.md](../ARCHITECTURE.md#non-goals),
  `src/utils/ui/substituteSheet.ts`, `src/components/scene/SheetNotesBand.tsx`,
  `src/pages/Export.tsx`

## Context

A teacher who is off sick or on a trip leaves the class to a colleague who
often knows none of the names. A seating plan with names is what that
colleague needs, and it was asked for as "sharing the class": a link on
klassenplan.de, valid until a date or for one visit, with a mode for the class
team that shows everything and one for the substitute that shows names only.

A link that expires or can be revoked needs a server that keeps the class,
which [decision 0001](0001-offline-first-no-server.md) and the non-goals rule
out ("no accounts, no sync, no sharing"): the operator would hold names and
attributes of minors for every school that used it. What the substitute needs
is a sheet, and the export page already prints one — but with whatever the
teacher's own printout carries: badges for restlessness or shyness, the gender
tint, the class's notes. Those settings are remembered, so a substitute's copy
would carry what the teacher set for the plan on their own desk, unless they
remembered to switch everything off and on again.

## Decision

- **A view of its own**, "Vertretung", the fourth entry under "Ansicht" in the
  export page's toolbar (`ExportView` `'substitute'`). It shows the seating
  plan or the circle — a choice in its inspector, starting with the one the
  page was opened on — and is greyed out while there is no plan. It is
  reached from the export page alone.
- **What it never carries, without a switch:** the badges, the gender tint,
  the legend that explains them and the circle's lines between table
  neighbours. `substituteRenderOptions` is the one place the sheet's render
  options are built, and it sets them off whatever is stored.
- **What it carries when asked:** photos (off by default — they help to put
  names to faces, but the sheet goes to someone from outside the class and
  may lie in a pigeonhole) and the class info, school year and notes (off by
  default — a class's notes may say anything).
- **What it always says:** the class in the header, with the room when the
  switch is on (a class may have several, decision
  [0024](0024-rooms-of-a-class.md)), and the day of the cover in place of the
  printing date, today unless another day is set.
- **A note and lines to write on**, in a band at the foot of the sheet
  (`SheetNotesBand`): the note is typed in the inspector for this sheet alone,
  kept while the page is open and never stored — no field on the class, nothing
  in the backup or the class file. The lines (none, three or six) are for the
  substitute's pen: who was missing, what was done.
- **Its own settings**, in one object (`spg.export.substitute`,
  `SubstituteSheetSettings`): the name rule (full names by default — the
  substitute writes the absent into the class register), photos, class info,
  room, lines. The page format, the view direction, the framing and the room
  elements are the plan's own sheet's, since they describe the room, not the
  students. The teacher's own printout is untouched by any of it.
- A substitute sheet of the table plan counts as a plan in use, as every
  printed or saved table plan does ([decision 0010](0010-plan-usage-from-actions.md)).

## Alternatives considered

- **A link on klassenplan.de with an expiry**, as asked for. Needs server
  storage of student data and accounts or tokens to revoke; rejected under
  [0001](0001-offline-first-no-server.md).
- **A link that carries the class in its fragment** (`#…`, encrypted with a
  password), which never reaches the server. Possible, but an expiry or a
  single use cannot be enforced — whoever has the link keeps it, in a
  messenger's history too — and a teacher would read the dialog as a promise
  it cannot keep. Not now.
- **A preset in the ordinary export** that switches the badges, the tint and
  the photos off. Simplest, but it overwrites the teacher's own settings, and
  every switch could be turned back on for the substitute's copy.
- **A switch "Für eine Vertretung"** over the ordinary sheet. Keeps the
  settings, but mixes two sheets in one panel and leaves the teacher to work
  out which rows still count.
- **The note stored per class.** Convenient for notes that recur, but a
  free-text field kept with a class gathers what a seating plan should not:
  "needs breaks every 20 minutes", "speech therapy at 10:30" — health data
  under Art. 9 GDPR. Unstored, the note lives as long as the sheet it is
  written for.

## Consequences

- A new local preference, `spg.export.substitute`; no stored student data
  changes, the backup and the class file are untouched.
- The note is gone when the export page is left; a teacher who wants it again
  types it again. The day of the cover goes back to today on every visit.
- The class team's need — a colleague who edits the same class — is not met
  here; the class file ([0030](0030-class-file.md)) hands a class over, and
  editing together would take the sync 0001 rules out.
- A badge or a criterion added later appears on the substitute sheet only if
  `substituteRenderOptions` lets it, which it does not: the sheet's promise
  holds without anyone remembering it.
