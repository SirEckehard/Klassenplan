# 0043 – A free seat beside, and the left-hander's left

- **Status:** accepted
- **In place since:** — (the next release)
- **Sources:** the maintainer's choices of 2026-11-12 on the checklist
  "Klassenplan Ausbau 3.4" (both markers without a reason, as for front seats;
  the left-hander read by who sits to the left, not by where the seat is; the
  sample class carries both),
  [decision 0031](0031-one-criterion-model.md),
  [decision 0016](0016-hidden-criteria-carry-no-weight.md),
  [decision 0038](0038-own-mixing-presets.md),
  [PEDAGOGY.md § 2](../PEDAGOGY.md#2-attributes-contextual-not-diagnostic),
  `src/utils/algorithm/model/criteria.ts`,
  `src/utils/algorithm/model/seatRelations.ts`,
  `src/utils/algorithm/model/objective.ts`,
  `src/utils/algorithm/model/fulfilment.ts`

## Context

Two needs had no place in a class list. A student in a wheelchair, with a
school assistant or simply with the room they need to work wants the seat
beside them free; a teacher could lock that student's seat, but a lock does
not keep the seat beside empty, and every mix filled it again. And a
left-hander beside a right-hander, the right-hander on the left, writes elbow
against elbow — a small thing that every teacher who has watched it knows.

## Decision

- **Two markers on the student**, `needsFreeNeighbourSeat` and `leftHanded`,
  both optional. Like `needsFrontSeat` the first stores **no reason**. They are
  set where the window and the door are — the inspector's "Platz & Raum", the
  selection of several students, a pass of the focus mode — and travel in
  the CSV ("Freier Nachbarplatz", "Linkshänder") and in the backup.
- **Two criteria** in the family "Platz & Raum": `keepNeighbourSeatFree`
  (default 8, "Sehr wichtig") and `seatLeftHandersLeft` (default 5,
  "Wichtig"). Without a student carrying the marker they are hidden and weigh
  nothing (decision 0016).
- **The free seat is a pair term** (`pairTerm`): every classmate on a seat in
  the relation `partner` or `beside` (`isNeighbourKind`) costs the weight
  times `CRITERION_WEIGHTS.freeNeighbour` (2), in full whatever the relation's
  closeness — the seat is taken or it is not. A need weighs twice a wish of
  the same level, as a distance wish does.
- **The left-hander is a term of its own** (`handTerm`), on the seat directly
  to the left of whoever sits on a seat as they face their table
  (`SeatLayout.leftOf`): the chair's direction turned with the table, at the
  same table or the next one with no aisle between (`ADJACENT_GAP`), chairs
  facing the same way, in the same line within half a seat. A right-hander
  there costs the weight; another left-hander, an empty seat or the table's
  edge cost nothing. The term is measured before and after a swap on the
  seats it can move (`handSeatsAround`: the two seats and the seats to their
  right), as the language term is, so the pair matrix stays symmetric and
  `swapDelta` exact.
- **The fulfilment** counts a case per student needing a free seat, against
  what the room allows: seats of the tables in the mix with no seat beside
  them, and empty seats in the mix. A left-hander is a case each, met with
  nobody writing right-handed to the left.
- **The presets** (decision 0038): "Standard" takes both at their defaults;
  the shipped ones carry the free seat at 8 and the left-handers at 5
  ("Stillarbeit", "Klassenarbeit") or 3 ("Gruppenarbeit", "Neue Klasse"). A
  preset of the teacher's own, or a changed shipped one, saved before reads
  both as 0.
- **The sample class** carries one student of each, and its room one double
  desk more than the class needs (13 for 24 students), since a free seat
  needs a seat to spare.

## Alternatives considered

- **A reason with the marker** (wheelchair, assistant, hearing). It would
  write health data into the class (Art. 9 GDPR), as the reason behind a
  front seat would; rejected for the same reason as there (PEDAGOGY § 2).
- **The left side by where the seat is**, a seat term with no occupant on
  the left — the left end of a desk, a seat by an aisle. Smaller and exact
  without measuring around a swap, but it sends every left-hander to the left
  end even where the seat on the left stays empty or holds another
  left-hander, and loses to every other criterion where that end is wanted.
  Rejected by the maintainer for reading who sits there.
- **A hard rule** for the free seat at "Sehr wichtig", as the front rows are
  for front seats. Not built: the soft term keeps the seat free in 93 % of
  the cases of a room built to make it hard (below), and a hard rule would
  need the seats to spare decided before the mix.
- **The `special` factor** of a student needing a free seat, which weighs
  every clash at a student with a behavioural need more: the need is about
  the seat, not about behaviour, so it stays as it is.

## Consequences

- **Stored data:** two optional fields on a student, two keys in the mix
  settings and in presets. The backup keeps export version 3; an older version
  of the app ignores the fields and drops the markers on a restore. The CSV
  template and export gain two columns; the import finds them by their
  headings (`csvColumnVocabulary.ts`), and a file without them reads as
  before. `MIX_CRITERIA_VERSION` stays 2: settings without the keys read the
  default or 0, and neither weighs while no student carries the marker.
- **Plans of existing classes stay as they were:** without either marker the
  six rooms of the mix quality measurement give, seed for seed over 30 seeds,
  the same plans and the same fulfilment of every criterion as before
  (2026-11-12).
- **What the mixing achieves**, measured in a seventh room of the mix quality
  measurement — 15 double desks, the 26 students of the room of double
  desks, two of them needing a free seat, every fifth left-handed; 30 seeds:

  | Criterion               | Without the markers | With them |
  | ----------------------- | ------------------: | --------: |
  | Overall                 |              89.5 % |    90.1 % |
  | Free seat beside        |                   — |    93.3 % |
  | Left-handers            |                   — |   100.0 % |
  | Gender mix              |              82.9 % |    75.0 % |
  | Wishes                  |              55.8 % |    51.2 % |
  | Time per mix (Vitest 5) |               28 ms |     33 ms |

- **Where the free seat is missed:** in 4 of the 60 cases above. How many
  students each table takes is drawn before the mix (`seatTargetsFor`), and
  so is which desks keep a seat empty; in those seeds three of the four were
  the front row, which the three students needing a front seat at "Sehr
  wichtig" must fill. A factor of 3 or 4 instead of 2 changed nothing. The
  teacher sees the miss in the fulfilment and at the seat; letting the targets
  follow the need is left for later.
- **A full room** has no seat to spare: the criterion then has no case, the
  fulfilment says nothing about it, and the FAQ says why.
- **The sample class's room** has a desk more than before, so the status bar
  and the plan read 26 seats for its 24 students.
