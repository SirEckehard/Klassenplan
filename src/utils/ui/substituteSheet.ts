// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type { NameDisplayMode } from '@/utils';
import { measureNameWidth } from '@/utils/ui/seatLabelLayout';

/**
 * The substitute's sheet (decision 0034): the plan or the circle with names
 * for a colleague who does not know the class. What it never carries is set
 * here, once, rather than by switches a teacher would have to remember: no
 * badges, no gender tint, no legend, no lines between wish partners.
 */

/** Which arrangement the sheet shows. */
export type SubstituteArrangement = 'table' | 'circle';

/** Ruled lines at the foot of the sheet, for the substitute's pen. */
export const SUBSTITUTE_LINE_COUNTS = [0, 3, 6] as const;

/** The note typed for the sheet: a few sentences, not a file. */
export const SUBSTITUTE_NOTE_MAX_LENGTH = 400;

const NAME_DISPLAY_MODES: readonly NameDisplayMode[] = [
  'firstName',
  'firstNameInitial',
  'full',
];

export type SubstituteSheetSettings = {
  /**
   * Full names by default: the substitute writes the absent into the class
   * register.
   */
  nameDisplay: NameDisplayMode;
  /** Off by default: the sheet goes to someone from outside the class. */
  showPhotos: boolean;
  /** The class's school year and notes, off by default: notes say anything. */
  showClassInfo: boolean;
  /** The open room's name beside the class: a class may have several. */
  showRoom: boolean;
  lines: (typeof SUBSTITUTE_LINE_COUNTS)[number];
};

export const DEFAULT_SUBSTITUTE_SETTINGS: SubstituteSheetSettings = {
  nameDisplay: 'full',
  showPhotos: false,
  showClassInfo: false,
  showRoom: true,
  lines: 3,
};

const pick = <T>(value: unknown, allowed: readonly T[], fallback: T): T =>
  allowed.includes(value as T) ? (value as T) : fallback;

const flag = (value: unknown, fallback: boolean): boolean =>
  typeof value === 'boolean' ? value : fallback;

/** Read stored settings, keeping every valid field and defaulting the rest. */
export function normalizeSubstituteSettings(
  stored: unknown,
): SubstituteSheetSettings {
  const source =
    stored && typeof stored === 'object'
      ? (stored as Record<string, unknown>)
      : {};
  const d = DEFAULT_SUBSTITUTE_SETTINGS;
  return {
    nameDisplay: pick(source.nameDisplay, NAME_DISPLAY_MODES, d.nameDisplay),
    showPhotos: flag(source.showPhotos, d.showPhotos),
    showClassInfo: flag(source.showClassInfo, d.showClassInfo),
    showRoom: flag(source.showRoom, d.showRoom),
    lines: pick(source.lines, SUBSTITUTE_LINE_COUNTS, d.lines),
  };
}

/**
 * The options the sheet is drawn with. The four that would say more than
 * names are off whatever is stored — this is the one place they are set.
 */
export function substituteRenderOptions(settings: SubstituteSheetSettings): {
  showSpecialNeeds: false;
  showGenderColors: false;
  showLegend: false;
  showConnections: false;
  nameDisplay: NameDisplayMode;
  showPhotos: boolean;
} {
  return {
    showSpecialNeeds: false,
    showGenderColors: false,
    showLegend: false,
    showConnections: false,
    nameDisplay: settings.nameDisplay,
    showPhotos: settings.showPhotos,
  };
}

/**
 * The lines under the sheet's title: the class always — the title is the
 * sheet's, not the class's — with its school year and its room where they
 * are asked for, then the class's notes.
 */
export function substituteHeaderLines(
  info: {
    className?: string | null;
    label?: string | null;
    notes?: string | null;
    roomName?: string | null;
  },
  settings: SubstituteSheetSettings,
): string[] {
  const label = settings.showClassInfo ? info.label?.trim() : undefined;
  const room = settings.showRoom ? info.roomName?.trim() : undefined;
  const notes = settings.showClassInfo ? info.notes?.trim() : undefined;
  const primary = [info.className?.trim(), label, room]
    .filter(Boolean)
    .join(' • ');
  return [primary, notes].filter((line): line is string => Boolean(line));
}

/** What the band at the foot of the sheet holds. */
export type SheetNotes = {
  /** The note typed for the sheet; empty for none. */
  text: string;
  /** Ruled lines under it. */
  lines: number;
};

/** The band's type and pitch, in points like the page frame. */
export const SHEET_NOTES_METRICS = {
  headingSize: 9,
  textSize: 9,
  lineHeight: 12,
  /** Room between the heading and what follows. */
  headingGap: 3,
  /** Room for one handwritten line. */
  rulePitch: 20,
  /** The note never takes more of the page than this. */
  maxTextLines: 8,
} as const;

export type SheetNotesLayout = {
  height: number;
  /** The heading's baseline, from the band's top. */
  headingBaseline: number;
  /** The note's lines and their baselines, from the band's top. */
  text: { line: string; baseline: number }[];
  /** Where each ruled line is drawn, from the band's top. */
  rules: number[];
};

/** Break one word that is wider than a line on its own into pieces. */
function breakWord(word: string, width: number, size: number): string[] {
  const pieces: string[] = [];
  let piece = '';
  for (const char of word) {
    if (piece && measureNameWidth(piece + char, size) > width) {
      pieces.push(piece);
      piece = char;
    } else {
      piece += char;
    }
  }
  if (piece) pieces.push(piece);
  return pieces;
}

/**
 * The note wrapped to the band's width, word by word, a paragraph per line
 * break typed. A note longer than the band allows ends with an ellipsis.
 */
export function wrapSheetNote(
  text: string,
  width: number,
  size: number = SHEET_NOTES_METRICS.textSize,
  maxLines: number = SHEET_NOTES_METRICS.maxTextLines,
): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split(/\r?\n/)) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    let line = '';
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (measureNameWidth(candidate, size) <= width) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line);
      const pieces =
        measureNameWidth(word, size) > width
          ? breakWord(word, width, size)
          : [word];
      lines.push(...pieces.slice(0, -1));
      line = pieces[pieces.length - 1] ?? '';
    }
    if (line) lines.push(line);
  }
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  let last = `${kept[maxLines - 1]}…`;
  while (last.length > 1 && measureNameWidth(last, size) > width) {
    last = `${last.slice(0, -2)}…`;
  }
  kept[maxLines - 1] = last;
  return kept;
}

/**
 * The band at the foot of the sheet: a heading, the note and the ruled
 * lines. `null` while there is neither a note nor a line to draw.
 */
export function layoutSheetNotes(
  notes: SheetNotes | undefined,
  width: number,
): SheetNotesLayout | null {
  if (!notes) return null;
  const m = SHEET_NOTES_METRICS;
  const textLines = wrapSheetNote(notes.text, width);
  const ruleCount = Math.max(0, Math.floor(notes.lines));
  if (textLines.length === 0 && ruleCount === 0) return null;
  const headingBaseline = m.headingSize;
  const textTop = headingBaseline + m.headingGap;
  const text = textLines.map((line, index) => ({
    line,
    baseline: textTop + (index + 1) * m.lineHeight - 3,
  }));
  const textBottom = textTop + textLines.length * m.lineHeight;
  const rules = Array.from(
    { length: ruleCount },
    (_, index) => textBottom + (index + 1) * m.rulePitch,
  );
  return {
    height: rules.length > 0 ? rules[rules.length - 1]! : textBottom,
    headingBaseline,
    text,
    rules,
  };
}
