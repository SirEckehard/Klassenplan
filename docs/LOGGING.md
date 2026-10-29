# Logging

How the app logs: one logger, four levels, the browser console as the only
destination.

## Modules

- `utils/logging/loggerCore.ts` — level filtering, entry shape, formatter and
  sink. It knows no environment, so a sink of another kind needs no second
  logger.
- `utils/logging/logger.client.ts` — the browser instance (`clientLogger`),
  wired to a console sink, plus the `logDebug`/`logInfo`/`logWarn`/`logError`
  helpers.

Code imports the helpers from `@/utils`. `@/utils/logger` also exports `logger`
(the `clientLogger` singleton) and `LogLevel`. `console.*` appears only in the
logger itself and in tests.

## Levels and environments

| Level  | Value | For                                     |
| ------ | ----: | --------------------------------------- |
| DEBUG  |     0 | Algorithm details, cache hits, timings  |
| INFO   |     1 | Migrations, successful operations       |
| WARN   |     2 | Fallbacks, errors the app recovers from |
| ERROR  |     3 | Failed operations                       |
| SILENT |     4 | Nothing                                 |

- **Development** (`npm run dev`) logs INFO and up. `window.logger` is
  available there: `enableDebug()` switches to DEBUG and remembers it in
  `localStorage` (`debug`), `disableDebug()` switches back, `setLevel(n)` and
  `getLevel()` set and read the threshold.
- **Production** logs WARN and up and has no `window.logger`. For a session of
  troubleshooting, call `logger.enableDebug()` from `@/utils/logger` in a
  temporary change, and take it out again.

## Calling it

```typescript
import { logDebug, logInfo, logWarn, logError } from '@/utils';

logInfo('Migration completed', { stats }, 'migrationService');
logWarn('Fallback to JSON cloning', { reason }, 'deepClone');
logError(
  'IndexedDB operation failed',
  { error, operation: 'save' },
  'persistence',
);
```

The third argument names the source — the module or hook, as in
`useSeatingPersistence` or `seatingAlgorithm`. Pass an `Error` in the context,
so the console shows its stack.

A line reads `<ISO timestamp> <LEVEL> [<source>] <message> <context as JSON>`,
for example:

```
2026-10-29T12:00:00.000Z INFO [migrationService] Migration completed {"stats":{…}}
```

## No personal data, and nothing leaves the browser

- Identify students by id, never by name, and log no attributes, photos or
  backup passwords. Names a teacher typed — classes, plans, templates — and
  imported file names can hold student names too: prefer ids or counts.
- Logs go to the browser console and nowhere else: nothing is stored, buffered
  or sent, and the production CSP (`connect-src 'self'`) blocks any third-party
  endpoint. [PERFORMANCE.md](PERFORMANCE.md) records the same decision for Web
  Vitals. Sending logs anywhere would need a CSP change and a privacy review
  first, and then a second sink on `LoggerCore` rather than a second logger.

## Tests

`src/utils/__tests__/logger.test.ts` covers level filtering, the format and the
debug switch.
