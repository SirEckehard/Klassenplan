// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type { CircleLayout } from '@/types/Circle';
import type { ClassroomScene, SeatingArrangement, Student } from '@/types';
import {
  renderCircleSvg,
  renderSceneSvg,
  type ExportClassMetadata,
} from '@/services/export/sceneRenderer';
import { logError } from '@/utils';
import { confirmDownload } from '@/utils/ui/downloadConfirmation';
import type { FeatureVisibilityFlags } from '@/utils/ui/featureStyles';
import { getStudentPhotoDataUrl } from '@/hooks/student/studentPhotoCache';
import dmSansWoff2Url from '@fontsource-variable/dm-sans/files/dm-sans-latin-wght-normal.woff2?url';

/**
 * Pre-resolve photos to base64 Data URLs for the export. Object URLs would
 * taint the canvas during SVG → PNG rasterization, so the PDF path must embed
 * the images inline as Data URLs.
 */
export async function buildPhotoDataUrlMap(
  students: Iterable<Student> | undefined,
): Promise<ReadonlyMap<string, string>> {
  const map = new Map<string, string>();
  if (!students) return map;
  const withPhotos = [...students].filter((student) => student?.hasPhoto);
  await Promise.all(
    withPhotos.map(async (student) => {
      const dataUrl = await getStudentPhotoDataUrl(student.id);
      if (dataUrl) {
        map.set(student.id, dataUrl);
      }
    }),
  );
  return map;
}

let cachedFontBase64: string | null = null;

async function getDmSansBase64(): Promise<string> {
  if (cachedFontBase64) return cachedFontBase64;
  const res = await fetch(dmSansWoff2Url);
  const buf = await res.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  cachedFontBase64 = btoa(binary);
  return cachedFontBase64;
}

function injectFontIntoSvg(svg: string, base64: string): string {
  const style = `<defs><style>@font-face{font-family:'DM Sans Variable';src:url('data:font/woff2;base64,${base64}');font-weight:100 900;font-style:normal;}</style></defs>`;
  return svg.replace(/(<svg[^>]*>)/, `$1${style}`);
}

export type ExportOptions = {
  allStudents?: Student[];
  showSpecialNeeds?: boolean;
  showConnections?: boolean;
  featureVisibility?: FeatureVisibilityFlags;
  showFullNames?: boolean;
  /** Show student photos on the seat dots in the table export (default true). */
  showPhotos?: boolean;
  /** Append a legend (badge icons + gender colours) to the exported page. */
  showLegend?: boolean;
  orientation?: 'landscape' | 'portrait';
  classMetadata?: ExportClassMetadata;
};

/**
 * Export table layout (seating plan) as PDF
 */
export async function exportTableLayoutToPdf(
  scene: ClassroomScene,
  seating: SeatingArrangement,
  title?: string,
  options?: ExportOptions,
): Promise<void> {
  const photoDataUrls = await buildPhotoDataUrlMap(options?.allStudents);
  const svgString = await renderSceneSvg(scene, seating, title, {
    allStudents: options?.allStudents,
    photoDataUrls,
    showSpecialNeeds: options?.showSpecialNeeds ?? true,
    featureVisibility: options?.featureVisibility,
    lockSeatLabelOrientation: true,
    orientation: options?.orientation ?? 'portrait',
    showFullNames: options?.showFullNames ?? false,
    photoDisplayMode: (options?.showPhotos ?? true) ? 'all' : 'off',
    showLegend: options?.showLegend ?? false,
    classMetadata: options?.classMetadata,
  });

  await exportSvgToPdf(
    svgString,
    title || 'Sitzplan',
    options?.orientation ?? 'portrait',
  );
}

/**
 * Export circle layout as PDF
 */
export async function exportCircleLayoutToPdf(
  circleLayout: CircleLayout,
  title?: string,
  options?: ExportOptions,
): Promise<void> {
  const photoDataUrls = await buildPhotoDataUrlMap(
    circleLayout.students
      .map((entry) => entry.student)
      .filter((student): student is Student => Boolean(student)),
  );
  const svgString = await renderCircleSvg(circleLayout, title, {
    showSpecialNeeds: options?.showSpecialNeeds ?? true,
    showConnections: options?.showConnections ?? true,
    orientation: options?.orientation ?? 'portrait',
    showFullNames: options?.showFullNames ?? false,
    classMetadata: options?.classMetadata,
    photoDataUrls,
    photoDisplayMode: (options?.showPhotos ?? true) ? 'all' : 'off',
    showLegend: options?.showLegend ?? false,
  });

  await exportSvgToPdf(
    svgString,
    title || 'Sitzkreis',
    options?.orientation ?? 'portrait',
  );
}

const PDF_PAGE_DIMENSIONS: Record<
  'portrait' | 'landscape',
  { width: number; height: number }
> = {
  portrait: { width: 210, height: 297 },
  landscape: { width: 297, height: 210 },
};

const EXPORT_DPI = 300;
const PIXELS_PER_MM = EXPORT_DPI / 25.4;

function extractSvgElement(svgMarkup: string): SVGSVGElement {
  if (typeof document === 'undefined') {
    throw new Error('PDF-Export ist nur im Browser verfügbar.');
  }

  const container = document.createElement('div');
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgMarkup, 'image/svg+xml');
  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    throw new Error('SVG-Inhalt konnte nicht geparst werden.');
  }
  container.appendChild(doc.documentElement);
  const svg = container.querySelector('svg');
  if (!svg) {
    throw new Error('SVG-Inhalt konnte nicht gefunden werden.');
  }
  return svg.cloneNode(true) as SVGSVGElement;
}

async function renderSvgToImage(
  svgMarkup: string,
  widthPx: number,
  heightPx: number,
): Promise<string> {
  const fontBase64 = await getDmSansBase64();
  const svgWithFont = injectFontIntoSvg(svgMarkup, fontBase64);

  return new Promise((resolve, reject) => {
    const blob = new Blob([svgWithFont], {
      type: 'image/svg+xml;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const image = new Image();

    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = widthPx;
        canvas.height = heightPx;
        const context = canvas.getContext('2d');
        if (!context) {
          reject(new Error('Canvas-Kontext konnte nicht erstellt werden.'));
          return;
        }
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = 'high';
        context.clearRect(0, 0, widthPx, heightPx);
        context.drawImage(image, 0, 0, widthPx, heightPx);
        resolve(canvas.toDataURL('image/png', 1));
      } finally {
        URL.revokeObjectURL(url);
      }
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('SVG konnte nicht geladen werden.'));
    };

    image.src = url;
  });
}

/**
 * Generate a PDF blob from SVG markup (for printing or preview)
 */
export async function generatePdfBlob(
  svgMarkup: string,
  orientation: 'landscape' | 'portrait',
): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const svgElement = extractSvgElement(svgMarkup);
  const { width, height } = PDF_PAGE_DIMENSIONS[orientation];
  const widthPx = Math.round(width * PIXELS_PER_MM);
  const heightPx = Math.round(height * PIXELS_PER_MM);
  svgElement.setAttribute('width', `${widthPx}px`);
  svgElement.setAttribute('height', `${heightPx}px`);
  svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');

  const serializedSvg = new XMLSerializer().serializeToString(svgElement);
  const imageDataUrl = await renderSvgToImage(serializedSvg, widthPx, heightPx);

  pdf.addImage(imageDataUrl, 'PNG', 0, 0, width, height, undefined, 'NONE');

  return pdf.output('blob');
}

/**
 * Open a PDF blob in new tab for printing.
 * Returns true if popup opened successfully, false if blocked.
 */
export function openPdfForPrinting(blob: Blob): boolean {
  const url = URL.createObjectURL(blob);
  // NOTE: no 'noopener' feature here on purpose — it would make window.open
  // return null and break the popup-blocked detection below. The target is a
  // same-origin blob URL we created ourselves, so reverse tabnabbing does not
  // apply.
  const newTab = window.open(url, '_blank');

  if (newTab) {
    // Revoke after 60 seconds to ensure PDF loads in slow connections
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return true;
  } else {
    // Popup was blocked
    URL.revokeObjectURL(url);
    return false;
  }
}

/**
 * Download a PDF blob as a file (fallback when popup is blocked)
 */
export function downloadPdfBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

async function exportSvgToPdf(
  svgMarkup: string,
  filename: string,
  orientation: 'landscape' | 'portrait',
): Promise<void> {
  const pdfFilename = `${filename}_${new Date().toISOString().split('T')[0]}.pdf`;

  // Ask the user before generating and saving the file (declined = no-op).
  const confirmed = await confirmDownload(pdfFilename);
  if (!confirmed) {
    return;
  }

  try {
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const svgElement = extractSvgElement(svgMarkup);
    const { width, height } = PDF_PAGE_DIMENSIONS[orientation];
    const widthPx = Math.round(width * PIXELS_PER_MM);
    const heightPx = Math.round(height * PIXELS_PER_MM);
    svgElement.setAttribute('width', `${widthPx}px`);
    svgElement.setAttribute('height', `${heightPx}px`);
    svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');

    const serializedSvg = new XMLSerializer().serializeToString(svgElement);
    const imageDataUrl = await renderSvgToImage(
      serializedSvg,
      widthPx,
      heightPx,
    );

    pdf.addImage(imageDataUrl, 'PNG', 0, 0, width, height, undefined, 'NONE');

    pdf.save(pdfFilename);
  } catch (error) {
    logError('PDF export failed', { error, filename }, 'pdfExportFunctions');
    throw new Error('PDF-Export fehlgeschlagen', { cause: error });
  }
}
