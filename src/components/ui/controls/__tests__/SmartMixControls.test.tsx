// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@/i18n/i18n';
import SmartMixControls from '../SmartMixControls';
import { createSuspendedWeights } from '@/hooks/ui/useMixCriteria';
import { useAutoMixSettings } from '@/hooks/domains/useAutoMixSettings';
import { createMockStudent } from '@/__tests__/utils';
import { resetDialogLayersForTests } from '@/hooks/ui/useDialogLayer';
import type { MixSettings, ScalarMixSettingKey, Student } from '@/types';
import type { CriterionFulfillment } from '@/utils/algorithm/seatingStatistics';
import {
  DEFAULT_MIX_WEIGHTS,
  LOCAL_STORAGE_KEYS,
  SCALAR_MIX_SETTING_KEYS,
  neutralSettings,
  normalizeMixSettings,
  withoutUnavailableWeights,
} from '@/utils';

type Density = React.ComponentProps<typeof SmartMixControls>['density'];

// Every criterion but language levels and social roles has data.
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

/** What the editor hands down once the plan has been mixed. */
type HighlightProps = Partial<{
  onHighlightHover: (criterion: CriterionFulfillment) => void;
  onHighlightLeave: () => void;
  onHighlightToggle: (criterion: CriterionFulfillment) => void;
  activeHighlightKey: CriterionFulfillment['key'] | null;
  activeHighlightMode: 'hover' | 'persistent' | null;
}>;

function Harness({
  initial = {},
  density,
  withCompactRow = false,
  fulfillment,
  highlight,
}: {
  initial?: Partial<MixSettings>;
  density?: Density;
  /** A second control in the compact density, as under the canvas on a phone. */
  withCompactRow?: boolean;
  fulfillment?: CriterionFulfillment[];
  highlight?: HighlightProps;
}) {
  const [settings, setSettings] = React.useState(() =>
    normalizeMixSettings(initial, neutralSettings),
  );
  const [suspendedWeights] = React.useState(createSuspendedWeights);
  const controls = {
    settings,
    setMixSettings: setSettings,
    students,
    suspendedWeights,
    fulfillment,
    ...highlight,
  };

  return (
    <>
      <SmartMixControls {...controls} density={density} />
      {withCompactRow && (
        <SmartMixControls {...controls} density="compact" direction="row" />
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

// The card's name starts with the label; the round button's is the label,
// followed by the weight when it is on.
const restlessButton = () =>
  screen.getByRole('button', { name: /^(Unruhe|Restlessness)\b/ });

const allCriteriaButton = () =>
  screen.getByRole('button', { name: /^(Alle Kriterien|All criteria)$/ });

const allCriteriaSwitch = () =>
  screen.getByRole('switch', { name: /Alle Kriterien|All criteria/ });

const sliderFor = (label: RegExp) =>
  screen.getByRole('slider', {
    name: new RegExp(`(Wichtigkeit|Importance): (${label.source})`),
  });

beforeEach(() => {
  localStorage.clear();
  // Most tests are about something else than the one-time hint.
  localStorage.setItem(LOCAL_STORAGE_KEYS.mixWeightHintSeen, 'true');
  resetDialogLayersForTests();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('SmartMixControls — comfortable density', () => {
  it('shows the criteria in their categories, each with its explanation', () => {
    render(<Harness initial={DEFAULT_MIX_WEIGHTS} />);

    expect(screen.getByText(/Identität|Identity/)).toBeInTheDocument();
    expect(screen.getByText(/Fähigkeiten|Abilities/)).toBeInTheDocument();
    // Anchored: "Verhalten" also occurs inside a criterion description.
    expect(screen.getByText(/^(Verhalten|Behavior)$/)).toBeInTheDocument();
    expect(screen.getByText(/Soziales|Social/)).toBeInTheDocument();
    expect(
      screen.getByText(
        /Schüler mit Unruheverhalten trennen|Separate students showing restless behavior/,
      ),
    ).toBeInTheDocument();
  });

  it('switches a criterion on at its recommended weight with a press on its card', () => {
    render(<Harness />);

    fireEvent.click(restlessButton());
    expect(weightOf('avoidRestlessTogether')).toBe(
      DEFAULT_MIX_WEIGHTS.avoidRestlessTogether,
    );

    fireEvent.click(restlessButton());
    expect(weightOf('avoidRestlessTogether')).toBe(0);
  });

  it('sets the weight with the slider without also switching the card', () => {
    render(<Harness initial={{ avoidRestlessTogether: 5 }} />);

    const slider = sliderFor(/Unruhe|Restlessness/);
    fireEvent.click(slider);
    expect(weightOf('avoidRestlessTogether')).toBe(5);

    fireEvent.change(slider, { target: { value: '8' } });
    expect(weightOf('avoidRestlessTogether')).toBe(8);
  });

  it('activating peerTutoring deactivates homogeneousPerformanceGroups', () => {
    render(<Harness initial={{ homogeneousPerformanceGroups: 5 }} />);

    fireEvent.change(
      sliderFor(/Fördern \(heterogen\)|Support \(heterogeneous\)/),
      { target: { value: '8' } },
    );

    expect(weightOf('peerTutoring')).toBe(8);
    expect(weightOf('homogeneousPerformanceGroups')).toBe(0);
  });

  it('activating homogeneousPerformanceGroups deactivates peerTutoring', () => {
    render(<Harness initial={{ peerTutoring: 3 }} />);

    fireEvent.change(sliderFor(/Fördern \(homogen\)|Support \(homogeneous\)/), {
      target: { value: '6' },
    });

    expect(weightOf('peerTutoring')).toBe(0);
    expect(weightOf('homogeneousPerformanceGroups')).toBe(6);
  });

  it('master switch enables criteria and resolves peer/homo exclusivity', () => {
    render(<Harness />);

    fireEvent.click(allCriteriaSwitch());

    // Turning all criteria on must never leave the mutually exclusive
    // peer/homogeneous pair both active; the deterministic winner keeps its
    // default weight while the other stays at 0.
    expect(weightOf('peerTutoring')).toBe(DEFAULT_MIX_WEIGHTS.peerTutoring);
    expect(weightOf('homogeneousPerformanceGroups')).toBe(0);
  });

  it('master switch disables all criteria and shows that mixing is random', () => {
    render(<Harness initial={{ peerTutoring: 4 }} />);

    expect(
      screen.queryByText(/Mischen ist zufällig!|Shuffling is random!/i),
    ).not.toBeInTheDocument();
    fireEvent.click(allCriteriaSwitch());

    expect(weightOf('peerTutoring')).toBe(0);
    expect(weightOf('homogeneousPerformanceGroups')).toBe(0);
    expect(
      screen.getByText(/Mischen ist zufällig!|Shuffling is random!/i),
    ).toBeInTheDocument();
  });

  it('master switch brings back the weights it switched off', () => {
    render(<Harness initial={{ peerTutoring: 7 }} />);

    fireEvent.click(allCriteriaSwitch());
    expect(weightOf('peerTutoring')).toBe(0);

    fireEvent.click(allCriteriaSwitch());
    // The teacher's 7, not the recommended 3.
    expect(weightOf('peerTutoring')).toBe(7);
  });

  it('restore button sets the recommended weights', () => {
    render(<Harness initial={{ homogeneousPerformanceGroups: 9 }} />);

    fireEvent.click(
      screen.getByRole('button', {
        name: /Standardwerte wiederherstellen|Restore default weights/,
      }),
    );

    // The recommended weight, still on the criterion that was chosen.
    expect(weightOf('homogeneousPerformanceGroups')).toBe(
      DEFAULT_MIX_WEIGHTS.homogeneousPerformanceGroups,
    );
    expect(weightOf('peerTutoring')).toBe(0);
  });
});

describe('SmartMixControls — compact density', () => {
  it('switches a criterion on at its recommended weight and names the weight', () => {
    render(<Harness density="compact" />);

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
    render(
      <Harness density="compact" initial={{ avoidRestlessTogether: 5 }} />,
    );

    fireEvent.contextMenu(restlessButton());

    const dialog = screen.getByRole('dialog', { name: /Unruhe|Restlessness/ });
    const slider = sliderFor(/Unruhe|Restlessness/);
    expect(dialog).toContainElement(slider);
    expect(slider).toHaveFocus();
    // The same explanation the card shows.
    expect(dialog).toHaveTextContent(
      /Schüler mit Unruheverhalten trennen|Separate students showing restless behavior/,
    );

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
    render(<Harness density="compact" />);

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
    render(<Harness density="compact" />);

    fireEvent.pointerDown(restlessButton(), { pointerType: 'touch' });
    act(() => vi.advanceTimersByTime(500));
    fireEvent.pointerUp(restlessButton(), { pointerType: 'touch' });
    fireEvent.click(restlessButton());

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(weightOf('avoidRestlessTogether')).toBe(0);
  });

  it('closes when something else is pressed', () => {
    render(<Harness density="compact" />);

    fireEvent.contextMenu(restlessButton());
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows the flyout by itself once, on the first switch-on', () => {
    localStorage.removeItem(LOCAL_STORAGE_KEYS.mixWeightHintSeen);
    render(<Harness density="compact" />);

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
      <Harness
        density="compact"
        initial={{ avoidRestlessTogether: 9, avoidShyAlone: 4 }}
      />,
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
    render(<Harness density="compact" />);

    fireEvent.click(allCriteriaButton());

    expect(weightOf('considerWishPartners')).toBe(
      DEFAULT_MIX_WEIGHTS.considerWishPartners,
    );
    expect(weightOf('peerTutoring')).toBe(DEFAULT_MIX_WEIGHTS.peerTutoring);
    expect(weightOf('homogeneousPerformanceGroups')).toBe(0);
  });

  it('keeps the default weights behind a right click on "all criteria"', () => {
    render(
      <Harness density="compact" initial={{ avoidRestlessTogether: 9 }} />,
    );

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
});

describe('SmartMixControls — distractibility', () => {
  // With one distractible student only "away from restless neighbours" has
  // data, and the automatic weights clear the other of the two.
  const initial = {
    avoidConcentrationTogether: 0,
    avoidConcentrationNearRestless: 6,
  };
  const distractibilityButton = () =>
    screen.getByRole('button', { name: /^(Ablenkbarkeit|Distractibility)\b/ });

  it('shows the weight that acts and switches both off', () => {
    render(<Harness density="compact" initial={initial} />);

    expect(distractibilityButton()).toHaveAttribute('aria-pressed', 'true');
    expect(distractibilityButton()).toHaveAccessibleName(
      /Wichtigkeit 6 von 10|importance 6 of 10/,
    );

    fireEvent.click(distractibilityButton());
    expect(weightOf('avoidConcentrationTogether')).toBe(0);
    expect(weightOf('avoidConcentrationNearRestless')).toBe(0);
  });

  it('stays on for one distractible student beside the automatic weights', () => {
    const oneDistractible = [
      createMockStudent({ concentrationIssues: true }),
      createMockStudent({ restless: true }),
    ];
    type StepProps = {
      settings: MixSettings;
      setMixSettings: React.Dispatch<React.SetStateAction<MixSettings>>;
    };
    // The plan step: clears hidden weights, as `SeatingPlanEditorView` does.
    function PlanStep({ settings, setMixSettings }: StepProps) {
      React.useEffect(() => {
        setMixSettings((prev) =>
          withoutUnavailableWeights(prev, oneDistractible),
        );
      }, [settings, setMixSettings]);

      return (
        <SmartMixControls
          settings={settings}
          setMixSettings={setMixSettings}
          students={oneDistractible}
          density="compact"
        />
      );
    }
    // The class state with its automatic weights, as `useSeatingState` holds it.
    function ClassHarness() {
      const [settings, setSettings] = React.useState(DEFAULT_MIX_WEIGHTS);
      useAutoMixSettings(oneDistractible, settings, setSettings, 'class');

      return (
        <>
          <PlanStep settings={settings} setMixSettings={setSettings} />
          <span hidden data-testid="avoidConcentrationNearRestless">
            {settings.avoidConcentrationNearRestless}
          </span>
        </>
      );
    }
    render(<ClassHarness />);

    expect(weightOf('avoidConcentrationNearRestless')).toBe(
      DEFAULT_MIX_WEIGHTS.avoidConcentrationNearRestless,
    );
    expect(distractibilityButton()).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(distractibilityButton());
    expect(distractibilityButton()).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(distractibilityButton());
    expect(distractibilityButton()).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('SmartMixControls — switching densities', () => {
  it('brings back in one density what the other switched off', () => {
    render(<Harness initial={{ avoidRestlessTogether: 7 }} withCompactRow />);

    fireEvent.click(allCriteriaSwitch());
    expect(weightOf('avoidRestlessTogether')).toBe(0);

    fireEvent.click(allCriteriaButton());
    expect(weightOf('avoidRestlessTogether')).toBe(7);
  });

  it('closes an open flyout when the sidebar widens', () => {
    const { rerender } = render(<Harness density="compact" />);

    fireEvent.contextMenu(restlessButton());
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    rerender(<Harness density="comfortable" />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Narrowing again does not bring it back.
    rerender(<Harness density="compact" />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('SmartMixControls — criteria fulfilment', () => {
  const fulfillmentFor = (percentage: number): CriterionFulfillment[] => [
    {
      key: 'avoidRestlessTogether',
      // The algorithm's own German label; the badge has to translate it itself.
      label: 'Unruhe',
      percentage,
      weight: 5,
      active: true,
    },
  ];

  const pinButton = () =>
    screen.getByRole('button', {
      name: /^(Erfüllung|Fulfilment) (Unruhe|Restlessness): 78\s?%/,
    });

  it('shows the value beside the weight and the overall score', () => {
    render(
      <Harness
        initial={{ avoidRestlessTogether: 5 }}
        fulfillment={fulfillmentFor(78)}
        highlight={{ onHighlightToggle: vi.fn() }}
      />,
    );

    expect(pinButton()).toHaveTextContent(/78\s?%/);
    expect(
      screen.getByText(/Erfüllung gesamt: 78\s?%|Overall fulfilment: 78%/),
    ).toBeInTheDocument();
    // The card keeps its own press: switching the criterion off, not marking.
    fireEvent.click(restlessButton());
    expect(weightOf('avoidRestlessTogether')).toBe(0);
  });

  it('marks the seats while the pointer rests on the card and pins them on a press', () => {
    const onHighlightHover = vi.fn();
    const onHighlightLeave = vi.fn();
    const onHighlightToggle = vi.fn();
    render(
      <Harness
        initial={{ avoidRestlessTogether: 5 }}
        fulfillment={fulfillmentFor(78)}
        highlight={{ onHighlightHover, onHighlightLeave, onHighlightToggle }}
      />,
    );

    fireEvent.mouseOver(restlessButton());
    expect(onHighlightHover).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'avoidRestlessTogether' }),
    );

    fireEvent.mouseOut(restlessButton());
    expect(onHighlightLeave).toHaveBeenCalled();

    // A button inside the card's button would fold its text into the card's
    // name and swallow the press meant for the badge.
    expect(restlessButton()).not.toContainElement(pinButton());

    fireEvent.click(pinButton());
    expect(onHighlightToggle).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'avoidRestlessTogether' }),
    );
    // Marking is the badge's job — the weight stays where it was.
    expect(weightOf('avoidRestlessTogether')).toBe(5);
  });

  it('names the badge as pressed while its marking is the pinned one', () => {
    render(
      <Harness
        initial={{ avoidRestlessTogether: 5 }}
        fulfillment={fulfillmentFor(78)}
        highlight={{
          onHighlightToggle: vi.fn(),
          activeHighlightKey: 'avoidRestlessTogether',
          activeHighlightMode: 'persistent',
        }}
      />,
    );

    const badge = screen.getByRole('button', {
      name: /^(Erfüllung|Fulfilment) (Unruhe|Restlessness): 78\s?%/,
    });
    expect(badge).toHaveAttribute('aria-pressed', 'true');
    expect(badge).toHaveAccessibleName(/Markierung aufheben|clear the marking/);
  });

  it('is plain text without a handler, as in the phone sheet', () => {
    render(
      <Harness
        initial={{ avoidRestlessTogether: 5 }}
        fulfillment={fulfillmentFor(78)}
      />,
    );

    expect(
      screen.queryByRole('button', { name: /markieren|mark the seats/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(
        /^(Erfüllung|Fulfilment) (Unruhe|Restlessness): 78\s?%$/,
      ),
    ).toBeInTheDocument();
  });

  it('marks from the rail on focus and pins from the flyout', () => {
    const onHighlightHover = vi.fn();
    const onHighlightToggle = vi.fn();
    render(
      <Harness
        density="compact"
        initial={{ avoidRestlessTogether: 5 }}
        fulfillment={fulfillmentFor(78)}
        highlight={{ onHighlightHover, onHighlightToggle }}
      />,
    );

    // The rail has no room for the number, so the button's name carries it.
    expect(restlessButton()).toHaveAccessibleName(
      /zu 78 % erfüllt|78% fulfilled/,
    );

    restlessButton().focus();
    expect(onHighlightHover).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'avoidRestlessTogether' }),
    );

    fireEvent.contextMenu(restlessButton());
    const dialog = screen.getByRole('dialog', { name: /Unruhe|Restlessness/ });
    const badge = screen.getByRole('button', {
      name: /^(Erfüllung|Fulfilment) (Unruhe|Restlessness): 78\s?%/,
    });
    expect(dialog).toContainElement(badge);

    fireEvent.click(badge);
    expect(onHighlightToggle).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'avoidRestlessTogether' }),
    );
  });

  it('leaves the criteria untouched before the plan has been mixed', () => {
    render(<Harness initial={{ avoidRestlessTogether: 5 }} />);

    expect(
      screen.queryByText(/Erfüllung gesamt|Overall fulfilment/),
    ).not.toBeInTheDocument();
    expect(restlessButton()).toBeInTheDocument();
  });
});
