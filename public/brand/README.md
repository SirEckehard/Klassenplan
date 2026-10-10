# Klassenplan Brand Assets

Vollständiges Icon- und Wortmarken-Set für Web, iOS und Android.

## Markenfarben

- Primär: `#2563EB` (`bg-blue-600`)
- Akzent: `#F59E0B` (`bg-amber-500`)
- Geistraster: Primär bei 10 % Deckkraft
- Dark Mode: Primär `#3B82F6` (`dark:bg-blue-500`), Akzent `#FBBF24` (`dark:bg-amber-400`), Geistraster bei 16 %

Die SVG-Master enthalten `prefers-color-scheme: dark` als Media Query – die Marke wechselt automatisch in den Dark-Mode-Modus, wenn das Hostsystem dunkel ist. Für Anwendungen, die einen statischen Hintergrund garantieren (App-Store-Icon, Maskable, Apple Touch Icon), wurde der Hintergrund fest auf Weiß gesetzt.

## Verzeichnisstruktur

```
klassenplan-brand/
├── master/
│   ├── klassenplan-logo.svg         Voller Master mit Geistraster (Hauptdatei)
│   ├── klassenplan-mark.svg         Reine Bildmarke ohne Geistraster
│   └── klassenplan-mark-dark.svg    Dark-Variante mit festem Hintergrund (#1B4965)
├── wordmark/
│   ├── klassenplan-wordmark.svg     Wortmarke (Onest Bold, Pfade eingebettet)
│   └── klassenplan-wordmark.png     Rasterisierte Wortmarke (für E-Mail, Slides etc.)
├── lockup/
│   ├── klassenplan-lockup.svg       Marke + Wortmarke horizontal
│   └── klassenplan-lockup.png       Rasterisiertes Lockup
├── favicon/
│   ├── favicon-16.png               16×16 (Browser-Tab)
│   ├── favicon-32.png               32×32 (Retina-Tabs, Lesezeichen)
│   ├── favicon-48.png               48×48 (Windows-Taskleiste)
│   └── favicon.ico                  Multi-Resolution ICO mit allen drei Größen
├── ios/
│   ├── apple-touch-icon-180.png      180×180 (iOS Home-Screen, weißer Hintergrund)
│   └── apple-touch-icon-180-dark.png 180×180 Dark-Variante (#1B4965)
├── android/
│   ├── android-chrome-maskable-192.png
│   ├── android-chrome-maskable-512.png       Beide mit 65 % Safe-Zone-Padding
│   ├── android-chrome-maskable-192-dark.png
│   └── android-chrome-maskable-512-dark.png  Dark-Varianten (#1B4965)
├── app-store/
│   ├── app-store-1024.png            1024×1024, weißer Hintergrund (App Store / Play Store)
│   └── app-store-1024-dark.png       1024×1024 Dark-Variante (#1B4965)
└── _sources/                         Rasterbare SVG-Quellen für Dark-Varianten
    ├── icon-favicon-dark.svg
    ├── icon-apple-dark.svg
    ├── icon-maskable-dark.svg
    └── icon-app-store-dark.svg
```

Favicon-PNGs (`favicon-16-dark.png`, `favicon-32-dark.png`, `favicon-48-dark.png`) liegen zusätzlich im `favicon/`-Ordner.

## HTML-Einbindung

```html
<!-- Standard-Favicon -->
<link rel="icon" type="image/svg+xml" href="/master/klassenplan-mark.svg" />
<link
  rel="icon"
  type="image/png"
  sizes="16x16"
  href="/favicon/favicon-16.png"
/>
<link
  rel="icon"
  type="image/png"
  sizes="32x32"
  href="/favicon/favicon-32.png"
/>
<link
  rel="icon"
  type="image/png"
  sizes="48x48"
  href="/favicon/favicon-48.png"
/>
<link rel="shortcut icon" href="/favicon/favicon.ico" />

<!-- iOS -->
<link
  rel="apple-touch-icon"
  sizes="180x180"
  href="/ios/apple-touch-icon-180.png"
/>

<!-- Web App Manifest (siehe manifest.webmanifest) -->
<link rel="manifest" href="/manifest.webmanifest" />
```

## Web App Manifest

```json
{
  "name": "Klassenplan",
  "short_name": "Klassenplan",
  "icons": [
    {
      "src": "/android/android-chrome-maskable-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/android/android-chrome-maskable-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable any"
    }
  ],
  "theme_color": "#FCFBF8",
  "background_color": "#FCFBF8"
}
```

`theme_color` und `background_color` sind die Papierfarbe der App (`--surface-page`), nicht die Markenfarbe: Titelleiste und Startbildschirm der installierten App sollen aussehen wie die Seite, die gleich erscheint. Die `theme-color`-Meta-Tags in `index.html` setzen dieselbe Farbe für den hellen und `#101113` für den dunklen Modus.

## Wortmarke

- Schrift: Onest Variable (Achse `wght`, instanziiert auf 700 / Bold)
- Letter-Spacing: −1.5 % (leicht verdichtet, üblich für Logos), Kerning aus der Schrift
- Das „l“ steht auf Höhe des „K“: Versal- und Oberlängenhöhe sind in Onest gleich (708 von 1000 Einheiten)
- Glyphen sind im SVG als Pfade eingebettet – die Datei rendert ohne installierte Schrift identisch.
- Die App zeichnet dieselben Umrisse inline (`src/components/kpWordmarkPaths.ts`, `KpLockup`), damit die Wortmarke nicht der Oberflächenschrift folgt.

Die App selbst setzt Atkinson Hyperlegible Next (seit dem Redesign „Papier & Werkzeug“ zunächst Instrument Sans). Die Wortmarke steht in Onest und hängt an keiner Schrift der App. Bis zur Onest-Wortmarke war sie in DM Sans gesetzt.

Neu erzeugen: [`scripts/generate-wordmark.py`](../../scripts/generate-wordmark.py) instanziiert Onest auf `wght` 700, setzt den Text mit HarfBuzz (Kerning), schreibt Wortmarke und Lockup als SVG, rastert sie mit `rsvg-convert` und erzeugt `src/components/kpWordmarkPaths.ts`. Die Schrift ist keine Abhängigkeit der App (`npm install --no-save @fontsource-variable/onest`); der Aufruf steht im Kopf des Skripts. Ändert sich die Lockup-Höhe, gehört die Höhe des Open-Graph-Bildes in `index.html` und `Seo.tsx` mit.

## Maskable-Hinweis

Die Maskable-Icons sitzen mit ~17 % Padding rundherum, damit der Logoinhalt im 80-%-Safe-Zone-Kreis Android-Adaptive-Launcher überlebt (Pixel Launcher, Samsung One UI, etc. wenden je nach Theme runde, Squircle- oder Hexagon-Masken an). Das `purpose: "maskable any"` im Manifest erlaubt dem Browser, dasselbe Asset für klassische und maskable Slots zu nutzen.

## App-Store / Play-Store

Apple wendet auf das 1024×1024 selbst die abgerundeten Ecken an – nicht selbst runden. Hintergrund ist deshalb solides Weiß ohne Transparenz. Gleiches gilt für Google Play.

## Dark Variants

Die Dark-PNGs verwenden den Theme-Color-Hintergrund (`#1B4965`) und die Dark-Mode-Markenfarben (`#3B82F6` / `#FBBF24`). Im Gegensatz zu den SVG-Mastern enthalten sie keine Media-Query – sie sind statisch dunkel.

Eingebunden werden sie via `media="(prefers-color-scheme: dark)"` in [`index.html`](../../index.html) (Favicon + Apple-Touch-Icon). Die Maskable-Dark-Varianten sind zusätzlich im Web-Manifest gelistet, damit Browser/OS sie auswählen können, sobald per-Color-Scheme-Selektion im Manifest standardisiert ist.

### Reproduktion

Die SVG-Quellen unter `_sources/` lassen sich mit [`rsvg-convert`](https://gitlab.gnome.org/GNOME/librsvg) jederzeit neu rastern:

```bash
rsvg-convert -w 180 -h 180   public/brand/_sources/icon-apple-dark.svg      -o public/brand/ios/apple-touch-icon-180-dark.png
rsvg-convert -w 192 -h 192   public/brand/_sources/icon-maskable-dark.svg   -o public/brand/android/android-chrome-maskable-192-dark.png
rsvg-convert -w 512 -h 512   public/brand/_sources/icon-maskable-dark.svg   -o public/brand/android/android-chrome-maskable-512-dark.png
rsvg-convert -w 1024 -h 1024 public/brand/_sources/icon-app-store-dark.svg  -o public/brand/app-store/app-store-1024-dark.png
rsvg-convert -w 16 -h 16     public/brand/_sources/icon-favicon-dark.svg    -o public/brand/favicon/favicon-16-dark.png
rsvg-convert -w 32 -h 32     public/brand/_sources/icon-favicon-dark.svg    -o public/brand/favicon/favicon-32-dark.png
rsvg-convert -w 48 -h 48     public/brand/_sources/icon-favicon-dark.svg    -o public/brand/favicon/favicon-48-dark.png
```

## Lizenz / Hinweis

Alle Markenelemente (Bildmarke, Wortmarke, Lockup) sind eure Schöpfung. Onest steht unter der SIL Open Font License 1.1 und darf frei in Apps und Markenanwendungen verwendet werden.
