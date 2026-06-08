// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useTranslation } from 'react-i18next';
import { ShieldCheckIcon } from '@phosphor-icons/react';
import Seo from '@/components/Seo';
import { LocalizedLink } from '@/components/LocalizedLink';
import { cardSurfaceClass } from '@/utils';
import { KpLockup } from '@/components/KpLockup';
import { usePageSeo } from '@/hooks/usePageSeo';

export default function Datenschutz() {
  const { i18n } = useTranslation();
  const isEnglish = i18n.language === 'en';
  const metadata = usePageSeo('/datenschutz');

  return (
    <main id="main" tabIndex={-1} className="min-h-[80vh] bg-linear-to-b from-slate-50 via-white to-slate-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 px-4 py-12">
      <Seo
        {...metadata}
        structuredData={{
          '@type': 'WebPage',
          name: metadata.title,
          inLanguage: metadata.lang,
          description: metadata.description,
        }}
      />
      <div className="mx-auto flex max-w-4xl flex-col gap-10">
        <header
          className="text-center"
          role="banner"
          aria-label="Datenschutz Überblick"
        >
          <LocalizedLink
            to="/"
            className="kp-lockup focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            aria-label="Zur Startseite"
          >
            <KpLockup size="md" />
          </LocalizedLink>
        </header>

        <section
          className={`${cardSurfaceClass} border border-blue-100/60 p-8 dark:border-blue-900/40`}
          aria-labelledby="datenschutz-title"
        >
          <div className="mb-8">
            {isEnglish && (
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg text-sm text-blue-700 dark:text-blue-300">
                This Privacy Policy is provided in German only, as required by
                German law.
              </div>
            )}
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-600 shadow-sm dark:border-blue-900/40 dark:bg-blue-500/20 dark:text-blue-200">
                <ShieldCheckIcon aria-hidden="true" className="h-6 w-6" />
              </span>
              <div>
                <h2
                  id="datenschutz-title"
                  className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100"
                >
                  Datenschutzerklärung
                </h2>
                <p className="mt-1 text-gray-600 dark:text-gray-300">
                  Informationen nach Art. 13, 14 DSGVO
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            {/* Data controller */}
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                1. Verantwortlicher
              </h3>
              <address className="mt-3 not-italic text-gray-700 dark:text-gray-200 leading-relaxed">
                Eike Christian Schäfer
                <br />
                50679 Köln
                <br />
                Deutschland
                <br />
                E-Mail:{' '}
                <a
                  className="font-semibold text-blue-600 hover:underline dark:text-blue-400"
                  href="mailto:webmaster@klassenplan.de"
                >
                  webmaster@klassenplan.de
                </a>
              </address>
            </div>

            {/* Collection and storage of personal data */}
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                2. Erfassung und Speicherung personenbezogener Daten
              </h3>
              <div className="mt-3 space-y-3 text-gray-700 dark:text-gray-200 leading-relaxed">
                <p>
                  Die Website wird bei Hetzner Online GmbH, Industriestr. 25,
                  91710 Gunzenhausen, Deutschland (&bdquo;Hetzner&ldquo;) gehostet. Hetzner
                  stellt die Server-Infrastruktur bereit, über die die Website
                  ausgeliefert wird. Die Auslieferung erfolgt aus dem
                  Rechenzentrum in Nürnberg, Deutschland.
                </p>
                <p>
                  Beim Aufruf der Website werden automatisch durch den
                  Hosting-Server sogenannte Server-Logfiles erhoben. Diese
                  können folgende Daten enthalten:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-gray-700 dark:text-gray-300">
                  <li>IP-Adresse des anfragenden Geräts</li>
                  <li>Datum und Uhrzeit des Zugriffs</li>
                  <li>Adresse der abgerufenen Seite (URL)</li>
                  <li>Browsertyp und -version</li>
                  <li>Betriebssystem des Nutzers</li>
                  <li>
                    Referrer-URL (die Seite, von der du auf Klassenplan gelangt
                    bist)
                  </li>
                  <li>
                    Übertragene Datenmenge und Meldung über erfolgreichen Abruf
                  </li>
                </ul>
                <p>
                  Diese Daten sind technisch erforderlich, um die Website
                  bereitzustellen, Stabilität und Sicherheit zu gewährleisten
                  und Missbrauch zu verhindern.
                </p>
                <p>
                  Eine Zusammenführung dieser Daten mit anderen Datenquellen
                  findet nicht statt. Die Verarbeitung dieser Daten erfolgt auf
                  Grundlage von Art. 6 Abs. 1 lit. f DSGVO (berechtigtes
                  Interesse an einem sicheren und effizienten Betrieb der
                  Website).
                </p>
                <p>
                  Die Datenverarbeitung erfolgt ausschließlich in Deutschland.
                  Es findet keine Übertragung von Daten in Drittländer statt.
                </p>
                <p>
                  Weitere Informationen finden Sie in der Datenschutzerklärung
                  von Hetzner:{' '}
                  <a
                    href="https://www.hetzner.com/de/legal/privacy-policy/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-blue-600 hover:underline dark:text-blue-300"
                  >
                    https://www.hetzner.com/de/legal/privacy-policy/
                  </a>
                </p>
                <p>
                  Personenbezogene Daten werden nur erhoben, wenn diese
                  freiwillig mitgeteilt werden, z. B. im Rahmen einer
                  E-Mail-Anfrage.
                </p>
              </div>
            </div>

            {/* Data usage */}
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                3. Verwendung der Daten
              </h3>
              <p className="mt-3 text-gray-700 dark:text-gray-200 leading-relaxed">
                Die mitgeteilten Daten werden ausschließlich zur Bearbeitung
                deiner Anfragen sowie zur Verbesserung des Angebots genutzt.
              </p>
            </div>

            {/* Disclosure to third parties */}
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                4. Weitergabe an Dritte
              </h3>
              <p className="mt-3 text-gray-700 dark:text-gray-200 leading-relaxed">
                Die Daten werden nicht an Dritte weitergegeben.
              </p>
            </div>

            {/* Data storage and deletion */}
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                5. Speicherung und Löschung deiner Daten
              </h3>
              <div className="mt-3 space-y-3 text-gray-700 dark:text-gray-200 leading-relaxed">
                <p>
                  Alle erstellten Informationen werden ausschließlich lokal im
                  Browser gespeichert (localStorage und IndexedDB). Es werden
                  keine Cookies gesetzt und keine Daten an einen Server
                  übertragen. Dadurch ist die Nutzung nach dem initialen Laden
                  auch offline möglich, solange der Browser-Cache nicht gelöscht
                  wurde.
                </p>
                <p>
                  Sämtliche Daten sind über den Button{' '}
                  <strong>Alle Daten löschen</strong> im Footer oder über die
                  Löschfunktion deines Browsers zu entfernen.
                </p>
              </div>
            </div>

            {/* Rechte der Nutzer */}
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                6. Rechte der Nutzer
              </h3>
              <p className="mt-3 text-gray-700 dark:text-gray-200 leading-relaxed">
                Der Nutzer hat das Recht, unentgeltlich Auskunft über die
                gespeicherten personenbezogenen Daten zu erhalten. Außerdem hat
                er das Recht auf Berichtigung, Löschung, Einschränkung der
                Verarbeitung sowie auf Datenübertragbarkeit und Widerspruch.
              </p>
            </div>

            {/* Änderungen */}
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                7. Änderungen der Datenschutzerklärung
              </h3>
              <p className="mt-3 text-gray-700 dark:text-gray-200 leading-relaxed">
                Die Datenschutzerklärung darf bei Bedarf aktualisiert werden, um
                sie an geänderte rechtliche oder technische Rahmenbedingungen
                anzupassen.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
