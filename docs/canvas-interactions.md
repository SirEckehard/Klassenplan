# Event inventory for canvas interactions

## Scope

This document describes the current pointer and keyboard flows around
`useCanvasInteraction`, `useTableInteraction`, and `useKeyboardInteraction`. It
shows which events are handled where, which context data is needed, and which
side effects are triggered. Long-press timing is now owned by
`canvasPointerMachine` (`longPressMode: 'machine'`); the former
`usePointerLongPress` hook has been removed. The overview is the basis for the
declarative state machines that drive these flows.

## Shared context & mutable references

- **Selection state**: `selectedTableIds` (React state from context) plus the
  local `selectionBox` state in `useCanvasInteraction` for marquee selection.
- **Pointer machine (`canvasPointerMachine`)**:
  - `activePointer`, `tablePress`, `canvasPress`, and `dragSnapshot` describe
    the current pointer including its start coordinates.
  - The `clipboard` snapshot (tables + feature count) feeds guards for
    long-press events.
  - `longPressDurations` + `longPressMode` configure the long-press timing.
    `longPressMode` now defaults to `'machine'`, so the `after` transitions
    (`TABLE_LONG_PRESS_DELAY`, `CANVAS_LONG_PRESS_DELAY`) fire directly from the
    machine; the `'legacy'` value still exists in the `LongPressMode` union but
    is no longer wired up anywhere.
- **`useTableInteraction`** holds the UI-adjacent mutation pieces:
  - `capturedPointerId` for pointer capture on the SVG.
  - `dragInfo` (indices + start positions) and `hasDragged` for delta
    calculations.
  - Template-specific states (`useTemplateDrag` + `templateDragPreview`).
- **Long-press pending refs** (`useCanvasInteraction`):
  - `pendingTableLongPressRef` / `pendingCanvasLongPressRef` store client and
    scene coordinates, pointer type, and timer state.
- **Clipboard context**:
  - Table clipboard (local in `CanvasInteractionLayer`) and feature clipboard
    (from `LayoutEditorView`).
  - Available features control whether a canvas long-press is allowed at all.
- **External helpers**:
  - `applySelectionForTable`, `initializeDragFromSelection`,
    `cancelSelectionInteraction`, `triggerHapticFeedback`, `snapshot`,
    `runSceneTransaction`, plus the context-menu handlers.

## Pointer flows

### 1. Table click (mouse)

1. `pointerdown` on `<g data-table-index>` is handled by
   `useCanvasInteraction.handleTablePointerDown`.
2. Guards: right mouse button (`button === 2`) and locked tables are ignored.
3. Side effects:
   - Close context menus, cancel any pending long-press refs.
   - `startTablePointerDrag` takes over pointer capture on the SVG (only
     `capturedPointerId` is needed).
   - Normalize pointer type and prepare long-press for touch/pen.
   - Mouse pointers select immediately via `applySelectionForTable`.
   - Finally, the hook sends `POINTER_DOWN_TABLE` (with press payload) to
     `canvasPointerMachine`.

### 2. Table tap (touch/pen)

1. Same entry logic, but the pointer type is `touch` or `pen`.
2. The pending ref stores timer & coordinates; `meta.selectionApplied` stays
   `false` so a tap without drag can still select later.
3. As soon as the machine reaches `draggingSelection` or the long press fires,
   `handleDragEntry` or `handleContextMenuEntry` sets the flag to `true`.
   Otherwise `handleCanvasPointerUp` applies the selection afterwards.

### 3. Dragging past the threshold

1. `handleCanvasPointerMove` forwards every pointer move (incl. scene and
   client coordinates) to the machine.
2. Once `DRAG_DISTANCE_THRESHOLD` is exceeded, the state transitions from
   `tablePressPending` to `draggingSelection` and `handleDragEntry` runs.
3. `handleDragEntry` calls `initializeDragFromSelection(selection, scenePoint)`
   in `useTableInteraction`. There, `dragInfo` is populated, start values are
   stored, and locked tables are filtered out.
4. In `draggingSelection`, every additional `POINTER_MOVE` also triggers
   `handleDragMove` → `updateDragSelection(scenePoint)`:
   - On the first call: `snapshot()` + haptics (`triggerHapticFeedback('dragStart')`).
   - Delta calculation via `calculateDragDelta` (start vs. current position),
     application via `applyDragMovement`.
5. `POINTER_UP` **or** `POINTER_CANCEL` triggers `handleDragExit`. The action
   calls `finalizeDragInteraction()` (drop haptics + `commitScene()` if moved)
   and `releaseTablePointerCapture(pointerId)`. Then `resetInteractiveState`
   cleans up the machine context.

### 4. Long table press → context menu

1. Once the timer expires, `onTableLongPress` processes the pending event:
   - Update selection before the menu opens.
   - Close the canvas menu, open the table menu with coordinates + pointer type.
   - Release pointer capture so dialogs stay operable.

### 5. Canvas press → marquee selection

1. `pointerdown` on the SVG background triggers `beginSelectionWithLongPress`.
2. Guards:
   - Ignore right-click.
   - Long-press only starts when clipboard content is available.
3. `beginSelectionWithLongPress` takes pointer capture, computes the scene
   coordinate, initializes `selectionBox`, and calls `clearSelection()`.
4. While `selectionBoxActive` is on, `updateSelectionFromPoint` updates both
   the frame and `selectedTableIds` on every `POINTER_MOVE`.
5. `POINTER_UP` / `POINTER_CANCEL` release pointer capture and call
   `resetSelectionState`. `handleCanvasPointerUp` also clears the associated
   pending refs.

### 6. Canvas long-press → paste menu

1. On press, `useCanvasInteraction` stores client and scene coordinates in
   `pendingCanvasLongPressRef`.
2. If the timer fires (touch/pen + clipboard available), `handleContextMenuEntry`
   runs:
   - `cancelSelectionInteraction()` cleans up selection + pointer capture.
   - Close the table menu, open the canvas menu with the stored coordinates.
   - Reset pending refs to prevent multiple triggers.

### 7. Template drag from the toolbar

1. `pointerdown` on a template calls `useTemplateDrag.startTemplateDrag` and
   sets pointer capture on the button.
2. `templateDragMachine` stores pointer ID, template type, and client
   coordinates, and uses `computeOverCanvas` to check whether the pointer is
   over the canvas.
3. Global `pointermove` / `pointerup` / `pointercancel` listeners dispatch
   `TEMPLATE_DRAG_MOVE` or `TEMPLATE_DRAG_END`.
4. `updatePreview` updates `templateDragPreview` (type, position,
   `overCanvas`). `dropTemplate` fires only if the pointer is on the canvas at
   release; `clearPreview` then cleans up.

### 8. Context menu via right-click

1. `contextmenu` events on the SVG are handled by
   `LayoutEditorView.handleSvgContextMenu`.
2. Guards:
   - Target is a table → table context menu (unless locked).
   - Target is a feature → feature context menu.
   - Otherwise (clipboard content available) → canvas context menu.
3. Selection, menu states, and coordinates are synchronized accordingly.
4. This path doesn't use long-press refs but sets identical menu states.

### 9. Cancellation paths

- `pointercancel` produces `POINTER_CANCEL`. In `draggingSelection` this leads
  to `handleDragExit` + pointer-capture release.
- `cancelSelectionInteraction` bundles drag cancel, template cancel, and
  capture release.
- Pending long-press refs are cleared on every pointer-up/cancel and in the
  `useEffect` cleanup.

## Keyboard flows

### Event routing (`useKeyboardInteraction.ts`)

1. Global `keydown` / `keyup` listeners observe DOM events and check whether a
   form field is focused.
2. Arrow keys dispatch `KEY_ARROW` (direction, shift state, `repeat`); `keyup`
   produces `KEY_RELEASE` to stop auto-repeat.
3. Delete/Backspace produce `KEY_DELETE`; `Ctrl|Cmd + C/X/V` are translated to
   `KEY_COPY`, `KEY_CUT`, `KEY_PASTE`.
4. Before each interaction, `SYNC_STATUS` is dispatched so the machine always
   knows `selectionCount`, `hasClipboardContent`, and `focusInInput`.

### Machine states (`keyboardInteractionMachine.ts`)

| State             | Events                 | Guards                 | Actions                                                               |
| ----------------- | ---------------------- | ---------------------- | --------------------------------------------------------------------- |
| `keyboardIdle`    | `KEY_ARROW`            | `hasSelection`         | `moveSelection`, store direction → `movingSelection`                  |
|                   | `KEY_DELETE`           | `hasSelection`         | `deleteSelection`                                                     |
|                   | `KEY_COPY` / `KEY_CUT` | `hasSelection`         | `copySelection` / `cutSelection`, then `clipboardOp`                  |
|                   | `KEY_PASTE`            | `hasClipboardContent`  | `closeCanvasMenu`, `pasteSelection`, then `clipboardOp`               |
|                   | `KEY_RELEASE`          | –                      | Reset direction                                                       |
| `movingSelection` | `KEY_ARROW`            | `hasSelection`         | Repeated moves (auto-repeat)                                          |
|                   | `KEY_ARROW`            | `keyboardInputBlocked` | Immediately back to `keyboardIdle`, reset direction                   |
|                   | `KEY_RELEASE`          | `isMatchingRelease`    | Reset direction, back to `keyboardIdle`                               |
| `clipboardOp`     | –                      | –                      | Actions run on entry; the state immediately returns to `keyboardIdle` |

All actions (`moveSelection`, `deleteSelection`, `pasteSelection`, …) are
injected via `actionApiRef` from the hook and still use `snapshot()`,
`updateClassroomScene`, `closeCanvasContextMenu`, and the clipboard helpers.

## Pointer state matrix (current state)

| Mode / ref status     | Event (source)                                          | Guards                                  | Next mode                                    | Side effects                                                            |
| --------------------- | ------------------------------------------------------- | --------------------------------------- | -------------------------------------------- | ----------------------------------------------------------------------- |
| `idle`                | `pointerdown` on table (`handleTablePointerDown`)       | Table unlocked, no right-click          | `tablePressPending`                          | Close menus, cancel timers, set pointer capture, prepare long-press     |
| `idle`                | `pointerdown` on canvas (`beginSelectionWithLongPress`) | Target is the SVG, no template drag     | `canvasPressPending` & `selectionBox` active | Pointer capture, clear selection, optionally schedule canvas long-press |
| `idle`                | `pointerdown` on template (`startTemplateDrag`)         | –                                       | `templateDragActive`                         | Pointer capture on template, activate preview                           |
| `tablePressPending`   | `pointermove` (distance ≥ threshold)                    | –                                       | `draggingSelection`                          | Cancel timer, initialize drag                                           |
| `tablePressPending`   | Long-press (`onTableLongPress`)                         | –                                       | `contextMenuOpen`                            | Apply selection, open table menu, release capture                       |
| `tablePressPending`   | `pointerup` before long-press                           | `meta.selectionApplied === false`       | `idle`                                       | Apply selection, cancel timer                                           |
| `draggingSelection`   | `pointermove` (`handleCanvasPointerMove`)               | –                                       | `draggingSelection`                          | Snapshot once, apply deltas, start haptics                              |
| `draggingSelection`   | `pointerup` / `pointercancel`                           | –                                       | `idle`                                       | Release capture, finalize drag, commit scene                            |
| `canvasPressPending`  | `pointermove`                                           | –                                       | `drawingSelectionBox`                        | Update selection rectangle & selection live                             |
| `canvasPressPending`  | Long-press (`onCanvasLongPress`)                        | Clipboard / feature clipboard available | `contextMenuOpen`                            | Cancel selection, open canvas menu, release capture                     |
| `drawingSelectionBox` | `pointerup`                                             | –                                       | `idle`                                       | Commit selection, clear rectangle                                       |
| `templateDragActive`  | Global `pointermove`                                    | –                                       | `templateDragActive`                         | Position preview, set `overCanvas`                                      |
| `templateDragActive`  | Global `pointerup` / `-cancel`                          | –                                       | `idle`                                       | Drop template (if over canvas), reset preview                           |
| `contextMenuOpen`     | Menu closed (`handleClose*Menu`)                        | –                                       | `idle`                                       | Clean up menu states                                                    |

## Keyboard mode snapshot

| Condition           | Event                  | Side effects                                                    |
| ------------------- | ---------------------- | --------------------------------------------------------------- |
| Selection present   | `Arrow` keys           | Prevent default, snapshot, move & clamp selected tables         |
| Selection present   | `Delete` / `Backspace` | Prevent default, `deleteSelectedTables`, handle eviction/toast  |
| Selection present   | `Ctrl/Cmd + C`         | Copy tables to clipboard                                        |
| Selection present   | `Ctrl/Cmd + X`         | Copy, then delete                                               |
| Clipboard populated | `Ctrl/Cmd + V`         | Paste tables relative to last copy or cursor, close canvas menu |

### Planned keyboard machine (historical plan)

| State             | Description                                 | Incoming events                 | Actions / transitions                                             |
| ----------------- | ------------------------------------------- | ------------------------------- | ----------------------------------------------------------------- |
| `keyboardIdle`    | Default mode without keypress               | `KEY_DOWN` (Arrow/Delete/Ctrl+) | Switch into state-specific modes                                  |
| `movingSelection` | Continuous arrow-key movement (auto-repeat) | `KEY_REPEAT` / `KEY_UP`         | Run `MOVE_SELECTION` or return to `keyboardIdle`                  |
| `clipboardOp`     | Copy/cut/paste                              | `KEY_DOWN` (Ctrl+C/X/V)         | Call `copySelectedTables` / `cutSelectedTables` / `pasteTablesAt` |
| `deletePending`   | Delete/Backspace confirmed                  | `KEY_DOWN` Delete/Backspace     | Trigger `deleteSelectedTables`                                    |

**Events**

- `KEY_DOWN` – includes `code`, `ctrlKey`, `shiftKey`, `metaKey`.
- `KEY_REPEAT` – auto-repeat while arrow keys are held.
- `KEY_UP` – ends `movingSelection`.
- `FOCUS_WITHIN_INPUT` / `FOCUS_LEAVE_INPUT` – guards to ignore inputs while
  forms are focused.

**Actions**

- `moveSelection` – snapshot + delta via `applySelectionDelta()`.
- `deleteSelection` – wrapper around `deleteSelectedTables()`.
- `copySelection`, `cutSelection`, `pasteClipboard` – use the existing table
  operations.
- `closeCanvasMenu` – prevents keyboard paste from leaving menus open.
- `logKeyboardTransition` – centralized logging like the pointer machine.

**Next steps (historical)**

1. Define `keyboardInteractionMachine`.
2. Rebuild `useKeyboardInteraction` on top of `useMachine()`.
3. Translate DOM events into machine events and apply guards.
4. Inject actions via the action API (`deleteSelectedTables`, `pasteTablesAt`, …).
5. Add tests and adjust existing hook tests.

## Observed pain points

- Many refs (`activePointerId`, `capturedPointerId`, timers) emulate implicit
  state machines and must be reset manually.
- Pointer side effects are spread across multiple hooks/listeners, which makes
  cancellation paths hard to follow.
- Context menus are reached differently depending on pointer type (long-press
  vs. right-click) but end up in the same states.
- Keyboard listeners are attached globally to the window and were hard to test
  in isolation.
- **Long-press control** used to live in `usePointerLongPress`. That hook has
  been removed: the machine now owns long-press timing via its `after`
  transitions (`TABLE_LONG_PRESS_DELAY`, `CANVAS_LONG_PRESS_DELAY`) with
  `longPressMode: 'machine'` as the default. The pending refs
  (`pendingTableLongPressRef` / `pendingCanvasLongPressRef`) still cache the
  client/scene coordinates the menu needs when the timer fires, while pointer
  moves feed the latest coordinates into the machine context.
