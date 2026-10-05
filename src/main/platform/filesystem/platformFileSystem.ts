import { IPlatformFileSystem } from './types';
import { MacOSFileSystem } from './macosFileSystem';
import { WindowsFileSystem } from './windowsFileSystem';
import { getPlatform } from '../platform';

export class PlatformFileSystem implements IPlatformFileSystem {
  private macFS = new MacOSFileSystem();
  private winFS = new WindowsFileSystem();

  private getActiveFS(): IPlatformFileSystem {
    return getPlatform() === 'windows' ? this.winFS : this.macFS;
  }

  public validateWorkspacePath(targetPath: string, rootPath: string): boolean {
    return this.getActiveFS().validateWorkspacePath(targetPath, rootPath);
  }

  public normalizePath(filePath: string): string {
    return this.getActiveFS().normalizePath(filePath);
  }

  public isWithinRoot(targetPath: string, rootPath: string): boolean {
    return this.getActiveFS().isWithinRoot(targetPath, rootPath);
  }

  public resolveNearestExistingPath(targetPath: string): string | null {
    return this.getActiveFS().resolveNearestExistingPath(targetPath);
  }

  public getHomeDir(): string {
    return this.getActiveFS().getHomeDir();
  }

  public isPathEqual(pathA: string, pathB: string): boolean {
    return this.getActiveFS().isPathEqual(pathA, pathB);
  }
}

export const platformFileSystem = new PlatformFileSystem();
