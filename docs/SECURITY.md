# Security Best Practices

This document outlines the security measures implemented in Klassenplan and best practices for maintaining secure code.

## Content Security Policy (CSP)

### Production CSP (nginx.conf)

The production CSP is configured in [`nginx.conf`](../nginx.conf) as part of the Docker image. **Strict CSP without `unsafe-inline` / `unsafe-eval` for scripts, with explicit exceptions for inline styles and PayPal:**

```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline';
font-src 'self' data:;
img-src 'self' data: blob: https://pics.paypal.com https://www.paypal.com https://www.paypalobjects.com;
connect-src 'self';
worker-src 'self' blob:;
frame-ancestors 'none';
base-uri 'self';
form-action 'self' https://www.paypal.com;
object-src 'none';
```

**Exceptions explained:**

- `style-src 'unsafe-inline'` is needed for runtime style tooling (Tailwind utility insertions, dynamic component styles). No `unsafe-inline` for scripts.
- `https://pics.paypal.com` / `https://www.paypal.com` / `https://www.paypalobjects.com` cover donation graphics and checkout forms.
- `form-action https://www.paypal.com` allows PayPal as the only external form target.
- All other resources remain strictly first-party. There is no third-party analytics, telemetry, or CDN.

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

Run these commands before deployment:

```bash
# 1. Build production bundle
npm run build

# 2. Check for inline scripts/styles in dist/index.html
grep -E '<script[^>]*>(?!</script>)' dist/index.html
grep -E '<style[^>]*>(?!</style>)' dist/index.html

# 3. Should return NO matches (exit code 1)
# If matches found, investigate immediately!
```

### Local CSP Testing

Test the production CSP locally:

```bash
# 1. Build production bundle
npm run build

# 2. Serve with production headers
npm run preview

# 3. Open browser DevTools → Console
# 4. Look for CSP violation warnings
# 5. All resources should load without CSP errors
```

**Expected Console Output:**

- ✅ No "Content Security Policy" errors
- ✅ All JS/CSS files load successfully
- ✅ Service Worker registers without errors

## Monitoring & Incident Response

### CSP Violation Reporting (Future Enhancement)

Consider adding `report-uri` or `report-to` directives:

```
Content-Security-Policy: ...; report-uri https://klassenplan.de/csp-report
```

This sends CSP violation reports to a logging endpoint for monitoring.

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

### 2. Input Validation

- ✅ All student names validated via `stringValidation.validateStudentName()`
- ✅ CSV imports sanitized against CSV injection (see `exportStudentsToCsv()`)
- ✅ Maximum students limited to 36 (prevents DoS via large datasets)

### 3. Dependency Security

- ✅ Regular `npm audit` checks
- ✅ Automated Dependabot updates configured in [`.github/dependabot.yml`](../.github/dependabot.yml) (weekly npm, monthly GitHub Actions)
- ✅ Critical dependencies pinned to specific versions

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
