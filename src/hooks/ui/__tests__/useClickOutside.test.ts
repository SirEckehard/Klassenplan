import '@testing-library/jest-dom/vitest';
import { cleanup, renderHook } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useClickOutside } from '../../../hooks/ui/useClickOutside';

const appendElement = <T extends HTMLElement>(element: T): T => {
  document.body.appendChild(element);
  return element;
};

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('useClickOutside', () => {
  it('callt das Callback bei Klick außerhalb', async () => {
    const callback = vi.fn();
    const { result, unmount } = renderHook(() => {
      const ref = useRef<HTMLDivElement>(null);
      useClickOutside(ref, callback);
      return ref;
    });

    const container = appendElement(document.createElement('div'));
    result.current.current = container;

    const outsideElement = appendElement(document.createElement('button'));
    const user = userEvent.setup();

    await user.click(outsideElement);

    expect(callback).toHaveBeenCalledTimes(1);
    unmount();
  });

  it('callt das Callback nicht bei Klick innerhalb', async () => {
    const callback = vi.fn();
    const { result, unmount } = renderHook(() => {
      const ref = useRef<HTMLDivElement>(null);
      useClickOutside(ref, callback);
      return ref;
    });

    const container = appendElement(document.createElement('div'));
    result.current.current = container;

    const user = userEvent.setup();
    await user.click(container);

    expect(callback).not.toHaveBeenCalled();
    unmount();
  });

  it('unterstützt mehrere Referenzen', async () => {
    const callback = vi.fn();
    const { result, unmount } = renderHook(() => {
      const ref1 = useRef<HTMLDivElement>(null);
      const ref2 = useRef<HTMLButtonElement>(null);
      useClickOutside([ref1, ref2], callback);
      return { ref1, ref2 };
    });

    const first = appendElement(document.createElement('div'));
    const second = appendElement(document.createElement('button'));
    const outside = appendElement(document.createElement('span'));

    result.current.ref1.current = first;
    result.current.ref2.current = second;

    const user = userEvent.setup();

    await user.click(second);
    expect(callback).not.toHaveBeenCalled();

    await user.click(outside);
    expect(callback).toHaveBeenCalledTimes(1);
    unmount();
  });

  it('respektiert den Aktiv-Parameter', async () => {
    const callback = vi.fn();
    const { rerender, result, unmount } = renderHook(
      ({ active }) => {
        const ref = useRef<HTMLDivElement>(null);
        useClickOutside(ref, callback, active);
        return ref;
      },
      { initialProps: { active: false } },
    );

    const container = appendElement(document.createElement('div'));
    const outside = appendElement(document.createElement('button'));
    result.current.current = container;

    const user = userEvent.setup();

    await user.click(outside);
    expect(callback).not.toHaveBeenCalled();

    rerender({ active: true });
    await user.click(outside);
    expect(callback).toHaveBeenCalledTimes(1);
    unmount();
  });
});
