import { afterEach, describe, expect, it, vi } from 'vitest';
import { createWebBridge, installWebBridge } from '../src/renderer/services/webBridge';

function stubBrowser(platform: string, hasBridge = false): { open: ReturnType<typeof vi.fn> } {
  const open = vi.fn();
  vi.stubGlobal('navigator', { platform, userAgent: platform });
  vi.stubGlobal('window', { open, ...(hasBridge ? { coreMindAPI: { marker: true } } : {}) });
  return { open };
}

describe('browser bridge stand-in', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('routes file calls to the browser file layer and keeps terminal calls desktop-only', async () => {
    stubBrowser('MacIntel');
    const bridge = createWebBridge() as Record<string, (...args: unknown[]) => Promise<unknown>>;

    // No folder is open, so the browser file layer answers instead of the desktop-only stand-in.
    const files = (await bridge.readFile('/x', '/y')) as { success: boolean; error: { code: string } };
    expect(files.success).toBe(false);
    expect(files.error.code).toBe('NOT_OPEN');
    expect(await bridge.getAvailableShells()).toMatchObject({ success: false, error: { code: 'DESKTOP_ONLY' } });
    // Without showDirectoryPicker, the dialog explains the browser requirement.
    expect(await bridge.openDirectoryDialog()).toMatchObject({ success: false, error: { code: 'UNSUPPORTED' } });
  });

  it('returns an unsubscribe function for event subscriptions', () => {
    stubBrowser('Win32');
    const bridge = createWebBridge() as Record<string, (cb: () => void) => () => void>;
    const unsubscribe = bridge.onTerminalData(() => undefined);
    expect(typeof unsubscribe).toBe('function');
    expect(() => unsubscribe()).not.toThrow();
  });

  it('detects the platform from the browser', () => {
    stubBrowser('MacIntel');
    const platform = (createWebBridge() as { platform: { name: string; isMac: boolean } }).platform;
    expect(platform.name).toBe('macos');
    expect(platform.isMac).toBe(true);
  });

  it('leaves sign-in methods undefined so the window.open fallback runs', () => {
    stubBrowser('Linux x86_64');
    const bridge = createWebBridge() as Record<string, unknown>;
    expect(bridge.openAuthWindow).toBeUndefined();
    expect(bridge.openInChrome).toBeUndefined();
  });

  it('opens external links in a new tab', async () => {
    const { open } = stubBrowser('MacIntel');
    const bridge = createWebBridge() as { openExternalUrl: (url: string) => Promise<void> };
    await bridge.openExternalUrl('https://example.com/docs');
    expect(open).toHaveBeenCalledWith('https://example.com/docs', '_blank', 'noopener,noreferrer');
  });

  it('exposes desktop-only virtual device calls as failures, not crashes', async () => {
    stubBrowser('MacIntel');
    const bridge = createWebBridge() as { virtualMobile: { getSdkStatus: () => Promise<unknown> } };
    expect(await bridge.virtualMobile.getSdkStatus()).toMatchObject({ success: false });
  });

  it('does not replace a real desktop bridge', () => {
    stubBrowser('MacIntel', true);
    installWebBridge();
    expect((window as unknown as { coreMindAPI: { marker: boolean } }).coreMindAPI.marker).toBe(true);
  });

  it('installs the stand-in when no bridge exists', () => {
    stubBrowser('MacIntel');
    installWebBridge();
    expect((window as unknown as { coreMindAPI: unknown }).coreMindAPI).toBeDefined();
  });
});
