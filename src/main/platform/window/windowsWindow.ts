import type { BrowserWindow, BrowserWindowConstructorOptions, NativeImage } from 'electron';
import { IPlatformWindow, TitleBarOverlayOptions } from './types';

export class WindowsWindow implements IPlatformWindow {
  public getWindowOptions(icon?: NativeImage): BrowserWindowConstructorOptions {
    return {
      titleBarStyle: 'hidden',
      titleBarOverlay: {
        color: '#1E1F20',
        symbolColor: '#9AA0A6',
        height: 36,
      },
      autoHideMenuBar: true,
      icon,
    };
  }

  public applyTitleBarOverlay(win: BrowserWindow, overlay: TitleBarOverlayOptions): void {
    if (typeof (win as any).setTitleBarOverlay === 'function') {
      try {
        (win as any).setTitleBarOverlay(overlay);
      } catch {
        // Ignore overlay error if unsupported
      }
    }
  }
}
