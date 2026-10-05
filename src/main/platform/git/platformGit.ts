import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';
import { getPlatform } from '../platform';
import { GitStatusResult, GitFileStatus, GitBranchInfo } from '../../../shared/types/git';

const execFileAsync = promisify(execFile);

export class PlatformGit {
  private resolvedGitPath: string | null = null;

  public async getGitExecutablePath(): Promise<string> {
    if (this.resolvedGitPath) {
      return this.resolvedGitPath;
    }

    // 1. Try running "git" from PATH
    try {
      await execFileAsync('git', ['--version']);
      this.resolvedGitPath = 'git';
      return 'git';
    } catch {
      // Not directly in PATH
    }

    // 2. Check platform-specific common installation directories
    const isWin = getPlatform() === 'windows';
    const candidates = isWin
      ? [
          path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Git\\cmd\\git.exe'),
          path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'Git\\cmd\\git.exe'),
          path.join(process.env.LOCALAPPDATA || '', 'Programs\\Git\\cmd\\git.exe'),
          'C:\\Git\\cmd\\git.exe',
        ]
      : [
          '/usr/bin/git',
          '/usr/local/bin/git',
          '/opt/homebrew/bin/git',
        ];

    for (const candidate of candidates) {
      if (candidate && fs.existsSync(candidate)) {
        this.resolvedGitPath = candidate;
        return candidate;
      }
    }

    // Default to 'git' and let the system report error if not found
    this.resolvedGitPath = 'git';
    return 'git';
  }

  public async runGit(cwd: string, args: string[]): Promise<string> {
    const gitPath = await this.getGitExecutablePath();
    const { stdout } = await execFileAsync(gitPath, args, {
      cwd,
      maxBuffer: 10 * 1024 * 1024,
      windowsHide: true,
      env: {
        ...process.env,
        LANG: 'en_US.UTF-8',
        LC_ALL: 'en_US.UTF-8',
      },
    });
    return stdout;
  }

  public async isRepository(cwd: string): Promise<boolean> {
    try {
      const out = await this.runGit(cwd, ['rev-parse', '--is-inside-work-tree']);
      return out.trim() === 'true';
    } catch {
      return false;
    }
  }

  public async getStatus(cwd: string): Promise<GitStatusResult> {
    const isRepo = await this.isRepository(cwd);
    if (!isRepo) {
      return {
        isRepo: false,
        files: [],
        ahead: 0,
        behind: 0,
        clean: true,
      };
    }

    // Get current branch
    let currentBranch: string | undefined;
    try {
      currentBranch = (await this.runGit(cwd, ['rev-parse', '--abbrev-ref', 'HEAD'])).trim();
    } catch {
      // Detached head or empty repository
    }

    // Get ahead/behind count
    let ahead = 0;
    let behind = 0;
    try {
      if (currentBranch && currentBranch !== 'HEAD') {
        const counts = await this.runGit(cwd, ['rev-list', '--left-right', '--count', `@{u}...HEAD`]);
        const parts = counts.trim().split(/\s+/);
        if (parts.length >= 2) {
          behind = parseInt(parts[0], 10) || 0;
          ahead = parseInt(parts[1], 10) || 0;
        }
      }
    } catch {
      // Remote upstream might not be configured
    }

    // Get porcelain status
    const statusOutput = await this.runGit(cwd, ['status', '--porcelain=v1', '-uall']);
    const files: GitFileStatus[] = [];

    const lines = statusOutput.split('\n');
    for (const line of lines) {
      if (!line || line.length < 3) continue;
      const x = line.charAt(0);
      const y = line.charAt(1);
      const rawPath = line.substring(3).trim();

      // Determine staged vs unstaged
      if (x !== ' ' && x !== '?') {
        files.push({
          path: rawPath,
          status: this.mapStatusCode(x),
          staged: true,
        });
      }
      if (y !== ' ') {
        files.push({
          path: rawPath,
          status: this.mapStatusCode(y),
          staged: false,
        });
      }
    }

    return {
      isRepo: true,
      currentBranch,
      files,
      ahead,
      behind,
      clean: files.length === 0,
    };
  }

  public async getDiff(cwd: string, filePath?: string): Promise<string> {
    const args = ['diff'];
    if (filePath) {
      args.push('--', filePath);
    }
    return this.runGit(cwd, args);
  }

  public async add(cwd: string, files: string[]): Promise<void> {
    if (!files || files.length === 0) {
      await this.runGit(cwd, ['add', '-A']);
    } else {
      await this.runGit(cwd, ['add', '--', ...files]);
    }
  }

  public async commit(cwd: string, message: string): Promise<string> {
    return this.runGit(cwd, ['commit', '-m', message]);
  }

  public async getBranches(cwd: string): Promise<GitBranchInfo> {
    const output = await this.runGit(cwd, ['branch', '--list']);
    const lines = output.split('\n');
    let current = '';
    const all: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (line.startsWith('*')) {
        current = trimmed.substring(1).trim();
        all.push(current);
      } else {
        all.push(trimmed);
      }
    }

    return { current, all };
  }

  public async checkout(cwd: string, branch: string): Promise<void> {
    await this.runGit(cwd, ['checkout', branch]);
  }

  public async pull(cwd: string): Promise<string> {
    return this.runGit(cwd, ['pull']);
  }

  public async push(cwd: string): Promise<string> {
    return this.runGit(cwd, ['push']);
  }

  private mapStatusCode(code: string): GitFileStatus['status'] {
    switch (code) {
      case 'M':
        return 'modified';
      case 'A':
        return 'added';
      case 'D':
        return 'deleted';
      case 'R':
        return 'renamed';
      case 'C':
        return 'copied';
      case '?':
        return 'untracked';
      case '!':
        return 'ignored';
      default:
        return 'modified';
    }
  }
}

export const platformGit = new PlatformGit();
