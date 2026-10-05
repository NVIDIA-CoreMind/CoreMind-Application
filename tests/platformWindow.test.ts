import { describe, it, expect } from 'vitest';
import { MacOSWindow } from '../src/main/platform/window/macosWindow';
import { WindowsWindow } from '../src/main/platform/window/windowsWindow';
import { platformWindow } from '../src/main/platform/window/platformWindow';

describe('Platform Window Abstraction', () => {
  it('configures macOS window with hiddenInset and traffic light positioning', () => {
    const macWin = new MacOSWindow();
    const opts = macWin.getWindowOptions();
    expect(opts.titleBarStyle).toBe('hiddenInset');
    expect(opts.trafficLightPosition).toEqual({ x: 16, y: 14 });
    expect(opts.titleBarOverlay).toBeUndefined();
  });

  it('configures Windows window with hidden style and titleBarOverlay', () => {
    const winWin = new WindowsWindow();
    const opts = winWin.getWindowOptions();
    expect(opts.titleBarStyle).toBe('hidden');
    expect(opts.titleBarOverlay).toBeDefined();
    expect(opts.trafficLightPosition).toBeUndefined();
  });

  it('provides active platform window options', () => {
    const opts = platformWindow.getWindowOptions();
    expect(opts).toBeDefined();
    expect(['hiddenInset', 'hidden']).toContain(opts.titleBarStyle);
  });
});
