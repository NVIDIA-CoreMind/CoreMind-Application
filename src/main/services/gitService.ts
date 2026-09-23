import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { GitFileChangeType, GitFileStatus, GitStatusResult } from '../../shared/types/git';
import { IpcResult } from '../../shared/types/ipc';
import { logger } from './logger';

const execFileAsync = promisify(execFile);

export class GitService {
  /**
   * Get git status for workspace root.
   */
  public async getStatus(workspaceRoot: string): Promise<IpcResult<GitStatusResult>> {
    try {
      if (!workspaceRoot) {
        return {
          success: true,
          data: { isRepo: false, branch: null, files: [] },
        };
      }

      // Check if it's a git repo
      try {
        await execFileAsync('git', ['rev-parse', '--is-inside-work-tree'], {
          cwd: workspaceRoot,
          timeout: 5000,
        });
      } catch {
        // Not a git repository
        return {
          success: true,
          data: { isRepo: false, branch: null, files: [] },
        };
      }

      // Get current branch
      let branch: string | null = null;
      try {
        const { stdout } = await execFileAsync('git', ['branch', '--show-current'], {
          cwd: workspaceRoot,
          timeout: 5000,
        });
        branch = stdout.trim() || 'HEAD (detached)';
      } catch {
        branch = 'main';
      }

      // Get status porcelain
      const { stdout: statusOutput } = await execFileAsync(
        'git',
        ['status', '--porcelain=v1', '-uall'],
        {
          cwd: workspaceRoot,
          timeout: 5000,
        }
      );

      const files: GitFileStatus[] = [];
      const lines = statusOutput.split('\n');

      for (const line of lines) {
        if (!line || line.trim() === '') continue;

        const x = line[0];
        const y = line[1];
        const filePath = line.substring(3).trim();

        let type: GitFileChangeType = 'modified';
        let staged = false;

        if (x === '?' && y === '?') {
          type = 'untracked';
          staged = false;
        } else if (x === 'A' || y === 'A') {
          type = 'added';
          staged = x === 'A';
        } else if (x === 'D' || y === 'D') {
          type = 'deleted';
          staged = x === 'D';
        } else if (x === 'R' || y === 'R') {
          type = 'renamed';
          staged = x === 'R';
        } else {
          type = 'modified';
          staged = x === 'M';
        }

        files.push({
          path: filePath,
          type,
          staged,
        });
      }

      return {
        success: true,
        data: {
          isRepo: true,
          branch,
          files,
        },
      };
    } catch (err: unknown) {
      const error = err as Error;
      logger.error('Failed to get git status', { workspaceRoot, message: error.message });
      return {
        success: false,
        error: {
          code: 'GIT_STATUS_FAILED',
          message: error.message || 'Failed to inspect git status.',
        },
      };
    }
  }

  /**
   * Get diff for a specific file or workspace.
   */
  public async getDiff(filePath: string, workspaceRoot: string): Promise<IpcResult<string>> {
    try {
      const args = ['diff'];
      if (filePath) {
        args.push('--', filePath);
      }
      const { stdout } = await execFileAsync('git', args, {
        cwd: workspaceRoot,
        timeout: 5000,
      });

      return { success: true, data: stdout };
    } catch (err: unknown) {
      const error = err as Error;
      return {
        success: false,
        error: {
          code: 'GIT_DIFF_FAILED',
          message: error.message || 'Failed to get git diff.',
        },
      };
    }
  }
}

export const gitService = new GitService();
