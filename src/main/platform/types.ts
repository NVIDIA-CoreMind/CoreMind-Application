import { PlatformType, PlatformInfo } from '../../shared/types/platform';

export type { PlatformType, PlatformInfo };

export interface IPlatform {
  getPlatform(): PlatformType;
  isMac(): boolean;
  isWindows(): boolean;
  isLinux(): boolean;
  getInfo(): PlatformInfo;
}
