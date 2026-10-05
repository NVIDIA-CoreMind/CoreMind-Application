import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { platform, getPlatform, isMac, isWindows, isLinux, getPlatformInfo } from '../src/main/platform/platform';

describe('Platform Manager', () => {
  beforeEach(() => {
    platform.resetPlatformForTesting();
  });

  afterEach(() => {
    platform.resetPlatformForTesting();
  });

  it('detects the current OS platform by default', () => {
    const plat = getPlatform();
    expect(['macos', 'windows', 'linux']).toContain(plat);
  });

  it('provides platform override for testing', () => {
    platform.setPlatformForTesting('windows');
    expect(getPlatform()).toBe('windows');
    expect(isWindows()).toBe(true);
    expect(isMac()).toBe(false);
    expect(isLinux()).toBe(false);

    platform.setPlatformForTesting('macos');
    expect(getPlatform()).toBe('macos');
    expect(isMac()).toBe(true);
    expect(isWindows()).toBe(false);
    expect(isLinux()).toBe(false);

    platform.setPlatformForTesting('linux');
    expect(getPlatform()).toBe('linux');
    expect(isLinux()).toBe(true);
    expect(isMac()).toBe(false);
    expect(isWindows()).toBe(false);
  });

  it('returns appropriate platform info for Windows and macOS', () => {
    platform.setPlatformForTesting('windows');
    const winInfo = getPlatformInfo();
    expect(winInfo.platform).toBe('windows');
    expect(winInfo.isWindows).toBe(true);
    expect(winInfo.pathSeparator).toBe('\\');
    expect(winInfo.lineEnding).toBe('\r\n');

    platform.setPlatformForTesting('macos');
    const macInfo = getPlatformInfo();
    expect(macInfo.platform).toBe('macos');
    expect(macInfo.isMac).toBe(true);
    expect(macInfo.pathSeparator).toBe('/');
    expect(macInfo.lineEnding).toBe('\n');
  });
});
