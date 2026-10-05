import type { BrowserWindow, BrowserWindowConstructorOptions, NativeImage } from 'electron';
import { IPlatformWindow, TitleBarOverlayOptions } from './types';
import { MacOSWindow } from './macosWindow';
import { WindowsWindow } from './windowsWindow';
import { getPlatform } from '../platform';

export class PlatformWindow implements IPlatformWindow {
  private macWindow = new MacOSWindow();
  private winWindow = new WindowsWindow();

  private getActiveWindow(): IPlatformWindow {
    return getPlatform() === 'windows' ? this.winWindow : this.macWindow;
  }

  public getWindowOptions(icon?: NativeImage): BrowserWindowConstructorOptions {
    return this.getActiveWindow().getWindowOptions(icon);
  }

  public applyTitleBarOverlay(win: BrowserWindow, overlay: TitleBarOverlayOptions): void {
    this.getActiveWindow().applyTitleBarOverlay(win, overlay);
  }
}

export const platformWindow = new PlatformWindow();
