# 0028 – Class duties are handed out in turns and remembered per class

- **Status:** accepted
- **In place since:** not yet released
- **Sources:** maintainer decision of 2026-10-11, `src/pages/Duties.tsx`,
  `src/utils/dutyDraw.ts`, `src/repositories/dutyStore.ts`,
  [decision 0019](0019-classroom-tools-as-routes.md)

## Context

Classes hand out duties — board duty, sweeping, emptying the bins, tidying
up — usually for a week or two at a time, and teachers keep the rota on paper
or in their heads. What makes it fair is that it goes round: whoever has not had
a duty for longest is next. A tool that draws at random each time cannot know
that, because the earlier rounds are what tell it.

The other classroom tools store nothing
([decision 0019](0019-classroom-tools-as-routes.md)): a draw or a set of
groups is stale by the next lesson. Duties are not — the duties themselves stay
the same all year, and the rounds before are the input of the next one.

## Decision

"Dienste verteilen" (`/dienste`) is a classroom tool like the others — a route
on `ToolPage`, `noindex`, reached from "Klassenwerkzeuge" and from the
projection's bar — but it keeps what it does:

- **What is stored.** Per class: the duties (a name the teacher chooses, how
  many students each takes), the round on the wall now and up to 20 earlier
  rounds (`MAX_DUTY_ROUNDS`). A round is a timestamp and, per duty, the ids of
  the students holding it.
- **Where.** In a store of its own, `spg.duties` (`src/repositories/dutyStore.ts`),
  one entry per class id — not in the class record. The tool is a page outside
  the workspace, and writes of the open class belong to the persist queue alone.
  It travels in the backup (`duties`), is swept like the plan usage record when
  a class or a student goes, and "delete all data" takes it with the rest.
- **How it rotates** (`drawDuties`). The students with a name, shuffled, then
  sorted: fewest duties held so far first, then fewest times this duty, then
  whoever's last duty lies further back. Each duty in the teacher's order takes
  its number from those not yet holding one; nobody holds two in a round. A
  duty that finds nobody left stays short, and the page says so.
- **Changing one place** (`pickForDuty`). Someone drawn who cannot do it is
  replaced by the next in the same order, without redrawing the rest; an empty
  place is filled the same way. "Neu verteilen" moves the round on the wall into
  the history first and can be undone from its message.

## Alternatives considered

- **Store nothing, as 0019 does.** Every draw would be pure chance, and the
  duties would have to be typed in again each time — the two things that make a
  rota worth keeping.
- **The duties on the class record.** They would travel with the class
  everywhere it goes, but a page outside the workspace would then write into
  the open class's live state, which only the persist queue may do.
- **Remembering only the last round.** Fair across two rounds, not across a
  term: with three duties for a class of 28, everybody's turn comes about every
  fourth round.

## Consequences

- A new key in IndexedDB and an optional `duties` field in the backup; older
  backups import as having no duties, and a merge adds the duties only of
  classes that have none yet.
- Which student held which duty, and when, is personal data kept on the device
  until the class is deleted or 20 newer rounds push it out
  ([PRIVACY.md](../PRIVACY.md)).
- The rota leaves the app as a one-page PDF (`DutyRosterSheet`, saved through
  `exportDutyRosterToPdf`) in the frame every export shares — margins, header
  with the brand, title and date, the note list's greys — so it hangs beside a
  printed seating plan as one of a set. It has no export settings, and like
  every export it is not encrypted.
