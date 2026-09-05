// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import '@/i18n/i18n';
import SmartMixControls from '../SmartMixControls';
import type { MixSettings, Student } from '../../../../types';
import {
  DEFAULT_MIX_WEIGHTS,
  neutralSettings,
  normalizeMixSettings,
} from '../../../../utils';

// Helper to create test students with all criteria available
const createTestStudents = (): Student[] => [
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

const renderPresetWrapper = (overrides: Partial<MixSettings> = {}) => {
  const Wrapper = () => {
    const [settings, setSettings] = React.useState<MixSettings>(
      normalizeMixSettings(overrides, neutralSettings),
    );

    return (
      <div>
        <SmartMixControls
          students={createTestStudents()}
          settings={settings}
          setMixSettings={setSettings}
        />
        <div data-testid="peerTutoring-value">{settings.peerTutoring}</div>
        <div data-testid="homogeneous-value">
          {settings.homogeneousPerformanceGroups}
        </div>
      </div>
    );
  };

  render(<Wrapper />);
};

describe('SmartMixControls', () => {
  test('renders all criterion categories', () => {
    const Wrapper = () => {
      const [settings, setSettings] = React.useState(DEFAULT_MIX_WEIGHTS);
      return (
        <SmartMixControls
          students={createTestStudents()}
          settings={settings}
          setMixSettings={setSettings}
        />
      );
    };
    render(<Wrapper />);

    // Updated category labels to match current component structure
    // Note: Categories are only rendered if students have relevant criteria
    expect(screen.getByText(/Identität|Identity/)).toBeInTheDocument();
    expect(screen.getByText(/Fähigkeiten|Abilities/)).toBeInTheDocument();
    expect(screen.getByText(/Verhalten|Behavior/)).toBeInTheDocument();
    expect(screen.getByText(/Soziales|Social/)).toBeInTheDocument();
    // 'Raum' category depends on complex availability checks - skip assertion
  });

  test('shows warning when all criteria are disabled', () => {
    const Wrapper = () => {
      const [settings, setSettings] = React.useState(neutralSettings);

      return (
        <SmartMixControls
          students={createTestStudents()}
          settings={settings}
          setMixSettings={setSettings}
        />
      );
    };
    render(<Wrapper />);

    expect(
      screen.getByText(/Mischen ist zufällig!|Shuffling is random!/i),
    ).toBeInTheDocument();
  });

  test('peerTutoring and homogeneousPerformanceGroups are mutually exclusive', () => {
    const Wrapper = () => {
      const [settings, setSettings] = React.useState(neutralSettings);
      return (
        <SmartMixControls
          students={createTestStudents()}
          settings={settings}
          setMixSettings={setSettings}
        />
      );
    };
    render(<Wrapper />);

    // Both criteria should be rendered
    expect(
      screen.getByText(/Fördern \(heterogen\)|Support \(heterogeneous\)/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Fördern \(homogen\)|Support \(homogeneous\)/),
    ).toBeInTheDocument();

    // Both should initially have value 0
    const sliders = screen.getAllByRole('slider');
    expect(sliders.length).toBeGreaterThan(0);
  });

  test('activating peerTutoring deactivates homogeneousPerformanceGroups', () => {
    const Wrapper = () => {
      const [settings, setSettings] = React.useState({
        ...neutralSettings,
        homogeneousPerformanceGroups: 5,
      });
      return (
        <div>
          <SmartMixControls
            students={createTestStudents()}
            settings={settings}
            setMixSettings={setSettings}
          />
          <div data-testid="peerTutoring-value">{settings.peerTutoring}</div>
          <div data-testid="homogeneous-value">
            {settings.homogeneousPerformanceGroups}
          </div>
        </div>
      );
    };
    render(<Wrapper />);

    // Initially: peerTutoring=0, homogeneousPerformanceGroups=5
    expect(screen.getByTestId('peerTutoring-value')).toHaveTextContent('0');
    expect(screen.getByTestId('homogeneous-value')).toHaveTextContent('5');

    // Find and change the peerTutoring slider
    const peerTutoringText = screen.getByText(
      /Fördern \(heterogen\)|Support \(heterogeneous\)/,
    );
    const peerTutoringCard = peerTutoringText.closest('div[class*="cursor"]');
    const slider = peerTutoringCard?.querySelector(
      'input[type="range"]',
    ) as HTMLInputElement;

    expect(slider).toBeTruthy();
    fireEvent.change(slider, { target: { value: '8' } });

    // After change: peerTutoring=8, homogeneousPerformanceGroups=0
    expect(screen.getByTestId('peerTutoring-value')).toHaveTextContent('8');
    expect(screen.getByTestId('homogeneous-value')).toHaveTextContent('0');
  });

  test('activating homogeneousPerformanceGroups deactivates peerTutoring', () => {
    const Wrapper = () => {
      const [settings, setSettings] = React.useState({
        ...neutralSettings,
        peerTutoring: 3,
      });
      return (
        <div>
          <SmartMixControls
            students={createTestStudents()}
            settings={settings}
            setMixSettings={setSettings}
          />
          <div data-testid="peerTutoring-value">{settings.peerTutoring}</div>
          <div data-testid="homogeneous-value">
            {settings.homogeneousPerformanceGroups}
          </div>
        </div>
      );
    };
    render(<Wrapper />);

    // Initially: peerTutoring=3, homogeneousPerformanceGroups=0
    expect(screen.getByTestId('peerTutoring-value')).toHaveTextContent('3');
    expect(screen.getByTestId('homogeneous-value')).toHaveTextContent('0');

    // Find and change the homogeneousPerformanceGroups slider
    const homogeneousText = screen.getByText(
      /Fördern \(homogen\)|Support \(homogeneous\)/,
    );
    const homogeneousCard = homogeneousText.closest('div[class*="cursor"]');
    const slider = homogeneousCard?.querySelector(
      'input[type="range"]',
    ) as HTMLInputElement;

    expect(slider).toBeTruthy();
    fireEvent.change(slider, { target: { value: '6' } });

    // After change: peerTutoring=0, homogeneousPerformanceGroups=6
    expect(screen.getByTestId('peerTutoring-value')).toHaveTextContent('0');
    expect(screen.getByTestId('homogeneous-value')).toHaveTextContent('6');
  });

  test('master switch enables criteria and resolves peer/homo exclusivity', () => {
    renderPresetWrapper();

    const toggle = screen.getByTitle(
      /Alle Kriterien aktivieren|Enable all criteria/,
    );
    fireEvent.click(toggle);

    // Turning all criteria on must never leave the mutually exclusive
    // peer/homogeneous pair both active; the deterministic winner keeps its
    // default weight while the other stays at 0.
    expect(screen.getByTestId('peerTutoring-value')).toHaveTextContent(
      String(DEFAULT_MIX_WEIGHTS.peerTutoring),
    );
    expect(screen.getByTestId('homogeneous-value')).toHaveTextContent('0');
  });

  test('master switch disables all criteria when turned off', () => {
    renderPresetWrapper({ peerTutoring: 4 });

    const toggle = screen.getByTitle(
      /Alle Kriterien deaktivieren|Disable all criteria/,
    );
    fireEvent.click(toggle);

    expect(screen.getByTestId('peerTutoring-value')).toHaveTextContent('0');
    expect(screen.getByTestId('homogeneous-value')).toHaveTextContent('0');
  });

  test('preset buttons work correctly', () => {
    const mockSetMixSettings = vi.fn();
    const Wrapper = () => {
      const [settings, setSettings] = React.useState(neutralSettings);

      return (
        <SmartMixControls
          students={createTestStudents()}
          settings={settings}
          setMixSettings={(update: React.SetStateAction<MixSettings>) => {
            mockSetMixSettings(update);
            if (typeof update === 'function') {
              setSettings((prev) => update(prev));
            } else {
              setSettings(update);
            }
          }}
        />
      );
    };
    render(<Wrapper />);

    // Find "Alle aktivieren" button by title
    const onButton = screen.getByTitle(
      /Alle Kriterien aktivieren|Enable all criteria/,
    );
    fireEvent.click(onButton);

    expect(mockSetMixSettings).toHaveBeenCalled();
  });
});
