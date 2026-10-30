// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SUBSTITUTE_SETTINGS,
  layoutSheetNotes,
  normalizeSubstituteSettings,
  SHEET_NOTES_METRICS,
  substituteHeaderLines,
  substituteRenderOptions,
  wrapSheetNote,
} from '@/utils/ui/substituteSheet';
import { measureNameWidth } from '@/utils/ui/seatLabelLayout';

describe('substitute sheet settings', () => {
  it('starts with full names, no photos, no class info, the room and three lines', () => {
    expect(normalizeSubstituteSettings(undefined)).toEqual({
      nameDisplay: 'full',
      showPhotos: false,
      showClassInfo: false,
      showRoom: true,
      lines: 3,
    });
  });

  it('keeps every valid stored field and defaults the rest', () => {
    expect(
      normalizeSubstituteSettings({
        nameDisplay: 'firstName',
        showPhotos: true,
        lines: 7,
        showRoom: 'yes',
      }),
    ).toEqual({
      ...DEFAULT_SUBSTITUTE_SETTINGS,
      nameDisplay: 'firstName',
      showPhotos: true,
    });
  });
});

describe('substituteRenderOptions', () => {
  // Decision 0034: nothing stored can bring them back.
  it('leaves badges, gender tint, legend and circle lines off whatever is stored', () => {
    const stored = normalizeSubstituteSettings({
      showSpecialNeeds: true,
      showGenderColors: true,
      showLegend: true,
      showConnections: true,
      showPhotos: true,
    });

    expect(substituteRenderOptions(stored)).toEqual({
      showSpecialNeeds: false,
      showGenderColors: false,
      showLegend: false,
      showConnections: false,
      nameDisplay: 'full',
      showPhotos: true,
    });
  });
});

describe('substituteHeaderLines', () => {
  const info = {
    className: 'Klasse 7b',
    label: '2026/27',
    notes: 'Mo. und Do. in Raum 12',
    roomName: 'Raum 204',
  };

  it('names the class and its room, not its school year or notes', () => {
    expect(substituteHeaderLines(info, DEFAULT_SUBSTITUTE_SETTINGS)).toEqual([
      'Klasse 7b • Raum 204',
    ]);
  });

  it('adds the school year and the notes when asked for', () => {
    expect(
      substituteHeaderLines(info, {
        ...DEFAULT_SUBSTITUTE_SETTINGS,
        showClassInfo: true,
        showRoom: false,
      }),
    ).toEqual(['Klasse 7b • 2026/27', 'Mo. und Do. in Raum 12']);
  });

  it('names the class alone where there is nothing else', () => {
    expect(
      substituteHeaderLines(
        { className: 'Klasse 7b', roomName: '  ' },
        DEFAULT_SUBSTITUTE_SETTINGS,
      ),
    ).toEqual(['Klasse 7b']);
  });
});

describe('the notes band', () => {
  const size = SHEET_NOTES_METRICS.textSize;

  it('wraps the note word by word within the width, a paragraph per line break', () => {
    const lines = wrapSheetNote(
      'Arbeitsblatt Seite 12 bearbeiten, danach Vergleich in Partnerarbeit.\nHausaufgaben einsammeln.',
      150,
    );

    expect(lines.length).toBeGreaterThan(2);
    expect(lines[lines.length - 1]).toBe('Hausaufgaben einsammeln.');
    for (const line of lines) {
      expect(measureNameWidth(line, size)).toBeLessThanOrEqual(150);
    }
  });

  it('breaks a word wider than the band', () => {
    const lines = wrapSheetNote('x'.repeat(80), 60);

    expect(lines.length).toBeGreaterThan(1);
    expect(lines.join('')).toBe('x'.repeat(80));
  });

  it('ends a note too long for the band with an ellipsis', () => {
    const lines = wrapSheetNote(
      Array.from({ length: 20 }, (_, i) => `Zeile ${i}`).join('\n'),
      300,
    );

    expect(lines).toHaveLength(SHEET_NOTES_METRICS.maxTextLines);
    expect(lines[lines.length - 1]).toMatch(/…$/);
  });

  it('is left out with neither a note nor a line', () => {
    expect(layoutSheetNotes({ text: ' \n ', lines: 0 }, 500)).toBeNull();
    expect(layoutSheetNotes(undefined, 500)).toBeNull();
  });

  it('puts the ruled lines under the note at the pitch of handwriting', () => {
    const layout = layoutSheetNotes({ text: 'Bitte leise', lines: 3 }, 500)!;

    expect(layout.text).toHaveLength(1);
    expect(layout.rules).toHaveLength(3);
    expect(layout.rules[0]).toBeGreaterThan(layout.text[0]!.baseline);
    expect(layout.rules[1]! - layout.rules[0]!).toBe(
      SHEET_NOTES_METRICS.rulePitch,
    );
    expect(layout.height).toBe(layout.rules[2]);
  });
});
