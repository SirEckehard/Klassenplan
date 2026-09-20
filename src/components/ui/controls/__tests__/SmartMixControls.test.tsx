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
  MIX_IMPORTANCE_WEIGHTS,
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

// The rail button's name is the label, followed by the weight when it is on;
// the level chips of a card carry "label: level" and are matched separately.
const restlessButton = () =>
  screen.getByRole('button', { name: /^(Unruhe|Restlessness)(,|$)/ });

/** One of the four named levels inside a criterion's card or flyout. */
const levelChip = (label: RegExp, level: RegExp) =>
  screen.getByRole('button', {
    name: new RegExp(`^(${label.source}): (${level.source})$`),
  });

const restlessLevel = (level: RegExp) =>
  levelChip(/Unruhe|Restlessness/, level);

const OFF = /Aus|Off/;
const IMPORTANT = /Wichtig|Important/;
const ESSENTIAL = /Sehr wichtig|Very important/;

/** Brings the weights from 0 to 10 back into view, as the teacher would. */
const openFineTuning = () =>
  fireEvent.click(
    screen.getByRole('button', { name: /^(Feinjustierung|Fine tuning)$/ }),
  );

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

  it('keeps a fine-tuned weight when its own level is pressed again', () => {
    render(<Harness initial={{ avoidRestlessTogether: 6 }} />);

    // 6 reads as "important" — pressing that level must not reset it to 5.
    expect(restlessLevel(IMPORTANT)).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(restlessLevel(IMPORTANT));
    expect(weightOf('avoidRestlessTogether')).toBe(6);
  });

  it('sets the weight with the slider once the fine tuning is open', () => {
    render(<Harness initial={{ avoidRestlessTogether: 5 }} />);

    // The weights are out of the way until they are asked for.
    expect(
      screen.queryByRole('slider', { name: /Unruhe|Restlessness/ }),
    ).not.toBeInTheDocument();

    openFineTuning();
    const slider = sliderFor(/Unruhe|Restlessness/);
    fireEvent.click(slider);
    expect(weightOf('avoidRestlessTogether')).toBe(5);

    fireEvent.change(slider, { target: { value: '8' } });
    expect(weightOf('avoidRestlessTogether')).toBe(8);
    expect(restlessLevel(ESSENTIAL)).toHaveAttribute('aria-pressed', 'true');
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

    openFineTuning();
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

  it('is reachable from the rail through its flyout', () => {
    render(<Harness density="compact" />);

    fireEvent.click(screen.getByRole('button', { name: /^(Rezept|Recipe)$/ }));
    fireEvent.click(
      screen.getByRole('button', { name: /Gruppenarbeit|Group work/ }),
    );

    expect(weightOf('considerWishPartners')).toBe(8);
    expect(weightOf('peerTutoring')).toBe(8);
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
    // The flyout opens on what it is for: how important the criterion is.
    expect(restlessLevel(OFF)).toHaveFocus();
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

    const firstControl = restlessLevel(OFF);
    expect(firstControl).toHaveFocus();

    fireEvent.keyDown(firstControl, { key: 'Tab' });
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
    // The value sits beside the levels that caused it, and changes nothing.
    fireEvent.click(restlessLevel(OFF));
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

    const card = restlessLevel(OFF).closest(
      '[data-criterion="avoidRestlessTogether"]',
    ) as HTMLElement;
    fireEvent.mouseOver(card);
    expect(onHighlightHover).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'avoidRestlessTogether' }),
    );

    fireEvent.mouseOut(card);
    expect(onHighlightLeave).toHaveBeenCalled();

    fireEvent.click(pinButton());
    expect(onHighlightToggle).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'avoidRestlessTogether' }),
    );
    // Marking is the badge's job — the weight stays where it was.
    expect(weightOf('avoidRestlessTogether')).toBe(5);
  });

  it('counts the cases where the criterion can be counted', () => {
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
      name: /^(Erfüllung|Fulfilment) (Unruhe|Restlessness): 3 (von|of) 4/,
    });
    // On screen the tally, because it names the cases rather than a share.
    expect(meter).toHaveTextContent('3/4');
    // The percentage stays in the accessible name, where the bar cannot go.
    expect(meter).toHaveAccessibleName(/75\s?%/);
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
    expect(restlessLevel(IMPORTANT)).toHaveAttribute('aria-pressed', 'true');
  });
});
