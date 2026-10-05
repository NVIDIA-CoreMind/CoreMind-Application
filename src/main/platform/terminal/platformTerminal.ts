import { IPlatformTerminal, ShellInfo } from './types';
import { MacOSTerminal } from './macosTerminal';
import { WindowsTerminal } from './windowsTerminal';
import { getPlatform } from '../platform';

export class PlatformTerminal implements IPlatformTerminal {
  private macTerminal = new MacOSTerminal();
  private winTerminal = new WindowsTerminal();

  private getActiveTerminal(): IPlatformTerminal {
    return getPlatform() === 'windows' ? this.winTerminal : this.macTerminal;
  }

  public getDefaultShell(): string {
    return this.getActiveTerminal().getDefaultShell();
  }

  public getDefaultShellArgs(): string[] {
    return this.getActiveTerminal().getDefaultShellArgs();
  }

  public getAvailableShells(): ShellInfo[] {
    return this.getActiveTerminal().getAvailableShells();
  }

  public getTerminalEnv(): Record<string, string> {
    return this.getActiveTerminal().getTerminalEnv();
  }
}

export const platformTerminal = new PlatformTerminal();
