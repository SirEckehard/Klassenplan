import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { applyInitialTheme, syncThemeColor } from '@/utils/ui/themeColor';
import { LOCAL_STORAGE_KEYS } from '@/utils/data/storageKeys';

function addMeta(media: string) {
  const meta = document.createElement('meta');
  meta.name = 'theme-color';
  meta.media = media;
  meta.content = media.includes('dark') ? '#101113' : '#fcfbf8';
  document.head.append(meta);
  return meta;
}

function mockSystemDark(dark: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches: dark && query.includes('dark'),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

describe('themeColor', () => {
  let root: HTMLElement;

  beforeEach(() => {
    root = document.createElement('html');
    localStorage.clear();
  });

  afterEach(() => {
    document.head
      .querySelectorAll('meta[name="theme-color"]')
      .forEach((meta) => meta.remove());
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('puts the stored theme on the page before the system preference', () => {
    mockSystemDark(true);
    localStorage.setItem(LOCAL_STORAGE_KEYS.theme, 'light');
    applyInitialTheme(root);
    expect(root.classList.contains('dark')).toBe(false);

    localStorage.setItem(LOCAL_STORAGE_KEYS.theme, 'dark');
    applyInitialTheme(root);
    expect(root.classList.contains('dark')).toBe(true);
  });

  it('follows the system with no theme stored', () => {
    mockSystemDark(true);
    applyInitialTheme(root);
    expect(root.classList.contains('dark')).toBe(true);
  });

  it('gives both metas the colour of the theme in use, and follows a switch', async () => {
    const light = addMeta('(prefers-color-scheme: light)');
    const dark = addMeta('(prefers-color-scheme: dark)');
    root.classList.add('dark');

    const stop = syncThemeColor(root);
    expect(light.content).toBe('#101113');
    expect(dark.content).toBe('#101113');

    root.classList.remove('dark');
    await Promise.resolve();
    expect(light.content).toBe('#fcfbf8');
    expect(dark.content).toBe('#fcfbf8');
    stop();
  });
});
