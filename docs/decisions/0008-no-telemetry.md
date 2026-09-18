# 0008 – No telemetry, no remote logging

- **Status:** accepted
- **In place since:** the performance layer was removed on 2026-09-05
- **Sources:** [PERFORMANCE.md](../PERFORMANCE.md#what-was-removed-2026-09-05),
  [LOGGING.md](../LOGGING.md#logger-api), [SECURITY.md](../SECURITY.md)

## Context

The app had grown about 1,700 lines of runtime performance tooling — a
dashboard overlay, render timing, memory polling, a navigation observer — and a
logger pair with buffering, sampling and a remote transport. None of it reached
a backend: the dashboard was visible only to a developer running the app
locally, the remote endpoint was never configured, and production sampling
silently dropped 90 % of the logs. The production CSP allows `connect-src 'self'`
only.

## Decision

- Logs go to the browser console and nowhere else.
- Web Vitals are measured and logged — a "poor" value as a warning — but neither
  stored nor sent.
- The dashboard, its hooks and the unused logger layers were removed.

## Alternatives considered

- **Keeping the dashboard.** Lighthouse and the browser's performance panel
  answer the same questions without any code.
- **Sending errors or metrics to an endpoint.** It would need a server, a CSP
  change and a privacy review ([0001](0001-offline-first-no-server.md)). If it
  ever becomes a requirement, the place is a second sink on `LoggerCore` or
  `handleMetric` in `webVitals.ts`, not a second logger.

## Consequences

There is no field data on errors or performance. Problems surface through the CI
gates, the bundle budgets, the feedback page and issue reports.

The error screens make that last channel usable: they show a reference code and
prepare a mail with the technical details (`src/utils/errorReport.ts`,
`src/components/errors/ErrorReportLink.tsx`). The report is composed in the
browser and sent by the user from their own mail program — still nothing that
leaves the device on its own. `CONTACT_EMAIL` decides where it goes, so a
self-hosted instance collects its own reports
([0012](0012-legal-pages-for-self-hosted-builds.md)).
