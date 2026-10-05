import { describe, it, expect } from 'vitest';
import {
  getShortcutDisplay,
  formatShortcutString,
  getCmdOrCtrlSymbol,
} from '../src/shared/utils/shortcuts';


describe('Platform-Aware Keyboard Shortcuts', () => {
  it('maps standard shortcuts to ⌘ on macOS and Ctrl on Windows', () => {
    // Open Folder
    expect(getShortcutDisplay('openFolder', true)).toBe('⌘O');
    expect(getShortcutDisplay('openFolder', false)).toBe('Ctrl+O');

    // Quick Open
    expect(getShortcutDisplay('quickOpen', true)).toBe('⌘P');
    expect(getShortcutDisplay('quickOpen', false)).toBe('Ctrl+P');

    // Command Palette
    expect(getShortcutDisplay('commandPalette', true)).toBe('⌘⇧P');
    expect(getShortcutDisplay('commandPalette', false)).toBe('Ctrl+Shift+P');

    // Save File
    expect(getShortcutDisplay('saveFile', true)).toBe('⌘S');
    expect(getShortcutDisplay('saveFile', false)).toBe('Ctrl+S');

    // Close Tab
    expect(getShortcutDisplay('closeTab', true)).toBe('⌘W');
    expect(getShortcutDisplay('closeTab', false)).toBe('Ctrl+W');

    // Toggle Sidebar
    expect(getShortcutDisplay('toggleSidebar', true)).toBe('⌘B');
    expect(getShortcutDisplay('toggleSidebar', false)).toBe('Ctrl+B');

    // Toggle Terminal
    expect(getShortcutDisplay('toggleTerminal', true)).toBe('⌘J');
    expect(getShortcutDisplay('toggleTerminal', false)).toBe('Ctrl+J');

    // Search
    expect(getShortcutDisplay('search', true)).toBe('⌘⇧F');
    expect(getShortcutDisplay('search', false)).toBe('Ctrl+Shift+F');
  });

  it('formats custom shortcut strings appropriately', () => {
    expect(formatShortcutString('⌘⇧P', true)).toBe('⌘⇧P');
    expect(formatShortcutString('⌘⇧P', false)).toBe('Ctrl+Shift+P');
    expect(formatShortcutString('⌘K', false)).toBe('Ctrl+K');
  });

  it('provides correct modifier symbol', () => {
    expect(getCmdOrCtrlSymbol(true)).toBe('⌘');
    expect(getCmdOrCtrlSymbol(false)).toBe('Ctrl+');
  });
});
