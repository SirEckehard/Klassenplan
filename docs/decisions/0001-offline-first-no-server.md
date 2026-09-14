# 0001 – Offline-first: no server, no account

- **Status:** accepted
- **In place since:** v1.0.0 (2025-08-30); offline use since v1.2.0 (2025-12-13)
- **Sources:** [ARCHITECTURE.md](../ARCHITECTURE.md#background),
  [SECURITY.md](../SECURITY.md#1-data-privacy-gdpr-compliance),
  [PEDAGOGY.md](../PEDAGOGY.md), [CHANGELOG.md](../CHANGELOG.md)

## Context

The data a seating plan needs is personal and partly sensitive: names, optional
photos and short descriptions of current behaviour, mostly of minors. Depending
on the reason behind it, a flag such as `needsFrontSeat` can touch Art. 9 GDPR.
Teachers use the tool on their own laptops, on school computers and on the
classroom projector.

## Decision

Klassenplan runs entirely in the browser. The server delivers static files and
nothing else: no account, no server-side storage, no data transmission. Live
data sits in IndexedDB, unencrypted. The only way data leaves a browser is a
backup file the teacher exports, encrypted with a password. Since v1.2.0 the app
works offline once loaded.

## Alternatives considered

- **Encrypting the live database.** Rejected: without a server and an account
  there is nowhere to keep a key that the device's own protections — OS
  account, disk encryption, browser profile — do not already guard.
- **A server with accounts and sync.** Not pursued; it would put student data on
  a server, which is exactly what this decision avoids.

## Consequences

- Moving to another device takes an exported backup; a reminder appears when the
  last one is more than 30 days old.
- Anyone with access to the same browser profile can read the data. The
  mitigation is organisational (one profile per person).
- The browser may evict storage, so the app asks for persistent storage once a
  class exists.
- No telemetry ([0008](0008-no-telemetry.md)), search engines get prerendered
  HTML ([0007](0007-prerender-instead-of-ssr.md)), and a school can host the
  static image itself.
