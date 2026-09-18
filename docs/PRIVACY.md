# Privacy

> **Status:** current · **Last reviewed:** 2026-09-19 · **For:** developers,
> self-hosting operators and schools evaluating Klassenplan

This document describes what personal data Klassenplan handles, where it goes and
who can see it. It is not the legal privacy notice of klassenplan.de — that is
the German page `/datenschutz` (`src/pages/Datenschutz.tsx`).

## The short version

Everything a teacher enters stays in that teacher's browser
([decision 0001](decisions/0001-offline-first-no-server.md)). The website only
delivers static files; it never receives student data, and the Content Security
Policy (`connect-src 'self'`) would block the app from sending it anywhere else.
Data leaves the browser only as a file the teacher exports.

## Data inventory

| Data                                                                                                                       | Stored in                                 | Kept                                           | Shown                                                                                                        |
| -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Student name                                                                                                               | Class record (IndexedDB)                  | Until the student or class is deleted          | Everywhere, including the projector and every export                                                         |
| Gender, height                                                                                                             | Class record                              | Same                                           | Gender as seat colour, on the projector by default                                                           |
| Behaviour and support attributes: restless, shy, distractible, front seat, high/low performer, language level, social role | Class record                              | Same                                           | In the editor; on the projector only in the teacher perspective with "Merkmale" switched on (off by default) |
| Seat preferences, wish and avoid partners                                                                                  | Class record                              | Same                                           | In the editor and, where chosen, in exports                                                                  |
| Photo                                                                                                                      | Photo database (IndexedDB)                | Until removed                                  | Editor, projector (on by default), name game, exports with photos enabled                                    |
| Class name, label and notes; names of plans and templates                                                                  | Class record, template list               | Until deleted                                  | Editor, exports with class info enabled                                                                      |
| Seating arrangements: current plan, saved plans, last 20 shuffles                                                          | Class record                              | Saved plans until deleted; shuffles rotate out | Editor, plan history                                                                                         |
| Plan usage record: pairs of student ids and timestamps                                                                     | `spg.planUsage` (IndexedDB)               | 40 records per class                           | Neighbourhood view                                                                                           |
| Name game statistics per student                                                                                           | `spg.nameGameStats` (IndexedDB)           | Until the student is gone                      | Name game                                                                                                    |
| Preferences, backup reminder dates, notice acknowledgements                                                                | localStorage                              | Until "delete all data"                        | —                                                                                                            |
| Backup file                                                                                                                | Wherever the teacher saves it             | Until the teacher deletes it                   | Only with the password                                                                                       |
| PDF, PNG, SVG, print and CSV exports                                                                                       | Wherever the teacher saves or prints them | Until the teacher deletes them                 | To anyone who gets the file — **not encrypted**                                                              |

Storage details, versions and the exact deletion paths are in
[data-model.md](data-model.md).

**Free text** — class notes, plan and template names — can contain anything the
teacher types. The attributes are meant as contextual descriptions of current
behaviour, not diagnoses, and `needsFrontSeat` deliberately stores no reason;
[PEDAGOGY.md](PEDAGOGY.md#2-attributes-contextual-not-diagnostic) explains why
and what that means for Art. 9 GDPR.

**Photos** are optional. Before the first upload the app shows a consent notice,
and every photo is re-encoded to a small JPEG, which strips EXIF metadata
including GPS coordinates.

**The sample class** ("Beispielklasse") holds invented names and pictures drawn
in the browser; nothing is downloaded. It is stored, exported and deleted like
any other class
([decision 0015](decisions/0015-onboarding-sample-class-and-tour.md)).

## Who can see the data

- **Anyone using the same browser profile.** Live data is not encrypted; the
  device's own protections are the only barrier
  ([SECURITY.md](SECURITY.md#threat-model)).
- **The class, on the projector.** Names are always visible; photos and gender
  colours are visible by default and can be switched off. Attributes appear only
  in the teacher perspective and only when switched on.
- **Recipients of exported files.** Only the backup is encrypted. A printed plan,
  an image or a CSV export is readable by whoever holds it — and a CSV export
  contains every attribute.
- **Nobody else.** Neither klassenplan.de nor a self-hosting operator receives
  student data.

## What the website itself processes

- **Requests for static files.** klassenplan.de is hosted by Hetzner in Germany;
  the server logs listed on `/datenschutz` (IP address, time, URL, browser,
  referrer) are the only personal data it processes. Routes are fixed paths
  (`src/data/seoRoutes.json`); the app does not put student data into URLs.
- **The service worker** caches the app's own files and fonts, nothing else.
- **No cookies, no analytics, no external fonts or CDNs.** The local storage
  notice only informs; with the Global Privacy Control signal it is skipped.
- **Feedback** is an e-mail link; only what someone writes arrives.
- **Error reports** are the same thing: an error screen prepares a mail with a
  reference code, the app version, the route, the error message, the first stack
  frames, the UI language, the time and the browser's user agent — no student
  data. The mail is composed in the browser and opens in the user's own mail
  program: nothing is sent unless they send it
  ([decision 0008](decisions/0008-no-telemetry.md)). Where no mail program is
  set up, a button copies the same lines to the clipboard.
- **Donations** are a plain link to PayPal; PayPal is contacted only when someone
  follows it.

## Running your own instance

- **Set your own legal pages.** Without configuration a build ships the
  Impressum and the Datenschutzerklärung of klassenplan.de — the maintainer's
  name and address and the Hetzner hosting. Set `IMPRINT_URL` and `PRIVACY_URL`
  to your own pages and build the image (`docker compose up -d --build`): the
  footer then links there, `/impressum` and `/datenschutz` only point there, and
  klassenplan.de's texts are not part of the build
  ([decision 0012](decisions/0012-legal-pages-for-self-hosted-builds.md)). Your
  privacy policy has to describe your instance, including its access logs.
- **Set your own contact address.** `CONTACT_EMAIL` decides where the contact
  page and the error reports write to. Without it your users' bug reports —
  about your build, your changes — reach the maintainer of klassenplan.de.
- **Access logs.** nginx writes access logs in Debian's default format (client IP,
  time, request, status, referrer, user agent) to the container's stdout.
  Retention is up to the operator's log driver. Behind a reverse proxy the
  container sees the proxy's address, because `nginx.conf` configures no real-IP
  handling.
- **Keep the headers.** CSP and security headers come with the image. Another
  proxy in front must not drop or loosen them ([SECURITY.md](SECURITY.md)).
- **Modified versions.** Klassenplan is licensed under AGPL-3.0-or-later. Whoever
  offers a modified version over a network has to make its source available to
  the users (§13).

## Legal context

- **Where the processing happens.** Student data is processed on the teacher's
  device. Whether and on which legal basis a teacher may record a given attribute
  follows from the GDPR and the school data protection rules of the respective
  German state; [PEDAGOGY.md](PEDAGOGY.md) points out the cases where a health
  reason behind a flag can touch Art. 9 GDPR.
- **Legal pages in German only**, as German law requires
  ([decision 0011](decisions/0011-english-under-en-on-de-domain.md)).
- **License.** AGPL-3.0-or-later since the open source release in v1.6.0; the
  reason for choosing it over the earlier Apache-2.0 is not recorded yet
  ([decisions](decisions/README.md#reasons-still-to-be-recorded)).
