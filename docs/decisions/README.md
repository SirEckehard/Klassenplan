# Design Decisions

Short records of decisions that are expensive to reverse: stored formats,
student data, what the algorithm produces, URLs, how the app is built and
delivered. Each record states the context, the decision, the alternatives that
were weighed and the consequences.

A record only states reasons that are documented somewhere — in the code, the
docs or the changelog — and names its sources. Where no reason is on record,
it says so instead of reconstructing one.

## Records

| No.                                                | Decision                                                   |
| -------------------------------------------------- | ---------------------------------------------------------- |
| [0001](0001-offline-first-no-server.md)            | Offline-first: no server, no account                       |
| [0002](0002-single-indexeddb-entry-point.md)       | One IndexedDB entry point, repositories return a `Result`  |
| [0003](0003-algorithm-in-a-web-worker.md)          | The algorithm runs in a web worker with one implementation |
| [0004](0004-simulated-annealing-default.md)        | Simulated annealing as the app's refinement default        |
| [0005](0005-xstate-for-canvas-interaction.md)      | State machines for canvas pointer and keyboard input       |
| [0006](0006-svg-scene-fixed-coordinates.md)        | SVG scene with a fixed 900 × 600 coordinate system         |
| [0007](0007-prerender-instead-of-ssr.md)           | Prerendered HTML instead of server-side rendering          |
| [0008](0008-no-telemetry.md)                       | No telemetry, no remote logging                            |
| [0009](0009-prompt-update-model.md)                | Service worker updates only after confirmation             |
| [0010](0010-plan-usage-from-actions.md)            | Plan usage is derived from actions, not asked for          |
| [0011](0011-english-under-en-on-de-domain.md)      | English under `/en` on the `.de` domain                    |
| [0012](0012-legal-pages-for-self-hosted-builds.md) | Operators link their own legal pages at build time         |
| [0013](0013-one-performance-criterion.md)          | One performance criterion at a time                        |
| [0014](0014-mix-history-records-refined-plan.md)   | The mix history records the refined plan                   |
| [0015](0015-onboarding-sample-class-and-tour.md)   | A sample class and coach marks for the first visit         |
| [0016](0016-hidden-criteria-carry-no-weight.md)    | Criteria the class has no data for carry no weight         |
| [0017](0017-seats-are-paper-and-ink.md)            | A seat is paper and ink, not a gender colour (superseded)  |
| [0018](0018-criteria-in-words-with-recipes.md)     | The criteria are set in words, and a recipe sets them all  |
| [0019](0019-classroom-tools-as-routes.md)          | The three classroom tools are routes, not panels           |
| [0020](0020-gender-tint-on-seats.md)               | Seats carry a quiet gender tint again                      |
| [0021](0021-seat-badges-explained.md)              | The badges on a seat explain themselves                    |
| [0022](0022-one-drag-for-plan-and-circle.md)       | One drag for the plan and the circle, locks in the circle  |

## Reasons still to be recorded

These decisions are in place, but no reason is written down anywhere in the
repository:

- **AGPL-3.0-or-later instead of Apache-2.0.** The license changed on
  2026-06-08, the day of the open source release (commit `4c353286`).
- **Zustand stores next to React contexts** as the state layers.
- **The limit of 36 students per class** — see open question 1 in
  [ARCHITECTURE.md](../ARCHITECTURE.md#open-questions).

## When a record is needed

The test is the cost of being wrong. Write a record — or update the existing
one — **before** implementing a change that

- changes a stored shape: the class collection, another IndexedDB store, a
  localStorage key or the backup format;
- stores, shows or exports personal data that was not handled before, or shows
  existing data in a new place (projector, export);
- changes which seating plans the algorithm produces for the same input —
  weights, scoring, refinement defaults;
- adds, removes or renames a route, or changes what a URL serves;
- adds an external connection or loosens the Content Security Policy;
- introduces a dependency that would be hard to replace later — storage, state
  management, rendering, build.

A new button, a refactoring that keeps behaviour or a dependency update needs no
record. When a change answers one of the open questions in
[ARCHITECTURE.md](../ARCHITECTURE.md#open-questions), move that question to
"Resolved questions" there as well.

## Adding a record

Copy [TEMPLATE.md](TEMPLATE.md), number it after the last record, keep it to a
page, and link it from the document that describes the affected part. A
decision that replaces an earlier one sets the old record's status to
"superseded by NNNN" instead of deleting it.
