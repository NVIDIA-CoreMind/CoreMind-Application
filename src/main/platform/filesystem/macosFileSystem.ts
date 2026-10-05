import path from 'node:path';
import fsSync from 'node:fs';
import os from 'node:os';
import { IPlatformFileSystem } from './types';

export class MacOSFileSystem implements IPlatformFileSystem {
  public normalizePath(filePath: string): string {
    if (!filePath) return '';
    const norm = path.posix.normalize(filePath.replace(/\\/g, '/'));
    return norm.length > 1 && norm.endsWith('/') ? norm.slice(0, -1) : norm;
  }


  public isWithinRoot(targetPath: string, rootPath: string): boolean {
    if (!rootPath || !targetPath) return false;
    const normalizedRoot = path.resolve(rootPath);
    const normalizedTarget = path.resolve(targetPath);

    const relative = path.relative(normalizedRoot, normalizedTarget);
    return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
  }

  public resolveNearestExistingPath(targetPath: string): string | null {
    let candidate = path.resolve(targetPath);
    const missingSegments: string[] = [];

    while (!fsSync.existsSync(candidate)) {
      const parent = path.dirname(candidate);
      if (parent === candidate) return null;
      missingSegments.unshift(path.basename(candidate));
      candidate = parent;
    }

    try {
      return path.resolve(fsSync.realpathSync(candidate), ...missingSegments);
    } catch {
      return null;
    }
  }

  public validateWorkspacePath(targetPath: string, rootPath: string): boolean {
    if (!rootPath || !targetPath) return false;
    const resolvedRoot = path.resolve(rootPath);
    const resolvedTarget = path.resolve(targetPath);
    if (!this.isWithinRoot(resolvedTarget, resolvedRoot)) return false;

    try {
      const realRoot = fsSync.realpathSync(resolvedRoot);
      const canonicalTarget = this.resolveNearestExistingPath(resolvedTarget);
      return canonicalTarget !== null && this.isWithinRoot(canonicalTarget, realRoot);
    } catch {
      return false;
    }
  }

  public getHomeDir(): string {
    return os.homedir();
  }

  public isPathEqual(pathA: string, pathB: string): boolean {
    return path.resolve(pathA) === path.resolve(pathB);
  }
}
