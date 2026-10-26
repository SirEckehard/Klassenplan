// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { logWarn } from '@/utils';
import { getEmbeddedFontCss } from '@/utils/export/svgRasterizer';

type Orientation = 'landscape' | 'portrait';

interface PrintDocumentOptions {
  /** Language of the document, for a screen reader and hyphenation. */
  lang: string;
  /** Title the print dialog proposes as the file name of a saved PDF. */
  title: string;
}

interface PrintDocumentInput extends PrintDocumentOptions {
  /**
   * `@font-face` rules for the names' font, the subsets the image and PDF
   * exports embed, so "Łukasz" prints in the same face as "Lukas".
   */
  fontCss: string;
}

const PAGE_SIZE_MM: Record<Orientation, { width: number; height: number }> = {
  portrait: { width: 210, height: 297 },
  landscape: { width: 297, height: 210 },
};

/** How long the hidden frame outlives the dialog, for a browser printing late. */
const CLEANUP_DELAY_MS = 1000;

let activeFrame: HTMLIFrameElement | null = null;

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/**
 * iOS and iPadOS print the top document rather than the frame asked to print,
 * so they print from the PDF, handed over as a download that iOS opens in
 * its viewer: a tab opened once the PDF is made comes too long after the tap,
 * and Safari blocks it. An iPad asks for the desktop site and names itself a
 * Mac; its touch points give it away.
 */
export function isAppleMobile(): boolean {
  if (typeof navigator === 'undefined') return false;
  const userAgent = navigator.userAgent;
  return (
    /iPad|iPhone|iPod/.test(userAgent) ||
    (/Macintosh/.test(userAgent) && navigator.maxTouchPoints > 1)
  );
}

/**
 * The document the dialog prints: the preview's sheets, one per page and
 * nothing around them. Each sheet is the paper's size in millimetres and the
 * SVG fits itself into it. Viewport units would not do: Chrome lays the
 * frame out against its default portrait page before it applies the
 * `@page` size, so a landscape sheet sized by `100vw` came out at 210 mm
 * wide — shrunk to 70 % until the scaling was touched.
 */
export function buildPrintDocument(
  pages: readonly string[],
  orientation: Orientation,
  { lang, title, fontCss }: PrintDocumentInput,
): string {
  const { width, height } = PAGE_SIZE_MM[orientation];
  const styles = `
    ${fontCss}
    :root { color-scheme: light; }
    @page { size: ${width}mm ${height}mm; margin: 0; }
    html, body {
      margin: 0;
      padding: 0;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .sheet {
      /* A pixel short of the page: a sheet exactly as tall as the page can
         round up and push an empty page after it. */
      width: ${width}mm;
      height: calc(${height}mm - 1px);
      overflow: hidden;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    /* The break goes before every sheet but the first, not after every one,
       or the last would open an empty page. */
    .sheet + .sheet {
      break-before: page;
      page-break-before: always;
    }
    .sheet > svg {
      display: block;
      width: 100%;
      height: 100%;
    }
  `;
  const sheets = pages
    .map((page) => `<div class="sheet">${page}</div>`)
    .join('');

  return `<!DOCTYPE html><html lang="${escapeHtml(lang)}"><head><meta charset="utf-8" /><title>${escapeHtml(title)}</title><style>${styles}</style></head><body>${sheets}</body></html>`;
}

function removeFrame(frame: HTMLIFrameElement) {
  frame.remove();
  if (activeFrame === frame) {
    activeFrame = null;
  }
}

/**
 * Open the browser's print dialog on the sheets, from a hidden frame, so the
 * printout is the preview page for page. Resolves to false where that is not
 * possible — iOS, a frame without a window, a browser refusing to print — and
 * the caller falls back to the PDF.
 */
export async function printSheets(
  pages: readonly string[],
  orientation: Orientation,
  options: PrintDocumentOptions,
): Promise<boolean> {
  if (pages.length === 0 || isAppleMobile()) return false;

  if (activeFrame) {
    removeFrame(activeFrame);
  }

  const { width, height } = PAGE_SIZE_MM[orientation];
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.tabIndex = -1;
  // Off screen but laid out at the paper's size: Firefox will not print a
  // frame that is not rendered, and Safari printed a frame of no size blank.
  frame.style.cssText = `position:fixed;top:0;left:-10000px;width:${width}mm;height:${height}mm;border:0;`;
  activeFrame = frame;

  const loaded = new Promise<void>((resolve) => {
    frame.addEventListener('load', () => resolve(), { once: true });
  });
  frame.srcdoc = buildPrintDocument(pages, orientation, {
    ...options,
    fontCss: await getEmbeddedFontCss(),
  });
  document.body.appendChild(frame);
  // The load event waits for the photos the SVG embeds.
  await loaded;

  const frameWindow = frame.contentWindow;
  const frameDocument = frame.contentDocument;
  if (!frameWindow || !frameDocument) {
    removeFrame(frame);
    return false;
  }

  try {
    // Without the font the names would print in a fallback face and lose the
    // line breaks the layout measured for them.
    await frameDocument.fonts?.ready;
  } catch {
    // A font that fails to load still leaves a printable sheet.
  }

  try {
    frameWindow.addEventListener(
      'afterprint',
      () => window.setTimeout(() => removeFrame(frame), CLEANUP_DELAY_MS),
      { once: true },
    );
    frameWindow.focus();
    frameWindow.print();
    return true;
  } catch (error) {
    logWarn(
      'Direct printing failed, falling back to the PDF',
      { error },
      'printSheets',
    );
    removeFrame(frame);
    return false;
  }
}
