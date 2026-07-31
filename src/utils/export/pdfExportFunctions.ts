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
import {
  extractSvgElement,
  renderSvgToPngDataUrl,
} from '@/utils/export/svgRasterizer';

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
  const imageDataUrl = await renderSvgToPngDataUrl(
    serializedSvg,
    widthPx,
    heightPx,
  );

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
    const imageDataUrl = await renderSvgToPngDataUrl(
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
