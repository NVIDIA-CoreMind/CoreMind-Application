import path from 'node:path';
import fsSync from 'node:fs';
import os from 'node:os';
import { IPlatformFileSystem } from './types';

export class WindowsFileSystem implements IPlatformFileSystem {
  /**
   * Normalizes path: resolves backslashes and ensures drive letter is uppercase.
   */
  public normalizePath(filePath: string): string {
    if (!filePath) return '';
    const resolved = path.win32.resolve(filePath);
    // Normalize drive letter to uppercase (e.g. c:\ -> C:\)
    if (/^[a-zA-Z]:/.test(resolved)) {
      return resolved.charAt(0).toUpperCase() + resolved.slice(1);
    }
    return resolved;
  }

  public isWithinRoot(targetPath: string, rootPath: string): boolean {
    if (!rootPath || !targetPath) return false;
    const normRoot = this.normalizePath(rootPath).toLowerCase();
    const normTarget = this.normalizePath(targetPath).toLowerCase();

    // Check if on the same drive root
    const rootDrive = path.win32.parse(normRoot).root;
    const targetDrive = path.win32.parse(normTarget).root;
    if (rootDrive && targetDrive && rootDrive !== targetDrive) {
      return false;
    }

    const relative = path.win32.relative(normRoot, normTarget);
    return relative === '' || (!relative.startsWith('..') && !path.win32.isAbsolute(relative));
  }

  public resolveNearestExistingPath(targetPath: string): string | null {
    let candidate = this.normalizePath(targetPath);
    const missingSegments: string[] = [];

    while (!fsSync.existsSync(candidate)) {
      const parent = path.win32.dirname(candidate);
      if (parent === candidate) return null;
      missingSegments.unshift(path.win32.basename(candidate));
      candidate = parent;
    }

    try {
      const realCandidate = fsSync.realpathSync.native
        ? fsSync.realpathSync.native(candidate)
        : fsSync.realpathSync(candidate);
      return path.win32.resolve(realCandidate, ...missingSegments);
    } catch {
      return null;
    }
  }

  public validateWorkspacePath(targetPath: string, rootPath: string): boolean {
    if (!rootPath || !targetPath) return false;
    const normRoot = this.normalizePath(rootPath);
    const normTarget = this.normalizePath(targetPath);
    if (!this.isWithinRoot(normTarget, normRoot)) return false;

    try {
      const realRoot = fsSync.realpathSync.native
        ? fsSync.realpathSync.native(normRoot)
        : fsSync.realpathSync(normRoot);
      const canonicalTarget = this.resolveNearestExistingPath(normTarget);
      return canonicalTarget !== null && this.isWithinRoot(canonicalTarget, realRoot);
    } catch {
      return false;
    }
  }

  public getHomeDir(): string {
    return os.homedir();
  }

  public isPathEqual(pathA: string, pathB: string): boolean {
    return this.normalizePath(pathA).toLowerCase() === this.normalizePath(pathB).toLowerCase();
  }
}
