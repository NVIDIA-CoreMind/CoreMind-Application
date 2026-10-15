import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
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
    const home = os.homedir();
    const candidateDirs = [
      path.join(home, 'flutter', 'bin'),
      path.join(home, 'development', 'flutter', 'bin'),
      path.join(home, '.flutter', 'bin'),
      path.join(home, 'fvm', 'default', 'bin'),
      '/opt/homebrew/bin',
      '/opt/homebrew/sbin',
      '/usr/local/bin',
      path.join(home, '.pub-cache', 'bin'),
      path.join(home, 'Library', 'Android', 'sdk', 'platform-tools'),
      path.join(home, 'Library', 'Android', 'sdk', 'emulator'),
      path.join(home, '.local', 'bin'),
      path.join(home, '.cargo', 'bin'),
      '/Library/Frameworks/Python.framework/Versions/Current/bin',
    ];

    const currentPath = process.env.PATH || '/usr/bin:/bin:/usr/sbin:/sbin';
    const pathSegments = currentPath.split(':');

    for (const dir of candidateDirs) {
      if (fs.existsSync(dir) && !pathSegments.includes(dir)) {
        pathSegments.unshift(dir);
      }
    }

    return {
      ...process.env,
      PATH: pathSegments.join(':'),
      TERM: 'xterm-256color',
      COLORTERM: 'truecolor',
      LANG: process.env.LANG || 'en_US.UTF-8',
    } as Record<string, string>;
  }
}
