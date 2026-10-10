// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * The export page is the last step of every journey through the app, and it was
 * the largest untested file in the tree. These tests cover what a teacher can
 * actually get wrong here: reaching it without a plan, the display options not
 * surviving a visit, and the preview document being built for the wrong
 * language.
 *
 * The heavy pieces (SVG renderer, jsPDF) are mocked — they have their own
 * tests, and their real cost would only make this file slow.
 */
import '@testing-library/jest-dom/vitest';
import type React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import i18n from '@/i18n';
import Export from '../Export';
import {
  exportNoteListToPdf,
  exportTableLayoutToPdf,
  generatePdfBlob,
  openPdfForPrinting,
} from '@/services/export/pdfExportFunctions';
import {
  renderNoteListSvgPages,
  renderSceneSvg,
} from '@/services/export/sceneRenderer';
import { createMockClassroomScene, createMockStudent } from '@/__tests__/utils';
import {
  LEGACY_EXPORT_KEYS,
  LOCAL_STORAGE_KEYS,
} from '@/utils/data/storageKeys';

const seatingState = vi.hoisted(() => ({
  current: {} as Record<string, unknown>,
}));

vi.mock('@/contexts/SeatingPlanContext', () => ({
  useSeatingPlanState: () => seatingState.current,
  useSeatingPlanActions: () => ({
    generateCircleSeating: vi.fn(),
    cancelCircleGeneration: vi.fn(),
    setCircleLayoutValue: vi.fn(),
  }),
}));

// The header is the workspace's and has its own tests; the class dialogs it
// opens need a class context this page does not care about.
vi.mock('@/components/SeatingPlanGenerator/SeatingPlanHeader', () => ({
  default: () => null,
}));
vi.mock('@/contexts/ClassDialogsContext', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/contexts/ClassDialogsContext')>()),
  ClassDialogsProvider: ({ children }: { children: React.ReactNode }) =>
    children,
}));

vi.mock('@/services/export/sceneRenderer', () => ({
  renderSceneSvg: vi.fn(async () => '<svg data-testid="scene"></svg>'),
  renderCircleSvg: vi.fn(async () => '<svg data-testid="circle"></svg>'),
  renderNoteListSvgPages: vi.fn(async () => [
    '<svg data-testid="list-1"></svg>',
    '<svg data-testid="list-2"></svg>',
  ]),
  preloadRenderer: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/services/export/pdfExportFunctions', () => ({
  buildPhotoDataUrlMap: vi.fn(async () => new Map()),
  generatePdfBlob: vi.fn(async () => new Blob()),
  openPdfForPrinting: vi.fn(() => true),
  downloadPdfBlob: vi.fn(),
  exportTableLayoutToPdf: vi.fn(),
  exportCircleLayoutToPdf: vi.fn(),
  exportNoteListToPdf: vi.fn(),
}));

const students = [
  createMockStudent({ id: 'a', name: 'Ada Lovelace' }),
  createMockStudent({ id: 'b', name: 'Grace Hopper' }),
];

const withPlan = () => ({
  step: 3,
  currentSeating: [[students[0]!, students[1]!]],
  planName: 'Plan A',
  classroomScene: createMockClassroomScene(1),
  students,
  circleLayout: null,
  circleGenerationInProgress: false,
  circleGenerationStatus: null,
  activeClass: { id: 'c1', name: 'Klasse 7b' },
});

const withoutPlan = () => ({
  ...withPlan(),
  currentSeating: [],
  classroomScene: createMockClassroomScene(0),
});

const renderExport = () =>
  render(
    <MemoryRouter initialEntries={[{ pathname: '/export', state: null }]}>
      <Export />
    </MemoryRouter>,
  );

/** The preview document the page pushes into its iframe. */
const previewSrcdoc = async (): Promise<string> => {
  const iframe = await screen.findByTitle(/Vorschau|Preview/);
  await waitFor(() =>
    expect(iframe.getAttribute('srcdoc') ?? '').not.toHaveLength(0),
  );
  return iframe.getAttribute('srcdoc') ?? '';
};

beforeEach(async () => {
  localStorage.clear();
  seatingState.current = withPlan();
  // Pinned rather than matched bilingually: this file asserts on
  // language-dependent output, so the active language has to be the subject of
  // the test rather than a property of whoever runs it.
  await i18n.changeLanguage('de');
});

afterEach(async () => {
  vi.clearAllMocks();
  await i18n.changeLanguage('de');
});

describe('Export page', () => {
  it('offers a way back instead of a broken preview when no plan exists', () => {
    seatingState.current = withoutPlan();

    renderExport();

    expect(
      screen.getByText('Noch kein Sitzplan zum Exportieren.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Zurück zum Sitzplan' }),
    ).toBeInTheDocument();
  });

  it('renders the plan into the preview document', async () => {
    renderExport();

    const iframe = await screen.findByTitle('Vorschau');
    await waitFor(
      () =>
        expect(iframe.getAttribute('srcdoc') ?? '').toContain(
          'data-testid="scene"',
        ),
      { timeout: 4000 },
    );
  });

  describe('preview document language', () => {
    it('declares German on the default route', async () => {
      renderExport();

      expect(await previewSrcdoc()).toContain('<html lang="de">');
    });

    it('declares English once the UI is in English', async () => {
      await i18n.changeLanguage('en');

      renderExport();

      const srcdoc = await previewSrcdoc();
      expect(srcdoc).toContain('<html lang="en">');
      // The title reaches the browser's print dialog. It resolves through i18n
      // rather than being hardcoded, and both languages settle on the product
      // name so the suggested file name does not carry a translated suffix.
      expect(srcdoc).toContain('<title>Klassenplan</title>');
    });

    it('uses the product name as the document title on the default route', async () => {
      renderExport();

      expect(await previewSrcdoc()).toContain('<title>Klassenplan</title>');
    });
  });

  describe('the sheet in the inspector', () => {
    const sheetPanel = () =>
      screen.findByRole('complementary', { name: 'Blatt' });

    const needsSwitch = async () =>
      within(await sheetPanel()).getByRole('switch', { name: 'Bedürfnisse' });

    // Below `lg` the settings no longer follow the sheet down the page: they
    // open from the status bar's switch as a drawer, as a layer's panel does.
    it('opens the sheet from the status bar below lg', async () => {
      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        value: 820,
      });
      try {
        renderExport();
        const panel = await screen.findByRole('complementary', {
          name: 'Blatt',
          hidden: true,
        });
        expect(panel).toHaveClass('hidden');

        await userEvent.click(
          screen.getByRole('button', { name: /Blatt einblenden/i }),
        );
        expect(panel).toHaveClass('fixed');
        expect(panel).not.toHaveClass('hidden');
      } finally {
        Object.defineProperty(window, 'innerWidth', {
          configurable: true,
          value: 1024,
        });
      }
    });

    it('reads the inspector column as the sheet', async () => {
      renderExport();

      expect(
        within(await sheetPanel()).getByRole('heading', { name: 'Blatt' }),
      ).toBeInTheDocument();
    });

    it('starts with needs shown', async () => {
      renderExport();

      expect(await needsSwitch()).toHaveAttribute('aria-checked', 'true');
    });

    it('remembers the needs switch across visits', async () => {
      const { unmount } = renderExport();
      await userEvent.click(await needsSwitch());

      await waitFor(() =>
        expect(localStorage.getItem(LOCAL_STORAGE_KEYS.exportShowNeeds)).toBe(
          'false',
        ),
      );

      // The regression this guards: the toggle used to live in plain
      // `useState`, so every visit silently switched it back on.
      unmount();
      renderExport();

      expect(await needsSwitch()).toHaveAttribute('aria-checked', 'false');
    });

    it('seeds the needs switch from a stored preference', async () => {
      localStorage.setItem(LOCAL_STORAGE_KEYS.exportShowNeeds, 'false');

      renderExport();

      expect(await needsSwitch()).toHaveAttribute('aria-checked', 'false');
    });

    it('leaves out the circle connections while the seating plan is shown', async () => {
      renderExport();

      expect(
        within(await sheetPanel()).queryByRole('switch', {
          name: 'Verbindungen',
        }),
      ).not.toBeInTheDocument();
    });
  });

  describe('printing and saving', () => {
    it('prints from the one primary action in the status bar', async () => {
      renderExport();
      // Printing needs the rendered sheet, not just the empty document.
      const iframe = await screen.findByTitle('Vorschau');
      await waitFor(
        () =>
          expect(iframe.getAttribute('srcdoc') ?? '').toContain(
            'data-testid="scene"',
          ),
        { timeout: 4000 },
      );

      await userEvent.click(screen.getByRole('button', { name: 'Drucken' }));

      await waitFor(() => expect(openPdfForPrinting).toHaveBeenCalled());
      expect(generatePdfBlob).toHaveBeenCalledWith(
        expect.stringContaining('data-testid="scene"'),
        'portrait',
      );
    });

    it('saves the PDF of the arrangement on the sheet from the toolbar', async () => {
      renderExport();

      await userEvent.click(
        screen.getByRole('button', { name: 'PDF-Dokument' }),
      );

      await waitFor(() => expect(exportTableLayoutToPdf).toHaveBeenCalled());
    });
  });

  describe('note list', () => {
    const openList = async () => {
      renderExport();
      await userEvent.click(screen.getByRole('button', { name: 'Liste' }));
    };

    it('shows every page of the list, one under the other', async () => {
      await openList();

      const iframe = await screen.findByTitle('Vorschau');
      await waitFor(
        () =>
          expect(iframe.getAttribute('srcdoc') ?? '').toContain(
            'data-testid="list-2"',
          ),
        { timeout: 4000 },
      );
      expect(iframe.getAttribute('srcdoc')).toContain('class="pages"');
      expect(renderNoteListSvgPages).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Plan A',
          classMetadata: expect.objectContaining({ name: 'Klasse 7b' }),
        }),
      );
    });

    it('prints all its pages and saves them as one PDF only', async () => {
      await openList();
      const iframe = await screen.findByTitle('Vorschau');
      await waitFor(
        () =>
          expect(iframe.getAttribute('srcdoc') ?? '').toContain(
            'data-testid="list-2"',
          ),
        { timeout: 4000 },
      );

      expect(screen.getByRole('button', { name: 'PNG-Bild' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'SVG-Grafik' })).toBeDisabled();

      await userEvent.click(screen.getByRole('button', { name: 'Drucken' }));
      await waitFor(() =>
        expect(generatePdfBlob).toHaveBeenCalledWith(
          [
            '<svg data-testid="list-1"></svg>',
            '<svg data-testid="list-2"></svg>',
          ],
          'portrait',
        ),
      );

      await userEvent.click(
        screen.getByRole('button', { name: 'PDF-Dokument' }),
      );
      await waitFor(() =>
        expect(exportNoteListToPdf).toHaveBeenCalledWith(
          expect.objectContaining({ title: 'Plan A' }),
          'Notizliste_Klasse 7b',
        ),
      );
      expect(exportTableLayoutToPdf).not.toHaveBeenCalled();
    });

    it('opens from the class layer without a plan, by name, and leads back there', async () => {
      seatingState.current = withoutPlan();
      const Generator = () => (
        <p>generator step {String(useLocation().state?.step)}</p>
      );
      render(
        <MemoryRouter
          initialEntries={[
            { pathname: '/export', state: { mode: 'list', returnStep: 1 } },
          ]}
        >
          <Routes>
            <Route path="/export" element={<Export />} />
            <Route path="/generator" element={<Generator />} />
          </Routes>
        </MemoryRouter>,
      );

      await waitFor(() =>
        expect(renderNoteListSvgPages).toHaveBeenCalledWith(
          expect.objectContaining({
            entries: [
              expect.objectContaining({ number: 1, groupStart: false }),
              expect.objectContaining({ number: 2, groupStart: false }),
            ],
          }),
        ),
      );
      expect(
        screen.queryByText('Noch kein Sitzplan zum Exportieren.'),
      ).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Sitzplan' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Sitzkreis' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Drucken' })).toBeEnabled();

      await userEvent.click(
        screen.getByRole('button', { name: 'Zurück zur Klasse' }),
      );
      expect(await screen.findByText('generator step 1')).toBeInTheDocument();
    });

    it('remembers its settings, badges off until asked for', async () => {
      await openList();

      expect(
        await screen.findByRole('switch', { name: 'Bedürfnisse' }),
      ).not.toBeChecked();
      await userEvent.click(screen.getByRole('button', { name: 'Raster' }));

      await waitFor(() =>
        expect(
          JSON.parse(
            localStorage.getItem(LOCAL_STORAGE_KEYS.exportNoteList) ?? '{}',
          ),
        ).toMatchObject({ form: 'grid', showBadges: false }),
      );
    });
  });

  it('lets the sheet fill its frame on screen, whatever the paper size', async () => {
    // A cap at 297 × 210 mm shrank a landscape sheet into the middle of a
    // large screen; only print sets the paper's size.
    localStorage.setItem(
      LOCAL_STORAGE_KEYS.exportTableOrientation,
      '"landscape"',
    );
    renderExport();

    const srcdoc = await previewSrcdoc();
    const screenRoot = /#print-root \{([^}]*)\}/.exec(srcdoc)?.[1] ?? '';
    expect(screenRoot).toContain('width: 100%');
    expect(screenRoot).not.toMatch(/max-(width|height)/);
  });

  describe('framing on the tables', () => {
    it('frames the sheet on the tables by default', async () => {
      renderExport();

      await waitFor(() =>
        expect(renderSceneSvg).toHaveBeenCalledWith(
          expect.anything(),
          expect.anything(),
          expect.anything(),
          expect.objectContaining({ frameOnTables: true }),
        ),
      );
    });

    it('shows the whole room once switched off, and remembers it', async () => {
      renderExport();

      await userEvent.click(
        await screen.findByRole('switch', {
          name: 'Anzeige vergrößern',
        }),
      );

      await waitFor(() =>
        expect(renderSceneSvg).toHaveBeenLastCalledWith(
          expect.anything(),
          expect.anything(),
          expect.anything(),
          expect.objectContaining({ frameOnTables: false }),
        ),
      );
      expect(localStorage.getItem(LOCAL_STORAGE_KEYS.exportFrameOnTables)).toBe(
        'false',
      );
    });
  });

  describe('page orientation', () => {
    it('persists the choice for the table plan', async () => {
      renderExport();

      // The inspector offers the orientation of the arrangement on the sheet,
      // which starts as the seating plan.
      await userEvent.click(
        await screen.findByRole('button', { name: 'Querformat' }),
      );

      await waitFor(() =>
        expect(
          localStorage.getItem(LOCAL_STORAGE_KEYS.exportTableOrientation),
        ).toBe('"landscape"'),
      );
    });

    it('adopts a legacy single-orientation preference', async () => {
      // `export.pageOrientation` predates the split into a table and a circle
      // key; an existing preference must survive the migration.
      localStorage.setItem(LEGACY_EXPORT_KEYS.pageOrientation, '"landscape"');

      renderExport();

      await waitFor(() =>
        expect(
          localStorage.getItem(LOCAL_STORAGE_KEYS.exportTableOrientation),
        ).toBe('"landscape"'),
      );
      expect(
        localStorage.getItem(LEGACY_EXPORT_KEYS.pageOrientation),
      ).toBeNull();
    });

    it('applies the legacy preference to the circle format too', async () => {
      // Portrait is the table default but not the circle default, so this is
      // the direction that proves the circle key was seeded rather than left
      // on its own default.
      localStorage.setItem(LEGACY_EXPORT_KEYS.pageOrientation, '"portrait"');

      renderExport();

      await waitFor(() =>
        expect(
          localStorage.getItem(LOCAL_STORAGE_KEYS.exportCircleOrientation),
        ).toBe('"portrait"'),
      );
    });

    it('ignores a corrupted legacy value', async () => {
      localStorage.setItem(LEGACY_EXPORT_KEYS.pageOrientation, '"sideways"');

      renderExport();

      await waitFor(() =>
        expect(
          localStorage.getItem(LOCAL_STORAGE_KEYS.exportTableOrientation),
        ).toBe('"portrait"'),
      );
      expect(
        localStorage.getItem(LEGACY_EXPORT_KEYS.pageOrientation),
      ).toBeNull();
    });
  });
});
