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
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import i18n from '@/i18n';
import Export from '../Export';
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

vi.mock('@/services/export/sceneRenderer', () => ({
  renderSceneSvg: vi.fn(async () => '<svg data-testid="scene"></svg>'),
  renderCircleSvg: vi.fn(async () => '<svg data-testid="circle"></svg>'),
  preloadRenderer: vi.fn(),
}));

vi.mock('@/utils/export/pdfExportFunctions', () => ({
  buildPhotoDataUrlMap: vi.fn(async () => new Map()),
  generatePdfBlob: vi.fn(async () => new Blob()),
  openPdfForPrinting: vi.fn(() => true),
  downloadPdfBlob: vi.fn(),
  exportTableLayoutToPdf: vi.fn(),
  exportCircleLayoutToPdf: vi.fn(),
}));

const students = [
  createMockStudent({ id: 'a', name: 'Ada Lovelace' }),
  createMockStudent({ id: 'b', name: 'Grace Hopper' }),
];

const withPlan = () => ({
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
      // The title reaches the browser's print dialog, so it follows the
      // language too rather than staying hardcoded German.
      expect(srcdoc).toContain('<title>Klassenplan Print</title>');
    });

    it('uses the German document title on the default route', async () => {
      renderExport();

      expect(await previewSrcdoc()).toContain(
        '<title>Klassenplan Druck</title>',
      );
    });
  });

  describe('display options', () => {
    const openDisplayOptions = async () => {
      await userEvent.click(
        screen.getByRole('button', { name: 'Export-Anzeigeoptionen' }),
      );
    };

    const needsToggle = () =>
      screen.findByRole('button', { name: 'Bedürfnisse anzeigen' });

    it('starts with needs shown', async () => {
      renderExport();
      await openDisplayOptions();

      expect(await needsToggle()).toHaveAttribute('aria-pressed', 'true');
    });

    it('remembers the needs toggle across visits', async () => {
      const { unmount } = renderExport();
      await openDisplayOptions();
      await userEvent.click(await needsToggle());

      await waitFor(() =>
        expect(localStorage.getItem(LOCAL_STORAGE_KEYS.exportShowNeeds)).toBe(
          'false',
        ),
      );

      // The regression this guards: the toggle used to live in plain
      // `useState`, so every visit silently switched it back on.
      unmount();
      renderExport();
      await openDisplayOptions();

      expect(await needsToggle()).toHaveAttribute('aria-pressed', 'false');
    });

    it('seeds the needs toggle from a stored preference', async () => {
      localStorage.setItem(LOCAL_STORAGE_KEYS.exportShowNeeds, 'false');

      renderExport();
      await openDisplayOptions();

      expect(await needsToggle()).toHaveAttribute('aria-pressed', 'false');
    });
  });

  describe('page orientation', () => {
    it('persists the choice for the table plan', async () => {
      renderExport();

      // Two sections offer the same choice (table plan and circle); the first
      // one belongs to the table plan.
      const [tableLandscape] = screen.getAllByRole('button', {
        name: 'Querformat',
      });
      await userEvent.click(tableLandscape!);

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
