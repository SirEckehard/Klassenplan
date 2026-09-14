# 0005 – State machines for canvas pointer and keyboard input

- **Status:** accepted
- **Sources:** [canvas-interactions.md](../canvas-interactions.md) (event
  inventory and pain points), `src/stateMachines/canvas/`

## Context

Selecting, dragging, long-pressing and keyboard editing on the classroom canvas
used to be handled by hooks with many refs and timers. The event inventory
records the problems: the refs emulated implicit state machines and had to be
reset by hand, side effects were spread over several hooks so cancellation paths
were hard to follow, and the global keyboard listeners were hard to test.

## Decision

Two XState machines own the interaction state:

- `canvasPointerMachine` — press, drag, marquee selection, context menus, and
  the long-press timing through its `after` transitions (the former
  `usePointerLongPress` hook is gone);
- `keyboardInteractionMachine` — moving, rotating, deleting and clipboard
  operations.

Hooks inject the side effects as actions through refs; domain data stays in the
stores.

## Alternatives considered

Keeping refs and timers in the hooks — the previous state described above.

## Consequences

- Some refs remain next to the machine context, for example the coordinates a
  long-press menu needs.
- Template drag from the toolbar and room element drag from the palette do not
  use a machine. An unused `templateDragMachine` was removed on 2026-09-14.
