import type { BrowserWindow, BrowserWindowConstructorOptions, NativeImage } from 'electron';
import { IPlatformWindow, TitleBarOverlayOptions } from './types';

export class MacOSWindow implements IPlatformWindow {
  public getWindowOptions(icon?: NativeImage): BrowserWindowConstructorOptions {
    return {
      titleBarStyle: 'hiddenInset',
      trafficLightPosition: { x: 16, y: 14 },
      icon,
    };
  }

  public applyTitleBarOverlay(_win: BrowserWindow, _overlay: TitleBarOverlayOptions): void {
    // macOS uses native traffic light buttons, titleBarOverlay is not applicable
  }
}
