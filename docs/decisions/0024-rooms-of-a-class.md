# 0024 – A class keeps its rooms, and "Pläne & Verlauf" shows them

- **Status:** proposed
- **In place since:** —
- **Sources:** maintainer decisions of 2026-10-04 (rooms as folders of a
  class; every existing plan into one room "Klassenraum"; "Neu einrichten"
  stays in the room; a loaded template makes a room of its own; the name
  "Pläne & Verlauf" on a page of its own at `/plaene`), a teacher's feedback
  of 2026-10-03 (several plans per class were there but not found), commit
  `790dc794` (`releaseOpenPlan`), [data-model.md](../data-model.md)

## Context

Every saved plan keeps its own copy of the room (`SavedPlan.scene`), so one
class can hold a plan for its classroom and another for the lab. Since
`790dc794`, loading a template or setting the room up anew lets go of the open
plan, so that the next save does not write the lab over the classroom's plan.

Nothing stores a room as such. The scene is copied into the class's working
state, into every plan and into every template, which belong to all classes; no
plan refers to a template, and a mix carries no scene at all. "Pläne & Verlauf"
listed the plans of the open class flat, without their room, and the teacher
who asked for a plan per room did not find that it was possible.

## Decision

1. **A class keeps its rooms.** `ClassRecord.rooms` holds `RoomRecord`s (id,
   name, creation date and `parked`, the working state of a room that is not
   open), `ClassRecord.activeRoomId` names the open one, and every saved plan
   and mix carries the `roomId` of the room it was made in. The open room's
   state is the class's working state, in the fields it always had; any other
   room parks its own — tables, seating, locks, circle, open plan — so opening
   a room works like opening a class: nothing is lost and nothing is saved
   behind the teacher's back.
2. **Reading repairs, every time** (`ensureClassRooms`): a class without a
   room gets "Klassenraum", and plans and mixes without a room, or with one
   that is gone, go into the open room.
3. **"Neu einrichten" changes the open room**; loading a template makes a new
   room named after it; "Neuer Raum" makes an empty one. A plan moves to
   another room from the inspector.
4. **Names:** room names are unique within a class, case ignored; plan names
   stay unique within the class. The one slot for an automatically saved plan
   exists per room.
5. **"Pläne & Verlauf" is a page of the workspace** at `/plaene` (noindex), in
   columns as a file manager shows folders: the classes, a class's rooms with
   its recent mixes and neighbourhoods, a room's plans. What is selected is
   edited in the inspector; the status bar carries its path and "Öffnen". The
   page replaces the dialog.

## Alternatives considered

- **Grouping the plans of a class by their tables.** A table moved by a hand's
  width would split one room into two, and a mix, without a scene, could not
  be placed at all.
- **A room as a scene only, opened with its newest plan.** A plan's date is a
  day, so "newest" is not always clear, and whatever changed in the room since
  the last save would be gone.
- **A plan pointing to its template.** Templates belong to every class and are
  edited for all of them; they are not the room one class sat in.
- **Grouping the existing plans by their tables when rooms come.** Rejected by
  the maintainer: all of them in "Klassenraum" is predictable, a guess is not.
- **"Neu einrichten" making a new room.** Rearranging the own classroom would
  leave a folder behind for every arrangement.
- **An undo history per room.** More state to keep for little use: parking
  loses nothing, so going back is opening the other room.
- **A higher backup version.** Older builds would refuse every newer backup;
  the new fields are optional, and those builds pass over them.
- **A larger dialog.** The inspector, where everything is edited, belongs to
  the shell, and a dialog covers it.

## Consequences

- The class collection gains optional fields, and `CLASS_COLLECTION_VERSION`
  becomes 2; data from older builds is repaired as it is read. An older build
  ignores `rooms`; a plan it saves has no `roomId` and goes into the open room
  the next time this build reads it.
- Backups grow by the parked state of the rooms that are not open, and the
  import checks rooms, `parked` and `roomId`, at most `MAX_ROOMS_PER_CLASS`
  rooms per class.
- Ctrl/⌘+Z after loading a template no longer brings the old tables back: the
  old room stays a room of its own, and the message after loading offers the
  way back to it. Opening another room starts both undo histories afresh, as
  opening another class does.
- Deleting a room deletes its plans and mixes; the neighbourhoods, which belong
  to the class, stay.
- The route `/plaene` (and `/en/plaene`) is new and kept out of search engines;
  the dialog and its card lists are gone.
