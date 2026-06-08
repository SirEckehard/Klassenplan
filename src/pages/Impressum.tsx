// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useTranslation } from 'react-i18next';
import { IdentificationCardIcon } from '@phosphor-icons/react';
import Seo from '@/components/Seo';
import { LocalizedLink } from '@/components/LocalizedLink';
import { cardSurfaceClass } from '@/utils';
import { KpLockup } from '@/components/KpLockup';
import { usePageSeo } from '@/hooks/usePageSeo';
import { GITHUB_REPO_URL } from '@/config/links';

export default function Impressum() {
  const { i18n } = useTranslation();
  const isEnglish = i18n.language === 'en';
  const metadata = usePageSeo('/impressum');
  return (
    <main
      id="main"
      tabIndex={-1}
      className="min-h-[80vh] bg-linear-to-b from-slate-50 via-white to-slate-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 px-4 py-12"
    >
      <Seo
        {...metadata}
        structuredData={{
          '@type': 'Organization',
          name: 'Klassenplan',
          address: {
            '@type': 'PostalAddress',
            addressLocality: 'Köln',
            postalCode: '50679',
            addressCountry: 'DE',
          },
          contactPoint: {
            '@type': 'ContactPoint',
            email: 'webmaster@klassenplan.de',
            contactType: 'customer support',
            availableLanguage: ['de'],
          },
        }}
      />
      <div className="mx-auto flex max-w-4xl flex-col gap-10">
        <header
          className="text-center"
          role="banner"
          aria-label="Impressum Überblick"
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
          aria-labelledby="impressum-title"
        >
          <div className="mb-8">
            {isEnglish && (
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg text-sm text-blue-700 dark:text-blue-300">
                This Legal Notice (Impressum) is provided in German only, as
                required by German law.
              </div>
            )}
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-600 shadow-sm dark:border-blue-900/40 dark:bg-blue-500/20 dark:text-blue-200">
                <IdentificationCardIcon
                  aria-hidden="true"
                  className="h-6 w-6"
                />
              </span>
              <div>
                <h2
                  id="impressum-title"
                  className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100"
                >
                  Impressum
                </h2>
                <p className="mt-1 text-gray-600 dark:text-gray-300">
                  Rechtliche Angaben gemäß § 5 TMG
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            {/* Anbieterkennzeichnung */}
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Anbieterkennzeichnung
              </h3>
              <address className="mt-3 not-italic text-gray-700 dark:text-gray-200 leading-relaxed">
                Eike Christian Schäfer
                <br />
                50679 Köln
                <br />
                Deutschland
              </address>
            </div>

            {/* Kontakt */}
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Kontakt
              </h3>
              <ul className="mt-3 grid gap-2 text-gray-700 dark:text-gray-200">
                <li>
                  <span className="font-medium">E-Mail:</span>{' '}
                  <a
                    className="font-semibold text-blue-600 hover:underline dark:text-blue-400"
                    href="mailto:webmaster@klassenplan.de"
                  >
                    webmaster@klassenplan.de
                  </a>
                </li>
                <li>
                  <span className="font-medium">Website:</span>{' '}
                  <a
                    className="font-semibold text-blue-600 hover:underline dark:text-blue-400"
                    href="https://www.klassenplan.de"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    www.klassenplan.de
                  </a>
                </li>
              </ul>
            </div>

            {/* Liability disclaimer */}
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Haftungsausschluss
              </h3>
              <p className="mt-3 text-gray-700 dark:text-gray-200 leading-relaxed">
                Die Inhalte dieser Website wurden mit größtmöglicher Sorgfalt
                erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität
                der Inhalte übernehme ich jedoch keine Gewähr. Als
                Diensteanbieter bin ich gemäß § 7 Abs. 1 TMG für eigene Inhalte
                auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich.
                Nach §§ 8 bis 10 TMG bin ich als Diensteanbieter jedoch nicht
                verpflichtet, übermittelte oder gespeicherte fremde
                Informationen zu überwachen oder nach Umständen zu forschen, die
                auf eine rechtswidrige Tätigkeit hinweisen.
              </p>
            </div>

            {/* Urheberrecht */}
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Urheberrecht
              </h3>
              <p className="mt-3 text-gray-700 dark:text-gray-200 leading-relaxed">
                Die redaktionellen Inhalte dieser Website (Texte, Bilder,
                Grafiken) sowie die Marke „Klassenplan“ (Wort- und Bildmarke)
                unterliegen dem deutschen Urheberrecht. Ihre Vervielfältigung,
                Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb
                der Grenzen des Urheberrechts bedürfen der schriftlichen
                Zustimmung des jeweiligen Autors bzw. Erstellers.
              </p>
              <p className="mt-3 text-gray-700 dark:text-gray-200 leading-relaxed">
                Der <strong>Quellcode</strong> von Klassenplan ist hingegen
                freie Software und steht unter der GNU Affero General Public
                License v3.0 (AGPL-3.0-or-later). Er darf gemäß den Bedingungen
                dieser Lizenz frei genutzt, verändert und weiterverbreitet
                werden. Der vollständige Quelltext ist auf{' '}
                <a
                  className="font-semibold text-blue-600 hover:underline dark:text-blue-400"
                  href={GITHUB_REPO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  GitHub
                </a>{' '}
                verfügbar.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
