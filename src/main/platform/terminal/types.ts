import { ShellInfo } from '../../../shared/types/ipc';

export type { ShellInfo };

export interface IPlatformTerminal {
  getDefaultShell(): string;
  getDefaultShellArgs(): string[];
  getAvailableShells(): ShellInfo[];
  getTerminalEnv(): Record<string, string>;
}
