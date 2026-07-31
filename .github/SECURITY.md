# Security Policy

## Reporting a Vulnerability

Please report security vulnerabilities **privately** before public disclosure:

- Email: webmaster@klassenplan.de
- Alternatively via [GitHub Security Advisories](https://github.com/SirEckehard/Klassenplan/security/advisories/new)

Please include a description of the issue, reproduction steps, and the affected
version. We aim to acknowledge reports within a few days.

Do not open a public GitHub issue for security problems.

## Supported Versions

Only the latest released version receives security fixes. Klassenplan is a
client-side application without a backend; deployments are expected to track the
current release.

## Scope

Klassenplan stores all data locally in the browser (IndexedDB / localStorage) and
has no server-side account system. Areas of particular interest:

- The backup encryption format (AES-GCM 256 / PBKDF2-SHA256) — see
  [`docs/backup-format.md`](../docs/backup-format.md)
- Content Security Policy and HTTP security headers — see
  [`nginx-security-headers.conf`](../nginx-security-headers.conf)
- Input validation at data boundaries (CSV import, backup import)

## Details

The full set of implemented security measures, prohibited code patterns, and the
audit checklist is documented in [`docs/SECURITY.md`](../docs/SECURITY.md).

Machine-readable contact information is published at
[`/.well-known/security.txt`](../public/.well-known/security.txt).
