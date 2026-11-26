// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * What the class list shows of the markers and does with them (decision
 * 0051): the card a badge or a name explains itself in, the partners it
 * lights up, the brush in the list's head, and below `lg` the seats' icons
 * and the markers unfolded in place.
 */
import '@testing-library/jest-dom/vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '@/i18n';
import StudentList from '../StudentList';
import { InspectorProvider, useInspector } from '@/contexts/InspectorContext';
import { createMockStudent } from '@/__tests__/utils';
import { DEFAULT_MIX_WEIGHTS } from '@/utils';
import {
  LONG_PRESS_MS,
  PROFILE_HOVER_MS,
} from '@/hooks/student/useStudentCard';
import type { BrushKey } from '@/components/students/markerBrush';
import type { MixSettings, Student } from '@/types';

const layout = vi.hoisted(() => ({ lgUp: true }));

vi.mock('@/hooks/ui/useIsLgUp', () => ({
  useIsLgUp: () => layout.lgUp,
}));

const students: Student[] = [
  createMockStudent({
    id: 'a',
    name: 'Aylin',
    restless: true,
    leftHanded: true,
    wishPartnerIds: ['c'],
    markersUpdatedAt: '2026-10-14',
  }),
  createMockStudent({ id: 'b', name: 'Ben' }),
  createMockStudent({ id: 'c', name: 'Cem', performanceWeak: true }),
];

// Left-handers are left out of the mix, everything else counts.
const mixSettings: MixSettings = {
  ...DEFAULT_MIX_WEIGHTS,
  avoidRestlessTogether: 5,
  seatLeftHandersLeft: 0,
};

const Probe = () => {
  const { selection } = useInspector();
  return <output data-testid="inspected">{selection?.id ?? 'none'}</output>;
};

const renderList = (
  props: Partial<React.ComponentProps<typeof StudentList>> = {},
) =>
  render(
    <InspectorProvider>
      <Probe />
      <StudentList
        students={students}
        lastAddedId={null}
        mixSettings={mixSettings}
        {...props}
      />
    </InspectorProvider>,
  );

const badge = (studentId: string, key: string) => {
  const found = document.querySelector(
    `[data-card-student="${studentId}"][data-card-badge="${key}"]`,
  );
  if (!found) throw new Error(`No badge ${key} on ${studentId}`);
  return found as HTMLElement;
};
const rowOf = (studentId: string) =>
  document.getElementById(`student-${studentId}`) as HTMLElement;

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  layout.lgUp = true;
});

describe('the card of a badge', () => {
  it('explains a badge under the mouse and says what the mix makes of it', () => {
    renderList();
    fireEvent.pointerOver(badge('a', 'restless'), { pointerType: 'mouse' });

    const card = screen.getByRole('tooltip');
    expect(card).toHaveTextContent(/Unruhig|Restless/);
    expect(card).toHaveTextContent(/Beim Mischen|In the mix/);
    // A line per criterion the badge feeds: restlessness and distraction.
    expect(card).toHaveTextContent(
      /(Beim Mischen|In the mix)(Unruhe|Restlessness)(Wichtig|Important)(Ablenkbarkeit|Distractibility)/,
    );

    fireEvent.pointerOver(rowOf('b'), { pointerType: 'mouse' });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('draws a badge the mix weighs nothing of dashed, and says so', () => {
    renderList();
    expect(badge('a', 'leftHanded')).toHaveClass('data-chip-off');
    expect(badge('a', 'restless')).not.toHaveClass('data-chip-off');

    fireEvent.pointerOver(badge('a', 'leftHanded'), { pointerType: 'mouse' });
    const card = screen.getByRole('tooltip');
    expect(card).toHaveTextContent(
      /(Beim Mischen|In the mix)(Linkshänder|Left-handers)(Aus|Off)/i,
    );
    expect(card).toHaveTextContent(
      /Zählt beim Mischen gerade nicht|Does not count in the mix right now/,
    );
  });

  it('names the partners in their badge where the list is wide', () => {
    renderList();
    const wish = badge('a', 'wishPartner');
    expect(wish).toHaveTextContent(/(Wunschpartner|Preferred partner): Cem/i);
    // Hidden below `@4xl`, where the card names them instead.
    expect(within(wish).getByText('Cem').parentElement).toHaveClass(
      'hidden',
      '@4xl:inline',
    );
  });

  it('lights the rows of the partners a partner badge names', () => {
    renderList();
    fireEvent.pointerOver(badge('a', 'wishPartner'), { pointerType: 'mouse' });

    expect(rowOf('c')).toHaveClass('bg-(--data-social-surface)');
    expect(rowOf('b')).not.toHaveClass('bg-(--data-social-surface)');
  });

  it('opens on a long press of a finger without opening the row', () => {
    vi.useFakeTimers();
    renderList();
    const target = badge('a', 'restless');

    fireEvent.pointerDown(target, { pointerType: 'touch', clientX: 5 });
    act(() => vi.advanceTimersByTime(LONG_PRESS_MS));
    fireEvent.pointerUp(target, { pointerType: 'touch', clientX: 5 });
    fireEvent.click(target);

    expect(screen.getByRole('tooltip')).toHaveTextContent(/Unruhig|Restless/);
    expect(screen.getByTestId('inspected')).toHaveTextContent('none');

    // The next touch puts it away.
    fireEvent.pointerDown(rowOf('b'), { pointerType: 'touch' });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('leaves a short tap to the row', () => {
    vi.useFakeTimers();
    renderList();
    const target = badge('a', 'restless');

    fireEvent.pointerDown(target, { pointerType: 'touch' });
    act(() => vi.advanceTimersByTime(LONG_PRESS_MS / 2));
    fireEvent.pointerUp(target, { pointerType: 'touch' });
    fireEvent.click(target);

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    expect(screen.getByTestId('inspected')).toHaveTextContent('a');
  });

  it('shows a student at a glance after the pointer rests on the name', () => {
    vi.useFakeTimers();
    renderList();
    const name = within(rowOf('a')).getByText('Aylin');

    fireEvent.pointerOver(name, { pointerType: 'mouse' });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(PROFILE_HOVER_MS));

    const card = screen.getByRole('tooltip');
    expect(card).toHaveTextContent(/3 Merkmale|3 attributes/);
    expect(card).toHaveTextContent(
      /Wunschpartner: Cem|Preferred partner: Cem/i,
    );
    expect(card).toHaveTextContent(
      /14\. Oktober 2026|14\.10\.2026|10\/14\/2026/,
    );
  });

  // Switched off under "Ansichtseinstellungen" → "Merkmale", as the seats'
  // tooltip is in the plan; mouse and finger alike.
  it('opens no card of a badge while that card is switched off', () => {
    vi.useFakeTimers();
    renderList({ cards: { badge: false, profile: true } });

    fireEvent.pointerOver(badge('a', 'wishPartner'), { pointerType: 'mouse' });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    expect(rowOf('c')).not.toHaveClass('bg-(--data-social-surface)');

    const target = badge('a', 'restless');
    fireEvent.pointerDown(target, { pointerType: 'touch', clientX: 5 });
    act(() => vi.advanceTimersByTime(LONG_PRESS_MS));
    fireEvent.pointerUp(target, { pointerType: 'touch', clientX: 5 });
    fireEvent.click(target);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    // The press is the row's again.
    expect(screen.getByTestId('inspected')).toHaveTextContent('a');

    // The name's card is a switch of its own.
    fireEvent.pointerOver(within(rowOf('b')).getByText('Ben'), {
      pointerType: 'mouse',
    });
    act(() => vi.advanceTimersByTime(PROFILE_HOVER_MS));
    expect(screen.getByRole('tooltip')).toHaveTextContent(
      /Noch keine Merkmale|No attributes yet/,
    );
  });

  it('opens no card of a name while that card is switched off', () => {
    vi.useFakeTimers();
    renderList({ cards: { badge: true, profile: false } });

    fireEvent.pointerOver(within(rowOf('a')).getByText('Aylin'), {
      pointerType: 'mouse',
    });
    act(() => vi.advanceTimersByTime(PROFILE_HOVER_MS));
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    fireEvent.pointerOver(badge('a', 'restless'), { pointerType: 'mouse' });
    expect(screen.getByRole('tooltip')).toHaveTextContent(/Unruhig|Restless/);
  });

  it('puts an open card away when its kind is switched off', () => {
    const view = renderList();
    fireEvent.pointerOver(badge('a', 'restless'), { pointerType: 'mouse' });
    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    view.rerender(
      <InspectorProvider>
        <Probe />
        <StudentList
          students={students}
          lastAddedId={null}
          mixSettings={mixSettings}
          cards={{ badge: false, profile: true }}
        />
      </InspectorProvider>,
    );
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  // A class just created, or one switched to from an empty class: the list
  // stays mounted with nobody in it and draws its rows only later (M16 of
  // the review of 22 November 2026).
  it('opens once the list is drawn after a class without students', () => {
    vi.useFakeTimers();
    const view = renderList({ students: [] });
    expect(document.querySelector('[data-student-list]')).toBeNull();

    view.rerender(
      <InspectorProvider>
        <Probe />
        <StudentList
          students={students}
          lastAddedId={null}
          mixSettings={mixSettings}
        />
      </InspectorProvider>,
    );
    fireEvent.pointerOver(badge('a', 'restless'), { pointerType: 'mouse' });
    expect(screen.getByRole('tooltip')).toHaveTextContent(/Unruhig|Restless/);

    fireEvent.pointerOver(within(rowOf('b')).getByText('Ben'), {
      pointerType: 'mouse',
    });
    act(() => vi.advanceTimersByTime(PROFILE_HOVER_MS));
    expect(screen.getByRole('tooltip')).toHaveTextContent(
      /Noch keine Merkmale|No attributes yet/,
    );
  });
});

describe('the brush', () => {
  const renderBrush = (active: BrushKey | null) => {
    const brush = {
      active,
      onChoose: vi.fn(),
      onEnd: vi.fn(),
      onStroke: vi.fn(),
    };
    renderList({ brush, onToggleSelected: vi.fn(), isSelected: () => false });
    return brush;
  };

  it('is taken up from the list head', () => {
    const brush = renderBrush(null);
    fireEvent.click(screen.getByRole('button', { name: /^(Markieren|Mark):/ }));
    expect(brush.onChoose).toHaveBeenCalledWith('restless');
  });

  it('asks its question, counts, and marks the rows instead of opening them', () => {
    const brush = renderBrush('restless');

    expect(
      screen.getByText(
        /Wer zeigt aktuell Unruhe\?|Who is currently restless\?/,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/^1 (Schüler|student)$/)).toBeInTheDocument();
    // No ticks while it is out: a press is a stroke.
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);

    const aylin = screen.getByRole('button', {
      name: /Unruhig bei Aylin|Restless for Aylin/i,
    });
    expect(aylin).toHaveAttribute('aria-pressed', 'true');
    const ben = screen.getByRole('button', {
      name: /Unruhig bei Ben|Restless for Ben/i,
    });
    expect(ben).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(ben);
    expect(brush.onStroke).toHaveBeenCalledWith('b', 'restless');
    expect(screen.getByTestId('inspected')).toHaveTextContent('none');
  });

  it('changes its marker in the palette and is put away with "Fertig"', () => {
    const brush = renderBrush('restless');
    const palette = screen.getByRole('toolbar');

    expect(
      within(palette).getByRole('button', { name: /Unruhig|Restless/i }),
    ).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(
      within(palette).getByRole('button', { name: /Linkshänder|Left-hand/i }),
    );
    expect(brush.onChoose).toHaveBeenCalledWith('leftHanded');

    fireEvent.click(screen.getByRole('button', { name: /^(Fertig|Done)$/ }));
    expect(brush.onEnd).toHaveBeenCalled();
  });
});

describe('below lg', () => {
  it('shows the icons of the seats, one per marker', () => {
    layout.lgUp = false;
    renderList();

    expect(badge('a', 'restless')).toHaveAttribute('role', 'img');
    expect(within(rowOf('a')).queryByText(/^(Unruhig|Restless)$/)).toBeNull();
  });

  // The row unfolds the same in words, so a finger held on a badge or a name
  // opens no card there; the press is the row's. A mouse still hovers.
  it('opens no card under a finger held on a badge or a name', () => {
    vi.useFakeTimers();
    layout.lgUp = false;
    renderList();

    for (const target of [
      badge('a', 'restless'),
      within(rowOf('a')).getByText('Aylin'),
    ]) {
      fireEvent.pointerDown(target, { pointerType: 'touch', clientX: 5 });
      act(() => vi.advanceTimersByTime(LONG_PRESS_MS));
      fireEvent.pointerUp(target, { pointerType: 'touch', clientX: 5 });
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    }
    fireEvent.click(badge('a', 'restless'));
    expect(screen.getByTestId('inspected')).toHaveTextContent('a');

    fireEvent.pointerOver(badge('a', 'restless'), { pointerType: 'mouse' });
    expect(screen.getByRole('tooltip')).toHaveTextContent(/Unruhig|Restless/);
  });

  it('unfolds a row in words and brings a partner into view', () => {
    layout.lgUp = false;
    renderList();
    const toggle = screen.getByRole('button', {
      name: /Merkmale von Aylin aufklappen|Show the attributes of Aylin/i,
    });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    // A student without markers has nothing to unfold.
    expect(
      screen.queryByRole('button', { name: /von Ben aufklappen|of Ben/i }),
    ).not.toBeInTheDocument();

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const details = document.getElementById(
      toggle.getAttribute('aria-controls') ?? '',
    ) as HTMLElement;
    expect(details).toHaveTextContent(/Unruhiges Verhalten|Restless behaviour/);
    expect(details).toHaveTextContent(
      /zählt beim Mischen gerade nicht|does not count in the mix/,
    );

    fireEvent.click(within(details).getByRole('button', { name: 'Cem' }));
    expect(rowOf('c')).toHaveClass('bg-(--data-social-surface)');

    fireEvent.click(
      within(details).getByRole('button', { name: /Bearbeiten|Edit/ }),
    );
    expect(screen.getByTestId('inspected')).toHaveTextContent('a');
  });
});
