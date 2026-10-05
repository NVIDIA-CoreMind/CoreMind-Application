import { PlatformType } from '../types/platform';

export type ShortcutAction =
  | 'openFolder'
  | 'saveFile'
  | 'quickOpen'
  | 'commandPalette'
  | 'closeTab'
  | 'toggleSidebar'
  | 'toggleTerminal'
  | 'search'
  | 'settings'
  | 'newFile'
  | 'toggleAgent';

export interface ShortcutDefinition {
  mac: string;
  win: string;
  label: string;
}

export const SHORTCUTS: Record<ShortcutAction, ShortcutDefinition> = {
  openFolder: { mac: '⌘O', win: 'Ctrl+O', label: 'Open Folder' },
  saveFile: { mac: '⌘S', win: 'Ctrl+S', label: 'Save' },
  quickOpen: { mac: '⌘P', win: 'Ctrl+P', label: 'Quick Open' },
  commandPalette: { mac: '⌘⇧P', win: 'Ctrl+Shift+P', label: 'Command Palette' },
  closeTab: { mac: '⌘W', win: 'Ctrl+W', label: 'Close Tab' },
  toggleSidebar: { mac: '⌘B', win: 'Ctrl+B', label: 'Toggle Primary Sidebar' },
  toggleTerminal: { mac: '⌘J', win: 'Ctrl+J', label: 'Toggle Terminal' },
  search: { mac: '⌘⇧F', win: 'Ctrl+Shift+F', label: 'Find in Files' },
  settings: { mac: '⌘,', win: 'Ctrl+,', label: 'Open Settings' },
  newFile: { mac: '⌘N', win: 'Ctrl+N', label: 'New File' },
  toggleAgent: { mac: '⌘L', win: 'Ctrl+L', label: 'Toggle Agent Panel' },
};

/**
 * Check if running environment is macOS.
 */
export function isMacClient(platform?: PlatformType): boolean {
  if (platform) {
    return platform === 'macos';
  }
  if (typeof process !== 'undefined' && process.platform) {
    return process.platform === 'darwin';
  }
  if (typeof navigator !== 'undefined') {
    return (
      navigator.platform?.toUpperCase().includes('MAC') ||
      /Mac|iPhone|iPad|iPod/.test(navigator.userAgent || '')
    );
  }
  return false;
}

/**
 * Get display string for a shortcut action according to platform.
 */
export function getShortcutDisplay(action: ShortcutAction, isMac?: boolean): string {
  const mac = isMac !== undefined ? isMac : isMacClient();
  const def = SHORTCUTS[action];
  if (!def) return '';
  return mac ? def.mac : def.win;
}

/**
 * Get modifier symbol or string (⌘ vs Ctrl)
 */
export function getCmdOrCtrlSymbol(isMac?: boolean): string {
  const mac = isMac !== undefined ? isMac : isMacClient();
  return mac ? '⌘' : 'Ctrl+';
}

/**
 * Converts shortcut with ⌘ / ⇧ symbols into platform-appropriate string.
 */
export function formatShortcutString(shortcut: string, isMac?: boolean): string {
  const mac = isMac !== undefined ? isMac : isMacClient();
  if (mac) {
    return shortcut;
  }
  return shortcut
    .replace(/⌘/g, 'Ctrl+')
    .replace(/⇧/g, 'Shift+')
    .replace(/⌥/g, 'Alt+')
    .replace(/\+\+/g, '+');
}
