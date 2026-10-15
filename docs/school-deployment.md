# Klassenplan in a school

> **Status:** current · **Last reviewed:** 2026-10-15 · **For:** a school's IT,
> school authorities, self-hosting operators

This page is for whoever looks after a school's computers. It explains what
Klassenplan does on a device, how to put it on every managed computer, how to
run it on the school's own server, and what to watch for so that teachers do
not lose their classes.

## What Klassenplan is, from IT's side

- **A web app that runs entirely in the browser.** The server delivers static
  files and receives nothing back: no account, no database, no upload, no
  telemetry ([decision 0001](decisions/0001-offline-first-no-server.md),
  [decision 0008](decisions/0008-no-telemetry.md)). The Content Security Policy
  (`connect-src 'self'`) would block the app from sending data anywhere else.
- **Data lives on each device**, in the browser profile of the person using it
  (IndexedDB for classes and photos, localStorage for preferences). Nothing is
  shared between computers or users. What is stored is listed in
  [PRIVACY.md](PRIVACY.md#data-inventory).
- **It works offline** once it has been opened, and it can be installed as an
  app (a Progressive Web App) with its own window and icon. The installed app
  and the website in a tab of the same browser profile share the same data.
- **Supported browsers:** Chrome and Edge 111 or later, Safari 16.4 or later,
  Firefox 128 or later. Older browsers see a notice instead of the app
  (`public/browser-check.js`).

## Installing it on every computer

Edge and Chrome can install a web app on managed devices by policy, without a
teacher doing anything. Both use the policy `WebAppInstallForceList`; the app
appears in the Start menu (and, if asked for, on the desktop), and users cannot
remove it.

**Microsoft Edge** (Windows and macOS, Edge 80 or later) — Group Policy
"Configure list of force-installed Web Apps" under _Administrative
Templates/Microsoft Edge_ (`MSEdge.admx`), or the same setting in Intune's
settings catalog. Value:

```json
[
  {
    "url": "https://klassenplan.de/generator",
    "default_launch_container": "window",
    "create_desktop_shortcut": true
  }
]
```

**Google Chrome** — the policy of the same name, set through Group Policy or
the Google Admin console (Apps & extensions, add a web app by its URL), with the
same value.

Replace the address with your own instance's if you host one (below). The
policy applies per browser profile, so on shared computers every user gets the
app at their next sign-in, and it may take a while to arrive after the policy
has been set.

**iPads** managed by an MDM can receive Klassenplan as a web clip pointing to
the same address, set to open full screen. **Firefox** cannot install web apps
by policy; teachers using Firefox open the website, which works the same,
offline included.

Teachers who install it themselves find "Als App installieren" in the gear menu
at the top right of the app, which shows the steps for their browser.

## Hosting it yourself

A school or a school authority can run its own instance — useful when the
policy allows only internal addresses, or to have its own legal pages. The
repository publishes a container image; setup, configuration variables and
updates are described in the README under
[Deployment](../README.md#deployment). The obligations of an operator (legal
notice, privacy notice, contact address) are in
[PRIVACY.md](PRIVACY.md#running-your-own-instance), the response headers in
[SECURITY.md](SECURITY.md).

**Serve it over HTTPS.** Browsers allow installation and a service worker only
on a secure origin. Over plain HTTP — an intranet host without a certificate —
Klassenplan still works, including offline (it then loads all its files into
the browser cache instead, see `src/utils/performance/offlineWarmup.ts`), but it
cannot be installed as an app, and the policy above has nothing to install.

**Keep the address stable.** Browser storage belongs to an origin (scheme, host
and port). Moving an instance from `http://` to `https://`, to another host name
or another port leaves the teachers' data behind at the old address. If a move
is unavoidable, ask teachers to export a backup first and import it at the new
address.

## Keeping the data

Because the data sits in the browser profile, anything that wipes the profile
wipes the classes with it. Check these before rolling Klassenplan out:

- **Profiles reset at sign-out** (mandatory or temporary profiles, shared-device
  modes, "guest" sessions, tools that restore a clean image at restart): the
  classes are gone at the next sign-in. Either keep the browser profile, or
  make sure teachers know that the data then has to travel as a backup.
- **Clearing site data on exit:** if Edge or Chrome is set to delete cookies
  and site data when it closes, the classes go too. In Edge, the policy
  `SaveCookiesOnExit` exempts listed sites from that deletion; add the
  Klassenplan address there. In Chrome, check the equivalent exception for your
  version and test that a class survives a restart.
- **Roaming profiles** carry the data only if the browser's profile folder
  roams; test once with a class before relying on it.

**Backups** are the teacher's safety net and the way to move to another
computer: "Backup" at the foot of every toolbar exports all classes into one
password-protected file (`backup-<date>.klassenplan`, AES-GCM encrypted, see
[backup-format.md](backup-format.md)). The file can be kept anywhere, including
a network drive or a USB stick. Where the app is installed in Edge or Chrome on
a desktop, a double-click on such a file opens the app and restores it; the
browser asks once whether Klassenplan may open these files. Klassenplan reminds
a teacher when the last backup is more than 30 days old.

## Checklist

- [ ] The instance (klassenplan.de or your own) is reachable over HTTPS.
- [ ] `WebAppInstallForceList` set in Edge and/or Chrome, or teachers told about
      "Als App installieren".
- [ ] Browser profiles survive sign-out and restart, or teachers know to work
      with backups.
- [ ] Clearing site data on exit is off, or the Klassenplan address is exempt.
- [ ] Self-hosted: own legal pages and contact address set, address not going to
      change.
