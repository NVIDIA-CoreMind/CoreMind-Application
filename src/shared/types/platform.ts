export type PlatformType = 'macos' | 'windows' | 'linux';

export interface PlatformInfo {
  platform: PlatformType;
  isMac: boolean;
  isWindows: boolean;
  isLinux: boolean;
  pathSeparator: string;
  lineEnding: string;
}
