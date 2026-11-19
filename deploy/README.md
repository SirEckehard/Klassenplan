# Klassenplan on a web server of your own

This archive holds Klassenplan as the published Docker image serves it, for a
web server without Docker: a school server with Apache, a NAS, a Raspberry Pi
with nginx or Caddy. Klassenplan needs no database, no PHP and no Node on the
server: it is static files, and the data stays in each teacher's browser.

| File                                        | What it is                                                                     |
| ------------------------------------------- | ------------------------------------------------------------------------------ |
| `site/`                                     | The site; its contents go into the web server's directory                      |
| `configure-instance.sh`                     | Gives the site your address, legal pages and contact (run once, before upload) |
| `Caddyfile`                                 | Caddy, which fetches the HTTPS certificate itself                              |
| `apache.htaccess`                           | Apache 2.4, as `.htaccess` in the site's directory                             |
| `nginx.conf`, `nginx-security-headers.conf` | nginx, the image's own configuration                                           |

## 1. Give the site your instance

Run once on the unpacked archive, with what applies to you; every variable is
optional, and one left out keeps klassenplan.de's:

```sh
SITE_URL=https://klassenplan.schule.de \
IMPRINT_URL=https://www.schule.de/impressum \
PRIVACY_URL=https://www.schule.de/datenschutz \
CONTACT_EMAIL=it@schule.de \
sh configure-instance.sh site
```

- `SITE_URL` — the address the site is served under, for the links search
  engines read.
- `IMPRINT_URL`, `PRIVACY_URL` — your own Impressum and Datenschutzerklärung.
  Set both when the instance is public: otherwise it shows the legal pages of
  klassenplan.de, with its maintainer's name and address.
- `CONTACT_EMAIL` — where the contact page and the error reports write to.

The script changes the files in `site/`. To change a value later, start again
from a freshly unpacked archive.

## 2. Copy it to the server and serve it over HTTPS

Copy the contents of `site/` — the hidden `.instance` folder included, which
the server keeps to itself — into the web server's directory, and serve it
over HTTPS: browsers install the app and let it work offline only on a secure
address.

- **Caddy:** set the address and the directory, then start it — or copy the
  site block into your own Caddyfile:

  ```sh
  KLASSENPLAN_ADDRESS=klassenplan.schule.de KLASSENPLAN_ROOT=/srv/klassenplan \
    caddy run --config Caddyfile
  ```

- **Apache 2.4:** copy `apache.htaccess` as `.htaccess` into the site's
  directory. It needs `AllowOverride All` there and the modules `rewrite`,
  `headers` and `mime`.
- **nginx:** take the `server` block of `nginx.conf`, set `listen` (the image
  uses 8080), `root` to the site's directory and the `include` lines to where
  `nginx-security-headers.conf` lies. Without the Brotli module, remove the four `brotli` lines.

Each answers `/faq` from `faq/index.html` without a detour through `/faq/`,
answers an unknown address with the page "Seite nicht gefunden" and status 404,
and sends the security headers Klassenplan expects (its Content Security
Policy among them).

## 3. Updates

Unpack the archive of the new release, run step 1 with the same values and
replace the site's files. Teachers see "Neue Version" and take it with one
click; their classes stay in their browsers. Keep the address: browser storage
belongs to it, and a new address starts empty.

More for a school's IT — installing the app on every computer, keeping the
data across sign-outs — is in `docs/school-deployment.md` of the repository:
<https://github.com/SirEckehard/Klassenplan/blob/main/docs/school-deployment.md>
