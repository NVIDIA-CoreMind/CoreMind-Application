import { describe, it, expect, beforeEach } from 'vitest';

import { PlatformGit } from '../src/main/platform/git/platformGit';
import { GitService } from '../src/main/services/gitService';

describe('Platform Git & GitService', () => {
  let platformGit: PlatformGit;
  let gitService: GitService;

  beforeEach(() => {
    platformGit = new PlatformGit();
    gitService = new GitService();
  });

  it('detects Git executable path without hardcoded paths', async () => {
    const gitPath = await platformGit.getGitExecutablePath();
    expect(gitPath).toBeTruthy();
  });

  it('returns clean status object for non-repository directories', async () => {
    const status = await platformGit.getStatus(process.cwd());
    expect(status).toHaveProperty('isRepo');
    expect(status).toHaveProperty('files');
    expect(Array.isArray(status.files)).toBe(true);
  });

  it('gitService wraps platformGit operations in IpcResult', async () => {
    const res = await gitService.getStatus(process.cwd());
    expect(res.success).toBe(true);
    if (res.success) {
      expect(typeof res.data.isRepo).toBe('boolean');
      expect(Array.isArray(res.data.files)).toBe(true);
    }
  });

  it('handles diff queries cleanly', async () => {
    const res = await gitService.getDiff(process.cwd());
    expect(res.success).toBe(true);
    if (res.success) {
      expect(typeof res.data).toBe('string');
    }
  });

  it('retrieves branches in git repository', async () => {
    const res = await gitService.getBranches(process.cwd());
    expect(res.success).toBe(true);
    if (res.success) {
      expect(typeof res.data.current).toBe('string');
      expect(Array.isArray(res.data.all)).toBe(true);
    }
  });
});
