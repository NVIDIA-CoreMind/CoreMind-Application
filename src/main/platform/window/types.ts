import type { BrowserWindow, BrowserWindowConstructorOptions, NativeImage } from 'electron';

export interface TitleBarOverlayOptions {
  color: string;
  symbolColor: string;
  height?: number;
}

export interface IPlatformWindow {
  getWindowOptions(icon?: NativeImage): BrowserWindowConstructorOptions;
  applyTitleBarOverlay(win: BrowserWindow, overlay: TitleBarOverlayOptions): void;
}
