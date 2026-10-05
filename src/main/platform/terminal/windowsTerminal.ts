import fs from 'node:fs';
import path from 'node:path';
import { IPlatformTerminal, ShellInfo } from './types';

export class WindowsTerminal implements IPlatformTerminal {
  public getDefaultShell(): string {
    // 1. PowerShell 7 (pwsh) if in PATH or Program Files
    const pwshPath = this.findExecutableOnPath('pwsh.exe');
    if (pwshPath) return pwshPath;

    // 2. Windows PowerShell (System32)
    const sysRoot = process.env.SystemRoot || 'C:\\Windows';
    const winPowerShell = path.join(sysRoot, 'System32\\WindowsPowerShell\\v1.0\\powershell.exe');
    if (fs.existsSync(winPowerShell)) {
      return winPowerShell;
    }

    // 3. Fallback to COMSPEC or cmd.exe
    return process.env.COMSPEC || path.join(sysRoot, 'System32\\cmd.exe');
  }

  public getDefaultShellArgs(): string[] {
    return [];
  }

  public getAvailableShells(): ShellInfo[] {
    const defaultShell = this.getDefaultShell();
    const shells: ShellInfo[] = [];
    const sysRoot = process.env.SystemRoot || 'C:\\Windows';
    const localAppData = process.env.LOCALAPPDATA || '';
    const programFiles = process.env.ProgramFiles || 'C:\\Program Files';
    const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';

    const candidates = [
      {
        name: 'PowerShell',
        path: path.join(sysRoot, 'System32\\WindowsPowerShell\\v1.0\\powershell.exe'),
        args: ['-NoLogo'],
      },
      {
        name: 'PowerShell Core (pwsh)',
        path: this.findExecutableOnPath('pwsh.exe') || path.join(programFiles, 'PowerShell\\7\\pwsh.exe'),
        args: ['-NoLogo'],
      },
      {
        name: 'Command Prompt',
        path: process.env.COMSPEC || path.join(sysRoot, 'System32\\cmd.exe'),
        args: [],
      },
      {
        name: 'Git Bash',
        path: path.join(programFiles, 'Git\\bin\\bash.exe'),
        args: ['--login', '-i'],
      },
      {
        name: 'Git Bash (x86)',
        path: path.join(programFilesX86, 'Git\\bin\\bash.exe'),
        args: ['--login', '-i'],
      },
      {
        name: 'Git Bash (User)',
        path: path.join(localAppData, 'Programs\\Git\\bin\\bash.exe'),
        args: ['--login', '-i'],
      },
    ];

    const seenPaths = new Set<string>();

    for (const c of candidates) {
      if (c.path && fs.existsSync(c.path) && !seenPaths.has(c.path.toLowerCase())) {
        seenPaths.add(c.path.toLowerCase());
        shells.push({
          name: c.name,
          path: c.path,
          args: c.args,
          isDefault: c.path.toLowerCase() === defaultShell.toLowerCase(),
        });
      }
    }

    if (shells.length === 0) {
      shells.push({
        name: 'PowerShell',
        path: defaultShell,
        args: [],
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
    } as Record<string, string>;
  }

  private findExecutableOnPath(exeName: string): string | null {
    const envPath = process.env.PATH || '';
    const dirs = envPath.split(path.delimiter);
    for (const dir of dirs) {
      const fullPath = path.join(dir, exeName);
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    }
    return null;
  }
}
