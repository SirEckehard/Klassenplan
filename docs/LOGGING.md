# Logging Configuration

This document describes the logging system implemented in the classroom seating application.

## Overview

The application uses a centralized logging system with environment-based configuration. All console statements have been replaced with structured logging that respects log levels and provides context. The central API is `EnhancedLogger` (default instance `enhancedLogger`, exported from `@/utils/logging`); the familiar helpers (`logInfo`, `logWarn`, etc.) re-export through it. The browser-facing `clientLogger` handles dev-time console output, while the internal `ProfessionalLogger` engine provides buffering, sampling and remote-transport plumbing used by `EnhancedLogger`.

## Log Levels

- **DEBUG** (0): Detailed information for debugging (performance metrics, cache hits, algorithm details)
- **INFO** (1): General information (migrations, successful operations)
- **WARN** (2): Warning conditions (fallbacks, recoverable errors)
- **ERROR** (3): Error conditions (failed operations, exceptions)
- **SILENT** (4): No logging output

## Environment Configuration

### Development Mode (`npm run dev`)

- **Default Level**: INFO
- **Debug Mode**: Enable via `window.logger.enableDebug()` or `localStorage.setItem('debug', 'true')` (persists between reloads)
- **Console Output**: All levels are output to browser console with timestamps and context
- **Logger Access**: `window.logger` is available only in dev builds for direct inspection

### Production Mode (`npm run build`)

- **Default Level**: WARN
- **Debug Mode**: Toggle programmatically via `enhancedLogger.updateConfig({ level: LogLevel.DEBUG, debug: true })` or `logger.enableDebug()` hooks (no global `window.logger` in production builds)
- **Console Output**: Only warnings and errors are logged
- **Performance**: Minimal overhead as debug/info logs are filtered out

## Usage Examples

```typescript
import { logDebug, logInfo, logWarn, logError } from '@/utils';

// Debug information (development only)
logDebug(
  'Algorithm cache hit',
  { cacheKey, duration: '15ms' },
  'seatingAlgorithm',
);

// General information
logInfo('Migration completed', { migratedCount: 5 }, 'migrationService');

// Warnings
logWarn(
  'Fallback to JSON cloning',
  { reason: 'structuredClone failed' },
  'deepClone',
);

// Errors
logError(
  'IndexedDB operation failed',
  { error, operation: 'save' },
  'persistence',
);
```

All logger helpers are provided through the central utils API (`@/utils`).

## Log Format

All logs follow this structure:

```
[TIMESTAMP] [LEVEL] [SOURCE] MESSAGE CONTEXT
```

Example:

```
2023-01-01T12:00:00.000Z INFO [migrationService] Migration completed {"migratedCount": 5}
```

## Sources

Logs are tagged with source identifiers for easy filtering:

- `seatingAlgorithm` - Core algorithm operations
- `migrationService` - Data migrations
- `useSeatingPersistence` - Data persistence
- `autoArrange` - Table arrangement
- `deepClone` - Object cloning utilities
- `errorHandling` - Error handling system
- And more...

## Browser Console Commands

> **Note:** These commands are only available in dev builds, since `window.logger` is not exposed in production.

### Enable Debug Mode

```javascript
window.logger.enableDebug();
```

### Disable Debug Mode

```javascript
window.logger.disableDebug();
```

### Set Custom Log Level

```javascript
window.logger.setLevel(0); // DEBUG
window.logger.setLevel(1); // INFO
window.logger.setLevel(2); // WARN
window.logger.setLevel(3); // ERROR
window.logger.setLevel(4); // SILENT
```

### Check Current Level

```javascript
console.log(window.logger.getLevel());
```

## Professional Logger API

The advanced logging service is available as the default export `enhancedLogger` from `@/utils/logging`:

- `updateConfig({ level, debug, sampleRate, bufferSize })` – adjust thresholds at runtime
- `flush()` – write buffered log entries immediately (e.g. before `beforeunload`)
- `getMetrics()` / `getHistory(count?)` – inspect aggregated metrics and log history
- `time(label)` / `timeEnd(label)` – lightweight performance timing with log output
- `clear()` – reset buffer and metrics (useful between test runs)

Use these helpers for diagnostics tooling or telemetry integrations.

## Performance Impact

The logging system is designed for minimal performance impact:

- **Filtered Logs**: Logs below the current level are filtered before processing
- **Lazy Evaluation**: Context objects are only serialized when logs are actually output
- **Production Optimization**: In production builds, most logs are filtered out at runtime

## Testing

The logging system includes comprehensive tests:

- Log level filtering
- Message formatting
- Environment detection
- Context serialization
- Debug mode controls

Run tests with:

```bash
npm test src/utils/__tests__/logger.test.ts
```

## Migration from Console

All previous `console.*` statements have been systematically replaced:

- `console.log()` → `logInfo()`
- `console.info()` → `logInfo()`
- `console.warn()` → `logWarn()`
- `console.error()` → `logError()`
- `console.debug()` → `logDebug()`
- `console.time()/timeEnd()` → Performance timing with `logDebug()`

## Production Deployment

### Build-time Configuration

The logger automatically detects the environment via `import.meta.env.DEV` and configures itself accordingly.

### Runtime Configuration

For production troubleshooting, expose a temporary hook that calls the logger APIs directly (no `window.logger` is available):

```typescript
import enhancedLogger, { LogLevel } from '@/utils/logging';
import { logger } from '@/utils/logger';

// Elevate log level to DEBUG
enhancedLogger.updateConfig({ level: LogLevel.DEBUG, debug: true });
logger.enableDebug();
```

Remember to revert the configuration after debugging:

```typescript
enhancedLogger.updateConfig({ level: LogLevel.WARN, debug: false });
logger.disableDebug();
```

### Log Monitoring

In production, you may want to capture ERROR level logs for monitoring:

```typescript
// Add to production monitoring
const originalError = logger.error;
logger.error = (message, context, source) => {
  originalError(message, context, source);
  // Send to monitoring service
  if (window.analyticsService) {
    window.analyticsService.track('app_error', {
      message,
      source,
      context,
    });
  }
};
```

## Best Practices

1. **Use Appropriate Levels**: Choose the right log level for each message
2. **Provide Context**: Include relevant data in the context object
3. **Tag Sources**: Always provide a source identifier
4. **Avoid Sensitive Data**: Don't log user passwords or personal information
5. **Performance**: Use debug level for detailed performance information
6. **Error Context**: Include error objects in the context for stack traces

## Troubleshooting

### Logs Not Appearing

1. Check log level (dev builds): `window.logger.getLevel()` – in production, inspect `enhancedLogger.getMetrics()`
2. Ensure you're using the correct log function
3. Verify environment detection: `import.meta.env.DEV`

### Performance Issues

1. Verify production builds filter debug/info logs
2. Check for complex context objects being serialized
3. Monitor console output frequency

### Debug Mode Not Working

1. Check localStorage (dev builds): `localStorage.getItem('debug')`
2. Ensure the temporary instrumentation calls `logger.enableDebug()` / `enhancedLogger.updateConfig(...)`
3. Clear localStorage and retry (dev) or revert instrumentation changes (production)
