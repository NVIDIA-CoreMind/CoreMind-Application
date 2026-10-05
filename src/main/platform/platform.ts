import { PlatformType, PlatformInfo } from './types';


class PlatformManager {
  private overridePlatform: PlatformType | null = null;

  public getPlatform(): PlatformType {
    if (this.overridePlatform) {
      return this.overridePlatform;
    }
    if (process.platform === 'darwin') return 'macos';
    if (process.platform === 'win32') return 'windows';
    return 'linux';
  }

  public isMac(): boolean {
    return this.getPlatform() === 'macos';
  }

  public isWindows(): boolean {
    return this.getPlatform() === 'windows';
  }

  public isLinux(): boolean {
    return this.getPlatform() === 'linux';
  }

  public isDarwin(): boolean {
    return this.isMac();
  }

  public isWin32(): boolean {
    return this.isWindows();
  }

  public getInfo(): PlatformInfo {
    const plat = this.getPlatform();
    return {
      platform: plat,
      isMac: plat === 'macos',
      isWindows: plat === 'windows',
      isLinux: plat === 'linux',
      pathSeparator: plat === 'windows' ? '\\' : '/',
      lineEnding: plat === 'windows' ? '\r\n' : '\n',
    };
  }

  /**
   * For testing cross-platform logic in unit tests.
   */
  public setPlatformForTesting(plat: PlatformType | null): void {
    this.overridePlatform = plat;
  }

  public resetPlatformForTesting(): void {
    this.overridePlatform = null;
  }
}

export const platform = new PlatformManager();
export const getPlatform = () => platform.getPlatform();
export const isMac = () => platform.isMac();
export const isWindows = () => platform.isWindows();
export const isLinux = () => platform.isLinux();
export const getPlatformInfo = () => platform.getInfo();
