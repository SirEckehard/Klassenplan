# 0003 – The algorithm runs in a web worker with one implementation

- **Status:** accepted
- **Sources:** module comments in `src/workers/algorithmOperations.ts` and
  `src/workers/algorithmWorkerClient.ts`; `AGENTS.md` (Algorithm & Layout Engine);
  [worker-protocol.md](../worker-protocol.md)

## Context

Constructing and especially refining a seating plan is computationally
intensive. The UI has to stay responsive while it runs — on a laptop as well as
on a tablet or the classroom PC.

## Decision

- Algorithm operations run in a dedicated web worker, reached only through
  `algorithmWorkerClient`.
- `executeAlgorithmOperation` in `algorithmOperations.ts` is the **single
  implementation**, called by the worker and by the main-thread fallback alike,
  so the two paths cannot drift apart in defaults or argument order.
- The request timeout measures silence, not runtime; progress messages reset it.
- The worker reports progress as stages, never as text, because it does not know
  the UI language.

## Alternatives considered

- **Re-running a timed-out or aborted request on the main thread.** Rejected: a
  worker that has been silent for two minutes is stuck, and running the same job
  inline would freeze the UI for just as long instead of failing visibly.
- **Running only on the main thread.** Kept as the fallback for browsers without
  workers and for requests the worker failed, not as the normal path.

## Consequences

- Payloads must survive structured cloning; callbacks are created inside the
  worker.
- Defaults such as simulated annealing live in `algorithmOperations.ts` and
  nowhere else ([0004](0004-simulated-annealing-default.md)).
