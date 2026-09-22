// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useTranslation } from 'react-i18next';
import Seo from '@/components/Seo';
import { LegalPage, LegalSection } from '@/components/publicPage/LegalPage';
import { pageInlineLinkClass } from '@/components/publicPage/pageTokens';
import { usePageSeo } from '@/hooks/usePageSeo';

export default function Datenschutz() {
  const { t } = useTranslation('pages');
  const metadata = usePageSeo('/datenschutz');

  return (
    <>
      <Seo
        {...metadata}
        structuredData={{
          '@type': 'WebPage',
          name: metadata.title,
          inLanguage: metadata.lang,
          description: metadata.description,
        }}
      />
      <LegalPage
        bannerLabel={t('header.banner.datenschutz')}
        title="Datenschutzerklärung"
        lead="Informationen nach Art. 13, 14 DSGVO"
        germanOnly
      >
        <LegalSection
          id="datenschutz-verantwortlicher"
          title="1. Verantwortlicher"
        >
          <address className="not-italic">
            Eike Christian Schäfer
            <br />
            50679 Köln
            <br />
            Deutschland
            <br />
            E-Mail:{' '}
            <a
              className={pageInlineLinkClass}
              href="mailto:webmaster@klassenplan.de"
            >
              webmaster@klassenplan.de
            </a>
          </address>
        </LegalSection>

        <LegalSection
          id="datenschutz-erfassung"
          title="2. Erfassung und Speicherung personenbezogener Daten"
        >
          <p>
            Die Website wird bei Hetzner Online GmbH, Industriestr. 25, 91710
            Gunzenhausen, Deutschland (&bdquo;Hetzner&ldquo;) gehostet. Hetzner
            stellt die Server-Infrastruktur bereit, über die die Website
            ausgeliefert wird. Die Auslieferung erfolgt aus dem Rechenzentrum in
            Nürnberg, Deutschland.
          </p>
          <p>
            Beim Aufruf der Website werden automatisch durch den Hosting-Server
            sogenannte Server-Logfiles erhoben. Diese können folgende Daten
            enthalten:
          </p>
          <ul className="list-disc space-y-1 pl-5 text-(--text-muted)">
            <li>IP-Adresse des anfragenden Geräts</li>
            <li>Datum und Uhrzeit des Zugriffs</li>
            <li>Adresse der abgerufenen Seite (URL)</li>
            <li>Browsertyp und -version</li>
            <li>Betriebssystem des Nutzers</li>
            <li>
              Referrer-URL (die Seite, von der du auf Klassenplan gelangt bist)
            </li>
            <li>Übertragene Datenmenge und Meldung über erfolgreichen Abruf</li>
          </ul>
          <p>
            Diese Daten sind technisch erforderlich, um die Website
            bereitzustellen, Stabilität und Sicherheit zu gewährleisten und
            Missbrauch zu verhindern.
          </p>
          <p>
            Eine Zusammenführung dieser Daten mit anderen Datenquellen findet
            nicht statt. Die Verarbeitung dieser Daten erfolgt auf Grundlage von
            Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an einem sicheren
            und effizienten Betrieb der Website).
          </p>
          <p>
            Die Datenverarbeitung erfolgt ausschließlich in Deutschland. Es
            findet keine Übertragung von Daten in Drittländer statt.
          </p>
          <p>
            Weitere Informationen findest du in der Datenschutzerklärung von
            Hetzner:{' '}
            <a
              href="https://www.hetzner.com/de/legal/privacy-policy/"
              target="_blank"
              rel="noopener noreferrer"
              className={`${pageInlineLinkClass} wrap-break-word`}
            >
              https://www.hetzner.com/de/legal/privacy-policy/
            </a>
          </p>
          <p>
            Personenbezogene Daten werden nur erhoben, wenn diese freiwillig
            mitgeteilt werden, z. B. im Rahmen einer E-Mail-Anfrage.
          </p>
        </LegalSection>

        <LegalSection
          id="datenschutz-verwendung"
          title="3. Verwendung der Daten"
        >
          <p>
            Die mitgeteilten Daten werden ausschließlich zur Bearbeitung deiner
            Anfragen sowie zur Verbesserung des Angebots genutzt.
          </p>
        </LegalSection>

        <LegalSection id="datenschutz-dritte" title="4. Weitergabe an Dritte">
          <p>Die Daten werden nicht an Dritte weitergegeben.</p>
        </LegalSection>

        <LegalSection
          id="datenschutz-speicherung"
          title="5. Speicherung und Löschung deiner Daten"
        >
          <p>
            Alle erstellten Informationen werden ausschließlich lokal im Browser
            gespeichert (localStorage und IndexedDB). Es werden keine Cookies
            gesetzt und keine Daten an einen Server übertragen. Dadurch ist die
            Nutzung nach dem initialen Laden auch offline möglich, solange der
            Browser-Cache nicht gelöscht wurde.
          </p>
          <p>
            Optional hinzugefügte <strong>Schülerfotos</strong> werden ebenfalls
            ausschließlich lokal auf diesem Gerät (in IndexedDB) gespeichert und
            niemals übertragen. Beim Import werden Fotos neu berechnet und
            verkleinert; dabei werden eingebettete Metadaten (z.&nbsp;B.
            EXIF-Daten inkl. GPS-Position) entfernt. Sie sind nur in einem
            Backup enthalten, wenn du selbst eines exportierst, und werden
            gemeinsam mit den übrigen Daten gelöscht.
          </p>
          <p>
            Damit die Wiederholungsvermeidung echte Sitzpläne von bloßem
            Ausprobieren unterscheiden kann, hält Klassenplan fest, welche
            Sitzpläne tatsächlich im Einsatz waren – erkennbar daran, dass du
            sie präsentierst, druckst bzw. exportierst, unter einem eigenen
            Namen speicherst oder von Hand anpasst. Festgehalten werden dabei
            ausschließlich die Sitznachbarschaften (als Schüler-IDs) und ein
            Zeitstempel, nicht der Sitzplan selbst. Auch diese Aufzeichnung
            verbleibt lokal auf deinem Gerät, wird weder übertragen noch
            ausgewertet und gemeinsam mit den übrigen Daten gelöscht.
          </p>
          <p>
            Die lokal gespeicherten Daten liegen{' '}
            <strong>unverschlüsselt</strong> im Browser-Profil dieses Geräts.
            Schütze das Gerät daher wie gewohnt (Benutzerkonto,
            Geräteverschlüsselung). Exportierte Backups werden dagegen immer mit
            einem von dir gewählten Passwort verschlüsselt.
          </p>
          <p>
            Sämtliche Daten sind über den Eintrag{' '}
            <strong>Alle Daten löschen</strong> in den Einstellungen
            (Zahnrad-Symbol im Footer bzw. im Sitzplan-Generator oben rechts)
            oder über die Löschfunktion deines Browsers zu entfernen.
          </p>
        </LegalSection>

        <LegalSection id="datenschutz-rechte" title="6. Rechte der Nutzer">
          <p>
            Der Nutzer hat das Recht, unentgeltlich Auskunft über die
            gespeicherten personenbezogenen Daten zu erhalten. Außerdem hat er
            das Recht auf Berichtigung, Löschung, Einschränkung der Verarbeitung
            sowie auf Datenübertragbarkeit und Widerspruch. Zudem hat er das
            Recht, sich bei einer Datenschutz-Aufsichtsbehörde zu beschweren
            (Art. 77 DSGVO).
          </p>
        </LegalSection>

        <LegalSection
          id="datenschutz-aenderungen"
          title="7. Änderungen der Datenschutzerklärung"
        >
          <p>
            Die Datenschutzerklärung darf bei Bedarf aktualisiert werden, um sie
            an geänderte rechtliche oder technische Rahmenbedingungen
            anzupassen.
          </p>
        </LegalSection>
      </LegalPage>
    </>
  );
}
