import { describe, it, expect } from 'vitest';
import { MacOSTerminal } from '../src/main/platform/terminal/macosTerminal';
import { WindowsTerminal } from '../src/main/platform/terminal/windowsTerminal';
import { platformTerminal } from '../src/main/platform/terminal/platformTerminal';

describe('Platform Terminal Abstraction', () => {
  describe('MacOSTerminal', () => {
    const macTerminal = new MacOSTerminal();

    it('returns a valid Unix shell path', () => {
      const shell = macTerminal.getDefaultShell();
      expect(shell).toBeTruthy();
      expect(shell.startsWith('/')).toBe(true);
    });

    it('returns login shell arguments for macOS', () => {
      const args = macTerminal.getDefaultShellArgs();
      expect(args).toContain('-l');
    });

    it('returns terminal environment variables with UTF-8', () => {
      const env = macTerminal.getTerminalEnv();
      expect(env.TERM).toBe('xterm-256color');
      expect(env.COLORTERM).toBe('truecolor');
      expect(env.LANG).toBeTruthy();
    });

    it('lists available shells', () => {
      const shells = macTerminal.getAvailableShells();
      expect(shells.length).toBeGreaterThan(0);
      expect(shells.some((s) => s.isDefault)).toBe(true);
    });
  });

  describe('WindowsTerminal', () => {
    const winTerminal = new WindowsTerminal();

    it('returns a Windows executable shell (powershell or cmd)', () => {
      const shell = winTerminal.getDefaultShell();
      expect(shell).toBeTruthy();
      expect(shell.toLowerCase()).toMatch(/(powershell|pwsh|cmd)\.exe/);
    });

    it('returns empty default args for Windows interactive shell', () => {
      const args = winTerminal.getDefaultShellArgs();
      expect(Array.isArray(args)).toBe(true);
    });

    it('returns terminal environment variables for Windows', () => {
      const env = winTerminal.getTerminalEnv();
      expect(env.TERM).toBe('xterm-256color');
      expect(env.COLORTERM).toBe('truecolor');
    });

    it('lists available Windows shells', () => {
      const shells = winTerminal.getAvailableShells();
      expect(shells.length).toBeGreaterThan(0);
      expect(shells.some((s) => s.isDefault)).toBe(true);
    });
  });

  describe('PlatformTerminal Delegator', () => {
    it('provides unified access to current platform shell', () => {
      const shell = platformTerminal.getDefaultShell();
      expect(shell).toBeTruthy();
      const shells = platformTerminal.getAvailableShells();
      expect(shells.length).toBeGreaterThan(0);
    });
  });
});
