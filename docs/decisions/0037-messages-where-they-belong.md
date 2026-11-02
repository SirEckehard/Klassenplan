# 0037 – Fewer toasts, and the rest over the stage

- **Status:** accepted
- **In place since:** unreleased
- **Sources:** the review of 3.2.3 on 2026-11-01 (finding N22 and the
  maintainer's note on it), the concept page "Klassenplan Toast-Konzept" of
  the same day with the maintainer's choices D1–D6, commits `8139a170` and
  `0541ea51` (the toasts at the bottom centre and back at the top right),
  `src/utils/ui/toast.ts` (`announce`), `src/hooks/ui/toastDock.ts`,
  `src/utils/ui/statusNotice.ts`, `src/hooks/ui/useRefusalHint.ts`,
  [DESIGNSYSTEM.md](../DESIGNSYSTEM.md) § 6f, [UI.md](../UI.md)

## Context

A toast stood at three places in a month, and each covered something. In the
top right corner it lay over Help and the gear. At the bottom centre above the
status bar (`8139a170`) it read as part of the bar and was moved back the same
day (`0541ea51`). Just under the header on the right it lay over the head of
the inspector's column: in "Bibliothek", "Klasse … erstellt" covered the very
name field a new class opens for typing (N22), and a teacher met it "again and
again" in daily use.

No fixed place covers nothing. What made the cards stand in the way was how
many there were: 134 places in the code raised one, and most of the common
ones said what the screen had just shown — a plan that opened, a class that
was made, a room that was deleted after a question that asked. Such a card
comes exactly when a teacher looks at the result. Others refused something
far from the control that asked for it, and two never left on their own: "Neue
Version verfügbar" stood until it was clicked, and so did the offer to install
the app.

## Decision

Every message goes through four questions, in this order, and stops at the
first that fits:

1. **Is the result on the screen?** Then no card. A screen reader still hears
   it, through a polite live region the toast provider keeps (`announce`).
   That covers 21 places: classes made, opened and deleted, plans and mixes
   opened and deleted, rooms and templates deleted, students removed and
   edited in bulk, a CSV import, a cancelled circle.
2. **Does it belong to a control?** Then the control answers. A student's name
   is refused under its field, as the names of classes, rooms, plans and
   templates already were. A count of placeholders or a name for a new student
   is refused under its field in the toolbar's panel. A blocked "Weiter",
   "Öffnen", "Entfernen" and the plan's exits show their hint for four seconds
   when pressed (`useRefusalHint`), which a finger never saw on hover. The
   backup's password dialog tries the password and stays open on a wrong one.
   The room's template row says "Als Vorlage gespeichert", the gear's update
   check says offline or failed in its row. A seat a student is let go on
   already shows that it is locked.
3. **Is it a state, or a confirmation the screen does not show?** Then the
   status bar. A waiting version is a quiet button "Neue Version" there
   (`useUpdateReady`) and "Aktualisieren" in the gear's row; only a page
   without a bar still shows it as a toast. A plan saved while its inspector
   is out of sight, a backup written, writes that work again: the bar's line
   says so for three seconds (`confirmInStatusBar`). Too few seats after
   tables were removed is said by the line's red cross already.
4. **Everything else is a card,** over the middle of the status bar, 16 px
   above it — below `md` above what hangs from it — never over the toolbar, the
   inspector or an open drawer; where the middle leaves it too little room, it
   takes the middle of what they leave. The shell measures that (`toastDock`);
   without a shell the cards stand at the bottom of the window.
   They rise 12 px from below, the newest nearest the bar. A tap anywhere on a
   card puts it away, only its own button does something else; the close
   button stays for the keyboard. A swipe sideways or down puts it away too.
   Errors stand 8 s instead of 5 s. The install offer stands 12 s and counts
   as seen once shown.

What stays a card: errors, the offers with a button of their own
("Rückgängig", "War nur ein Test"), and notes on something unexpected — a
replaced board, a file read as a Windows export, changes kept in the class
left. A shortcut or a key whose control is not in view keeps its card, and a
few guards nobody reaches in use (the 30th room, a criterion without data)
stay as they were.

## Alternatives considered

- **Top centre over the stage.** It keeps the columns free too, but covers the
  class list's search, the first entries of every column in "Bibliothek" and
  the board, is far from a phone's thumb and lies about 1.87 m high on an
  86-inch board mounted at 90 cm. The bottom covers the last rows of a list and
  the back of the room, mostly empty on a desktop, where the 3:2 room leaves a
  margin under the plan.
- **Leaving the top right and only dropping the success messages.** It would
  have fixed N22's example, but every error and undo offer would still have
  lain over the inspector's head.
- **Every message in the status bar's line.** A phone's line has room for a
  number; an error that explains what to do does not fit, and an undo needs a
  button.
- **The bottom centre of `8139a170` as it was.** It read as part of the bar
  because it stood on it and every success message came there. Now the card
  floats 16 px above the bar with its shadow, and few cards come.
- **The middle of the stage at every width.** It was the first version of this
  decision. With the inspector open the card stood visibly off the bar's middle
  and moved when a column opened or closed, so the maintainer asked for the
  bar's middle (2026-11-02); the stage's stays only where the bar's has no room.

## Consequences

- A teacher sees a card for what went wrong, for an undo and for the
  unexpected, and almost never for what went right. A screen reader user hears
  as much as before.
- Where a column is folded, the plan grows and a card may lie over the edge
  of the last row for a few seconds. On a phone a card lies over the foot of
  an open drawer or sheet; after step 2 hardly anything raises one there, and a
  tap puts it away.
- A new message answers the four questions first: `announce`, the control,
  `confirmInStatusBar`, and only then `showToast`.
- Tests that waited for a success card read the inspector's state or the
  announcement instead; the test helper `expectErrorToast` was removed with
  its last caller.
