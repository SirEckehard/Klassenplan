# 0041 – A question stands as near its button as it can

- **Status:** accepted
- **In place since:** v3.3.0 (2026-11-04)
- **Sources:** the maintainer's choices of 2026-11-03 on the concept page
  "Klassenplan Rückfragen" (no question for what can be undone, the question at
  the button, the backup in the dialog, a quieter focus ring),
  [decision 0037](0037-messages-where-they-belong.md),
  `src/components/ui/modals/InlineQuestion.tsx`,
  `src/components/ui/modals/ConfirmDialog.tsx`,
  `src/hooks/student/studentUndoOffer.ts`,
  [DESIGNSYSTEM.md](../DESIGNSYSTEM.md) §§ 4 and 6f, [UI.md](../UI.md)

## Context

Eleven questions all asked in one centred window: a warning triangle in a tile,
the text on a card inside the card, a blurred page behind it. The window broke
the design system's own rules (no card in a card, no glass, no shadow of a
component's own), and it stood in the middle of the screen while the button that
asked stood at the foot of the inspector. It also asked the same way whether a
student could be brought back with a key or a whole class would be lost, and
told a teacher on an iPad to press Ctrl/⌘+Z.

The blue ring around the focused "Abbrechen" was the loudest thing on the
screen, though blue means that something can be pressed or is selected.

## Decision

What a deletion takes along decides where it asks, as decision 0037 sorts
messages:

1. **It comes back: no question.** A student, several students, a photo go at
   once, and a card offers "Rückgängig" for eight seconds
   (`offerStudentUndo`). The class list's undo takes back its latest step,
   whichever that is, so the card goes as soon as the list changes again, another
   class opens or the class layer is left. The status bar's undo stays.
2. **It loses only itself: the question at the button.** A plan, a mix, a
   template, a preset and a room without plans ask in place
   (`InlineQuestion`): the inspector's foot or the menu's row turns into the
   question, with no window and nothing dimmed. Entf and an entry's menu in
   "Bibliothek" ask at the same foot, which opens for it. "Löschen" appears where
   the button stood, so it takes no press for 300 ms.
3. **It takes more along: the quiet dialog.** A class, a room with plans and all
   data ask in `ConfirmDialog`, shaped as the inspector's head, which counts what
   goes (`confirmFacts`) and, for a class and for all data, offers the backup
   first; that ends the question. A step that destroys nothing and has to be
   decided (a plan that could not be saved) wears no rose, and the download
   question is the same dialog in blue.

On all of them the focus starts on the cancel, so Enter aborts, except the
download, which the teacher asked for.

**The focus ring is one token in quiet ink** (`--focus-ring`, the muted text
colour), for every control and in every tone. It says where the keyboard is,
which is no action, so it leaves blue to what can be pressed and what is selected.
In a question it is a thin line 2 px off the button. `--canvas-selection` keeps
the blue: a seat under the keyboard is a selection on the drawing.

## Alternatives considered

- **A popover anchored to the button.** One component for every place, but the
  class menu's bin closes the menu and takes the anchor with it, Entf has no
  anchor, and the phone's sheet would carry a second floating layer.
- **The question over the status bar, where the toasts stand.** The same place on
  every page, but it looks like a toast, and a tap on a toast puts it away.
- **The inspector's column as the question.** Room for the figures without a
  window, but the class menu, the gear and the start page have no inspector, so
  all data would stay a dialog and there would be two large forms.

## Consequences

- A slip on "Schüler löschen" costs one press on "Rückgängig", with no question
  before it. After eight seconds the status bar's undo remains, on the class
  layer alone, as before.
- A new deletion answers one question first: what does it take along? The
  inspector's foot and `InspectorMenuButton` take a `question`; without one they
  call `onDelete` at once, which then asks in a dialog of its own.
- A dialog counts before it opens (`loadClassRecord`, `loadClassCollection`), and
  opens without figures when that fails.
- The focus ring no longer has a colour of its own to tell a danger button from
  another; the button's own colour does that.

## Addendum of 2026-11-03: "Bibliothek" takes back what it changes

"Bibliothek" was the one page of the shell without undo: plans, mixes, rooms,
templates and presets lie in none of the three histories, and the plan's would
have taken back something the page does not show. It now has a fourth
(`hooks/library/useLibraryHistory.ts`), in the middle of its status bar and on
Ctrl/⌘+Z, for what is changed there: renaming, adding, duplicating, moving and
deleting plans, mixes, rooms, templates and presets, a preset's weights, and a
class's name, school year and notes.

So rule 1 applies, as the maintainer chose on 2026-11-03: **a plan, a mix, a
template, a preset and a room without plans go at once from "Bibliothek"**, with
"Rückgängig" on a card until the next step. The question at the inspector's foot
is gone with them, `InlineQuestion` staying for a menu's row where nothing takes
it back: a template or a room in the room's inspector, a preset in the criteria
panel. A room with plans still counts them in its dialog, which no longer calls
it final.

- **One stand of a class goes back as a whole** (`ClassParts`: plans, mixes,
  rooms, open room, open plan), not a change's inverse: a moved plan parks rooms
  and may keep their work in a plan, a removed room takes plans and mixes along.
  The screen's tables and seating are not part of it; no change here touches them.
  A template or a preset goes back alone, so what another window added stays.
- **It lasts as long as the page.** Back in the workspace the plans go on
  changing, and a step kept from before would write over that. A class's steps
  also go when another class opens, and all of them when the open class is
  replaced from outside (`reloadGeneration`) or everything is wiped.
- **Another window's work is not written over.** A class that is not open goes
  back only while it holds what the undone change left (`restoreParts`'
  `expected`), in the same transaction; otherwise the step goes and a message says
  why (`changed-elsewhere`).
- **Beyond it:** adding and deleting a class, whose photos and usage records lie
  in stores of their own, so a class still asks first; "Genutzt" and "Automatisch
  erkennen", which lie in the usage store; the neighbourhoods' reset, which has its
  own "Rückgängig"; a rename in the header's class menu, which belongs to no page.

The cost is the one named when this was chosen: **a deleted plan is gone without
any question once the page is left.** Should that lose a teacher a plan, the
question comes back here, not the whole history.
