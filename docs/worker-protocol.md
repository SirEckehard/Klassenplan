# Worker Protocol

> **Status:** current · **Last reviewed:** 2026-09-14 · **Source of truth:**
> `src/workers/`, `src/utils/data/csvUtils.ts`

Klassenplan runs two kinds of web workers: a long-lived **algorithm worker**
that answers many requests, and a short-lived **CSV worker** that parses one
file and closes. Why the algorithm runs off the main thread is recorded in
[decision 0003](decisions/0003-algorithm-in-a-web-worker.md).

## Algorithm worker

### Operations

| Operation          | Payload                                                                                                                                              | Result            | Used for                                             |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | ---------------------------------------------------- |
| `mix:generate`     | `students`, `seatingHistory`, `mixHistory`, `planUsage?`, `lockedPositions`, `classroomScene`, `mixSettings`, `forceNew?`, `lastSeating?`            | `{ seating }`     | Constructing an arrangement ("Mischen")              |
| `mix:refine`       | `students`, `classroomScene`, `currentSeating`, `mixSettings`, `mixHistory`, `seatingHistory`, `planUsage?`, `lockedPositions`, `options?`, `start?` | `{ seating }`     | "Verfeinern", and "Mischen" when criteria are active |
| `circle:generate`  | `students`, `classroomScene`, `currentSeating?`                                                                                                      | `{ layout }`      | Seating circle                                       |
| `circle:optimized` | `students`, `classroomScene`, `mixSettings`, `seatingHistory`, `currentSeating?`                                                                     | `{ layout }`      | Seating circle with criteria                         |
| `worker:warmup`    | `{}`                                                                                                                                                 | `{ ready: true }` | Checking that a fresh worker answers                 |

Types: `AlgorithmWorkerRequestMap` in `algorithmWorker.types.ts`. `options` for
`mix:refine` are `{ triesPerPass?, passes? }`; the refinement defaults
(simulated annealing on) are merged in by `executeAlgorithmOperation`.

### Messages

```ts
// main thread → worker
{ requestId: string; operation; payload }

// worker → main thread
{ requestId; operation; status: 'success'; result }
{ requestId; operation; status: 'error'; error: { name?, message, stack?, details? } }
{ requestId; operation; status: 'progress'; progress: { progress: number; stage } }
```

- `requestId` is a UUID; responses to an unknown id are logged and ignored, and
  so are messages that are not requests.
- Payloads are structured-cloned, so they must not contain functions. The
  progress callback for refinement is created inside the worker.
- `progress` is a fraction between 0 and 1. `stage` is `initializing`,
  `analyzing` or `arranging` — **never text**: the worker does not know the UI
  language, the UI translates the stage.
- Refinement reports its fraction in steps of at least 2 %. Construction and the
  circle operations only send fixed stage markers.

### Client behaviour

`algorithmWorkerClient` (a singleton) owns the transport. Hooks call
`callOperation(operation, payload, { signal, onProgress, timeoutMs })`; UI code
never talks to the worker directly.

- **Start-up.** The module worker is created on the first call and has to answer
  `worker:warmup` within 2 s (8 s on the retry). After two failed attempts the
  client stops trying for the session.
- **Timeout.** The budget measures _silence_, not runtime: 120 s by default, and
  every progress message starts it over. On timeout the worker is terminated,
  the request rejects with `AlgorithmWorkerTimeoutError`, and the next request
  starts a fresh worker.
- **Abort.** An aborted `AbortSignal` rejects the request with an `AbortError`.
  The worker itself is not interrupted; its late answer is ignored.
- **Fallback.** The same `executeAlgorithmOperation` runs on the main thread,
  without progress messages, when workers are unsupported, when start-up failed,
  or when a request failed inside the worker. Aborted and timed-out requests are
  **not** re-run there: a job that was cancelled on purpose or has gone silent
  for two minutes would only freeze the UI.
- **Crash.** A runtime error in the worker terminates it; requests still pending
  are rejected and fall back to the main thread.

### Adding an operation

1. Add it to `AlgorithmWorkerOperation` and `AlgorithmWorkerRequestMap`, with a
   payload and result that survive structured cloning.
2. Implement it as a `case` in `executeAlgorithmOperation`, loading the
   algorithm module dynamically and reporting stages rather than text.
3. Call it through `algorithmWorkerClient.callOperation` from a hook.

## CSV worker

- **One worker per parse.** `parseWithWorker` in `csvUtils.ts` creates
  `csvParser.worker.ts` for files of 40 KB or more, when module workers are
  available (probed once; Chrome before version 125 is excluded).
- **Messages.** Request `{ type: 'parse', payload: { file, previewRows?, encoding? } }`;
  response `{ type: 'complete', payload: Papa.ParseResult }` or
  `{ type: 'error', payload: { message } }`. The worker closes itself after
  answering, so no request ids are needed.
- **Cancel and timeout.** Both terminate the worker, which stops the parse at
  once; the timeout is 12 s. Neither is retried on the main thread.
- **Fallback.** Any other failure parses the file on the main thread. After two
  failures the worker is skipped for the rest of the session.
- The worker runs the same header normalisation and preamble stripping as the
  inline parser. That is why `csvPreamble.ts` imports nothing but the shared
  column vocabulary: whatever it pulls in ends up in the worker bundle. The
  format itself is described in [csv-import.md](csv-import.md).
