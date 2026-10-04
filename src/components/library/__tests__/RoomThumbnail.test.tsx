// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createMockClassroomScene } from '@/__tests__/utils';
import RoomThumbnail from '../RoomThumbnail';

describe('RoomThumbnail', () => {
  it('draws the room, one shape per table and per visible room element', () => {
    const scene = createMockClassroomScene(4, {
      features: [
        {
          id: 'board',
          type: 'board',
          x: 300,
          y: 10,
          width: 300,
          height: 20,
          anchor: 'top',
          movable: false,
        },
        {
          id: 'hidden-door',
          type: 'door',
          x: 0,
          y: 300,
          width: 10,
          height: 60,
          anchor: 'left',
          movable: false,
          visible: false,
        },
      ],
    });

    const { container } = render(<RoomThumbnail scene={scene} />);

    // The outline, four tables and the board.
    expect(container.querySelectorAll('rect')).toHaveLength(6);
  });

  it('is a picture only, hidden from screen readers', () => {
    const { container } = render(
      <RoomThumbnail scene={createMockClassroomScene(1)} />,
    );

    expect(container.querySelector('svg')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
  });
});
