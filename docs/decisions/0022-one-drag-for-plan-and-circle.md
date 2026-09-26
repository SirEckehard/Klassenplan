# 0022 – One drag for the plan and the circle, and locks in the circle

- **Status:** accepted
- **In place since:** unreleased (2026-09-26)
- **Sources:** maintainer requests of 2026-09-26 (the drop marking in the plan
  cut off and on the wrong seat; "setze es so um" for the proposed alignment of
  both views; the target in blue, green only after a drop; locks in the circle,
  switchable there; no preview of a swap's effect on the criteria),
  `src/hooks/ui/useDragGesture.ts`, `src/hooks/scene/useSeatDrag.ts`,
  `src/hooks/circle/useCircleDragDrop.ts`,
  `src/hooks/circle/useCircleKeyboardMove.ts`,
  `src/components/scene/DragGhost.tsx`, `src/services/circleLayoutService.ts`

## Context

Moving a student worked differently in the table plan and in the circle, and
neither quite worked:

- **The plan** marked the target with a contour on the seat's edge and grew the
  seat by 6 %. The table clipped both and covered the edge with its outline, so
  only the line between two seats was left. The seat the drag started from was
  marked as the target at first, the preview covered the target, and a held
  seat turned a fixed pale pink that glared in dark mode.
- **The circle** looked for the target among the places its layout stores, but
  draws the circle smaller when there are photos, so the target could be the
  neighbour of the place under the pointer. A pointer the system took back left
  the drag hanging; Escape did nothing in either view; the circle had no
  keyboard way at all, and no held places.
- **Both** started a drag on the press, so a click or a tap — on a badge's
  tooltip, say — picked the student up too; and a drop on a taken place swapped
  two students without saying so beforehand.

## Decision

1. **One gesture.** `useDragGesture` runs every drag in both views: a press
   becomes a drag only after it travels 4 px (a mouse or a pen) or 8 px (a
   finger); Escape, a cancelled pointer and an unmount end it without moving
   anyone. Each view keeps its own way of finding the target — the seat under
   the pointer in the plan, the nearest place as drawn in the circle — and its
   own move.
2. **One look.** The target is a ring and a tint inside the seat or the token:
   blue (`--border-option-selected`) where the student can land, rose
   (`--status-alert`) where the place is held. The origin is no target and only
   fades. After the drop both places ring green (`--status-ok`) for 0.9 s and
   let go: green is a completed action, blue the place to act on
   (`docs/DESIGNSYSTEM.md` § 4).
3. **One preview.** `DragGhost` floats above the pointer in both views — a seat
   or a round token — so the target stays in sight under a finger too. Over a
   taken place it says "tauscht mit …", and the origin shows who would come.
4. **Said out loud.** Every drop is announced ("Lina und Ben haben die Plätze
   getauscht."). The circle gets the keyboard way the plan has: Enter or Space
   picks up, the arrow keys walk round the circle, Enter or Space puts down,
   Escape lets go.
5. **Locks in the circle.** A lock on each token of the editable circle holds a
   student in place: a drag cannot move them or swap anyone onto their place,
   the shuffle leaves them where they are, and a regenerated circle — from the
   worker or from the table plan — puts them back on their places
   (`restoreCircleLocks`). The locks are stored with the circle
   (`CircleLayout.lockedStudentIds`) and undone with it. The projection and the
   exports do not show them.

A preview of what a swap would do to the criteria was proposed and left out.

## Alternatives considered

- **Keep two drags and fix each one.** Cheaper at first; the two had already
  drifted apart on every point above, and the next fix would have to be made
  twice again.
- **Locks in the circle derived from the table plan's locks.** A student held
  at a table is not held at a place in a ring — the circle is built afresh
  from the plan and the places do not correspond. The circle keeps its own.
- **Green for the target**, as before. It is the colour of "done" and, since
  the criterion highlights ring seats in their verdict, of "criterion met" —
  a target in green during a pinned highlight would say two things at once.

## Consequences

- The stored circle gains an optional field. Circles and backups written before
  read as "nothing locked"; the backup validation accepts the field and checks
  it where present. Older versions of the app ignore it, so a backup restored
  there loses the locks and nothing else.
- A click on a seat no longer starts a drag; a drag starts a few pixels later
  than before.
- The algorithm and the plans it produces are unchanged; the table plan's locks
  work as before.
- Keyboard users can reach every token of the editable circle, which adds a tab
  stop per student and one per lock, as in the table plan.
