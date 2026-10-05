import { describe, it, expect } from 'vitest';
import { MacOSFileSystem } from '../src/main/platform/filesystem/macosFileSystem';
import { WindowsFileSystem } from '../src/main/platform/filesystem/windowsFileSystem';
import { platformFileSystem } from '../src/main/platform/filesystem/platformFileSystem';

describe('Platform Filesystem Abstraction', () => {
  describe('MacOSFileSystem', () => {
    const macFS = new MacOSFileSystem();

    it('normalizes POSIX paths with forward slashes', () => {
      expect(macFS.normalizePath('/Users/dev/project/file.ts')).toBe('/Users/dev/project/file.ts');
      expect(macFS.normalizePath('/Users/dev/project//sub/')).toBe('/Users/dev/project/sub');
    });

    it('verifies path resides within root', () => {
      expect(macFS.isWithinRoot('/Users/dev/project/src/index.ts', '/Users/dev/project')).toBe(true);
      expect(macFS.isWithinRoot('/Users/dev/project', '/Users/dev/project')).toBe(true);
    });

    it('blocks directory traversal outside root', () => {
      expect(macFS.isWithinRoot('/Users/dev/project/../other/secret.txt', '/Users/dev/project')).toBe(false);
      expect(macFS.isWithinRoot('/etc/passwd', '/Users/dev/project')).toBe(false);
    });
  });

  describe('WindowsFileSystem', () => {
    const winFS = new WindowsFileSystem();

    it('normalizes Windows paths with uppercase drive letters', () => {
      const normalized = winFS.normalizePath('c:\\users\\dev\\project');
      expect(normalized.startsWith('C:\\')).toBe(true);
    });

    it('verifies path resides within root case-insensitively', () => {
      expect(winFS.isWithinRoot('C:\\Projects\\App\\src\\main.ts', 'c:\\projects\\app')).toBe(true);
      expect(winFS.isWithinRoot('C:\\Projects\\App\\SRC\\MAIN.TS', 'C:\\Projects\\App')).toBe(true);
    });

    it('blocks directory traversal outside root', () => {
      expect(winFS.isWithinRoot('C:\\Projects\\App\\..\\Other\\secret.txt', 'C:\\Projects\\App')).toBe(false);
      expect(winFS.isWithinRoot('C:\\Windows\\System32', 'C:\\Projects\\App')).toBe(false);
    });

    it('blocks cross-drive access as outside root', () => {
      expect(winFS.isWithinRoot('D:\\OtherDrive\\file.txt', 'C:\\Projects\\App')).toBe(false);
    });

    it('compares paths case-insensitively', () => {
      expect(winFS.isPathEqual('C:\\Code\\App', 'c:\\code\\app')).toBe(true);
      expect(winFS.isPathEqual('C:\\Code\\App', 'C:\\Code\\Other')).toBe(false);
    });
  });

  describe('PlatformFileSystem Delegator', () => {
    it('provides unified access to active filesystem', () => {
      const home = platformFileSystem.getHomeDir();
      expect(home).toBeTruthy();
    });
  });
});
