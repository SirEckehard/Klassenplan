# Design Decisions

Short records of decisions that are expensive to reverse: stored formats,
student data, what the algorithm produces, URLs, how the app is built and
delivered. Each record states the context, the decision, the alternatives that
were weighed and the consequences.

A record only states reasons that are documented somewhere — in the code, the
docs or the changelog — and names its sources. Where no reason is on record,
it says so instead of reconstructing one.

## Records

| No.                                           | Decision                                                   |
| --------------------------------------------- | ---------------------------------------------------------- |
| [0001](0001-offline-first-no-server.md)       | Offline-first: no server, no account                       |
| [0002](0002-single-indexeddb-entry-point.md)  | One IndexedDB entry point, repositories return a `Result`  |
| [0003](0003-algorithm-in-a-web-worker.md)     | The algorithm runs in a web worker with one implementation |
| [0004](0004-simulated-annealing-default.md)   | Simulated annealing as the app's refinement default        |
| [0005](0005-xstate-for-canvas-interaction.md) | State machines for canvas pointer and keyboard input       |
| [0006](0006-svg-scene-fixed-coordinates.md)   | SVG scene with a fixed 900 × 600 coordinate system         |
| [0007](0007-prerender-instead-of-ssr.md)      | Prerendered HTML instead of server-side rendering          |
| [0008](0008-no-telemetry.md)                  | No telemetry, no remote logging                            |
| [0009](0009-prompt-update-model.md)           | Service worker updates only after confirmation             |
| [0010](0010-plan-usage-from-actions.md)       | Plan usage is derived from actions, not asked for          |
| [0011](0011-english-under-en-on-de-domain.md) | English under `/en` on the `.de` domain                    |

## Reasons still to be recorded

These decisions are in place, but no reason is written down anywhere in the
repository:

- **AGPL-3.0-or-later instead of Apache-2.0.** The license changed on
  2026-06-08, the day of the open source release (commit `4c353286`).
- **Zustand stores next to React contexts** as the state layers.
- **The limit of 36 students per class** — see open question 1 in
  [ARCHITECTURE.md](../ARCHITECTURE.md#open-questions).

## Adding a record

Number it after the last one, keep it to a page, and link it from the document
that describes the affected part. A decision that replaces an earlier one sets
the old record's status to "superseded by NNNN" instead of deleting it.
