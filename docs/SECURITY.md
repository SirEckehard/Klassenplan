# Security Best Practices

This document outlines the security measures implemented in Klassenplan and best practices for maintaining secure code.

## Threat model

Klassenplan has no server-side data, no accounts and no API
([decision 0001](decisions/0001-offline-first-no-server.md)), so the usual
targets of an attack on a web application do not exist. What is left to
protect:

- **Student data at rest** in the browser profile — the class collection and
  the photo database, both unencrypted.
- **Exported files** — the encrypted backup, and unencrypted PDF, PNG, SVG,
  print and CSV exports.
- **The integrity of the code the browser runs**, because that code has full
  access to both.

### Trust boundaries

1. **Server → browser.** Static files, TLS terminated upstream, protected by the
   CSP and security headers below. New code only activates after the teacher
   confirms the update ([decision 0009](decisions/0009-prompt-update-model.md)).
2. **Files → app.** Every imported file — CSV, backup, photo — is untrusted
   input, including a backup that decrypts with the right password.
3. **Device → people.** Whoever uses the browser profile, and whoever sees the
   projector.

### Threats and mitigations

| Threat                                                      | Entry point                 | Mitigation                                                                                                                                                                                                                                                                | What remains                                                                                        |
| ----------------------------------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Script injection through imported or typed text             | CSV, backup, form fields    | React escapes all output; no `dangerouslySetInnerHTML`, `innerHTML` or `eval` in `src/`; `script-src 'self'` without `'unsafe-inline'`; imported names lose HTML tags and control characters and are cut to 120 characters                                                | `style-src 'unsafe-inline'` would allow injected inline styles                                      |
| Formula injection when an export is opened in a spreadsheet | CSV export                  | Cells starting with `=`, `+`, `-`, `@`, a tab or a line break get a leading `'` (`exportStudentsToCsv`)                                                                                                                                                                   | —                                                                                                   |
| A file that stalls or crashes the tab                       | CSV, backup, photo          | CSV: type check, 36-row limit, parsing in a worker with a 12 s timeout from 40 KB. Backup: 16 MB file and 12 MB decrypted limits, per-field caps and structure validation, KDF iterations bounded to 100,000–10,000,000. Photo: 20 MB input limit, decoded and re-encoded | —                                                                                                   |
| Tampered backup                                             | Backup import               | AES-GCM with associated data rejects any modified ciphertext; content is validated after decryption ([backup-format.md](backup-format.md))                                                                                                                                | A backup made by someone else with a known password is trusted content within the validation limits |
| Location or device data in photos                           | Photo import                | Canvas re-encode to a 160 px JPEG strips EXIF, including GPS                                                                                                                                                                                                              | —                                                                                                   |
| Access to the device or browser profile                     | Local                       | None beyond the device's own protection (OS account, disk encryption); "delete all data" removes everything                                                                                                                                                               | Full read access to all live data                                                                   |
| Onlookers                                                   | Projector                   | Attributes appear only in the teacher perspective and only when switched on                                                                                                                                                                                               | Names always, photos and gender colours by default                                                  |
| Exported files passed on                                    | Exports                     | Backups are encrypted with a password of at least 8 characters (PBKDF2-SHA256, 600,000 iterations)                                                                                                                                                                        | PDF, PNG, SVG, print and CSV are readable by anyone who holds them                                  |
| Compromised or manipulated app code                         | Server, build, dependencies | No third-party scripts or CDNs; strict CSP; `npm ci` against the lockfile; Dependabot; the quarterly audit below                                                                                                                                                          | A compromised dependency or build runs with full access to the data                                 |
| Clickjacking                                                | Framing                     | `frame-ancestors 'none'`, `X-Frame-Options: DENY`                                                                                                                                                                                                                         | —                                                                                                   |
| A modified self-hosted instance                             | Operator                    | AGPL §13 makes the source of a modified network deployment available                                                                                                                                                                                                      | Teachers have to trust whoever serves the code                                                      |

Which personal data exists, who sees it and what a self-hosting operator has to
take care of is described in [PRIVACY.md](PRIVACY.md).

## Content Security Policy (CSP)

### Production CSP (nginx-security-headers.conf)

The production CSP is configured in [`nginx-security-headers.conf`](../nginx-security-headers.conf), which [`nginx.conf`](../nginx.conf) includes into every `location` (see the inheritance pitfall below). **Strict CSP without `unsafe-inline` / `unsafe-eval` for scripts, with one explicit exception for inline styles:**

```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline';
font-src 'self' data:;
img-src 'self' data: blob:;
connect-src 'self';
worker-src 'self' blob:;
frame-ancestors 'none';
base-uri 'self';
form-action 'self';
object-src 'none';
```

**Exceptions explained:**

- `style-src 'unsafe-inline'` is needed for runtime style tooling (Tailwind utility insertions, dynamic component styles). No `unsafe-inline` for scripts.
- Everything else is first-party. There is no third-party analytics, telemetry, or CDN.
- The support page links to PayPal with a plain link, which the CSP does not restrict. `img-src` and `form-action` used to allow PayPal for donation graphics and a checkout form; those sources were removed on 2026-09-14 because nothing loaded them any more.

> **Note:** If you deploy behind a different reverse proxy or static host, replicate the CSP and the security headers below in that environment's configuration.

**No inline scripts:** `index.html` contains no inline `<script>` blocks. The PWA install-prompt capture lives in the entry module (`src/index.tsx` imports `src/hooks/useInstallPrompt.ts`), and speculation rules are delivered via the `Speculation-Rules` HTTP header pointing at [`public/speculationrules.json`](../public/speculationrules.json) (served with the `application/speculationrules+json` MIME type, see `nginx.conf`).

**nginx `add_header` inheritance pitfall:** nginx does _not_ inherit server-level `add_header` directives into a `location` block that declares its own `add_header` (e.g. for `Cache-Control`). The security headers therefore live in [`nginx-security-headers.conf`](../nginx-security-headers.conf), which every such location `include`s again. When adding a new `location` with its own `add_header`, always re-include the snippet — otherwise those responses (including `index.html`) would be served without CSP/HSTS.

### Development CSP (vite.config.ts)

Development mode uses **relaxed CSP** to support Hot Module Replacement (HMR):

```javascript
'script-src \'self\' \'unsafe-inline\'', // Dev mode needs inline for HMR
'style-src \'self\' \'unsafe-inline\'', // Dev mode needs inline for HMR
'connect-src \'self\' ws: wss:', // Allow WebSocket for HMR
```

**This is safe because:**

- Development builds never reach production
- HMR requires inline scripts for live reload functionality
- WebSockets are restricted to same-origin in dev mode

## Security Headers

### Production response headers

All production responses (served via nginx, see [`nginx.conf`](../nginx.conf)) include a comprehensive set of security headers:

```
Content-Security-Policy: ...        # see above
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=(), browsing-topics=(), interest-cohort=()
```

**What each header does:**

1. **Content-Security-Policy**: Restricts resource loading (scripts, styles, etc.)
2. **X-Content-Type-Options**: Prevents MIME-sniffing attacks
3. **X-Frame-Options**: Prevents clickjacking via iframes
4. **Referrer-Policy**: Controls referrer information sent with requests
5. **Permissions-Policy**: Disables unnecessary browser APIs (geolocation, camera, mic) and opts out of FLoC/Topics (`browsing-topics`, `interest-cohort`)

## Code Security

### Prohibited Patterns

**Never use these patterns in production code:**

❌ **Inline Scripts/Styles:**

```html
<!-- BAD -->
<script>
  alert('XSS');
</script>
<div style="background: red">...</div>
```

❌ **Dangerous JavaScript:**

```javascript
// BAD
eval(userInput);
new Function(userInput)();
element.innerHTML = userInput;
```

❌ **React dangerouslySetInnerHTML:**

```tsx
// BAD - CSP violation + XSS risk
<div dangerouslySetInnerHTML={{ __html: userInput }} />
```

### Safe Patterns

✅ **External Scripts/Styles:**

```html
<!-- GOOD -->
<script type="module" src="/entry/index.js"></script>
<link rel="stylesheet" href="/css/index.css" />
```

✅ **Safe DOM Manipulation:**

```javascript
// GOOD
element.textContent = userInput; // Escapes HTML
element.setAttribute('data-value', userInput); // Safe attributes
```

✅ **React Safe Rendering:**

```tsx
// GOOD - React escapes by default
<div>{userInput}</div>
<input value={userInput} />
```

## Build Verification

### Check for CSP Compliance

The production CSP has no `'unsafe-inline'` for scripts, so an executable inline
`<script>` in the served HTML would be blocked. After a static build, list every
`<script>` tag without a `src`:

```bash
npm run build:static
find dist -name index.html -exec grep -oE '<script[^>]*>' {} + \
  | grep -v 'src=' | grep -v 'application/ld+json'
```

No output means no inline scripts. JSON-LD blocks (`type="application/ld+json"`)
are data that the browser never executes, so `script-src` does not apply to
them. `build:static` matters here: the prerendered pages are what nginx serves,
not just `dist/index.html`.

### Local CSP Testing

`npm run preview` is **not** a CSP test: `vite.config.ts` sets headers only for
the dev server, and `vite preview` reuses them — including `'unsafe-inline'` for
scripts. The production headers come from nginx, so test against the Docker
image:

```bash
# 1. Build and start the image with the real nginx configuration
docker compose up -d --build

# 2. Open http://localhost:8080 → DevTools → Console
# 3. Look for CSP violation warnings
# 4. All resources should load without CSP errors
```

**Expected Console Output:**

- ✅ No "Content Security Policy" errors
- ✅ All JS/CSS files load successfully
- ✅ Service Worker registers without errors

## Monitoring & Incident Response

### CSP violation reporting

Not used. A `report-uri` or `report-to` endpoint is a server that receives data
from visitors' browsers, which [decision 0001](decisions/0001-offline-first-no-server.md)
and [decision 0008](decisions/0008-no-telemetry.md) rule out. Violations show up
in the browser console — during development and in the Docker-based check under
"Local CSP Testing".

### Security Audit Checklist

Perform quarterly security audits:

- [ ] Run `npm audit` and fix all vulnerabilities
- [ ] Verify CSP headers in production (use browser DevTools)
- [ ] Check for new inline code patterns (grep src/ for dangerous patterns)
- [ ] Review dependency updates for security patches
- [ ] Test CSP with `npm run build && npm run preview`

## Additional Security Measures

### 1. Data Privacy (GDPR Compliance)

- ✅ All data stored locally (IndexedDB, localStorage)
- ✅ No external analytics or tracking
- ✅ No cookies used
- ✅ No server-side data storage

**Data at rest:** Student data (names, pedagogical attributes, photos) is stored
**unencrypted** in the browser's IndexedDB. This is a deliberate offline-first
trade-off: there is no server, no account, and no key that could protect the
live database beyond the device's own protections (OS user account, disk
encryption, browser profile). Anyone with access to the device profile can read
the data — treat the device accordingly. Encryption applies to **exported
backups** (AES-GCM 256, PBKDF2 with 600,000 iterations, user-chosen password of
at least 8 characters with confirmation — see
[backup-format.md](backup-format.md)).

**Plan usage record:** Klassenplan notes which seating plans were actually in
use (presented, exported, saved under a chosen name, rearranged by hand) so the
repetition scoring can tell real plans from experiments. Only the seating
neighbourhoods — pairs of student ids already stored elsewhere — and timestamps
are kept, never a full arrangement. It lives in the same local IndexedDB, is
never transmitted, is included in an encrypted backup, and is wiped along with
everything else. See [ALGORITHM.md](ALGORITHM.md#plan-usage-record).

**Photo metadata:** Student photos are re-encoded through a canvas during
import (center-crop, downscale to 160 px, JPEG). This guarantees that EXIF
metadata — including GPS coordinates — is stripped before anything is stored.

**Logs:** Log calls identify students by id and never carry names, attributes,
photos or backup passwords (see [LOGGING.md](LOGGING.md#best-practices)). Logs
only reach the browser console — nothing is stored or transmitted.

### 2. Input Validation

- ✅ All student names validated via `stringValidation.validateStudentName()`
- ✅ CSV exports guarded against formula injection (see `exportStudentsToCsv()` in `src/utils/csv/csvExport.ts`)
- ✅ Maximum students limited to 36 (prevents DoS via large datasets)

### 3. Dependency Security

- ✅ `npm audit` as part of the quarterly checklist above
- ✅ Automated Dependabot updates configured in [`.github/dependabot.yml`](../.github/dependabot.yml) (weekly npm with minor/patch bumps grouped, monthly GitHub Actions)
- ✅ Exact versions are locked in `package-lock.json`, and CI and the Docker build install with `npm ci`, so a build never resolves anything newer than the lockfile. `package.json` itself uses caret ranges — upgrades arrive as reviewable Dependabot PRs

## Security Contact

For security issues, please contact:

- GitHub Issues: https://github.com/SirEckehard/Klassenplan/issues
- Email: webmaster@klassenplan.de

**Responsible Disclosure:**
Please report security vulnerabilities privately before public disclosure.

---

## References

- [OWASP Content Security Policy Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)
- [MDN Web Security Guidelines](https://developer.mozilla.org/en-US/docs/Web/Security)
- [CSP Evaluator](https://csp-evaluator.withgoogle.com/)
- [Mozilla Observatory](https://observatory.mozilla.org/) – HTTP security header scanner
