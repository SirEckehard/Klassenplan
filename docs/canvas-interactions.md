# Event inventory for canvas interactions

## Scope

This document describes the current pointer and keyboard flows around
`useCanvasInteraction`, `useTableInteraction`, and `useKeyboardInteraction`. It
shows which events are handled where, which context data is needed, and which
side effects are triggered. Long-press timing is owned by `canvasPointerMachine`
through its `after` transitions. The overview is the basis for the declarative
state machines that drive these flows.

Dragging room features from the palette (`useFeaturePaletteDrag`) is not covered
here.

## Shared context & mutable references

- **Selection state**: `selectedTableIds` (React state from context) plus the
  local `selectionBox` state in `useCanvasInteraction` for marquee selection.
- **Pointer machine (`canvasPointerMachine`)**:
  - `activePointer`, `tablePress`, `canvasPress`, and `dragSnapshot` describe
    the current pointer including its start coordinates.
  - The `clipboard` snapshot (tables + feature count) feeds guards for
    long-press events.
  - `longPressDurations` (500 ms for tables and canvas) set the delays of the
    `after` transitions `TABLE_LONG_PRESS_DELAY` and `CANVAS_LONG_PRESS_DELAY`.
    The `isMachineLongPressEnabled` guard arms them for touch and pen pointers
    only.
- **`useTableInteraction`** holds the UI-adjacent mutation pieces:
  - `capturedPointerId` for pointer capture on the SVG.
  - `dragInfo` (indices + start positions) and `hasDragged` for delta
    calculations.
  - Template-specific states (`useTemplateDrag` + `templateDragPreview`).
- **Long-press pending refs** (`useCanvasInteraction`):
  - `pendingTableLongPressRef` / `pendingCanvasLongPressRef` store the pointer
    id, pointer type, and the start/last client and scene coordinates the
    context menu needs when the machine's timer fires. The table variant also
    keeps the table index, the multi-select flag and `meta.selectionApplied`.
    No timer lives in the hook.
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
2. The pending ref stores the coordinates (the timer is the machine's
   `TABLE_LONG_PRESS_DELAY`); `meta.selectionApplied` stays `false` so a tap
   without drag can still select later.
3. As soon as the machine reaches `draggingSelection` or the long press fires,
   `handleDragEntry` or `handleContextMenuEntry` applies the selection.
   Otherwise `handleCanvasPointerUp` applies it afterwards.

### 3. Dragging a table

1. `handleCanvasPointerMove` forwards every pointer move (incl. scene and
   client coordinates) to the machine.
2. The first `POINTER_MOVE` from the active pointer (`isPointerForActiveContext`
   compares pointer ids) takes the machine from `tablePressPending` to
   `draggingSelection`, which also cancels the pending long-press timer.
   `DRAG_DISTANCE_THRESHOLD` (6 scene units, a local constant in
   `useCanvasInteraction`) only governs the pending long-press ref: once the
   pointer has moved that far, the hook clears `pendingTableLongPressRef` and
   sends `DRAG_THRESHOLD_REACHED`.
3. Entering `draggingSelection` runs `handleDragEntry`, which applies the
   selection for the pressed table and calls
   `initializeDragFromSelection(selection, scenePoint)` in
   `useTableInteraction`. There, `dragInfo` is populated, start values are
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

1. When `TABLE_LONG_PRESS_DELAY` expires, the machine raises
   `LONG_PRESS_TIMEOUT` and enters `contextMenuOpen`. Its entry action
   `handleContextMenuEntry` reads `pendingTableLongPressRef`:
   - Apply the selection if that has not happened yet.
   - Close the canvas menu, open the table menu at the last client position
     with the pointer type (`trigger: 'longpress'`).
   - Release pointer capture so dialogs stay operable, clear both pending refs.

### 5. Canvas press → marquee selection

1. `pointerdown` on the SVG background triggers `beginSelectionWithLongPress`.
2. Guards:
   - Ignore right-click.
   - Long-press only starts when clipboard content is available.
3. `beginSelectionWithLongPress` sends `POINTER_DOWN_CANVAS`. For a press on
   the background itself it starts the marquee: pointer capture, scene
   coordinate, `selectionBox`, `clearSelection()`.
4. The first `POINTER_MOVE` moves the machine to `selectionBoxActive`; on every
   move `updateSelectionFromPoint` updates both the frame and
   `selectedTableIds`.
5. `POINTER_UP` / `POINTER_CANCEL` release pointer capture and call
   `resetSelectionState`. `handleCanvasPointerUp` also clears the associated
   pending refs.

### 6. Canvas long-press → paste menu

1. On press, `useCanvasInteraction` stores client and scene coordinates in
   `pendingCanvasLongPressRef` (touch/pen, clipboard content, press on the
   background).
2. When `CANVAS_LONG_PRESS_DELAY` expires and `canOpenCanvasMenu` finds table
   or feature clipboard content, `handleContextMenuEntry` runs:
   - `cancelSelectionInteraction()` cleans up selection + pointer capture.
   - Close the table menu, open the canvas menu with the stored coordinates.
   - Reset pending refs to prevent multiple triggers.

### 7. Template drag from the toolbar

This flow does not use a state machine. `templateDragMachine` exists in
`src/stateMachines/canvas/` but is not wired up.

1. `pointerdown` on a template (`onTemplatePointerDown`) calls
   `useTemplateDrag.startTemplateDrag(type, event)`. It keeps pointer id and
   template type in a ref, caches the canvas rectangle for that pointer and
   attaches `pointermove` / `pointerup` / `pointercancel` listeners to
   `window`.
2. `resolvePointerMetrics` checks on every event whether the pointer is over
   the canvas.
3. Each move updates `templateDragPreview` (type, client and canvas position,
   `overCanvas`, drop placement); outside the canvas the alignment guides are
   cleared.
4. On release, `dropTemplateAt` runs only if the pointer is over the canvas;
   then the preview, the cached rectangle and the listeners are cleaned up.
   `pointercancel` goes through the same handler, so a cancelled pointer over
   the canvas drops the template as well.

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
- `cancelSelectionInteraction` sends `CANCEL` to the machine and bundles drag
  cancel, template cancel, and capture release.
- Pending long-press refs are cleared on every pointer-up/cancel and in the
  `useEffect` cleanup.

## Keyboard flows

### Event routing (`useKeyboardInteraction.ts`)

1. Global `keydown` / `keyup` listeners on `window`. Every `keydown` first
   dispatches `SYNC_STATUS`, so the machine knows `selectionCount` (derived
   from `hasSelection`, tables and features), `hasClipboardContent`, and
   `focusInInput`.
2. Arrow keys dispatch `KEY_ARROW` (direction, shift state, `repeat`); `keyup`
   produces `KEY_RELEASE` to stop auto-repeat. Ignored while a form field is
   focused or with Ctrl, Cmd or Alt held.
3. `E` / `Q` dispatch `KEY_ROTATE` (clockwise / counter-clockwise, shift
   state). Ignored under the same conditions as arrow keys.
4. Delete/Backspace produce `KEY_DELETE`; `Ctrl|Cmd + C/X/V` are translated to
   `KEY_COPY`, `KEY_CUT`, `KEY_PASTE`. Both are ignored while a form field is
   focused.

### Machine states (`keyboardInteractionMachine.ts`)

| State             | Events                 | Guards                 | Actions                                                                        |
| ----------------- | ---------------------- | ---------------------- | ------------------------------------------------------------------------------ |
| `keyboardIdle`    | `KEY_ARROW`            | `keyboardInputBlocked` | Stay in `keyboardIdle`                                                         |
|                   | `KEY_ARROW`            | `hasSelection`         | Store direction, `moveSelection` → `movingSelection`                           |
|                   | `KEY_ROTATE`           | `keyboardInputBlocked` | Stay in `keyboardIdle`                                                         |
|                   | `KEY_ROTATE`           | `hasSelection`         | `rotateSelection`                                                              |
|                   | `KEY_DELETE`           | `hasSelection`         | `deleteSelection`                                                              |
|                   | `KEY_COPY` / `KEY_CUT` | `hasSelection`         | `copySelection` / `cutSelection`, then `clipboardOp`                           |
|                   | `KEY_PASTE`            | `hasClipboardContent`  | `closeCanvasMenu`, `pasteSelection`, then `clipboardOp`                        |
|                   | `KEY_RELEASE`          | –                      | Reset direction                                                                |
| `movingSelection` | `KEY_ARROW`            | `keyboardInputBlocked` | Immediately back to `keyboardIdle`, reset direction                            |
|                   | `KEY_ARROW`            | `hasSelection`         | Repeated moves (auto-repeat)                                                   |
|                   | `KEY_RELEASE`          | `isMatchingRelease`    | Reset direction, back to `keyboardIdle`                                        |
| `clipboardOp`     | –                      | –                      | Actions run on the transition; the state immediately returns to `keyboardIdle` |

`hasSelection` and `hasClipboardContent` are false while a form field is
focused. `SYNC_STATUS` updates the context in every state; `RESET` returns to
`keyboardIdle`.

All actions are injected via `actionApiRef`, so the machine instance stays
stable across renders:

- `moveSelection` – takes a history snapshot, then moves the selected tables by
  1 (10 with Shift), multiplied by `GRID_SNAP_SIZE` while snapping is on.
  Positions are snapped and clamped to the room bounds; locked tables stay put.
  Features are not moved by the keyboard.
- `rotateSelection` – takes a history snapshot and rotates the unlocked
  selected tables by `DEFAULT_ROTATION_SNAP_STEP`, or by 90° with Shift.
- `deleteSelection`, `copySelection`, `cutSelection`, `pasteSelection` – the
  unified table + feature operations passed in from `CanvasInteractionLayer`;
  keyboard paste calls `pasteSelectionAt()` without coordinates.
- `closeCanvasMenu` – prevents keyboard paste from leaving menus open.
- `logKeyboardState` – debug log under the source `keyboardMachine`.

## Pointer state matrix (current state)

| Mode                                       | Event (source)                                                                                             | Guards                                           | Next mode            | Side effects                                                                                   |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | -------------------- | ---------------------------------------------------------------------------------------------- |
| `idle`                                     | `POINTER_DOWN_TABLE` (`handleTablePointerDown`)                                                            | Table unlocked, no right-click                   | `tablePressPending`  | Close menus, clear pending refs, set pointer capture, prepare long-press                       |
| `idle`                                     | `POINTER_DOWN_CANVAS` (`beginSelectionWithLongPress`)                                                      | No right-click                                   | `canvasPressPending` | Marquee starts on the background; pending canvas long-press with clipboard content (touch/pen) |
| `tablePressPending`                        | `POINTER_MOVE` (`handleCanvasPointerMove`)                                                                 | `isPointerForActiveContext`                      | `draggingSelection`  | `handleDragEntry` + `handleDragMove`; long-press timer cancelled                               |
| `tablePressPending`                        | `DRAG_THRESHOLD_REACHED` (pending ref moved ≥ `DRAG_DISTANCE_THRESHOLD`)                                   | Target is a table                                | `draggingSelection`  | As above                                                                                       |
| `tablePressPending`                        | `LONG_PRESS_TIMEOUT` (`TABLE_LONG_PRESS_DELAY`)                                                            | Timer armed for touch/pen only                   | `contextMenuOpen`    | `handleContextMenuEntry`: apply selection, open table menu, release capture                    |
| `tablePressPending`                        | `POINTER_UP` / `POINTER_CANCEL` (`handleCanvasPointerUp`)                                                  | `isPointerForActiveContext`                      | `idle`               | Hook applies the selection if `meta.selectionApplied === false`                                |
| `canvasPressPending`                       | `POINTER_MOVE`                                                                                             | `isPointerForActiveContext`                      | `selectionBoxActive` | Hook updates selection rectangle & selection live                                              |
| `canvasPressPending`                       | `LONG_PRESS_TIMEOUT` (`CANVAS_LONG_PRESS_DELAY`)                                                           | `canOpenCanvasMenu` (table or feature clipboard) | `contextMenuOpen`    | `handleContextMenuEntry`: cancel selection, open canvas menu                                   |
| `canvasPressPending`, `selectionBoxActive` | `POINTER_UP` / `POINTER_CANCEL`                                                                            | `isPointerForActiveContext`                      | `idle`               | Hook commits the selection, clears rectangle and pending refs                                  |
| `draggingSelection`                        | `POINTER_MOVE`                                                                                             | `isPointerForActiveContext`                      | `draggingSelection`  | `handleDragMove`: snapshot once, apply deltas, haptics                                         |
| `draggingSelection`                        | `POINTER_UP` / `POINTER_CANCEL`                                                                            | `isPointerForActiveContext`                      | `idle`               | `handleDragExit`: finalize drag, commit scene, release capture                                 |
| `contextMenuOpen`                          | `CONTEXT_MENU_CLOSED` (`closeTableContextMenu` / `closeCanvasContextMenu`), `POINTER_UP`, `POINTER_CANCEL` | –                                                | `idle`               | Exit action `handleContextMenuExit` closes both menus and clears pending refs                  |

`ESCAPE` returns every state to `idle`; `CANCEL` does the same for
`canvasPressPending`, `tablePressPending` and `contextMenuOpen`.
`SYNC_CLIPBOARD` updates the clipboard snapshot in any state. Template drag
(flow 7) is not part of this machine.

## Keyboard mode snapshot

| Condition           | Key                    | Side effects                                                                   |
| ------------------- | ---------------------- | ------------------------------------------------------------------------------ |
| Selection present   | `Arrow` keys           | Prevent default, snapshot, move, snap & clamp selected tables (locked skipped) |
| Selection present   | `E` / `Q`              | Prevent default, snapshot, rotate clockwise / counter-clockwise                |
| Selection present   | `Delete` / `Backspace` | Prevent default, `deleteSelection` (tables and features)                       |
| Selection present   | `Ctrl/Cmd + C`         | Copy selection to clipboard                                                    |
| Selection present   | `Ctrl/Cmd + X`         | Cut selection                                                                  |
| Clipboard populated | `Ctrl/Cmd + V`         | Close canvas menu, paste                                                       |

## Known pain points

- Refs still carry state next to the machine's own context and must be reset
  by hand: `pendingTableLongPressRef`, `pendingCanvasLongPressRef`,
  `selectionPointerIdRef` and `selectionStartRef` in `useCanvasInteraction`,
  `capturedPointerId`, `dragInfo` and `hasDragged` in `useTableInteraction`.
- Pointer side effects are spread across multiple hooks/listeners, which makes
  cancellation paths hard to follow.
- Three drag paths share no model: table drag runs through
  `canvasPointerMachine`, template drag through `useTemplateDrag` with its own
  `window` listeners, and feature drag through `useFeaturePaletteDrag` with its
  own copy of `DRAG_DISTANCE_THRESHOLD`.
- Context menus are reached differently depending on pointer type (long-press
  vs. right-click) but end up in the same states.
- Keyboard listeners are attached globally to `window`; they are covered by
  `src/hooks/ui/__tests__/useKeyboardInteraction.test.ts`.
- Any `POINTER_MOVE` from the active pointer leaves `tablePressPending`, and
  with it the long-press timer. `DRAG_DISTANCE_THRESHOLD` only applies to the
  pending ref, so on touch a finger that moves slightly within the 500 ms
  starts a drag instead of opening the table menu.
