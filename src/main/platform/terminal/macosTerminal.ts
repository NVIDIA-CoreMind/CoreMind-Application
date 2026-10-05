import fs from 'node:fs';
import { IPlatformTerminal, ShellInfo } from './types';

export class MacOSTerminal implements IPlatformTerminal {
  public getDefaultShell(): string {
    if (process.env.SHELL && fs.existsSync(process.env.SHELL)) {
      return process.env.SHELL;
    }
    if (fs.existsSync('/bin/zsh')) {
      return '/bin/zsh';
    }
    if (fs.existsSync('/bin/bash')) {
      return '/bin/bash';
    }
    return '/bin/sh';
  }

  public getDefaultShellArgs(): string[] {
    return ['-l'];
  }

  public getAvailableShells(): ShellInfo[] {
    const defaultShell = this.getDefaultShell();
    const shells: ShellInfo[] = [];

    const candidates = [
      { name: 'Zsh', path: '/bin/zsh' },
      { name: 'Bash', path: '/bin/bash' },
      { name: 'Sh', path: '/bin/sh' },
      { name: 'Homebrew Zsh', path: '/opt/homebrew/bin/zsh' },
      { name: 'Homebrew Bash', path: '/opt/homebrew/bin/bash' },
    ];

    for (const c of candidates) {
      if (fs.existsSync(c.path)) {
        shells.push({
          name: c.name,
          path: c.path,
          args: ['-l'],
          isDefault: c.path === defaultShell,
        });
      }
    }

    if (shells.length === 0) {
      shells.push({
        name: 'Default Shell',
        path: defaultShell,
        args: ['-l'],
        isDefault: true,
      });
    }

    return shells;
  }

  public getTerminalEnv(): Record<string, string> {
    return {
      ...process.env,
      TERM: 'xterm-256color',
      COLORTERM: 'truecolor',
      LANG: process.env.LANG || 'en_US.UTF-8',
    } as Record<string, string>;
  }
}
