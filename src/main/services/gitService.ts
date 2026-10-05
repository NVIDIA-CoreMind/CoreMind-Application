import { platformGit } from '../platform/git/platformGit';
import { GitStatusResult, GitBranchInfo } from '../../shared/types/git';
import { IpcResult } from '../../shared/types/ipc';
import { logger } from './logger';

export class GitService {
  public async getStatus(rootPath: string): Promise<IpcResult<GitStatusResult>> {
    try {
      const status = await platformGit.getStatus(rootPath);
      return { success: true, data: status };
    } catch (err: unknown) {
      const error = err as Error;
      logger.error('Failed to get Git status', { rootPath, message: error.message });
      return {
        success: false,
        error: {
          code: 'GIT_STATUS_FAILED',
          message: error.message || 'Failed to get git status',
        },
      };
    }
  }

  public async getDiff(rootPath: string, filePath?: string): Promise<IpcResult<string>> {
    try {
      const diff = await platformGit.getDiff(rootPath, filePath);
      return { success: true, data: diff };
    } catch (err: unknown) {
      const error = err as Error;
      logger.error('Failed to get Git diff', { rootPath, filePath, message: error.message });
      return {
        success: false,
        error: {
          code: 'GIT_DIFF_FAILED',
          message: error.message || 'Failed to get git diff',
        },
      };
    }
  }

  public async add(rootPath: string, files: string[]): Promise<IpcResult<void>> {
    try {
      await platformGit.add(rootPath, files);
      return { success: true, data: undefined };
    } catch (err: unknown) {
      const error = err as Error;
      logger.error('Failed to add Git files', { rootPath, message: error.message });
      return {
        success: false,
        error: {
          code: 'GIT_ADD_FAILED',
          message: error.message || 'Failed to stage files',
        },
      };
    }
  }

  public async commit(rootPath: string, message: string): Promise<IpcResult<string>> {
    try {
      const output = await platformGit.commit(rootPath, message);
      return { success: true, data: output };
    } catch (err: unknown) {
      const error = err as Error;
      logger.error('Failed to commit Git changes', { rootPath, message: error.message });
      return {
        success: false,
        error: {
          code: 'GIT_COMMIT_FAILED',
          message: error.message || 'Failed to commit changes',
        },
      };
    }
  }

  public async getBranches(rootPath: string): Promise<IpcResult<GitBranchInfo>> {
    try {
      const branches = await platformGit.getBranches(rootPath);
      return { success: true, data: branches };
    } catch (err: unknown) {
      const error = err as Error;
      logger.error('Failed to get Git branches', { rootPath, message: error.message });
      return {
        success: false,
        error: {
          code: 'GIT_BRANCHES_FAILED',
          message: error.message || 'Failed to list branches',
        },
      };
    }
  }

  public async checkout(rootPath: string, branch: string): Promise<IpcResult<void>> {
    try {
      await platformGit.checkout(rootPath, branch);
      return { success: true, data: undefined };
    } catch (err: unknown) {
      const error = err as Error;
      logger.error('Failed to checkout Git branch', { rootPath, branch, message: error.message });
      return {
        success: false,
        error: {
          code: 'GIT_CHECKOUT_FAILED',
          message: error.message || 'Failed to checkout branch',
        },
      };
    }
  }

  public async pull(rootPath: string): Promise<IpcResult<string>> {
    try {
      const output = await platformGit.pull(rootPath);
      return { success: true, data: output };
    } catch (err: unknown) {
      const error = err as Error;
      logger.error('Failed to pull from Git remote', { rootPath, message: error.message });
      return {
        success: false,
        error: {
          code: 'GIT_PULL_FAILED',
          message: error.message || 'Failed to pull changes',
        },
      };
    }
  }

  public async push(rootPath: string): Promise<IpcResult<string>> {
    try {
      const output = await platformGit.push(rootPath);
      return { success: true, data: output };
    } catch (err: unknown) {
      const error = err as Error;
      logger.error('Failed to push to Git remote', { rootPath, message: error.message });
      return {
        success: false,
        error: {
          code: 'GIT_PUSH_FAILED',
          message: error.message || 'Failed to push changes',
        },
      };
    }
  }
}

export const gitService = new GitService();
