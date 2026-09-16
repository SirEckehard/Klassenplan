// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@/i18n/i18n';
import MixCriteriaIcons from '../MixCriteriaIcons';
import SmartMixControls from '@/components/ui/controls/SmartMixControls';
import { createSuspendedWeights } from '@/hooks/ui/useMixCriteria';
import { resetDialogLayersForTests } from '@/hooks/ui/useDialogLayer';
import type { MixSettings, ScalarMixSettingKey, Student } from '@/types';
import {
  DEFAULT_MIX_WEIGHTS,
  LOCAL_STORAGE_KEYS,
  SCALAR_MIX_SETTING_KEYS,
  neutralSettings,
  normalizeMixSettings,
} from '@/utils';

// Every criterion has data, so every criterion is on the rail.
const students: Student[] = [
  {
    id: '1',
    name: 'Student 1',
    gender: 'boy',
    height: 'small',
    restless: true,
    shy: true,
    concentrationIssues: true,
    needsFrontSeat: true,
    performanceStrong: true,
    wishPartnerId: '2',
    avoidPartnerId: '3',
    prefersWindow: true,
  },
  {
    id: '2',
    name: 'Student 2',
    gender: 'girl',
    height: 'tall',
    restless: true,
    shy: false,
    concentrationIssues: true,
    needsFrontSeat: false,
    performanceWeak: true,
    prefersDoor: true,
  },
  {
    id: '3',
    name: 'Student 3',
    gender: 'diverse',
    restless: false,
    shy: false,
    concentrationIssues: false,
    needsFrontSeat: false,
  },
];

function Harness({
  initial = {},
  withExpandedPanel = false,
}: {
  initial?: Partial<MixSettings>;
  withExpandedPanel?: boolean;
}) {
  const [settings, setSettings] = React.useState(() =>
    normalizeMixSettings(initial, neutralSettings),
  );
  const [suspendedWeights] = React.useState(createSuspendedWeights);

  return (
    <>
      <MixCriteriaIcons
        settings={settings}
        setMixSettings={setSettings}
        students={students}
        suspendedWeights={suspendedWeights}
      />
      {withExpandedPanel && (
        <SmartMixControls
          settings={settings}
          setMixSettings={setSettings}
          students={students}
          suspendedWeights={suspendedWeights}
        />
      )}
      {SCALAR_MIX_SETTING_KEYS.map((key) => (
        <span key={key} hidden data-testid={key}>
          {settings[key]}
        </span>
      ))}
    </>
  );
}

const weightOf = (key: ScalarMixSettingKey) =>
  Number(screen.getByTestId(key).textContent);

const restlessButton = () =>
  screen.getByRole('button', { name: /^(Unruhe|Restlessness)\b/ });

const allCriteriaButton = () =>
  screen.getByRole('button', { name: /^(Alle Kriterien|All criteria)$/ });

describe('MixCriteriaIcons', () => {
  beforeEach(() => {
    localStorage.clear();
    // Most tests are about something else than the one-time hint.
    localStorage.setItem(LOCAL_STORAGE_KEYS.mixWeightHintSeen, 'true');
    resetDialogLayersForTests();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('switches a criterion on at its recommended weight and names the weight', () => {
    render(<Harness />);

    expect(restlessButton()).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(restlessButton());

    expect(weightOf('avoidRestlessTogether')).toBe(
      DEFAULT_MIX_WEIGHTS.avoidRestlessTogether,
    );
    expect(restlessButton()).toHaveAttribute('aria-pressed', 'true');
    expect(restlessButton()).toHaveAccessibleName(
      /Unruhe, Wichtigkeit 5 von 10|Restlessness, importance 5 of 10/,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('sets the weight in a flyout behind a right click; Escape closes it', () => {
    render(<Harness initial={{ avoidRestlessTogether: 5 }} />);

    fireEvent.contextMenu(restlessButton());

    const dialog = screen.getByRole('dialog', { name: /Unruhe|Restlessness/ });
    const slider = screen.getByRole('slider', {
      name: /Wichtigkeit: Unruhe|Importance: Restlessness/,
    });
    expect(dialog).toContainElement(slider);
    expect(slider).toHaveFocus();

    fireEvent.change(slider, { target: { value: '8' } });
    expect(weightOf('avoidRestlessTogether')).toBe(8);
    expect(dialog).toHaveTextContent('8/10');

    // Pressing the button itself toggles and leaves the flyout open.
    fireEvent.click(restlessButton());
    expect(weightOf('avoidRestlessTogether')).toBe(0);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(restlessButton()).toHaveFocus();
  });

  it('opens from the keyboard with the right arrow and hands Tab back', () => {
    render(<Harness />);

    restlessButton().focus();
    fireEvent.keyDown(restlessButton(), { key: 'ArrowRight' });

    const slider = screen.getByRole('slider');
    expect(slider).toHaveFocus();

    fireEvent.keyDown(slider, { key: 'Tab' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(restlessButton()).toHaveFocus();
  });

  it('opens on a long press without also switching the criterion', () => {
    vi.useFakeTimers();
    render(<Harness />);

    fireEvent.pointerDown(restlessButton(), { pointerType: 'touch' });
    act(() => vi.advanceTimersByTime(500));
    fireEvent.pointerUp(restlessButton(), { pointerType: 'touch' });
    fireEvent.click(restlessButton());

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(weightOf('avoidRestlessTogether')).toBe(0);
  });

  it('closes when something else is pressed', () => {
    render(<Harness />);

    fireEvent.contextMenu(restlessButton());
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows the flyout by itself once, on the first switch-on', () => {
    localStorage.removeItem(LOCAL_STORAGE_KEYS.mixWeightHintSeen);
    render(<Harness />);

    fireEvent.click(restlessButton());

    const dialog = screen.getByRole('dialog', { name: /Unruhe|Restlessness/ });
    expect(dialog).toHaveTextContent(
      /Lange drücken oder Rechtsklick|long press or a right click/,
    );
    // It explains; it does not take the focus away from the rail.
    expect(screen.getByRole('slider')).not.toHaveFocus();
    expect(localStorage.getItem(LOCAL_STORAGE_KEYS.mixWeightHintSeen)).toBe(
      'true',
    );

    fireEvent.pointerDown(document.body);
    fireEvent.click(
      screen.getByRole('button', { name: /^(Schüchternheit|Shyness)$/ }),
    );
    expect(weightOf('avoidShyAlone')).toBe(DEFAULT_MIX_WEIGHTS.avoidShyAlone);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('keeps the weights on "all off" and brings them back on "all on"', () => {
    render(
      <Harness initial={{ avoidRestlessTogether: 9, avoidShyAlone: 4 }} />,
    );

    expect(allCriteriaButton()).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(allCriteriaButton());

    expect(weightOf('avoidRestlessTogether')).toBe(0);
    expect(weightOf('avoidShyAlone')).toBe(0);
    expect(allCriteriaButton()).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(allCriteriaButton());

    expect(weightOf('avoidRestlessTogether')).toBe(9);
    expect(weightOf('avoidShyAlone')).toBe(4);
    // Criteria that were off before stay off.
    expect(weightOf('considerWishPartners')).toBe(0);
  });

  it('uses the recommended weights on "all on" when nothing was kept', () => {
    render(<Harness />);

    fireEvent.click(allCriteriaButton());

    expect(weightOf('considerWishPartners')).toBe(
      DEFAULT_MIX_WEIGHTS.considerWishPartners,
    );
    expect(weightOf('peerTutoring')).toBe(DEFAULT_MIX_WEIGHTS.peerTutoring);
    expect(weightOf('homogeneousPerformanceGroups')).toBe(0);
  });

  it('keeps the default weights behind a right click on "all criteria"', () => {
    render(<Harness initial={{ avoidRestlessTogether: 9 }} />);

    fireEvent.contextMenu(allCriteriaButton());
    fireEvent.click(
      screen.getByRole('button', { name: /^(Standardwerte|Default weights)$/ }),
    );

    expect(weightOf('avoidRestlessTogether')).toBe(
      DEFAULT_MIX_WEIGHTS.avoidRestlessTogether,
    );
    expect(weightOf('considerWishPartners')).toBe(
      DEFAULT_MIX_WEIGHTS.considerWishPartners,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(allCriteriaButton()).toHaveFocus();
  });

  it('brings back what the expanded panel switched off', () => {
    render(
      <Harness initial={{ avoidRestlessTogether: 7 }} withExpandedPanel />,
    );

    fireEvent.click(
      screen.getByRole('switch', { name: /Alle Kriterien|All criteria/ }),
    );
    expect(weightOf('avoidRestlessTogether')).toBe(0);

    fireEvent.click(allCriteriaButton());
    expect(weightOf('avoidRestlessTogether')).toBe(7);
  });
});
