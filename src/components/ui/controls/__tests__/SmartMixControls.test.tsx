// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import '@/i18n/i18n';
import SmartMixControls, { MixCriteriaSwitch } from '../SmartMixControls';
import { createSuspendedWeights } from '@/hooks/ui/useMixCriteria';
import { useAutoMixSettings } from '@/hooks/domains/useAutoMixSettings';
import { createMockStudent } from '@/__tests__/utils';
import type { MixSettings, ScalarMixSettingKey, Student } from '@/types';
import type { CriterionFulfillment } from '@/utils/algorithm/seatingStatistics';
import {
  DEFAULT_MIX_WEIGHTS,
  MIX_IMPORTANCE_WEIGHTS,
  SCALAR_MIX_SETTING_KEYS,
  neutralSettings,
  normalizeMixSettings,
  withoutUnavailableWeights,
} from '@/utils';

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
  fulfillment,
  highlight,
}: {
  initial?: Partial<MixSettings>;
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
      {/* The inspector puts the switch for all criteria into its header. */}
      <MixCriteriaSwitch {...controls} />
      <SmartMixControls {...controls} />
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

/** One of the four named levels inside a criterion's card. */
const levelChip = (label: RegExp, level: RegExp) =>
  screen.getByRole('button', {
    name: new RegExp(`^(${label.source}): (${level.source})$`),
  });

const restlessLevel = (level: RegExp) =>
  levelChip(/Unruhe|Restlessness/, level);

const OFF = /Aus|Off/;
const IMPORTANT = /Wichtig|Important/;
const ESSENTIAL = /Sehr wichtig|Very important/;

const allCriteriaSwitch = () =>
  screen.getByRole('switch', { name: /Alle Kriterien|All criteria/ });

beforeEach(() => {
  localStorage.clear();
});

describe('SmartMixControls — comfortable density', () => {
  it('shows the criteria in their categories, each with its explanation', () => {
    render(<Harness initial={DEFAULT_MIX_WEIGHTS} />);

    // The class list's families in its order; language drops out because
    // nobody in the harness has a language level.
    const headings = screen
      .getAllByRole('separator')
      .map((separator) => separator.getAttribute('aria-label'))
      .filter(Boolean);
    expect(headings).toHaveLength(5);
    [
      /^(Person)$/,
      /^(Lernen|Learning)$/,
      /^(Verhalten|Behaviour)$/,
      /^(Soziales|Social)$/,
      /^(Platz & Raum|Seat & room)$/,
    ].forEach((pattern, index) => expect(headings[index]).toMatch(pattern));
    expect(
      screen.getByText(
        /Schüler mit Unruheverhalten trennen|Separate students showing restless behavior/,
      ),
    ).toBeInTheDocument();
  });

  it('sets a criterion to the weight behind the level that is pressed', () => {
    render(<Harness />);

    expect(restlessLevel(OFF)).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(restlessLevel(IMPORTANT));
    expect(weightOf('avoidRestlessTogether')).toBe(
      MIX_IMPORTANCE_WEIGHTS.important,
    );
    expect(restlessLevel(IMPORTANT)).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(restlessLevel(ESSENTIAL));
    expect(weightOf('avoidRestlessTogether')).toBe(
      MIX_IMPORTANCE_WEIGHTS.essential,
    );

    fireEvent.click(restlessLevel(OFF));
    expect(weightOf('avoidRestlessTogether')).toBe(0);
  });

  it("keeps a recipe's weight when its own level is pressed again", () => {
    render(<Harness initial={{ avoidRestlessTogether: 6 }} />);

    // 6 reads as "important" — pressing that level must not reset it to 5.
    expect(restlessLevel(IMPORTANT)).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(restlessLevel(IMPORTANT));
    expect(weightOf('avoidRestlessTogether')).toBe(6);
  });

  // The fine tuning is gone: four words, and no weights from 0 to 10.
  it('sets a criterion in words only', () => {
    render(<Harness initial={{ avoidRestlessTogether: 5 }} />);

    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Feinjustierung|Fine tuning/ }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/\/10/)).not.toBeInTheDocument();
  });

  // The inspector's heading names the panel; the panel does not repeat it.
  it('leaves the heading and its explanation to the inspector', () => {
    render(<Harness />);

    expect(
      screen.queryByText(/^(Mischkriterien|Mix Criteria)$/),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Wie wichtig ist dir|How important is each/),
    ).not.toBeInTheDocument();
  });

  it('activating peerTutoring deactivates homogeneousPerformanceGroups', () => {
    render(<Harness initial={{ homogeneousPerformanceGroups: 5 }} />);

    fireEvent.click(
      levelChip(/Fördern \(heterogen\)|Support \(heterogeneous\)/, ESSENTIAL),
    );

    expect(weightOf('peerTutoring')).toBe(MIX_IMPORTANCE_WEIGHTS.essential);
    expect(weightOf('homogeneousPerformanceGroups')).toBe(0);
  });

  it('activating homogeneousPerformanceGroups deactivates peerTutoring', () => {
    render(<Harness initial={{ peerTutoring: 3 }} />);

    fireEvent.click(
      levelChip(/Fördern \(homogen\)|Support \(homogeneous\)/, IMPORTANT),
    );

    expect(weightOf('peerTutoring')).toBe(0);
    expect(weightOf('homogeneousPerformanceGroups')).toBe(
      MIX_IMPORTANCE_WEIGHTS.important,
    );
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
      screen.queryByText(/Mischen ist zufällig!|mixing is purely random!/i),
    ).not.toBeInTheDocument();
    fireEvent.click(allCriteriaSwitch());

    expect(weightOf('peerTutoring')).toBe(0);
    expect(weightOf('homogeneousPerformanceGroups')).toBe(0);
    expect(
      screen.getByText(/Mischen ist zufällig!|mixing is purely random!/i),
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

  // The header carries only the switch; the recommended recipe is the way
  // back to the default weights.
  it('has no restore button of its own beside the recipes', () => {
    render(<Harness initial={{ avoidRestlessTogether: 9 }} />);

    expect(
      screen.queryByRole('button', {
        name: /Standardwerte|Default weights/,
      }),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: /Kriterien aktiv|criteria active/ }),
    );
    fireEvent.click(
      screen.getByRole('button', {
        name: /Empfohlene Mischung|Recommended mix/,
      }),
    );

    expect(weightOf('avoidRestlessTogether')).toBe(
      DEFAULT_MIX_WEIGHTS.avoidRestlessTogether,
    );
  });
});

describe('SmartMixControls — recipes', () => {
  const recipeButton = () =>
    screen.getByRole('button', {
      name: new RegExp('(Kriterien aktiv|criteria active)'),
    });

  const chooseRecipe = (name: RegExp) => {
    fireEvent.click(recipeButton());
    fireEvent.click(screen.getByRole('button', { name }));
  };

  it('sets every weight at once and names the recipe it is on', () => {
    render(<Harness />);

    // Nothing is set yet, so the mix belongs to nobody.
    expect(recipeButton()).toHaveTextContent(/Eigene Mischung|Your own mix/);

    chooseRecipe(/Klassenarbeit|Written test/);

    expect(weightOf('avoidConflictPartners')).toBe(9);
    expect(weightOf('avoidRestlessTogether')).toBe(9);
    // A written test is the one lesson where a wish is the wrong thing.
    expect(weightOf('considerWishPartners')).toBe(0);
    expect(recipeButton()).toHaveTextContent(/Klassenarbeit|Written test/);
  });

  it('lets go of the recipe as soon as a criterion is moved', () => {
    render(<Harness />);

    chooseRecipe(/Ruhige Arbeitsphase|Quiet work/);
    expect(recipeButton()).toHaveTextContent(/Ruhige Arbeitsphase|Quiet work/);

    fireEvent.click(restlessLevel(OFF));

    expect(recipeButton()).toHaveTextContent(/Eigene Mischung|Your own mix/);
  });

  it('counts only the criteria this class has data for', () => {
    render(<Harness />);

    chooseRecipe(/Empfohlene Mischung|Recommended mix/);

    // Language levels and social roles are missing from this class, so its
    // panel shows 13 criteria; the homogeneous groups stay off beside the
    // heterogeneous ones (decision 0013), which leaves 12 of them active.
    expect(recipeButton()).toHaveTextContent(/12 (von|of) 13/);
  });
});

describe('SmartMixControls — distractibility', () => {
  // With one distractible student only "away from restless neighbours" has
  // data, and the automatic weights clear the other of the two.
  const initial = {
    avoidConcentrationTogether: 0,
    avoidConcentrationNearRestless: 6,
  };
  const distractibilityLevel = (level: RegExp) =>
    levelChip(/Ablenkbarkeit|Distractibility/, level);

  it('shows the weight that acts and switches both off', () => {
    render(<Harness initial={initial} />);

    expect(distractibilityLevel(IMPORTANT)).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    fireEvent.click(distractibilityLevel(OFF));
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
    expect(distractibilityLevel(OFF)).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(distractibilityLevel(OFF));
    expect(distractibilityLevel(OFF)).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(distractibilityLevel(IMPORTANT));
    expect(distractibilityLevel(IMPORTANT)).toHaveAttribute(
      'aria-pressed',
      'true',
    );
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

  it('shows the value beside the levels, and the total only once', () => {
    render(
      <Harness
        initial={{ avoidRestlessTogether: 5 }}
        fulfillment={fulfillmentFor(78)}
        highlight={{ onHighlightToggle: vi.fn() }}
      />,
    );

    expect(pinButton()).toHaveTextContent(/78\s?%/);
    // The total is the inspector's button above the panel, not a line in it.
    expect(
      screen.queryByText(/Erfüllung gesamt|Overall fulfilment/),
    ).not.toBeInTheDocument();
    // The value sits beside the levels that caused it, and changes nothing.
    fireEvent.click(restlessLevel(OFF));
    expect(weightOf('avoidRestlessTogether')).toBe(0);
  });

  it('marks the seats only while the pointer rests on the bar, and pins them on a press', () => {
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

    // The card around the bar is passed through on the way to the levels;
    // it marks nothing.
    const card = restlessLevel(OFF).closest(
      '[data-criterion="avoidRestlessTogether"]',
    ) as HTMLElement;
    fireEvent.mouseOver(card);
    fireEvent.mouseOver(restlessLevel(IMPORTANT));
    fireEvent.focus(restlessLevel(IMPORTANT));
    expect(onHighlightHover).not.toHaveBeenCalled();

    fireEvent.mouseOver(pinButton());
    expect(onHighlightHover).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'avoidRestlessTogether' }),
    );

    fireEvent.mouseOut(pinButton());
    expect(onHighlightLeave).toHaveBeenCalled();

    fireEvent.click(pinButton());
    expect(onHighlightToggle).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'avoidRestlessTogether' }),
    );
    // Marking is the badge's job — the weight stays where it was.
    expect(weightOf('avoidRestlessTogether')).toBe(5);
  });

  it('speaks in per cent even where the cases could be counted', () => {
    render(
      <Harness
        initial={{ avoidRestlessTogether: 5 }}
        fulfillment={[
          {
            key: 'avoidRestlessTogether',
            label: 'Unruhe',
            percentage: 75,
            weight: 5,
            active: true,
            count: { fulfilled: 3, total: 4 },
          },
        ]}
        highlight={{ onHighlightToggle: vi.fn() }}
      />,
    );

    const meter = screen.getByRole('button', {
      name: /^(Erfüllung|Fulfilment) (Unruhe|Restlessness): 75\s?%/,
    });
    // One scale for every criterion and for the plan as a whole.
    expect(meter).toHaveTextContent(/75\s?%/);
    expect(meter).not.toHaveTextContent('3/4');
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

  it('leaves the criteria untouched before the plan has been mixed', () => {
    render(<Harness initial={{ avoidRestlessTogether: 5 }} />);

    expect(
      screen.queryByRole('button', { name: /^(Erfüllung|Fulfilment) / }),
    ).not.toBeInTheDocument();
    expect(restlessLevel(IMPORTANT)).toHaveAttribute('aria-pressed', 'true');
  });
});
