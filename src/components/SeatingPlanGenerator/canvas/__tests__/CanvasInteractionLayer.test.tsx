import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import CanvasInteractionLayer, {
  type CanvasInteractionLayerProps,
} from '../CanvasInteractionLayer';
import type { ClassroomTable } from '../../../../types';

// Add vitest-dom matchers
import '@testing-library/jest-dom/vitest';

describe('CanvasInteractionLayer', () => {
  let mockProps: CanvasInteractionLayerProps;
  let mockChildren: CanvasInteractionLayerProps['children'];

  const createMockTable = (index: number): ClassroomTable => ({
    x: 100 + index * 50,
    y: 100 + index * 30,
    width: 130,
    height: 120,
    seatCount: 4,
    rotation: 0,
    zIndex: index,
    locked: false,
    templateType: 'group4',
  });

  beforeEach(() => {
    mockChildren = vi
      .fn()
      .mockReturnValue(<div data-testid="mock-children">Mock Children</div>);

    mockProps = {
      classroomHeight: 600,
      classroomWidth: 900,
      sceneTables: [createMockTable(0), createMockTable(1)],
      selectedTableIds: [0],
      classroomScene: {
        tables: [createMockTable(0), createMockTable(1)],
        totalStudents: 8,
      },
      snapToGrid: true,
      studentsCount: 8,
      setSelectedTableIds: vi.fn(),
      updateClassroomScene: vi.fn(),
      runSceneTransaction: vi.fn(),
      removeTables: vi.fn(),
      snapshot: vi.fn(),
      openTableContextMenu: vi.fn(),
      openCanvasContextMenu: vi.fn(),
      closeTableContextMenu: vi.fn(),
      closeCanvasContextMenu: vi.fn(),
      clearSelection: vi.fn(),
      startTablePointerDrag: vi.fn(),
      releaseTablePointerCapture: vi.fn(),
      cancelSelectionInteraction: vi.fn(),
      initializeDragFromSelection: vi.fn(),
      updateDragSelection: vi.fn(),
      finalizeDragInteraction: vi.fn(),
      toggleSelect: vi.fn(),
      toSceneCoordinates: vi.fn().mockReturnValue({ x: 100, y: 200 }),
      children: mockChildren,
    };
  });

  it('renders children with correct handlers', () => {
    render(<CanvasInteractionLayer {...mockProps} />);

    expect(screen.getByTestId('mock-children')).toBeInTheDocument();
    expect(mockChildren).toHaveBeenCalledWith(
      expect.objectContaining({
        handleCanvasPointerMove: expect.any(Function),
        handleCanvasPointerUp: expect.any(Function),
        beginSelectionWithLongPress: expect.any(Function),
        handleTablePointerDown: expect.any(Function),
        deleteSelectedTables: expect.any(Function),
        copySelectedTables: expect.any(Function),
        cutSelectedTables: expect.any(Function),
        pasteTablesAt: expect.any(Function),
        handleCanvasMenuPaste: expect.any(Function),
        canPasteTables: expect.any(Boolean),
        canPasteFeatures: expect.any(Boolean),
        clipboard: null,
        featureClipboard: null,
        setFeatureClipboard: expect.any(Function),
        selectionBox: null,
      }),
    );
  });

  it('should render without crashing', () => {
    expect(() => {
      render(<CanvasInteractionLayer {...mockProps} />);
    }).not.toThrow();
  });
});
