# Error Handling – Philosophy and Conventions

This document describes how Klassenplan detects errors, propagates them, and communicates them to the teacher. It is aimed at developers writing new repositories, services, or hooks, or modifying existing paths. The goal is consistent behavior across layers – not the individual elegance of any one `try/catch` block.

---

## 1. Scope

| Layer | Error convention |
|---|---|
| **Repositories** ([src/repositories/](../src/repositories/)) | **Always** return a `Result<T>`, never throw. |
| **Services** ([src/services/](../src/services/)) | Pass `Result<T>` through or wrap external errors into `Result`. Throw only if the operation is purely synchronous and the error is a programming error (e.g. `assert`). |
| **Hooks** ([src/hooks/](../src/hooks/)) | Consume `Result<T>`, map it to toasts/logs via [errorHandling.ts](../src/utils/errorHandling.ts). UI state is consistent after the call. |
| **UI components** ([src/components/](../src/components/)) | Never see `Result` types directly – only the final UI state (loading indicators, error messages from i18n). |
| **Utilities** ([src/utils/](../src/utils/)) | Pure functions without I/O may throw if input is a contract violation. Async utils should prefer `Result`. |

The layer boundaries are codified in [docs/MODULE_BOUNDARIES.md](MODULE_BOUNDARIES.md).

---

## 2. Result pattern

All persistence calls return a [`Result<T>`](../src/repositories/types.ts) – a discriminated union of `Success<T>` and `Failure`:

```ts
type Success<T> = { success: true; data: T };
type Failure    = { success: false; error: RepositoryError };
type Result<T>  = Success<T> | Failure;
```

### Constructing

Repositories use the helpers from [src/repositories/types.ts](../src/repositories/types.ts):

```ts
import { ResultHelpers, RepositoryErrorType } from '@/repositories/types';

async function loadStudents(): Promise<Result<Student[]>> {
  try {
    const students = await idbKeyval.get('spg.students');
    return ResultHelpers.success(students ?? []);
  } catch (error) {
    return ResultHelpers.failure({
      type: RepositoryErrorType.STORAGE_ERROR,
      message: 'Student list could not be loaded.',
      originalError: error,
    });
  }
}
```

`ResultHelpers.fromError(error, type, message)` is a shortcut when the original `Error` object should be passed through without further processing.

### Consuming

Consumers use the discriminated union directly – no `try/catch`:

```ts
const result = await repository.loadStudents();
if (!result.success) {
  errorHandlers.storageError(result.error.message);
  return;
}
setStudents(result.data);
```

### When to use `Result` – and when not

| Use `Result<T>` | Just throw |
|---|---|
| Async I/O (IndexedDB, fetch, File API) | Programming errors in pure utilities (e.g. `invariant`) |
| External interfaces with error subtypes (validation, storage, conflict) | Immediate API contract violations (e.g. `null` where a value is expected) |
| When the caller should differentiate | When only "works / doesn't work" matters and throwing ends up in an outer `try/catch` anyway |

---

## 3. Error types

Repository errors carry a `RepositoryErrorType` from the enum in [src/repositories/types.ts](../src/repositories/types.ts):

| Type | Trigger | Recommended user mapping |
|---|---|---|
| `NOT_FOUND` | Unique ID/key does not exist | Silent correction (e.g. default value) or info toast – rarely an error |
| `STORAGE_ERROR` | IndexedDB / web-storage operation fails (quota, private mode, browser bug) | Error toast with `TOAST_MESSAGES.SAVE_ERROR` etc. |
| `VALIDATION_ERROR` | Input fails schema or sanity check | Warning toast from `TOAST_MESSAGES.VALIDATION_*` |
| `DUPLICATE_KEY` | Uniqueness violated (e.g. duplicate class name) | Warning toast from `TOAST_MESSAGES.CLASS_NAME_EXISTS` etc. |
| `UNKNOWN_ERROR` | Fallback when the original error could not be classified | Error toast with a generic message |

The type is the only piece of information that UI code should use for mapping. The `message` property is meant for logs, **not** as an immediate user message – it may be in English or technical. Localized user messages come from `TOAST_MESSAGES` (see section 5).

---

## 4. Logging convention

Logging goes exclusively through the four helpers in [src/utils/logger.ts](../src/utils/logger.ts) (re-exported via `@/utils`):

```ts
import { logDebug, logInfo, logWarn, logError } from '@/utils';
```

The full configuration is in [docs/LOGGING.md](LOGGING.md). Two conventions apply for error handling:

### 4.1 Level choice

| Level | When |
|---|---|
| `logDebug` | Expected state transitions, cache hits, algorithm phases. Not visible in production. |
| `logInfo` | Successful migrations, planned re-initializations, class switches. |
| `logWarn` | Recoverable fallbacks (e.g. localStorage quota exceeded, default loaded). |
| `logError` | Unexpected errors, aborted operations, all `RepositoryErrorType.STORAGE_ERROR` / `UNKNOWN_ERROR`. |

### 4.2 Source slug

The third argument is a **module slug** (not a path, not a free-text sentence) that allows logs to be filtered and correlated:

```ts
logError(
  'Class switch failed: target id not found',
  { classId, knownIds: summaries.map((s) => s.id) },
  'classManagement', // ← source slug
);
```

Convention: lowerCamelCase, no path prefix, roughly by domain (`seatingAlgorithm`, `classManagement`, `featureStores`, `errorHandling`, …). Introduce a short, unique slug for new modules.

---

## 5. User messaging

User-visible messages go through the toast system in [src/utils/ui/toast.ts](../src/utils/ui/toast.ts). **No** direct `alert()` calls, **no** inline strings.

### 5.1 i18n keys instead of strings

`TOAST_MESSAGES` maps stable keys (e.g. `SAVE_ERROR`) to i18n paths (e.g. `'toast:save.error'`). The toast renderer resolves the path at runtime via `i18n.t()`. This prevents hard-coded strings and enforces DE/EN consistency.

```ts
import { showToast, TOAST_MESSAGES } from '@/utils/ui/toast';

showToast('error', TOAST_MESSAGES.SAVE_ERROR);
```

New errors need a new key in `TOAST_MESSAGES` **and** translation entries in [src/i18n/locales/](../src/i18n/locales/).

### 5.2 Severity mapping

The central handler in [src/utils/errorHandling.ts](../src/utils/errorHandling.ts) maps `ErrorSeverity` to toast behavior:

| Severity | Toast type | Duration | Visible? |
|---|---|---|---|
| `SILENT` | – | – | Logged only |
| `WARNING` | `warning` | 4 s | Yes |
| `ERROR` | `error` | 5 s | Yes |
| `CRITICAL` | `critical` | persistent | Yes, must be closed manually |

Prefer the convenience helpers from `errorHandlers` (see [errorHandling.ts:164](../src/utils/errorHandling.ts#L164)) over direct calls to `handleError`:

```ts
import { errorHandlers } from '@/utils/errorHandling';

errorHandlers.storageError(error, 'Background migration could not be completed.');
```

### 5.3 `safeTryCatch` for async boundaries

At UI/service boundaries that consume external promises, [`safeTryCatch`](../src/utils/errorHandling.ts) provides a compact variant: run the operation, toast + log on failure, return undefined.

```ts
const result = await safeTryCatch(
  () => exportPlanToPdf(plan),
  ErrorCategory.EXPORT,
  ErrorSeverity.ERROR,
);
if (!result) return; // Error has already been handled
```

---

## 6. Anti-patterns

What to avoid, with reasoning:

| Anti-pattern | Why it's bad | Instead |
|---|---|---|
| `try { … } catch (e) {}` (silent swallow) | Errors disappear without a trace; debugging is impossible | `errorHandlers.silentError(e, { context })` – logs remain, UI is not disturbed |
| `console.error(...)` directly | No filter level, no source slug, no production throttling | `logError(message, context, 'moduleSlug')` |
| Generic `throw new Error("…")` from repositories | Breaks the Result pattern, forces callers into a second `try/catch` | `return ResultHelpers.failure({ type, message, originalError })` |
| Passing `Result<T>` through to a UI component | The component has to handle the failure branch locally → unnecessary complexity | Map to user message + state in the hook; pass only the result down |
| `alert(message)` or inline strings in JSX | Breaks i18n, blocks the UI, not stylable | `showToast(severity, TOAST_MESSAGES.KEY)` |
| Hard-coded error text | No DE/EN, no maintainability | New key in `TOAST_MESSAGES` + i18n locales |

---

## 7. Test convention

Failure branches must be tested just like happy paths. Rule of thumb: **at least one failure test per `Result` call**.

```ts
import { ResultHelpers, RepositoryErrorType } from '@/repositories/types';

it('shows a toast on storage error', async () => {
  vi.mocked(repository.save).mockResolvedValueOnce(
    ResultHelpers.failure({
      type: RepositoryErrorType.STORAGE_ERROR,
      message: 'quota exceeded',
    }),
  );

  await act(async () => {
    await result.current.save();
  });

  expect(showToastMock).toHaveBeenCalledWith('error', TOAST_MESSAGES.SAVE_ERROR);
});
```

Real-world examples:
- [src/hooks/wizard/__tests__/useSeatingWizard.test.ts](../src/hooks/wizard/__tests__/useSeatingWizard.test.ts) – failure paths of `saveSeatingPlan`
- [src/stores/__tests__/algorithmStore.test.ts](../src/stores/__tests__/algorithmStore.test.ts) – `setShowStatisticsBadge` with `localStorage.setItem` throwing
- [src/stores/__tests__/studentsStore.test.ts](../src/stores/__tests__/studentsStore.test.ts) – `importCsv` with an empty service result

---

## 8. Related documents

- [docs/MODULE_BOUNDARIES.md](MODULE_BOUNDARIES.md) – layer boundaries and which layer is allowed to throw what
- [docs/LOGGING.md](LOGGING.md) – detailed logger configuration (levels, storage, browser hooks)
- [docs/SECURITY.md](SECURITY.md) – CSP and data-protection aspects (e.g. that logs must not contain PII)
