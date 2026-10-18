// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import '@/i18n';
import MixHintsSection from '@/components/SeatingPlanGenerator/views/MixHintsSection';
import { getHeading } from '@/__tests__/utils';
import type { ClassroomScene, MixSettings, Student } from '@/types';
import { neutralSettings } from '@/utils';

const scene: ClassroomScene = {
  totalStudents: 0,
  tables: [
    {
      x: 600,
      y: 100,
      width: 55,
      height: 130,
      rotation: 0,
      seatCount: 2,
      locked: false,
      zIndex: 0,
      templateType: 'double',
    },
  ],
  features: [],
};

const student = (id: string, name: string, extra: Partial<Student> = {}) =>
  ({
    id,
    name,
    restless: false,
    shy: false,
    concentrationIssues: false,
    needsFrontSeat: false,
    ...extra,
  }) as Student;

const settings: MixSettings = {
  ...neutralSettings,
  considerWishPartners: 8,
  avoidConflictPartners: 7,
};

afterEach(cleanup);

describe('MixHintsSection', () => {
  it('stays away while the mixing can meet everything', () => {
    const { container } = render(
      <MixHintsSection
        students={[student('a', 'Ada'), student('b', 'Ben')]}
        scene={scene}
        settings={settings}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('names a wish answered with a distance wish', () => {
    render(
      <MixHintsSection
        students={[
          student('a', 'Ada Lovelace', { wishPartnerIds: ['b'] }),
          student('b', 'Ben Bauer', { avoidPartnerIds: ['a'] }),
        ]}
        scene={scene}
        settings={settings}
      />,
    );
    expect(getHeading(/Hinweise|Notes/i, 3)).toBeInTheDocument();
    expect(
      screen.getByText(
        /Ada Lovelace.*Ben Bauer.*(Distanzwunsch|distance request)/,
      ),
    ).toBeInTheDocument();
  });
});
