import { afterEach, describe, expect, it, vi } from 'vitest';
import { isDesktopApp } from '../src/renderer/services/runtime';

function stubWindow(search: string, hasBridge: boolean): void {
  vi.stubGlobal('window', {
    location: { search },
    ...(hasBridge ? { coreMindAPI: {} } : {}),
  });
}

describe('isDesktopApp', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('is false in a browser, where the Electron bridge is missing', () => {
    stubWindow('', false);
    expect(isDesktopApp()).toBe(false);
  });

  it('is true inside the desktop shell, where the bridge is present', () => {
    stubWindow('', true);
    expect(isDesktopApp()).toBe(true);
  });

  it('honors the development-only ?ide=1 preview flag in a browser', () => {
    stubWindow('?ide=1', false);
    expect(isDesktopApp()).toBe(true);
  });

  it('is false when there is no window (non-browser environments)', () => {
    expect(isDesktopApp()).toBe(false);
  });
});
